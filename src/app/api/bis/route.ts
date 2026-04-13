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
  raw_count: number;       // absolute number of players wearing this
  slot: string;
  dungeon: string | null;  // null = raid or unknown source
  dungeon_display: string | null;
  is_dungeon_only: boolean;
}

export interface DungeonPriority {
  dungeon_name: string;
  dungeon_display: string;
  bis_count: number;
  items: BisItem[];
}

export interface BisAnalysisResult {
  analyzed_count: number;   // players with gear data
  total_scanned: number;    // total players found in top runs
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
    // 1. Find up to 300 players for this class/spec via free runs endpoint.
    //    We ask for 300 because most profiles won't have gear tracked by RIO —
    //    we keep fetching until we have 50 valid gear profiles or exhaust the pool.
    const topPlayers = await getRioTopPlayersBySpec(region, cls, spec, 300, CURRENT_SEASON.rioSeasonSlug);

    if (topPlayers.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: 0, season: CURRENT_SEASON.id, class: cls, spec,
        bis_dungeon: {}, bis_full: {}, dungeon_priority: [],
        error: `Aucun joueur ${spec} ${cls} trouvé dans les top runs Raider.IO. La spécialisation est peut-être trop rare dans les hautes clés.`,
      });
    }

    const totalScanned = topPlayers.length;

    // 2. Fetch gear profiles in batches of 10.
    //    Most RIO profiles won't have gear indexed — collect everything we can.
    const allProfiles: Array<Record<string, RioGearItem>> = [];

    for (let i = 0; i < topPlayers.length; i += 10) {
      const chunk = topPlayers.slice(i, i + 10);
      const settled = await Promise.allSettled(
        chunk.map((p) => getRioCharacterProfileFull(region, p.realm, p.name))
      );
      for (const res of settled) {
        if (res.status === "fulfilled" && res.value?.gear?.items) {
          const items = res.value.gear.items;
          // Only add if it has at least 5 item slots (basic sanity check)
          if (Object.keys(items).length >= 5) {
            allProfiles.push(items);
          }
        }
      }
    }

    if (allProfiles.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: totalScanned, season: CURRENT_SEASON.id, class: cls, spec,
        bis_dungeon: {}, bis_full: {}, dungeon_priority: [],
        error: `Impossible de récupérer l'équipement des joueurs du top (${totalScanned} joueurs trouvés, aucun gear disponible via Raider.IO). Réessayez plus tard.`,
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
    //    Only dungeons with a known journalInstanceId are looked up.
    const itemToDungeon: Record<number, string> = {};        // item_id → dungeon rioName
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

    // 5. Find BiS items
    //    Threshold scales with sample size. We always require at least 2 players.
    const analyzed = allProfiles.length;
    const THRESHOLD = analyzed < 10
      ? Math.max(2 / analyzed, 0.33)   // tiny sample: need 33% + abs 2
      : analyzed < 30
        ? 0.25                          // small sample: 25%
        : 0.40;                         // large sample: 40%

    const bisFull:    Record<string, BisItem> = {};
    const bisDungeon: Record<string, BisItem> = {};

    function makeBisItem(slot: string, entry: { item: RioGearItem; count: number }): BisItem {
      const dungeon = itemToDungeon[entry.item.item_id] ?? null;
      const dungeonDisplay = itemToDungeonDisplay[entry.item.item_id] ?? null;
      return {
        item_id:         entry.item.item_id,
        name:            entry.item.name,
        item_level:      entry.item.item_level,
        icon:            entry.item.icon ?? "",
        icon_url:        iconUrl(entry.item.icon ?? ""),
        frequency:       Math.round((entry.count / analyzed) * 100) / 100,
        raw_count:       entry.count,
        slot,
        dungeon,
        dungeon_display: dungeonDisplay,
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
    const byDungeon: Record<string, { items: BisItem[]; display: string }> = {};
    for (const item of Object.values(bisDungeon)) {
      if (!item.dungeon) continue;
      if (!byDungeon[item.dungeon]) byDungeon[item.dungeon] = { items: [], display: item.dungeon_display ?? item.dungeon };
      byDungeon[item.dungeon].items.push(item);
    }
    const dungeonPriority: DungeonPriority[] = Object.entries(byDungeon)
      .map(([dungeon_name, { items, display }]) => ({
        dungeon_name,
        dungeon_display: display,
        bis_count: items.length,
        items,
      }))
      .sort((a, b) => b.bis_count - a.bis_count);

    return NextResponse.json<BisAnalysisResult>({
      analyzed_count: analyzed,
      total_scanned: totalScanned,
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
