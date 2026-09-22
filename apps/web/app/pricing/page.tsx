import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingNav } from "@/components/marketing-nav"
import { MarketingFooter } from "@/components/marketing-footer"
import { PricingCards } from "@/components/pricing-cards"
import { PricingComparison } from "@/components/pricing-comparison"
import { PricingFaq } from "@/components/pricing-faq"

export const metadata: Metadata = {
  title: "Pricing — ChatGRP",
  description:
    "Simple, credit-based pricing for graph-based AI chat. Compare Free and Pro and find the right fit.",
}

export default function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingNav />

      <main className="flex flex-1 flex-col">
        {/* Header */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-16 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand">Pricing</p>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Pricing that scales with your ideas
            </h1>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Every plan runs on credits. Start free, upgrade when you branch out, and only pay for the models you use.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <PricingCards />
          </div>
        </section>

        {/* Comparison table */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Compare every feature
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              A full breakdown of what&apos;s included in Free and Pro.
            </p>
          </div>
          <PricingComparison />
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Everything you need to know about credits, plans, and models.
            </p>
          </div>
          <PricingFaq />
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="surface flex flex-col items-center gap-5 rounded-2xl bg-card px-6 py-14 text-center">
            <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight">
              Ready to chat in graphs?
            </h2>
            <p className="max-w-md text-pretty text-muted-foreground">
              Create your first conversation graph in seconds. No credit card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link href="/signup" />}>
                Start for free
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/share/dsd-8f2a" />}>
                View a shared graph
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
