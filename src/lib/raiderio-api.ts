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
      
      // Retry logic with exponential backoff for rate limiting
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (res.status === 429) {
            // Rate limited - wait and retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          if (!res.ok) {
            // Don't cache 404s or other errors
            return null;
          }
          return res.json() as Promise<RioCharacterProfile>;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < 2) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          }
        }
      }
      
      // All retries failed
      throw lastError || new Error('Failed after retries');
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

/**
 * Response structure from /mythic-plus/rankings/specs endpoint
 * This endpoint returns spec-specific leaderboards directly
 */
interface RioSpecRankingsResponse {
  rankings: {
    rankedCharacters: Array<{
      rank: number;
      score: number;
      character: {
        name: string;
        realm: {
          slug: string;
        };
        region: {
          slug: string;
        };
      };
    }>;
  };
}

/**
 * Collect up to `count` unique top players of a given class/spec.
 * Uses the /mythic-plus/rankings/specs endpoint which returns players
 * ranked by M+ score for that specific spec.
 * 
 * This is much more efficient than scanning global runs and filtering,
 * especially for underplayed specs.
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
  // v4: new endpoint and cache key
  const cacheKey = `rio:topplayers4:${region}:${clsSlug}:${specSlug}`;

  try {
    return await cachedFetch(cacheKey, 3600, async () => {
      const seen = new Set<string>();
      const characters: Array<{ name: string; realm: string }> = [];

      function addChar(name: string, realmSlug: string, charRegion: string) {
        // Only add characters from the requested region
        if (charRegion !== region) return;
        
        const uid = `${realmSlug}:${name.toLowerCase()}`;
        if (!seen.has(uid)) {
          seen.add(uid);
          characters.push({ name, realm: realmSlug });
        }
      }

      // Fallback chain: configured season → tww-2 → current
      const slugsToTry = [...new Set([season, "season-tww-2", "current"])];

      // Use /mythic-plus/rankings/specs endpoint with pagination
      // Each page returns 100 characters, we may need multiple pages
      const charsPerPage = 100;
      const maxPages = Math.ceil(count / charsPerPage) + 1; // +1 for safety

      for (const s of slugsToTry) {
        if (characters.length >= count) break;

        for (let page = 0; page < maxPages && characters.length < count; page++) {
          try {
            // Use 'world' region to get all regions, then filter
            const url = `https://raider.io/api/mythic-plus/rankings/specs?region=world&season=${s}&class=${clsSlug}&spec=${specSlug}&page=${page}`;
            const res = await fetch(url, { 
              signal: AbortSignal.timeout(10000),
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WhatMyAltDid/1.0)',
                'Accept': 'application/json',
              }
            });
            
            if (!res.ok) {
              if (res.status === 404) break; // No more pages
              continue;
            }

            const data = await res.json() as RioSpecRankingsResponse;
            const rankedChars = data?.rankings?.rankedCharacters;
            
            if (!rankedChars || rankedChars.length === 0) break;

            for (const rc of rankedChars) {
              if (characters.length >= count) break;
              addChar(rc.character.name, rc.character.realm.slug, rc.character.region.slug);
            }

            // Small delay between pages to be nice to the API
            if (page > 0 && page % 2 === 0) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (err) {
            // On error, try next season
            break;
          }
        }

        // If we found enough players with this season slug, stop trying others
        if (characters.length >= count) break;
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
