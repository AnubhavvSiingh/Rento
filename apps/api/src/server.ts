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
    origin: ["http://localhost:5173"],
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
  async (_req: AuthenticatedRequest, res) => {
    try {
      const [totalListings, verifiedListings, revenue] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { condition: "Verified" } }),
        prisma.product.aggregate({ _sum: { dailyRate: true } })
      ]);

      const activeRentals = Math.max(1, Math.round(totalListings * 0.5));
      const utilizationRate =
        totalListings === 0 ? 0 : Math.round((activeRentals / totalListings) * 100);

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
        ]
      });
    } catch (error) {
      console.error("Failed to fetch host dashboard:", error);
      res.status(500).json({ message: "Unable to load host dashboard." });
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
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
      WHERE role = $1 AND "accessStatus" = $2
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
      SET "accessStatus" = $2, "updatedAt" = NOW()
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
