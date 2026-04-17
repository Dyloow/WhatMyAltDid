import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    region?: string;
    userId?: string;
  }
}

const envRegion = process.env.BATTLENET_REGION ?? "eu";

function getTokenUrl(reg: string): string {
  if (reg === "cn") return "https://oauth.battlenet.com.cn/token";
  return "https://oauth.battle.net/token";
}

async function refreshBlizzardToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const res = await fetch(getTokenUrl(envRegion), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.BATTLENET_CLIENT_ID ?? "",
      client_secret: process.env.BATTLENET_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email ?? undefined,
            name: user.username ?? user.battletag ?? user.email ?? "Utilisateur",
          };
        } catch {
          return null;
        }
      },
    }),
    // Battle.net provider comes from authConfig.providers
    ...authConfig.providers,
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "battlenet") {
        const battlenetId = String(profile?.id ?? profile?.sub ?? account.providerAccountId);
        const battletag = String(profile?.name ?? user.name ?? "");

        try {
          const existing = await prisma.user.findUnique({ where: { battlenetId } });
          if (existing) {
            user.id = existing.id;
            user.name = existing.battletag ?? battletag;
            await prisma.user.update({
              where: { id: existing.id },
              data: { lastLogin: new Date(), battletag },
            });
          } else {
            const newUser = await prisma.user.create({
              data: { battlenetId, battletag, region: envRegion },
            });
            user.id = newUser.id;
            user.name = battletag;
          }
        } catch (err) {
          console.error("[Auth] Battle.net signIn DB error:", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user?.id) token.userId = user.id;
      if (account?.provider === "battlenet") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.region = envRegion;
      }

      // Auto-refresh Blizzard access token when expired
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && expiresAt * 1000 < Date.now() && token.refreshToken) {
        try {
          const refreshed = await refreshBlizzardToken(token.refreshToken as string);
          token.accessToken = refreshed.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          if (refreshed.refresh_token) token.refreshToken = refreshed.refresh_token;
        } catch {
          console.warn("[Auth] Token refresh failed, user may need to re-authenticate");
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.userId = token.userId as string;
      session.accessToken = token.accessToken as string | undefined;
      session.region = (token.region as string | undefined) ?? envRegion;
      if (token.battletag) session.user.name = token.battletag as string;
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  trustHost: true,
});
