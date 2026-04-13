import { CharacterData } from "@/types/character";
import { CURRENT_SEASON, getVaultIlvl, getVaultSlots } from "./season-config";

export interface VaultCategory {
  label: string;
  current: number;
  thresholds: number[];
  slots: number;
  maxSlots: number;
  ilvl: number | null;
}

export interface VaultSummary {
  dungeon: VaultCategory;
  raid: VaultCategory;
  totalSlots: number;
  maxSlots: number;
  bestIlvl: number | null;
}

export interface VaultTodo {
  priority: "high" | "medium" | "low";
  text: string;
  category: "dungeon" | "raid";
}

export function calculateVault(character: CharacterData): VaultSummary {
  const weeklyRuns = character.weeklyRuns.length;
  const highestKey = character.weeklyRuns.reduce(
    (max, r) => Math.max(max, r.mythic_level),
    0
  );

  const dungeonSlots = getVaultSlots("dungeon", weeklyRuns);
  const dungeonIlvl  = getVaultIlvl(highestKey);

  const raidBosses = character.weeklyRaidBosses ?? 0;
  const raidSlots  = getVaultSlots("raid", raidBosses);
  // Vault ilvl for raid: based on highest raid difficulty killed this week
  // Using heroic ilvl range mid-point as a reasonable default when bosses > 0
  const raidIlvl = raidBosses > 0
    ? CURRENT_SEASON.raidIlvlRanges.heroic[1]
    : null;

  const totalSlots = dungeonSlots + raidSlots;
  const ilvls = [dungeonIlvl, raidIlvl].filter((v): v is number => v !== null);
  const bestIlvl = ilvls.length > 0 ? Math.max(...ilvls) : null;

  return {
    dungeon: {
      label: "Donjons M+",
      current: weeklyRuns,
      thresholds: CURRENT_SEASON.vaultSlots.dungeon,
      slots: dungeonSlots,
      maxSlots: 3,
      ilvl: dungeonIlvl,
    },
    raid: {
      label: "Raid",
      current: raidBosses,
      thresholds: CURRENT_SEASON.vaultSlots.raid,
      slots: raidSlots,
      maxSlots: 3,
      ilvl: raidIlvl,
    },
    totalSlots,
    maxSlots: 6,
    bestIlvl,
  };
}

export function getVaultTodos(character: CharacterData): VaultTodo[] {
  const vault = calculateVault(character);
  const todos: VaultTodo[] = [];

  const nextDungeonThreshold = vault.dungeon.thresholds.find(
    (t) => t > vault.dungeon.current
  );
  if (nextDungeonThreshold) {
    const needed   = nextDungeonThreshold - vault.dungeon.current;
    const nextSlot = vault.dungeon.slots + 1;
    todos.push({
      priority: needed <= 2 ? "high" : "medium",
      text: `+${needed} run${needed > 1 ? "s" : ""} M+ → ${nextDungeonThreshold}/${
        vault.dungeon.thresholds[vault.dungeon.thresholds.length - 1]
      } → slot ${nextSlot}/3`,
      category: "dungeon",
    });
  }

  const nextRaidThreshold = vault.raid.thresholds.find(
    (t) => t > vault.raid.current
  );
  if (nextRaidThreshold) {
    const needed   = nextRaidThreshold - vault.raid.current;
    const nextSlot = vault.raid.slots + 1;
    todos.push({
      priority: needed <= 2 ? "medium" : "low",
      text: `+${needed} boss${needed > 1 ? "es" : ""} raid → ${nextRaidThreshold} → slot ${nextSlot}/3`,
      category: "raid",
    });
  }

  return todos;
}
