import { cachedFetch } from "./cache";

const RIO_BASE = "https://raider.io/api/v1";

export interface RioMythicPlusScore {
  all: number;
  dps: number;
  healer: number;
  tank: number;
}

export interface RioBestRun {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  num_keystone_upgrades: number;
  score: number;
  clear_time_ms: number;
  par_time_ms: number;
  affixes: { id: number; name: string; description: string; icon: string }[];
  completed_at: string;
}

export interface RioRaidProgression {
  summary: string;
  total_bosses: number;
  normal_bosses_killed: number;
  heroic_bosses_killed: number;
  mythic_bosses_killed: number;
}

export interface RioGearItem {
  item_id: number;
  item_level: number;
  icon: string;
  name: string;
  is_legendary: boolean;
  bonuses: number[];
  gems: number[];
  enchant: number;
  is_crafted?: boolean;
  quality?: { type: string };
}

export interface RioGear {
  item_level_equipped: number;
  item_level_total: number;
  items: Record<string, RioGearItem>;
}

export interface RioCharacterProfile {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  active_spec_role: string;
  gender: string;
  faction: string;
  region: string;
  realm: string;
  profile_url: string;
  thumbnail_url?: string;
  gear?: RioGear;
  mythic_plus_scores_by_season?: {
    season: string;
    scores: RioMythicPlusScore;
  }[];
  mythic_plus_best_runs?: RioBestRun[];
  mythic_plus_weekly_highest_level_runs?: RioBestRun[];
  raid_progression?: Record<string, RioRaidProgression>;
}

const BASE_FIELDS = [
  "mythic_plus_scores_by_season:current",
  "mythic_plus_best_runs",
  "mythic_plus_weekly_highest_level_runs",
  "raid_progression",
].join(",");

const FULL_FIELDS = BASE_FIELDS + ",gear";

export async function getRioCharacterProfile(
  region: string,
  realm: string,
  name: string
): Promise<RioCharacterProfile | null> {
  const key = `rio:${region}:${realm}:${name}`;
  try {
    return await cachedFetch(key, 900, async () => {
      const url = `${RIO_BASE}/characters/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(name)}&fields=${BASE_FIELDS}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`RIO ${res.status}`);
      return res.json() as Promise<RioCharacterProfile>;
    });
  } catch {
    return null;
  }
}

export async function getRioCharacterProfileFull(
  region: string,
  realm: string,
  name: string
): Promise<RioCharacterProfile | null> {
  const key = `rio:full:${region}:${realm}:${name}`;
  try {
    return await cachedFetch(key, 900, async () => {
      const url = `${RIO_BASE}/characters/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(name)}&fields=${FULL_FIELDS}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`RIO ${res.status}`);
      return res.json() as Promise<RioCharacterProfile>;
    });
  } catch {
    return null;
  }
}

export interface RioRankedCharacter {
  rank: number;
  score: number;
  character: {
    name: string;
    realm: { slug: string; name: string };
    class: string;
    spec: string;
    region: { slug: string };
  };
}

export async function getRioRankings(
  region: string,
  cls: string,
  spec: string,
  count = 20
): Promise<RioRankedCharacter[]> {
  const key = `rio:rankings:${region}:${cls}:${spec}`;
  try {
    return await cachedFetch(key, 3600, async () => {
      const clsSlug  = cls.toLowerCase().replace(/\s+/g, "-");
      const specSlug = spec.toLowerCase().replace(/\s+/g, "-");
      // Try with CURRENT_SEASON slug first, fall back to "current"
      const seasons = ["season-mn-1", "current"];
      for (const season of seasons) {
        const url = `${RIO_BASE}/mythic-plus/rankings/characters?region=${region}&season=${season}&class=${clsSlug}&spec=${specSlug}&page=0`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json() as Record<string, unknown>;
        // Raider.IO v1 may return rankedCharacters at different depths
        const chars: RioRankedCharacter[] =
          (Array.isArray(data) ? data : null) ??
          (Array.isArray(data.rankedCharacters) ? data.rankedCharacters as RioRankedCharacter[] : null) ??
          (data.rankings && typeof data.rankings === "object" && Array.isArray((data.rankings as Record<string, unknown>).rankedCharacters)
            ? (data.rankings as { rankedCharacters: RioRankedCharacter[] }).rankedCharacters
            : null) ??
          [];
        if (chars.length > 0) return chars.slice(0, count);
      }
      return [];
    });
  } catch {
    return [];
  }
}

// Actual RIO runs API response structure (confirmed via live API inspection)
interface RioRunsResponse {
  rankings?: Array<{
    run: {
      roster?: Array<{
        character: {
          name: string;
          realm: { slug: string };
          class: { slug: string };
          spec: { slug: string };
        };
      }>;
    };
  }>;
}

/**
 * Collect up to `count` unique players of a given class/spec by scanning
 * the top M+ run rankings (free RIO endpoint).
 * Season slug fallback order: configured season → season-tww-2 → current
 */
export async function getRioTopPlayersBySpec(
  region: string,
  cls: string,
  spec: string,
  count = 100,
  season: string
): Promise<Array<{ name: string; realm: string }>> {
  const clsSlug  = cls.toLowerCase().replace(/\s+/g, "-");
  const specSlug = spec.toLowerCase().replace(/\s+/g, "-");
  const cacheKey = `rio:topplayers2:${region}:${clsSlug}:${specSlug}`;

  try {
    return await cachedFetch(cacheKey, 3600, async () => {
      const seen = new Set<string>();
      const characters: Array<{ name: string; realm: string }> = [];

      // Fallback chain: configured season → tww-2 (last known real slug) → current
      const slugsToTry = [...new Set([season, "season-tww-2", "current"])];

      for (const s of slugsToTry) {
        if (characters.length >= count) break;

        // Scan up to 30 pages × 20 runs × 5 members = 3 000 members per season slug
        for (let page = 0; page < 30 && characters.length < count; page++) {
          const url = `${RIO_BASE}/mythic-plus/runs?season=${s}&region=${region}&dungeon=all&page=${page}`;
          let res: Response;
          try {
            res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          } catch {
            break;
          }
          if (!res.ok) break;

          const data = await res.json() as RioRunsResponse;
          const rankings = data.rankings;
          if (!rankings?.length) break;

          for (const ranking of rankings) {
            for (const member of (ranking.run.roster ?? [])) {
              const char = member.character;
              if (char?.class?.slug === clsSlug && char?.spec?.slug === specSlug) {
                const uid = `${char.realm.slug}:${char.name.toLowerCase()}`;
                if (!seen.has(uid)) {
                  seen.add(uid);
                  characters.push({ name: char.name, realm: char.realm.slug });
                  if (characters.length >= count) break;
                }
              }
            }
            if (characters.length >= count) break;
          }
        }

        // If we found players with this season slug, stop trying others
        if (characters.length > 0) break;
      }

      return characters;
    });
  } catch {
    return [];
  }
}

export interface RioAffix {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface RioAffixesResponse {
  region: string;
  title: string;
  affix_details: RioAffix[];
}

export async function getCurrentAffixes(region = "eu"): Promise<RioAffix[]> {
  const key = `rio:affixes:${region}`;
  return cachedFetch(key, 21600, async () => {
    const url = `${RIO_BASE}/mythic-plus/affixes?region=${region}&locale=fr`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as RioAffixesResponse;
    return data.affix_details ?? [];
  });
}
