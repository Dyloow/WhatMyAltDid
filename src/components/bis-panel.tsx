"use client";

import { RioGearItem } from "@/lib/raiderio-api";
import { BisAnalysisResult, BisItem } from "@/app/api/bis/route";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

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

const SLOT_KEYS = [
  "head", "neck", "shoulder", "back", "chest", "wrist",
  "hands", "waist", "legs", "feet",
  "finger1", "finger2", "trinket1", "trinket2",
  "mainhand", "offhand",
] as const;

function useSlotNames() {
  const { t } = useI18n();
  const names: Record<string, string> = {};
  for (const k of SLOT_KEYS) names[k] = t(`slot.${k}`);
  return names;
}

const LEFT_SLOTS  = ["head", "neck", "shoulder", "back", "chest", "wrist"];
const RIGHT_SLOTS = ["hands", "waist", "legs", "feet", "finger1", "finger2"];
const BOTTOM_SLOTS = ["trinket1", "trinket2", "mainhand", "offhand"];

// Enchant effect ID → { display name, Wowhead item or spell ID }
// DK runes use spellId; everything else uses itemId (enchant scroll / consumable)
const ENCHANT_DATA: Record<number, { name: string; itemId?: number; spellId?: number }> = {
  3368: { name: "Rune of the Fallen Crusader", spellId: 53344 },
  4897: { name: "Goblin Glider", itemId: 109076 },
  6241: { name: "Rune of Sanguination", spellId: 326805 },
  6245: { name: "Rune of the Apocalypse", spellId: 327082 },
  7935: { name: "Sunset Spellthread", itemId: 222893 },
  7937: { name: "Daybreak Spellthread", itemId: 222896 },
  7963: { name: "Lynx's Dexterity", itemId: 243953 },
  7967: { name: "Eyes of the Eagle", itemId: 243957 },
  7969: { name: "Zul'jin's Mastery", itemId: 243959 },
  7983: { name: "Berserker's Rage", itemId: 243973 },
  7987: { name: "Mark of the Worldsoul", itemId: 243977 },
  7993: { name: "Shaladrassil's Roots", itemId: 243983 },
  7997: { name: "Nature's Fury", itemId: 243987 },
  8013: { name: "Mark of the Magister", itemId: 244003 },
  8019: { name: "Farstrider's Hunt", itemId: 244009 },
  8025: { name: "Silvermoon's Alacrity", itemId: 244015 },
  8027: { name: "Silvermoon's Tenacity", itemId: 244017 },
  8039: { name: "Acuity of the Ren'dorei", itemId: 244029 },
  8041: { name: "Arcane Mastery", itemId: 244031 },
  8159: { name: "Defender's Armor Kit", itemId: 219907 },
  8163: { name: "Stormbound Armor Kit", itemId: 219911 },
};

// Gem item ID → display name (EN fallback)
const GEM_NAMES: Record<number, string> = {
  240858: "Flawless Ruby",
  240889: "Flawless Keen Peridot",
  240890: "Flawless Deadly Peridot",
  240891: "Flawless Quick Peridot",
  240892: "Flawless Masterful Peridot",
  240893: "Flawless Versatile Peridot",
  240894: "Flawless Energized Peridot",
  240897: "Flawless Keen Amethyst",
  240898: "Flawless Deadly Amethyst",
  240899: "Flawless Quick Amethyst",
  240900: "Flawless Masterful Amethyst",
  240902: "Flawless Energized Amethyst",
  240905: "Flawless Keen Garnet",
  240906: "Flawless Deadly Garnet",
  240907: "Flawless Quick Garnet",
  240908: "Flawless Masterful Garnet",
  240910: "Flawless Energized Garnet",
  240914: "Flawless Deadly Sapphire",
  240916: "Flawless Masterful Sapphire",
  240918: "Flawless Energized Sapphire",
  240967: "Flawless Emerald",
  240969: "Flawless Onyx",
  240983: "Eversong Diamond",
};

function useWowhead() {
  const { wowheadPrefix } = useI18n();
  return (itemId: number) => {
    const prefix = wowheadPrefix ? `/${wowheadPrefix}` : "";
    return `https://www.wowhead.com${prefix}/item=${itemId}`;
  };
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
  wowheadUrl,
}: {
  label: string;
  labelColor: string;
  item: BisItem;
  charItem?: RioGearItem;
  highlight?: boolean;
  isAlternative?: boolean;
  wowheadUrl: (id: number) => string;
}) {
  const { t } = useI18n();
  const delta = charItem ? item.item_level - charItem.item_level : null;
  const isUpgrade = delta !== null && delta > 0;
  const hasIt = charItem && charItem.item_id === item.item_id;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "6px",
      paddingTop: "6px",
      borderTop: "1px solid var(--border)",
    }}>
      <span style={{
        fontSize: "10px",
        color: labelColor,
        width: "32px",
        flexShrink: 0,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {label}
      </span>
      <a
        href={wowheadUrl(item.item_id)}
        target="_blank"
        rel="noopener noreferrer"
        data-wh-rename-link="false"
        data-wh-icon-size="small"
        style={{ display: "flex", flexShrink: 0 }}
      >
        {item.icon && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.icon_url || zamimg(item.icon)}
            alt=""
            width={28}
            height={28}
            style={{
              borderRadius: "4px",
              outline: highlight && isUpgrade ? "1px solid rgba(255,192,0,0.6)" : "none",
              outlineOffset: "1px",
            }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </a>
      <div style={{ lineHeight: 1.3, minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{
            fontSize: "13px",
            color: isUpgrade ? "var(--positive)" : "var(--text-2)",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}>
            {item.item_level}
          </span>
          {isUpgrade && (
            <span style={{ fontSize: "11px", color: "var(--positive)", fontWeight: 700 }}>
              +{delta}
            </span>
          )}
          {hasIt && (
            <span style={{ 
              fontSize: "10px", 
              color: "var(--positive)", 
              fontWeight: 700,
              background: isAlternative ? "rgba(62,202,114,0.15)" : "transparent",
              padding: isAlternative ? "1px 4px" : "0",
              borderRadius: isAlternative ? "3px" : "0",
            }}>
              {isAlternative ? "ALT ✓" : "✓"}
            </span>
          )}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-3)" }}>
          {Math.round(item.frequency * 100)}% {t("bis.votes")}
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
  const { t } = useI18n();
  const wowheadUrl = useWowhead();
  const SLOT_NAMES = useSlotNames();
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
      borderRadius: "8px",
      padding: "10px 12px",
      width: "190px",
      flexShrink: 0,
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      {/* Slot label */}
      <div style={{
        fontSize: "10px",
        fontWeight: 700,
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "8px",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {SLOT_NAMES[slot] ?? slot}
      </div>

      {/* Equipped item */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "28px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-3)", width: "32px", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
          {t("bis.you")}
        </span>
        {charItem ? (
          <>
            <a
              href={wowheadUrl(charItem.item_id)}
              target="_blank"
              rel="noopener noreferrer"
              data-wh-rename-link="false"
              data-wh-icon-size="small"
              style={{ display: "flex", flexShrink: 0 }}
            >
              {curIcon && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={zamimg(curIcon)}
                  alt=""
                  width={28}
                  height={28}
                  style={{ borderRadius: "4px" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </a>
            <span style={{
              fontSize: "13px",
              color: "var(--text-2)",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}>
              {charItem.item_level}
            </span>
            {hasBis && (
              <span style={{ fontSize: "10px", color: "var(--positive)", fontWeight: 700 }}>
                BiS ✓
              </span>
            )}
            {hasAlt && !hasBis && (
              <span style={{ fontSize: "10px", color: "var(--arcane)", fontWeight: 700 }}>
                Alt ✓
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: "12px", color: "var(--text-3)", fontStyle: "italic" }}>—</span>
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
          wowheadUrl={wowheadUrl}
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
          wowheadUrl={wowheadUrl}
        />
      )}

      {/* No BiS data for this slot */}
      {!bisItem && (
        <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "5px", fontStyle: "italic" }}>
          {t("bis.noData")}
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
}: {
  thumbnailUrl?: string;
  characterClass: string;
  spec: string;
  analyzed: number;
}) {
  const { t } = useI18n();
  const classSlug = characterClass.toLowerCase().replace(/\s+/g, "").replace("'", "");
  const mainRender = thumbnailUrl?.replace("/avatar/", "/main/") ?? null;
  const avatarUrl  = thumbnailUrl ?? null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      padding: "10px 20px",
      minWidth: "160px",
    }}>
      {/* Portrait */}
      <div style={{
        width: "120px",
        height: "120px",
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
          width={120}
          height={120}
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
        <div style={{ fontSize: "14px", color: "var(--text)", fontFamily: "'Cinzel', serif", fontWeight: 600 }}>{t("spec." + spec) || spec}</div>
        <div style={{ fontSize: "12px", color: "var(--text-2)" }}>{t("class." + characterClass) || characterClass}</div>
      </div>

      {/* Sample info */}
      {analyzed > 0 && (
        <div style={{
          fontSize: "11px",
          color: "var(--text-3)",
          textAlign: "center",
          lineHeight: 1.5,
          background: "var(--surface-2)",
          borderRadius: "6px",
          padding: "6px 10px",
          border: "1px solid var(--border)",
        }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {analyzed}
          </span>{" "}
          {t("bis.analyzed")}
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
  const { t, locale, wowheadPrefix } = useI18n();
  const SLOT_NAMES = useSlotNames();
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
      setError(t("bis.loadError"));
    } finally {
      setLoading(false);
    }
  }

  // Charger automatiquement au montage et quand la spec change
  useEffect(() => {
    if (selectedSpec) {
      loadBisData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpec]);

  // Refresh Wowhead tooltips when data changes
  useEffect(() => {
    if (result && typeof window !== "undefined" && (window as any).$WowheadPower) {
      (window as any).$WowheadPower.refreshLinks();
    }
  }, [result]);

  const rawBis = result?.bis;
  const rawAlt = result?.bis_alternatives;

  // Remap merged slots (finger/trinket) to numbered slots (finger1/finger2, trinket1/trinket2)
  // The generation script aggregates both ring slots into "finger" and both trinket slots into "trinket"
  const bisMap: Record<string, BisItem> = rawBis ? { ...rawBis } : {};
  const altMap: Record<string, BisItem> = rawAlt ? { ...rawAlt } : {};

  // Split merged "finger" → finger1 (top) + finger2 (alternative)
  if (bisMap.finger && !bisMap.finger1) {
    bisMap.finger1 = bisMap.finger;
    if (altMap.finger) {
      bisMap.finger2 = altMap.finger;
      delete altMap.finger;
    }
    delete bisMap.finger;
  }
  // Split merged "trinket" → trinket1 (top) + trinket2 (alternative)
  if (bisMap.trinket && !bisMap.trinket1) {
    bisMap.trinket1 = bisMap.trinket;
    if (altMap.trinket) {
      bisMap.trinket2 = altMap.trinket;
      delete altMap.trinket;
    }
    delete bisMap.trinket;
  }

  // Build final display maps — all slots go into distributedBis/distributedAlt
  const distributedBis: Record<string, BisItem> = { ...bisMap };
  const distributedAlt: Record<string, BisItem> = { ...altMap };

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
        <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
          {t("bis.title")}
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
            {specs.map(s => <option key={s} value={s}>{t("spec." + s) || s}</option>)}
          </select>

          <div style={{
            fontSize: "10px",
            color: "var(--text-3)",
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.7,
          }}>
            {t("bis.daily")}
            {result?.generated_at && (
              <span style={{ marginLeft: "4px", color: "var(--text-3)" }}>
                · {new Date(result.generated_at).toLocaleDateString(locale === "en" ? "en-GB" : `${locale}-${locale.toUpperCase()}`, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
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
          <strong>{t("bis.error")}</strong> {error}
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
            {t("bis.loading", selectedSpec)}
          </div>
        </div>
      )}

      {/* ── Paper doll layout ── */}
      {result && !error && !loading && (
        <div style={{ padding: "20px" }}>

          {/* Three-column: left slots | character | right slots */}
          <div style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
            />

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "12px",
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

          {/* ── Enchants & Gems ── */}
          {result.enchants && Object.keys(result.enchants).length > 0 && (
            <div style={{
              marginTop: "16px",
              borderTop: "1px solid var(--border)",
              paddingTop: "16px",
            }}>
              <div style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {t("bis.enchants")}
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}>
                {Object.entries(result.enchants).map(([slot, ench]) => {
                  const slotLabel = SLOT_NAMES[slot] ?? SLOT_NAMES[slot.replace(/\d$/, "")] ?? slot;
                  const charSlot = slot === "finger" ? "finger1" : slot;
                  const charItem = characterGear[charSlot];
                  const hasEnchant = charItem && charItem.enchant === ench.enchant_id;
                  const enchData = ENCHANT_DATA[ench.enchant_id];
                  const enchantName = enchData?.name ?? `#${ench.enchant_id}`;
                  const prefix = wowheadPrefix ? `/${wowheadPrefix}` : "";
                  const enchUrl = enchData?.itemId
                    ? `https://www.wowhead.com${prefix}/item=${enchData.itemId}`
                    : enchData?.spellId
                    ? `https://www.wowhead.com${prefix}/spell=${enchData.spellId}`
                    : undefined;
                  return (
                    <div
                      key={slot}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        background: hasEnchant ? "rgba(62,202,114,0.08)" : "var(--surface-2)",
                        border: `1px solid ${hasEnchant ? "rgba(62,202,114,0.3)" : "var(--border)"}`,
                        borderRadius: "5px",
                        fontSize: "12px",
                      }}
                    >
                      <span style={{ color: "var(--text-3)", fontSize: "11px", minWidth: "50px" }}>
                        {slotLabel}
                      </span>
                      {enchUrl ? (
                        <a href={enchUrl} target="_blank" rel="noopener noreferrer"
                          data-wh-rename-link="false"
                          style={{ color: "var(--arcane)", fontWeight: 600, textDecoration: "none" }}>
                          {enchantName}
                        </a>
                      ) : (
                        <span style={{ color: "var(--arcane)", fontWeight: 600 }}>
                          {enchantName}
                        </span>
                      )}
                      <span style={{ color: "var(--text-3)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
                        {Math.min(Math.round(ench.frequency * 100), 100)}%
                      </span>
                      {hasEnchant && (
                        <span style={{ color: "var(--positive)", fontSize: "10px", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.gems && result.gems.length > 0 && (
            <div style={{
              marginTop: "14px",
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
            }}>
              <div style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {t("bis.gems")}
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}>
                {result.gems.map((gem) => {
                  const hasGem = Object.values(characterGear).some(
                    (item) => item?.gems?.includes(gem.gem_id)
                  );
                  const gemName = GEM_NAMES[gem.gem_id] ?? `Gem #${gem.gem_id}`;
                  const gemUrl = `https://www.wowhead.com${wowheadPrefix ? `/${wowheadPrefix}` : ""}/item=${gem.gem_id}`;
                  return (
                    <div
                      key={gem.gem_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: hasGem ? "rgba(62,202,114,0.08)" : "var(--surface-2)",
                        border: `1px solid ${hasGem ? "rgba(62,202,114,0.3)" : "var(--border)"}`,
                        borderRadius: "5px",
                        fontSize: "12px",
                      }}
                    >
                      <a href={gemUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                        {gemName}
                      </a>
                      <span style={{ color: "var(--text-3)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
                        {Math.min(Math.round(gem.frequency * 100), 100)}%
                      </span>
                      {hasGem && (
                        <span style={{ color: "var(--positive)", fontSize: "10px", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              {t("bis.empty.title")}
              <br />
              <span style={{ fontSize: "11px" }}>
                {t("bis.empty.insufficient", result.analyzed_count)}
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
          {t("bis.empty.prompt")}
          <br />
          <span style={{ fontSize: "11px" }}>
            {t("bis.empty.source")}
          </span>
        </div>
      )}
    </div>
  );
}
