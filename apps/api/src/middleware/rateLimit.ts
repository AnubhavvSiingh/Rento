// Rate limiting middleware with Redis-backed counters and memory fallback.
import type { NextFunction, Request, Response } from "express";
import { createClient, type RedisClientType } from "redis";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
let redisClient: RedisClientType | null = null;
let redisReady = false;
let redisInitAttempted = false;
let redisErrorLogged = false;

export function rateLimit(maxRequests = 180, windowMs = 60_000, scope = "global") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
    const scopedKey = `${scope}:${key}`;

    try {
      const redis = getRedisClient();
      if (redis) {
        const result = await applyRedisLimit(redis, scopedKey, maxRequests, windowMs);
        applyRateLimitHeaders(res, maxRequests, result.count, result.resetAt);

        if (!result.allowed) {
          res.setHeader(
            "Retry-After",
            Math.ceil(Math.max(0, result.resetAt - Date.now()) / 1000)
          );
          res.status(429).json({ message: "Too many requests. Please try again shortly." });
          return;
        }

        next();
        return;
      }
    } catch (error) {
      if (!redisErrorLogged) {
        console.warn("Redis rate limiter unavailable, falling back to memory.", error);
        redisErrorLogged = true;
      }
    }

    applyInMemoryLimit(scopedKey, maxRequests, windowMs, res, next);
  };
}

function getRedisClient() {
  if (redisInitAttempted) {
    return redisReady ? redisClient : null;
  }

  redisInitAttempted = true;
  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    return null;
  }

  redisClient = createClient({ url: redisUrl });
  redisClient.on("ready", () => {
    redisReady = true;
  });
  redisClient.on("error", (error) => {
    redisReady = false;
    if (!redisErrorLogged) {
      console.warn("Redis rate limiter unavailable, falling back to memory.", error);
      redisErrorLogged = true;
    }
  });

  void redisClient.connect().catch((error) => {
    redisReady = false;
    if (!redisErrorLogged) {
      console.warn("Redis rate limiter unavailable, falling back to memory.", error);
      redisErrorLogged = true;
    }
  });

  return null;
}

function resolveRedisUrl() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (process.env.REDIS_HOST) {
    const port = process.env.REDIS_PORT ?? "6379";
    return `redis://${process.env.REDIS_HOST}:${port}`;
  }

  return null;
}

function getRateLimitPrefix() {
  return process.env.RATE_LIMIT_PREFIX ?? "rento:ratelimit";
}

async function applyRedisLimit(
  redis: RedisClientType,
  scopedKey: string,
  maxRequests: number,
  windowMs: number
) {
  const redisKey = `${getRateLimitPrefix()}:${scopedKey}`;
  const results = await redis.multi().incr(redisKey).pTTL(redisKey).exec();

  if (!results) {
    throw new Error("Redis rate limit transaction failed.");
  }

  const count = Number(results[0] ?? 0);
  let ttl = Number(results[1] ?? -1);

  if (!Number.isFinite(ttl) || ttl < 0) {
    await redis.pExpire(redisKey, windowMs);
    ttl = windowMs;
  }

  return {
    allowed: count <= maxRequests,
    count,
    resetAt: Date.now() + Math.max(0, ttl)
  };
}

function applyInMemoryLimit(
  scopedKey: string,
  maxRequests: number,
  windowMs: number,
  res: Response,
  next: NextFunction
) {
  const now = Date.now();
  const bucket = requestBuckets.get(scopedKey);

  if (!bucket || bucket.resetAt < now) {
    requestBuckets.set(scopedKey, { count: 1, resetAt: now + windowMs });
    applyRateLimitHeaders(res, maxRequests, 1, now + windowMs);
    next();
    return;
  }

  if (bucket.count >= maxRequests) {
    applyRateLimitHeaders(res, maxRequests, bucket.count, bucket.resetAt);
    res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    res.status(429).json({ message: "Too many requests. Please try again shortly." });
    return;
  }

  bucket.count += 1;
  applyRateLimitHeaders(res, maxRequests, bucket.count, bucket.resetAt);
  next();
}

function applyRateLimitHeaders(
  res: Response,
  maxRequests: number,
  count: number,
  resetAt: number
) {
  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
}
