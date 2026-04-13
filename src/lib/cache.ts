import { Redis } from "@upstash/redis";

const redis = process.env.REDIS_URL
  ? new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN ?? "" })
  : null;

export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) return cached;
    } catch {
      // Cache miss or error — fall through to fetcher
    }
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    } catch {
      // Non-blocking cache write failure
    }
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-blocking
  }
}
