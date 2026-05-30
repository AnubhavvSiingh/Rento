// Basic WAF-style request payload guard used by the API app.
import type { NextFunction, Request, Response } from "express";

const blockedPatterns = [
  /<script\b/i,
  /\b(select|insert|update|delete|drop|alter)\b\s+/i,
  /\bunion\b\s+\bselect\b/i,
  /\$where/i,
  /\bwaitfor\b\s+\bdelay\b/i,
  /\.\.\//,
  /\.\.\\/,
  /\b(?:sleep|benchmark)\b\s*\(/i
];

export function wafGuard() {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = JSON.stringify({
      path: req.originalUrl,
      query: req.query,
      body: req.body
    });

    if (blockedPatterns.some((pattern) => pattern.test(payload))) {
      res.status(400).json({ message: "Request blocked by security policy." });
      return;
    }

    next();
  };
}
