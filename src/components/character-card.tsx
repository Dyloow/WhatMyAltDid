"use client";

import Image from "next/image";
import Link from "next/link";
import { CharacterData } from "@/types/character";
import { CLASS_COLORS, CURRENT_SEASON, getVaultIlvl, getVaultSlots } from "@/lib/season-config";

function classIconSlug(className: string): string {
  return className.toLowerCase().replace(/\s+/g, "").replace("'", "");
}

function getScoreColor(n: number): string {
  if (n >= 3500) return "var(--score-legendary)";
  if (n >= 2500) return "var(--score-epic)";
  if (n >= 1500) return "var(--score-rare)";
  if (n >= 500)  return "var(--score-uncommon)";
  if (n > 0)     return "var(--score-common)";
  return "var(--text-3)";
}

function VaultDots({ slots, max = 3 }: { slots: number; max?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "3px" }}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: i < slots ? "var(--vault-active)" : "var(--vault-empty)",
            display: "inline-block",
            boxShadow: i < slots ? "0 0 4px var(--gold-dim)" : "none",
            transition: "background 0.2s",
          }}
        />
      ))}
    </span>
  );
}

interface Props {
  character: CharacterData;
}

export function CharacterCard({ character }: Props) {
  const classColor = CLASS_COLORS[character.className] ?? "var(--text-2)";
  const score = character.rioScore?.all ?? 0;
  const runs = character.weeklyRuns;
  const bestKey = runs.reduce((m, r) => Math.max(m, r.mythic_level), 0);
  const vaultIlvl = getVaultIlvl(bestKey);
  const vaultSlots = getVaultSlots("dungeon", runs.length);
  const raidVaultSlots = getVaultSlots("raid", character.weeklyRaidBosses);
  const scoreColor = getScoreColor(score);
  const iconSlug = classIconSlug(character.className);
  const detailHref = `/character/${character.region}/${character.realmSlug}/${encodeURIComponent(character.name)}`;

  // Raids progression summary
  const raidBadges: { label: string; color: string }[] = [];
  if (character.raidProgression) {
    for (const prog of Object.values(character.raidProgression)) {
      if (prog.mythic_bosses_killed > 0)
        raidBadges.push({ label: `${prog.mythic_bosses_killed}/${prog.total_bosses}M`, color: "var(--score-legendary)" });
      else if (prog.heroic_bosses_killed > 0)
        raidBadges.push({ label: `${prog.heroic_bosses_killed}/${prog.total_bosses}H`, color: "var(--score-epic)" });
      else if (prog.normal_bosses_killed > 0)
        raidBadges.push({ label: `${prog.normal_bosses_killed}/${prog.total_bosses}N`, color: "var(--score-uncommon)" });
    }
  }

  // Missing dungeons this week
  const doneDungeons = new Set(runs.map(r => r.dungeon));
  const missing = CURRENT_SEASON.dungeons.filter(d => !doneDungeons.has(d.rioName));

  return (
    <div
      className="animate-scale-in hover-lift"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${classColor}`,
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "default",
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = classColor;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${classColor}22, 0 8px 32px ${classColor}24`;
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = classColor;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        {/* Class icon or thumbnail */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {character.gear !== null && (character as unknown as { thumbnail_url?: string }).thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(character as unknown as { thumbnail_url?: string }).thumbnail_url}
              alt={character.name}
              width={36}
              height={36}
              style={{ borderRadius: "5px", border: `1px solid ${classColor}44` }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/classes/${iconSlug}.jpg`}
              alt={character.className}
              width={36}
              height={36}
              style={{ borderRadius: "5px", border: `1px solid ${classColor}33` }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" as const }}>
            <Link
              href={detailHref}
              style={{
                color: classColor,
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.01em",
              }}
              onMouseOver={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseOut={e => (e.currentTarget.style.textDecoration = "none")}
            >
              {character.name}
            </Link>
            {character.itemLevel > 0 && (
              <span style={{
                color: "var(--text-3)",
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {character.itemLevel}
              </span>
            )}
          </div>
          <div style={{ color: "var(--text-2)", fontSize: "11px", marginTop: "1px" }}>
            {character.specName} {character.className}
            <span style={{ color: "var(--text-3)" }}> · {character.realm}</span>
          </div>
        </div>

        {/* Score */}
        {score > 0 && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: "15px",
              color: getScoreColor(score),
              lineHeight: 1,
            }}>
              {score.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "2px" }}>
              Score
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        padding: "10px 14px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
        borderBottom: missing.length > 0 ? "1px solid var(--border)" : "none",
      }}>
        {/* M+ Vault */}
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
            Vault M+
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>
              {runs.length}/{CURRENT_SEASON.vaultSlots.dungeon[CURRENT_SEASON.vaultSlots.dungeon.length - 1]}
            </span>
            <VaultDots slots={vaultSlots} />
          </div>
          {vaultIlvl && bestKey > 0 && (
            <div style={{ fontSize: "10px", color: "var(--gold)", marginTop: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
              +{bestKey} → {vaultIlvl} ilvl
            </div>
          )}
        </div>

        {/* Raid vault + progression */}
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
            Vault Raid
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>
              {character.weeklyRaidBosses}/{CURRENT_SEASON.vaultSlots.raid[CURRENT_SEASON.vaultSlots.raid.length - 1]}
            </span>
            <VaultDots slots={raidVaultSlots} />
          </div>
          {raidBadges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px", marginTop: "4px" }}>
              {raidBadges.map((b, i) => (
                <span key={i} style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: b.color,
                  background: `${b.color}18`,
                  border: `1px solid ${b.color}33`,
                  borderRadius: "3px",
                  padding: "1px 5px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Missing dungeons */}
      {missing.length > 0 && missing.length < 8 && (
        <div style={{ padding: "8px 14px 10px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "5px", fontFamily: "'JetBrains Mono', monospace" }}>
            Manquants cette semaine
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
            {missing.slice(0, 5).map(d => (
              <span key={d.id} style={{
                fontSize: "10px",
                color: "var(--negative)",
                background: "var(--negative-dim)",
                border: "1px solid rgba(232,80,80,0.2)",
                borderRadius: "3px",
                padding: "1px 6px",
              }}>
                {d.shortName}
              </span>
            ))}
            {missing.length > 5 && (
              <span style={{ fontSize: "10px", color: "var(--text-3)", padding: "1px 4px" }}>
                +{missing.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
