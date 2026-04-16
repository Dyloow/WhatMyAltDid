"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.style.colorScheme = initial;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-2)",
        color: "var(--text-2)",
        borderRadius: "6px",
        padding: "5px 9px",
        fontSize: "13px",
        cursor: "pointer",
        lineHeight: 1,
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = "var(--gold)";
        e.currentTarget.style.color = "var(--gold)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = "var(--border-2)";
        e.currentTarget.style.color = "var(--text-2)";
      }}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
