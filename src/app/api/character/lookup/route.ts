import { getRioCharacterProfileFull } from "@/lib/raiderio-api";
import { CharacterData } from "@/types/character";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    weeklyRaidBosses: 0, // no Blizzard token available for manual lookups
  };

  return NextResponse.json(charData);
}
