import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeNext } from "@/lib/auth-redirect"

/**
 * OAuth, email-confirmation, and password-recovery callback. Supabase redirects
 * here with a `code` that we exchange for a session cookie, then sends the user
 * on to `next`. Expired or already-used links arrive with an error instead.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (!code) {
    // Supabase appends error_code=otp_expired once a link is past its TTL.
    const reason = searchParams.get("error_code") === "otp_expired" ? "expired" : "invalid"
    return NextResponse.redirect(`${origin}${failureTarget(next, reason)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}${failureTarget(next, "invalid")}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

/**
 * Password recovery renders its own expired-link screen, so send failures back
 * there with the reason. Everything else falls back to the login page.
 */
function failureTarget(next: string, reason: "expired" | "invalid"): string {
  const path = next.split("?")[0]
  if (path === "/reset-password") return `/reset-password?error=${reason}`
  return "/login?error=auth_callback_failed"
}
