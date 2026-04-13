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
  raw_count: number;
  slot: string;
  dungeon: string | null;
  dungeon_display: string | null;
}

export interface BisAnalysisResult {
  analyzed_count: number;
  total_scanned: number;
  season: string;
  class: string;
  spec: string;
  bis: Record<string, BisItem>;
  bis_alternatives: Record<string, BisItem>;
  error?: string;
}

type SlotAggregate = Map<number, { item: RioGearItem; count: number }>;

/** Slots that get the top-2 alternative display (weapons, trinkets, rings) */
const ALTERNATIVE_SLOTS = new Set([
  "mainhand", "offhand",
  "trinket1", "trinket2",
  "finger1", "finger2",
]);

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
    const topPlayers = await getRioTopPlayersBySpec(region, cls, spec, 300, CURRENT_SEASON.rioSeasonSlug);

    if (topPlayers.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: 0, season: CURRENT_SEASON.id, class: cls, spec,
        bis: {}, bis_alternatives: {},
        error: `Aucun joueur ${spec} ${cls} trouvé dans les top runs Raider.IO.`,
      });
    }

    const totalScanned = topPlayers.length;

    // Fetch gear profiles in batches of 10
    const allProfiles: Array<Record<string, RioGearItem>> = [];
    for (let i = 0; i < topPlayers.length; i += 10) {
      const chunk = topPlayers.slice(i, i + 10);
      const settled = await Promise.allSettled(
        chunk.map((p) => getRioCharacterProfileFull(region, p.realm, p.name))
      );
      for (const res of settled) {
        if (res.status === "fulfilled" && res.value?.gear?.items) {
          const items = res.value.gear.items;
          if (Object.keys(items).length >= 5) {
            allProfiles.push(items);
          }
        }
      }
    }

    if (allProfiles.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: totalScanned, season: CURRENT_SEASON.id, class: cls, spec,
        bis: {}, bis_alternatives: {},
        error: `Impossible de récupérer l'équipement des joueurs du top (${totalScanned} trouvés, aucun gear disponible). Réessayez plus tard.`,
      });
    }

    // Aggregate gear per slot
    const slotMaps: Record<string, SlotAggregate> = {};
    for (const gear of allProfiles) {
      for (const [slot, item] of Object.entries(gear)) {
        if (!slotMaps[slot]) slotMaps[slot] = new Map();
        const existing = slotMaps[slot].get(item.item_id);
        if (existing) existing.count += 1;
        else slotMaps[slot].set(item.item_id, { item, count: 1 });
      }
    }

    // Item → dungeon source map via Blizzard journal
    const itemToDungeon: Record<number, string> = {};
    const itemToDungeonDisplay: Record<number, string> = {};
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

    const analyzed = allProfiles.length;
    const THRESHOLD = analyzed < 10
      ? Math.max(2 / analyzed, 0.33)
      : analyzed < 30 ? 0.25 : 0.40;

    const bis: Record<string, BisItem> = {};
    const bisAlternatives: Record<string, BisItem> = {};

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
      };
    }

    for (const [slot, aggregate] of Object.entries(slotMaps)) {
      const sorted = Array.from(aggregate.values()).sort((a, b) => b.count - a.count);
      const top = sorted[0];
      if (!top || top.count / analyzed < THRESHOLD) continue;

      bis[slot] = makeBisItem(slot, top);

      // For weapons, trinkets, and rings: pick the #2 alternative
      if (ALTERNATIVE_SLOTS.has(slot) && sorted.length > 1) {
        const alt = sorted[1];
        // Lower threshold for alternatives — at least some meaningful usage
        if (alt.count / analyzed >= Math.max(THRESHOLD * 0.5, 2 / analyzed)) {
          bisAlternatives[slot] = makeBisItem(slot, alt);
        }
      }
    }

    return NextResponse.json<BisAnalysisResult>({
      analyzed_count: analyzed,
      total_scanned: totalScanned,
      season: CURRENT_SEASON.id,
      class: cls, spec,
      bis,
      bis_alternatives: bisAlternatives,
    });
  } catch (e) {
    console.error("BiS error:", e);
    return NextResponse.json({ error: "Erreur interne lors de l'analyse. Réessayez." }, { status: 500 });
  }
}
