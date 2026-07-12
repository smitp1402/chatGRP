"use client"

import Link from "next/link"
import { RotateCw } from "lucide-react"
import { GraphBackdrop } from "@/components/graph-backdrop"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function ServerErrorPage() {
  function tryAgain() {
    if (typeof window !== "undefined") window.location.reload()
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <GraphBackdrop broken />

      <header className="relative z-10 flex items-center px-6 py-4">
        <Link href="/" aria-label="ChatGRP home">
          <Logo />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <p className="font-mono text-6xl font-semibold tracking-tight text-muted-foreground/40 sm:text-7xl">
            500
          </p>
          <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight">
            Something went wrong on our end
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            We&apos;ve been notified and are working on a fix. Try refreshing or come back
            shortly.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Button onClick={tryAgain}>
              <RotateCw className="size-4" />
              Try again
            </Button>
            <Button variant="ghost" render={<Link href="/" />}>
              Go home
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
