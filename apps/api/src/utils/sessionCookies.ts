// Session cookie helpers for setting and clearing auth cookies.
import type { Request, Response } from "express";

const userSessionCookie = process.env.USER_SESSION_COOKIE ?? "rento_user_session";
const customerSessionCookie = process.env.CUSTOMER_SESSION_COOKIE ?? "rento_customer_session";
const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);
const sessionMaxAgeMs = sessionTtlHours * 60 * 60 * 1000;

export function getUserSessionCookieName() {
  return userSessionCookie;
}

export function getCustomerSessionCookieName() {
  return customerSessionCookie;
}

export function setUserSessionCookie(res: Response, token: string) {
  res.cookie(userSessionCookie, token, { ...cookieOptions(), maxAge: sessionMaxAgeMs });
}

export function setCustomerSessionCookie(res: Response, token: string) {
  res.cookie(customerSessionCookie, token, { ...cookieOptions(), maxAge: sessionMaxAgeMs });
}

export function clearUserSessionCookie(res: Response) {
  res.clearCookie(userSessionCookie, cookieOptions());
}

export function clearCustomerSessionCookie(res: Response) {
  res.clearCookie(customerSessionCookie, cookieOptions());
}

export function readUserSessionToken(req: Request) {
  return readCookie(req, userSessionCookie);
}

export function readCustomerSessionToken(req: Request) {
  return readCookie(req, customerSessionCookie);
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }

  const entries = header.split(";").map((item) => item.trim()).filter(Boolean);
  for (const entry of entries) {
    const [key, ...value] = entry.split("=");
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };
}
