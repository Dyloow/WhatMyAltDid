import { auth } from "@/lib/auth";
import { getAccountCharacters, getCharacterProfile, getRaidProfileFresh, RaidProfile } from "@/lib/blizzard-api";
import { getRioCharacterProfile } from "@/lib/raiderio-api";
import { getWeeklyRaidKillsFromWcl } from "@/lib/warcraftlogs-api";
import { CURRENT_SEASON } from "@/lib/season-config";
import { CharacterData } from "@/types/character";
import { NextResponse } from "next/server";

/** Returns the timestamp (ms) of the most recent weekly reset for the given region. */
function getLastResetTimestamp(region: string): number {
  const now = Date.now();
  // EU/KR/TW reset: Wednesday 07:00 UTC; US: Tuesday 15:00 UTC
  const isUS = region === "us";
  const resetDay  = isUS ? 2 : 3; // 0=Sun … 6=Sat; Tue=2, Wed=3
  const resetHour = isUS ? 15 : 7;

  const d = new Date(now);
  d.setUTCHours(resetHour, 0, 0, 0);
  // Walk back to last occurrence of resetDay
  const diff = (d.getUTCDay() - resetDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  // If we landed in the future, go back one more week
  if (d.getTime() > now) d.setUTCDate(d.getUTCDate() - 7);
  return d.getTime();
}

/**
 * Normalise a Blizzard encounter timestamp to milliseconds.
 * The encounters/raids endpoint returns timestamps in SECONDS (not ms),
 * but Date.now() / getLastResetTimestamp() return milliseconds.
 * Heuristic: timestamps < 5 × 10^9 are in seconds.
 */
function toMs(ts: number): number {
  return ts < 5e9 ? ts * 1000 : ts;
}

/** Count unique boss IDs killed since the last weekly reset (any difficulty). */
function calcWeeklyRaidBosses(raid: RaidProfile | null, region: string): number {
  if (!raid) return 0;
  const since = getLastResetTimestamp(region);
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

export async function POST() {
  const session = await auth();
  if (!session?.accessToken || !session.region) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const region = session.region;
  const accessToken = session.accessToken;

  try {
    const allChars = await getAccountCharacters(region, accessToken);
    const maxLevelChars = allChars.filter(
      (c) => c.level >= CURRENT_SEASON.maxLevel
    );

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

          const blzProfile   = profile.status    === "fulfilled" ? profile.value    : null;
          const rioProfile   = rio.status         === "fulfilled" ? rio.value        : null;
          const raidProfile  = raidData.status    === "fulfilled" ? raidData.value   : null;
          const wclResult    = wclData.status     === "fulfilled" ? wclData.value    : null;

          const blzBosses = calcWeeklyRaidBosses(raidProfile, region);
          const wclBosses = wclResult?.bossKills ?? 0;
          const weeklyRaidBosses = Math.max(blzBosses, wclBosses);

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
            rioScore:
              rioProfile?.mythic_plus_scores_by_season?.[0]?.scores ?? null,
            bestRuns: rioProfile?.mythic_plus_best_runs ?? [],
            weeklyRuns:
              rioProfile?.mythic_plus_weekly_highest_level_runs ?? [],
            raidProgression: rioProfile?.raid_progression ?? null,
            gear: rioProfile?.gear?.items ?? null,
            profileUrl: rioProfile?.profile_url ?? "",
            lastScanned: new Date().toISOString(),
            weeklyRaidBosses,
          };

          return charData;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    results.sort((a, b) => (b.rioScore?.all ?? 0) - (a.rioScore?.all ?? 0));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Scan failed:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
