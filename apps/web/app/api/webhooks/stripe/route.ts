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

  async function setPlanByCustomer(
    customerId: string,
    plan: "free" | "pro" | "team",
    subscriptionId: string | null,
    periodEnd: number | null,
    cancelAtPeriodEnd: boolean,
  ) {
    await admin
      .from("profiles")
      .update({
        plan,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const item = sub.items.data[0]
      const mapped = planForPrice(item?.price.id)
      const active = sub.status === "active" || sub.status === "trialing"
      await setPlanByCustomer(
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
      await setPlanByCustomer(sub.customer as string, "free", null, null, false)
      break
    }
    default:
      break
  }

  return new Response("ok", { status: 200 })
}
