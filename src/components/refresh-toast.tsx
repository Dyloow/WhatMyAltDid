"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function RefreshToast() {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === "reload") {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // performance API not available
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 200,
        maxWidth: "340px",
        background: "var(--surface)",
        border: "1px solid var(--border-2)",
        borderRadius: "10px",
        padding: "14px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        animation: "slideInRight 0.3s ease",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold)", marginBottom: "4px", fontFamily: "'Cinzel', serif" }}>
            {t("toast.refresh.title")}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.6 }}>
            {t("toast.refresh.hint")}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label={t("toast.refresh.dismiss")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-3)",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
            padding: "0 2px",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
