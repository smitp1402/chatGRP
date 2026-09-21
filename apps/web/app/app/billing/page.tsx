'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Plan } from '@chatgrp/shared'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { useMeStore } from '@/lib/stores/me-store'
import {
  startCheckout,
  openBillingPortal,
  cancelSubscription,
  resumeSubscription,
} from '@/lib/billing-client'

/** "August 30, 2026" — the day a winding-down plan actually drops to Free. */
function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

interface PlanCard {
  id: Plan
  name: string
  price: string
  credits: string
  features: string[]
}

const PLANS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    credits: '100 credits / mo',
    features: ['GPT-4o mini + Gemini Flash', '3 sessions', 'Presets only'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    credits: '2,000 credits / mo',
    features: ['All 6 models', 'Unlimited sessions', 'Fork, export, prompt library', 'Custom layouts'],
  },
]

export default function BillingPage() {
  const { plan, creditsUsed, creditsCap, cancelAtPeriodEnd, currentPeriodEnd, load } = useMeStore()
  const [busy, setBusy] = useState<string | null>(null)
  const endsOn = formatPeriodEnd(currentPeriodEnd)
  const winding = plan !== 'free' && cancelAtPeriodEnd

  useEffect(() => {
    void load()
    // Coming back from Stripe Checkout — refresh + toast.
    const q = new URLSearchParams(window.location.search)
    if (q.get('success')) {
      toast.success('Subscription active! Your plan will update momentarily.')
      setTimeout(() => void load(), 1500)
    } else if (q.get('canceled')) {
      toast.message('Checkout canceled.')
    }
  }, [load])

  const pct = creditsCap > 0 ? Math.round((creditsUsed / creditsCap) * 100) : 0

  async function checkout(target: 'pro') {
    setBusy(target)
    try {
      // Fired before the redirect — startCheckout navigates away and never returns.
      track(ANALYTICS_EVENTS.upgradeClicked, { plan: target })
      await startCheckout(target)
    } catch (err) {
      setBusy(null)
      toast.error(err instanceof Error ? err.message : 'Could not start checkout')
    }
  }

  async function portal() {
    setBusy('portal')
    try {
      await openBillingPortal()
    } catch (err) {
      setBusy(null)
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal')
    }
  }

  async function cancel() {
    if (
      !window.confirm(
        "Cancel your subscription? You'll keep your current plan until the end of the billing period, then move to Free.",
      )
    )
      return
    setBusy('cancel')
    try {
      await cancelSubscription()
      toast.success('Subscription set to cancel at the end of your billing period.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel subscription')
    } finally {
      setBusy(null)
    }
  }

  async function resume() {
    setBusy('resume')
    try {
      await resumeSubscription()
      toast.success('Subscription resumed — your plan will renew as usual.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resume subscription')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Billing" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
        {/* Current plan + credits */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold capitalize text-foreground">{plan} plan</h2>
                {winding ? (
                  <Badge className="bg-destructive/15 text-destructive">Canceling</Badge>
                ) : (
                  <Badge className="bg-primary/15 text-primary">Current</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {winding
                  ? `Canceled — you keep Pro until ${endsOn ?? 'the end of your billing period'}, then move to Free.`
                  : plan === 'free'
                    ? 'Upgrade to unlock all models and more credits.'
                    : 'Manage or cancel your subscription anytime.'}
              </p>
            </div>
            <div className="flex gap-2">
              {plan === 'free' ? (
                <Button size="sm" onClick={() => void checkout('pro')} disabled={busy !== null}>
                  {busy === 'pro' ? <Loader2 className="size-4 animate-spin" /> : null}
                  Upgrade to Pro
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void portal()}
                    disabled={busy !== null}
                  >
                    {busy === 'portal' ? <Loader2 className="size-4 animate-spin" /> : null}
                    Manage subscription
                  </Button>
                  {winding ? (
                    <Button size="sm" onClick={() => void resume()} disabled={busy !== null}>
                      {busy === 'resume' ? <Loader2 className="size-4 animate-spin" /> : null}
                      Resume subscription
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void cancel()}
                      disabled={busy !== null}
                    >
                      {busy === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : null}
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits used this month</span>
              <span className="font-mono text-foreground tabular-nums">
                {creditsUsed.toLocaleString()} / {creditsCap.toLocaleString()}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {Math.max(0, creditsCap - creditsUsed).toLocaleString()} credits remaining
            </p>
          </div>
        </section>

        {/* Plan comparison */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Compare plans</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((p) => {
              const current = p.id === plan
              return (
                <div
                  key={p.id}
                  className={cn(
                    'flex flex-col rounded-xl border p-5',
                    current ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    {current &&
                      (winding ? (
                        <Badge className="bg-destructive/15 text-destructive">Ending</Badge>
                      ) : (
                        <Badge className="bg-primary/15 text-primary">Active</Badge>
                      ))}
                  </div>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-2xl font-semibold text-foreground">{p.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{p.credits}</p>
                  <ul className="mt-4 flex flex-1 flex-col gap-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                        <Check className="mt-px size-3.5 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <PlanButton
                    plan={p}
                    current={current}
                    userPlan={plan}
                    busy={busy}
                    onCheckout={checkout}
                    onPortal={portal}
                  />
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function PlanButton({
  plan,
  current,
  userPlan,
  busy,
  onCheckout,
  onPortal,
}: {
  plan: PlanCard
  current: boolean
  userPlan: Plan
  busy: string | null
  onCheckout: (p: 'pro') => void
  onPortal: () => void
}) {
  if (current) {
    return (
      <Button className="mt-5" size="sm" variant="outline" disabled>
        Current plan
      </Button>
    )
  }
  // Downgrading to Free (from a paid plan) is done in the Stripe portal.
  if (plan.id === 'free') {
    return (
      <Button className="mt-5" size="sm" variant="outline" onClick={() => onPortal()} disabled={busy !== null}>
        {busy === 'portal' ? <Loader2 className="size-4 animate-spin" /> : null}
        Manage in portal
      </Button>
    )
  }
  const target = plan.id as 'pro'
  return (
    <Button className="mt-5" size="sm" onClick={() => onCheckout(target)} disabled={busy !== null}>
      {busy === target ? <Loader2 className="size-4 animate-spin" /> : null}
      {userPlan === 'free' ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
    </Button>
  )
}
