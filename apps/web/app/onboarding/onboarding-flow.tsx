"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ArrowLeft, Check, GitBranch, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { MODELS, type ModelId } from "@chatgrp/shared"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useMeStore } from "@/lib/stores/me-store"

const ROLES = ["Engineer", "Researcher", "Product", "Founder", "Student", "Other"]

/** Welcome-screen highlight. Only claims we actually ship belong here. */
const HIGHLIGHTS = [
  { id: "brainstorm", icon: GitBranch, title: "Branching brainstorms", desc: "Explore multiple directions from a single prompt without losing context." },
]

const PROVIDER_DOT: Record<string, string> = {
  openai: "var(--chart-5)",
  anthropic: "var(--chart-3)",
  google: "var(--chart-4)",
}

const STEPS = ["Welcome", "About you", "Default model"]

export function OnboardingFlow() {
  const router = useRouter()
  const { loaded, onboarded, load: loadMe } = useMeStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [model, setModel] = useState<ModelId>("gpt-4o-mini")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  // Returning users who already onboarded shouldn't see this again.
  useEffect(() => {
    if (loaded && onboarded) router.replace("/app")
  }, [loaded, onboarded, router])

  const isLast = step === STEPS.length - 1
  const canAdvance =
    step === 0 ||
    (step === 1 && name.trim().length > 0 && role.length > 0) ||
    step === 2

  async function finish() {
    setSaving(true)
    try {
      const supabase = createClient()
      if (name.trim()) {
        await supabase.auth.updateUser({ data: { full_name: name.trim() } })
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModelId: model }),
      })
      if (!res.ok) throw new Error("Could not save onboarding")
      await loadMe()
      router.push("/app")
    } catch (err) {
      setSaving(false)
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  function next() {
    if (isLast) {
      void finish()
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" aria-label="ChatGRP home">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => void finish()}
          disabled={saving}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          Skip for now
        </button>
      </header>

      <div className="mx-auto w-full max-w-xl px-6 pt-8">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-2">
              <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wide transition-colors",
                  i <= step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {step === 0 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <h1 className="text-balance text-3xl font-semibold tracking-tight">
                    Chat in graphs, not threads
                  </h1>
                  <p className="text-pretty leading-relaxed text-muted-foreground">
                    ChatGRP turns every conversation into a visual graph. Fork any message, branch
                    into new ideas, and compare model responses — all on one canvas.
                  </p>
                </div>
                <ul className="flex flex-col gap-3">
                  {HIGHLIGHTS.map((u) => (
                    <li key={u.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                        <u.icon className="size-4 text-primary" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{u.title}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Tell us about you</h1>
                  <p className="leading-relaxed text-muted-foreground">
                    We&apos;ll tailor your workspace defaults to how you work.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">What should we call you?</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>What best describes your role?</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition-colors",
                          role === r
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Pick a default model</h1>
                  <p className="leading-relaxed text-muted-foreground">
                    New nodes will use this model. You can switch models per message anytime.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        model === m.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-muted-foreground/40",
                      )}
                    >
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: PROVIDER_DOT[m.provider] }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.credits} credits/msg</p>
                      </div>
                      {model === m.id && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={back} className={cn(step === 0 && "invisible")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={next} disabled={!canAdvance || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isLast ? "Enter ChatGRP" : "Continue"}
            {!saving && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </main>
    </div>
  )
}
