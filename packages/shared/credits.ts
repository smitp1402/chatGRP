/**
 * Credit cost per message, per model, and the monthly allowance per plan.
 *
 * The numbers live in pricing.json so the AI service (Python) reads the same
 * file — change a price there, never here. See that file for the calibration
 * note.
 */
import pricing from "./pricing.json"

export const CREDIT_TABLE = pricing.credits

export type ModelId = keyof typeof CREDIT_TABLE

export function creditsFor(modelId: ModelId): number {
  return CREDIT_TABLE[modelId]
}

/** Monthly credit allowance per subscription tier. */
export const PLAN_CREDITS = pricing.planCredits

export type Plan = keyof typeof PLAN_CREDITS

function isModelId(id: string): id is ModelId {
  return id in CREDIT_TABLE
}

// A typo in pricing.json's freeModels would otherwise compile fine and just
// silently hide that model from the Free tier. Fail at import (i.e. at build).
const unknownFree = pricing.freeModels.filter((id) => !isModelId(id))
if (unknownFree.length > 0) {
  throw new Error(`pricing.json freeModels lists unpriced model ids: ${unknownFree.join(", ")}`)
}

/** Models selectable on the Free tier; Pro gets everything. */
export const FREE_MODELS: readonly ModelId[] = pricing.freeModels.filter(isModelId)
