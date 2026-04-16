"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { CURRENT_SEASON } from "@/lib/season-config";
import { useI18n } from "@/lib/i18n";

const CLASS_SHOWCASE = [
  { cls: "warrior",     color: "#C69B3A" },
  { cls: "paladin",     color: "#F48CBA" },
  { cls: "mage",        color: "#3FC7EB" },
  { cls: "rogue",       color: "#FFF468" },
  { cls: "hunter",      color: "#AAD372" },
  { cls: "warlock",     color: "#8788EE" },
  { cls: "druid",       color: "#FF7C0A" },
  { cls: "demonhunter", color: "#A330C9" },
];

const FEATURES_KEYS = [
  { icon: "⚔", titleKey: "home.feature.mplus", descKey: "home.feature.mplus.desc" },
  { icon: "🏛", titleKey: "home.feature.vault", descKey: "home.feature.vault.desc" },
  { icon: "🎯", titleKey: "home.feature.bis",   descKey: "home.feature.bis.desc" },
];

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100dvh - 64px)" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border-2)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "calc(100dvh - 64px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      gap: "56px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Decorative class icons row */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        maxWidth: "900px",
        display: "flex",
        justifyContent: "space-between",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.04,
        padding: "0 20px",
      }}>
        {CLASS_SHOWCASE.map(({ cls }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cls}
            src={`/classes/${cls}.jpg`}
            alt=""
            width={64}
            height={64}
            style={{ borderRadius: "8px", filter: "grayscale(1)" }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="animate-slide-in-up" style={{ textAlign: "center", maxWidth: "520px", position: "relative", zIndex: 1 }}>
        {/* Season badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "var(--surface-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "20px",
          padding: "4px 12px",
          marginBottom: "24px",
          fontSize: "10px",
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--text-3)",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--positive)", boxShadow: "0 0 6px var(--positive)", display: "inline-block" }} />
          {CURRENT_SEASON.name}
        </div>

        {/* Logo */}
        <Image
          src="/logo.png"
          alt="WhatMyAltDid"
          width={500}
          height={300}
          className="animate-float"
          style={{ maxWidth: "360px", width: "100%", height: "auto", marginBottom: "12px", display: "block", marginLeft: "auto", marginRight: "auto" }}
          priority
        />

        <p style={{
          fontSize: "15px",
          color: "var(--text-2)",
          lineHeight: 1.6,
          margin: "0 0 32px",
        }}>
          {t("home.tagline")}<br />
          {t("home.subtitle")}
        </p>

        <button
          onClick={() => signIn("battlenet")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#0074e0",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "13px 32px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
            boxShadow: "0 4px 20px rgba(0,116,224,0.3)",
            letterSpacing: "0.02em",
          }}
          onMouseOver={e => {
            e.currentTarget.style.backgroundColor = "#005bb5";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,116,224,0.4)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.backgroundColor = "#0074e0";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,116,224,0.3)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm4.5 9.75h-3.75v3.75h-1.5V9.75H4.5v-1.5h3.75V4.5h1.5v3.75h3.75v1.5z"/>
          </svg>
          {t("auth.login")}
        </button>

        <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "12px" }}>
          {t("auth.security")}
        </p>
      </div>

      {/* Feature cards */}
      <div className="stagger-cards" style={{
        display: "flex",
        gap: "14px",
        flexWrap: "wrap" as const,
        justifyContent: "center",
        maxWidth: "780px",
        position: "relative",
        zIndex: 1,
      }}>
        {FEATURES_KEYS.map((f) => (
          <div
            key={f.titleKey}
            className="card-interactive"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "20px 22px",
              width: "220px",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "10px", fontFamily: "'Cinzel Decorative', serif" }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", marginBottom: "6px", fontFamily: "'Cinzel', serif", letterSpacing: "0.03em" }}>
              {t(f.titleKey)}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.6 }}>{t(f.descKey)}</div>
          </div>
        ))}
      </div>

      {/* Class icons decorative row (bottom) */}
      <div className="animate-slide-in-up" style={{ display: "flex", gap: "8px", opacity: 0.35, position: "relative", zIndex: 1, animationDelay: "0.3s" }}>
        {CLASS_SHOWCASE.slice(0, 6).map(({ cls, color }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cls}
            src={`/classes/${cls}.jpg`}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: "5px", border: `1px solid ${color}40` }}
          />
        ))}
      </div>
    </div>
  );
}
