// Client-credentials token (app-level, no user auth required)
// Used for static game data (items, journal, etc.)

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getClientCredentialsToken(region = "eu"): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 30_000) return cachedToken;

  const clientId = process.env.BATTLENET_CLIENT_ID;
  const clientSecret = process.env.BATTLENET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing BATTLENET_CLIENT_ID or BATTLENET_CLIENT_SECRET");
  }

  const tokenUrl =
    region === "cn"
      ? "https://oauth.battlenet.com.cn/token"
      : "https://oauth.battle.net/token";

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Blizzard client credentials token failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return cachedToken;
}
