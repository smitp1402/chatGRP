'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'
import { identify, resetIdentity } from '@/lib/analytics'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

/**
 * Initialises PostHog and keeps the identity in step with Supabase auth.
 *
 * Renders nothing. With no key configured it does nothing at all, so local and
 * preview builds stay silent.
 */
export function AnalyticsProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!KEY) return
    posthog.init(KEY, {
      api_host: HOST,
      // Pageviews are captured manually below — the App Router does not do a
      // full page load on navigation, so autocapture would miss most of them.
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    })
  }, [])

  // Follow client-side navigation.
  useEffect(() => {
    if (!KEY) return
    const query = searchParams.toString()
    posthog.capture('$pageview', {
      $current_url: window.location.origin + pathname + (query ? `?${query}` : ''),
    })
  }, [pathname, searchParams])

  // Stitch anonymous activity onto the account once auth resolves, and drop the
  // identity on sign-out so the next user is not merged into it.
  useEffect(() => {
    if (!KEY) return
    const supabase = createClient()

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) identify(data.user.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) identify(session.user.id)
      if (event === 'SIGNED_OUT') resetIdentity()
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}
