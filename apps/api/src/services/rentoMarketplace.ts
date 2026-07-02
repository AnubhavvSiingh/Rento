// Marketplace queries for health, overview stats, and public catalog.
import { prisma } from "../database/prisma.js";
import { mapPublicProduct, productIncludes } from "./rentoHelpers.js";
import { searchMarketplaceProducts } from "../search/elasticsearch.js";

export async function checkHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", database: "connected" };
}

export async function getOverview() {
  const [
    listedProducts,
    groupedCities,
    groupedHosts,
    pendingQaListings,
    verifiedHosts,
    activePromos
  ] = await Promise.all([
    prisma.product.count({ where: { status: "APPROVED", qaStatus: "APPROVED" } }),
    prisma.product.groupBy({ by: ["city"], where: { status: "APPROVED" } }),
    prisma.product.groupBy({ by: ["owner"], where: { status: "APPROVED" } }),
    prisma.product.count({ where: { qaStatus: "PENDING" } }),
    prisma.user.count({ where: { role: "ADVERTISER", isVerifiedHost: true } }),
    prisma.promoCampaign.count({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() }
      }
    })
  ]);

  return {
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
      pendingQaListings,
      verifiedHosts,
      activePromos
    }
  };
}

export async function listProducts() {
  const products = await prisma.product.findMany({
    where: { status: "APPROVED", qaStatus: "APPROVED" },
    include: productIncludes(),
    orderBy: { name: "asc" }
  });

  return products.map(mapPublicProduct);
}

export async function searchMarketplaceCatalog(filters: {
  query?: string;
  category?: string;
  city?: string;
  maxPrice?: number;
  sort?: "recommended" | "price-low" | "price-high";
}) {
  return searchMarketplaceProducts({ ...filters, approvedOnly: true });
}
