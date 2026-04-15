import { getRioCharacterProfileFull } from "@/lib/raiderio-api";
import { getRaidProfileFresh, RaidProfile } from "@/lib/blizzard-api";
import { CharacterData } from "@/types/character";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Returns the timestamp (ms) of the most recent weekly reset for the given region. */
function getLastResetTimestamp(region: string): number {
  const now = Date.now();
  const isUS = region === "us";
  const resetDay  = isUS ? 2 : 3;
  const resetHour = isUS ? 15 : 7;
  const d = new Date(now);
  d.setUTCHours(resetHour, 0, 0, 0);
  const diff = (d.getUTCDay() - resetDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  if (d.getTime() > now) d.setUTCDate(d.getUTCDate() - 7);
  return d.getTime();
}

function toMs(ts: number): number {
  return ts < 5e9 ? ts * 1000 : ts;
}

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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region = searchParams.get("region") ?? "eu";
  const realm  = searchParams.get("realm")  ?? "";
  const name   = searchParams.get("name")   ?? "";

  if (!realm || !name) {
    return NextResponse.json({ error: "Paramètres realm et name requis." }, { status: 400 });
  }

  const profile = await getRioCharacterProfileFull(region, realm, name);

  if (!profile) {
    return NextResponse.json(
      { error: `Personnage "${name}" introuvable sur ${realm}-${region.toUpperCase()}. Vérifiez l'orthographe ou le serveur.` },
      { status: 404 }
    );
  }

  // Get weekly raid boss kills via Blizzard encounters/raids API (fresh, no cache)
  let weeklyRaidBosses = 0;
  try {
    const raidProfile = await getRaidProfileFresh(region, realm, name);
    weeklyRaidBosses = calcWeeklyRaidBosses(raidProfile, region);
  } catch (e) {
    console.warn(`[Lookup] Raid data fetch failed for ${name}:`, e);
  }

  const charData: CharacterData = {
    id: Date.now(), // synthetic ID for manual entries
    name: profile.name,
    realm: profile.realm,
    realmSlug: realm,
    region,
    level: 0,
    classId: 0,
    className: profile.class,
    specName: profile.active_spec_name,
    specRole: profile.active_spec_role,
    faction: profile.faction,
    itemLevel: profile.gear?.item_level_equipped ?? 0,
    rioScore: profile.mythic_plus_scores_by_season?.[0]?.scores ?? null,
    bestRuns: profile.mythic_plus_best_runs ?? [],
    weeklyRuns: profile.mythic_plus_weekly_highest_level_runs ?? [],
    raidProgression: profile.raid_progression ?? null,
    gear: profile.gear?.items ?? null,
    profileUrl: profile.profile_url ?? "",
    lastScanned: new Date().toISOString(),
    weeklyRaidBosses,
  };

  return NextResponse.json(charData);
}
