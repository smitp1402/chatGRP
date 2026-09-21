/**
 * Shared Sentry options for the browser, Node and edge runtimes.
 *
 * Everything is keyed off NEXT_PUBLIC_SENTRY_DSN: unset means the SDK is
 * constructed but disabled, so local dev and preview builds without a DSN
 * send nothing and cost nothing. Browser reports post directly to
 * *.sentry.io, which next.config.ts allows in the CSP's connect-src.
 */

export interface SentryOptions {
  dsn: string | undefined
  enabled: boolean
  environment: string
  tracesSampleRate: number
  sendDefaultPii: boolean
}

export function sentryOptions(
  dsn: string | undefined,
  vercelEnv: string | undefined,
): SentryOptions {
  const trimmed = dsn?.trim()
  return {
    dsn: trimmed || undefined,
    enabled: Boolean(trimmed),
    // Vercel sets VERCEL_ENV to production | preview | development.
    environment: vercelEnv || "development",
    // 10% of transactions is enough to see p95 latency without paying for all of it.
    tracesSampleRate: 0.1,
    // Never attach IPs, cookies or headers by default; user id is set explicitly.
    sendDefaultPii: false,
  }
}
