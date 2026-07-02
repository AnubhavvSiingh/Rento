// Host dashboard and listing management services for advertisers.
import type { DayOfWeek, PricingRuleType } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { buildEvent } from "../kafka/events.js";
import { indexMarketplaceProduct } from "../search/elasticsearch.js";
import {
  assessPhotoQuality,
  bookingIncludes,
  buildImageTags,
  emitEvent,
  inferQualityScore,
  mapBooking,
  mapProduct,
  normalizeCategory,
  productIncludes
} from "./rentoHelpers.js";

export async function getHostDashboard(user: { id: string; name: string }) {
  const listings = await prisma.product.findMany({
    where: {
      OR: [{ ownerId: user.id }, { owner: user.name }]
    },
    include: {
      ...productIncludes(),
      bookings: {
        include: bookingIncludes(),
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });
  const totalListings = listings.length;
  const verifiedListings = listings.filter((listing) => listing.condition === "Verified").length;
  const activeRentals = listings.reduce(
    (total, listing) =>
      total + listing.bookings.filter((booking) => booking.status !== "COMPLETED").length,
    0
  );
  const monthlyRevenue = listings.reduce(
    (total, listing) =>
      total + listing.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
    0
  );
  const utilizationRate =
    totalListings === 0 ? 0 : Math.round((activeRentals / Math.max(totalListings, 1)) * 100);
  const listingPerformance = listings.map((listing) => {
    const bookedDays = listing.bookings.reduce((total, booking) => {
      if (!booking.shipment) {
        return total;
      }
      return total + getRentalDays(booking.shipment.rentalStartDate, booking.shipment.rentalEndDate);
    }, 0);
    const revenueGenerated = listing.bookings.reduce(
      (total, booking) => total + booking.totalAmount,
      0
    );
    const upkeepCost = Math.max(600, Math.round(listing.deposit * 0.18));
    const roiPercent = Math.max(
      0,
      Math.round(((revenueGenerated - upkeepCost) / upkeepCost) * 100)
    );

    return {
      productId: listing.id,
      name: listing.name,
      views: 120 + listing.bookings.length * 45,
      inquiries: Math.max(0, listing.bookings.length * 3),
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
  const portfolioCost = listingPerformance.reduce((total, item) => total + item.upkeepCost, 0);
  const roiTrend = Array.from({ length: 6 }, (_unused, index) => ({
    label: `W${index + 1}`,
    revenue:
      Math.max(0, Math.round((portfolioRevenue || 2400) * (0.4 + index * 0.13))) +
      index * 220,
    cost:
      Math.max(0, Math.round((portfolioCost || 900) * (0.45 + index * 0.08))) +
      index * 70
  }));

  return {
    summary: {
      totalListings,
      activeRentals,
      monthlyRevenue,
      utilizationRate,
      verifiedListings
    },
    actions: [
      "Add product photos",
      "Set seasonal pricing",
      "Block unavailable dates",
      "Review pending bookings",
      "Check photo QA feedback"
    ],
    listings: listings.map(mapProduct),
    bookings: listings.flatMap((listing) => listing.bookings.map(mapBooking)),
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
  };
}

export async function createAdvertiserProduct(
  user: { id: string; name: string },
  input: {
    name: string;
    category: string;
    city: string;
    dailyRate: number;
    deposit: number;
    description: string;
    tags: string[];
    imageUrls: string[];
    leadTimeDays: number | null;
    bufferDays: number | null;
    minPhotoCount: number | null;
  }
) {
  const qaNotes = assessPhotoQuality(input.imageUrls, input.minPhotoCount ?? 3);
  const product = await prisma.product.create({
    data: {
      id: `prd-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      category: normalizeCategory(input.category),
      city: input.city,
      dailyRate: input.dailyRate,
      deposit: input.deposit,
      owner: user.name,
      ownerId: user.id,
      condition: "Good",
      description: input.description,
      tags: input.tags,
      status: "PENDING",
      qaStatus: "PENDING",
      qaNotes,
      leadTimeDays: input.leadTimeDays ?? 2,
      bufferDays: input.bufferDays ?? 1,
      minPhotoCount: input.minPhotoCount ?? 3,
      images: {
        create: input.imageUrls.map((url, index) => ({
          url,
          sortOrder: index,
          qualityScore: inferQualityScore(url),
          autoTags: buildImageTags(input.name, input.tags, normalizeCategory(input.category), url),
          isPrimary: index === 0
        }))
      }
    },
    include: productIncludes()
  });

  void emitEvent(
    "qa-events",
    product.id,
    buildEvent("PRODUCT_SUBMITTED", {
      productId: product.id,
      ownerId: product.ownerId,
      qaStatus: product.qaStatus,
      imageCount: product.images.length
    })
  );

  void indexMarketplaceProduct(product);

  return mapProduct(product);
}

export async function createAvailabilityBlock(
  user: { id: string },
  input: { productId: string; startDate: Date; endDate: Date; reason: string }
) {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, ownerId: user.id }
  });

  if (!product) {
    throw new ApiError(404, "Product not found for this host.");
  }

  const overlaps = await prisma.availabilityBlock.count({
    where: {
      productId: input.productId,
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate }
    }
  });

  if (overlaps > 0) {
    throw new ApiError(409, "Availability block overlaps an existing block.");
  }

  const block = await prisma.availabilityBlock.create({
    data: {
      productId: input.productId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason
    }
  });

  void emitEvent(
    "admin-events",
    block.id,
    buildEvent("AVAILABILITY_BLOCK_CREATED", {
      blockId: block.id,
      productId: block.productId,
      startDate: block.startDate,
      endDate: block.endDate
    })
  );

  return block;
}

export async function createPricingRule(
  user: { id: string },
  input: {
    productId: string;
    label: string;
    type: PricingRuleType;
    multiplier: number | null;
    fixedDailyRate: number | null;
    startDate: Date | null;
    endDate: Date | null;
    daysOfWeek: DayOfWeek[];
    demandThreshold: number | null;
    isActive: boolean | null;
  }
) {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, ownerId: user.id }
  });

  if (!product) {
    throw new ApiError(404, "Product not found for this host.");
  }

  if (!input.multiplier && !input.fixedDailyRate) {
    throw new ApiError(400, "Pricing rule needs multiplier or fixedDailyRate.");
  }

  const rule = await prisma.pricingRule.create({
    data: {
      productId: input.productId,
      label: input.label,
      type: input.type,
      multiplier: input.multiplier ?? null,
      fixedDailyRate: input.fixedDailyRate ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      daysOfWeek: input.daysOfWeek,
      demandThreshold: input.demandThreshold ?? null,
      isActive: input.isActive ?? true
    }
  });

  void emitEvent(
    "admin-events",
    rule.id,
    buildEvent("PRICING_RULE_CREATED", {
      ruleId: rule.id,
      productId: rule.productId,
      type: rule.type,
      label: rule.label
    })
  );

  return rule;
}

function getRentalDays(startDate: Date, endDate: Date) {
  if (endDate <= startDate) {
    return 1;
  }

  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));
}
