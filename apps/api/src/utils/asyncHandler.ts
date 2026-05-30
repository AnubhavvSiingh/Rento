// Async handler wrapper to surface route errors to Express.
import type { NextFunction, Request, Response } from "express";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}
