import { Check, CreditCard, Download } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { CREDITS } from '@/lib/chatgrp-data'

const USAGE = [
  { date: 'Jul 11', session: 'Distributed systems design', model: 'Claude 3.7 Sonnet', credits: 145 },
  { date: 'Jul 10', session: 'RAG evaluation strategy', model: 'GPT-4o', credits: 88 },
  { date: 'Jul 09', session: 'Credit pricing model', model: 'Gemini 2.0 Flash', credits: 42 },
  { date: 'Jul 08', session: 'Multi-tenant DB schema', model: 'Claude 3.7 Sonnet', credits: 210 },
  { date: 'Jul 07', session: 'Launch checklist Q3', model: 'GPT-4o mini', credits: 19 },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: '1,000 credits',
    features: ['Access to GPT-4o mini', 'Up to 3 active sessions', 'Public share links'],
    current: false,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/mo',
    credits: '10,000 credits',
    features: ['All frontier models', 'Unlimited sessions', 'Forking & branching', 'Priority queue'],
    current: true,
  },
  {
    name: 'Team',
    price: '$60',
    period: '/mo',
    credits: '40,000 credits',
    features: ['Everything in Pro', 'Shared workspaces', 'Role-based access', 'SSO & audit logs'],
    current: false,
  },
]

const INVOICES = [
  { date: 'Jul 1, 2026', amount: '$20.00', status: 'Paid' },
  { date: 'Jun 1, 2026', amount: '$20.00', status: 'Paid' },
  { date: 'May 1, 2026', amount: '$20.00', status: 'Paid' },
  { date: 'Apr 1, 2026', amount: '$20.00', status: 'Paid' },
]

export default function BillingPage() {
  const pct = Math.round((CREDITS.used / CREDITS.total) * 100)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Billing" />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
        {/* Current plan */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Pro plan</h2>
                <Badge className="bg-primary/15 text-primary">Current</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Renews on August 1, 2026 · $20/mo
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Manage plan
              </Button>
              <Button size="sm">Upgrade to Team</Button>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits used this month</span>
              <span className="font-mono text-foreground tabular-nums">
                {CREDITS.used.toLocaleString()} / {CREDITS.total.toLocaleString()}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {(CREDITS.total - CREDITS.used).toLocaleString()} credits remaining · resets in 20 days
            </p>
          </div>
        </section>

        {/* Usage breakdown */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Credit usage breakdown</h2>
            <p className="text-xs text-muted-foreground">Recent activity this billing period.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USAGE.map((u) => (
                <TableRow key={u.date + u.session}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{u.date}</TableCell>
                  <TableCell className="font-medium">{u.session}</TableCell>
                  <TableCell className="text-muted-foreground">{u.model}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{u.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Plan comparison */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Compare plans</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'flex flex-col rounded-xl border p-5',
                  plan.current
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                  {plan.current && <Badge className="bg-primary/15 text-primary">Active</Badge>}
                </div>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{plan.credits}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="mt-px size-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  size="sm"
                  variant={plan.current ? 'outline' : 'default'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current plan' : `Switch to ${plan.name}`}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Payment method */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Payment method</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background">
                <CreditCard className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Visa ending in 4242</p>
                <p className="font-mono text-xs text-muted-foreground">Expires 08 / 2027</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update card
            </Button>
          </div>
        </section>

        {/* Invoices */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Invoice history</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVOICES.map((inv) => (
                <TableRow key={inv.date}>
                  <TableCell className="font-medium">{inv.date}</TableCell>
                  <TableCell className="font-mono tabular-nums">{inv.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Download className="size-3.5" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  )
}
