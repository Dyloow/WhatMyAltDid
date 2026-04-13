"use client";

import { useRosterStore } from "@/lib/store";
import { CharacterCard } from "@/components/character-card";
import { DungeonGrid } from "@/components/dungeon-grid";
import { VaultOverview } from "@/components/vault-overview";
import { RosterFilters } from "@/components/roster-filters";
import { AddCharacterModal } from "@/components/add-character-modal";
import { useMemo, useState } from "react";

type StoreView = "grid" | "list" | "mplus" | "vault";

const VIEWS: { key: StoreView; label: string; icon: string }[] = [
  { key: "grid",  label: "Personnages",    icon: "⊞" },
  { key: "mplus", label: "Tableau M+",     icon: "⚔" },
  { key: "vault", label: "Grande Chambre", icon: "🏛" },
];

export default function DashboardPage() {
  const { characters, isScanning, scan, lastScanAt, error, view, setView, filters, sortBy, sortDir } = useRosterStore();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const timeSince = lastScanAt
    ? Math.round((Date.now() - new Date(lastScanAt).getTime()) / 60000)
    : null;

  const totalRuns  = characters.reduce((s, c) => s + c.weeklyRuns.length, 0);
  const bestKey    = characters.reduce((m, c) => Math.max(m, ...c.weeklyRuns.map(r => r.mythic_level), 0), 0);
  const bestScore  = characters.reduce((m, c) => Math.max(m, c.rioScore?.all ?? 0), 0);

  // Filter + sort
  const displayed = useMemo(() => {
    let list = [...characters];
    if (filters.faction)   list = list.filter(c => c.faction === filters.faction);
    if (filters.className) list = list.filter(c => c.className === filters.className);
    if (filters.role)      list = list.filter(c => c.specRole?.toUpperCase() === filters.role);
    if (filters.realm)     list = list.filter(c => c.realmSlug === filters.realm);

    list.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortBy === "score")     { av = a.rioScore?.all ?? 0;       bv = b.rioScore?.all ?? 0; }
      if (sortBy === "ilvl")      { av = a.itemLevel;                 bv = b.itemLevel; }
      if (sortBy === "name")      { av = 0; bv = 0; return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name); }
      if (sortBy === "vaultMplus"){ av = a.weeklyRuns.length;         bv = b.weeklyRuns.length; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [characters, filters, sortBy, sortDir]);

  const activeView: StoreView = (["grid", "list", "mplus", "vault"] as const).includes(view) ? view : "grid";

  return (
    <div style={{ minHeight: "calc(100dvh - 54px)", backgroundColor: "var(--bg)" }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        height: "46px",
        position: "sticky",
        top: "54px",
        zIndex: 40,
        flexWrap: "nowrap" as const,
        overflowX: "auto",
      }}>
        {/* View tabs */}
        <div style={{ display: "flex", gap: 0, borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
          {VIEWS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 600,
                background: activeView === key ? "var(--surface-3)" : "transparent",
                color: activeView === key ? "var(--gold)" : "var(--text-2)",
                border: "none",
                borderRight: "1px solid var(--border)",
                cursor: "pointer",
                transition: "color 0.15s, background 0.15s",
                whiteSpace: "nowrap" as const,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                letterSpacing: "0.03em",
              }}
            >
              <span style={{ fontSize: "12px" }}>{icon}</span>
              <span style={{ display: "none" as const }} className="sm-visible">{label}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        {characters.length > 0 && (
          <div style={{ display: "flex", gap: "16px", fontSize: "11px", flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <strong style={{ color: "var(--text)", fontWeight: 700 }}>{totalRuns}</strong>
              <span style={{ color: "var(--text-3)" }}> runs</span>
            </span>
            {bestKey > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <strong style={{ color: "var(--gold)", fontWeight: 700 }}>+{bestKey}</strong>
                <span style={{ color: "var(--text-3)" }}> best</span>
              </span>
            )}
            {bestScore > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <strong style={{
                  color: bestScore >= 2500 ? "var(--score-epic)" : bestScore >= 1500 ? "var(--score-rare)" : "var(--text)",
                  fontWeight: 700,
                }}>
                  {Math.round(bestScore).toLocaleString("fr-FR")}
                </strong>
                <span style={{ color: "var(--text-3)" }}> score</span>
              </span>
            )}
          </div>
        )}

        {/* Refresh + Add */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {timeSince !== null && !isScanning && (
            <span style={{ color: "var(--text-3)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
              il y a {timeSince} min
            </span>
          )}
          <button
            onClick={() => setAddModalOpen(true)}
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "5px",
              padding: "4px 10px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              lineHeight: 1,
            }}
            title="Ajouter un personnage manuellement"
          >
            +
          </button>
          <button
            onClick={scan}
            disabled={isScanning}
            style={{
              backgroundColor: isScanning ? "var(--surface-3)" : "var(--gold)",
              color: isScanning ? "var(--text-3)" : "#07090f",
              border: isScanning ? "1px solid var(--border-2)" : "none",
              borderRadius: "5px",
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: isScanning ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {isScanning && (
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", border: "2px solid var(--text-3)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            )}
            {isScanning ? "Scan…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ margin: "12px 20px 0", padding: "10px 14px", borderRadius: "6px", background: "var(--negative-dim)", color: "var(--negative)", border: "1px solid rgba(232,80,80,0.2)", fontSize: "12px" }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {characters.length === 0 && !isScanning && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "12px" }}>
          <div style={{ fontSize: "40px", opacity: 0.3, fontFamily: "'Cinzel Decorative', serif", color: "var(--gold)" }}>⚔</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", fontFamily: "'Cinzel', serif" }}>
            Aucun personnage scanné
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-2)", textAlign: "center" as const, maxWidth: "320px", lineHeight: 1.6 }}>
            Lancez un scan pour voir la progression hebdomadaire de tous vos alts.
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              onClick={scan}
              style={{
                backgroundColor: "var(--gold)",
                color: "#07090f",
                border: "none",
                borderRadius: "6px",
                padding: "10px 28px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.15s",
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}
            >
              Scanner mes personnages
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--text-2)",
                border: "1px solid var(--border-2)",
                borderRadius: "6px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}
            >
              + Ajouter manuellement
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {isScanning && characters.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 340px))", gap: "12px", padding: "20px" }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ height: "140px", borderRadius: "8px" }} className="skeleton" />
          ))}
        </div>
      )}

      {/* ── Filters bar (only for cards view with results) ── */}
      {characters.length > 0 && (activeView === "grid" || activeView === "list") && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
          <RosterFilters />
        </div>
      )}

      {/* ── Content ── */}
      {(activeView === "grid" || activeView === "list") && displayed.length > 0 && (
        <div
          className="stagger-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 360px))",
            gap: "12px",
            padding: "16px 20px",
          }}
        >
          {displayed.map(char => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}

      {(activeView === "grid" || activeView === "list") && characters.length > 0 && displayed.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center" as const, color: "var(--text-3)", fontSize: "13px" }}>
          Aucun personnage ne correspond aux filtres actuels.
        </div>
      )}

      {activeView === "mplus" && characters.length > 0 && (
        <div style={{ padding: "16px 20px" }}>
          <DungeonGrid />
        </div>
      )}

      {activeView === "vault" && characters.length > 0 && (
        <div style={{ padding: "16px 20px" }}>
          <VaultOverview />
        </div>
      )}

      <AddCharacterModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
