import { afterEach, describe, expect, it } from "vitest"
import { planForPrice, priceForPlan } from "./stripe"

const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe("planForPrice", () => {
  it("maps the Pro price id to pro", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro"
    expect(planForPrice("price_pro")).toBe("pro")
  })

  it("never resolves the retired Team tier, even if the old env var is set", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro"
    process.env.STRIPE_PRICE_TEAM = "price_team"
    expect(planForPrice("price_team")).toBeNull()
  })

  it("returns null for unknown or missing ids", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro"
    expect(planForPrice("price_other")).toBeNull()
    expect(planForPrice(undefined)).toBeNull()
  })
})

describe("priceForPlan", () => {
  it("only knows pro", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro"
    expect(priceForPlan("pro")).toBe("price_pro")
  })
})
