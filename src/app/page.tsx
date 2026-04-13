"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CURRENT_SEASON } from "@/lib/season-config";

const CLASS_SHOWCASE = [
  { cls: "warrior",     color: "#C69B3A", name: "Guerrier" },
  { cls: "paladin",     color: "#F48CBA", name: "Paladin" },
  { cls: "mage",        color: "#3FC7EB", name: "Mage" },
  { cls: "rogue",       color: "#FFF468", name: "Voleur" },
  { cls: "hunter",      color: "#AAD372", name: "Chasseur" },
  { cls: "warlock",     color: "#8788EE", name: "Démoniste" },
  { cls: "druid",       color: "#FF7C0A", name: "Druide" },
  { cls: "demonhunter", color: "#A330C9", name: "Chasseur" },
];

const FEATURES = [
  {
    icon: "⚔",
    title: "Tableau M+",
    desc: "Tous vos runs de la semaine par donjon, en un coup d'œil.",
  },
  {
    icon: "🏛",
    title: "Grande Chambre",
    desc: "Slots vault, ilvl projeté, et checklist de ce qu'il reste à faire.",
  },
  {
    icon: "🎯",
    title: "Analyse BiS",
    desc: "Items prioritaires à farmer basés sur les meilleurs joueurs.",
  },
];

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100dvh - 54px)" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border-2)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "calc(100dvh - 54px)",
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
      <div style={{ textAlign: "center", maxWidth: "520px", position: "relative", zIndex: 1 }}>
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

        {/* Title */}
        <h1 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: "clamp(28px, 6vw, 44px)",
          fontWeight: 900,
          color: "var(--gold)",
          letterSpacing: "0.02em",
          margin: "0 0 12px",
          lineHeight: 1.1,
          textShadow: "0 0 40px rgba(201,168,76,0.3)",
        }}>
          WhatMyAltDid
        </h1>

        <p style={{
          fontSize: "15px",
          color: "var(--text-2)",
          lineHeight: 1.6,
          margin: "0 0 32px",
        }}>
          Votre dashboard multi-alts WoW.<br />
          Scannez tous vos personnages et voyez en un instant ce qu'ils ont fait — ou pas — cette semaine.
        </p>

        <button
          onClick={() => signIn("battlenet")}
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
          Se connecter avec Battle.net
        </button>

        <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "12px" }}>
          OAuth2 sécurisé · Lecture seule · Aucun mot de passe stocké
        </p>
      </div>

      {/* Feature cards */}
      <div style={{
        display: "flex",
        gap: "14px",
        flexWrap: "wrap" as const,
        justifyContent: "center",
        maxWidth: "780px",
        position: "relative",
        zIndex: 1,
      }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="animate-fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "20px 22px",
              width: "220px",
              animationDelay: `${i * 80}ms`,
              transition: "border-color 0.2s, transform 0.2s",
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-2)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "10px", fontFamily: "'Cinzel Decorative', serif" }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)", marginBottom: "6px", fontFamily: "'Cinzel', serif", letterSpacing: "0.03em" }}>
              {f.title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Class icons decorative row (bottom) */}
      <div style={{ display: "flex", gap: "8px", opacity: 0.35, position: "relative", zIndex: 1 }}>
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
