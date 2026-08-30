import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { getStripe, priceForPlan, type PaidPlan } from "@/lib/stripe"

/** POST /api/billing/checkout — start a Stripe Checkout for a paid plan. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const body = (await request.json().catch(() => ({}))) as { plan?: PaidPlan }
  if (body.plan !== "pro") return fail("Invalid plan", 422)

  const price = priceForPlan(body.plan)
  if (!price) return fail("Plan price not configured on the server", 500)

  const stripe = getStripe()
  const admin = createAdminClient()

  // Reuse or create this user's Stripe customer.
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  let customerId = (profile?.stripe_customer_id as string | null) ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${appUrl}/app/billing?success=1`,
    cancel_url: `${appUrl}/app/billing?canceled=1`,
  })

  return ok({ url: session.url })
}
