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

// RIO slot keys: no underscores for fingers/trinkets/weapons
const SLOT_NAMES: Record<string, string> = {
  head: "Tête", neck: "Cou", shoulder: "Épaules", back: "Dos",
  chest: "Poitrine", wrist: "Poignets", hands: "Mains", waist: "Ceinture",
  legs: "Jambes", feet: "Pieds",
  finger1: "Anneau 1", finger2: "Anneau 2",
  trinket1: "Bibelot 1", trinket2: "Bibelot 2",
  mainhand: "Main directrice", offhand: "Main secondaire",
};
const SLOT_ORDER = Object.keys(SLOT_NAMES);

function freqColor(f: number): string {
  if (f >= 0.9) return "var(--score-legendary)";
  if (f >= 0.75) return "var(--score-epic)";
  if (f >= 0.6)  return "var(--score-rare)";
  return "var(--positive)";
}

function ItemIcon({ item, size = 28 }: { item: BisItem; size?: number }) {
  const src = (item as BisItem & { icon_url?: string }).icon_url
    || (item.icon ? `https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg` : null);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.name}
      width={size}
      height={size}
      style={{ borderRadius: "4px", flexShrink: 0, objectFit: "cover" as const }}
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
  );
}

function BisRow({ slot, item, charItem }: { slot: string; item: BisItem; charItem?: RioGearItem }) {
  const hasBis = charItem?.item_id === item.item_id;
  const hasUpgrade = !hasBis && charItem && charItem.item_level < item.item_level;
  const delta = hasUpgrade ? item.item_level - charItem.item_level : 0;

  return (
    <tr
      style={{
        borderBottom: "1px solid var(--border)",
        transition: "background 0.1s",
        backgroundColor: hasBis ? "rgba(62,202,114,0.04)" : "transparent",
      }}
      onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
      onMouseOut={e => (e.currentTarget.style.backgroundColor = hasBis ? "rgba(62,202,114,0.04)" : "transparent")}
    >
      <td style={{ padding: "8px 10px", color: "var(--text-3)", fontSize: "11px", whiteSpace: "nowrap" as const, width: "110px" }}>
        {SLOT_NAMES[slot] ?? slot}
      </td>
      <td style={{ padding: "8px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ItemIcon item={item} size={28} />
          <div>
            <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, lineHeight: 1.3 }}>{item.name}</div>
            {item.dungeon && (
              <div style={{ fontSize: "10px", color: "var(--arcane)", marginTop: "1px" }}>{item.dungeon}</div>
            )}
            {!item.dungeon && (
              <div style={{ fontSize: "10px", color: "var(--text-3)", marginTop: "1px", fontStyle: "italic" as const }}>Raid / Inconnu</div>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: "8px 8px", textAlign: "center" as const, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--text)" }}>
        {item.item_level}
      </td>
      <td style={{ padding: "8px 8px", textAlign: "center" as const, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: freqColor(item.frequency) }}>
        {Math.round(item.frequency * 100)}%
      </td>
      <td style={{ padding: "8px 10px", textAlign: "right" as const }}>
        {hasBis ? (
          <span style={{ display: "inline-block", padding: "2px 7px", background: "var(--positive-dim)", color: "var(--positive)", border: "1px solid rgba(62,202,114,0.3)", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>BiS ✓</span>
        ) : hasUpgrade ? (
          <span style={{ display: "inline-block", padding: "2px 7px", background: "var(--arcane-dim)", color: "var(--arcane)", border: "1px solid rgba(77,150,245,0.3)", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>+{delta} ilvl</span>
        ) : charItem ? (
          <span style={{ display: "inline-block", padding: "2px 7px", background: "var(--surface-3)", color: "var(--text-3)", borderRadius: "3px", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>{charItem.item_level}</span>
        ) : (
          <span style={{ display: "inline-block", padding: "2px 7px", background: "var(--negative-dim)", color: "var(--negative)", border: "1px solid rgba(232,80,80,0.2)", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>Manquant</span>
        )}
      </td>
    </tr>
  );
}

interface Props {
  region: string;
  characterClass: string;
  defaultSpec: string;
  characterGear: Record<string, RioGearItem>;
}

export function BisPanel({ region, characterClass, defaultSpec, characterGear }: Props) {
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

  const bisMap = activeTab === "dungeon" ? result?.bis_dungeon : result?.bis_full;
  const slotsWithBis = SLOT_ORDER.filter(slot => bisMap?.[slot]);

  const missingByDungeon = (result?.dungeon_priority ?? []).map(dp => ({
    ...dp,
    missing: dp.items.filter(item => characterGear[item.slot]?.item_id !== item.item_id),
  })).filter(dp => dp.missing.length > 0);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const }}>
        <div>
          <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
            Analyse BiS
          </span>
          {result && (
            <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "8px" }}>
              · {result.analyzed_count} joueurs analysés
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
          <select
            value={selectedSpec}
            onChange={e => setSelectedSpec(e.target.value)}
            disabled={loading}
            style={{ padding: "5px 10px", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: "5px", color: "var(--text)", fontSize: "12px", cursor: "pointer" }}
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
              textTransform: "uppercase" as const,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading && (
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid var(--text-3)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            )}
            {loading ? "Analyse…" : result ? "Relancer" : "Analyser"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "var(--negative-dim)", borderBottom: "1px solid rgba(232,80,80,0.15)", fontSize: "12px", color: "var(--negative)", lineHeight: 1.5 }}>
          <strong>Erreur :</strong> {error}
          {error.includes("saison") && (
            <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-3)" }}>
              Conseil : la saison en cours n'est peut-être pas encore indexée sur Raider.IO. Réessayez plus tard.
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {result && !error && (
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex" }}>
          {(["dungeon", "full"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "9px 18px", fontSize: "12px", fontWeight: 600, background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? "var(--gold)" : "transparent"}`, color: activeTab === tab ? "var(--text)" : "var(--text-2)", cursor: "pointer", transition: "color 0.15s" }}>
              {tab === "dungeon" ? "Donjons uniquement" : "Complet (Raid + Donjon)"}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {result && !error && (
        <>
          {slotsWithBis.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" as const, color: "var(--text-3)", fontSize: "13px" }}>
              Aucun item BiS identifié avec ≥50% de fréquence pour cette spécialisation.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    {["Emplacement", "Item BiS", "ilvl", "Fréquence", "Statut"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-2)", textAlign: (h === "Emplacement" || h === "Item BiS") ? "left" as const : "center" as const, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slotsWithBis.map(slot => (
                    <BisRow key={slot} slot={slot} item={bisMap![slot]} charItem={characterGear[slot]} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Priority */}
          {activeTab === "dungeon" && missingByDungeon.length > 0 && (
            <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "10px" }}>
                Donjons prioritaires à farmer
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {missingByDungeon.map((dp, i) => (
                  <div key={dp.dungeon_name} style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderLeft: `3px solid ${i === 0 ? "var(--gold)" : i === 1 ? "var(--arcane)" : "var(--border-2)"}`, borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text)", fontFamily: "'Cinzel', serif" }}>{dp.dungeon_name}</span>
                      <span style={{ fontSize: "11px", color: i === 0 ? "var(--gold)" : "var(--arcane)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{dp.missing.length} BiS</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                      {dp.missing.map(item => (
                        <div key={item.item_id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <ItemIcon item={item} size={20} />
                          <span style={{ fontSize: "11px", color: "var(--text-2)" }}>{SLOT_NAMES[item.slot] ?? item.slot}: {item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!result && !loading && !error && (
        <div style={{ padding: "32px 16px", textAlign: "center" as const, color: "var(--text-3)", fontSize: "13px", lineHeight: 1.8 }}>
          <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4, fontFamily: "'Cinzel Decorative', serif", color: "var(--gold)" }}>⚔</div>
          Sélectionnez une spec et lancez l'analyse<br />
          <span style={{ fontSize: "11px" }}>Basé sur l'équipement des meilleurs joueurs de la saison en cours</span>
        </div>
      )}
    </div>
  );
}
