/**
 * Warcraft Logs API v2 (GraphQL) integration.
 *
 * Provides weekly raid boss kill counts per character.
 * Requires WARCRAFTLOGS_CLIENT_ID and WARCRAFTLOGS_CLIENT_SECRET env vars.
 * Register at: https://www.warcraftlogs.com/api/clients
 *
 * When keys are not configured, all functions return null so the app
 * falls back to the Blizzard encounters/raids API.
 */

import { cachedFetch } from "./cache";

const TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const API_URL   = "https://www.warcraftlogs.com/api/v2/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

function isConfigured(): boolean {
  return !!(process.env.WARCRAFTLOGS_CLIENT_ID && process.env.WARCRAFTLOGS_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string | null> {
  if (!isConfigured()) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.WARCRAFTLOGS_CLIENT_ID!,
      client_secret: process.env.WARCRAFTLOGS_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    console.error(`WCL auth failed: ${res.status}`);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

// ─── GraphQL helper ───────────────────────────────────────────────────────────

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    console.error(`WCL API ${res.status}`);
    return null;
  }

  const json = await res.json() as { data?: T; errors?: unknown[] };
  if (json.errors) {
    console.error("WCL GraphQL errors:", json.errors);
  }
  return json.data ?? null;
}

// ─── Weekly raid boss kills ───────────────────────────────────────────────────

interface WclFight {
  encounterID: number;
  name: string;
  kill: boolean;
  difficulty: number | null;
  startTime: number;
  endTime: number;
}

interface WclReport {
  startTime: number;
  endTime: number;
  zone: { id: number; name: string } | null;
  fights: WclFight[];
}

interface WclCharacterData {
  characterData: {
    character: {
      recentReports: {
        data: WclReport[];
      } | null;
    } | null;
  };
}

const RECENT_REPORTS_QUERY = `
  query ($name: String!, $server: String!, $region: String!) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        recentReports(limit: 15) {
          data {
            startTime
            endTime
            zone { id name }
            fights(killType: Kills) {
              encounterID
              name
              kill
              difficulty
              startTime
              endTime
            }
          }
        }
      }
    }
  }
`;

/**
 * Returns the timestamp (ms) of the most recent weekly reset for the given region.
 */
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

/** WCL difficulty numbers → our difficulty type.
 *  WoW: 1=LFR, 2=Normal, 3=Heroic, 4=Mythic */
function wclDiffToOurs(d: number | null): "normal" | "heroic" | "mythic" | null {
  if (d === 1 || d === 2) return "normal";
  if (d === 3) return "heroic";
  if (d === 4) return "mythic";
  return null;
}

export interface WclBossKill {
  bossId: number;
  bossName: string;
  difficulty: "normal" | "heroic" | "mythic";
  killedAt: number; // ms timestamp
}

export interface WclWeeklyRaidResult {
  bossKills: number;
  bossKillDetails: WclBossKill[];
  source: "warcraftlogs";
}

/**
 * Get weekly raid boss kills via Warcraft Logs.
 * Returns null when WCL is not configured or data is unavailable.
 * Provides real Blizzard encounter IDs and per-difficulty kill details.
 */
export async function getWeeklyRaidKillsFromWcl(
  region: string,
  realm: string,
  name: string,
): Promise<WclWeeklyRaidResult | null> {
  if (!isConfigured()) return null;

  const cacheKey = `wcl:weekly:${region}:${realm}:${name}`;

  try {
    return await cachedFetch(cacheKey, 900, async () => {
      const regionSlug = region.toLowerCase();
      const data = await gql<WclCharacterData["characterData"]>(
        RECENT_REPORTS_QUERY,
        { name, server: realm, region: regionSlug },
      );

      if (!data?.character?.recentReports?.data) return null;

      const since = getLastResetTimestamp(region);
      // Deduplicate per bossId+difficulty, keep earliest kill timestamp
      const seen = new Map<string, WclBossKill>();

      for (const report of data.character.recentReports.data) {
        if (report.endTime < since) continue;

        for (const fight of report.fights) {
          if (!fight.kill || fight.encounterID <= 0) continue;
          const diff = wclDiffToOurs(fight.difficulty);
          if (!diff) continue;

          const key = `${fight.encounterID}:${diff}`;
          if (!seen.has(key)) {
            // WCL fight timestamps are relative to report.startTime (in ms)
            const killedAt = report.startTime + fight.endTime;
            seen.set(key, {
              bossId: fight.encounterID,
              bossName: fight.name,
              difficulty: diff,
              killedAt,
            });
          }
        }
      }

      const bossKillDetails = Array.from(seen.values());
      // Count unique boss IDs (regardless of difficulty)
      const uniqueBosses = new Set(bossKillDetails.map((k) => k.bossId)).size;

      return {
        bossKills: uniqueBosses,
        bossKillDetails,
        source: "warcraftlogs" as const,
      };
    });
  } catch (e) {
    console.error("WCL weekly raid error:", e);
    return null;
  }
}
