import type {
  AccessStatus,
  AnalyticsEventType,
  BookingStatus,
  Category,
  ContentType,
  DayOfWeek,
  DiscountType,
  ListingStatus,
  PricingRuleType,
  ProductCondition,
  QaStatus,
  UserRole
} from "@prisma/client";
import { compare, hash } from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { createSessionToken, createTrackingCode, hashSessionToken } from "../utils/tokens.js";

const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);

export async function checkHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", database: "connected" };
}

export async function getOverview() {
  const [
    listedProducts,
    groupedCities,
    groupedHosts,
    pendingAdvertisers,
    pendingQaListings,
    verifiedHosts,
    activePromos
  ] = await Promise.all([
    prisma.product.count({ where: { status: "APPROVED", qaStatus: "APPROVED" } }),
    prisma.product.groupBy({ by: ["city"], where: { status: "APPROVED" } }),
    prisma.product.groupBy({ by: ["owner"], where: { status: "APPROVED" } }),
    prisma.user.count({ where: { role: "ADVERTISER", accessStatus: "PENDING" } }),
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
      pendingAdvertisers,
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

  return products.map(mapProduct);
}

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

  const token = createSessionToken();
  await prisma.session.create({
    data: {
      token: hashSessionToken(token),
      expiresAt: expiresAt(),
      userId: user.id
    }
  });

  return { token, user: sanitizeUser(user) };
}

export async function getAdvertiserStatus(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "ADVERTISER") {
    throw new ApiError(404, "Advertiser account not found.");
  }

  return {
    email: user.email,
    accessStatus: user.accessStatus
  };
}

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const existingCustomer = await prisma.customer.findUnique({ where: { email: input.email } });

  if (existingCustomer) {
    throw new ApiError(409, "This customer email already exists. Please sign in.");
  }

  const passwordHash = await hash(input.password, 10);
  const customer = await prisma.customer.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash
    }
  });
  const token = await createCustomerSession(customer.id);

  return { token, customer: sanitizeCustomer(customer) };
}

export async function loginCustomer(input: { email: string; password: string }) {
  const customer = await prisma.customer.findUnique({ where: { email: input.email } });

  if (!customer || !(await compare(input.password, customer.passwordHash))) {
    throw new ApiError(401, "Invalid customer email or password.");
  }

  const token = await createCustomerSession(customer.id);

  return { token, customer: sanitizeCustomer(customer) };
}

export async function getCustomerDashboard(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      notifications: { orderBy: { createdAt: "desc" } },
      reviews: {
        include: { product: true },
        orderBy: { createdAt: "desc" }
      },
      bookings: {
        include: bookingIncludes(),
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  return {
    customer: sanitizeCustomer(customer),
    bookings: customer.bookings.map(mapBooking),
    notifications: customer.notifications,
    reviews: customer.reviews.map((review) => ({
      id: review.id,
      bookingId: review.bookingId,
      productId: review.productId,
      productName: review.product.name,
      customerEmail: customer.email,
      rating: review.rating,
      comment: review.comment,
      conditionNote: review.conditionNote ?? "",
      createdAt: review.createdAt
    }))
  };
}

export async function createBooking(
  customerId: string,
  input: {
    productId: string;
    shipment: {
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      postalCode: string;
      shipmentDate: Date;
      rentalStartDate: Date;
      rentalEndDate: Date;
      deliveryInstructions: string;
      conditionPhotoUrl: string;
    };
    payment: {
      method: string;
      reference: string;
    };
    promoCode?: string;
  }
) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { pricingRules: true, availabilityBlocks: true }
  });

  if (!product || product.status !== "APPROVED" || product.qaStatus !== "APPROVED") {
    throw new ApiError(404, "This product is not available for rental.");
  }

  enforceLeadTime(product.leadTimeDays, input.shipment.rentalStartDate);
  ensureNoAvailabilityBlocks(product.availabilityBlocks, input.shipment);

  const overlappingBookings = await prisma.booking.count({
    where: {
      productId: product.id,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      shipment: {
        is: {
          rentalStartDate: { lte: addDays(input.shipment.rentalEndDate, product.bufferDays) },
          rentalEndDate: { gte: addDays(input.shipment.rentalStartDate, -product.bufferDays) }
        }
      }
    }
  });

  if (overlappingBookings > 0) {
    throw new ApiError(
      409,
      "This product is already booked for the selected dates. Please choose different dates."
    );
  }

  const pricing = await calculateBookingPricing(product, input.shipment, input.promoCode);
  const booking = await prisma.booking.create({
    data: {
      customerId,
      productId: product.id,
      dailyRate: pricing.averageDailyRate,
      deposit: product.deposit,
      totalAmount: pricing.totalAmount,
      promoCode: pricing.promoCode,
      discountAmount: pricing.discountAmount,
      priceBreakdown: pricing.priceBreakdown,
      payment: {
        create: {
          method: input.payment.method,
          reference: input.payment.reference || `PAY-${Date.now().toString().slice(-6)}`,
          amount: pricing.totalAmount,
          status: "PAID"
        }
      },
      shipment: {
        create: {
          ...input.shipment,
          trackingCode: createTrackingCode()
        }
      }
    },
    include: bookingIncludes()
  });

  if (pricing.promoCampaignId) {
    await prisma.promoCampaign.update({
      where: { id: pricing.promoCampaignId },
      data: { usedCount: { increment: 1 } }
    });
  }

  await createShipmentEvent(booking.id, "PLACED", "Order confirmed and queued for dispatch.");

  await createNotification(
    customerId,
    "Order placed",
    `Your rental order for ${product.name} is confirmed. We will email the shipment tracking link shortly.`
  );

  return mapBooking(booking);
}

export async function createReview(
  customerId: string,
  bookingId: string,
  input: { rating: number; comment: string; conditionNote: string }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { product: true }
  });

  if (!booking || booking.customerId !== customerId) {
    throw new ApiError(404, "Booking not found.");
  }

  const review = await prisma.review.upsert({
    where: { bookingId },
    update: {
      rating: input.rating,
      comment: input.comment,
      conditionNote: input.conditionNote
    },
    create: {
      bookingId,
      productId: booking.productId,
      customerId,
      rating: input.rating,
      comment: input.comment,
      conditionNote: input.conditionNote
    }
  });

  return {
    ...review,
    bookingId: review.bookingId,
    productName: booking.product.name
  };
}

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
      total +
      listing.bookings.filter((booking) => booking.status !== "COMPLETED").length,
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

  return prisma.availabilityBlock.create({
    data: {
      productId: input.productId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason
    }
  });
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

  return prisma.pricingRule.create({
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
}

export async function getAdminDashboard() {
  const [
    advertisers,
    products,
    bookings,
    contentBlocks,
    promoCampaigns,
    referralCodes,
    analyticsEvents,
    customers,
    auditLogs
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADVERTISER" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.product.findMany({
      include: productIncludes(),
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.findMany({
      include: bookingIncludes(),
      orderBy: { createdAt: "desc" }
    }),
    prisma.contentBlock.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.promoCampaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.referralCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.customer.findMany({ include: { bookings: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 })
  ]);

  const riskSummary = buildRiskSummary(products, bookings);
  const analyticsSummary = buildAnalyticsSummary(analyticsEvents, bookings, customers, products.length);

  return {
    summary: {
      totalAdvertisers: advertisers.length,
      approved: advertisers.filter((user) => user.accessStatus === "APPROVED").length,
      pending: advertisers.filter((user) => user.accessStatus === "PENDING").length,
      suspended: advertisers.filter((user) => user.accessStatus === "SUSPENDED").length,
      pendingListings: products.filter((product) => product.status === "PENDING").length,
      pendingQaListings: products.filter((product) => product.qaStatus === "PENDING").length
    },
    advertisers: advertisers.map(sanitizeUser),
    products: products.map(mapProduct),
    bookings: bookings.map(mapBooking),
    risk: riskSummary,
    contentBlocks,
    promoCampaigns,
    referralCodes,
    analytics: analyticsSummary,
    recentAuditLogs: auditLogs
  };
}

export async function updateAdvertiserAccess(
  actorUserId: string,
  userId: string,
  accessStatus: AccessStatus
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { accessStatus }
  });

  await createAuditLog(actorUserId, "ADVERTISER_ACCESS_UPDATED", {
    targetType: "USER",
    targetId: userId,
    details: { accessStatus }
  });

  return sanitizeUser(user);
}

export async function updateProductStatus(
  actorUserId: string,
  productId: string,
  status: ListingStatus
) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: { status },
    include: productIncludes()
  });

  await createAuditLog(actorUserId, "PRODUCT_STATUS_UPDATED", {
    targetType: "PRODUCT",
    targetId: productId,
    details: { status }
  });

  return mapProduct(product);
}

export async function updateProductQaStatus(
  actorUserId: string,
  productId: string,
  input: { qaStatus: QaStatus; qaNotes: string }
) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      qaStatus: input.qaStatus,
      qaNotes: input.qaNotes,
      qaCheckedAt: new Date()
    },
    include: productIncludes()
  });

  await createAuditLog(actorUserId, "PRODUCT_QA_UPDATED", {
    targetType: "PRODUCT",
    targetId: productId,
    details: { qaStatus: input.qaStatus }
  });

  return mapProduct(product);
}

export async function createContentBlock(
  actorUserId: string,
  input: { key: string; title: string; body: string; type: ContentType; isPublished: boolean | null }
) {
  const block = await prisma.contentBlock.create({
    data: {
      key: input.key,
      title: input.title,
      body: input.body,
      type: input.type,
      isPublished: input.isPublished ?? true
    }
  });

  await createAuditLog(actorUserId, "CONTENT_BLOCK_CREATED", {
    targetType: "CONTENT_BLOCK",
    targetId: block.id,
    details: { key: block.key }
  });

  return block;
}

export async function updateContentBlock(
  actorUserId: string,
  contentId: string,
  input: { title: string; body: string; type: ContentType; isPublished: boolean | null }
) {
  const block = await prisma.contentBlock.update({
    where: { id: contentId },
    data: {
      title: input.title,
      body: input.body,
      type: input.type,
      isPublished: input.isPublished ?? true
    }
  });

  await createAuditLog(actorUserId, "CONTENT_BLOCK_UPDATED", {
    targetType: "CONTENT_BLOCK",
    targetId: block.id
  });

  return block;
}

export async function createPromoCampaign(
  actorUserId: string,
  input: {
    code: string;
    description: string;
    discountType: DiscountType;
    value: number;
    startsAt: Date;
    endsAt: Date;
    minOrderAmount: number | null;
    usageLimit: number | null;
    isActive: boolean | null;
  }
) {
  const campaign = await prisma.promoCampaign.create({
    data: {
      code: input.code,
      description: input.description,
      discountType: input.discountType,
      value: input.value,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      minOrderAmount: input.minOrderAmount ?? null,
      usageLimit: input.usageLimit ?? null,
      isActive: input.isActive ?? true
    }
  });

  await createAuditLog(actorUserId, "PROMO_CREATED", {
    targetType: "PROMO_CAMPAIGN",
    targetId: campaign.id,
    details: { code: campaign.code }
  });

  return campaign;
}

export async function createReferralCode(
  actorUserId: string,
  input: { code: string; rewardAmount: number; isActive: boolean | null }
) {
  const referral = await prisma.referralCode.create({
    data: {
      code: input.code,
      rewardAmount: input.rewardAmount,
      isActive: input.isActive ?? true
    }
  });

  await createAuditLog(actorUserId, "REFERRAL_CREATED", {
    targetType: "REFERRAL_CODE",
    targetId: referral.id,
    details: { code: referral.code }
  });

  return referral;
}

export async function recordAnalyticsEvent(input: {
  eventType: AnalyticsEventType;
  sessionId?: string;
  customerId?: string;
  productId?: string;
  metadata: Record<string, unknown> | null;
}) {
  return prisma.analyticsEvent.create({
    data: {
      eventType: input.eventType,
      sessionId: input.sessionId || null,
      customerId: input.customerId || null,
      productId: input.productId || null,
      metadata: input.metadata ?? null
    }
  });
}

export async function updateBookingStatus(
  actorUserId: string,
  bookingId: string,
  status: BookingStatus
) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: bookingIncludes()
  });

  await createShipmentEvent(
    booking.id,
    status,
    `${booking.product.name} is now ${formatStatus(status).toLowerCase()}.`
  );

  await createAuditLog(actorUserId, "BOOKING_STATUS_UPDATED", {
    targetType: "BOOKING",
    targetId: booking.id,
    details: { status }
  });

  await createNotification(
    booking.customerId,
    "Shipment update",
    `${booking.product.name} is now ${formatStatus(status).toLowerCase()}.`
  );

  return mapBooking(booking);
}

export async function scheduleReturnPickup(
  actorUserId: string,
  bookingId: string,
  returnScheduledAt?: string
) {
  const scheduleDate = returnScheduledAt ? new Date(returnScheduledAt) : null;
  if (returnScheduledAt && Number.isNaN(scheduleDate?.getTime())) {
    throw new ApiError(400, "returnScheduledAt must be a valid date.");
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      shipment: {
        update: {
          returnScheduledAt: scheduleDate
        }
      }
    },
    include: bookingIncludes()
  });

  await createShipmentEvent(
    booking.id,
    "RETURN_PICKUP",
    scheduleDate
      ? `Return pickup scheduled for ${scheduleDate.toISOString().slice(0, 10)}.`
      : "Return pickup schedule cleared."
  );

  await createAuditLog(actorUserId, "RETURN_PICKUP_SCHEDULED", {
    targetType: "BOOKING",
    targetId: booking.id,
    details: { returnScheduledAt: scheduleDate?.toISOString() ?? null }
  });

  return mapBooking(booking);
}

function productIncludes() {
  return {
    images: { orderBy: { sortOrder: "asc" as const } },
    reviews: true,
    ownerUser: true,
    availabilityBlocks: true,
    pricingRules: true
  };
}

function bookingIncludes() {
  return {
    product: { include: productIncludes() },
    customer: true,
    payment: true,
    shipment: true,
    review: true,
    shipmentEvents: { orderBy: { occurredAt: "asc" as const } }
  };
}

async function createCustomerSession(customerId: string) {
  const token = createSessionToken();
  await prisma.customerSession.create({
    data: {
      token: hashSessionToken(token),
      expiresAt: expiresAt(),
      customerId
    }
  });

  return token;
}

async function createNotification(customerId: string, title: string, message: string) {
  return prisma.notification.create({
    data: {
      customerId,
      title,
      message
    }
  });
}

async function createShipmentEvent(
  bookingId: string,
  status: BookingStatus,
  message: string
) {
  return prisma.shipmentEvent.create({
    data: {
      bookingId,
      status,
      message
    }
  });
}

async function createAuditLog(
  actorUserId: string | null,
  action: string,
  options: {
    targetType: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  return prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      targetType: options.targetType,
      targetId: options.targetId ?? null,
      details: options.details ?? null,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null
    }
  });
}

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

function sanitizeCustomer(customer: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
}) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt
  };
}

function mapProduct(product: {
  id: string;
  name: string;
  city: string;
  category: Category;
  dailyRate: number;
  deposit: number;
  owner: string;
  ownerId?: string | null;
  condition: ProductCondition;
  description: string;
  tags: string[];
  status: ListingStatus;
  qaStatus: QaStatus;
  qaNotes?: string | null;
  leadTimeDays: number;
  bufferDays: number;
  minPhotoCount: number;
  createdAt: Date;
  updatedAt: Date;
  images?: Array<{ url: string; qualityScore: number; autoTags: string[]; isPrimary: boolean }>;
  reviews?: Array<{ rating: number; conditionNote?: string | null }>;
  ownerUser?: { isVerifiedHost: boolean } | null;
  availabilityBlocks?: Array<{ id: string; startDate: Date; endDate: Date; reason: string | null }>;
  pricingRules?: Array<{
    id: string;
    label: string;
    type: PricingRuleType;
    multiplier: number | null;
    fixedDailyRate: number | null;
    startDate: Date | null;
    endDate: Date | null;
    daysOfWeek: DayOfWeek[];
    demandThreshold: number | null;
    isActive: boolean;
  }>;
}) {
  const reviews = product.reviews ?? [];
  const averageRating =
    reviews.length === 0
      ? 0
      : reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  const damageReports = reviews.filter((review) => review.conditionNote?.trim()).length;
  const imageStats = buildImageStats(product.images ?? [], product.minPhotoCount);

  return {
    ...product,
    images: product.images?.map((image) => image.url) ?? [],
    imageDetails:
      product.images?.map((image) => ({
        url: image.url,
        qualityScore: image.qualityScore,
        autoTags: image.autoTags,
        isPrimary: image.isPrimary
      })) ?? [],
    qaNotes: product.qaNotes ?? "",
    hostVerified: product.ownerUser?.isVerifiedHost ?? false,
    damageReports,
    photoQuality: imageStats,
    availabilityBlocks: product.availabilityBlocks?.map(mapAvailabilityBlock) ?? [],
    pricingRules: product.pricingRules?.map(mapPricingRule) ?? [],
    averageRating,
    reviewCount: reviews.length
  };
}

function mapBooking(booking: {
  id: string;
  productId: string;
  customerId: string;
  dailyRate: number;
  deposit: number;
  totalAmount: number;
  status: BookingStatus;
  promoCode?: string | null;
  discountAmount?: number | null;
  priceBreakdown?: unknown | null;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; name: string; category: Category; dailyRate: number; deposit: number };
  customer: { fullName: string; email: string; phone: string };
  payment: { method: string; reference: string; amount: number; status: string } | null;
  shipment: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    shipmentDate: Date;
    rentalStartDate: Date;
    rentalEndDate: Date;
    deliveryInstructions: string | null;
    conditionPhotoUrl: string | null;
    returnScheduledAt?: Date | null;
    trackingCode: string;
  } | null;
  shipmentEvents?: Array<{ status: BookingStatus; message: string; occurredAt: Date }>;
}) {
  return {
    id: booking.id,
    productId: booking.productId,
    productName: booking.product.name,
    productCategory: booking.product.category,
    dailyRate: booking.dailyRate,
    deposit: booking.deposit,
    promoCode: booking.promoCode ?? "",
    discountAmount: booking.discountAmount ?? 0,
    priceBreakdown: booking.priceBreakdown ?? null,
    customerName: booking.customer.fullName,
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,
    status: booking.status,
    paymentStatus: booking.payment?.status ?? "PAID",
    trackingCode: booking.shipment?.trackingCode ?? "",
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    payment: booking.payment,
    trackingEvents:
      booking.shipmentEvents?.map((event) => ({
        status: event.status,
        message: event.message,
        occurredAt: toDateInput(event.occurredAt)
      })) ?? [],
    shippingDetails: {
      addressLine1: booking.shipment?.addressLine1 ?? "",
      addressLine2: booking.shipment?.addressLine2 ?? "",
      city: booking.shipment?.city ?? "",
      state: booking.shipment?.state ?? "",
      postalCode: booking.shipment?.postalCode ?? "",
      shipmentDate: toDateInput(booking.shipment?.shipmentDate),
      rentalStartDate: toDateInput(booking.shipment?.rentalStartDate),
      rentalEndDate: toDateInput(booking.shipment?.rentalEndDate),
      deliveryInstructions: booking.shipment?.deliveryInstructions ?? "",
      conditionPhotoUrl: booking.shipment?.conditionPhotoUrl ?? "",
      returnScheduledAt: toDateInput(booking.shipment?.returnScheduledAt),
      paymentMethod: booking.payment?.method ?? "",
      paymentReference: booking.payment?.reference ?? ""
    }
  };
}

function normalizeCategory(category: string): Category {
  const allowedCategories = [
    "Furniture",
    "Appliances",
    "Fashion",
    "Ceremony",
    "Electronics"
  ] as const;

  return allowedCategories.includes(category as Category) ? (category as Category) : "Furniture";
}

function expiresAt() {
  return new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);
}

function getRentalDays(startDate: Date, endDate: Date) {
  if (endDate <= startDate) {
    return 1;
  }

  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));
}

function toDateInput(value: Date | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(" ");
}

function mapAvailabilityBlock(block: {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
}) {
  return {
    id: block.id,
    startDate: toDateInput(block.startDate),
    endDate: toDateInput(block.endDate),
    reason: block.reason ?? ""
  };
}

function mapPricingRule(rule: {
  id: string;
  label: string;
  type: PricingRuleType;
  multiplier: number | null;
  fixedDailyRate: number | null;
  startDate: Date | null;
  endDate: Date | null;
  daysOfWeek: DayOfWeek[];
  demandThreshold: number | null;
  isActive: boolean;
}) {
  return {
    id: rule.id,
    label: rule.label,
    type: rule.type,
    multiplier: rule.multiplier,
    fixedDailyRate: rule.fixedDailyRate,
    startDate: toDateInput(rule.startDate ?? undefined),
    endDate: toDateInput(rule.endDate ?? undefined),
    daysOfWeek: rule.daysOfWeek,
    demandThreshold: rule.demandThreshold,
    isActive: rule.isActive
  };
}

function buildImageStats(
  images: Array<{ qualityScore: number }>,
  minPhotoCount: number
) {
  if (images.length === 0) {
    return {
      photoCount: 0,
      averageScore: 0,
      minScore: 0,
      meetsMinimum: false
    };
  }

  const scores = images.map((image) => image.qualityScore);
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const minScore = Math.min(...scores);

  return {
    photoCount: images.length,
    averageScore,
    minScore,
    meetsMinimum: images.length >= minPhotoCount && minScore >= 60
  };
}

function assessPhotoQuality(imageUrls: string[], minPhotoCount: number) {
  if (imageUrls.length < minPhotoCount) {
    return `Add at least ${minPhotoCount} photos to meet the listing standard.`;
  }

  const scores = imageUrls.map((url) => inferQualityScore(url));
  if (Math.min(...scores) < 60) {
    return "Some images appear low resolution. Upload clearer photos.";
  }

  return "";
}

function inferQualityScore(url: string) {
  const widthMatch = url.match(/w=(\d+)/);
  const qualityMatch = url.match(/q=(\d+)/);
  const width = widthMatch ? Number(widthMatch[1]) : 0;
  const quality = qualityMatch ? Number(qualityMatch[1]) : 0;
  let score = 50;

  if (width >= 1200) {
    score += 30;
  } else if (width >= 900) {
    score += 20;
  }

  if (quality >= 80) {
    score += 15;
  } else if (quality >= 60) {
    score += 5;
  }

  return Math.min(100, score);
}

function buildImageTags(
  name: string,
  tags: string[],
  category: Category,
  url: string
) {
  const baseTags = new Set<string>([...tags, category.toLowerCase()]);
  const nameTokens = name
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length > 3)
    .slice(0, 2);

  for (const token of nameTokens) {
    baseTags.add(token);
  }

  if (url.includes("w=1200") || url.includes("w=1400")) {
    baseTags.add("hires");
  }

  return Array.from(baseTags).slice(0, 8);
}

function enforceLeadTime(leadTimeDays: number, rentalStartDate: Date) {
  const earliest = addDays(new Date(), leadTimeDays);
  const earliestDay = new Date(earliest.toDateString());
  if (rentalStartDate < earliestDay) {
    throw new ApiError(409, `Please book at least ${leadTimeDays} days in advance.`);
  }
}

function ensureNoAvailabilityBlocks(
  blocks: Array<{ startDate: Date; endDate: Date }>,
  shipment: { rentalStartDate: Date; rentalEndDate: Date }
) {
  const conflict = blocks.some((block) =>
    block.startDate <= shipment.rentalEndDate && block.endDate >= shipment.rentalStartDate
  );

  if (conflict) {
    throw new ApiError(409, "Selected dates overlap a host blackout window.");
  }
}

async function calculateBookingPricing(
  product: {
    id: string;
    dailyRate: number;
    deposit: number;
    pricingRules: Array<{
      label: string;
      type: PricingRuleType;
      multiplier: number | null;
      fixedDailyRate: number | null;
      startDate: Date | null;
      endDate: Date | null;
      daysOfWeek: DayOfWeek[];
      demandThreshold: number | null;
      isActive: boolean;
    }>;
  },
  shipment: { rentalStartDate: Date; rentalEndDate: Date },
  promoCode?: string
) {
  const days = getRentalDays(shipment.rentalStartDate, shipment.rentalEndDate);
  const demandMultiplier = await resolveDemandMultiplier(product.id, product.pricingRules);
  const dailyRates: number[] = [];
  const appliedRules: Array<{ date: string; labels: string[] }> = [];

  for (let index = 0; index < days; index += 1) {
    const date = addDays(shipment.rentalStartDate, index);
    const applicable = product.pricingRules.filter((rule) =>
      rule.isActive && isRuleApplicable(rule, date)
    );

    let rate = product.dailyRate;
    const fixedRates = applicable
      .map((rule) => rule.fixedDailyRate)
      .filter((value): value is number => typeof value === "number" && value > 0);

    if (fixedRates.length > 0) {
      rate = Math.max(...fixedRates);
    }

    const multiplier = applicable
      .map((rule) => rule.multiplier)
      .filter((value): value is number => typeof value === "number" && value > 0)
      .reduce((total, value) => total * value, 1);

    const finalRate = Math.round(rate * multiplier * demandMultiplier);
    dailyRates.push(finalRate);
    appliedRules.push({
      date: toDateInput(date),
      labels: applicable.map((rule) => rule.label)
    });
  }

  const subtotal = dailyRates.reduce((sum, value) => sum + value, 0);
  const promo = await resolvePromoCampaign(promoCode, subtotal);
  const discountAmount = promo.discountAmount;
  const totalAmount = subtotal + product.deposit - discountAmount;

  return {
    averageDailyRate: Math.round(subtotal / days),
    subtotal,
    discountAmount,
    promoCode: promo.promoCode,
    promoCampaignId: promo.campaignId,
    totalAmount,
    priceBreakdown: {
      baseDailyRate: product.dailyRate,
      dailyRates,
      appliedRules,
      subtotal,
      discountAmount,
      promoCode: promo.promoCode,
      deposit: product.deposit,
      totalAmount
    }
  };
}

function isRuleApplicable(rule: {
  type: PricingRuleType;
  startDate: Date | null;
  endDate: Date | null;
  daysOfWeek: DayOfWeek[];
}, date: Date) {
  if (rule.type === "SEASONAL") {
    if (!rule.startDate || !rule.endDate) {
      return false;
    }

    return date >= rule.startDate && date <= rule.endDate;
  }

  if (rule.type === "WEEKEND" || rule.type === "WEEKDAY") {
    const dayKey = toDayOfWeek(date);
    if (rule.daysOfWeek.length > 0) {
      return rule.daysOfWeek.includes(dayKey);
    }

    const isWeekend = dayKey === "SAT" || dayKey === "SUN";
    return rule.type === "WEEKEND" ? isWeekend : !isWeekend;
  }

  return rule.type === "DEMAND";
}

async function resolveDemandMultiplier(
  productId: string,
  rules: Array<{ type: PricingRuleType; demandThreshold: number | null; multiplier: number | null }>
) {
  const demandRules = rules.filter((rule) => rule.type === "DEMAND" && rule.multiplier);
  if (demandRules.length === 0) {
    return 1;
  }

  const cutoff = addDays(new Date(), -30);
  const recentBookings = await prisma.booking.count({
    where: {
      productId,
      createdAt: { gte: cutoff }
    }
  });

  const activeMultiplier = demandRules.reduce((value, rule) => {
    const threshold = rule.demandThreshold ?? 0;
    if (recentBookings >= threshold) {
      return Math.max(value, rule.multiplier ?? 1);
    }

    return value;
  }, 1);

  return activeMultiplier;
}

async function resolvePromoCampaign(promoCode: string | undefined, subtotal: number) {
  if (!promoCode) {
    return { discountAmount: 0, promoCode: null, campaignId: null };
  }

  const code = promoCode.toUpperCase();
  const campaign = await prisma.promoCampaign.findFirst({
    where: {
      code,
      isActive: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() }
    }
  });

  if (!campaign) {
    throw new ApiError(400, "Promo code is invalid or expired.");
  }

  if (campaign.usageLimit && campaign.usedCount >= campaign.usageLimit) {
    throw new ApiError(400, "Promo code has reached its usage limit.");
  }

  if (campaign.minOrderAmount && subtotal < campaign.minOrderAmount) {
    throw new ApiError(400, "Promo code minimum order is not met.");
  }

  const discountAmount =
    campaign.discountType === "PERCENT"
      ? Math.min(subtotal, Math.round((subtotal * campaign.value) / 100))
      : Math.min(subtotal, campaign.value);

  return { discountAmount, promoCode: campaign.code, campaignId: campaign.id };
}

function addDays(date: Date, offset: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
}

function toDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][day] as DayOfWeek;
}

function buildRiskSummary(
  products: Array<{ id: string; name: string; reviews?: Array<{ conditionNote?: string | null }> }>,
  bookings: Array<{ id: string; status: BookingStatus; totalAmount: number; product: { name: string } }>
) {
  const damageRank = products
    .map((product) => ({
      productId: product.id,
      name: product.name,
      damageReports: (product.reviews ?? []).filter((review) => review.conditionNote?.trim()).length
    }))
    .filter((item) => item.damageReports > 0)
    .sort((a, b) => b.damageReports - a.damageReports)
    .slice(0, 4);

  const cancelledBookings = bookings.filter((booking) => booking.status === "CANCELLED");
  const suspiciousOrders = bookings
    .filter((booking) => booking.totalAmount > 10000)
    .slice(0, 4)
    .map((booking) => ({
      bookingId: booking.id,
      productName: booking.product.name,
      totalAmount: booking.totalAmount,
      reason: "High order value"
    }));

  return {
    cancelledBookings: cancelledBookings.length,
    highDamageListings: damageRank,
    suspiciousOrders
  };
}

function buildAnalyticsSummary(
  events: Array<{ eventType: AnalyticsEventType; sessionId: string | null }>,
  bookings: Array<{ totalAmount: number; shipment?: { rentalStartDate: Date; rentalEndDate: Date } | null }>,
  customers: Array<{ bookings: Array<{ id: string }> }>,
  productCount: number
) {
  const productViews = events.filter((event) => event.eventType === "PRODUCT_VIEW").length;
  const checkoutStarts = events.filter((event) => event.eventType === "CHECKOUT_START").length;
  const bookingCompletions = events.filter((event) => event.eventType === "BOOKING_COMPLETE").length;
  const totalSessions = new Set(events.map((event) => event.sessionId).filter(Boolean)).size;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
  const customersWithBookings = customers.filter((customer) => customer.bookings.length > 0);
  const repeatCustomers = customersWithBookings.filter((customer) => customer.bookings.length > 1);
  const retentionRate =
    customersWithBookings.length === 0
      ? 0
      : Math.round((repeatCustomers.length / customersWithBookings.length) * 100);
  const averageLtv =
    customersWithBookings.length === 0
      ? 0
      : Math.round(totalRevenue / customersWithBookings.length);
  const bookedDays = bookings.reduce((sum, booking) => {
    if (!booking.shipment) {
      return sum;
    }
    return sum + getRentalDays(booking.shipment.rentalStartDate, booking.shipment.rentalEndDate);
  }, 0);
  const utilizationRate =
    productCount === 0 ? 0 : Math.round((bookedDays / (productCount * 30)) * 100);

  return {
    totalSessions,
    productViews,
    checkoutStarts,
    bookingCompletions,
    conversionRate: productViews === 0 ? 0 : Math.round((bookingCompletions / productViews) * 100),
    retentionRate,
    averageLtv,
    utilizationRate
  };
}
