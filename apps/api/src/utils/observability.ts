// Sentry observability hooks used by the API server.
import * as Sentry from "@sentry/node";

export function initObservability() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1
  });
}

export function captureError(error: unknown, context: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, { extra: context });
}
