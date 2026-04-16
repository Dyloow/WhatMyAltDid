"use client";

import { useState } from "react";
import Link from "next/link";
import { CharacterData } from "@/types/character";
import { calculateVault, VaultCategory } from "@/lib/vault-calculator";
import { CLASS_COLORS, CURRENT_SEASON, getVaultIlvl } from "@/lib/season-config";
import { useI18n } from "@/lib/i18n";

function getIlvlTierKey(ilvl: number | null): { key: string; color: string } | null {
  if (!ilvl) return null;
  const { raidIlvlRanges } = CURRENT_SEASON;
  if (ilvl >= raidIlvlRanges.mythic[0]) return { key: "vault.tierMythic", color: "var(--score-legendary)" };
  if (ilvl >= raidIlvlRanges.heroic[0]) return { key: "vault.tierHeroic", color: "var(--score-epic)" };
  if (ilvl >= raidIlvlRanges.normal[0]) return { key: "vault.tierNormal", color: "var(--score-uncommon)" };
  return null;
}

/* ── Single vault slot (the "square" like in-game) ── */
function VaultSlot({
  unlocked,
  ilvl,
  slotIndex,
  thresholdNeeded,
  current,
  categoryLabel,
}: {
  unlocked: boolean;
  ilvl: number | null;
  slotIndex: number;
  thresholdNeeded: number;
  current: number;
  categoryLabel: string;
}) {
  const [hover, setHover] = useState(false);
  const { t } = useI18n();

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`vault-slot ${unlocked ? "animate-glow-pulse" : ""}`}
        style={{
          width: 60,
          height: 60,
          borderRadius: "8px",
          border: unlocked
            ? "2px solid var(--gold)"
            : "2px solid var(--border-2)",
          background: unlocked
            ? "linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.06) 100%)"
            : "var(--surface-2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          cursor: "default",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {unlocked ? (
          <>
            <span style={{
              fontSize: "18px",
              lineHeight: 1,
              color: "var(--gold)",
              filter: "drop-shadow(0 0 4px var(--gold-glow))",
            }}>
              ✦
            </span>
            {ilvl && (
              <span style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--gold)",
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: "2px",
                lineHeight: 1,
              }}>
                {ilvl}
              </span>
            )}
          </>
        ) : (
          <>
            <span style={{
              fontSize: "16px",
              color: "var(--text-3)",
              opacity: 0.4,
            }}>
              🔒
            </span>
            <span style={{
              fontSize: "10px",
              color: "var(--text-3)",
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: "1px",
              lineHeight: 1,
            }}>
              {current}/{thresholdNeeded}
            </span>
          </>
        )}
      </div>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "8px 12px",
          background: "var(--surface-3)",
          border: "1px solid var(--border-2)",
          borderRadius: "6px",
          whiteSpace: "nowrap",
          zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          fontSize: "12px",
          lineHeight: 1.5,
          pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 700, color: unlocked ? "var(--gold)" : "var(--text-2)", marginBottom: "2px" }}>
            {categoryLabel} — {t("vault.slot")} {slotIndex + 1}
          </div>
          {unlocked ? (
            <>
              <div style={{ color: "var(--text)" }}>
                ilvl <span style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{ilvl ?? "—"}</span>
              </div>
              {(() => {
                const tier = getIlvlTierKey(ilvl);
                return tier ? (
                  <div style={{ fontSize: "11px", fontWeight: 700, color: tier.color }}>
                    {t(tier.key)}
                  </div>
                ) : null;
              })()}
            </>
          ) : (
            <div style={{ color: "var(--text-3)" }}>
              {t("vault.moreToUnlock", thresholdNeeded - current)}
            </div>
          )}
          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: "-4px",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: "8px",
            height: "8px",
            background: "var(--surface-3)",
            borderRight: "1px solid var(--border-2)",
            borderBottom: "1px solid var(--border-2)",
          }} />
        </div>
      )}
    </div>
  );
}

/* ── Row of 3 vault slots for a category ── */
function VaultRow({
  category,
  icon,
  runs,
}: {
  category: VaultCategory;
  icon: string;
  runs?: CharacterData["weeklyRuns"];
}) {
  // For M+ we can compute per-slot ilvl based on the nth best run
  const getSlotIlvl = (slotIdx: number): number | null => {
    if (category.label === "Raid" || !runs) {
      return category.ilvl;
    }
    // Sort runs desc by key level
    const sorted = [...runs].sort((a, b) => b.mythic_level - a.mythic_level);
    // Slot 0 → worst of top 1, slot 1 → worst of top 4, slot 2 → worst of top 8
    const thresholds = category.thresholds;
    const count = thresholds[slotIdx];
    if (sorted.length >= count) {
      return getVaultIlvl(sorted[count - 1].mythic_level);
    }
    return null;
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}>
      {/* Category icon + label */}
      <div className="vault-category-label" style={{
        width: "80px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
      }}>
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <span style={{
          fontSize: "11px",
          color: "var(--text-3)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: "center",
        }}>
          {category.label}
        </span>
        <span style={{
          fontSize: "13px",
          color: category.current > 0 ? "var(--text)" : "var(--text-3)",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        }}>
          {category.current}/{category.thresholds[category.thresholds.length - 1]}
        </span>
      </div>

      {/* 3 slots */}
      <div style={{ display: "flex", gap: "10px" }}>
        {[0, 1, 2].map((i) => (
          <VaultSlot
            key={i}
            unlocked={i < category.slots}
            ilvl={getSlotIlvl(i)}
            slotIndex={i}
            thresholdNeeded={category.thresholds[i]}
            current={category.current}
            categoryLabel={category.label}
          />
        ))}
      </div>
    </div>
  );
}

export function VaultCard({ character }: { character: CharacterData }) {
  const vault = calculateVault(character);
  const classColor = CLASS_COLORS[character.className] ?? "var(--text-2)";
  const { t } = useI18n();
  const iconSlug = character.className.toLowerCase().replace(/\s+/g, "").replace("'", "");
  const detailHref = `/character/${character.region}/${character.realmSlug}/${encodeURIComponent(character.name)}`;

  return (
    <Link
      href={detailHref}
      className="card-interactive"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        display: "block",
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = classColor + "66";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 20px ${classColor}18`;
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
      }}
    >
      {/* Character header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: `linear-gradient(90deg, ${classColor}0a 0%, transparent 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/classes/${iconSlug}.jpg`}
            alt={character.className}
            width={36}
            height={36}
            style={{ borderRadius: "6px", border: `1px solid ${classColor}44` }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <div>
            <div style={{
              color: classColor,
              fontWeight: 700,
              fontSize: "17px",
              fontFamily: "'Cinzel', serif",
              lineHeight: 1.2,
            }}>
              {character.name}
            </div>
            <div style={{ color: "var(--text-3)", fontSize: "13px" }}>
              {t("spec." + character.specName) || character.specName} {t("class." + character.className)}
            </div>
          </div>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "6px",
          background: vault.totalSlots > 0 ? "var(--gold-dim)" : "var(--surface-2)",
          border: vault.totalSlots > 0 ? "1px solid var(--gold)33" : "1px solid var(--border)",
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: "20px",
            color: vault.totalSlots > 0 ? "var(--gold)" : "var(--text-3)",
            lineHeight: 1,
          }}>
            {vault.totalSlots}
          </span>
          <span style={{
            color: "var(--text-3)",
            fontSize: "12px",
            lineHeight: 1,
          }}>
            /6
          </span>
        </div>
      </div>

      {/* Vault slots grid */}
      <div style={{
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        <VaultRow
          category={vault.dungeon}
          icon="⚔️"
          runs={character.weeklyRuns}
        />
        <div style={{ height: "1px", background: "var(--border)", margin: "0 -16px" }} />
        <VaultRow
          category={vault.raid}
          icon="🏰"
        />
      </div>
    </Link>
  );
}
