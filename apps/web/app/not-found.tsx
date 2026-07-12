import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" aria-label="ChatGRP home">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          {/* Broken-graph motif */}
          <svg
            width="180"
            height="120"
            viewBox="0 0 180 120"
            fill="none"
            className="mb-8"
            aria-hidden="true"
          >
            <path
              d="M40 30 C 40 55, 90 45, 90 70"
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            <path
              d="M140 30 C 140 55, 90 45, 90 70"
              stroke="var(--color-muted-foreground)"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
            <rect x="18" y="14" width="44" height="30" rx="8" fill="var(--color-card)" stroke="var(--color-node-user)" strokeWidth="2" />
            <rect x="118" y="14" width="44" height="30" rx="8" fill="var(--color-card)" stroke="var(--color-node-ai)" strokeWidth="2" />
            <rect x="68" y="72" width="44" height="30" rx="8" fill="var(--color-card)" stroke="var(--color-node-fork)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="90" cy="58" r="4" fill="var(--color-node-fork)" />
          </svg>

          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">
            This node doesn&apos;t exist
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            The page you&apos;re looking for was moved, deleted, or never existed
            on the graph.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Button render={<Link href="/app" />}>Back to workspace</Button>
            <Button variant="outline" render={<Link href="/onboarding" />}>
              Start over
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
