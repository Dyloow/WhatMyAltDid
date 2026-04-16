"use client";

import { RioAffix } from "@/lib/raiderio-api";
import { useI18n } from "@/lib/i18n";

export function AffixBar({ affixes }: { affixes: RioAffix[] }) {
  const { wowheadPrefix } = useI18n();
  if (affixes.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" as const }}>
      <span style={{
        color: "var(--text-3)",
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Affixes
      </span>
      {affixes.map((a) => {
        const prefix = wowheadPrefix ? `/${wowheadPrefix}` : "";
        const whUrl = `https://www.wowhead.com${prefix}/affix=${a.id}`;
        return (
          <a
            key={a.id}
            href={whUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-wh-rename-link="false"
            data-wh-icon-size="small"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "5px",
              padding: "3px 8px 3px 4px",
              fontSize: "11px",
              color: "var(--text-2)",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
              textDecoration: "none",
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-2)";
            }}
          >
            {a.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.icon_url || `https://wow.zamimg.com/images/wow/icons/small/${a.icon}.jpg`}
                alt={a.name}
                width={16}
                height={16}
                style={{ borderRadius: "3px", flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            {a.name}
          </a>
        );
      })}
    </div>
  );
}
