"use client";

import { RioGearItem } from "@/lib/raiderio-api";
import { BisAnalysisResult, BisItem } from "@/app/api/bis/route";
import { useState } from "react";

const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight":  ["Blood", "Frost", "Unholy"],
  "Demon Hunter":  ["Havoc", "Vengeance"],
  Druid:           ["Balance", "Feral", "Guardian", "Restoration"],
  Evoker:          ["Augmentation", "Devastation", "Preservation"],
  Hunter:          ["Beast Mastery", "Marksmanship", "Survival"],
  Mage:            ["Arcane", "Fire", "Frost"],
  Monk:            ["Brewmaster", "Mistweaver", "Windwalker"],
  Paladin:         ["Holy", "Protection", "Retribution"],
  Priest:          ["Discipline", "Holy", "Shadow"],
  Rogue:           ["Assassination", "Outlaw", "Subtlety"],
  Shaman:          ["Elemental", "Enhancement", "Restoration"],
  Warlock:         ["Affliction", "Demonology", "Destruction"],
  Warrior:         ["Arms", "Fury", "Protection"],
};

const SLOT_NAMES: Record<string, string> = {
  head: "Tête", neck: "Cou", shoulder: "Épaules", back: "Dos",
  chest: "Poitrine", wrist: "Poignets", hands: "Mains", waist: "Ceinture",
  legs: "Jambes", feet: "Pieds",
  finger1: "Anneau 1", finger2: "Anneau 2",
  trinket1: "Bibelot 1", trinket2: "Bibelot 2",
  mainhand: "Main dir.", offhand: "Main sec.",
};

// WoW paper-doll layout: left col, right col, bottom row
const LEFT_SLOTS  = ["head", "neck", "shoulder", "back", "chest", "wrist"];
const RIGHT_SLOTS = ["hands", "waist", "legs", "feet", "finger1", "finger2"];
const BOTTOM_SLOTS = ["trinket1", "trinket2", "mainhand", "offhand"];

function wowhead(itemId: number) {
  return `https://www.wowhead.com/fr/item=${itemId}`;
}

function zamimg(icon: string, size: "small" | "medium" = "small") {
  if (!icon) return "";
  return `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;
}

// ─── Slot card ────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: string;
  bisItem?: BisItem;
  charItem?: RioGearItem;
  analyzed: number;
}

function SlotCard({ slot, bisItem, charItem, analyzed }: SlotCardProps) {
  const hasBis = !!(bisItem && charItem && charItem.item_id === bisItem.item_id);
  const delta   = bisItem && charItem ? bisItem.item_level - charItem.item_level : null;
  const isUpgrade = delta !== null && delta > 0;
  const hasDowngrade = delta !== null && delta < 0;

  let borderColor = "var(--border)";
  let bgColor     = "var(--surface)";
  if (hasBis)                          { borderColor = "rgba(62,202,114,0.5)";   bgColor = "rgba(62,202,114,0.05)"; }
  else if (isUpgrade)                   { borderColor = "rgba(255,192,0,0.45)"; }
  else if (bisItem && !charItem)        { borderColor = "rgba(232,80,80,0.35)"; }
  else if (hasDowngrade)                { borderColor = "var(--border)"; }

  const curIcon  = charItem?.icon ?? "";
  const bisIcon  = bisItem?.icon ?? "";

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: "7px",
      padding: "8px 10px",
      width: "148px",
      flexShrink: 0,
      transition: "border-color 0.15s",
    }}>
      {/* Slot label */}
      <div style={{
        fontSize: "8px",
        fontWeight: 700,
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "6px",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {SLOT_NAMES[slot] ?? slot}
      </div>

      {/* Equipped item */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", minHeight: "22px" }}>
        <span style={{ fontSize: "8px", color: "var(--text-3)", width: "28px", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
          vous
        </span>
        {charItem ? (
          <>
            <a
              href={wowhead(charItem.item_id)}
              target="_blank"
              rel="noopener noreferrer"
              title={charItem.name}
              style={{ display: "flex", flexShrink: 0 }}
            >
              {curIcon && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={zamimg(curIcon)}
                  alt=""
                  width={20}
                  height={20}
                  style={{ borderRadius: "3px" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </a>
            <span style={{
              fontSize: "11px",
              color: "var(--text-2)",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}>
              {charItem.item_level}
            </span>
            {hasBis && (
              <span style={{ fontSize: "9px", color: "var(--positive)", fontWeight: 700 }}>
                BiS ✓
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: "10px", color: "var(--text-3)", fontStyle: "italic" }}>—</span>
        )}
      </div>

      {/* BiS item (only shown when not already BiS) */}
      {bisItem && !hasBis && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", paddingTop: "5px", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: "8px", color: "var(--gold)", width: "28px", flexShrink: 0, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            bis
          </span>
          <a
            href={wowhead(bisItem.item_id)}
            target="_blank"
            rel="noopener noreferrer"
            title={`${bisItem.name} — ${bisItem.raw_count}/${analyzed} joueurs`}
            style={{ display: "flex", flexShrink: 0 }}
          >
            {bisIcon && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={bisItem.icon_url || zamimg(bisIcon)}
                alt=""
                width={20}
                height={20}
                style={{
                  borderRadius: "3px",
                  outline: isUpgrade ? "1px solid rgba(255,192,0,0.6)" : "none",
                  outlineOffset: "1px",
                }}
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </a>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{
                fontSize: "11px",
                color: isUpgrade ? "var(--positive)" : "var(--text-2)",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
              }}>
                {bisItem.item_level}
              </span>
              {isUpgrade && (
                <span style={{ fontSize: "9px", color: "var(--positive)", fontWeight: 700 }}>
                  +{delta}
                </span>
              )}
            </div>
            <div style={{ fontSize: "8px", color: "var(--text-3)" }}>
              {bisItem.raw_count}/{analyzed} joueurs
            </div>
          </div>
        </div>
      )}

      {/* No BiS data for this slot */}
      {!bisItem && (
        <div style={{ fontSize: "9px", color: "var(--text-3)", marginTop: "4px", fontStyle: "italic" }}>
          pas de données
        </div>
      )}
    </div>
  );
}

// ─── Character center portrait ────────────────────────────────────────────────

function CharacterCenter({
  thumbnailUrl,
  characterClass,
  spec,
  analyzed,
  totalScanned,
}: {
  thumbnailUrl?: string;
  characterClass: string;
  spec: string;
  analyzed: number;
  totalScanned: number;
}) {
  const classSlug = characterClass.toLowerCase().replace(/\s+/g, "").replace("'", "");
  // Try to derive the main 3D render from RIO's thumbnail URL
  // thumbnail: .../avatar/ID-hash.jpg  →  main: .../main/ID-hash.jpg
  const mainRender = thumbnailUrl?.replace("/avatar/", "/main/") ?? null;
  const avatarUrl  = thumbnailUrl ?? null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      padding: "8px 16px",
      minWidth: "140px",
    }}>
      {/* Portrait */}
      <div style={{
        width: "96px",
        height: "96px",
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid var(--border-2)",
        background: "var(--surface-2)",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainRender ?? avatarUrl ?? `/classes/${classSlug}.jpg`}
          alt={characterClass}
          width={96}
          height={96}
          style={{ objectFit: "cover", objectPosition: "center top", display: "block" }}
          onError={e => {
            const el = e.currentTarget;
            if (el.src !== avatarUrl && avatarUrl) {
              el.src = avatarUrl;
            } else {
              el.src = `/classes/${classSlug}.jpg`;
              el.style.objectPosition = "center";
            }
          }}
        />
      </div>

      {/* Spec + class */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "var(--text)", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>{spec}</div>
        <div style={{ fontSize: "10px", color: "var(--text-2)" }}>{characterClass}</div>
      </div>

      {/* Sample info */}
      {analyzed > 0 && (
        <div style={{
          fontSize: "9px",
          color: "var(--text-3)",
          textAlign: "center",
          lineHeight: 1.5,
          background: "var(--surface-2)",
          borderRadius: "5px",
          padding: "5px 8px",
          border: "1px solid var(--border)",
        }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {analyzed}
          </span>{" "}
          joueurs analysés
          {totalScanned > 0 && totalScanned !== analyzed && (
            <>
              <br />
              <span style={{ color: "var(--text-3)" }}>({totalScanned} trouvés au total)</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dungeon priority card ────────────────────────────────────────────────────

function DungeonPriorityCard({
  dp,
  rank,
  characterGear,
}: {
  dp: { dungeon_name: string; dungeon_display: string; bis_count: number; items: BisItem[] };
  rank: number;
  characterGear: Record<string, RioGearItem>;
}) {
  const missing = dp.items.filter(item => characterGear[item.slot]?.item_id !== item.item_id);
  if (missing.length === 0) return null;

  const accentColor = rank === 0 ? "var(--gold)" : rank === 1 ? "var(--arcane)" : "var(--border-2)";

  return (
    <div style={{
      padding: "10px 12px",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "6px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text)", fontFamily: "'Cinzel', serif" }}>
          {dp.dungeon_display || dp.dungeon_name}
        </span>
        <span style={{ fontSize: "11px", color: accentColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {missing.length} BiS manquant{missing.length > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {missing.map(item => (
          <a
            key={item.item_id}
            href={wowhead(item.item_id)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "5px", textDecoration: "none" }}
            title={item.name}
          >
            {item.icon && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.icon_url || zamimg(item.icon)}
                alt=""
                width={20}
                height={20}
                style={{ borderRadius: "3px" }}
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <span style={{ fontSize: "11px", color: "var(--text-2)" }}>
              {SLOT_NAMES[item.slot] ?? item.slot}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  region: string;
  characterClass: string;
  defaultSpec: string;
  characterGear: Record<string, RioGearItem>;
  thumbnailUrl?: string;
}

export function BisPanel({ region, characterClass, defaultSpec, characterGear, thumbnailUrl }: Props) {
  const specs = CLASS_SPECS[characterClass] ?? [];
  const [selectedSpec, setSelectedSpec] = useState(specs.includes(defaultSpec) ? defaultSpec : specs[0] ?? "");
  const [activeTab, setActiveTab] = useState<"dungeon" | "full">("dungeon");
  const [result, setResult] = useState<BisAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bis?region=${encodeURIComponent(region)}&class=${encodeURIComponent(characterClass)}&spec=${encodeURIComponent(selectedSpec)}`
      );
      const data: BisAnalysisResult = await res.json();
      if (data.error) { setError(data.error); setResult(null); }
      else setResult(data);
    } catch {
      setError("Erreur réseau lors de l'analyse. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  // When the dungeon tab is selected but dungeon-source detection returned nothing
  // (happens when journal IDs aren't available for this season's items), fall back
  // to bisFull so the tab is never completely empty.
  const dungeonEmpty = result && Object.keys(result.bis_dungeon ?? {}).length === 0;
  const bisMap = activeTab === "dungeon"
    ? (dungeonEmpty ? result?.bis_full : result?.bis_dungeon)
    : result?.bis_full;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        background: "var(--surface-2)",
      }}>
        <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
          Analyse BiS
        </div>

        <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
          <select
            value={selectedSpec}
            onChange={e => setSelectedSpec(e.target.value)}
            disabled={loading}
            style={{
              padding: "5px 10px",
              background: "var(--surface)",
              border: "1px solid var(--border-2)",
              borderRadius: "5px",
              color: "var(--text)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {specs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            onClick={runAnalysis}
            disabled={loading || !selectedSpec}
            style={{
              padding: "5px 14px",
              background: loading ? "var(--surface-3)" : "var(--gold)",
              color: loading ? "var(--text-3)" : "#07090f",
              border: loading ? "1px solid var(--border-2)" : "none",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: loading || !selectedSpec ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading && (
              <span style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "2px solid var(--text-3)",
                borderTopColor: "transparent",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
            )}
            {loading ? "Analyse…" : result ? "Relancer" : "Analyser"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "var(--negative-dim)",
          borderBottom: "1px solid rgba(232,80,80,0.15)",
          fontSize: "12px",
          color: "var(--negative)",
          lineHeight: 1.5,
        }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* ── Tabs (dungeon vs full) ── */}
      {result && !error && (
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex" }}>
          {(["dungeon", "full"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "9px 18px",
                fontSize: "12px",
                fontWeight: 600,
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "var(--gold)" : "transparent"}`,
                color: activeTab === tab ? "var(--text)" : "var(--text-2)",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {tab === "dungeon" ? "Donjons seulement" : "Raid + Donjon"}
            </button>
          ))}
        </div>
      )}

      {/* ── Paper doll layout ── */}
      {result && !error && (
        <div style={{ padding: "16px" }}>

          {/* Dungeon fallback notice */}
      {activeTab === "dungeon" && dungeonEmpty && Object.keys(result.bis_full ?? {}).length > 0 && (
        <div style={{
          marginBottom: "12px",
          padding: "8px 12px",
          background: "rgba(255,192,0,0.07)",
          border: "1px solid rgba(255,192,0,0.25)",
          borderRadius: "6px",
          fontSize: "11px",
          color: "var(--text-2)",
          lineHeight: 1.5,
        }}>
          <strong style={{ color: "var(--gold)" }}>Source des donjons non détectée</strong> pour la saison en cours —
          affichage de tous les items BiS (raid inclus).
        </div>
      )}

      {/* Three-column: left slots | character | right slots */}
          <div style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {LEFT_SLOTS.map(slot => (
                <SlotCard
                  key={slot}
                  slot={slot}
                  bisItem={bisMap?.[slot]}
                  charItem={characterGear[slot]}
                  analyzed={result.analyzed_count}
                />
              ))}
            </div>

            {/* Center: character portrait */}
            <CharacterCenter
              thumbnailUrl={thumbnailUrl}
              characterClass={characterClass}
              spec={selectedSpec}
              analyzed={result.analyzed_count}
              totalScanned={result.total_scanned ?? 0}
            />

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {RIGHT_SLOTS.map(slot => (
                <SlotCard
                  key={slot}
                  slot={slot}
                  bisItem={bisMap?.[slot]}
                  charItem={characterGear[slot]}
                  analyzed={result.analyzed_count}
                />
              ))}
            </div>
          </div>

          {/* Bottom row: trinkets + weapons */}
          <div style={{
            display: "flex",
            gap: "6px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "8px",
          }}>
            {BOTTOM_SLOTS.map(slot => (
              <SlotCard
                key={slot}
                slot={slot}
                bisItem={bisMap?.[slot]}
                charItem={characterGear[slot]}
                analyzed={result.analyzed_count}
              />
            ))}
          </div>

          {/* Empty state */}
          {Object.keys(bisMap ?? {}).length === 0 && (
            <div style={{
              textAlign: "center",
              color: "var(--text-3)",
              fontSize: "12px",
              padding: "24px",
              marginTop: "8px",
              borderTop: "1px solid var(--border)",
            }}>
              Aucun item BiS identifié pour cette spec avec les données disponibles.
              <br />
              <span style={{ fontSize: "11px" }}>
                {result.analyzed_count} joueur{result.analyzed_count > 1 ? "s" : ""} analysé{result.analyzed_count > 1 ? "s" : ""},
                données gear insuffisantes.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Dungeon farming priority ── */}
      {result && !error && activeTab === "dungeon" && (result.dungeon_priority ?? []).length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{
            fontSize: "10px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-3)",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: "10px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border)",
          }}>
            Donjons prioritaires à farmer
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(result.dungeon_priority ?? []).map((dp, i) => (
              <DungeonPriorityCard
                key={dp.dungeon_name}
                dp={dp}
                rank={i}
                characterGear={characterGear}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Initial state ── */}
      {!result && !loading && !error && (
        <div style={{
          padding: "40px 16px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: "13px",
          lineHeight: 1.8,
        }}>
          <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.3, fontFamily: "'Cinzel Decorative', serif", color: "var(--gold)" }}>
            ⚔
          </div>
          Sélectionnez une spec et lancez l&apos;analyse
          <br />
          <span style={{ fontSize: "11px" }}>
            Basé sur l&apos;équipement des meilleurs joueurs de la saison en cours
          </span>
        </div>
      )}
    </div>
  );
}
