export interface Dungeon {
  id: number;
  name: string;
  shortName: string;
  rioName: string; // English name as returned by Raider.IO API
  origin: string;
  journalInstanceId: number | null; // Blizzard journal instance ID (null = unknown / new expansion)
}

export interface RaidBoss {
  id: number;
  /** i18n key for the boss name — e.g. "boss.averzian". Used in RaidTracker. */
  i18nKey: string;
  /** Real Blizzard journal encounter ID — used for boss portrait proxy (/api/boss-icon/[id]).
   *  Discovered automatically from WCL kill data when available. */
  journalId?: number;
  /** Direct image URL override — paste any working URL here to bypass the API proxy. */
  imageUrl?: string;
  /** English name — used as tooltip/alt and i18n fallback. */
  name: string;
  raid: string;
}

export interface Raid {
  /** i18n key for the raid name — e.g. "raid.void_spire". Used in RaidTracker. */
  i18nKey: string;
  name: string;
  shortName: string;
  bosses: RaidBoss[];
}

export interface VaultIlvlEntry {
  keyLevel: number;
  endOfDungeon: number;
  vault: number;
  crests: string;
}

export interface SeasonConfig {
  id: string;
  name: string;
  expansion: string;
  maxLevel: number;
  rioSeasonSlug: string;
  dungeons: Dungeon[];
  raids: Raid[];
  vaultIlvlTable: VaultIlvlEntry[];
  vaultSlots: {
    dungeon: number[];
    raid: number[];
    world: number[];
  };
  raidIlvlRanges: {
    normal: [number, number];
    heroic: [number, number];
    mythic: [number, number];
  };
}

export const CURRENT_SEASON: SeasonConfig = {
  id: "season-mn-1",
  name: "Midnight Season 1",
  expansion: "Midnight",
  maxLevel: 90,
  rioSeasonSlug: "season-mn-1",
  dungeons: [
    { id: 1, name: "Terrasse des Magistères", shortName: "MT", rioName: "Magisters' Terrace", origin: "Burning Crusade", journalInstanceId: 709 },
    { id: 2, name: "Cavernes de Maisara", shortName: "MC", rioName: "Maisara Caverns", origin: "Midnight", journalInstanceId: null },
    { id: 3, name: "Point-nexus Xenas", shortName: "NPX", rioName: "Nexus-Point Xenas", origin: "Midnight", journalInstanceId: null },
    { id: 4, name: "Flèche de Coursevent", shortName: "WS", rioName: "Windrunner Spire", origin: "Midnight", journalInstanceId: null },
    { id: 5, name: "Académie d'Algheth'ar", shortName: "AA", rioName: "Algeth'ar Academy", origin: "Dragonflight", journalInstanceId: 1194 },
    { id: 6, name: "Siège du Triumvirat", shortName: "SotT", rioName: "Seat of the Triumvirate", origin: "Legion", journalInstanceId: 877 },
    { id: 7, name: "Orée-du-ciel", shortName: "SR", rioName: "Skyreach", origin: "Warlords of Draenor", journalInstanceId: 1228 },
    { id: 8, name: "Fosse de Saron", shortName: "PoS", rioName: "Pit of Saron", origin: "Wrath of the Lich King", journalInstanceId: 632 },
  ],
  raids: [
    {
      i18nKey: "raid.void_spire",
      name: "Flèche du Vide",
      shortName: "FV",
      bosses: [
        { id: 1, i18nKey: "boss.averzian",         journalId: 3176, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-host-general.png",             name: "Imperator Averzian",        raid: "Flèche du Vide" },
        { id: 2, i18nKey: "boss.vorasius",          journalId: 3177, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-malformed-manifestation.png",  name: "Vorasius",                  raid: "Flèche du Vide" },
        { id: 3, i18nKey: "boss.salhadaar",         journalId: 3179, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-salhadaar.png",                name: "Fallen-King Salhadaar",     raid: "Flèche du Vide" },
        { id: 4, i18nKey: "boss.vaelgor_ezzorak",  journalId: 3178, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-dragon-duo.png",               name: "Vaelgor & Ezzorak",         raid: "Flèche du Vide" },
        { id: 5, i18nKey: "boss.lightblinded",      journalId: 3180, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-paladin-trio.png",             name: "Lightblinded Vanguard",     raid: "Flèche du Vide" },
        { id: 6, i18nKey: "boss.crown_cosmos",      journalId: 3181, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-lura-midnight.png",            name: "Crown of the Cosmos",       raid: "Flèche du Vide" },
      ],
    },
    {
      i18nKey: "raid.dream_rift",
      name: "Faille du Rêve",
      shortName: "FR",
      bosses: [
        { id: 7, i18nKey: "boss.chimaerus",         journalId: 3306, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-kaiju.png",                   name: "Chimaerus the Undreamt God", raid: "Faille du Rêve" },
      ],
    },
    {
      i18nKey: "raid.queldanas_march",
      name: "Marche sur Quel'Danas",
      shortName: "MQD",
      bosses: [
        { id: 8, i18nKey: "boss.beloren",           journalId: 3182, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-light-void-phoenix.png",       name: "Belo'ren, Child of Al'ar",  raid: "Marche sur Quel'Danas" },
        { id: 9, i18nKey: "boss.midnight_falls",    journalId: 3183, imageUrl: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-alleria.png",                  name: "Midnight Falls",            raid: "Marche sur Quel'Danas" },
      ],
    },
  ],
  vaultIlvlTable: [
    { keyLevel: 2, endOfDungeon: 250, vault: 259, crests: "10 écus aube héroïque" },
    { keyLevel: 3, endOfDungeon: 250, vault: 259, crests: "12 écus aube héroïque" },
    { keyLevel: 4, endOfDungeon: 253, vault: 263, crests: "14 écus aube héroïque" },
    { keyLevel: 5, endOfDungeon: 256, vault: 263, crests: "16 écus aube héroïque" },
    { keyLevel: 6, endOfDungeon: 259, vault: 266, crests: "18 écus aube héroïque" },
    { keyLevel: 7, endOfDungeon: 259, vault: 269, crests: "10 écus aube mythique" },
    { keyLevel: 8, endOfDungeon: 263, vault: 269, crests: "12 écus aube mythique" },
    { keyLevel: 9, endOfDungeon: 263, vault: 269, crests: "14 écus aube mythique" },
    { keyLevel: 10, endOfDungeon: 266, vault: 272, crests: "16 écus aube mythique" },
  ],
  vaultSlots: {
    dungeon: [1, 4, 8],
    raid: [2, 4, 6],
    world: [2, 5, 8],
  },
  raidIlvlRanges: {
    normal: [250, 256],
    heroic: [259, 266],
    mythic: [269, 272],
  },
};

export const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "#C41E3A",
  "Demon Hunter": "#A330C9",
  Druid: "#FF7C0A",
  Evoker: "#33937F",
  Hunter: "#AAD372",
  Mage: "#3FC7EB",
  Monk: "#00FF98",
  Paladin: "#F48CBA",
  Priest: "#FFFFFF",
  Rogue: "#FFF468",
  Shaman: "#0070DD",
  Warlock: "#8788EE",
  Warrior: "#C69B3A",
};

export function getVaultIlvl(keyLevel: number): number | null {
  if (keyLevel < 2) return null;
  const capped = Math.min(keyLevel, 10);
  const entry = CURRENT_SEASON.vaultIlvlTable.find((e) => e.keyLevel === capped);
  return entry?.vault ?? null;
}

export function getVaultSlots(
  category: "dungeon" | "raid" | "world",
  count: number
): number {
  const thresholds = CURRENT_SEASON.vaultSlots[category];
  let slots = 0;
  for (const t of thresholds) {
    if (count >= t) slots++;
  }
  return slots;
}

export function getTotalRaidBosses(): number {
  return CURRENT_SEASON.raids.reduce((sum, r) => sum + r.bosses.length, 0);
}
