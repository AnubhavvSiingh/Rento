// Booking creation and shipment workflow services.
import type { BookingStatus } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { buildEvent } from "../kafka/events.js";
import { createTrackingCode } from "../utils/tokens.js";
import {
  bookingIncludes,
  addDays,
  calculateBookingPricing,
  createAuditLog,
  createNotification,
  createShipmentEvent,
  emitEvent,
  ensureNoAvailabilityBlocks,
  enforceLeadTime,
  formatStatus,
  mapBooking
} from "./rentoHelpers.js";

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

  void emitEvent(
    "booking-events",
    booking.id,
    buildEvent("BOOKING_CREATED", {
      bookingId: booking.id,
      productId: booking.productId,
      productName: booking.product.name,
      customerId: booking.customerId,
      status: booking.status,
      totalAmount: booking.totalAmount,
      trackingCode: booking.shipment?.trackingCode ?? "",
      rentalStartDate: booking.shipment?.rentalStartDate ?? null,
      rentalEndDate: booking.shipment?.rentalEndDate ?? null
    })
  );

  return mapBooking(booking);
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

  void emitEvent(
    "booking-events",
    booking.id,
    buildEvent("BOOKING_STATUS_UPDATED", {
      bookingId: booking.id,
      productId: booking.productId,
      status
    })
  );

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

  void emitEvent(
    "booking-events",
    booking.id,
    buildEvent("RETURN_PICKUP_SCHEDULED", {
      bookingId: booking.id,
      returnScheduledAt: scheduleDate?.toISOString() ?? null
    })
  );

  return mapBooking(booking);
}
