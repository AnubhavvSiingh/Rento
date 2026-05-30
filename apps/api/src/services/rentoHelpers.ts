// Shared helpers for service modules: sessions, mappings, pricing, and audit logging.
import type {
  AccessStatus,
  AnalyticsEventType,
  BookingStatus,
  Category,
  DayOfWeek,
  ListingStatus,
  PricingRuleType,
  ProductCondition,
  QaStatus,
  UserRole
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { publishEvent } from "../kafka/kafkaClient.js";
import { createSessionToken, hashSessionToken } from "../utils/tokens.js";

const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);

export function productIncludes() {
  return {
    images: { orderBy: { sortOrder: "asc" as const } },
    reviews: true,
    ownerUser: true,
    availabilityBlocks: true,
    pricingRules: true
  };
}

export function bookingIncludes() {
  return {
    product: { include: productIncludes() },
    customer: true,
    payment: true,
    shipment: true,
    review: true,
    shipmentEvents: { orderBy: { occurredAt: "asc" as const } }
  };
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      token: hashSessionToken(token),
      expiresAt: expiresAt(),
      userId
    }
  });

  return token;
}

export async function createCustomerSession(customerId: string) {
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

export async function revokeUserSession(token: string) {
  await prisma.session.deleteMany({
    where: { token: hashSessionToken(token) }
  });
}

export async function revokeCustomerSession(token: string) {
  await prisma.customerSession.deleteMany({
    where: { token: hashSessionToken(token) }
  });
}

export async function createNotification(customerId: string, title: string, message: string) {
  return prisma.notification.create({
    data: {
      customerId,
      title,
      message
    }
  });
}

export async function createShipmentEvent(
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

export async function createAuditLog(
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
      details: options.details ? (options.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null
    }
  });
}

export async function emitEvent(topic: string, key: string, payload: unknown) {
  try {
    await publishEvent(topic, key, payload);
  } catch (error) {
    console.warn("Kafka publish failed:", { topic, key, error });
  }
}

export function sanitizeUser(user: {
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

export function sanitizeCustomer(customer: {
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

export function mapProduct(product: {
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

export function mapPublicProduct(product: Parameters<typeof mapProduct>[0]) {
  const mapped = mapProduct(product);
  return {
    id: mapped.id,
    name: mapped.name,
    city: mapped.city,
    category: mapped.category,
    dailyRate: mapped.dailyRate,
    deposit: mapped.deposit,
    description: mapped.description,
    condition: mapped.condition,
    tags: mapped.tags,
    status: mapped.status,
    qaStatus: mapped.qaStatus,
    leadTimeDays: mapped.leadTimeDays,
    bufferDays: mapped.bufferDays,
    images: mapped.images,
    hostVerified: mapped.hostVerified,
    damageReports: mapped.damageReports,
    photoQuality: mapped.photoQuality,
    averageRating: mapped.averageRating,
    reviewCount: mapped.reviewCount,
    pricingRulesCount: mapped.pricingRules?.length ?? 0
  };
}

export function mapBooking(booking: {
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

export function normalizeCategory(category: string): Category {
  const allowedCategories = [
    "Furniture",
    "Appliances",
    "Fashion",
    "Ceremony",
    "Electronics"
  ] as const;

  return allowedCategories.includes(category as Category) ? (category as Category) : "Furniture";
}

export function expiresAt() {
  return new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);
}

export function getRentalDays(startDate: Date, endDate: Date) {
  if (endDate <= startDate) {
    return 1;
  }

  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));
}

export function toDateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function formatStatus(status: string) {
  return status
    .split("_")
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(" ");
}

export function mapAvailabilityBlock(block: {
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

export function mapPricingRule(rule: {
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

export function buildImageStats(
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

export function assessPhotoQuality(imageUrls: string[], minPhotoCount: number) {
  if (imageUrls.length < minPhotoCount) {
    return `Add at least ${minPhotoCount} photos to meet the listing standard.`;
  }

  const scores = imageUrls.map((url) => inferQualityScore(url));
  if (Math.min(...scores) < 60) {
    return "Some images appear low resolution. Upload clearer photos.";
  }

  return "";
}

export function inferQualityScore(url: string) {
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

export function buildImageTags(
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

export function enforceLeadTime(leadTimeDays: number, rentalStartDate: Date) {
  const earliest = addDays(new Date(), leadTimeDays);
  const earliestDay = new Date(earliest.toDateString());
  if (rentalStartDate < earliestDay) {
    throw new ApiError(409, `Please book at least ${leadTimeDays} days in advance.`);
  }
}

export function ensureNoAvailabilityBlocks(
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

export async function calculateBookingPricing(
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

export function isRuleApplicable(
  rule: {
    type: PricingRuleType;
    startDate: Date | null;
    endDate: Date | null;
    daysOfWeek: DayOfWeek[];
  },
  date: Date
) {
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

export async function resolveDemandMultiplier(
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

export async function resolvePromoCampaign(promoCode: string | undefined, subtotal: number) {
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

export function addDays(date: Date, offset: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
}

export function toDayOfWeek(date: Date): DayOfWeek {
  const day = date.getDay();
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][day] as DayOfWeek;
}

export function buildRiskSummary(
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

export function buildAnalyticsSummary(
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
