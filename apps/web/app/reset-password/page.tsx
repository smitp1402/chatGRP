"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const STRENGTH = [
  { label: "Too weak", color: "var(--color-destructive)" },
  { label: "Weak", color: "var(--color-node-fork)" },
  { label: "Fair", color: "var(--color-node-fork)" },
  { label: "Strong", color: "var(--color-node-ai)" },
  { label: "Very strong", color: "var(--color-node-ai)" },
]

/** Supabase rejects anything shorter; keep the client in step with the server. */
const MIN_PASSWORD_LENGTH = 8

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
          <Checking />
        </AuthShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

type Gate = "checking" | "ready" | "expired" | "invalid"

function ResetPasswordContent() {
  const params = useSearchParams()
  const paramError = params.get("error")
  // The callback route reports unusable links via ?error= before we get here.
  // That answer is already in the URL, so derive it rather than storing it.
  const paramGate: Gate | null =
    paramError === "expired" || paramError === "invalid" ? paramError : null

  const [sessionGate, setSessionGate] = useState<Gate>("checking")
  const gate = paramGate ?? sessionGate

  useEffect(() => {
    if (paramGate) return

    let active = true
    const supabase = createClient()

    // /auth/callback already traded the recovery code for a session cookie.
    // Without that session there is nothing authorizing a password change, so
    // the form would fail on submit — show the expired screen up front instead.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSessionGate(data.session ? "ready" : "expired")
      })
      .catch(() => {
        if (active) setSessionGate("invalid")
      })

    return () => {
      active = false
    }
  }, [paramGate])

  return (
    <AuthShell>
      {gate === "checking" && <Checking />}
      {gate === "ready" && <ResetForm />}
      {(gate === "expired" || gate === "invalid") && <TokenError reason={gate} />}
    </AuthShell>
  )
}

function Checking() {
  return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
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
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && !mismatch && confirm.length > 0

  useEffect(() => {
    if (status !== "done") return
    if (countdown <= 0) {
      router.push("/login")
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || status === "loading") return
    setStatus("loading")

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus("idle")
      toast.error(error.message)
      return
    }

    // Drop the recovery session so the new password is actually exercised, and
    // a shared or stale link can't be walked back into an active account.
    await supabase.auth.signOut()
    setStatus("done")
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
        <Button variant="outline" className="mt-6" render={<Link href="/login" />}>
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
              minLength={MIN_PASSWORD_LENGTH}
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

function TokenError({ reason }: { reason: "expired" | "invalid" }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/12">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        {reason === "expired" ? "Link expired" : "Link is invalid"}
      </h1>
      <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
        {reason === "expired"
          ? "This password reset link is no longer valid. Reset links expire after 60 minutes for security."
          : "This password reset link couldn't be verified. It may have already been used."}
      </p>
      <Button className="mt-6 w-full" render={<Link href="/forgot-password" />}>
        Request new link
      </Button>
      <Link
        href="/login"
        className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to login
      </Link>
    </div>
  )
}
