import { cachedFetch } from "./cache";
import { getClientCredentialsToken } from "./blizzard-auth";

const API_BASE = (region: string) =>
  `https://${region}.api.blizzard.com`;

interface BlizzardRequestOptions {
  region: string;
  accessToken: string;
  locale?: string;
}

async function blizzardFetch<T>(
  path: string,
  { region, accessToken, locale = "fr_FR" }: BlizzardRequestOptions
): Promise<T> {
  const base = API_BASE(region);
  const separator = path.includes("?") ? "&" : "?";
  const url = `${base}${path}${separator}namespace=profile-${region}&locale=${locale}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Blizzard API ${res.status}: ${url}`);
  }

  return res.json() as Promise<T>;
}

export interface WowCharacterSummary {
  id: number;
  name: string;
  realm: { slug: string; name: string };
  level: number;
  playable_class: { id: number; name: string };
  playable_race: { name: string };
  faction: { type: string; name: string };
  gender: { type: string };
}

export interface WowAccountProfile {
  wow_accounts: {
    characters: WowCharacterSummary[];
  }[];
}

export async function getAccountCharacters(
  region: string,
  accessToken: string
): Promise<WowCharacterSummary[]> {
  return cachedFetch(
    `blz:user:${region}:characters`,
    1800, // 30 min
    async () => {
      const profile = await blizzardFetch<WowAccountProfile>(
        "/profile/user/wow",
        { region, accessToken }
      );
      return profile.wow_accounts.flatMap((a) => a.characters);
    }
  );
}

export interface CharacterProfile {
  id: number;
  name: string;
  level: number;
  character_class: { id: number; name: string };
  active_spec?: { id: number; name: string };
  realm: { slug: string; name: string };
  faction: { type: string };
  average_item_level: number;
  equipped_item_level: number;
}

export async function getCharacterProfile(
  region: string,
  realm: string,
  name: string,
  accessToken: string
): Promise<CharacterProfile> {
  const key = `blz:char:${region}:${realm}:${name}:profile`;
  return cachedFetch(key, 900, () =>
    blizzardFetch<CharacterProfile>(
      `/profile/wow/character/${realm}/${encodeURIComponent(name.toLowerCase())}`,
      { region, accessToken }
    )
  );
}

export interface MythicKeystoneRun {
  dungeon: { name: string; id: number };
  mythic_rating: { rating: number; color: { r: number; g: number; b: number } };
  is_completed_within_time: boolean;
  keystone_level: number;
  duration: number;
  completed_timestamp: number;
}

export interface MythicKeystoneProfile {
  current_mythic_rating?: { rating: number };
  best_runs?: MythicKeystoneRun[];
}

export async function getMythicKeystoneProfile(
  region: string,
  realm: string,
  name: string,
  accessToken: string
): Promise<MythicKeystoneProfile | null> {
  const key = `blz:char:${region}:${realm}:${name}:mplus`;
  try {
    return await cachedFetch(key, 600, () =>
      blizzardFetch<MythicKeystoneProfile>(
        `/profile/wow/character/${realm}/${encodeURIComponent(name.toLowerCase())}/mythic-keystone-profile`,
        { region, accessToken }
      )
    );
  } catch {
    return null;
  }
}

export interface RaidEncounter {
  encounter: { id: number; name: string };
  completed_count: number;
  last_kill_timestamp: number;
}

export interface RaidInstance {
  instance: { name: string; id: number };
  modes: {
    difficulty: { type: string; name: string };
    status: { type: string };
    progress: { completed_count: number; total_count: number; encounters: RaidEncounter[] };
  }[];
}

export interface RaidProfile {
  expansions: {
    expansion: { name: string };
    instances: RaidInstance[];
  }[];
}

export async function getRaidProfile(
  region: string,
  realm: string,
  name: string,
  accessToken: string
): Promise<RaidProfile | null> {
  const key = `blz:char:${region}:${realm}:${name}:raids`;
  try {
    return await cachedFetch(key, 1800, () =>
      blizzardFetch<RaidProfile>(
        `/profile/wow/character/${realm}/${encodeURIComponent(name.toLowerCase())}/encounters/raids`,
        { region, accessToken }
      )
    );
  } catch {
    return null;
  }
}

// ─── Game Data (client credentials, no user token needed) ────────────────────

async function gameDataFetch<T>(path: string, region: string): Promise<T> {
  const token = await getClientCredentialsToken(region);
  const base = API_BASE(region);
  const separator = path.includes("?") ? "&" : "?";
  const url = `${base}${path}${separator}namespace=static-${region}&locale=fr_FR`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86400 }, // static data, 24h
  });
  if (!res.ok) throw new Error(`Blizzard game data ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface JournalEncounterItemRef {
  id: number;
  name: string;
  quality?: { type: string };
}

interface JournalEncounterData {
  id: number;
  name: string;
  items?: JournalEncounterItemRef[];
  sections?: { title: string; body_text?: string }[];
}

interface JournalInstanceData {
  id: number;
  name: string;
  encounters?: { key: { href: string }; id: number; name: string }[];
}

/**
 * Returns a map of item_id → dungeon display name for all encounters in the given
 * Blizzard journal instance. Returns {} on failure.
 */
export async function getJournalInstanceItems(
  instanceId: number,
  region: string
): Promise<Record<number, string>> {
  const key = `blz:journal:${region}:${instanceId}`;
  try {
    return await cachedFetch(key, 604800, async () => {
      const instance = await gameDataFetch<JournalInstanceData>(
        `/data/wow/journal-instance/${instanceId}`,
        region
      );
      const dungeonName = instance.name;
      const result: Record<number, string> = {};

      if (!instance.encounters?.length) return result;

      const encounterData = await Promise.allSettled(
        instance.encounters.map((e) =>
          gameDataFetch<JournalEncounterData>(
            `/data/wow/journal-encounter/${e.id}`,
            region
          )
        )
      );

      for (const enc of encounterData) {
        if (enc.status === "fulfilled" && enc.value.items) {
          for (const item of enc.value.items) {
            result[item.id] = dungeonName;
          }
        }
      }

      return result;
    });
  } catch {
    return {};
  }
}
