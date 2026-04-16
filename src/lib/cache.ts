import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

let redis: any = null;

if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
  // Upstash Redis (production)
  redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
  });
} else {
  // Redis local (développement) — optionnel, désactivé si absent
  try {
    const client = new IORedis({
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    // Évite le crash Node.js si Redis n'est pas disponible
    client.on("error", () => {});
    client.connect().then(() => {
      redis = client;
    }).catch(() => {
      console.warn("[Cache] Redis local non disponible, cache désactivé");
    });
  } catch {
    // pas de Redis, on continue sans cache
  }
}

export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null && cached !== undefined) {
        return typeof cached === "string" ? JSON.parse(cached) : cached;
      }
    } catch {
      // Cache miss ou erreur — on continue
    }
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch {
      // Non-bloquant
    }
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-bloquant
  }
}
