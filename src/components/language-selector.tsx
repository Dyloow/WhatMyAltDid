"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n, LOCALES } from "@/lib/i18n";

export function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "transparent",
          border: "1px solid var(--border-2)",
          borderRadius: "5px",
          padding: "3px 8px",
          cursor: "pointer",
          fontSize: "14px",
          lineHeight: 1,
          color: "var(--text-2)",
          transition: "border-color 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
        onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
      >
        <span>{current.flag}</span>
        <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {current.code}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
            zIndex: 100,
            minWidth: "140px",
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "8px 12px",
                background: l.code === locale ? "var(--surface-2)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: l.code === locale ? "var(--gold)" : "var(--text-2)",
                fontWeight: l.code === locale ? 700 : 400,
                transition: "background 0.1s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
              onMouseOut={(e) => {
                if (l.code !== locale) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span style={{ fontSize: "16px" }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
