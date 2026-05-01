import { config as loadEnv } from "dotenv";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import crypto from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDirectory, "../.env") });

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 4000;
const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);
type UserRole = "ADMIN" | "ADVERTISER";
type AccessStatus = "PENDING" | "APPROVED" | "SUSPENDED";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
    accessStatus: AccessStatus;
  };
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:517\d$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by Rento CORS."));
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.get("/api/overview", async (_req, res) => {
  try {
    const [listedProducts, groupedCities, groupedHosts, pendingAdvertisers] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.groupBy({ by: ["city"] }),
        prisma.product.groupBy({ by: ["owner"] }),
        countUsersByStatus("ADVERTISER", "PENDING")
      ]);

    res.json({
      brand: "Rento",
      positioning:
        "A rental-first marketplace for modern living, temporary ownership, and underused products.",
      audiences: [
        "City movers",
        "Budget-conscious families",
        "Wedding and event shoppers",
        "Influencers and creators"
      ],
      stats: {
        listedProducts,
        activeHosts: groupedHosts.length,
        cities: groupedCities.length,
        averageSavingsPercent: 61,
        pendingAdvertisers
      }
    });
  } catch (error) {
    console.error("Failed to fetch overview:", error);
    res.status(500).json({ message: "Unable to load overview." });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" }
    });

    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Unable to load products." });
  }
});

app.post("/api/auth/register-advertiser", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ message: "Name, email, and password are required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters." });
    return;
  }

  try {
    if (await findUserByEmail(email.toLowerCase())) {
      res.status(409).json({ message: "This login ID already exists." });
      return;
    }

    const passwordHash = await hash(password, 10);
    const user = await createUser({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "ADVERTISER",
      accessStatus: "PENDING",
      provider: "LOCAL"
    });

    res.status(201).json({
      message: "Advertiser account created. Admin approval is pending.",
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Failed to register advertiser:", error);
    res.status(500).json({ message: "Unable to create advertiser account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const user = await findUserByEmail(email.toLowerCase());

    if (!user?.passwordHash) {
      res.status(401).json({ message: "Invalid login credentials." });
      return;
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid login credentials." });
      return;
    }

    if (user.accessStatus !== "APPROVED") {
      res.status(403).json({
        message:
          user.accessStatus === "PENDING"
            ? "Your advertiser access is waiting for admin approval."
            : "Your access has been suspended by admin.",
        accessStatus: user.accessStatus
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);

    await createSession(user.id, token, expiresAt);

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Failed to login:", error);
    res.status(500).json({ message: "Unable to login right now." });
  }
});

app.get("/api/auth/advertiser-status", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";

  if (!email) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  try {
    const user = await findUserByEmail(email);

    if (!user || user.role !== "ADVERTISER") {
      res.status(404).json({ message: "Advertiser account not found." });
      return;
    }

    res.json({
      email: user.email,
      accessStatus: user.accessStatus
    });
  } catch (error) {
    console.error("Failed to fetch advertiser status:", error);
    res.status(500).json({ message: "Unable to load advertiser status." });
  }
});

app.get(
  "/api/auth/me",
  requireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  }
);

app.get(
  "/api/host-dashboard",
  requireAuth("ADVERTISER"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const owner = req.user?.name ?? "";
      const [totalListings, verifiedListings, revenue] = await Promise.all([
        prisma.product.count({ where: { owner } }),
        prisma.product.count({ where: { owner, condition: "Verified" } }),
        prisma.product.aggregate({ where: { owner }, _sum: { dailyRate: true } })
      ]);

      const activeRentals = Math.max(1, Math.round(totalListings * 0.5));
      const utilizationRate =
        totalListings === 0 ? 0 : Math.round((activeRentals / totalListings) * 100);
      const listings = await prisma.product.findMany({
        where: { owner },
        orderBy: { name: "asc" }
      });
      const listingPerformance = listings.map((listing, index) => {
        const views = 120 + index * 45 + Math.round(listing.dailyRate * 0.4);
        const inquiries = Math.max(8, Math.round(views * 0.18));
        const bookedDays = Math.max(5, Math.round(inquiries * 0.65));
        const revenueGenerated = bookedDays * listing.dailyRate;
        const upkeepCost = Math.max(600, Math.round(listing.deposit * 0.18));
        const roiPercent = Math.max(
          18,
          Math.round(((revenueGenerated - upkeepCost) / upkeepCost) * 100)
        );

        return {
          productId: listing.id,
          name: listing.name,
          views,
          inquiries,
          bookedDays,
          revenueGenerated,
          upkeepCost,
          roiPercent
        };
      });
      const portfolioRevenue = listingPerformance.reduce(
        (total, item) => total + item.revenueGenerated,
        0
      );
      const portfolioCost = listingPerformance.reduce(
        (total, item) => total + item.upkeepCost,
        0
      );
      const roiTrend = Array.from({ length: 6 }, (_unused, index) => ({
        label: `W${index + 1}`,
        revenue:
          Math.max(0, Math.round((portfolioRevenue || 2400) * (0.4 + index * 0.13))) +
          index * 220,
        cost:
          Math.max(0, Math.round((portfolioCost || 900) * (0.45 + index * 0.08))) +
          index * 70
      }));

      res.json({
        summary: {
          totalListings,
          activeRentals,
          monthlyRevenue: (revenue._sum.dailyRate ?? 0) * 30,
          utilizationRate,
          verifiedListings
        },
        actions: [
          "Add product photos",
          "Set seasonal pricing",
          "Block unavailable dates",
          "Review pending bookings"
        ],
        listings,
        performance: {
          portfolioRevenue,
          portfolioCost,
          portfolioRoiPercent:
            portfolioCost === 0
              ? 0
              : Math.round(((portfolioRevenue - portfolioCost) / portfolioCost) * 100),
          listingPerformance,
          roiTrend
        }
      });
    } catch (error) {
      console.error("Failed to fetch host dashboard:", error);
      res.status(500).json({ message: "Unable to load host dashboard." });
    }
  }
);

app.post(
  "/api/advertiser/products",
  requireAuth("ADVERTISER"),
  async (req: AuthenticatedRequest, res) => {
    const { name, category, city, dailyRate, deposit, description, tags } = req.body as {
      name?: string;
      category?: string;
      city?: string;
      dailyRate?: number | string;
      deposit?: number | string;
      description?: string;
      tags?: string[] | string;
    };

    if (!name || !category || !city || dailyRate == null || deposit == null || !description) {
      res.status(400).json({ message: "All product fields are required." });
      return;
    }

    const dailyRateValue = Number(dailyRate);
    const depositValue = Number(deposit);

    if (!Number.isFinite(dailyRateValue) || !Number.isFinite(depositValue)) {
      res.status(400).json({ message: "Daily rate and deposit must be valid numbers." });
      return;
    }

    try {
      const normalizedTags = Array.isArray(tags)
        ? tags
        : String(tags ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

      const product = await prisma.product.create({
        data: {
          id: `prd-${crypto.randomUUID().slice(0, 8)}`,
          name,
          category: normalizeCategory(category),
          city,
          dailyRate: dailyRateValue,
          deposit: depositValue,
          owner: req.user?.name ?? "Advertiser",
          condition: "Good",
          description,
          tags: normalizedTags
        }
      });

      res.status(201).json({
        message: "Product posted successfully.",
        product
      });
    } catch (error) {
      console.error("Failed to create product:", error);
      res.status(500).json({ message: "Unable to post product." });
    }
  }
);

app.get(
  "/api/admin/dashboard",
  requireAuth("ADMIN"),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const [users, totals] = await Promise.all([
        listAdvertisers(),
        listAdvertiserCounts()
      ]);

      res.json({
        summary: {
          totalAdvertisers: users.length,
          approved: countByStatus(totals, "APPROVED"),
          pending: countByStatus(totals, "PENDING"),
          suspended: countByStatus(totals, "SUSPENDED")
        },
        advertisers: users.map(sanitizeUser)
      });
    } catch (error) {
      console.error("Failed to fetch admin dashboard:", error);
      res.status(500).json({ message: "Unable to load admin dashboard." });
    }
  }
);

app.patch(
  "/api/admin/users/:userId/access",
  requireAuth("ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    const userId =
      typeof req.params.userId === "string" ? req.params.userId : req.params.userId?.[0];
    const { accessStatus } = req.body as { accessStatus?: AccessStatus };

    if (!userId) {
      res.status(400).json({ message: "A valid user ID is required." });
      return;
    }

    if (!accessStatus || !["APPROVED", "PENDING", "SUSPENDED"].includes(accessStatus)) {
      res.status(400).json({ message: "A valid access status is required." });
      return;
    }

    try {
      const user = await updateUserAccess(userId, accessStatus);

      res.json({
        message: `Access updated to ${accessStatus.toLowerCase()}.`,
        user: sanitizeUser(user)
      });
    } catch (error) {
      console.error("Failed to update advertiser access:", error);
      res.status(500).json({ message: "Unable to update advertiser access." });
    }
  }
);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accessStatus: AccessStatus;
  provider: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accessStatus: user.accessStatus,
    provider: user.provider,
    createdAt: user.createdAt
  };
}

function countByStatus(
  totals: Array<{ accessStatus: AccessStatus; count: bigint }>,
  status: AccessStatus
) {
  return Number(totals.find((item) => item.accessStatus === status)?.count ?? 0);
}

function normalizeCategory(category: string) {
  const allowedCategories = [
    "Furniture",
    "Appliances",
    "Fashion",
    "Ceremony",
    "Electronics"
  ] as const;

  return allowedCategories.includes(category as (typeof allowedCategories)[number])
    ? (category as (typeof allowedCategories)[number])
    : "Furniture";
}

function requireAuth(role?: UserRole) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      res.status(401).json({ message: "Authentication is required." });
      return;
    }

    try {
      const session = await findSessionByToken(token);

      if (!session || session.expiresAt < new Date()) {
        res.status(401).json({ message: "Session has expired. Please login again." });
        return;
      }

      if (session.accessStatus !== "APPROVED") {
        res.status(403).json({ message: "Your access is not currently approved." });
        return;
      }

      if (role && session.role !== role) {
        res.status(403).json({ message: "You do not have permission for this action." });
        return;
      }

      req.user = {
        id: session.userId,
        role: session.role,
        email: session.email,
        name: session.name,
        accessStatus: session.accessStatus
      };

      next();
    } catch (error) {
      console.error("Authentication failed:", error);
      res.status(500).json({ message: "Unable to verify authentication." });
    }
  };
}

async function shutdown() {
  await prisma.$disconnect();
}

type DbUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  accessStatus: AccessStatus;
  provider: string;
  createdAt: Date;
};

type SessionRow = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  accessStatus: AccessStatus;
  expiresAt: Date;
};

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await prisma.$queryRawUnsafe<DbUser[]>(
    `
      SELECT id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt"
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `,
    email
  );

  return rows[0] ?? null;
}

async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accessStatus: AccessStatus;
  provider: "LOCAL" | "GOOGLE";
}): Promise<DbUser> {
  const id = crypto.randomUUID();
  const rows = await prisma.$queryRawUnsafe<DbUser[]>(
    `
      INSERT INTO public.users (
        id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5::"UserRole", $6::"AccessStatus", $7::"AuthProvider", NOW(), NOW())
      RETURNING id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt"
    `,
    id,
    input.name,
    input.email,
    input.passwordHash,
    input.role,
    input.accessStatus,
    input.provider
  );

  return rows[0];
}

async function createSession(userId: string, token: string, expiresAt: Date) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO public.sessions (id, token, "expiresAt", "createdAt", "userId")
      VALUES ($1, $2, $3, NOW(), $4)
    `,
    crypto.randomUUID(),
    token,
    expiresAt,
    userId
  );
}

async function countUsersByStatus(role: UserRole, accessStatus: AccessStatus) {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `
      SELECT COUNT(*)::bigint AS count
      FROM public.users
      WHERE role = $1::"UserRole" AND "accessStatus" = $2::"AccessStatus"
    `,
    role,
    accessStatus
  );

  return Number(rows[0]?.count ?? 0);
}

async function listAdvertisers(): Promise<DbUser[]> {
  return prisma.$queryRawUnsafe<DbUser[]>(
    `
      SELECT id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt"
      FROM public.users
      WHERE role = 'ADVERTISER'
      ORDER BY "createdAt" DESC
    `
  );
}

async function listAdvertiserCounts() {
  return prisma.$queryRawUnsafe<Array<{ accessStatus: AccessStatus; count: bigint }>>(
    `
      SELECT "accessStatus" AS "accessStatus", COUNT(*)::bigint AS count
      FROM public.users
      WHERE role = 'ADVERTISER'
      GROUP BY "accessStatus"
    `
  );
}

async function updateUserAccess(userId: string, accessStatus: AccessStatus): Promise<DbUser> {
  const rows = await prisma.$queryRawUnsafe<DbUser[]>(
    `
      UPDATE public.users
      SET "accessStatus" = $2::"AccessStatus", "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, email, "passwordHash", role, "accessStatus", provider, "createdAt"
    `,
    userId,
    accessStatus
  );

  return rows[0];
}

async function findSessionByToken(token: string): Promise<SessionRow | null> {
  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      SELECT
        u.id AS "userId",
        u.name,
        u.email,
        u.role,
        u."accessStatus" AS "accessStatus",
        s."expiresAt"
      FROM public.sessions s
      JOIN public.users u ON u.id = s."userId"
      WHERE s.token = $1
      LIMIT 1
    `,
    token
  );

  return rows[0] ?? null;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
