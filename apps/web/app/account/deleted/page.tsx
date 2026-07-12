import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Account deleted — ChatGRP",
  robots: { index: false, follow: false },
}

export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        {/* Muted, disconnected graph icon */}
        <svg
          width="120"
          height="90"
          viewBox="0 0 120 90"
          fill="none"
          className="mb-6 opacity-70"
          aria-hidden="true"
        >
          <line
            x1="30"
            y1="26"
            x2="52"
            y2="44"
            stroke="var(--color-muted-foreground)"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <line
            x1="90"
            y1="26"
            x2="68"
            y2="44"
            stroke="var(--color-muted-foreground)"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <circle cx="30" cy="22" r="7" fill="var(--color-muted)" stroke="var(--color-border)" strokeWidth="1.5" />
          <circle cx="90" cy="22" r="7" fill="var(--color-muted)" stroke="var(--color-border)" strokeWidth="1.5" />
          <circle cx="60" cy="52" r="9" fill="var(--color-muted)" stroke="var(--color-border)" strokeWidth="1.5" />
          {/* sad face on center node */}
          <circle cx="56.5" cy="50" r="1" fill="var(--color-muted-foreground)" />
          <circle cx="63.5" cy="50" r="1" fill="var(--color-muted-foreground)" />
          <path
            d="M56 56 Q60 53 64 56"
            stroke="var(--color-muted-foreground)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        <h1 className="text-balance text-xl font-semibold tracking-tight">
          Your account has been deleted
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          All your sessions, nodes, and data have been permanently removed. We&apos;re
          sorry to see you go.
        </p>

        <div className="mt-8 flex w-full flex-col items-center gap-3">
          <Button variant="outline" className="w-full" render={<Link href="/onboarding" />}>
            Create a new account
          </Button>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Give us feedback
          </Link>
        </div>
      </div>
    </div>
  )
}
