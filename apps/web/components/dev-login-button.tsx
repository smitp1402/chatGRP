'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// Dev-only test credentials. Override via env if you like; defaults work as-is.
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL ?? 'dev@chatgrp.dev'
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? 'devpassword123'

/**
 * One-click login for local development. Signs in with a fixed test account,
 * creating it on first use. Renders nothing in production builds.
 */
export function DevLoginButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (process.env.NODE_ENV === 'production') return null

  async function quickLogin() {
    setLoading(true)
    const supabase = createClient()

    let error: { message: string } | null = null
    try {
      const res = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      })
      error = res.error

      // First run: the test user doesn't exist yet — create it, then retry.
      if (error) {
        const signUp = await supabase.auth.signUp({ email: DEV_EMAIL, password: DEV_PASSWORD })
        if (!signUp.error) {
          const retry = await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
          })
          error = retry.error
        } else {
          error = signUp.error
        }
      }
    } catch {
      setLoading(false)
      toast.error(
        "Can't reach Supabase. Your project may be paused — open the Supabase dashboard and Restore it.",
      )
      return
    }

    setLoading(false)

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('api key')) {
        toast.error('Invalid API key — paste your Supabase anon key into apps/web/.env.local and restart the dev server.')
      } else if (msg.includes('confirm')) {
        toast.error('Turn OFF "Confirm email" in Supabase → Auth → Providers → Email for dev login.')
      } else {
        toast.error(error.message)
      }
      return
    }

    router.push('/app')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={quickLogin}
      disabled={loading}
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
      Dev quick login
    </button>
  )
}
