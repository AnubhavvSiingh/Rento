import type { Express } from "express";
import { requireCustomerAuth, requireUserAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { CustomerRequest, UserRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  assertAccessStatus,
  assertBooking,
  assertBookingStatus,
  assertContentBlock,
  assertContentUpdate,
  assertCustomerRegister,
  assertAvailabilityBlock,
  assertListingStatus,
  assertLogin,
  assertPricingRule,
  assertProduct,
  assertPromoCampaign,
  assertQaUpdate,
  assertReferralCode,
  assertRegisterAdvertiser,
  assertReview,
  assertAnalyticsEvent
} from "../validators/schemas.js";
import {
  checkHealth,
  createAvailabilityBlock,
  createAdvertiserProduct,
  createBooking,
  createContentBlock,
  createPromoCampaign,
  createReferralCode,
  createReview,
  createPricingRule,
  getAdminDashboard,
  getAdvertiserStatus,
  getCustomerDashboard,
  getHostDashboard,
  getOverview,
  listProducts,
  loginCustomer,
  loginUser,
  recordAnalyticsEvent,
  registerAdvertiser,
  registerCustomer,
  scheduleReturnPickup,
  updateAdvertiserAccess,
  updateContentBlock,
  updateBookingStatus,
  updateProductQaStatus,
  updateProductStatus
} from "../services/rentoService.js";

export function registerApiRoutes(app: Express) {
  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      res.json(await checkHealth());
    })
  );

  app.get(
    "/api/overview",
    asyncHandler(async (_req, res) => {
      res.json(await getOverview());
    })
  );

  app.get(
    "/api/products",
    asyncHandler(async (_req, res) => {
      res.json(await listProducts());
    })
  );

  app.post(
    "/api/auth/register-advertiser",
    rateLimit(6, 60_000, "auth-register-advertiser"),
    asyncHandler(async (req, res) => {
      const user = await registerAdvertiser(assertRegisterAdvertiser(req.body));
      res.status(201).json({
        message: "Advertiser account created. Admin approval is pending.",
        user
      });
    })
  );

  app.post(
    "/api/auth/login",
    rateLimit(10, 60_000, "auth-login"),
    asyncHandler(async (req, res) => {
      res.json(await loginUser(assertLogin(req.body)));
    })
  );

  app.get(
    "/api/auth/advertiser-status",
    rateLimit(20, 60_000, "auth-status"),
    asyncHandler(async (req, res) => {
      const email = typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";
      if (!email) {
        throw new ApiError(400, "Email is required.");
      }

      res.json(await getAdvertiserStatus(email));
    })
  );

  app.get(
    "/api/auth/me",
    requireUserAuth(),
    asyncHandler(async (req, res) => {
      res.json({ user: (req as UserRequest).user });
    })
  );

  app.post(
    "/api/customers/register",
    rateLimit(6, 60_000, "customer-register"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await registerCustomer(assertCustomerRegister(req.body)));
    })
  );

  app.post(
    "/api/customers/login",
    rateLimit(10, 60_000, "customer-login"),
    asyncHandler(async (req, res) => {
      res.json(await loginCustomer(assertLogin(req.body)));
    })
  );

  app.get(
    "/api/customers/me",
    requireCustomerAuth(),
    asyncHandler(async (req, res) => {
      res.json({ customer: (req as CustomerRequest).customer });
    })
  );

  app.get(
    "/api/customers/dashboard",
    requireCustomerAuth(),
    asyncHandler(async (req, res) => {
      const customer = (req as CustomerRequest).customer;
      if (!customer) {
        throw new ApiError(401, "Customer authentication is required.");
      }

      res.json(await getCustomerDashboard(customer.id));
    })
  );

  app.post(
    "/api/bookings",
    rateLimit(12, 60_000, "booking-create"),
    requireCustomerAuth(),
    asyncHandler(async (req, res) => {
      const customer = (req as CustomerRequest).customer;
      if (!customer) {
        throw new ApiError(401, "Customer authentication is required.");
      }

      res.status(201).json({
        message: "Your order has been placed. We will email you the shipment tracking link shortly.",
        booking: await createBooking(customer.id, assertBooking(req.body))
      });
    })
  );

  app.post(
    "/api/bookings/:bookingId/review",
    rateLimit(12, 60_000, "booking-review"),
    requireCustomerAuth(),
    asyncHandler(async (req, res) => {
      const customer = (req as CustomerRequest).customer;
      if (!customer) {
        throw new ApiError(401, "Customer authentication is required.");
      }

      res.json({
        message: "Review saved.",
        review: await createReview(customer.id, routeParam(req.params.bookingId), assertReview(req.body))
      });
    })
  );

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

function routeParam(value: string | string[] | undefined) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  throw new ApiError(400, "A valid route parameter is required.");
}
