"use client";

import { RioBestRun } from "@/lib/raiderio-api";
import { useI18n } from "@/lib/i18n";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function keyColor(level: number, timed: boolean): { bg: string; text: string; border: string } {
  if (!timed) return { bg: "rgba(232,80,80,0.1)", text: "#e85050", border: "rgba(232,80,80,0.3)" };
  if (level >= 15) return { bg: "rgba(255,128,0,0.15)", text: "#ff8000", border: "rgba(255,128,0,0.4)" };
  if (level >= 10) return { bg: "rgba(163,53,238,0.15)", text: "#a335ee", border: "rgba(163,53,238,0.4)" };
  if (level >= 7)  return { bg: "rgba(77,150,245,0.15)", text: "#4d96f5", border: "rgba(77,150,245,0.4)" };
  if (level >= 4)  return { bg: "rgba(62,202,114,0.12)", text: "#3eca72", border: "rgba(62,202,114,0.3)" };
  return { bg: "rgba(107,116,148,0.1)", text: "#6b7494", border: "rgba(107,116,148,0.25)" };
}

interface KeystoneCellProps {
  run?: RioBestRun;
  isWeekly?: boolean;
}

export function KeystoneCell({ run, isWeekly }: KeystoneCellProps) {
  const { t } = useI18n();

  if (!run) {
    return (
      <td style={{ padding: "6px 4px", textAlign: "center" }}>
        <span style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>—</span>
      </td>
    );
  }

  const timed = run.num_keystone_upgrades > 0;
  const colors = keyColor(run.mythic_level, timed);
  const upgrade = run.num_keystone_upgrades >= 3 ? "+++" : run.num_keystone_upgrades === 2 ? "++" : run.num_keystone_upgrades === 1 ? "+" : "";
  const title = [
    `${run.dungeon}`,
    `+${run.mythic_level} ${timed ? "✓" : "✗"}`,
    `${fmt(run.clear_time_ms)} / ${fmt(run.par_time_ms)}`,
    timed ? `+${upgrade} ${t("key.timed")}` : t("key.overtimed"),
  ].join("\n");

  return (
    <td style={{ padding: "6px 4px", textAlign: "center" }}>
      <span
        title={title}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "1px",
          padding: "3px 7px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 700,
          backgroundColor: isWeekly ? colors.bg : "transparent",
          color: colors.text,
          border: `1px solid ${isWeekly ? colors.border : "transparent"}`,
          cursor: "default",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "-0.02em",
          transition: "background 0.1s",
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.borderColor = colors.border; }}
        onMouseOut={e => {
          e.currentTarget.style.backgroundColor = isWeekly ? colors.bg : "transparent";
          e.currentTarget.style.borderColor = isWeekly ? colors.border : "transparent";
        }}
      >
        +{run.mythic_level}
        {timed && upgrade && <span style={{ fontSize: "9px", marginLeft: "1px", opacity: 0.8 }}>{upgrade}</span>}
      </span>
    </td>
  );
}
