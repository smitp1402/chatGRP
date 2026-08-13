import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client — bypasses RLS. Use ONLY in trusted server code
 * that has no user context (e.g. Stripe webhooks). Never expose to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service-role not configured")
  return createClient(url, key, { auth: { persistSession: false } })
}
