/**
 * The TypeScript side of the single pricing source. The Python side has the
 * same checks in apps/ai/tests/test_pricing.py.
 */
import { describe, expect, it } from "vitest"
import { CREDIT_TABLE, FREE_MODELS, MODELS, PLAN_CREDITS, modelsForPlan } from "@chatgrp/shared"
import pricing from "../../../packages/shared/pricing.json"
import { COMPARISON, FAQ, PLANS } from "./pricing"

describe("pricing.json", () => {
  it("is what the shared package exposes", () => {
    expect(CREDIT_TABLE).toEqual(pricing.credits)
    expect(PLAN_CREDITS).toEqual(pricing.planCredits)
    expect([...FREE_MODELS]).toEqual(pricing.freeModels)
  })

  it("has no team plan", () => {
    expect(Object.keys(PLAN_CREDITS)).toEqual(["free", "pro"])
  })

  it("only lists priced models as free", () => {
    for (const id of FREE_MODELS) expect(CREDIT_TABLE).toHaveProperty(id)
  })

  it("prices every model in the registry", () => {
    for (const m of MODELS) expect(m.credits).toBe(CREDIT_TABLE[m.id])
  })

  it("derives plan availability from freeModels", () => {
    expect(modelsForPlan("free").map((m) => m.id)).toEqual(pricing.freeModels)
    expect(modelsForPlan("pro")).toHaveLength(MODELS.length)
  })
})

/**
 * The pricing page is a promise. These lock it to what the AI service actually
 * enforces — the page once advertised 1,000 free / 12,000 Pro credits against
 * an enforced 100 / 2,000, and listed two features that did not exist.
 */
describe("pricing page copy", () => {
  it("quotes the credit caps the service enforces", () => {
    const free = PLANS.find((p) => p.name === "Free")!
    const pro = PLANS.find((p) => p.name === "Pro")!
    expect(free.credits).toContain(PLAN_CREDITS.free.toLocaleString("en-US"))
    expect(pro.credits).toContain(PLAN_CREDITS.pro.toLocaleString("en-US"))

    const usage = COMPARISON.find((g) => g.group === "Usage")!
    const row = usage.rows.find((r) => r.label === "Monthly credits")!
    expect(row.free).toBe(PLAN_CREDITS.free.toLocaleString("en-US"))
    expect(row.pro).toBe(PLAN_CREDITS.pro.toLocaleString("en-US"))
  })

  it("ticks a model as free only when pricing.json says it is", () => {
    const models = COMPARISON.find((g) => g.group === "Models")!
    for (const m of MODELS) {
      const row = models.rows.find((r) => r.label === `${m.name} (${m.credits} cr)`)
      expect(row, `no comparison row for ${m.name}`).toBeDefined()
      expect(row!.free).toBe(FREE_MODELS.includes(m.id))
      expect(row!.pro).toBe(true)
    }
  })

  it("lists every model in the registry, so none is silently hidden", () => {
    const models = COMPARISON.find((g) => g.group === "Models")!
    for (const m of MODELS) {
      expect(models.rows.some((r) => r.label === `${m.name} (${m.credits} cr)`)).toBe(true)
    }
  })

  it("never uses a model name the registry does not have", () => {
    // "Claude 3.7 Sonnet" and "Gemini 2.0 Flash" outlived the ids they named.
    const known = MODELS.map((m) => m.name)
    const copy = [
      ...PLANS.flatMap((p) => p.features),
      ...COMPARISON.flatMap((g) => g.rows.map((r) => r.label)),
      ...FAQ.map((f) => `${f.q} ${f.a}`),
    ].join(" ")
    for (const stale of ["Claude 3.7", "Gemini 2.0", "Gemini 1.5", "Claude 3 "]) {
      expect(copy, `stale model name: ${stale}`).not.toContain(stale)
    }
    expect(known.some((n) => copy.includes(n))).toBe(true)
  })

  it("sells nothing the product does not do", () => {
    const copy = [
      ...PLANS.flatMap((p) => p.features),
      ...COMPARISON.flatMap((g) => g.rows.filter((r) => r.free || r.pro).map((r) => r.label)),
      ...FAQ.map((f) => f.a),
    ]
      .join(" ")
      .toLowerCase()

    // Each was advertised at some point and is not implemented anywhere.
    for (const absent of ["priority queue", "priority response", "version history", "prorate"]) {
      expect(copy, `advertises unbuilt feature: ${absent}`).not.toContain(absent)
    }
  })

  it("does not claim limits that nothing enforces", () => {
    const usage = COMPARISON.find((g) => g.group === "Usage")!
    // No graph count or node count ceiling exists in the API or the database.
    for (const label of ["Active graphs", "Nodes per graph"]) {
      const row = usage.rows.find((r) => r.label === label)!
      expect(row.free).toBe("Unlimited")
      expect(row.pro).toBe("Unlimited")
    }
  })
})
