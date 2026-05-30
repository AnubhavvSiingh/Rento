// Analytics ingestion routes.
import type { Express } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertAnalyticsEvent } from "../validators/schemas.js";
import { recordAnalyticsEvent } from "../services/rentoService.js";

export function registerAnalyticsRoutes(app: Express) {
  app.post(
    "/api/analytics",
    rateLimit(120, 60_000, "analytics"),
    asyncHandler(async (req, res) => {
      await recordAnalyticsEvent(assertAnalyticsEvent(req.body));
      res.status(201).json({
        message: "Event recorded."
      });
    })
  );
}
