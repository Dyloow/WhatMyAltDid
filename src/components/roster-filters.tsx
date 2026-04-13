"use client";

import { useRosterStore } from "@/lib/store";

const ROLES = ["TANK", "HEALER", "DPS"] as const;
const FACTIONS = ["ALLIANCE", "HORDE"] as const;
const CLASSES = [
  "Death Knight", "Demon Hunter", "Druid", "Evoker",
  "Hunter", "Mage", "Monk", "Paladin",
  "Priest", "Rogue", "Shaman", "Warlock", "Warrior",
];

const SORT_OPTIONS = [
  { key: "score" as const, label: "Score M+" },
  { key: "ilvl" as const, label: "Item Level" },
  { key: "name" as const, label: "Nom" },
  { key: "vaultMplus" as const, label: "Vault M+" },
] as const;

function FilterPill({
  label,
  active,
  onClick,
  accentColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor?: string;
}) {
  const color = accentColor ?? "var(--gold)";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "4px",
        border: active ? `1px solid ${color}` : "1px solid var(--border-2)",
        background: active ? `${color}18` : "transparent",
        color: active ? color : "var(--text-2)",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap" as const,
        letterSpacing: "0.03em",
      }}
      onMouseOver={e => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--text-3)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseOut={e => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-2)";
          e.currentTarget.style.color = "var(--text-2)";
        }
      }}
    >
      {label}
    </button>
  );
}

export function RosterFilters() {
  const { filters, setFilter, sortBy, setSortBy, sortDir, toggleSortDir } = useRosterStore();

  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", alignItems: "center" }}>
      {/* Faction */}
      <div style={{ display: "flex", gap: "4px" }}>
        <FilterPill label="Toutes" active={!filters.faction} onClick={() => setFilter("faction", null)} />
        <FilterPill
          label="Alliance"
          active={filters.faction === "ALLIANCE"}
          onClick={() => setFilter("faction", filters.faction === "ALLIANCE" ? null : "ALLIANCE")}
          accentColor="var(--arcane)"
        />
        <FilterPill
          label="Horde"
          active={filters.faction === "HORDE"}
          onClick={() => setFilter("faction", filters.faction === "HORDE" ? null : "HORDE")}
          accentColor="var(--negative)"
        />
      </div>

      <div style={{ width: 1, height: 16, backgroundColor: "var(--border-2)" }} />

      {/* Role */}
      <div style={{ display: "flex", gap: "4px" }}>
        {ROLES.map(r => (
          <FilterPill
            key={r}
            label={r === "HEALER" ? "Heal" : r === "TANK" ? "Tank" : "DPS"}
            active={filters.role === r}
            onClick={() => setFilter("role", filters.role === r ? null : r)}
          />
        ))}
      </div>

      <div style={{ width: 1, height: 16, backgroundColor: "var(--border-2)" }} />

      {/* Sort */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Tri</span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label}
            active={sortBy === key}
            onClick={() => setSortBy(key)}
          />
        ))}
        <button
          onClick={toggleSortDir}
          style={{
            background: "transparent",
            border: "1px solid var(--border-2)",
            color: "var(--text-2)",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            transition: "color 0.15s",
          }}
          title={sortDir === "desc" ? "Croissant" : "Décroissant"}
        >
          {sortDir === "desc" ? "↓" : "↑"}
        </button>
      </div>
    </div>
  );
}
