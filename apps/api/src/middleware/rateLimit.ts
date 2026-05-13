import type { NextFunction, Request, Response } from "express";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests = 180, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = requestBuckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= maxRequests) {
      res.status(429).json({ message: "Too many requests. Please try again shortly." });
      return;
    }

    bucket.count += 1;
    next();
  };
}
