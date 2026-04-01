import { config as loadEnv } from "dotenv";
import { PrismaClient, type Category, type ProductCondition } from "@prisma/client";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";
import crypto from "node:crypto";
import { products } from "../src/data.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDirectory, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@rento.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";

  await prisma.product.createMany({
    data: products.map((product) => ({
      ...product,
      category: product.category as Category,
      condition: product.condition as ProductCondition
    })),
    skipDuplicates: true
  });

  const passwordHash = await hash(adminPassword, 10);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO public.users (
        id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, 'ADMIN', 'APPROVED', 'LOCAL', NOW(), NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        "passwordHash" = EXCLUDED."passwordHash",
        role = 'ADMIN',
        "accessStatus" = 'APPROVED',
        provider = 'LOCAL',
        "updatedAt" = NOW()
    `,
    crypto.randomUUID(),
    "Rento Admin",
    adminEmail,
    passwordHash
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
