// Auth middleware for user and customer sessions.
import type { AccessStatus, UserRole } from "@prisma/client";
import type { NextFunction, Response } from "express";
import { prisma } from "../database/prisma.js";
import { ApiError } from "./errorHandler.js";
import type { CustomerRequest, UserRequest } from "../types/domain.js";
import { readCustomerSessionToken, readUserSessionToken } from "../utils/sessionCookies.js";
import { hashSessionToken } from "../utils/tokens.js";

export function requireUserAuth(role?: UserRole) {
  return async (req: UserRequest, _res: Response, next: NextFunction) => {
    try {
      const token = getSessionToken(req.headers.authorization, readUserSessionToken(req));
      const tokenHash = hashSessionToken(token);
      const session = await prisma.session.findUnique({
        where: { token: tokenHash },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        throw new ApiError(401, "Session has expired. Please login again.");
      }

      if (session.user.accessStatus !== "APPROVED") {
        throw new ApiError(403, "Your access is not currently approved.");
      }

      if (role && session.user.role !== role) {
        throw new ApiError(403, "You do not have permission for this action.");
      }

      req.user = {
        id: session.user.id,
        role: session.user.role as UserRole,
        email: session.user.email,
        name: session.user.name,
        accessStatus: session.user.accessStatus as AccessStatus
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireCustomerAuth() {
  return async (req: CustomerRequest, _res: Response, next: NextFunction) => {
    try {
      const token = getSessionToken(req.headers.authorization, readCustomerSessionToken(req));
      const tokenHash = hashSessionToken(token);
      const session = await prisma.customerSession.findUnique({
        where: { token: tokenHash },
        include: { customer: true }
      });

      if (!session || session.expiresAt < new Date()) {
        throw new ApiError(401, "Customer session has expired. Please sign in again.");
      }

      req.customer = {
        id: session.customer.id,
        fullName: session.customer.fullName,
        email: session.customer.email,
        phone: session.customer.phone
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

function getSessionToken(header: string | undefined, cookieToken: string | null) {
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : cookieToken;

  if (!token) {
    throw new ApiError(401, "Authentication is required.");
  }

  return token;
}
