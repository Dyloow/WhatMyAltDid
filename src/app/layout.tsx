import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatMyAltDid — WoW Alt Tracker",
  description: "Suivez la progression de tous vos alts WoW : M+, Grande Chambre, Raids.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `var whTooltips = { colorLinks: false, iconizeLinks: false, renameLinks: false };`,
          }}
        />
        <script src="https://wow.zamimg.com/js/tooltips.js" async />
      </head>
      <body suppressHydrationWarning style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Providers>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
