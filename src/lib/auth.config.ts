/**
 * Lightweight auth config — safe for Edge runtime (middleware).
 * No Prisma, no Node.js-only imports.
 */
import type { NextAuthConfig } from "next-auth";

const envRegion = process.env.BATTLENET_REGION ?? "eu";

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

const urls = getAuthUrls(envRegion);

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
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
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  trustHost: true,
};
