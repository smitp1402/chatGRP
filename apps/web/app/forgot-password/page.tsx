"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus("loading")
    setTimeout(() => setStatus("sent"), 900)
  }

  return (
    <AuthShell>
      {status === "sent" ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-node-ai/15">
            <CheckCircle2 className="size-7 text-node-ai" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
            We sent a reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>. It may take a
            minute to arrive.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="font-medium text-primary hover:underline"
            >
              Resend link
            </button>
          </p>
          <BackToLogin />
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/12">
              <Mail className="size-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          <BackToLogin />
        </>
      )}
    </AuthShell>
  )
}

function BackToLogin() {
  return (
    <div className="mt-6 border-t border-border pt-5 text-center">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to login
      </Link>
    </div>
  )
}
