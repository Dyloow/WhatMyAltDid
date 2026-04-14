"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="animate-slide-in-down" style={{
      backgroundColor: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 20px",
        height: "54px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>

        <Link href="/" className="hover-scale" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <span style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: "14px",
            fontWeight: 900,
            color: "var(--gold)",
            letterSpacing: "0.03em",
            lineHeight: 1,
            textShadow: "0 0 20px var(--gold-glow)",
          }}>
            WhatMyAltDid
          </span>
          <span style={{
            fontSize: "9px",
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--text-3)",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
          }}>
            Midnight S1
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemeToggle />

          {status === "loading" && (
            <div style={{
              width: "88px", height: "28px",
              borderRadius: "5px",
              backgroundColor: "var(--surface-2)",
              animation: "pulse-soft 1.5s ease-in-out infinite",
            }} />
          )}

          {status === "authenticated" && session && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                fontSize: "11px",
                color: "var(--text-2)",
                fontFamily: "'JetBrains Mono', monospace",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}>
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-2)",
                  color: "var(--text-2)",
                  borderRadius: "5px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = "var(--negative)";
                  e.currentTarget.style.color = "var(--negative)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = "var(--border-2)";
                  e.currentTarget.style.color = "var(--text-2)";
                }}
              >
                Déco
              </button>
            </div>
          )}

          {status === "unauthenticated" && (
            <button
              onClick={() => signIn("battlenet")}
              style={{
                backgroundColor: "#0074e0",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "5px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = "#005bb5")}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = "#0074e0")}
            >
              Battle.net
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
