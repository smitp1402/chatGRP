import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { PLAN_CREDITS, type Plan } from "@chatgrp/shared"

/** GET /api/me — the user's plan and this month's credit usage. */
export async function GET() {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const CORE = "plan, onboarded, default_model_id"
  const BILLING = "cancel_at_period_end, current_period_end"

  async function readProfile(columns: string) {
    return supabase.from("profiles").select(columns).eq("user_id", userId).single()
  }

  // The billing columns arrived in a later migration. If they aren't there yet,
  // fall back to the core columns rather than losing the whole row — a failed
  // read here would silently downgrade the user to free + not-onboarded, which
  // bounces them into the onboarding flow on every load.
  let { data, error } = await readProfile(`${CORE}, ${BILLING}`)
  if (error) ({ data, error } = await readProfile(CORE))
  if (error) return fail("Could not load your profile", 500)

  const profile = data as Record<string, unknown> | null
  const plan = (profile?.plan ?? "free") as Plan

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { data: ledger } = await supabase
    .from("usage_ledger")
    .select("credits_used")
    .gte("created_at", monthStart)
  const used = (ledger ?? []).reduce((sum, r) => sum + (r.credits_used as number), 0)
  const cap = PLAN_CREDITS[plan]

  return ok({
    plan,
    creditsUsed: used,
    creditsCap: cap,
    creditsRemaining: Math.max(0, cap - used),
    onboarded: (profile?.onboarded ?? false) as boolean,
    defaultModelId: (profile?.default_model_id ?? null) as string | null,
    // Set while a paid plan is winding down: still `plan`, but not renewing.
    cancelAtPeriodEnd: (profile?.cancel_at_period_end ?? false) as boolean,
    currentPeriodEnd: (profile?.current_period_end ?? null) as string | null,
  })
}
