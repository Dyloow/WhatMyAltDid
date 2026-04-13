"use client";

import { useRosterStore } from "@/lib/store";
import { CURRENT_SEASON, CLASS_COLORS } from "@/lib/season-config";
import { KeystoneCell } from "@/components/keystone-cell";
import { AffixBar } from "@/components/affix-badge";
import { RioAffix } from "@/lib/raiderio-api";
import { useEffect, useState } from "react";

export function DungeonGrid() {
  const { characters } = useRosterStore();
  const [affixes, setAffixes] = useState<RioAffix[]>([]);

  useEffect(() => {
    fetch("/api/affixes")
      .then((r) => r.json())
      .then(setAffixes)
      .catch(() => {});
  }, []);

  const dungeons = CURRENT_SEASON.dungeons;

  const charDungeonMap = characters.map((char) => {
    const bestByRio: Record<string, (typeof char.bestRuns)[0]> = {};
    for (const run of char.bestRuns) {
      const prev = bestByRio[run.dungeon];
      if (!prev || run.mythic_level > prev.mythic_level) bestByRio[run.dungeon] = run;
    }
    const weeklyByRio: Record<string, (typeof char.weeklyRuns)[0]> = {};
    for (const run of char.weeklyRuns) {
      const prev = weeklyByRio[run.dungeon];
      if (!prev || run.mythic_level > prev.mythic_level) weeklyByRio[run.dungeon] = run;
    }
    const weeklyTotal = char.weeklyRuns.length;
    return { char, bestByRio, weeklyByRio, weeklyTotal };
  });

  if (characters.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "60px 0",
        color: "var(--text-3)",
        fontSize: "13px",
      }}>
        Scannez vos personnages pour afficher le tableau M+
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <AffixBar affixes={affixes} />

      <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
          backgroundColor: "var(--surface)",
        }}>
          <thead>
            <tr style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              <th style={{
                padding: "8px 14px",
                textAlign: "left",
                color: "var(--text-2)",
                fontWeight: 600,
                fontSize: "11px",
                whiteSpace: "nowrap" as const,
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.05em",
              }}>
                Personnage
              </th>
              <th style={{
                padding: "8px 10px",
                textAlign: "center",
                color: "var(--text-2)",
                fontWeight: 600,
                fontSize: "10px",
                whiteSpace: "nowrap" as const,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
              }}>
                Runs
              </th>
              {dungeons.map((d) => (
                <th
                  key={d.id}
                  title={d.name}
                  style={{
                    padding: "8px 4px",
                    textAlign: "center",
                    color: "var(--text-2)",
                    fontWeight: 600,
                    fontSize: "10px",
                    whiteSpace: "nowrap" as const,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.05em",
                    minWidth: "52px",
                  }}
                >
                  {d.shortName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {charDungeonMap.map(({ char, bestByRio, weeklyByRio, weeklyTotal }, rowIdx) => {
              const classColor = CLASS_COLORS[char.className] ?? "var(--text-2)";
              const score = char.rioScore?.all ?? 0;
              return (
                <tr
                  key={char.id}
                  style={{
                    borderBottom: rowIdx < charDungeonMap.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Character name */}
                  <td style={{ padding: "7px 14px", whiteSpace: "nowrap" as const }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/classes/${char.className.toLowerCase().replace(/\s+/g, "").replace("'", "")}.jpg`}
                        alt={char.className}
                        width={20}
                        height={20}
                        style={{ borderRadius: "3px", opacity: 0.9 }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <div>
                        <span style={{ color: classColor, fontWeight: 600, fontFamily: "'Cinzel', serif", fontSize: "12px" }}>
                          {char.name}
                        </span>
                        {score > 0 && (
                          <span style={{
                            color: "var(--text-3)",
                            fontSize: "10px",
                            marginLeft: "6px",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {score.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Weekly run count */}
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: weeklyTotal >= 8 ? "var(--positive)" : weeklyTotal >= 4 ? "var(--gold)" : weeklyTotal > 0 ? "var(--text-2)" : "var(--text-3)",
                    }}>
                      {weeklyTotal}/8
                    </span>
                  </td>

                  {/* Dungeon cells - show weekly run if exists, else best run */}
                  {dungeons.map((d) => {
                    const weekly = weeklyByRio[d.rioName];
                    const best = bestByRio[d.rioName];
                    return (
                      <KeystoneCell
                        key={d.id}
                        run={weekly ?? best}
                        isWeekly={!!weekly}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", fontSize: "10px", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
        <span><span style={{ color: "var(--positive)" }}>+X</span> = timé cette semaine</span>
        <span><span style={{ color: "var(--text-2)" }}>+X</span> = meilleur run (saison)</span>
        <span><span style={{ color: "var(--text-3)" }}>—</span> = non fait</span>
      </div>
    </div>
  );
}
