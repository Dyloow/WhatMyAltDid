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

export interface BisEnchant {
  enchant_id: number;
  slot: string;
  frequency: number;
  raw_count: number;
}

export interface BisGem {
  gem_id: number;
  frequency: number;
  raw_count: number;
}

export interface BisAnalysisResult {
  analyzed_count: number;
  total_scanned: number;
  season: string;
  class: string;
  spec: string;
  bis: Record<string, BisItem>;
  bis_alternatives: Record<string, BisItem>;
  enchants?: Record<string, BisEnchant>;
  gems?: BisGem[];
  generated_at?: string;
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
    // Request 150 players to ensure we get at least 100 with valid gear data
    // Some top players may not have gear indexed in RaiderIO
    const topPlayers = await getRioTopPlayersBySpec(region, cls, spec, 150, CURRENT_SEASON.rioSeasonSlug);

    if (topPlayers.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: 0, season: CURRENT_SEASON.id, class: cls, spec,
        bis: {}, bis_alternatives: {},
        error: `Aucun joueur ${spec} ${cls} trouvé dans les top runs Raider.IO.`,
      });
    }

    const totalScanned = topPlayers.length;

    // Fetch gear profiles in batches of 5 (reduce load on RaiderIO API)
    // Stop once we have 100 valid profiles
    const TARGET_PROFILES = 100;
    const allProfiles: Array<{ gear: Record<string, RioGearItem>; weight: number }> = [];
    
    for (let i = 0; i < topPlayers.length && allProfiles.length < TARGET_PROFILES; i += 5) {
      const chunk = topPlayers.slice(i, i + 5);
      const settled = await Promise.allSettled(
        chunk.map((p) => getRioCharacterProfileFull(region, p.realm, p.name))
      );
      for (let j = 0; j < settled.length; j++) {
        if (allProfiles.length >= TARGET_PROFILES) break;
        
        const res = settled[j];
        if (res.status === "fulfilled" && res.value?.gear?.items) {
          const items = res.value.gear.items;
          if (Object.keys(items).length >= 5) {
            // Weight based on ranking: top player = 101 votes, player #100 = 2 votes
            const globalIndex = i + j;
            const weight = Math.max(1, 101 - globalIndex);
            allProfiles.push({ gear: items, weight });
          }
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (allProfiles.length < TARGET_PROFILES && i + 5 < topPlayers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (allProfiles.length === 0) {
      return NextResponse.json<BisAnalysisResult>({
        analyzed_count: 0, total_scanned: totalScanned, season: CURRENT_SEASON.id, class: cls, spec,
        bis: {}, bis_alternatives: {},
        error: `Impossible de récupérer l'équipement des joueurs du top (${totalScanned} trouvés, aucun gear disponible). Réessayez plus tard.`,
      });
    }

    // Item → dungeon source map via Blizzard journal (needs to happen BEFORE aggregation)
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

    // Aggregate gear per slot with weighted votes
    // Filter items: only consider items from current season (ilvl 245-300 OR from season dungeons)
    const MIN_ILVL = 245;
    const MAX_ILVL = 300; // Midnight Season 1 max ilvl
    const slotMaps: Record<string, SlotAggregate> = {};
    
    // Merge paired slots (rings, trinkets) for better aggregation
    const slotMapping: Record<string, string> = {
      finger1: 'finger',
      finger2: 'finger',
      trinket1: 'trinket',
      trinket2: 'trinket',
    };
    
    for (const { gear, weight } of allProfiles) {
      for (const [slot, item] of Object.entries(gear)) {
        // Only include items from current season dungeons OR within reasonable ilvl range
        const isFromSeasonDungeon = itemToDungeon[item.item_id] !== undefined;
        const isReasonableIlvl = item.item_level >= MIN_ILVL && item.item_level <= MAX_ILVL;
        
        if (!isFromSeasonDungeon && !isReasonableIlvl) {
          continue;
        }
        
        // Map paired slots to merged key
        const aggregateSlot = slotMapping[slot] || slot;
        
        if (!slotMaps[aggregateSlot]) slotMaps[aggregateSlot] = new Map();
        const existing = slotMaps[aggregateSlot].get(item.item_id);
        if (existing) existing.count += weight;
        else slotMaps[aggregateSlot].set(item.item_id, { item, count: weight });
      }
    }

    const analyzed = allProfiles.length;
    // Calculate total weighted votes available
    const totalVotes = allProfiles.reduce((sum, p) => sum + p.weight, 0);
    // With weighted voting, we can use lower thresholds
    // Show top item if it has at least 8-10% of votes (represents meaningful consensus)
    const THRESHOLD = analyzed < 10
      ? Math.max(2 / analyzed, 0.33)
      : analyzed < 30 ? 0.20
      : analyzed < 100 ? 0.12
      : 0.08;  // For 100+ players: show if top item has 8%+ votes

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
        frequency:       Math.round((entry.count / totalVotes) * 100) / 100,
        raw_count:       entry.count,
        slot,
        dungeon,
        dungeon_display: dungeonDisplay,
      };
    }

    for (const [slot, aggregate] of Object.entries(slotMaps)) {
      const sorted = Array.from(aggregate.values()).sort((a, b) => b.count - a.count);
      const top = sorted[0];
      if (!top) continue;
      
      // Show top item if it meets threshold OR if it's clearly the most popular (even if below threshold)
      const topFrequency = top.count / totalVotes;
      if (topFrequency >= THRESHOLD || (sorted.length > 1 && topFrequency >= THRESHOLD * 0.6)) {
        // For merged paired slots (finger, trinket), assign to both slots
        if (slot === 'finger') {
          bis.finger1 = makeBisItem('finger1', top);
          bis.finger2 = makeBisItem('finger2', top);
        } else if (slot === 'trinket') {
          bis.trinket1 = makeBisItem('trinket1', top);
          bis.trinket2 = makeBisItem('trinket2', top);
        } else {
          bis[slot] = makeBisItem(slot, top);
        }
      }

      // For paired slots: find distinct alternatives
      if (slot === 'finger' || slot === 'trinket') {
        const slot1 = slot === 'finger' ? 'finger1' : 'trinket1';
        const slot2 = slot === 'finger' ? 'finger2' : 'trinket2';
        
        // Find 2nd best item (different from top)
        if (sorted.length > 1) {
          for (let i = 1; i < sorted.length; i++) {
            const alt = sorted[i];
            if (alt.item.item_id !== top.item.item_id) {
              const altThreshold = Math.max(THRESHOLD * 0.5, 0.05);
              if (alt.count / totalVotes >= altThreshold) {
                bisAlternatives[slot1] = makeBisItem(slot1, alt);
                bisAlternatives[slot2] = makeBisItem(slot2, alt);
                break;
              }
            }
          }
        }
      }
      // For other alternative slots (mainhand, offhand)
      else if (ALTERNATIVE_SLOTS.has(slot) && sorted.length > 1) {
        for (let i = 1; i < sorted.length; i++) {
          const alt = sorted[i];
          if (bis[slot] && alt.item.item_id === bis[slot].item_id) {
            continue;
          }
          const altThreshold = Math.max(THRESHOLD * 0.5, 0.05);
          if (alt.count / totalVotes >= altThreshold) {
            bisAlternatives[slot] = makeBisItem(slot, alt);
            break;
          }
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
