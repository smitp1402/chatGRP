import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { PLAN_CREDITS, type Plan } from "@chatgrp/shared"

/** GET /api/me — the user's plan and this month's credit usage. */
export async function GET() {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, onboarded, default_model_id")
    .eq("user_id", userId)
    .single()
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
    onboarded: profile?.onboarded ?? false,
    defaultModelId: (profile?.default_model_id ?? null) as string | null,
  })
}
