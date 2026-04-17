import { auth } from "@/lib/auth";
import { getAccountCharacters, getCharacterProfile, getRaidProfileFresh, RaidProfile } from "@/lib/blizzard-api";
import { getRioCharacterProfile } from "@/lib/raiderio-api";
import { getWeeklyRaidKillsFromWcl } from "@/lib/warcraftlogs-api";
import { CURRENT_SEASON } from "@/lib/season-config";
import { getWeeklyResetTimestamp, toMs } from "@/lib/weekly-reset";
import { BossKill, CharacterData } from "@/types/character";
// Note: CURRENT_SEASON used below for maxLevel filter only
import { NextResponse } from "next/server";

/** Count unique boss IDs killed since the last weekly reset (any difficulty). */
function calcWeeklyRaidBosses(raid: RaidProfile | null, region: string): number {
  if (!raid) return 0;
  const since = getWeeklyResetTimestamp(region);
  const killed = new Set<number>();
  for (const expansion of raid.expansions ?? []) {
    for (const instance of expansion.instances ?? []) {
      for (const mode of instance.modes ?? []) {
        for (const enc of mode.progress?.encounters ?? []) {
          if (enc.last_kill_timestamp && toMs(enc.last_kill_timestamp) > since) {
            killed.add(enc.encounter.id);
          }
        }
      }
    }
  }
  return killed.size;
}

/** Extract per-boss, per-difficulty kills from this week across ALL raids.
 *  No filtering by season config IDs — uses real Blizzard encounter IDs. */
function extractWeeklyBossKills(raid: RaidProfile | null, region: string): BossKill[] {
  if (!raid) return [];
  const since = getWeeklyResetTimestamp(region);

  const kills: BossKill[] = [];
  const seen = new Set<string>(); // deduplicate bossId+difficulty

  for (const expansion of raid.expansions ?? []) {
    for (const instance of expansion.instances ?? []) {
      for (const mode of instance.modes ?? []) {
        const difficultyRaw = mode.difficulty?.type?.toLowerCase() ?? "";
        let difficulty: BossKill["difficulty"] | null = null;
        if (difficultyRaw === "normal" || difficultyRaw === "lfr") difficulty = "normal";
        else if (difficultyRaw === "heroic") difficulty = "heroic";
        else if (difficultyRaw === "mythic") difficulty = "mythic";
        if (!difficulty) continue;

        for (const enc of mode.progress?.encounters ?? []) {
          if (!enc.last_kill_timestamp) continue;
          if (toMs(enc.last_kill_timestamp) <= since) continue;

          const key = `${enc.encounter.id}:${difficulty}`;
          if (seen.has(key)) continue;
          seen.add(key);

          kills.push({
            bossId: enc.encounter.id,
            bossName: enc.encounter.name,
            difficulty,
            killedAt: toMs(enc.last_kill_timestamp),
          });
        }
      }
    }
  }
  return kills;
}

export async function POST() {
  const session = await auth();
  if (!session?.accessToken || !session.region) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const region = session.region;
  const accessToken = session.accessToken;

  try {
    const allChars = await getAccountCharacters(region, accessToken);
    const maxLevelChars = allChars.filter((c) => c.level >= CURRENT_SEASON.maxLevel);

    const results: CharacterData[] = [];
    const batchSize = 5;

    for (let i = 0; i < maxLevelChars.length; i += batchSize) {
      const batch = maxLevelChars.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (char) => {
          const [profile, rio, raidData, wclData] = await Promise.allSettled([
            getCharacterProfile(region, char.realm.slug, char.name, accessToken),
            getRioCharacterProfile(region, char.realm.slug, char.name),
            getRaidProfileFresh(region, char.realm.slug, char.name, accessToken),
            getWeeklyRaidKillsFromWcl(region, char.realm.slug, char.name),
          ]);

          const blzProfile  = profile.status   === "fulfilled" ? profile.value   : null;
          const rioProfile  = rio.status        === "fulfilled" ? rio.value       : null;
          const raidProfile = raidData.status   === "fulfilled" ? raidData.value  : null;
          const wclResult   = wclData.status    === "fulfilled" ? wclData.value   : null;

          const blzBosses = calcWeeklyRaidBosses(raidProfile, region);
          const wclBosses = wclResult?.bossKills ?? 0;
          const weeklyRaidBosses = Math.max(blzBosses, wclBosses);

          // Merge Blizzard + WCL kills — WCL carries real encounter IDs
          const blzKills = extractWeeklyBossKills(raidProfile, region);
          const wclKills = wclResult?.bossKillDetails ?? [];

          // Build merged list: start from Blizzard kills, fill gaps with WCL
          const seen = new Set<string>();
          const merged: BossKill[] = [];
          for (const k of blzKills) {
            const key = `${k.bossId}:${k.difficulty}`;
            if (!seen.has(key)) { seen.add(key); merged.push(k); }
          }
          // Add WCL kills not already in Blizzard data (match by bossId+difficulty)
          // Also: if a boss from WCL has a different ID than Blizzard (shouldn't happen
          // but WCL is the authoritative source for encounter IDs), prefer WCL ID
          for (const k of wclKills) {
            const key = `${k.bossId}:${k.difficulty}`;
            if (!seen.has(key)) { seen.add(key); merged.push(k); }
          }
          const weeklyBossKills = merged;

          const charData: CharacterData = {
            id: char.id,
            name: char.name,
            realm: char.realm.name,
            realmSlug: char.realm.slug,
            region,
            level: char.level,
            classId: char.playable_class.id,
            className: rioProfile?.class ?? char.playable_class.name,
            specName: rioProfile?.active_spec_name ?? blzProfile?.active_spec?.name ?? "",
            specRole: rioProfile?.active_spec_role ?? "DPS",
            faction: char.faction.type,
            itemLevel: blzProfile?.average_item_level ?? 0,
            rioScore: rioProfile?.mythic_plus_scores_by_season?.[0]?.scores ?? null,
            bestRuns: rioProfile?.mythic_plus_best_runs ?? [],
            weeklyRuns: rioProfile?.mythic_plus_weekly_highest_level_runs ?? [],
            raidProgression: rioProfile?.raid_progression ?? null,
            gear: rioProfile?.gear?.items ?? null,
            profileUrl: rioProfile?.profile_url ?? "",
            lastScanned: new Date().toISOString(),
            weeklyRaidBosses,
            weeklyBossKills,
          };

          return charData;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") results.push(result.value);
      }
    }

    results.sort((a, b) => (b.rioScore?.all ?? 0) - (a.rioScore?.all ?? 0));
    return NextResponse.json(results);
  } catch (error) {
    console.error("Scan failed:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
