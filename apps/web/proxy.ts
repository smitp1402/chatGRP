import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { AFTER_LOGIN, isPublicRoute } from "@/lib/auth-redirect"

/**
 * Runs on every navigation to (a) refresh the Supabase session cookie before it
 * expires and (b) gate private routes server-side, so unauthenticated users
 * never render the app shell.
 */
export async function proxy(request: NextRequest) {
  // Reassigned by setAll below whenever Supabase rotates the session cookie.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() revalidates against the auth server and refreshes the cookie as a
  // side effect. It must run before any early return, or the refreshed cookie
  // is dropped and the user is silently signed out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // API routes authorize themselves and answer with a 401 envelope. Redirecting
  // them to an HTML login page would hand fetch() a 200 page instead of an error.
  if (pathname.startsWith("/api/")) return response

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // A signed-in user has no use for the login/signup forms. /reset-password is
  // deliberately excluded — a recovery session is a session.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone()
    url.pathname = AFTER_LOGIN
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets. API routes are
     * included so their session cookie is refreshed too; they enforce their own
     * authorization via getUserId() + RLS.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
}
