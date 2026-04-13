import { getJournalInstanceItems } from "@/lib/blizzard-api";
import { getRioCharacterProfileFull, getRioTopPlayersBySpec, RioGearItem } from "@/lib/raiderio-api";
import { CURRENT_SEASON } from "@/lib/season-config";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface BisItem {
  item_id: number;
  name: string;
  item_level: number;
  icon: string;
  icon_url: string;
  frequency: number;       // 0–1
  slot: string;
  dungeon: string | null;  // null = raid or unknown source
  is_dungeon_only: boolean;
}

export interface DungeonPriority {
  dungeon_name: string;
  bis_count: number;
  items: BisItem[];
}

export interface BisAnalysisResult {
  analyzed_count: number;
  season: string;
  class: string;
  spec: string;
  bis_dungeon: Record<string, BisItem>;
  bis_full: Record<string, BisItem>;
  dungeon_priority: DungeonPriority[];
  error?: string;
}

type SlotAggregate = Map<number, { item: RioGearItem; count: number }>;

function iconUrl(icon: string) {
  if (!icon) return "";
  return `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region = searchParams.get("region") ?? "eu";
  const cls    = searchParams.get("class")  ?? "";
  const spec   = searchParams.get("spec")   ?? "";

  if (!cls || !spec) {
    return NextResponse.json({ error: "Paramètres class et spec requis." }, { status: 400 });
  }

  try {
    // 1. Find top 100 players for this class/spec via free runs endpoint
    const topPlayers = await getRioTopPlayersBySpec(region, cls, spec, 100, CURRENT_SEASON.rioSeasonSlug);

    if (topPlayers.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, season: CURRENT_SEASON.id, class: cls, spec,
        bis_dungeon: {}, bis_full: {}, dungeon_priority: [],
        error: `Aucun joueur ${spec} ${cls} trouvé dans les top runs Raider.IO. La spécialisation est peut-être trop rare dans les hautes clés.`,
      });
    }

    // 2. Fetch gear profiles in batches of 10
    const allProfiles: Array<Record<string, RioGearItem>> = [];
    for (let i = 0; i < topPlayers.length; i += 10) {
      const chunk = topPlayers.slice(i, i + 10);
      const settled = await Promise.allSettled(
        chunk.map((p) => getRioCharacterProfileFull(region, p.realm, p.name))
      );
      for (const res of settled) {
        if (res.status === "fulfilled" && res.value?.gear?.items) {
          allProfiles.push(res.value.gear.items);
        }
      }
    }

    if (allProfiles.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, season: CURRENT_SEASON.id, class: cls, spec,
        bis_dungeon: {}, bis_full: {}, dungeon_priority: [],
        error: "Impossible de récupérer l'équipement des joueurs du top. Réessayez plus tard.",
      });
    }

    // 3. Aggregate gear per slot
    const slotMaps: Record<string, SlotAggregate> = {};
    for (const gear of allProfiles) {
      for (const [slot, item] of Object.entries(gear)) {
        if (!slotMaps[slot]) slotMaps[slot] = new Map();
        const existing = slotMaps[slot].get(item.item_id);
        if (existing) existing.count += 1;
        else slotMaps[slot].set(item.item_id, { item, count: 1 });
      }
    }

    // 4. Build item → dungeon source map via Blizzard journal
    const itemToDungeon: Record<number, string> = {};    // item_id → dungeon rioName
    const itemToDungeonDisplay: Record<number, string> = {}; // item_id → dungeon display name
    await Promise.allSettled(
      CURRENT_SEASON.dungeons
        .filter((d) => d.journalInstanceId)
        .map(async (d) => {
          const items = await getJournalInstanceItems(d.journalInstanceId!, region);
          for (const itemIdStr of Object.keys(items)) {
            const id = parseInt(itemIdStr, 10);
            itemToDungeon[id] = d.rioName;
            itemToDungeonDisplay[id] = d.name;
          }
        })
    );

    // 5. Find BiS items — threshold scales with sample size
    // ≥40% for large samples, ≥20% for small samples (rare specs with few players found)
    const analyzed  = allProfiles.length;
    const THRESHOLD = analyzed >= 50 ? 0.4 : 0.2;
    const bisFull:    Record<string, BisItem> = {};
    const bisDungeon: Record<string, BisItem> = {};

    function makeBisItem(slot: string, entry: { item: RioGearItem; count: number }): BisItem {
      const dungeon = itemToDungeon[entry.item.item_id] ?? null;
      return {
        item_id:         entry.item.item_id,
        name:            entry.item.name,
        item_level:      entry.item.item_level,
        icon:            entry.item.icon ?? "",
        icon_url:        iconUrl(entry.item.icon ?? ""),
        frequency:       Math.round((entry.count / analyzed) * 100) / 100,
        slot,
        dungeon,
        is_dungeon_only: dungeon !== null,
      };
    }

    for (const [slot, aggregate] of Object.entries(slotMaps)) {
      const sorted = Array.from(aggregate.values()).sort((a, b) => b.count - a.count);
      const top = sorted[0];
      if (!top || top.count / analyzed < THRESHOLD) continue;

      bisFull[slot] = makeBisItem(slot, top);
      if (bisFull[slot].is_dungeon_only) {
        bisDungeon[slot] = bisFull[slot];
      } else {
        // Look for the best dungeon alternative that also meets threshold
        for (const candidate of sorted.slice(1)) {
          if (candidate.count / analyzed < THRESHOLD) break;
          if (itemToDungeon[candidate.item.item_id]) {
            bisDungeon[slot] = makeBisItem(slot, candidate);
            break;
          }
        }
      }
    }

    // 6. Dungeon priority (by number of BiS items)
    const byDungeon: Record<string, BisItem[]> = {};
    for (const item of Object.values(bisDungeon)) {
      if (!item.dungeon) continue;
      if (!byDungeon[item.dungeon]) byDungeon[item.dungeon] = [];
      byDungeon[item.dungeon].push(item);
    }
    const dungeonPriority: DungeonPriority[] = Object.entries(byDungeon)
      .map(([dungeon_name, items]) => ({ dungeon_name, bis_count: items.length, items }))
      .sort((a, b) => b.bis_count - a.bis_count);

    return NextResponse.json<BisAnalysisResult>({
      analyzed_count: analyzed,
      season: CURRENT_SEASON.id,
      class: cls, spec,
      bis_dungeon: bisDungeon,
      bis_full: bisFull,
      dungeon_priority: dungeonPriority,
    });
  } catch (e) {
    console.error("BiS error:", e);
    return NextResponse.json({ error: "Erreur interne lors de l'analyse. Réessayez." }, { status: 500 });
  }
}
