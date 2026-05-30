// Advertiser routes for host dashboard and listing management.
import type { Express } from "express";
import { requireUserAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import type { UserRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  assertAvailabilityBlock,
  assertPricingRule,
  assertProduct
} from "../validators/schemas.js";
import {
  createAdvertiserProduct,
  createAvailabilityBlock,
  createPricingRule,
  getHostDashboard
} from "../services/rentoService.js";

export function registerAdvertiserRoutes(app: Express) {
  app.get(
    "/api/host-dashboard",
    requireUserAuth("ADVERTISER"),
    asyncHandler(async (req, res) => {
      const user = (req as UserRequest).user;
      if (!user) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json(await getHostDashboard(user));
    })
  );

  app.post(
    "/api/advertiser/products",
    requireUserAuth("ADVERTISER"),
    asyncHandler(async (req, res) => {
      const user = (req as UserRequest).user;
      if (!user) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Product submitted for admin approval.",
        product: await createAdvertiserProduct(user, assertProduct(req.body))
      });
    })
  );

  app.post(
    "/api/advertiser/availability",
    requireUserAuth("ADVERTISER"),
    asyncHandler(async (req, res) => {
      const user = (req as UserRequest).user;
      if (!user) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Availability block saved.",
        block: await createAvailabilityBlock(user, assertAvailabilityBlock(req.body))
      });
    })
  );

  app.post(
    "/api/advertiser/pricing",
    requireUserAuth("ADVERTISER"),
    asyncHandler(async (req, res) => {
      const user = (req as UserRequest).user;
      if (!user) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Pricing rule saved.",
        rule: await createPricingRule(user, assertPricingRule(req.body))
      });
    })
  );
}
