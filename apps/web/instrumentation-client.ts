// Runs once in the browser before the app hydrates (Next.js convention file).
import * as Sentry from "@sentry/nextjs"
import { sentryOptions } from "@/lib/sentry"

Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_VERCEL_ENV))

// Lets Sentry attribute client-side errors to the route the user navigated to.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
