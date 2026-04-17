import { getRioCharacterProfileFull } from "@/lib/raiderio-api";
import { getRaidProfileFresh, RaidProfile } from "@/lib/blizzard-api";
import { getWeeklyRaidKillsFromWcl } from "@/lib/warcraftlogs-api";
import { getWeeklyResetTimestamp, toMs } from "@/lib/weekly-reset";
import { BossKill, CharacterData } from "@/types/character";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

function extractWeeklyBossKills(raid: RaidProfile | null, region: string): BossKill[] {
  if (!raid) return [];
  const since = getWeeklyResetTimestamp(region);

  const kills: BossKill[] = [];
  const seen = new Set<string>();

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

  let weeklyRaidBosses = 0;
  let weeklyBossKills: BossKill[] = [];
  try {
    const [raidProfile, wclResult] = await Promise.allSettled([
      getRaidProfileFresh(region, realm, name),
      getWeeklyRaidKillsFromWcl(region, realm, name),
    ]);

    const raid = raidProfile.status === "fulfilled" ? raidProfile.value : null;
    const wcl  = wclResult.status  === "fulfilled" ? wclResult.value  : null;

    const blzBosses = calcWeeklyRaidBosses(raid, region);
    const wclBosses = wcl?.bossKills ?? 0;
    weeklyRaidBosses = Math.max(blzBosses, wclBosses);

    const blzKills = extractWeeklyBossKills(raid, region);
    const wclKills = wcl?.bossKillDetails ?? [];
    const seen = new Set<string>();
    const merged: BossKill[] = [];
    for (const k of blzKills) {
      const key = `${k.bossId}:${k.difficulty}`;
      if (!seen.has(key)) { seen.add(key); merged.push(k); }
    }
    for (const k of wclKills) {
      const key = `${k.bossId}:${k.difficulty}`;
      if (!seen.has(key)) { seen.add(key); merged.push(k); }
    }
    weeklyBossKills = merged;
  } catch (e) {
    console.warn(`[Lookup] Raid data fetch failed for ${name}:`, e);
  }

  const charData: CharacterData = {
    id: Date.now(),
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
    weeklyBossKills,
  };

  return NextResponse.json(charData);
}
