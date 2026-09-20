'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// Dev-only test credentials, from apps/web/.env.local. No defaults on purpose:
// Supabase Auth does not know about NODE_ENV, so a password written here
// would be a working login for anyone who reads the repo.
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD

/**
 * One-click login for local development. Signs in with the test account
 * named in env, creating it on first use. Renders nothing in production
 * builds or when the env vars are unset.
 */
export function DevLoginButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (process.env.NODE_ENV === 'production') return null
  if (!DEV_EMAIL || !DEV_PASSWORD) return null

  async function quickLogin() {
    const email = DEV_EMAIL
    const password = DEV_PASSWORD
    if (!email || !password) return
    setLoading(true)
    const supabase = createClient()

    let error: { message: string } | null = null
    try {
      const res = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      error = res.error

      // First run: the test user doesn't exist yet — create it, then retry.
      if (error) {
        const signUp = await supabase.auth.signUp({ email, password })
        if (!signUp.error) {
          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
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
