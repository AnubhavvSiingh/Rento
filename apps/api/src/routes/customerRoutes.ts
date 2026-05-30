// Customer auth, profile, and dashboard routes.
import type { Express } from "express";
import { requireCustomerAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { CustomerRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  clearCustomerSessionCookie,
  readCustomerSessionToken,
  setCustomerSessionCookie
} from "../utils/sessionCookies.js";
import { assertCustomerRegister, assertLogin } from "../validators/schemas.js";
import {
  getCustomerDashboard,
  loginCustomer,
  registerCustomer,
  revokeCustomerSession
} from "../services/rentoService.js";

export function registerCustomerRoutes(app: Express) {
  app.post(
    "/api/customers/register",
    rateLimit(6, 60_000, "customer-register"),
    asyncHandler(async (req, res) => {
      const { token, customer } = await registerCustomer(assertCustomerRegister(req.body));
      setCustomerSessionCookie(res, token);
      res.status(201).json({ customer });
    })
  );

  app.post(
    "/api/customers/login",
    rateLimit(10, 60_000, "customer-login"),
    asyncHandler(async (req, res) => {
      const { token, customer } = await loginCustomer(assertLogin(req.body));
      setCustomerSessionCookie(res, token);
      res.json({ customer });
    })
  );

  app.post(
    "/api/customers/logout",
    asyncHandler(async (req, res) => {
      const token = readCustomerSessionToken(req);
      if (token) {
        await revokeCustomerSession(token);
      }
      clearCustomerSessionCookie(res);
      res.status(204).end();
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
        res.status(401).json({ message: "Customer authentication is required." });
        return;
      }

      res.json(await getCustomerDashboard(customer.id));
    })
  );
}
