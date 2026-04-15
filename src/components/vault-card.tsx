"use client";

import { CharacterData } from "@/types/character";
import { calculateVault, getVaultTodos } from "@/lib/vault-calculator";
import { CLASS_COLORS, CURRENT_SEASON } from "@/lib/season-config";
import { useI18n } from "@/lib/i18n";

function VaultDots({ slots, max = 3 }: { slots: number; max?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "4px" }}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 9, height: 9, borderRadius: "50%",
            backgroundColor: i < slots ? "var(--vault-active)" : "var(--vault-empty)",
            display: "inline-block",
            boxShadow: i < slots ? "0 0 5px var(--gold-dim)" : "none",
          }}
        />
      ))}
    </span>
  );
}

function ProgressBar({ value, color = "var(--gold)" }: { value: number; color?: string }) {
  return (
    <div style={{ height: 3, borderRadius: 2, backgroundColor: "var(--border-2)", overflow: "hidden", marginTop: 5 }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, value)}%`,
        backgroundColor: color,
        borderRadius: 2,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

const PRIORITY_COLOR = {
  high: "var(--negative)",
  medium: "var(--warning)",
  low: "var(--arcane)",
};

export function VaultCard({ character }: { character: CharacterData }) {
  const vault = calculateVault(character);
  const todos = getVaultTodos(character);
  const classColor = CLASS_COLORS[character.className] ?? "var(--text-2)";
  const { t } = useI18n();

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${classColor}`,
      borderRadius: "8px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ color: classColor, fontWeight: 700, fontSize: "13px", fontFamily: "'Cinzel', serif" }}>
            {character.name}
          </div>
          <div style={{ color: "var(--text-3)", fontSize: "10px", marginTop: "1px" }}>
            {character.specName} {character.className}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: "15px",
            color: vault.totalSlots > 0 ? "var(--gold)" : "var(--text-3)",
          }}>
            {vault.totalSlots}
          </span>
          <span style={{ color: "var(--text-3)", fontSize: "11px", marginLeft: 3 }}>/6 slots</span>
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {[vault.dungeon, vault.raid].map((cat) => {
          const max = cat.thresholds[cat.thresholds.length - 1] ?? 8;
          const pct = Math.min(100, (cat.current / max) * 100);
          const barColor = cat.label.includes("M+") ? "var(--gold)" : "var(--purple)";
          return (
            <div key={cat.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{cat.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {cat.current}/{max}
                  </span>
                  <VaultDots slots={cat.slots} />
                  {cat.ilvl && (
                    <span style={{ color: "var(--gold)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {cat.ilvl}
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar value={pct} color={barColor} />
            </div>
          );
        })}
      </div>

      {/* Todos */}
      {todos.length > 0 && (
        <div style={{ padding: "8px 14px 10px", borderTop: "1px solid var(--border)" }}>
          <div style={{
            color: "var(--text-3)", fontSize: "9px", fontWeight: 600,
            textTransform: "uppercase" as const, letterSpacing: "0.1em",
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 6,
          }}>
            {t("vault.todo")}
          </div>
          {todos.map((t, i) => (
            <div key={i} style={{
              display: "flex", gap: "6px", fontSize: "11px",
              color: "var(--text-2)", marginBottom: 3, alignItems: "flex-start",
            }}>
              <span style={{ color: PRIORITY_COLOR[t.priority], flexShrink: 0, marginTop: "1px" }}>
                {t.priority === "high" ? "▲" : t.priority === "medium" ? "◆" : "◇"}
              </span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
