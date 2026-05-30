// Auth routes for advertiser/admin login, status, and session management.
import type { Express } from "express";
import { requireUserAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import type { UserRequest } from "../types/domain.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  clearUserSessionCookie,
  readUserSessionToken,
  setUserSessionCookie
} from "../utils/sessionCookies.js";
import { assertLogin, assertRegisterAdvertiser } from "../validators/schemas.js";
import {
  getAdvertiserStatus,
  loginUser,
  registerAdvertiser,
  revokeUserSession
} from "../services/rentoService.js";

export function registerAuthRoutes(app: Express) {
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
      const { token, user } = await loginUser(assertLogin(req.body));
      setUserSessionCookie(res, token);
      res.json({ user });
    })
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      const token = readUserSessionToken(req);
      if (token) {
        await revokeUserSession(token);
      }
      clearUserSessionCookie(res);
      res.status(204).end();
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
}
