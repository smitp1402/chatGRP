"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Check, Wrench } from "lucide-react"
import { GraphBackdrop } from "@/components/graph-backdrop"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ETA = "2 hours"

export default function MaintenancePage() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <GraphBackdrop />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="ChatGRP home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/12">
            <Wrench className="size-8 text-primary" />
          </div>

          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            We&apos;ll be back soon
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            ChatGRP is under scheduled maintenance. We&apos;re upgrading the system and
            will be back in approximately{" "}
            <span className="font-medium text-foreground">{ETA}</span>.
          </p>

          {/* Indeterminate progress bar */}
          <div className="mt-7 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full w-1/3 rounded-full bg-primary"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Notify me */}
          {subscribed ? (
            <div className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-node-ai/40 bg-node-ai/10 py-3 text-sm text-foreground">
              <Check className="size-4 text-node-ai" />
              We&apos;ll email you the moment we&apos;re back.
            </div>
          ) : (
            <form onSubmit={subscribe} className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Notify me when we're back"
                aria-label="Email address"
                required
                className="flex-1"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          )}

          <a
            href="https://status.chatgrp.app"
            className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Check our status page
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </main>
    </div>
  )
}
