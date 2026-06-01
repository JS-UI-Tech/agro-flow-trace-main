import Redis from "ioredis";
import { env } from "./env";

/**
 * Optional Redis client used as better-auth's secondary storage (sessions,
 * rate-limit counters, verification values). When REDIS_URL is unset the
 * app falls back to the primary database for these — so Redis is a
 * performance/scale layer, not a hard dependency.
 */
const globalForRedis = globalThis as typeof globalThis & { agrotraceRedis?: Redis | null };

export const redis: Redis | null =
  globalForRedis.agrotraceRedis ??
  (env.redisUrl
    ? new Redis(env.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      })
    : null);

if (redis && !globalForRedis.agrotraceRedis) {
  redis.on("error", (err) => {
    if (process.env.DEBUG_REDIS === "true") {
      console.warn("[redis] error:", err?.message);
    }
  });
  globalForRedis.agrotraceRedis = redis;
}

export async function redisHealthCheck(): Promise<"ok" | "down" | "disabled"> {
  if (!redis) return "disabled";
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? "ok" : "down";
  } catch {
    return "down";
  }
}

/** better-auth SecondaryStorage adapter backed by Redis. */
export const secondaryStorage = redis
  ? {
      async get(key: string) {
        return (await redis.get(key)) ?? null;
      },
      async set(key: string, value: string, ttl?: number) {
        if (ttl) await redis.set(key, value, "EX", ttl);
        else await redis.set(key, value);
      },
      async delete(key: string) {
        await redis.del(key);
      },
    }
  : undefined;
