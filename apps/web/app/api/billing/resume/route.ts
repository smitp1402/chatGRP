import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { getStripe } from "@/lib/stripe"

/**
 * POST /api/billing/resume — undo a pending cancellation. Only valid while the
 * subscription is still winding down; once Stripe actually ends it the user has
 * to check out again.
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
    cancel_at_period_end: false,
  })
  const periodEnd = sub.items.data[0]?.current_period_end ?? null

  await admin
    .from("profiles")
    .update({
      cancel_at_period_end: false,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  return ok({ resumed: true })
}
