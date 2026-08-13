import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { getStripe } from "@/lib/stripe"

/** POST /api/billing/portal — open the Stripe customer billing portal. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!profile?.stripe_customer_id) return fail("No billing account yet — subscribe first.", 400)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${appUrl}/app/billing`,
  })

  return ok({ url: session.url })
}
