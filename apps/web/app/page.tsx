import Link from "next/link"
import { ArrowRight, GitBranch, Layers, PlayCircle, Sparkles, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingNav } from "@/components/marketing-nav"
import { MarketingFooter } from "@/components/marketing-footer"
import { HeroPreview } from "@/components/hero-preview"
import { HowItWorks } from "@/components/how-it-works"
import { PricingCards } from "@/components/pricing-cards"

const FEATURES = [
  {
    icon: Layers,
    title: "Visual graph canvas",
    desc: "See your entire conversation as a map. Pan, zoom, and follow every branch at a glance instead of scrolling a flat thread.",
  },
  {
    icon: GitBranch,
    title: "Branch from any message",
    desc: "Reply to any node, not just the last one. Explore parallel directions from the same starting point without losing context.",
  },
  {
    icon: ToggleRight,
    title: "Switch models per message",
    desc: "Run GPT-4o, Claude, and Gemini in one app. Pick the right model for each node and compare answers side by side.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingNav />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-16 sm:pt-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Conversations as graphs
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Chat in graphs, <span className="text-primary">not threads</span>
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              ChatGRP turns every AI conversation into a visual node graph. Branch, fork, and switch models — all in one canvas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link href="/signup" />}>
                Start for free
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="ghost" render={<Link href="/#how-it-works" />}>
                <PlayCircle className="size-4" />
                See how it works
              </Button>
            </div>
          </div>

          {/* Hero image: 3-panel app */}
          <div className="mx-auto mt-14 max-w-5xl">
            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Features</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              A canvas built for how you actually think
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Ideas rarely move in a straight line. ChatGRP gives every conversation room to branch.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="size-5 text-primary" />
                </span>
                <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <div className="border-y border-border bg-card/40">
          <HowItWorks />
        </div>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-primary">Pricing</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Start free, scale when you branch out
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Simple credit-based pricing. No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="mt-12">
            <PricingCards />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline"
            >
              Compare all features
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
