import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV === "development";

/**
 * Origin of an env-provided URL, or of the fallback when the value is unset,
 * blank, or not a URL. This runs at build time: a bad value must degrade to
 * a wrong CSP entry (visible in the browser console), never abort the build.
 */
export function safeOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

// Evaluated once, during `next build`, and written into the routes manifest.
// Changing these env vars without a rebuild (e.g. "promote" of an old build)
// leaves the old origins in the CSP and the browser silently blocks fetches.
const aiOrigin = safeOrigin(process.env.NEXT_PUBLIC_AI_URL, "http://localhost:8000");
const posthogOrigin = safeOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST, "https://us.i.posthog.com");

/**
 * Content Security Policy — one entry per service the browser contacts.
 *
 * 'unsafe-inline' on script-src is the cost of not running nonce-based CSP,
 * which would force every page dynamic. It still blocks scripts from any
 * origin not listed, which is the part that matters against injection.
 * 'unsafe-eval' is dev-only (React Refresh needs it).
 */
const csp = [
  "default-src 'self'",
  // posthog-js is bundled from npm but lazy-loads recorder/survey assets from
  // <region>-assets.i.posthog.com; the wildcard matches any label depth.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  // Attachment thumbnails are signed Supabase storage URLs; data:/blob: for
  // local previews before upload.
  "img-src 'self' data: blob: https://*.supabase.co",
  // next/font self-hosts Google fonts, so no fonts.gstatic.com.
  "font-src 'self'",
  // Supabase (auth, storage, realtime), the AI service, PostHog, Sentry ingest
  // (browser reports go straight to sentry.io — see the note on withSentryConfig).
  // Dev adds the HMR socket.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${aiOrigin} ${posthogOrigin} https://*.posthog.com https://*.sentry.io${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  // Stripe Checkout and Google OAuth are full-page redirects, never embedded.
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, subdomains, preload-list eligible. Only meaningful over HTTPS,
  // which Vercel always is.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Belt and braces with frame-ancestors for browsers that predate CSP3.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Transpile the workspace package (ships raw .ts) so cloud builds resolve it.
  transpilePackages: ["@chatgrp/shared"],

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

// Sentry. Deliberately NO tunnelRoute: the SDK's tunnel is a rewrite whose
// destination org/project come from the request's own query string, i.e. an
// unauthenticated relay to any Sentry account through this origin. Browser
// reports go straight to *.sentry.io instead (allowed in connect-src); an
// ad blocker may drop some client events, which is the cheaper failure.
// Source maps upload only when SENTRY_AUTH_TOKEN is present (CI/Vercel).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
