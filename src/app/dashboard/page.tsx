"use client";

import { useRosterStore } from "@/lib/store";
import { DungeonGrid } from "@/components/dungeon-grid";
import { VaultOverview } from "@/components/vault-overview";
import { RaidTracker } from "@/components/raid-tracker";
import { AddCharacterModal } from "@/components/add-character-modal";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "next-auth/react";

type StoreView = "mplus" | "vault" | "hunt";

export default function DashboardPage() {
  const { characters, isScanning, scan, lastScanAt, error, view, setView, trackedUserId, setTrackedUserId, clearCharacters, isGuest, loadSavedCharacters } = useRosterStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { t } = useI18n();
  const { data: session } = useSession();
  const hasBnetToken = !!session?.accessToken;

  // Si l'utilisateur connecté diffère du propriétaire du store → vider
  useEffect(() => {
    const currentId = session?.userId ?? (isGuest ? "guest" : null);
    if (currentId && trackedUserId && currentId !== trackedUserId) {
      clearCharacters();
    }
    if (currentId && currentId !== trackedUserId) {
      setTrackedUserId(currentId);
    }
  }, [session?.userId, isGuest, trackedUserId, clearCharacters, setTrackedUserId]);

  // Auto-restore des personnages sauvegardés au login
  useEffect(() => {
    if (session?.userId && !isGuest && characters.length === 0 && !isScanning) {
      loadSavedCharacters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId]);

  const VIEWS: { key: StoreView; label: string; icon: string }[] = [
    { key: "vault", label: t("dash.tab.vault"), icon: "🏛" },
    { key: "mplus", label: t("dash.tab.mplus"), icon: "⚔" },
    { key: "hunt",  label: t("dash.tab.hunt"),  icon: "🎯" },
  ];

  const timeSince = lastScanAt
    ? Math.round((Date.now() - new Date(lastScanAt).getTime()) / 60000)
    : null;

  const totalRuns = characters.reduce((s, c) => s + c.weeklyRuns.length, 0);
  const bestKey   = characters.reduce((m, c) => Math.max(m, ...c.weeklyRuns.map((r) => r.mythic_level), 0), 0);
  const bestScore = characters.reduce((m, c) => Math.max(m, c.rioScore?.all ?? 0), 0);

  const validViews: StoreView[] = ["mplus", "vault", "hunt"];
  const activeView: StoreView = validViews.includes(view as StoreView) ? (view as StoreView) : "mplus";

  return (
    <div style={{ minHeight: "calc(100dvh - 64px)", backgroundColor: "var(--bg)" }}>

      {/* ── Sticky top bar ── */}
      <div className="dash-bar" style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: "18px",
        height: "56px",
        position: "sticky",
        top: "64px",
        zIndex: 40,
        flexWrap: "nowrap" as const,
        overflowX: "auto",
      }}>
        {/* View tabs */}
        <div className="dash-tabs" style={{ display: "flex", gap: 0, borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
          {VIEWS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: "7px 16px",
                fontSize: "13px",
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
              <span style={{ fontSize: "14px" }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        {characters.length > 0 && (
          <div className="dash-stats" style={{ display: "flex", gap: "18px", fontSize: "13px", flexShrink: 0 }}>
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
        <div className="dash-actions" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {timeSince !== null && !isScanning && (
            <span className="dash-ago" style={{ color: "var(--text-3)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
              {t("dash.ago", timeSince)}
            </span>
          )}
          <button
            onClick={() => setAddModalOpen(true)}
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              lineHeight: 1,
            }}
            title={t("add.title")}
          >
            +
          </button>
          {hasBnetToken && (
            <button
              onClick={scan}
              disabled={isScanning}
              style={{
                backgroundColor: isScanning ? "var(--surface-3)" : "var(--gold)",
                color: isScanning ? "var(--text-3)" : "#07090f",
                border: isScanning ? "1px solid var(--border-2)" : "none",
                borderRadius: "6px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: isScanning ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isScanning && (
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", border: "2px solid var(--text-3)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              )}
              {isScanning ? t("dash.scanning") : t("dash.scan")}
            </button>
          )}
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
        <div className="dash-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "12px" }}>
          <Image
            src="/logo.png"
            alt="WhatMyAltDid"
            width={500}
            height={300}
            className="animate-float"
            style={{ maxWidth: "300px", width: "100%", height: "auto", marginBottom: "12px" }}
          />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", fontFamily: "'Cinzel', serif" }}>
            {t("dash.empty.title")}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-2)", textAlign: "center" as const, maxWidth: "320px", lineHeight: 1.6 }}>
            {t("dash.empty.desc")}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {hasBnetToken && (
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
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {t("dash.empty.scan")}
              </button>
            )}
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
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {t("dash.addManual")}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {isScanning && characters.length === 0 && (
        <div className="skeleton-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px", padding: "24px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: "140px", borderRadius: "8px" }} className="skeleton" />
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {activeView === "mplus" && characters.length > 0 && (
        <div className="tab-content dash-content" key="mplus" style={{ padding: "20px 24px" }}>
          <DungeonGrid />
        </div>
      )}

      {activeView === "vault" && characters.length > 0 && (
        <div className="tab-content dash-content" key="vault" style={{ padding: "20px 24px" }}>
          <VaultOverview />
        </div>
      )}

      {activeView === "hunt" && characters.length > 0 && (
        <div className="tab-content dash-content" key="hunt" style={{ padding: "20px 24px" }}>
          <RaidTracker />
        </div>
      )}

      <AddCharacterModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
