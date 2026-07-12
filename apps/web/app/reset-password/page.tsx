"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const STRENGTH = [
  { label: "Too weak", color: "var(--color-destructive)" },
  { label: "Weak", color: "var(--color-node-fork)" },
  { label: "Fair", color: "var(--color-node-fork)" },
  { label: "Strong", color: "var(--color-node-ai)" },
  { label: "Very strong", color: "var(--color-node-ai)" },
]

function scorePassword(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const params = useSearchParams()
  const hasError = params.get("error") === "expired" || params.get("error") === "invalid"

  if (hasError) {
    return (
      <AuthShell>
        <TokenError />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <ResetForm />
    </AuthShell>
  )
}

function ResetForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle")
  const [countdown, setCountdown] = useState(3)

  const score = useMemo(() => scorePassword(password), [password])
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= 8 && !mismatch && confirm.length > 0

  useEffect(() => {
    if (status !== "done") return
    if (countdown <= 0) {
      router.push("/")
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown, router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus("loading")
    setTimeout(() => setStatus("done"), 900)
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-node-ai/15">
          <CheckCircle2 className="size-7 text-node-ai" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          Your password has been changed. Redirecting to login in{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {countdown}s
          </span>
          .
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/" />}>
          Go to login now
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/12">
          <Lock className="size-6 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
          Choose a strong password you don&apos;t use elsewhere.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Strength bar */}
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      password.length > 0 && i < score
                        ? STRENGTH[score].color
                        : "var(--color-border)",
                  }}
                />
              ))}
            </div>
            {password.length > 0 && (
              <span
                className="font-mono text-[11px]"
                style={{ color: STRENGTH[score].color }}
              >
                {STRENGTH[score].label}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn(mismatch && "border-destructive focus-visible:ring-destructive/40")}
            required
          />
          {mismatch && (
            <span className="text-[11px] text-destructive">Passwords don&apos;t match</span>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit || status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </>
  )
}

function TokenError() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/12">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Link expired or invalid</h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
        This password reset link is no longer valid. Reset links expire after 60 minutes
        for security.
      </p>
      <Button className="mt-6 w-full" render={<Link href="/forgot-password" />}>
        Request new link
      </Button>
      <Link
        href="/"
        className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to login
      </Link>
    </div>
  )
}
