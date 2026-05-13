import type { Express } from "express";
import { requireCustomerAuth, requireUserAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import type { CustomerRequest, UserRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  assertAccessStatus,
  assertBooking,
  assertBookingStatus,
  assertCustomerRegister,
  assertListingStatus,
  assertLogin,
  assertProduct,
  assertRegisterAdvertiser,
  assertReview
} from "../validators/schemas.js";
import {
  checkHealth,
  createAdvertiserProduct,
  createBooking,
  createReview,
  getAdminDashboard,
  getAdvertiserStatus,
  getCustomerDashboard,
  getHostDashboard,
  getOverview,
  listProducts,
  loginCustomer,
  loginUser,
  registerAdvertiser,
  registerCustomer,
  updateAdvertiserAccess,
  updateBookingStatus,
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
    asyncHandler(async (req, res) => {
      res.json(await loginUser(assertLogin(req.body)));
    })
  );

  app.get(
    "/api/auth/advertiser-status",
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
    asyncHandler(async (req, res) => {
      res.status(201).json(await registerCustomer(assertCustomerRegister(req.body)));
    })
  );

  app.post(
    "/api/customers/login",
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
      res.json({
        message: "Advertiser access updated.",
        user: await updateAdvertiserAccess(routeParam(req.params.userId), assertAccessStatus(req.body))
      });
    })
  );

  app.patch(
    "/api/admin/products/:productId/status",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      res.json({
        message: "Product status updated.",
        product: await updateProductStatus(routeParam(req.params.productId), assertListingStatus(req.body))
      });
    })
  );

  app.patch(
    "/api/admin/bookings/:bookingId/status",
    requireUserAuth("ADMIN"),
    asyncHandler(async (req, res) => {
      res.json({
        message: "Booking status updated.",
        booking: await updateBookingStatus(routeParam(req.params.bookingId), assertBookingStatus(req.body))
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
