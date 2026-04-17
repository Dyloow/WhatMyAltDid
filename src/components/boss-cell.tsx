"use client";

import { BossKill } from "@/types/character";
import { useI18n } from "@/lib/i18n";

interface BossCellProps {
  bossName: string;
  kills: BossKill[];
}

const DIFFICULTIES = [
  { key: "normal"  as const, color: "#3b82f6", label: "N" },
  { key: "heroic"  as const, color: "#a855f7", label: "H" },
  { key: "mythic"  as const, color: "#f97316", label: "M" },
];

export function BossCell({ bossName, kills }: BossCellProps) {
  const { t } = useI18n();

  // Match kills by boss name (real Blizzard IDs ≠ season config placeholder IDs)
  const killMap = new Map<BossKill["difficulty"], BossKill>();
  for (const k of kills) {
    if (k.bossName === bossName) killMap.set(k.difficulty, k);
  }

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
      {DIFFICULTIES.map(({ key, color, label }) => {
        const kill = killMap.get(key);
        const done = !!kill;

        const titleParts = [bossName, `(${label})`];
        if (done) {
          const d = new Date(kill.killedAt);
          titleParts.push(`— ${t("hunt.killed")} ${d.toLocaleDateString()}`);
        } else {
          titleParts.push(`— ${t("hunt.not_killed")}`);
        }

        return (
          <div
            key={key}
            title={titleParts.join(" ")}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: `2px solid ${color}`,
              backgroundColor: done ? color : "transparent",
              transition: "background-color 0.15s",
              flexShrink: 0,
              cursor: "default",
            }}
          />
        );
      })}
    </div>
  );
}
