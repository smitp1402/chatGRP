// Next.js loads this once per server runtime at boot. It picks the matching
// Sentry config and hooks the request-error callback so server-side failures
// in route handlers and server components are reported with request context.
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config")
}

export const onRequestError = Sentry.captureRequestError
