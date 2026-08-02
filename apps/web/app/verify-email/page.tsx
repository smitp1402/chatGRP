"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"

/** How often to check whether the link was clicked in another tab. */
const POLL_MS = 3000

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </AuthShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get("email") ?? ""

  const [verified, setVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * Clicking the emailed link opens /auth/callback in whichever tab the mail
   * client used, and that sets the session cookie. Cookies are shared across
   * tabs on the same origin, so polling for a session here is how this tab
   * learns the address was confirmed.
   */
  useEffect(() => {
    if (verified) return
    const supabase = createClient()
    let active = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (active && data.session) setVerified(true)
    }

    void check()
    const id = setInterval(() => void check(), POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [verified])

  // Once verified, run the progress bar out and hand off to the app.
  useEffect(() => {
    if (!verified) return
    const start = performance.now()
    const duration = 1800
    const id = setInterval(() => {
      const pct = Math.min(100, ((performance.now() - start) / duration) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(id)
        router.replace("/app")
      }
    }, 60)
    return () => clearInterval(id)
  }, [verified, router])

  const resend = useCallback(async () => {
    if (!email || resending) return
    setResending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)

    if (error) {
      toast.error(
        error.status === 429
          ? "Too many attempts. Wait a minute before resending."
          : "Couldn't resend the email. Try again in a moment.",
      )
      return
    }
    toast.success("Verification email sent.")
  }, [email, resending])

  if (verified) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-node-ai/15">
            <CheckCircle2 className="size-7 text-node-ai" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Email verified!</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Redirecting you to ChatGRP...
          </p>
          <Progress value={progress} className="mt-6 h-1.5 w-full" />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/12">
          <MailCheck className="size-10 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Verify your email</h1>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Click it to
              activate your account.
            </>
          ) : (
            <>
              We sent you a verification link. Click it to activate your account, then
              come back here.
            </>
          )}
        </p>

        <div className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/60 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Waiting for verification...
        </div>

        {email && (
          <Button
            variant="ghost"
            className="mt-3 w-full border border-border"
            onClick={() => void resend()}
            disabled={resending}
          >
            {resending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend email"
            )}
          </Button>
        )}

        <Link
          href="/signup"
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Use a different email address
        </Link>
      </div>
    </AuthShell>
  )
}
