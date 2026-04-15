"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100dvh - 52px)",
        gap: "12px",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
        {t("char.notfound.title")}
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-2)", margin: 0 }}>
        {t("char.notfound.desc")}
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: "8px",
          padding: "8px 18px",
          background: "var(--accent)",
          color: "#000",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {t("char.notfound.back")}
      </Link>
    </div>
  );
}
