// Edge runtime: proxy.ts (session refresh + route gating).
import * as Sentry from "@sentry/nextjs"
import { sentryOptions } from "@/lib/sentry"

Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV))
