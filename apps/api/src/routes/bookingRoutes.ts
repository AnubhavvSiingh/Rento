// Booking and review routes for customers.
import type { Express } from "express";
import { requireCustomerAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { CustomerRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertBooking, assertReview } from "../validators/schemas.js";
import { createBooking, createReview } from "../services/rentoService.js";
import { routeParam } from "./routeUtils.js";

export function registerBookingRoutes(app: Express) {
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
}
