"use client";

import { useRosterStore } from "@/lib/store";
import { VaultCard } from "@/components/vault-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { calculateVault } from "@/lib/vault-calculator";
import { CLASS_COLORS } from "@/lib/season-config";
import { useI18n } from "@/lib/i18n";

function VaultDots({ slots }: { slots: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "3px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            height: 8,
            width: 8,
            borderRadius: "50%",
            backgroundColor: i < slots ? "var(--vault-active)" : "var(--vault-empty)",
            boxShadow: i < slots ? "0 0 4px var(--gold-dim)" : "none",
          }}
        />
      ))}
    </span>
  );
}

export function VaultOverview() {
  const { characters } = useRosterStore();
  const { t } = useI18n();

  const vaults = characters.map((char) => ({
    char,
    vault: calculateVault(char),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "8px" }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 700,
            fontFamily: "'Cinzel', serif",
            color: "var(--gold)",
            letterSpacing: "0.05em",
          }}>
            {t("vault.title")}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-3)" }}>
            {t("vault.subtitle", characters.length)}
          </p>
        </div>
        <CountdownTimer />
      </div>

      {/* Summary table */}
      {vaults.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", backgroundColor: "var(--surface)" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {[t("vault.char"), t("vault.mplusRuns"), t("vault.mplusSlots"), t("vault.vaultIlvl"), t("vault.raidBosses"), t("vault.raidSlots"), t("vault.total")].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px",
                    textAlign: h === t("vault.char") ? "left" : "center",
                    color: "var(--text-2)",
                    fontWeight: 600,
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    whiteSpace: "nowrap" as const,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vaults.map(({ char, vault }, i) => {
                const classColor = CLASS_COLORS[char.className] ?? "var(--text-2)";
                const maxRaidBosses = vault.raid.thresholds[vault.raid.thresholds.length - 1];
                return (
                  <tr
                    key={char.id}
                    style={{
                      borderBottom: i < vaults.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" as const }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/classes/${char.className.toLowerCase().replace(/\s+/g, "").replace("'", "")}.jpg`}
                          alt={char.className}
                          width={18}
                          height={18}
                          style={{ borderRadius: "3px" }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                        <span style={{ color: classColor, fontWeight: 600, fontFamily: "'Cinzel', serif", fontSize: "12px" }}>
                          {char.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ color: vault.dungeon.current >= 8 ? "var(--positive)" : vault.dungeon.current > 0 ? "var(--gold)" : "var(--text-3)" }}>
                        {vault.dungeon.current}/8
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <VaultDots slots={vault.dungeon.slots} />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
                      {vault.dungeon.ilvl ? (
                        <span style={{ color: "var(--gold)" }}>{vault.dungeon.ilvl}</span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ color: vault.raid.current > 0 ? "var(--purple)" : "var(--text-3)" }}>
                        {vault.raid.current}/{maxRaidBosses}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <VaultDots slots={vault.raid.slots} />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                      <span style={{ color: vault.totalSlots >= 6 ? "var(--gold)" : vault.totalSlots > 0 ? "var(--text)" : "var(--text-3)" }}>
                        {vault.totalSlots}/6
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "12px",
      }}>
        {vaults.map(({ char }) => (
          <VaultCard key={char.id} character={char} />
        ))}
      </div>
    </div>
  );
}
