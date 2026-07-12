import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { GraphBackdrop } from "@/components/graph-backdrop"
import { cn } from "@/lib/utils"

/**
 * Centered card layout on a subtle graph background, used across auth,
 * status, and confirmation pages.
 */
export function AuthShell({
  children,
  showBackdrop = true,
  broken = false,
  wide = false,
}: {
  children: React.ReactNode
  showBackdrop?: boolean
  broken?: boolean
  wide?: boolean
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      {showBackdrop && <GraphBackdrop broken={broken} />}

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="ChatGRP home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div
          className={cn(
            "w-full rounded-2xl border border-border bg-card/90 p-8 shadow-lg backdrop-blur-sm",
            wide ? "max-w-lg" : "max-w-md",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
