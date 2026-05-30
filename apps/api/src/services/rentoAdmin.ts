// Admin dashboard data and admin workflows for approvals and content.
import type { AccessStatus, ContentType, DiscountType, ListingStatus, QaStatus } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { buildEvent } from "../kafka/events.js";
import {
  bookingIncludes,
  buildAnalyticsSummary,
  buildRiskSummary,
  createAuditLog,
  emitEvent,
  mapBooking,
  mapProduct,
  productIncludes,
  sanitizeUser
} from "./rentoHelpers.js";

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

  void emitEvent(
    "admin-events",
    userId,
    buildEvent("ADVERTISER_ACCESS_UPDATED", {
      userId,
      accessStatus
    })
  );

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

  void emitEvent(
    "admin-events",
    productId,
    buildEvent("PRODUCT_STATUS_UPDATED", {
      productId,
      status
    })
  );

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

  void emitEvent(
    "qa-events",
    productId,
    buildEvent("PRODUCT_QA_UPDATED", {
      productId,
      qaStatus: input.qaStatus,
      qaNotes: input.qaNotes
    })
  );

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

  void emitEvent(
    "admin-events",
    block.id,
    buildEvent("CONTENT_BLOCK_CREATED", {
      contentId: block.id,
      key: block.key,
      type: block.type
    })
  );

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

  void emitEvent(
    "admin-events",
    block.id,
    buildEvent("CONTENT_BLOCK_UPDATED", {
      contentId: block.id,
      key: block.key,
      type: block.type
    })
  );

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

  void emitEvent(
    "admin-events",
    campaign.id,
    buildEvent("PROMO_CREATED", {
      promoId: campaign.id,
      code: campaign.code,
      discountType: campaign.discountType
    })
  );

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

  void emitEvent(
    "admin-events",
    referral.id,
    buildEvent("REFERRAL_CREATED", {
      referralId: referral.id,
      code: referral.code,
      rewardAmount: referral.rewardAmount
    })
  );

  return referral;
}
