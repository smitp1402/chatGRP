/**
 * The TypeScript side of the single pricing source. The Python side has the
 * same checks in apps/ai/tests/test_pricing.py.
 */
import { describe, expect, it } from "vitest"
import { CREDIT_TABLE, FREE_MODELS, MODELS, PLAN_CREDITS, modelsForPlan } from "@chatgrp/shared"
import pricing from "../../../packages/shared/pricing.json"

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
