// Request logging middleware for basic API timing.
import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
}
