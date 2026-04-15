"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Props {
  name: string;
  realm: string;
  region: string;
}

export function CharacterNotIndexed({ name, realm, region }: Props) {
  const rioUrl = `https://raider.io/characters/${region}/${realm}/${encodeURIComponent(name)}`;
  const { t } = useI18n();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100dvh - 52px)",
      gap: "14px",
      padding: "40px",
    }}>
      <div style={{ fontSize: "32px", opacity: 0.3, color: "var(--gold)", fontFamily: "'Cinzel Decorative', serif" }}>⚔</div>

      <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text)", fontFamily: "'Cinzel', serif" }}>
        {name}
      </h1>

      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-2)", textAlign: "center", maxWidth: "380px", lineHeight: 1.6 }}>
        {t("char.notindexed.title")}
        {" "}
        {t("char.notindexed.desc")}
      </p>

      <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" as const, justifyContent: "center" }}>
        <a
          href={rioUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 16px",
            background: "var(--surface-2)",
            color: "var(--arcane)",
            border: "1px solid var(--border-2)",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
        >
          {t("char.notindexed.rio")}
        </a>
        <Link
          href="/dashboard"
          style={{
            padding: "8px 16px",
            background: "var(--gold)",
            color: "#07090f",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t("char.notindexed.back")}
        </Link>
      </div>
    </div>
  );
}
