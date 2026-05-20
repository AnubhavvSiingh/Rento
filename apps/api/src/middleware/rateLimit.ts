import type { NextFunction, Request, Response } from "express";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests = 180, windowMs = 60_000, scope = "global") {
  return (req: Request, res: Response, next: NextFunction) => {
    const key =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
    const scopedKey = `${scope}:${key}`;
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
  };
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
