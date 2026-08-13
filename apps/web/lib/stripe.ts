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

export type PaidPlan = "pro" | "team"

/** Stripe Price id for each paid plan (from env). */
export function priceForPlan(plan: PaidPlan): string | undefined {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_TEAM
}

/** Reverse lookup: which plan a Stripe Price id maps to. */
export function planForPrice(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro"
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team"
  return null
}
