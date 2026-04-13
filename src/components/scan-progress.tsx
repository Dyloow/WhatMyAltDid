"use client";

import { useRosterStore } from "@/lib/store";

export function ScanProgress() {
  const { isScanning, lastScanAt, error, characters, scan } = useRosterStore();

  const timeSince = lastScanAt
    ? Math.round((Date.now() - new Date(lastScanAt).getTime()) / 60000)
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button
        onClick={scan}
        disabled={isScanning}
        style={{
          backgroundColor: isScanning ? "var(--surface-3)" : "var(--gold)",
          color: isScanning ? "var(--text-3)" : "#07090f",
          border: isScanning ? "1px solid var(--border-2)" : "none",
          borderRadius: "6px",
          padding: "5px 14px",
          fontSize: "11px",
          fontWeight: 700,
          cursor: isScanning ? "not-allowed" : "pointer",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {isScanning && (
          <span style={{
            width: "10px", height: "10px",
            borderRadius: "50%",
            border: "2px solid var(--text-3)",
            borderTopColor: "var(--text-2)",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }} />
        )}
        {isScanning ? "Scan…" : "↻ Scanner"}
      </button>

      {!isScanning && lastScanAt && (
        <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
          {characters.length} perso{characters.length > 1 ? "s" : ""} · il y a {timeSince ?? "?"} min
        </span>
      )}

      {error && (
        <span style={{ fontSize: "11px", color: "var(--negative)" }}>{error}</span>
      )}
    </div>
  );
}
