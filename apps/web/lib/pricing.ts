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
    credits: "1,000 credits / mo",
    features: [
      "GPT-4o mini",
      "Up to 3 active graphs",
      "Public read-only share links",
      "Community support",
    ],
    cta: "Start for free",
    href: "/onboarding",
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    tagline: "For power users who branch everything.",
    credits: "12,000 credits / mo",
    features: [
      "All frontier models (GPT-4o, Claude, Gemini)",
      "Unlimited graphs & branches",
      "Per-message model switching",
      "Priority response queue",
      "Version history",
    ],
    cta: "Upgrade to Pro",
    href: "/onboarding?plan=pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$30",
    period: "/user/mo",
    tagline: "For teams building together.",
    credits: "40,000 credits / user",
    features: [
      "Everything in Pro",
      "Shared team workspaces",
      "Role-based access control",
      "SSO & audit logs",
      "Centralized billing",
    ],
    cta: "Start a team",
    href: "/onboarding?plan=team",
  },
]

export type ComparisonRow = {
  label: string
  free: string | boolean
  pro: string | boolean
  team: string | boolean
}

export const COMPARISON: { group: string; rows: ComparisonRow[] }[] = [
  {
    group: "Usage",
    rows: [
      { label: "Monthly credits", free: "1,000", pro: "12,000", team: "40,000 / user" },
      { label: "Active graphs", free: "3", pro: "Unlimited", team: "Unlimited" },
      { label: "Nodes per graph", free: "50", pro: "Unlimited", team: "Unlimited" },
    ],
  },
  {
    group: "Models",
    rows: [
      { label: "GPT-4o mini", free: true, pro: true, team: true },
      { label: "GPT-4o", free: false, pro: true, team: true },
      { label: "Claude 3.7 Sonnet", free: false, pro: true, team: true },
      { label: "Gemini 2.0 Flash", free: false, pro: true, team: true },
      { label: "Per-message model switching", free: false, pro: true, team: true },
    ],
  },
  {
    group: "Collaboration",
    rows: [
      { label: "Public share links", free: true, pro: true, team: true },
      { label: "Shared workspaces", free: false, pro: false, team: true },
      { label: "Role-based access", free: false, pro: false, team: true },
      { label: "SSO & audit logs", free: false, pro: false, team: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Community support", free: true, pro: true, team: true },
      { label: "Priority queue", free: false, pro: true, team: true },
      { label: "Dedicated success manager", free: false, pro: false, team: true },
    ],
  },
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What counts as a credit?",
    a: "One credit roughly maps to a small unit of model usage. Cheaper models like GPT-4o mini spend 1-2 credits per reply, while frontier models like Claude 3.7 or GPT-4o spend 4-6. Every node on your graph shows exactly how many credits it used.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. You can upgrade, downgrade, or cancel at any time from your billing page. Upgrades take effect immediately and we prorate the difference; downgrades apply at the start of your next billing cycle.",
  },
  {
    q: "What models are available on each plan?",
    a: "Free includes GPT-4o mini. Pro and Team unlock all frontier models — GPT-4o, Claude 3.7 Sonnet, and Gemini 2.0 Flash — plus the ability to switch models per message inside a single graph.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever with 1,000 credits every month, so you can explore graph-based chat with no card required. Team plans include a 14-day trial of all collaboration features.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Your graphs stay fully readable and shareable. You simply can't generate new replies until your credits reset at the start of the next month, or until you upgrade for a higher monthly allowance.",
  },
]
