import { Check, Minus } from "lucide-react"
import { COMPARISON } from "@/lib/pricing"
import { cn } from "@/lib/utils"

function Cell({ value, featured }: { value: string | boolean; featured?: boolean }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex justify-center">
        {value ? (
          <Check className={cn("size-4", featured ? "text-primary" : "text-foreground")} />
        ) : (
          <Minus className="size-4 text-muted-foreground/50" />
        )}
      </div>
    )
  }
  return (
    <span className={cn("text-sm", featured ? "font-medium text-foreground" : "text-muted-foreground")}>
      {value}
    </span>
  )
}

export function PricingComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-[1.6fr_1fr_1fr] items-end gap-2 border-b border-border bg-background px-5 py-4">
        <span className="text-sm font-semibold text-foreground">Compare plans</span>
        <span className="text-center text-sm font-semibold text-foreground">Free</span>
        <span className="text-center text-sm font-semibold text-primary">Pro</span>
      </div>

      {COMPARISON.map((section) => (
        <div key={section.group}>
          <div className="bg-muted/40 px-5 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.group}
            </span>
          </div>
          {section.rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.6fr_1fr_1fr] items-center gap-2 border-t border-border px-5 py-3"
            >
              <span className="text-sm text-foreground">{row.label}</span>
              <div className="text-center">
                <Cell value={row.free} />
              </div>
              <div className="text-center">
                <Cell value={row.pro} featured />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
