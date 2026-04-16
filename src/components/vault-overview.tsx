"use client";

import { useRosterStore } from "@/lib/store";
import { VaultCard } from "@/components/vault-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { useI18n } from "@/lib/i18n";

export function VaultOverview() {
  const { characters } = useRosterStore();
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "8px" }}>
        <div>
          <h2 className="gold-shimmer" style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            fontFamily: "'Cinzel', serif",
            letterSpacing: "0.05em",
          }}>
            {t("vault.title")}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-3)" }}>
            {t("vault.subtitle", characters.length)}
          </p>
        </div>
        <CountdownTimer />
      </div>

      {/* Cards grid — one card per character with Great Vault slots */}
      <div className="stagger-cards vault-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: "18px",
      }}>
        {characters.map((char) => (
          <VaultCard key={char.id} character={char} />
        ))}
      </div>
    </div>
  );
}
