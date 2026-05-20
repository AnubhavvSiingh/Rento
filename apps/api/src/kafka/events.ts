// Shared Kafka event envelope helpers.
import crypto from "node:crypto";

export type EventEnvelope<T> = {
  eventId: string;
  type: string;
  occurredAt: string;
  payload: T;
};

export function buildEvent<T>(type: string, payload: T): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload
  };
}
