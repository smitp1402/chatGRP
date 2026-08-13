import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { getStripe } from "@/lib/stripe"

/**
 * POST /api/billing/cancel — cancel the subscription at the end of the current
 * period (the user keeps Pro until then; standard SaaS behavior). The webhook
 * flips the plan to Free when Stripe finally ends it.
 *
 * The pending state is written back here rather than waiting on the
 * subscription.updated webhook, so the UI reflects the cancel immediately even
 * if webhook delivery is slow or not running (e.g. local dev without
 * `stripe listen`). The webhook writes the same values, so they agree.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single()

  const subscriptionId = profile?.stripe_subscription_id as string | null
  if (!subscriptionId) return fail("No active subscription", 400)

  const sub = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  const periodEnd = sub.items.data[0]?.current_period_end ?? null

  await admin
    .from("profiles")
    .update({
      cancel_at_period_end: true,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  return ok({
    canceled: true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  })
}
