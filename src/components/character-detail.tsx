"use client";

import { RioCharacterProfile, RioGearItem } from "@/lib/raiderio-api";
import Link from "next/link";
import { useState } from "react";
import { BisPanel } from "./bis-panel";
import { CLASS_COLORS } from "@/lib/season-config";

// RIO returns these exact slot keys (no underscores for fingers/trinkets/weapons)
const GEAR_SLOTS = [
  "head", "neck", "shoulder", "back", "chest", "wrist",
  "hands", "waist", "legs", "feet",
  "finger1", "finger2", "trinket1", "trinket2",
  "mainhand", "offhand",
];

const SLOT_NAMES: Record<string, string> = {
  head: "Tête", neck: "Cou", shoulder: "Épaules", back: "Dos",
  chest: "Poitrine", wrist: "Poignets", hands: "Mains", waist: "Ceinture",
  legs: "Jambes", feet: "Pieds",
  finger1: "Anneau 1", finger2: "Anneau 2",
  trinket1: "Bibelot 1", trinket2: "Bibelot 2",
  mainhand: "Main directrice", offhand: "Main secondaire",
};

function scoreColor(s: number) {
  if (s >= 3500) return "var(--score-legendary)";
  if (s >= 2500) return "var(--score-epic)";
  if (s >= 1500) return "var(--score-rare)";
  if (s >= 500)  return "var(--score-uncommon)";
  return "var(--score-common)";
}

function qualityColor(quality?: { type: string }) {
  switch (quality?.type) {
    case "LEGENDARY": return "#ff8000";
    case "EPIC":      return "#a335ee";
    case "RARE":      return "#0070dd";
    case "UNCOMMON":  return "#1eff00";
    default:          return "var(--text-2)";
  }
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function keyUpgrade(n: number) {
  return n >= 3 ? "+++" : n === 2 ? "++" : n === 1 ? "+" : "";
}

type Tab = "gear" | "runs" | "weekly" | "bis";

const TABS: { key: Tab; label: string }[] = [
  { key: "gear",   label: "Équipement" },
  { key: "runs",   label: "Meilleures clés" },
  { key: "weekly", label: "Semaine en cours" },
  { key: "bis",    label: "Analyse BiS" },
];

interface Props {
  profile: RioCharacterProfile;
  region: string;
  realm: string;
  name: string;
}

export function CharacterDetailClient({ profile, region, realm, name }: Props) {
  const [tab, setTab] = useState<Tab>("runs");
  const classColor = CLASS_COLORS[profile.class] ?? "var(--gold)";
  const score = profile.mythic_plus_scores_by_season?.[0]?.scores.all ?? 0;
  const gear = profile.gear?.items ?? {};
  const equippedIlvl = profile.gear?.item_level_equipped ?? 0;
  const bestRuns = profile.mythic_plus_best_runs ?? [];
  const weeklyRuns = profile.mythic_plus_weekly_highest_level_runs ?? [];

  const classIconSlug = profile.class.toLowerCase().replace(/\s+/g, "").replace("'", "");

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 16px 64px" }}>

      {/* ── Back nav ── */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/dashboard" style={{ fontSize: "12px", color: "var(--text-2)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
          onMouseOver={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseOut={e => (e.currentTarget.style.color = "var(--text-2)")}
        >
          ← Tableau de bord
        </Link>
        <div style={{ display: "flex", gap: "8px" }}>
          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--arcane)", textDecoration: "none", border: "1px solid rgba(77,150,245,0.3)", borderRadius: "4px", padding: "4px 10px" }}>
            Raider.IO ↗
          </a>
          <a href={`https://worldofwarcraft.blizzard.com/en-gb/character/${region}/${realm}/${name}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--text-2)", textDecoration: "none", border: "1px solid var(--border-2)", borderRadius: "4px", padding: "4px 10px" }}>
            Armory ↗
          </a>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${classColor}`,
        borderRadius: "8px",
        padding: "20px 24px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        flexWrap: "wrap" as const,
      }}>
        {/* Class icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/classes/${classIconSlug}.jpg`}
          alt={profile.class}
          width={52}
          height={52}
          style={{ borderRadius: "8px", border: `2px solid ${classColor}44`, flexShrink: 0 }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "24px",
            fontWeight: 700,
            color: classColor,
            margin: "0 0 4px",
            letterSpacing: "0.02em",
          }}>
            {profile.name}
          </h1>
          <p style={{ margin: "0 0 2px", fontSize: "13px", color: "var(--text-2)" }}>
            {profile.active_spec_name} {profile.class}
            <span style={{ color: "var(--text-3)" }}> · {profile.realm} · {region.toUpperCase()}</span>
          </p>
          {equippedIlvl > 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {equippedIlvl} <span style={{ fontSize: "10px" }}>ilvl équipé</span>
            </p>
          )}
        </div>

        {score > 0 && (
          <div style={{
            textAlign: "center" as const,
            border: `1px solid ${scoreColor(score)}44`,
            borderRadius: "8px",
            padding: "12px 20px",
            background: `${scoreColor(score)}10`,
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "26px", color: scoreColor(score), lineHeight: 1 }}>
              {Math.round(score).toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: "4px" }}>
              Score M+
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", marginBottom: "16px" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "9px 16px",
              fontSize: "12px",
              fontWeight: 600,
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.key ? "var(--gold)" : "transparent"}`,
              color: tab === t.key ? "var(--text)" : "var(--text-2)",
              cursor: "pointer",
              transition: "color 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ animation: "fade-in 0.2s ease both" }}>

        {/* Gear tab */}
        {tab === "gear" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {Object.keys(gear).length === 0 ? (
              <p style={{ padding: "24px", color: "var(--text-3)", fontSize: "13px", margin: 0 }}>Équipement non disponible.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    {["Emplacement", "Item", "ilvl"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-2)", textAlign: h === "ilvl" ? "right" as const : "left" as const, fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GEAR_SLOTS.map(slot => {
                    const item: RioGearItem | undefined = gear[slot];
                    return (
                      <tr key={slot}
                        style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "7px 14px", fontSize: "11px", color: "var(--text-3)", whiteSpace: "nowrap" as const, width: "130px" }}>
                          {SLOT_NAMES[slot] ?? slot}
                        </td>
                        <td style={{ padding: "7px 8px", fontSize: "12px" }}>
                          {item ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {item.icon && <img src={`https://wow.zamimg.com/images/wow/icons/small/${item.icon}.jpg`} alt="" width={20} height={20} style={{ borderRadius: "3px", flexShrink: 0 }} onError={e => { e.currentTarget.style.display = "none"; }} />}
                              <span style={{ color: qualityColor(item.quality) }}>{item.name}</span>
                              {item.is_legendary && <span style={{ fontSize: "9px", color: "#ff8000", border: "1px solid rgba(255,128,0,0.3)", borderRadius: "3px", padding: "1px 4px", fontWeight: 700 }}>LÉGENDAIRE</span>}
                              {item.is_crafted && <span style={{ fontSize: "9px", color: "var(--arcane)", border: "1px solid rgba(77,150,245,0.3)", borderRadius: "3px", padding: "1px 4px" }}>Fabriqué</span>}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-3)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "7px 14px", textAlign: "right" as const, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                          {item ? (
                            <span style={{
                              color: equippedIlvl
                                ? item.item_level >= equippedIlvl + 5 ? "var(--score-legendary)"
                                  : item.item_level >= equippedIlvl ? "var(--score-epic)"
                                  : item.item_level >= equippedIlvl - 10 ? "var(--score-rare)"
                                  : "var(--text-2)"
                                : "var(--text)",
                              fontSize: "13px",
                            }}>
                              {item.item_level}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Best runs tab */}
        {tab === "runs" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {bestRuns.length === 0 ? (
              <p style={{ padding: "24px", color: "var(--text-3)", fontSize: "13px", margin: 0 }}>Aucune donnée disponible.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    {["Donjon", "Clé", "Temps", "Timer", "Score"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-2)", textAlign: "left" as const, fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bestRuns.slice(0, 12).map((run, i) => {
                    const timed = run.num_keystone_upgrades > 0;
                    const timeDiff = run.par_time_ms - run.clear_time_ms;
                    const upgrade = keyUpgrade(run.num_keystone_upgrades);
                    return (
                      <tr key={i}
                        style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text)" }}>{run.dungeon}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                          <span style={{ color: timed ? "var(--gold)" : "var(--negative)" }}>+{run.mythic_level}</span>
                          {upgrade && <span style={{ color: "var(--positive)", fontSize: "10px", marginLeft: "2px" }}>{upgrade}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-2)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatTime(run.clear_time_ms)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                          <span style={{ color: timeDiff >= 0 ? "var(--positive)" : "var(--negative)" }}>
                            {timeDiff >= 0 ? "+" : "-"}{formatTime(Math.abs(timeDiff))}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-2)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {run.score > 0 ? run.score.toFixed(1) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Weekly tab */}
        {tab === "weekly" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {weeklyRuns.length === 0 ? (
              <p style={{ padding: "24px", color: "var(--text-3)", fontSize: "13px", margin: 0 }}>Aucune clé cette semaine.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    {["Donjon", "Clé", "Temps", "Timer"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-2)", textAlign: "left" as const, fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyRuns.map((run, i) => {
                    const timed = run.num_keystone_upgrades > 0;
                    const timeDiff = run.par_time_ms - run.clear_time_ms;
                    const upgrade = keyUpgrade(run.num_keystone_upgrades);
                    return (
                      <tr key={i}
                        style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text)" }}>{run.dungeon}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                          <span style={{ color: timed ? "var(--gold)" : "var(--negative)" }}>+{run.mythic_level}</span>
                          {upgrade && <span style={{ color: "var(--positive)", fontSize: "10px", marginLeft: "2px" }}>{upgrade}</span>}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-2)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatTime(run.clear_time_ms)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                          <span style={{ color: timeDiff >= 0 ? "var(--positive)" : "var(--negative)" }}>
                            {timeDiff >= 0 ? "+" : "-"}{formatTime(Math.abs(timeDiff))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BiS tab */}
        {tab === "bis" && (
          <BisPanel
            region={region}
            characterClass={profile.class}
            defaultSpec={profile.active_spec_name}
            characterGear={gear}
          />
        )}
      </div>
    </div>
  );
}
