import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

// Utiliser Redis local (ioredis) si disponible, sinon Upstash
let redis: any = null;

if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
  // Upstash Redis (production)
  redis = new Redis({ 
    url: process.env.REDIS_URL, 
    token: process.env.REDIS_TOKEN 
  });
} else {
  // Redis local (développement)
  try {
    redis = new IORedis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Ne pas retry, fail fast
      lazyConnect: true,
    });
    // Test de connexion
    redis.connect().catch(() => {
      redis = null;
      console.warn('[Cache] Redis local non disponible, cache désactivé');
    });
  } catch {
    redis = null;
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
        // ioredis retourne une string, Upstash retourne déjà parsé
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch {
      // Cache miss or error — fall through to fetcher
    }
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch {
      // Non-blocking cache write failure
    }
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    // ioredis supporte KEYS directement, Upstash aussi
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-blocking
  }
}
