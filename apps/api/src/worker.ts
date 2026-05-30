// Kafka worker for async events and audit logs (run via dev:worker).
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./database/prisma.js";
import type { Prisma } from "@prisma/client";
import { createConsumer, isKafkaEnabled } from "./kafka/kafkaClient.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDirectory, "../.env") });

const originalSetTimeout = global.setTimeout;
global.setTimeout = ((handler: Parameters<typeof setTimeout>[0], timeout?: number, ...args: Parameters<typeof setTimeout>[2][]) =>
  originalSetTimeout(handler, Math.max(0, Number(timeout) || 0), ...args)) as typeof setTimeout;

const groupId = process.env.KAFKA_GROUP_ID ?? "rento-worker";
const topics = ["booking-events", "qa-events", "admin-events", "analytics-events"];

if (!isKafkaEnabled()) {
  console.warn("Kafka is not configured. Set KAFKA_BROKERS to enable the worker.");
  process.exit(0);
}

const consumer = createConsumer(groupId);

async function start() {
  await consumer.connect();

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString();
      if (!raw) {
        return;
      }

      let event: { type?: string; payload?: Record<string, unknown> };
      try {
        event = JSON.parse(raw);
      } catch {
        console.warn("Kafka message is not valid JSON", { topic });
        return;
      }

      const type = event.type ?? "UNKNOWN";
      const payload = event.payload ?? {};

      if (topic === "booking-events") {
        await handleBookingEvent(type, payload);
        return;
      }

      if (topic === "qa-events" || topic === "admin-events") {
        await createAuditLog("KAFKA_EVENT", {
          action: type,
          details: payload
        });
        return;
      }

      if (topic === "analytics-events") {
        await createAuditLog("KAFKA_ANALYTICS", {
          action: type,
          details: payload
        });
      }
    }
  });

  console.log(`Kafka worker running. Topics: ${topics.join(", ")}`);
}

async function handleBookingEvent(type: string, payload: Record<string, unknown>) {
  if (type === "BOOKING_CREATED") {
    const customerId = payload.customerId as string | undefined;
    const productName = payload.productName as string | undefined;

    if (customerId && productName) {
      await prisma.notification.create({
        data: {
          customerId,
          title: "Order received",
          message: `We received your booking for ${productName}.`
        }
      });
    }

    await createAuditLog("KAFKA_BOOKING", { action: type, details: payload });
    return;
  }

  if (type === "BOOKING_STATUS_UPDATED") {
    await createAuditLog("KAFKA_BOOKING", { action: type, details: payload });
    return;
  }

  if (type === "RETURN_PICKUP_SCHEDULED") {
    await createAuditLog("KAFKA_BOOKING", { action: type, details: payload });
  }
}

async function createAuditLog(
  category: string,
  data: { action: string; details: Record<string, unknown> }
) {
  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: `${category}:${data.action}`,
      targetType: "KAFKA_EVENT",
      details: data.details as Prisma.InputJsonValue
    }
  });
}

async function shutdown() {
  await consumer.disconnect();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void start().catch(async (error) => {
  console.error("Kafka worker failed:", error);
  await shutdown();
  process.exit(1);
});
