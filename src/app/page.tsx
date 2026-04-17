"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CURRENT_SEASON } from "@/lib/season-config";
import { useI18n } from "@/lib/i18n";
import { useRosterStore } from "@/lib/store";

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

type AuthTab = "login" | "register";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useI18n();

  const { clearCharacters, setTrackedUserId, setGuest } = useRosterStore();
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setFormLoading(false);
    if (result?.error) {
      setFormError(t("auth.error.invalid_credentials"));
    } else {
      router.replace("/dashboard");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username: username || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? t("auth.error.generic"));
      } else {
        setRegisterSuccess(true);
        // Auto-login after registration
        const loginResult = await signIn("credentials", { email, password, redirect: false });
        if (!loginResult?.error) router.replace("/dashboard");
      }
    } catch {
      setFormError(t("auth.error.generic"));
    } finally {
      setFormLoading(false);
    }
  }

  async function handleGuestMode() {
    clearCharacters();
    setTrackedUserId("guest");
    setGuest(true);
    router.push("/api/auth/guest");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface-2)",
    border: "1px solid var(--border-2)",
    borderRadius: "6px",
    color: "var(--text)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  };

  return (
    <div className="home-wrap" style={{
      minHeight: "calc(100dvh - 64px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      gap: "48px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Decorative class icons */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", width: "100%", maxWidth: "900px",
        display: "flex", justifyContent: "space-between",
        pointerEvents: "none", zIndex: 0, opacity: 0.04, padding: "0 20px",
      }}>
        {CLASS_SHOWCASE.map(({ cls }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cls} src={`/classes/${cls}.jpg`} alt="" width={64} height={64}
            style={{ borderRadius: "8px", filter: "grayscale(1)" }} />
        ))}
      </div>

      {/* Hero */}
      <div className="animate-slide-in-up home-hero" style={{ textAlign: "center", maxWidth: "480px", position: "relative", zIndex: 1 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "var(--surface-2)", border: "1px solid var(--border-2)",
          borderRadius: "20px", padding: "4px 12px", marginBottom: "20px",
          fontSize: "10px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
          color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--positive)", boxShadow: "0 0 6px var(--positive)", display: "inline-block" }} />
          {CURRENT_SEASON.name}
        </div>

        <Image
          src="/logo.png" alt="WhatMyAltDid" width={500} height={300}
          className="animate-float home-hero-logo"
          style={{ maxWidth: "320px", width: "100%", height: "auto", marginBottom: "8px", display: "block", marginLeft: "auto", marginRight: "auto" }}
          priority
        />

        <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 28px" }}>
          {t("home.tagline")}
        </p>
      </div>

      {/* Auth card */}
      <div className="animate-slide-in-up" style={{
        position: "relative", zIndex: 1,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "28px 32px",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        animationDelay: "0.1s",
      }}>

        {/* Tabs: login / register */}
        <div style={{ display: "flex", marginBottom: "24px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)" }}>
          {(["login", "register"] as AuthTab[]).map((t2) => (
            <button
              key={t2}
              onClick={() => { setTab(t2); setFormError(null); }}
              style={{
                flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600,
                background: tab === t2 ? "var(--surface-3)" : "transparent",
                color: tab === t2 ? "var(--gold)" : "var(--text-2)",
                border: "none", borderRight: t2 === "login" ? "1px solid var(--border)" : "none",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em", textTransform: "uppercase" as const,
              }}
            >
              {t2 === "login" ? t("auth.login_tab") : t("auth.register_tab")}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: "5px" }}>
                {t("auth.email")}
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: "5px" }}>
                {t("auth.password")}
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>

            {formError && (
              <div style={{ fontSize: "12px", color: "var(--negative)", padding: "8px 10px", background: "var(--negative-dim)", borderRadius: "5px" }}>
                {formError}
              </div>
            )}

            <button type="submit" disabled={formLoading} style={{
              backgroundColor: "var(--gold)", color: "#07090f", border: "none",
              borderRadius: "6px", padding: "11px", fontSize: "13px", fontWeight: 700,
              cursor: formLoading ? "not-allowed" : "pointer", transition: "opacity 0.15s",
              opacity: formLoading ? 0.7 : 1, letterSpacing: "0.04em", textTransform: "uppercase" as const,
            }}>
              {formLoading ? t("auth.loading") : t("auth.login_submit")}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: "5px" }}>
                {t("auth.email")}
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: "5px" }}>
                {t("auth.username")} <span style={{ fontWeight: 400, color: "var(--text-3)", textTransform: "none" }}>({t("auth.optional")})</span>
              </label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.username_placeholder")} style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: "5px" }}>
                {t("auth.password")} <span style={{ fontWeight: 400, color: "var(--text-3)", textTransform: "none" }}>({t("auth.password_min")})</span>
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8} style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>

            {formError && (
              <div style={{ fontSize: "12px", color: "var(--negative)", padding: "8px 10px", background: "var(--negative-dim)", borderRadius: "5px" }}>
                {formError}
              </div>
            )}
            {registerSuccess && (
              <div style={{ fontSize: "12px", color: "var(--positive)", padding: "8px 10px", background: "rgba(34,197,94,0.1)", borderRadius: "5px" }}>
                {t("auth.register_success")}
              </div>
            )}

            <button type="submit" disabled={formLoading} style={{
              backgroundColor: "var(--gold)", color: "#07090f", border: "none",
              borderRadius: "6px", padding: "11px", fontSize: "13px", fontWeight: 700,
              cursor: formLoading ? "not-allowed" : "pointer", transition: "opacity 0.15s",
              opacity: formLoading ? 0.7 : 1, letterSpacing: "0.04em", textTransform: "uppercase" as const,
            }}>
              {formLoading ? t("auth.loading") : t("auth.register_submit")}
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.08em" }}>OU</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Battle.net SSO */}
        <button
          onClick={() => signIn("battlenet")}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            backgroundColor: "#0074e0", color: "#fff", border: "none", borderRadius: "6px",
            padding: "11px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
            transition: "background 0.15s", marginBottom: "10px",
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#005bb5")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0074e0")}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
            <path d="M9 0C4.03 0 0 4.03 0 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm4.5 9.75h-3.75v3.75h-1.5V9.75H4.5v-1.5h3.75V4.5h1.5v3.75h3.75v1.5z"/>
          </svg>
          {t("auth.bnet_login")}
        </button>

        {/* Guest mode */}
        <button
          onClick={handleGuestMode}
          style={{
            width: "100%", padding: "9px", fontSize: "12px", fontWeight: 600,
            background: "transparent", color: "var(--text-3)",
            border: "1px solid var(--border)", borderRadius: "6px",
            cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border-2)"; }}
          onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          {t("auth.guest_mode")}
        </button>

        <p style={{ fontSize: "10px", color: "var(--text-3)", textAlign: "center" as const, marginTop: "14px", lineHeight: 1.5 }}>
          {t("auth.security")}
        </p>
      </div>

      {/* Class icons decorative row (bottom) */}
      <div className="animate-slide-in-up home-class-row" style={{ display: "flex", gap: "8px", opacity: 0.35, position: "relative", zIndex: 1, animationDelay: "0.3s" }}>
        {CLASS_SHOWCASE.slice(0, 6).map(({ cls, color }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cls} src={`/classes/${cls}.jpg`} alt="" width={28} height={28}
            style={{ borderRadius: "5px", border: `1px solid ${color}40` }} />
        ))}
      </div>
    </div>
  );
}
