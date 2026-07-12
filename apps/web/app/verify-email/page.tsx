"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, MailCheck } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type State = "idle" | "pending" | "verified"

export default function VerifyEmailPage() {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [progress, setProgress] = useState(0)
  const email = "your@email.com"

  // Simulate waiting for the verification link to be clicked elsewhere.
  useEffect(() => {
    if (state !== "pending") return
    const t = setTimeout(() => setState("verified"), 2600)
    return () => clearTimeout(t)
  }, [state])

  // Redirect progress bar once verified.
  useEffect(() => {
    if (state !== "verified") return
    const start = Date.now()
    const duration = 2400
    const interval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
        router.push("/app")
      }
    }, 60)
    return () => clearInterval(interval)
  }, [state, router])

  if (state === "verified") {
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
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it to
          activate your account.
        </p>

        {state === "pending" ? (
          <div className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/60 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Waiting for verification...
          </div>
        ) : (
          <Button
            variant="ghost"
            className="mt-7 w-full border border-border"
            onClick={() => setState("pending")}
          >
            Resend email
          </Button>
        )}

        <Link
          href="/onboarding"
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Change email address
        </Link>
      </div>
    </AuthShell>
  )
}
