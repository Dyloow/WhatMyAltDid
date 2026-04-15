#!/usr/bin/env tsx
/**
 * Generate BiS data for all 40 class/spec combos.
 * Runs daily at 06:00 UTC via GitHub Actions.
 * Always overwrites existing files — no skip logic.
 *
 * Usage: npx tsx scripts/generate-all-bis.ts
 */

import { promises as fs } from "fs";
import path from "path";
import {
  getRioTopPlayersBySpec,
  getRioCharacterProfileFull,
  RioGearItem,
} from "../src/lib/raiderio-api";
import { getJournalInstanceItems } from "../src/lib/blizzard-api";
import { CURRENT_SEASON } from "../src/lib/season-config";
import type { BisAnalysisResult, BisItem, BisEnchant, BisGem } from "../src/app/api/bis/route";

// ── Config ────────────────────────────────────────────────────────────────────

const REGION = "eu";
const TARGET_PROFILES = 50;
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 300;
const MIN_ILVL = 245;
const MAX_ILVL = 300;
const FREQUENCY_THRESHOLD = 0.05;
const MAX_RETRIES = 5; // retry failed specs up to N times
const INTER_SPEC_DELAY_MS = 1000; // base delay between specs
const RATE_LIMIT_COOLDOWN_MS = 30_000; // long cooldown when rate limited
const RETRY_PASS_DELAY_MS = 60_000; // wait between retry passes
const OUTPUT_DIR = path.join(process.cwd(), "public", "data", "bis");

const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight": ["Blood", "Frost", "Unholy"],
  "Demon Hunter": ["Devourer", "Havoc", "Vengeance"],
  "Druid": ["Balance", "Feral", "Guardian", "Restoration"],
  "Evoker": ["Augmentation", "Devastation", "Preservation"],
  "Hunter": ["Beast Mastery", "Marksmanship", "Survival"],
  "Mage": ["Arcane", "Fire", "Frost"],
  "Monk": ["Brewmaster", "Mistweaver", "Windwalker"],
  "Paladin": ["Holy", "Protection", "Retribution"],
  "Priest": ["Discipline", "Holy", "Shadow"],
  "Rogue": ["Assassination", "Outlaw", "Subtlety"],
  "Shaman": ["Elemental", "Enhancement", "Restoration"],
  "Warlock": ["Affliction", "Demonology", "Destruction"],
  "Warrior": ["Arms", "Fury", "Protection"],
};

const CLASS_SLUGS: Record<string, string> = {
  "Death Knight": "death-knight",
  "Demon Hunter": "demon-hunter",
  Druid: "druid",
  Evoker: "evoker",
  Hunter: "hunter",
  Mage: "mage",
  Monk: "monk",
  Paladin: "paladin",
  Priest: "priest",
  Rogue: "rogue",
  Shaman: "shaman",
  Warlock: "warlock",
  Warrior: "warrior",
};

// ── Dungeon item map (loaded once) ────────────────────────────────────────────

type DungeonItemMap = Record<number, string>; // itemId → dungeon display name

async function loadDungeonItemMap(): Promise<DungeonItemMap> {
  const map: DungeonItemMap = {};
  let loaded = 0;

  for (const dungeon of CURRENT_SEASON.dungeons) {
    if (dungeon.journalInstanceId === null) continue;
    try {
      const items = await getJournalInstanceItems(
        dungeon.journalInstanceId,
        REGION
      );
      for (const [idStr, dungeonName] of Object.entries(items)) {
        map[Number(idStr)] = dungeonName;
        loaded++;
      }
    } catch (err) {
      console.warn(
        `⚠ Failed to load items for ${dungeon.name} (journal ${dungeon.journalInstanceId}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`📦 Dungeon item map: ${loaded} items from ${CURRENT_SEASON.dungeons.filter(d => d.journalInstanceId !== null).length} dungeons\n`);
  return map;
}

// ── Spec analysis ─────────────────────────────────────────────────────────────

async function analyzeSpec(
  className: string,
  spec: string,
  dungeonMap: DungeonItemMap
): Promise<BisAnalysisResult> {
  // 1. Fetch top players
  const topPlayers = await getRioTopPlayersBySpec(
    REGION,
    className,
    spec,
    150,
    CURRENT_SEASON.rioSeasonSlug
  );

  if (topPlayers.length === 0) {
    return emptyResult(className, spec, 0, "No top players found");
  }

  // 2. Fetch gear profiles in batches
  const profiles: Array<{ gear: Record<string, RioGearItem>; weight: number }> = [];

  for (
    let i = 0;
    i < topPlayers.length && profiles.length < TARGET_PROFILES;
    i += BATCH_SIZE
  ) {
    const chunk = topPlayers.slice(
      i,
      Math.min(i + BATCH_SIZE, topPlayers.length)
    );
    const settled = await Promise.allSettled(
      chunk.map((p) => getRioCharacterProfileFull(REGION, p.realm, p.name))
    );

    for (let j = 0; j < settled.length; j++) {
      if (profiles.length >= TARGET_PROFILES) break;
      const res = settled[j];
      if (res.status === "fulfilled" && res.value?.gear?.items) {
        const items = res.value.gear.items;
        if (Object.keys(items).length >= 5) {
          const rank = i + j; // 0-based rank
          const weight = Math.max(1, 151 - rank); // higher rank → more weight
          profiles.push({ gear: items, weight });
        }
      }
    }

    // Small delay between batches to avoid rate limiting
    if (profiles.length < TARGET_PROFILES) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  if (profiles.length === 0) {
    return emptyResult(
      className,
      spec,
      topPlayers.length,
      "Could not fetch any gear profiles"
    );
  }

  // 3. Aggregate by slot (merge paired slots: finger1/2 → finger, trinket1/2 → trinket)
  type Entry = { item: RioGearItem; count: number; totalWeight: number };
  const slotAgg: Record<string, Map<number, Entry>> = {};

  // Enchant & gem aggregation
  const ENCHANTABLE_SLOTS = new Set(["back", "chest", "wrist", "legs", "feet", "finger", "mainhand"]);
  type EnchAgg = { count: number; totalWeight: number };
  const slotEnchants: Record<string, Map<number, EnchAgg>> = {};
  const gemAgg: Map<number, EnchAgg> = new Map();

  for (const { gear, weight } of profiles) {
    for (const [rawSlot, item] of Object.entries(gear)) {
      let slot = rawSlot;
      if (slot === "finger1" || slot === "finger2") slot = "finger";
      if (slot === "trinket1" || slot === "trinket2") slot = "trinket";

      if (!slotAgg[slot]) slotAgg[slot] = new Map();
      const agg = slotAgg[slot];
      const existing = agg.get(item.item_id);

      if (existing) {
        existing.count += 1;
        existing.totalWeight += weight;
      } else {
        agg.set(item.item_id, { item, count: 1, totalWeight: weight });
      }

      // Enchant aggregation
      if (ENCHANTABLE_SLOTS.has(slot) && item.enchant && item.enchant > 0) {
        if (!slotEnchants[slot]) slotEnchants[slot] = new Map();
        const eAgg = slotEnchants[slot];
        const ex = eAgg.get(item.enchant);
        if (ex) { ex.count++; ex.totalWeight += weight; }
        else { eAgg.set(item.enchant, { count: 1, totalWeight: weight }); }
      }

      // Gem aggregation
      if (item.gems && item.gems.length > 0) {
        for (const gemId of item.gems) {
          if (gemId && gemId > 0) {
            const gx = gemAgg.get(gemId);
            if (gx) { gx.count++; gx.totalWeight += weight; }
            else { gemAgg.set(gemId, { count: 1, totalWeight: weight }); }
          }
        }
      }
    }
  }

  // 4. Pick BiS per slot (ilvl filter only, no dungeon source filter)
  const totalWeight = profiles.reduce((s, p) => s + p.weight, 0);
  const bis: Record<string, BisItem> = {};
  const bis_alternatives: Record<string, BisItem> = {};
  const altSlots = new Set(["mainhand", "offhand", "trinket", "finger"]);

  for (const [slot, agg] of Object.entries(slotAgg)) {
    const sorted = Array.from(agg.values())
      .filter((e) => e.item.item_level >= MIN_ILVL && e.item.item_level <= MAX_ILVL)
      .sort((a, b) => b.totalWeight - a.totalWeight);

    if (sorted.length === 0) continue;

    const top = sorted[0];
    const freq = top.totalWeight / totalWeight;
    if (freq >= FREQUENCY_THRESHOLD) {
      bis[slot] = toBisItem(top, slot, freq, dungeonMap);
    }

    // Alternatives for weapons / trinkets / rings
    if (altSlots.has(slot) && sorted.length > 1) {
      const second = sorted[1];
      const freq2 = second.totalWeight / totalWeight;
      if (freq2 >= FREQUENCY_THRESHOLD && second.item.item_id !== top.item.item_id) {
        bis_alternatives[slot] = toBisItem(second, slot, freq2, dungeonMap);
      }
    }
  }

  // 5. Pick best enchant per enchantable slot
  const enchants: Record<string, BisEnchant> = {};
  for (const [slot, eMap] of Object.entries(slotEnchants)) {
    const sorted = Array.from(eMap.entries())
      .sort((a, b) => b[1].totalWeight - a[1].totalWeight);
    if (sorted.length > 0) {
      const [enchantId, data] = sorted[0];
      const freq = data.totalWeight / totalWeight;
      if (freq >= FREQUENCY_THRESHOLD) {
        enchants[slot] = { enchant_id: enchantId, slot, frequency: freq, raw_count: data.count };
      }
    }
  }

  // 6. Pick top gems (up to 5)
  const gems: BisGem[] = Array.from(gemAgg.entries())
    .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
    .slice(0, 5)
    .filter(([, data]) => data.totalWeight / totalWeight >= FREQUENCY_THRESHOLD)
    .map(([gemId, data]) => ({
      gem_id: gemId,
      frequency: data.totalWeight / totalWeight,
      raw_count: data.count,
    }));

  return {
    analyzed_count: profiles.length,
    total_scanned: topPlayers.length,
    season: CURRENT_SEASON.id,
    class: className,
    spec,
    bis,
    bis_alternatives,
    enchants: Object.keys(enchants).length > 0 ? enchants : undefined,
    gems: gems.length > 0 ? gems : undefined,
    generated_at: new Date().toISOString(),
  };
}

function toBisItem(
  entry: { item: RioGearItem; count: number; totalWeight: number },
  slot: string,
  frequency: number,
  dungeonMap: DungeonItemMap
): BisItem {
  const dungeonDisplay = dungeonMap[entry.item.item_id] ?? null;
  return {
    item_id: entry.item.item_id,
    name: entry.item.name,
    item_level: entry.item.item_level,
    icon: entry.item.icon,
    icon_url: `https://wow.zamimg.com/images/wow/icons/medium/${entry.item.icon}.jpg`,
    frequency,
    raw_count: entry.count,
    slot,
    dungeon: dungeonDisplay, // same value — we only have display names from journal
    dungeon_display: dungeonDisplay,
  };
}

function emptyResult(
  className: string,
  spec: string,
  scanned: number,
  error: string
): BisAnalysisResult {
  return {
    analyzed_count: 0,
    total_scanned: scanned,
    season: CURRENT_SEASON.id,
    class: className,
    spec,
    bis: {},
    bis_alternatives: {},
    generated_at: new Date().toISOString(),
    error,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 BiS data generation — all specs\n");
  console.log(`Region: ${REGION}`);
  console.log(`Season: ${CURRENT_SEASON.id}`);
  console.log(`Target profiles per spec: ${TARGET_PROFILES}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // 1. Load dungeon item map once
  const dungeonMap = await loadDungeonItemMap();

  // 2. Build task list
  const tasks: Array<{ className: string; spec: string }> = [];
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    for (const spec of specs) {
      tasks.push({ className, spec });
    }
  }

  console.log(`📋 ${tasks.length} specs to process\n`);

  const startTime = Date.now();
  const results: Array<{ className: string; spec: string; analyzed: number; slots: number }> = [];

  // 3. Process sequentially — skip specs already at target (for incremental runs)
  const forceAll = process.argv.includes("--force");
  for (let i = 0; i < tasks.length; i++) {
    const { className, spec } = tasks[i];
    const classSlug = CLASS_SLUGS[className];
    const specSlug = spec.toLowerCase().replace(/\s+/g, "-");
    const tag = `[${i + 1}/${tasks.length}] ${className} ${spec}`;

    // Check if existing file already meets target (skip unless --force)
    if (!forceAll) {
      const filepath = path.join(OUTPUT_DIR, classSlug, `${specSlug}.json`);
      try {
        const existing = JSON.parse(await fs.readFile(filepath, "utf-8")) as BisAnalysisResult;
        if (existing.analyzed_count >= TARGET_PROFILES) {
          const slotCount = Object.keys(existing.bis).length;
          results.push({ className, spec, analyzed: existing.analyzed_count, slots: slotCount });
          console.log(`${tag} ⏭ already at ${existing.analyzed_count} analyzed — skipping`);
          continue;
        }
      } catch {
        // File doesn't exist or is invalid — proceed with generation
      }
    }

    console.log(`${tag} — fetching…`);

    try {
      const result = await analyzeSpec(className, spec, dungeonMap);

      // Write file
      const classDir = path.join(OUTPUT_DIR, classSlug);
      await fs.mkdir(classDir, { recursive: true });
      const filepath = path.join(classDir, `${specSlug}.json`);
      await fs.writeFile(filepath, JSON.stringify(result, null, 2), "utf-8");

      const slotCount = Object.keys(result.bis).length;
      results.push({ className, spec, analyzed: result.analyzed_count, slots: slotCount });
      console.log(
        `${tag} ✅ ${result.analyzed_count} analyzed, ${slotCount} BiS slots → ${classSlug}/${specSlug}.json`
      );

      // Adaptive rate limiting: if we got very few results, we're being throttled
      if (result.analyzed_count < TARGET_PROFILES * 0.3 && result.analyzed_count > 0) {
        console.log(`${tag} ⏳ Rate limiting detected (${result.analyzed_count}/${TARGET_PROFILES}), cooling down ${RATE_LIMIT_COOLDOWN_MS / 1000}s…`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
      } else if (result.analyzed_count === 0) {
        console.log(`${tag} ⏳ Fully rate limited, cooling down ${RATE_LIMIT_COOLDOWN_MS / 1000}s…`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
      } else {
        // Normal inter-spec delay
        await new Promise((r) => setTimeout(r, INTER_SPEC_DELAY_MS));
      }
    } catch (err) {
      console.error(
        `${tag} ❌ Fatal:`,
        err instanceof Error ? err.message : err
      );
      results.push({ className, spec, analyzed: 0, slots: 0 });
      await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
    }
  }

  // 3b. Retry specs below target (rate limiting recovery)
  for (let retry = 1; retry <= MAX_RETRIES; retry++) {
    const failed = results.filter((r) => r.analyzed < TARGET_PROFILES);
    if (failed.length === 0) break;
    // Only worth retrying if there are specs with very low counts
    const critical = failed.filter((r) => r.analyzed === 0);
    if (critical.length === 0) break; // all specs have some data, good enough

    console.log(`\n🔄 Retry pass ${retry}/${MAX_RETRIES} — ${critical.length} specs with 0 analyzed (${failed.length} below ${TARGET_PROFILES})`);
    console.log(`⏳ Waiting ${RETRY_PASS_DELAY_MS / 1000}s for rate limit reset…`);
    await new Promise((r) => setTimeout(r, RETRY_PASS_DELAY_MS));

    // Only retry the critical ones (0 analyzed)
    for (const f of critical) {
      const classSlug = CLASS_SLUGS[f.className];
      const specSlug = f.spec.toLowerCase().replace(/\s+/g, "-");
      const tag = `[RETRY ${retry}] ${f.className} ${f.spec}`;

      console.log(`${tag} — fetching…`);

      try {
        const result = await analyzeSpec(f.className, f.spec, dungeonMap);

        if (result.analyzed_count > 0) {
          const classDir = path.join(OUTPUT_DIR, classSlug);
          await fs.mkdir(classDir, { recursive: true });
          const filepath = path.join(classDir, `${specSlug}.json`);
          await fs.writeFile(filepath, JSON.stringify(result, null, 2), "utf-8");
        }

        const slotCount = Object.keys(result.bis).length;
        const idx = results.findIndex(
          (r) => r.className === f.className && r.spec === f.spec
        );
        if (idx >= 0) {
          results[idx] = { className: f.className, spec: f.spec, analyzed: result.analyzed_count, slots: slotCount };
        }
        console.log(
          `${tag} ✅ ${result.analyzed_count} analyzed, ${slotCount} BiS slots`
        );

        // Adaptive cooldown in retries too
        if (result.analyzed_count === 0) {
          console.log(`${tag} ⏳ Still rate limited, cooling down ${RATE_LIMIT_COOLDOWN_MS / 1000}s…`);
          await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
        } else {
          await new Promise((r) => setTimeout(r, INTER_SPEC_DELAY_MS));
        }
      } catch (err) {
        console.error(
          `${tag} ❌ Fatal:`,
          err instanceof Error ? err.message : err
        );
        await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
      }
    }
  }

  // 4. Write index
  const index = {
    generated_at: new Date().toISOString(),
    season: CURRENT_SEASON.id,
    region: REGION,
    specs: tasks.map((t) => ({
      class: t.className,
      spec: t.spec,
      file: `${CLASS_SLUGS[t.className]}/${t.spec.toLowerCase().replace(/\s+/g, "-")}.json`,
    })),
  };
  await fs.writeFile(
    path.join(OUTPUT_DIR, "_index.json"),
    JSON.stringify(index, null, 2),
    "utf-8"
  );

  // 5. Summary
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const warnings = results.filter((r) => r.analyzed < TARGET_PROFILES);

  console.log("\n" + "═".repeat(60));
  console.log("GENERATION COMPLETE");
  console.log("═".repeat(60));
  console.log(`Duration: ${duration} min`);
  console.log(`Files: ${tasks.length + 1} (${tasks.length} specs + index)`);

  if (warnings.length > 0) {
    console.log(`\n⚠ ${warnings.length} specs below ${TARGET_PROFILES} analyzed:`);
    for (const w of warnings) {
      console.log(`  - ${w.className} ${w.spec}: ${w.analyzed} analyzed, ${w.slots} slots`);
    }
  }

  const failures = results.filter((r) => r.analyzed === 0);
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} specs with 0 analyzed:`);
    for (const f of failures) {
      console.log(`  - ${f.className} ${f.spec}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
