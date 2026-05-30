// Admin routes for approvals, content, promos, and booking updates.
import type { Express } from "express";
import { requireUserAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import type { UserRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  assertAccessStatus,
  assertBookingStatus,
  assertContentBlock,
  assertContentUpdate,
  assertListingStatus,
  assertPromoCampaign,
  assertQaUpdate,
  assertReferralCode
} from "../validators/schemas.js";
import {
  createContentBlock,
  createPromoCampaign,
  createReferralCode,
  getAdminDashboard,
  scheduleReturnPickup,
  updateAdvertiserAccess,
  updateBookingStatus,
  updateContentBlock,
  updateProductQaStatus,
  updateProductStatus
} from "../services/rentoService.js";
import { routeParam } from "./routeUtils.js";

export function registerAdminRoutes(app: Express) {
  app.get(
    "/api/admin/dashboard",
    requireUserAuth("ADMIN"),
    asyncHandler(async (_req, res) => {
      res.json(await getAdminDashboard());
    })
  );

  app.patch(
    "/api/admin/users/:userId/access",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json({
        message: "Advertiser access updated.",
        user: await updateAdvertiserAccess(
          admin.id,
          routeParam(req.params.userId),
          assertAccessStatus(req.body)
        )
      });
    })
  );

  app.patch(
    "/api/admin/products/:productId/status",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json({
        message: "Product status updated.",
        product: await updateProductStatus(
          admin.id,
          routeParam(req.params.productId),
          assertListingStatus(req.body)
        )
      });
    })
  );

  app.patch(
    "/api/admin/products/:productId/qa",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json({
        message: "Product QA updated.",
        product: await updateProductQaStatus(
          admin.id,
          routeParam(req.params.productId),
          assertQaUpdate(req.body)
        )
      });
    })
  );

  app.post(
    "/api/admin/content",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Content block created.",
        block: await createContentBlock(admin.id, assertContentBlock(req.body))
      });
    })
  );

  app.patch(
    "/api/admin/content/:contentId",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json({
        message: "Content block updated.",
        block: await updateContentBlock(
          admin.id,
          routeParam(req.params.contentId),
          assertContentUpdate(req.body)
        )
      });
    })
  );

  app.post(
    "/api/admin/promos",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Promo campaign created.",
        campaign: await createPromoCampaign(admin.id, assertPromoCampaign(req.body))
      });
    })
  );

  app.post(
    "/api/admin/referrals",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.status(201).json({
        message: "Referral code created.",
        referral: await createReferralCode(admin.id, assertReferralCode(req.body))
      });
    })
  );

  app.patch(
    "/api/admin/bookings/:bookingId/status",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      res.json({
        message: "Booking status updated.",
        booking: await updateBookingStatus(
          admin.id,
          routeParam(req.params.bookingId),
          assertBookingStatus(req.body)
        )
      });
    })
  );

  app.patch(
    "/api/admin/bookings/:bookingId/return-schedule",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      const admin = (req as UserRequest).user;
      if (!admin) {
        throw new ApiError(401, "Authentication is required.");
      }

      const value = req.body as { returnScheduledAt?: string };
      res.json({
        message: "Return pickup scheduled.",
        booking: await scheduleReturnPickup(
          admin.id,
          routeParam(req.params.bookingId),
          value.returnScheduledAt
        )
      });
    })
  );
}
