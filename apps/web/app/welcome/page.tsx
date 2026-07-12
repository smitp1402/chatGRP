"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Confetti } from "@/components/confetti"
import { GraphBackdrop } from "@/components/graph-backdrop"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

const NAME = "Avery"
const CREDITS = 2000

export default function WelcomePage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <GraphBackdrop />
      <Confetti />

        <div className="absolute left-6 top-6 z-10">
          <Link href="/" aria-label="ChatGRP home">
            <Logo />
          </Link>
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Checkmark animation */}
        <motion.div
          className="mb-6 flex size-20 items-center justify-center rounded-full bg-node-ai/15"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
        >
          <motion.div
            className="flex size-14 items-center justify-center rounded-full bg-node-ai text-node-ai-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.35 }}
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.div>
        </motion.div>

        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          You&apos;re all set, {NAME}!
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Your Pro trial starts today. You have{" "}
          <span className="font-medium text-foreground">
            {CREDITS.toLocaleString()} credits
          </span>{" "}
          to explore.
        </p>

        {/* Credit balance card */}
        <motion.div
          className="mt-8 w-full rounded-xl border border-border bg-card/90 p-5 text-left backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Credit balance
            </span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {CREDITS.toLocaleString()}/{CREDITS.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Trial resets in 14 days
          </p>
        </motion.div>

        <Button size="lg" className="mt-8 w-full" render={<Link href="/app" />}>
          Open ChatGRP
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </div>
  )
}
