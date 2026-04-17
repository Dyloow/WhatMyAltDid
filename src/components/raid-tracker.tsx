"use client";

import { useMemo } from "react";
import { useRosterStore } from "@/lib/store";
import { CLASS_COLORS, CURRENT_SEASON } from "@/lib/season-config";
import { BossCell } from "@/components/boss-cell";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
/** Normalize a boss name for fuzzy matching: lowercase + strip punctuation/spaces. */
function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** All 9 bosses from the season config, enriched with real Blizzard encounter IDs
 *  derived from actual kill data (matched by normalized boss name). */
function useBossList(characters: import("@/types/character").CharacterData[]) {
  return useMemo(() => {
    // Build normalizedName → { realId, originalName } map from kill data
    const normToKill = new Map<string, { id: number; name: string }>();
    for (const char of characters) {
      for (const kill of char.weeklyBossKills ?? []) {
        const norm = normalizeName(kill.bossName);
        if (!normToKill.has(norm)) {
          normToKill.set(norm, { id: kill.bossId, name: kill.bossName });
        }
      }
    }

    if (process.env.NODE_ENV !== "production" && normToKill.size > 0) {
      console.log("[RaidTracker] Kill data boss IDs:", Object.fromEntries(
        [...normToKill.values()].map((v) => [v.name, v.id])
      ));
    }

    // Season config bosses are the authoritative column list (always 9)
    return CURRENT_SEASON.raids.flatMap((raid, raidIndex) =>
      raid.bosses.map((boss) => {
        const found = normToKill.get(normalizeName(boss.name));
        const realId = boss.journalId ?? found?.id ?? null;
        return {
          configId: boss.id,
          realId,
          imageUrl: boss.imageUrl ?? null,
          name: boss.name,
          i18nKey: boss.i18nKey,
          raidI18nKey: raid.i18nKey,
          raidIndex,
        };
      })
    );
  }, [characters]);
}

function initialsFor(name: string) {
  return name
    .split(/[\s\-&,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// One accent color per raid
const RAID_COLORS = ["#1a3a6b", "#3b1260", "#5a2e00"];

function BossIcon({
  name,
  realId,
  imageUrl,
  raidIndex,
}: {
  name: string;
  realId: number | null;
  imageUrl: string | null;
  raidIndex: number;
}) {
  const bg = RAID_COLORS[raidIndex % RAID_COLORS.length];

  // Priority: explicit imageUrl in config > proxy via Blizzard API
  const src = imageUrl ?? (realId !== null && realId >= 100 ? `/api/boss-icon/${realId}` : null);

  if (!src) {
    // Fallback: colored initials, no border/clip
    return (
      <div
        title={name}
        style={{
          width: 64,
          height: 64,
          borderRadius: "10px",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "17px",
          fontWeight: 800,
          color: "rgba(255,255,255,0.75)",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
          margin: "0 auto",
        }}
      >
        {initialsFor(name)}
      </div>
    );
  }

  // Wowhead PNGs have transparent backgrounds — display without any clipping container
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      width={64}
      height={64}
      style={{ display: "block", margin: "0 auto", objectFit: "contain" }}
      onError={(e) => {
        // On error swap to initials div
        const img = e.currentTarget;
        const fallback = document.createElement("div");
        fallback.textContent = initialsFor(name);
        Object.assign(fallback.style, {
          width: "64px", height: "64px", borderRadius: "10px",
          background: bg, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "17px", fontWeight: "800",
          color: "rgba(255,255,255,0.75)", fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em", margin: "0 auto",
        });
        img.replaceWith(fallback);
      }}
    />
  );
}

export function RaidTracker() {
  const { characters } = useRosterStore();
  const { t } = useI18n();
  const bossList = useBossList(characters);

  if (characters.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-3)", fontSize: "14px" }}>
        {t("hunt.empty")}
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginBottom: "20px",
        fontSize: "12px",
        color: "var(--text-3)",
        fontFamily: "'JetBrains Mono', monospace",
        flexWrap: "wrap",
      }}>
        {[
          { color: "#3b82f6", label: t("hunt.legend.normal") },
          { color: "#a855f7", label: t("hunt.legend.heroic") },
          { color: "#f97316", label: t("hunt.legend.mythic") },
        ].map(({ color, label }) => (
          <span key={color} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: color, display: "inline-block", flexShrink: 0 }} />
            {label}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--border-2)", display: "inline-block", flexShrink: 0 }} />
          {t("hunt.legend.not_done")}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {/* Character column header */}
              <th style={{
                textAlign: "left",
                padding: "12px 20px",
                color: "var(--text-3)",
                fontWeight: 600,
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                borderBottom: "2px solid var(--border)",
                whiteSpace: "nowrap" as const,
                position: "sticky" as const,
                left: 0,
                background: "var(--bg)",
                zIndex: 2,
                minWidth: "220px",
              }}>
                {t("hunt.col.character")}
              </th>

              {/* Boss headers */}
              {bossList.map((boss) => (
                <th
                  key={boss.configId}
                  style={{
                    padding: "10px 8px 12px",
                    color: "var(--text-2)",
                    fontWeight: 600,
                    fontSize: "11px",
                    borderBottom: "2px solid var(--border)",
                    textAlign: "center" as const,
                    minWidth: "120px",
                    maxWidth: "150px",
                    lineHeight: 1.3,
                    verticalAlign: "bottom",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <BossIcon
                      name={boss.name}
                      realId={boss.realId}
                      imageUrl={boss.imageUrl}
                      raidIndex={boss.raidIndex}
                    />
                    {/* Fixed height so all columns align regardless of name length */}
                    <span style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                      fontSize: "11px",
                      color: "var(--text-2)",
                      lineHeight: 1.3,
                      height: "2.6em",
                      maxWidth: "110px",
                      textAlign: "center" as const,
                    }} title={t(boss.i18nKey) || boss.name}>
                      {t(boss.i18nKey) || boss.name}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      color: "var(--text-3)",
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap" as const,
                    }}>
                      {t(boss.raidI18nKey)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {characters.map((char) => {
              const classColor = CLASS_COLORS[char.className] ?? "#aaa";
              const kills = char.weeklyBossKills ?? [];
              // Count unique bosses killed (by name, matching season config)
              const killedNames = new Set(kills.map((k) => k.bossName));
              const killCount = bossList.filter((b) => killedNames.has(b.name)).length;

              return (
                <tr
                  key={`${char.region}-${char.realmSlug}-${char.name}`}
                  style={{ transition: "background 0.1s" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Character cell */}
                  <td style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    position: "sticky" as const,
                    left: 0,
                    background: "inherit",
                    zIndex: 1,
                  }}>
                    <Link
                      href={`/character/${char.region}/${char.realmSlug}/${char.name.toLowerCase()}`}
                      style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}
                    >
                      <span style={{
                        display: "inline-block",
                        width: "4px",
                        height: "38px",
                        borderRadius: "2px",
                        backgroundColor: classColor,
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: classColor, fontWeight: 700, fontSize: "14px", lineHeight: 1.3 }}>
                          {char.name}
                        </div>
                        <div style={{ color: "var(--text-3)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                          {char.realm}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "12px",
                        fontFamily: "'JetBrains Mono', monospace",
                        color: killCount === bossList.length ? "var(--gold)" : killCount > 0 ? "var(--text-2)" : "var(--text-3)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        padding: "3px 10px",
                        borderRadius: "10px",
                        flexShrink: 0,
                        fontWeight: 700,
                      }}>
                        {killCount}/{bossList.length}
                      </span>
                    </Link>
                  </td>

                  {/* Boss cells */}
                  {bossList.map((boss) => (
                    <td
                      key={boss.configId}
                      style={{
                        padding: "16px 10px",
                        borderBottom: "1px solid var(--border)",
                        textAlign: "center" as const,
                        verticalAlign: "middle" as const,
                      }}
                    >
                      <BossCell bossName={boss.name} kills={kills} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
