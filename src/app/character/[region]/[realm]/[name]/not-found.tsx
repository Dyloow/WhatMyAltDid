import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100dvh - 52px)",
        gap: "12px",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", margin: 0 }}>
        Personnage introuvable
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-2)", margin: 0 }}>
        Ce personnage n&apos;existe pas ou n&apos;a pas de profil Raider.IO.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: "8px",
          padding: "8px 18px",
          background: "var(--accent)",
          color: "#000",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
