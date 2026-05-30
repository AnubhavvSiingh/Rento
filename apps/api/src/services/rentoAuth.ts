// Advertiser/admin authentication services and access checks.
import { compare, hash } from "bcryptjs";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createUserSession, sanitizeUser } from "./rentoHelpers.js";

export async function registerAdvertiser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new ApiError(409, "This login ID already exists.");
  }

  const passwordHash = await hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "ADVERTISER",
      accessStatus: "PENDING",
      provider: "LOCAL"
    }
  });

  return sanitizeUser(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user?.passwordHash || !(await compare(input.password, user.passwordHash))) {
    throw new ApiError(401, "Invalid login credentials.");
  }

  if (user.accessStatus !== "APPROVED") {
    throw new ApiError(
      403,
      user.accessStatus === "PENDING"
        ? "Your advertiser access is waiting for admin approval."
        : "Your access has been suspended by admin."
    );
  }

  const token = await createUserSession(user.id);
  return { token, user: sanitizeUser(user) };
}

export async function getAdvertiserStatus(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "ADVERTISER") {
    throw new ApiError(404, "Advertiser account not found.");
  }

  return {
    accessStatus: user.accessStatus
  };
}
