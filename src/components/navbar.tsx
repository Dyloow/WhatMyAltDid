"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n";
import { useRosterStore } from "@/lib/store";
import { useEffect } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const { isGuest, setGuest, clearCharacters } = useRosterStore();

  // Sync guest state from cookie on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasGuestCookie = document.cookie.includes("guest-mode=1");
      if (hasGuestCookie && status === "unauthenticated") {
        setGuest(true);
      } else if (status === "authenticated") {
        setGuest(false);
      }
    }
  }, [status, setGuest]);

  function handleLogout() {
    document.cookie = "guest-mode=; path=/; max-age=0";
    setGuest(false);
    clearCharacters();
    signOut({ callbackUrl: "/" });
  }

  function handleGuestExit() {
    document.cookie = "guest-mode=; path=/; max-age=0";
    setGuest(false);
    clearCharacters();
    window.location.href = "/";
  }

  return (
    <header className="animate-slide-in-down" style={{
      backgroundColor: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      backdropFilter: "blur(8px)",
    }}>
      <div className="navbar-inner" style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>

        <Link href="/" className="hover-scale" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <div className="navbar-logo-wrap" style={{ display: "flex", alignItems: "center", marginLeft: "clamp(-40px, -5vw, -100px)", pointerEvents: "none" }}>
            <Image
              src="/logo_header.png"
              alt="WhatMyAltDid"
              width={500}
              height={150}
              style={{ height: "clamp(48px, 6vw, 80px)", width: "auto", objectFit: "contain", display: "block" }}
              priority
            />
          </div>
          <span className="navbar-season" style={{
            fontSize: "10px",
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--text-3)",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
          }}>
            {t("nav.season")}
          </span>
        </Link>

        <div className="navbar-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSelector />
          <ThemeToggle />

          {status === "loading" && (
            <div style={{
              width: "100px", height: "34px",
              borderRadius: "6px",
              backgroundColor: "var(--surface-2)",
              animation: "pulse-soft 1.5s ease-in-out infinite",
            }} />
          )}

          {status === "authenticated" && session && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="navbar-username" style={{
                fontSize: "13px",
                color: "var(--text-2)",
                fontFamily: "'JetBrains Mono', monospace",
                maxWidth: "180px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}>
                {session.user?.name}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-2)",
                  color: "var(--text-2)",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--negative)";
                  e.currentTarget.style.color = "var(--negative)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-2)";
                  e.currentTarget.style.color = "var(--text-2)";
                }}
              >
                {t("nav.disconnect")}
              </button>
            </div>
          )}

          {status === "unauthenticated" && isGuest && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-3)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "3px 8px",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>
                {t("auth.guest_badge")}
              </span>
              <button
                onClick={handleGuestExit}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-2)",
                  color: "var(--text-2)",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
              >
                {t("auth.create_account")}
              </button>
            </div>
          )}

          {status === "unauthenticated" && !isGuest && (
            <button
              onClick={() => signIn("battlenet")}
              style={{
                backgroundColor: "#0074e0",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#005bb5")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0074e0")}
            >
              {t("auth.loginShort")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
