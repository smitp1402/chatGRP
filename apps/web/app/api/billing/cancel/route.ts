import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { getStripe } from "@/lib/stripe"
import { isCancelReason, MAX_CANCEL_NOTE } from "@/lib/cancel-reasons"

/**
 * POST /api/billing/cancel — cancel the subscription at the end of the current
 * period (the user keeps Pro until then; standard SaaS behavior). The webhook
 * flips the plan to Free when Stripe finally ends it.
 *
 * The pending state is written back here rather than waiting on the
 * subscription.updated webhook, so the UI reflects the cancel immediately even
 * if webhook delivery is slow or not running (e.g. local dev without
 * `stripe listen`). The webhook writes the same values, so they agree.
 *
 * Optionally takes { reason, note } and records why. Both are optional: a
 * cancellation must never be blocked by someone declining to explain it.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  // Unparseable or absent bodies are fine - the dialog can be skipped, and
  // older clients send nothing at all.
  const body = (await request.json().catch(() => ({}))) as {
    reason?: unknown
    note?: unknown
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id, plan")
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

  // Recorded only once Stripe has accepted, so a row here always corresponds to
  // a cancellation that really happened. Failing to store it must not fail the
  // request: the subscription is already cancelled at this point, and an error
  // would tell the user otherwise. Logged instead, so a broken table is
  // visible rather than silent.
  if (isCancelReason(body.reason)) {
    const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_CANCEL_NOTE) : null
    const { error: feedbackError } = await admin.from("cancellation_feedback").insert({
      user_id: user.id,
      reason: body.reason,
      note: note || null,
      // Captured now: profiles.plan flips to free when the period ends, and by
      // then the row would no longer say what was cancelled.
      plan: (profile?.plan as string | null) ?? null,
    })
    if (feedbackError) {
      console.error(`[billing] cancellation feedback not stored for ${user.id}: ${feedbackError.message}`)
    }
  }

  return ok({
    canceled: true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  })
}
