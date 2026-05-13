import crypto from "node:crypto";

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createTrackingCode() {
  return `RENTO-${Date.now().toString().slice(-7)}`;
}
