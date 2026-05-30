// Express route registrations grouped by feature area.
import type { Express } from "express";
import { registerAdminRoutes } from "./adminRoutes.js";
import { registerAdvertiserRoutes } from "./advertiserRoutes.js";
import { registerAnalyticsRoutes } from "./analyticsRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerBookingRoutes } from "./bookingRoutes.js";
import { registerCustomerRoutes } from "./customerRoutes.js";
import { registerPublicRoutes } from "./publicRoutes.js";

export function registerApiRoutes(app: Express) {
  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerCustomerRoutes(app);
  registerBookingRoutes(app);
  registerAdvertiserRoutes(app);
  registerAdminRoutes(app);
  registerAnalyticsRoutes(app);
}
