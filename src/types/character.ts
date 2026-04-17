import { RioBestRun, RioGearItem, RioMythicPlusScore, RioRaidProgression } from "@/lib/raiderio-api";

export interface BossKill {
  bossId: number;
  bossName: string;
  difficulty: "normal" | "heroic" | "mythic";
  killedAt: number; // Unix timestamp ms
}

export interface CharacterData {
  id: number;
  name: string;
  realm: string;
  realmSlug: string;
  region: string;
  level: number;
  classId: number;
  className: string;
  specName: string;
  specRole: string;
  faction: string;
  itemLevel: number;
  rioScore: RioMythicPlusScore | null;
  bestRuns: RioBestRun[];
  weeklyRuns: RioBestRun[];
  raidProgression: Record<string, RioRaidProgression> | null;
  gear: Record<string, RioGearItem> | null;
  profileUrl: string;
  lastScanned: string;
  weeklyRaidBosses: number;
  weeklyBossKills: BossKill[];
}

export interface ScanProgress {
  total: number;
  scanned: number;
  current: string;
  status: "scanning" | "done" | "error";
}
