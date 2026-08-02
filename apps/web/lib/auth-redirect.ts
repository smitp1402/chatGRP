/**
 * Auth redirect helpers shared by the middleware, the OAuth/recovery callback,
 * and the login form.
 */

/** Where users land once they have a session. */
export const AFTER_LOGIN = "/app"

/**
 * Sanitizes a `?next=` value into a same-origin path.
 *
 * The parameter is attacker-controllable (it rides along in emailed recovery
 * links), so anything that could point off-site — an absolute URL, a
 * protocol-relative `//evil.com`, or a backslash variant that some browsers
 * normalize to `//` — is discarded rather than trusted.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return AFTER_LOGIN
  if (!raw.startsWith("/")) return AFTER_LOGIN
  if (raw.startsWith("//") || raw.startsWith("/\\")) return AFTER_LOGIN
  return raw
}

/** Routes reachable without a session. Matched exactly or as a path prefix. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
  "/share",
  "/pricing",
  "/privacy",
  "/terms",
  "/welcome",
  "/account/deleted",
  "/maintenance",
  "/500",
] as const

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}
