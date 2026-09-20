import { describe, expect, it } from "vitest"
import { sentryOptions } from "./sentry"

describe("sentryOptions", () => {
  it("is disabled with no DSN so dev and previews send nothing", () => {
    const o = sentryOptions(undefined, undefined)
    expect(o.enabled).toBe(false)
    expect(o.dsn).toBeUndefined()
    expect(o.environment).toBe("development")
  })

  it("treats a blank DSN as unset", () => {
    expect(sentryOptions("   ", "production").enabled).toBe(false)
  })

  it("enables with a DSN and tags the Vercel environment", () => {
    const o = sentryOptions("https://k@o1.ingest.sentry.io/1", "preview")
    expect(o.enabled).toBe(true)
    expect(o.dsn).toBe("https://k@o1.ingest.sentry.io/1")
    expect(o.environment).toBe("preview")
  })

  it("never sends default PII", () => {
    expect(sentryOptions("https://k@o1.ingest.sentry.io/1", "production").sendDefaultPii).toBe(false)
  })
})
