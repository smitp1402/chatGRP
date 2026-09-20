import { CREDIT_TABLE, FREE_MODELS, type ModelId, type Plan } from "./credits"

export type Provider = "openai" | "anthropic" | "google"

export interface AIModel {
  id: ModelId
  name: string
  provider: Provider
  credits: number
  /** Plans on which this model is selectable. */
  plans: Plan[]
}

/** Which plans may use a model — derived from pricing.json's freeModels. */
function plansFor(id: ModelId): Plan[] {
  return FREE_MODELS.includes(id) ? ["free", "pro"] : ["pro"]
}

/**
 * The canonical model registry. Exact provider model IDs are finalized at
 * Phase 3 (Multi-Model) — the ids here are stable internal keys used across
 * the DB (model_id), canvas badges, and billing.
 */
export const MODELS: AIModel[] = [
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "openai", credits: CREDIT_TABLE["gpt-4o-mini"], plans: plansFor("gpt-4o-mini") },
  { id: "gemini-flash", name: "Gemini Flash", provider: "google", credits: CREDIT_TABLE["gemini-flash"], plans: plansFor("gemini-flash") },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", credits: CREDIT_TABLE["gpt-4o"], plans: plansFor("gpt-4o") },
  { id: "gemini-pro", name: "Gemini Pro", provider: "google", credits: CREDIT_TABLE["gemini-pro"], plans: plansFor("gemini-pro") },
  { id: "claude-sonnet", name: "Claude Sonnet", provider: "anthropic", credits: CREDIT_TABLE["claude-sonnet"], plans: plansFor("claude-sonnet") },
  { id: "claude-opus", name: "Claude Opus", provider: "anthropic", credits: CREDIT_TABLE["claude-opus"], plans: plansFor("claude-opus") },
]

export function modelById(id: ModelId): AIModel | undefined {
  return MODELS.find((m) => m.id === id)
}

export function modelsForPlan(plan: Plan): AIModel[] {
  return MODELS.filter((m) => m.plans.includes(plan))
}
