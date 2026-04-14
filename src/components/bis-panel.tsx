"use client";

import { RioGearItem } from "@/lib/raiderio-api";
import { BisAnalysisResult, BisItem } from "@/app/api/bis/route";
import { useState, useEffect } from "react";

const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight":  ["Blood", "Frost", "Unholy"],
  "Demon Hunter":  ["Devourer", "Havoc", "Vengeance"],
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

// ─── Item row (shared between BiS and Alt) ────────────────────────────────────

function ItemRow({
  label,
  labelColor,
  item,
  charItem,
  highlight,
  isAlternative,
}: {
  label: string;
  labelColor: string;
  item: BisItem;
  charItem?: RioGearItem;
  highlight?: boolean;
  isAlternative?: boolean;
}) {
  const delta = charItem ? item.item_level - charItem.item_level : null;
  const isUpgrade = delta !== null && delta > 0;
  const hasIt = charItem && charItem.item_id === item.item_id;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "5px",
      marginTop: "5px",
      paddingTop: "5px",
      borderTop: "1px solid var(--border)",
    }}>
      <span style={{
        fontSize: "8px",
        color: labelColor,
        width: "28px",
        flexShrink: 0,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {label}
      </span>
      <a
        href={wowhead(item.item_id)}
        target="_blank"
        rel="noopener noreferrer"
        title={`${item.name} — ${Math.round(item.frequency * 100)}% des votes`}
        style={{ display: "flex", flexShrink: 0 }}
      >
        {item.icon && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.icon_url || zamimg(item.icon)}
            alt=""
            width={20}
            height={20}
            style={{
              borderRadius: "3px",
              outline: highlight && isUpgrade ? "1px solid rgba(255,192,0,0.6)" : "none",
              outlineOffset: "1px",
            }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </a>
      <div style={{ lineHeight: 1.2, minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{
            fontSize: "11px",
            color: isUpgrade ? "var(--positive)" : "var(--text-2)",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}>
            {item.item_level}
          </span>
          {isUpgrade && (
            <span style={{ fontSize: "9px", color: "var(--positive)", fontWeight: 700 }}>
              +{delta}
            </span>
          )}
          {hasIt && (
            <span style={{ 
              fontSize: "9px", 
              color: "var(--positive)", 
              fontWeight: 700,
              background: isAlternative ? "rgba(62,202,114,0.15)" : "transparent",
              padding: isAlternative ? "1px 3px" : "0",
              borderRadius: isAlternative ? "3px" : "0",
            }}>
              {isAlternative ? "ALT ✓" : "✓"}
            </span>
          )}
        </div>
        <div style={{ fontSize: "8px", color: "var(--text-3)" }}>
          {Math.round(item.frequency * 100)}% votes
          {item.dungeon_display && (
            <span style={{ marginLeft: "3px", color: "var(--text-3)" }}>
              · {item.dungeon_display}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Slot card ────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: string;
  bisItem?: BisItem;
  altItem?: BisItem;
  charItem?: RioGearItem;
}

function SlotCard({ slot, bisItem, altItem, charItem }: SlotCardProps) {
  const hasBis = !!(bisItem && charItem && charItem.item_id === bisItem.item_id);
  const hasAlt = !!(altItem && charItem && charItem.item_id === altItem.item_id);
  const delta  = bisItem && charItem ? bisItem.item_level - charItem.item_level : null;
  const isUpgrade = delta !== null && delta > 0;

  // Show alt row when: altItem exists AND player doesn't already have BiS AND alt differs from BiS
  const showAlt = !!(altItem && !hasBis && bisItem && altItem.item_id !== bisItem.item_id);

  let borderColor = "var(--border)";
  let bgColor     = "var(--surface)";
  if (hasBis || hasAlt)                { borderColor = "rgba(62,202,114,0.5)";  bgColor = "rgba(62,202,114,0.05)"; }
  else if (isUpgrade)                  { borderColor = "rgba(255,192,0,0.45)"; }
  else if (bisItem && !charItem)       { borderColor = "rgba(232,80,80,0.35)"; }

  const curIcon = charItem?.icon ?? "";

  return (
    <div className="animate-scale-in hover-lift" style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: "7px",
      padding: "8px 10px",
      width: "148px",
      flexShrink: 0,
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
            {hasAlt && !hasBis && (
              <span style={{ fontSize: "9px", color: "var(--arcane)", fontWeight: 700 }}>
                Alt ✓
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: "10px", color: "var(--text-3)", fontStyle: "italic" }}>—</span>
        )}
      </div>

      {/* BiS item (only shown when not already BiS) */}
      {bisItem && !hasBis && (
        <ItemRow
          label="bis"
          labelColor="var(--gold)"
          item={bisItem}
          charItem={charItem}
          highlight
        />
      )}

      {/* Alternative item (weapons, trinkets, rings only) */}
      {showAlt && (
        <ItemRow
          label="alt"
          labelColor="var(--arcane)"
          item={altItem!}
          charItem={charItem}
          isAlternative={true}
        />
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
  const [result, setResult] = useState<BisAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBisData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bis/data?region=${encodeURIComponent(region)}&class=${encodeURIComponent(characterClass)}&spec=${encodeURIComponent(selectedSpec)}`
      );
      const data: BisAnalysisResult = await res.json();
      if (data.error) { setError(data.error); setResult(null); }
      else setResult(data);
    } catch {
      setError("Erreur lors du chargement des données BiS. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  // Charger automatiquement au montage et quand la spec change
  useEffect(() => {
    if (selectedSpec) {
      loadBisData();
    }
  }, [selectedSpec]);

  const bisMap = result?.bis;
  const altMap = result?.bis_alternatives;

  // Smart distribution logic for paired slots (trinkets, rings)
  const distributedBis: Record<string, BisItem> = {};
  const distributedAlt: Record<string, BisItem> = {};

  if (bisMap && altMap) {
    // Copy all non-paired slots first
    for (const [slot, item] of Object.entries(bisMap)) {
      if (!slot.match(/^(trinket|finger)/)) {
        distributedBis[slot] = item;
      }
    }
    for (const [slot, item] of Object.entries(altMap)) {
      if (!slot.match(/^(trinket|finger)/)) {
        distributedAlt[slot] = item;
      }
    }

    // Helper to distribute paired slots intelligently
    function distributePairedSlots(
      slot1Name: string,
      slot2Name: string,
      bis1: BisItem | undefined,
      bis2: BisItem | undefined,
      alt1: BisItem | undefined,
      alt2: BisItem | undefined,
      char1: RioGearItem | undefined,
      char2: RioGearItem | undefined
    ) {
      // Collect all unique items with their vote counts
      const itemMap = new Map<number, BisItem>();
      if (bis1) itemMap.set(bis1.item_id, bis1);
      if (bis2 && bis2.item_id !== bis1?.item_id) itemMap.set(bis2.item_id, bis2);
      if (alt1 && !itemMap.has(alt1.item_id)) itemMap.set(alt1.item_id, alt1);
      if (alt2 && !itemMap.has(alt2.item_id)) itemMap.set(alt2.item_id, alt2);

      // Sort by votes (raw_count)
      const sortedItems = Array.from(itemMap.values()).sort((a, b) => b.raw_count - a.raw_count);
      
      if (sortedItems.length === 0) return;

      const has1 = char1 ? sortedItems.findIndex(item => item.item_id === char1.item_id) : -1;
      const has2 = char2 ? sortedItems.findIndex(item => item.item_id === char2.item_id) : -1;

      // Player has top 2 items already
      if (has1 >= 0 && has2 >= 0 && has1 < 2 && has2 < 2) {
        // Great! Show what they have
        return;
      }

      // Distribute top 2 items
      const top1 = sortedItems[0];
      const top2 = sortedItems[1];

      // Player has the top item in slot 1
      if (char1?.item_id === top1.item_id) {
        // They have top in slot 1, show it and recommend #2 in slot 2
        distributedBis[slot1Name] = top1;
        if (top2) distributedBis[slot2Name] = top2;
      } 
      // Player has the top item in slot 2
      else if (char2?.item_id === top1.item_id) {
        // They have top in slot 2, show it and recommend #2 in slot 1
        distributedBis[slot2Name] = top1;
        if (top2) distributedBis[slot1Name] = top2;
      } 
      // Player doesn't have the top item
      else {
        // Show top in slot 1, #2 in slot 2
        distributedBis[slot1Name] = top1;
        if (top2) {
          distributedBis[slot2Name] = top2;
          // Show 3rd option as alternative for slot 2 if available
          if (sortedItems[2]) {
            distributedAlt[slot2Name] = sortedItems[2];
          }
        }
      }

      // Add alternatives where appropriate
      if (!distributedAlt[slot1Name] && top2 && char1?.item_id !== top1.item_id) {
        distributedAlt[slot1Name] = top2;
      }
    }

    // Apply to trinkets
    distributePairedSlots(
      'trinket1', 'trinket2',
      bisMap.trinket1, bisMap.trinket2,
      altMap.trinket1, altMap.trinket2,
      characterGear.trinket1, characterGear.trinket2
    );

    // Apply to rings
    distributePairedSlots(
      'finger1', 'finger2',
      bisMap.finger1, bisMap.finger2,
      altMap.finger1, altMap.finger2,
      characterGear.finger1, characterGear.finger2
    );
  }

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

          <div style={{
            fontSize: "10px",
            color: "var(--text-3)",
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.7,
          }}>
            Mise à jour quotidienne à 6h
          </div>
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

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{
          padding: "80px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}>
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            {/* Outer rotating ring */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              border: "3px solid transparent",
              borderTopColor: "var(--gold)",
              borderRightColor: "var(--gold)",
              borderRadius: "50%",
              animation: "spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
            }} />
            {/* Middle counter-rotating ring */}
            <div style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              width: "60px",
              height: "60px",
              border: "3px solid transparent",
              borderBottomColor: "var(--arcane)",
              borderLeftColor: "var(--arcane)",
              borderRadius: "50%",
              animation: "spin-reverse 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
            }} />
            {/* Inner pulsing core */}
            <div style={{
              position: "absolute",
              top: "30px",
              left: "30px",
              width: "20px",
              height: "20px",
              background: "radial-gradient(circle, var(--gold), transparent)",
              borderRadius: "50%",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
          <div style={{
            fontSize: "13px",
            color: "var(--text-2)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
            animation: "fade-in-out 2s ease-in-out infinite",
          }}>
            Analyse des meilleurs joueurs {selectedSpec}...
          </div>
        </div>
      )}

      {/* ── Paper doll layout ── */}
      {result && !error && !loading && (
        <div style={{ padding: "16px" }}>

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
                  bisItem={distributedBis?.[slot]}
                  altItem={distributedAlt?.[slot]}
                  charItem={characterGear[slot]}
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
                  bisItem={distributedBis?.[slot]}
                  altItem={distributedAlt?.[slot]}
                  charItem={characterGear[slot]}
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
                bisItem={distributedBis?.[slot]}
                altItem={distributedAlt?.[slot]}
                charItem={characterGear[slot]}
              />
            ))}
          </div>

          {/* Empty state */}
          {Object.keys(distributedBis ?? {}).length === 0 && (
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
