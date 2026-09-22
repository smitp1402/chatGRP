/**
 * Marketing copy for the pricing page.
 *
 * Every number here is DERIVED from packages/shared/pricing.json, which is
 * what the AI service actually enforces. This file used to hand-write them and
 * they drifted badly: the page advertised 1,000 free and 12,000 Pro credits
 * against an enforced 100 and 2,000, and sold a "priority response queue" and
 * "version history" that were never built. Anything claimed below must exist
 * in the product — pricing.test.ts fails the build if the numbers stop
 * matching.
 */
import { MODELS, PLAN_CREDITS, modelsForPlan, type ModelId } from "@chatgrp/shared"

const fmt = (n: number) => n.toLocaleString("en-US")

/** "GPT-4o mini and Gemini Flash" — the models a plan can actually select. */
function modelNames(plan: "free" | "pro"): string {
  const names = modelsForPlan(plan).map((m) => m.name)
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

export type Plan = {
  name: string
  price: string
  period: string
  tagline: string
  credits: string
  features: string[]
  cta: string
  href: string
  featured?: boolean
}

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    tagline: "For trying out graph-based chat.",
    credits: `${fmt(PLAN_CREDITS.free)} credits / mo`,
    features: [
      modelNames("free"),
      "Unlimited graphs and branches",
      "File attachments",
      "Public read-only share links",
      "Prompt library",
    ],
    cta: "Start for free",
    href: "/onboarding",
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    tagline: "For power users who branch everything.",
    credits: `${fmt(PLAN_CREDITS.pro)} credits / mo`,
    features: [
      "All models — GPT-4o, Claude and Gemini",
      `${fmt(PLAN_CREDITS.pro / PLAN_CREDITS.free)}× the monthly credits`,
      "Per-message model switching",
      "Everything in Free",
    ],
    cta: "Upgrade to Pro",
    href: "/onboarding?plan=pro",
    featured: true,
  },
]

export type ComparisonRow = {
  label: string
  free: string | boolean
  pro: string | boolean
}

/** One row per model, ticked according to pricing.json's freeModels. */
const MODEL_ROWS: ComparisonRow[] = MODELS.map((m) => ({
  label: `${m.name} (${m.credits} cr)`,
  free: m.plans.includes("free"),
  pro: true,
}))

export const COMPARISON: { group: string; rows: ComparisonRow[] }[] = [
  {
    group: "Usage",
    rows: [
      { label: "Monthly credits", free: fmt(PLAN_CREDITS.free), pro: fmt(PLAN_CREDITS.pro) },
      // No graph or node ceiling is enforced anywhere, on either plan.
      { label: "Active graphs", free: "Unlimited", pro: "Unlimited" },
      { label: "Nodes per graph", free: "Unlimited", pro: "Unlimited" },
    ],
  },
  {
    group: "Models",
    rows: [...MODEL_ROWS, { label: "Per-message model switching", free: true, pro: true }],
  },
  {
    group: "Features",
    rows: [
      { label: "Branch and fork any message", free: true, pro: true },
      { label: "File attachments", free: true, pro: true },
      { label: "Public read-only share links", free: true, pro: true },
      { label: "Fork someone else's shared graph", free: true, pro: true },
      { label: "Prompt library", free: true, pro: true },
      { label: "Export a branch", free: true, pro: true },
    ],
  },
  {
    group: "Collaboration",
    rows: [
      { label: "Shared workspaces", free: false, pro: false },
      { label: "Role-based access", free: false, pro: false },
      { label: "SSO & audit logs", free: false, pro: false },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Community support", free: true, pro: true },
      { label: "Dedicated success manager", free: false, pro: false },
    ],
  },
]

/** "GPT-4o mini costs 2, Claude Opus costs 15" — straight from the credit table. */
function creditExamples(): string {
  const cost = (id: ModelId) => MODELS.find((m) => m.id === id)
  const cheapest = cost("gpt-4o-mini")
  const dearest = cost("claude-opus")
  if (!cheapest || !dearest) return ""
  return `${cheapest.name} costs ${cheapest.credits} credits per reply, ${dearest.name} costs ${dearest.credits}`
}

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What counts as a credit?",
    a: `Every reply spends credits, and how many depends on the model you pick — ${creditExamples()}. Each node on your graph shows exactly what it cost, and you are only charged for replies that finish: if a generation fails or you cancel it, the credits go straight back.`,
  },
  {
    q: "What models are available on each plan?",
    a: `Free includes ${modelNames("free")}. Pro unlocks every model — ${modelNames("pro")} — and you can switch model per message inside a single graph, so one branch can answer with Claude while its sibling answers with GPT-4o.`,
  },
  {
    q: "Can I cancel?",
    a: "Yes, from your billing page, at any time. Your subscription stays active until the end of the period you have already paid for, and you keep Pro until then — nothing is cut off mid-month. You can resume before that date if you change your mind, and your graphs are never deleted by cancelling.",
  },
  {
    q: "Is there a free trial?",
    a: `The Free plan is free forever with ${fmt(PLAN_CREDITS.free)} credits every month and no card required, so you can explore graph-based chat before deciding whether the extra credits and models are worth it.`,
  },
  {
    q: "What happens when I run out of credits?",
    a: "Your graphs stay fully readable, shareable and exportable — nothing is locked. You simply cannot generate new replies until your credits reset at the start of the next month, or until you upgrade for a higher monthly allowance.",
  },
]
