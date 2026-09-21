import Stripe from "stripe"

let client: Stripe | null = null

/** Lazily-constructed Stripe client (so a missing key doesn't crash the build). */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured")
    client = new Stripe(key)
  }
  return client
}

/** Plans that can be purchased. Team was retired (migration 0010). */
export type PaidPlan = "pro"

/** Stripe Price id for each paid plan (from env). */
export function priceForPlan(plan: PaidPlan): string | undefined {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO : undefined
}

/**
 * Reverse lookup: which plan a Stripe Price id maps to. Anything that is not
 * the Pro price — including a leftover Team price — resolves to null, and the
 * webhook treats null as Free.
 */
export function planForPrice(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null
  return priceId === process.env.STRIPE_PRICE_PRO ? "pro" : null
}
