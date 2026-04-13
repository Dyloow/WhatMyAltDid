"use client";

import { useEffect, useState } from "react";

function getNextReset(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilWed = (3 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilWed);
  next.setUTCHours(7, 0, 0, 0); // 09:00 CET = 07:00 UTC
  if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Reset maintenant !";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  parts.push(`${hours}h`);
  parts.push(`${minutes.toString().padStart(2, "0")}min`);
  return parts.join(" ");
}

export function CountdownTimer() {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const next = getNextReset();
      const ms = next.getTime() - Date.now();
      setRemaining(formatCountdown(ms));
      setUrgent(ms < 86400000); // < 24h = urgent
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "var(--surface-2)",
      border: `1px solid ${urgent ? "var(--warning)" : "var(--border)"}`,
      borderRadius: "6px",
      padding: "5px 12px",
      fontSize: "12px",
    }}>
      <span style={{ opacity: 0.7 }}>⏱</span>
      <span style={{ color: "var(--text-2)", fontSize: "11px" }}>Reset</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: "12px",
        color: urgent ? "var(--warning)" : "var(--gold)",
        letterSpacing: "0.02em",
      }}>
        {remaining}
      </span>
    </div>
  );
}
