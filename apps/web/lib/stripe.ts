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

/** Plans that can be purchased today. Team is retired — see planForPrice. */
export type PaidPlan = "pro"

/** Stripe Price id for each paid plan (from env). */
export function priceForPlan(plan: PaidPlan): string | undefined {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO : undefined
}

/** Reverse lookup: which plan a Stripe Price id maps to. */
// Still resolves "team" so any pre-existing Team subscription keeps working.
export function planForPrice(priceId: string | undefined): "pro" | "team" | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro"
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team"
  return null
}
