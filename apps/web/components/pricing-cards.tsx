import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLANS } from "@/lib/pricing"

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex flex-col rounded-2xl border p-6",
            plan.featured
              ? "border-primary bg-card shadow-lg ring-1 ring-primary"
              : "border-border bg-card",
          )}
        >
          {plan.featured && (
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Most popular
            </span>
          )}

          <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {plan.price}
            </span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </div>
          <p className="mt-1 font-mono text-xs text-primary">{plan.credits}</p>

          <Button
            className="mt-6"
            variant={plan.featured ? "default" : "outline"}
            render={<Link href={plan.href} />}
          >
            {plan.cta}
          </Button>

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
