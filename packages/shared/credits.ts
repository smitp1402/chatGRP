/**
 * Credit cost per message, per model.
 *
 * Values are calibrated so every model earns roughly the same real profit
 * per credit (~$0.0018/credit) against current provider pricing. Two models
 * were adjusted up from the original PRD values (noted below) because they
 * were underpriced relative to their real API cost. See PROJECT_PLAN.md §7.
 */
export const CREDIT_TABLE = {
  "gpt-4o-mini": 2,
  "gemini-flash": 3,
  "gpt-4o": 10,
  "claude-opus": 15,
  "claude-sonnet": 10, // adjusted from PRD's 8
  "gemini-pro": 7, // adjusted from PRD's 5
} as const

export type ModelId = keyof typeof CREDIT_TABLE

export function creditsFor(modelId: ModelId): number {
  return CREDIT_TABLE[modelId]
}

/** Monthly credit allowance per subscription tier. */
export const PLAN_CREDITS = {
  free: 100,
  pro: 2000,
  team: 10000,
} as const
