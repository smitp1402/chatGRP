import type Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, planForPrice } from "@/lib/stripe"

/**
 * POST /api/webhooks/stripe — Stripe → app sync. Signature-verified. Flips the
 * user's plan on subscribe/change/cancel. Idempotent (setting the same plan
 * twice is harmless), so redeliveries are safe.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response("Webhook secret not configured", { status: 500 })

  const signature = request.headers.get("stripe-signature")
  if (!signature) return new Response("Missing signature", { status: 400 })

  const raw = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  const admin = createAdminClient()

  /**
   * Returns the DB error message, or null on success. A non-2xx response is
   * the only thing that makes Stripe retry, so a failed write must surface —
   * swallowing it leaves a paying customer on Free with no second attempt.
   *
   * A customer id that matches no profile is not a DB error (PostgREST returns
   * zero rows, error null). Retrying cannot fix a missing mapping, so that case
   * is logged loudly and still acknowledged with 200.
   */
  async function setPlanByCustomer(
    customerId: string,
    plan: "free" | "pro",
    subscriptionId: string | null,
    periodEnd: number | null,
    cancelAtPeriodEnd: boolean,
  ): Promise<string | null> {
    const { data, error } = await admin
      .from("profiles")
      .update({
        plan,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)
      .select("user_id")
    if (error) return error.message
    if (!data || data.length === 0) {
      console.error(
        `[stripe webhook] ${event.type} ${event.id}: no profile has stripe_customer_id=${customerId}; plan "${plan}" not applied`,
      )
    }
    return null
  }

  let writeError: string | null = null

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const item = sub.items.data[0]
      const mapped = planForPrice(item?.price.id)
      const active = sub.status === "active" || sub.status === "trialing"
      writeError = await setPlanByCustomer(
        sub.customer as string,
        active && mapped ? mapped : "free",
        sub.id,
        item?.current_period_end ?? null,
        sub.cancel_at_period_end,
      )
      break
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      writeError = await setPlanByCustomer(sub.customer as string, "free", null, null, false)
      break
    }
    default:
      break
  }

  if (writeError) {
    console.error(`[stripe webhook] ${event.type} ${event.id}: profile update failed: ${writeError}`)
    return new Response("Profile update failed; retry", { status: 500 })
  }

  return new Response("ok", { status: 200 })
}
