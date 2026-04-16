"use client";

import { useState, useEffect, useRef } from "react";
import { useRosterStore } from "@/lib/store";
import { CharacterData } from "@/types/character";
import { useI18n } from "@/lib/i18n";

const EU_REALMS = [
  "Archimonde", "Elune", "Hyjal", "Kael'thas", "Ysondre",
  "Dalaran", "Khaz Modan", "Uldaman", "Illidan", "Sulfuron",
  "Cho'gall", "Sargeras", "Garona", "Sylvanas", "Medivh",
  "Stormrage", "Outland", "Twisting Nether", "Ravencrest", "Draenor",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddCharacterModal({ open, onClose }: Props) {
  const { addCharacter } = useRosterStore();
  const { t } = useI18n();
  const [region, setRegion] = useState("eu");
  const [realm, setRealm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CharacterData | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!realm.trim() || !name.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/character/lookup?region=${encodeURIComponent(region)}&realm=${encodeURIComponent(realm.trim().toLowerCase().replace(/\s+/g, "-").replace(/'/g, ""))}&name=${encodeURIComponent(name.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("modal.error.notfound"));
      } else {
        setSuccess(data as CharacterData);
        addCharacter(data as CharacterData);
      }
    } catch {
      setError(t("modal.error.network"));
    } finally {
      setLoading(false);
    }
  }

  function handleAddAnother() {
    setSuccess(null);
    setName("");
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(7,9,15,0.75)",
          backdropFilter: "blur(4px)",
          animation: "fade-in 0.15s ease both",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed", zIndex: 101,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(440px, 92vw)",
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          borderRadius: "10px",
          overflow: "hidden",
          animation: "fade-in 0.15s ease both",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {t("modal.title")}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginTop: "2px", fontFamily: "'Cinzel', serif" }}>
              {t("modal.subtitle")}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1 }}
            aria-label={t("modal.close")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>✓</div>
              <div style={{ fontWeight: 700, color: "var(--positive)", fontFamily: "'Cinzel', serif", fontSize: "15px", marginBottom: "4px" }}>
                {success.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "16px" }}>
                {t("class." + success.className) || success.className} · {t("spec." + success.specName) || success.specName} · {success.realm}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "20px" }}>
                {t("modal.success")}
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button onClick={handleAddAnother} style={btnSecondary}>
                  {t("modal.addAnother")}
                </button>
                <button onClick={onClose} style={btnPrimary}>
                  {t("modal.done")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Region */}
              <div>
                <label style={labelStyle}>{t("modal.region")}</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["eu", "us", "kr", "tw"].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "5px",
                        border: `1px solid ${region === r ? "var(--gold)" : "var(--border-2)"}`,
                        background: region === r ? "var(--gold-dim)" : "var(--surface-2)",
                        color: region === r ? "var(--gold)" : "var(--text-2)",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        transition: "all 0.1s",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Realm */}
              <div>
                <label style={labelStyle}>{t("modal.realm")}</label>
                <input
                  type="text"
                  value={realm}
                  onChange={e => setRealm(e.target.value)}
                  placeholder={t("modal.realm.placeholder")}
                  list="realm-list"
                  disabled={loading}
                  style={inputStyle}
                />
                <datalist id="realm-list">
                  {EU_REALMS.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>{t("modal.name")}</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t("modal.name.placeholder")}
                  disabled={loading}
                  style={inputStyle}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {error && (
                <div style={{ padding: "10px 12px", background: "var(--negative-dim)", border: "1px solid rgba(232,80,80,0.2)", borderRadius: "6px", fontSize: "12px", color: "var(--negative)", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !realm.trim() || !name.trim()}
                style={{
                  ...btnPrimary,
                  opacity: (!realm.trim() || !name.trim()) ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                }}
              >
                {loading && (
                  <span style={{ width: "11px", height: "11px", borderRadius: "50%", border: "2px solid #07090f", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                )}
                {loading ? t("modal.searching") : t("modal.search")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px",
  fontFamily: "'JetBrains Mono', monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px",
  background: "var(--surface-2)", border: "1px solid var(--border-2)",
  borderRadius: "6px", color: "var(--text)", fontSize: "13px",
  outline: "none", transition: "border-color 0.15s",
  fontFamily: "'DM Sans', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px",
  background: "var(--gold)", color: "#07090f",
  border: "none", borderRadius: "6px",
  fontSize: "12px", fontWeight: 700,
  cursor: "pointer", letterSpacing: "0.05em",
  textTransform: "uppercase",
  transition: "opacity 0.15s",
  width: "100%",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 18px",
  background: "var(--surface-3)", color: "var(--text-2)",
  border: "1px solid var(--border-2)", borderRadius: "6px",
  fontSize: "12px", fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};
