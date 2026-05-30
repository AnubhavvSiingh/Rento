// Analytics event persistence and Kafka emission.
import type { AnalyticsEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { buildEvent } from "../kafka/events.js";
import { emitEvent } from "./rentoHelpers.js";

export async function recordAnalyticsEvent(input: {
  eventType: AnalyticsEventType;
  sessionId?: string;
  customerId?: string;
  productId?: string;
  metadata: Record<string, unknown> | null;
}) {
  const event = await prisma.analyticsEvent.create({
    data: {
      eventType: input.eventType,
      sessionId: input.sessionId || null,
      customerId: input.customerId || null,
      productId: input.productId || null,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
    }
  });

  void emitEvent(
    "analytics-events",
    event.id,
    buildEvent("ANALYTICS_RECORDED", {
      eventId: event.id,
      eventType: event.eventType,
      sessionId: event.sessionId,
      productId: event.productId
    })
  );

  return event;
}
