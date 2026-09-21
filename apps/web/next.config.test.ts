/**
 * Security headers. These are cheap to lose in a config refactor and nothing
 * else notices, so the exact set is pinned here.
 */
import { describe, expect, it } from "vitest"
import config, { safeOrigin } from "./next.config"

type Header = { key: string; value: string }

async function headersForAllRoutes(): Promise<Record<string, string>> {
  const groups = await config.headers!()
  const all = groups.find((g) => g.source === "/(.*)")
  expect(all, "a header group covering every route").toBeDefined()
  return Object.fromEntries((all!.headers as Header[]).map((h) => [h.key, h.value]))
}

describe("security headers", () => {
  it("sets HSTS, nosniff, frame denial, referrer and permissions policies", async () => {
    const h = await headersForAllRoutes()

    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{7,}/)
    expect(h["Strict-Transport-Security"]).toContain("includeSubDomains")
    expect(h["X-Content-Type-Options"]).toBe("nosniff")
    expect(h["X-Frame-Options"]).toBe("DENY")
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(h["Permissions-Policy"]).toContain("camera=()")
  })

  it("ships a Content-Security-Policy that allows exactly the services we use", async () => {
    const h = await headersForAllRoutes()
    const csp = h["Content-Security-Policy"]
    const directive = (name: string) =>
      csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith(`${name} `)) ?? ""

    expect(directive("default-src")).toBe("default-src 'self'")
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'")
    expect(directive("object-src")).toBe("object-src 'none'")
    expect(directive("base-uri")).toBe("base-uri 'self'")

    // Supabase (auth, storage, realtime), the AI service, PostHog.
    expect(directive("connect-src")).toContain("https://*.supabase.co")
    expect(directive("connect-src")).toContain("wss://*.supabase.co")
    expect(directive("connect-src")).toContain("posthog.com")
    expect(directive("connect-src")).toContain("https://*.sentry.io")

    // next/font self-hosts Google fonts, so no fonts.gstatic.com.
    expect(directive("font-src")).toBe("font-src 'self'")

    // Attachment thumbnails come from Supabase storage.
    expect(directive("img-src")).toContain("https://*.supabase.co")
    expect(directive("img-src")).toContain("data:")
    expect(directive("img-src")).toContain("blob:")

    // Production must not allow eval.
    expect(directive("script-src")).not.toContain("unsafe-eval")
  })
})

describe("safeOrigin", () => {
  it("uses the env value when it is a URL", () => {
    expect(safeOrigin("https://ai.example.com/v1", "http://localhost:8000")).toBe("https://ai.example.com")
  })

  it("falls back on unset, blank, or malformed values instead of throwing", () => {
    expect(safeOrigin(undefined, "http://localhost:8000")).toBe("http://localhost:8000")
    expect(safeOrigin("", "http://localhost:8000")).toBe("http://localhost:8000")
    expect(safeOrigin("api.chatgrp.app", "http://localhost:8000")).toBe("http://localhost:8000")
  })
})
