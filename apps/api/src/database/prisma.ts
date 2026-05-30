// Prisma client singleton and disconnect helper for API services.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
