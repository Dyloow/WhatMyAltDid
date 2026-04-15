import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    region?: string;
  }
}

const region = process.env.BATTLENET_REGION ?? "eu";

function getAuthUrls(reg: string) {
  if (reg === "cn") {
    return {
      authorization: "https://oauth.battlenet.com.cn/authorize",
      token: "https://oauth.battlenet.com.cn/token",
      userinfo: "https://gateway.battlenet.com.cn/oauth/userinfo",
    };
  }
  return {
    authorization: "https://oauth.battle.net/authorize",
    token: "https://oauth.battle.net/token",
    userinfo: `https://${reg}.battle.net/oauth/userinfo`,
  };
}

const urls = getAuthUrls(region);

async function refreshBlizzardToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const res = await fetch(urls.token, {
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

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: "battlenet",
      name: "Battle.net",
      type: "oauth",
      authorization: {
        url: urls.authorization,
        params: {
          scope: "wow.profile",
          redirect_uri: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/bnet/callback`,
        },
      },
      token: {
        url: urls.token,
        params: {
          redirect_uri: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/bnet/callback`,
        },
      },
      userinfo: urls.userinfo,
      clientId: process.env.BATTLENET_CLIENT_ID,
      clientSecret: process.env.BATTLENET_CLIENT_SECRET,
      checks: ["state"],
      profile(profile: Record<string, unknown>) {
        return {
          id: String(profile.id ?? profile.sub),
          name: String(profile.battle_tag ?? profile.battletag ?? profile.sub ?? "Unknown"),
          email: null,
          image: null,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token as string | undefined;
        token.refreshToken = account.refresh_token as string | undefined;
        token.expiresAt = account.expires_at;
        token.region = region;
        return token;
      }

      // Refresh the access token if it's expired
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && expiresAt * 1000 < Date.now() && token.refreshToken) {
        try {
          const refreshed = await refreshBlizzardToken(token.refreshToken as string);
          token.accessToken = refreshed.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          if (refreshed.refresh_token) {
            token.refreshToken = refreshed.refresh_token;
          }
        } catch {
          // Refresh failed — token stays stale, user may need to re-login
          console.warn("[Auth] Token refresh failed, user may need to re-authenticate");
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.region = token.region as string | undefined;
      if (token.battletag) {
        session.user.name = token.battletag as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
