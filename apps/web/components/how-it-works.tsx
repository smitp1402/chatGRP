"use client"

import { motion } from "framer-motion"

type Step = {
  n: number
  title: string
  desc: string
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Ask a question",
    desc: "Type a prompt and a node appears on the canvas — the root of your conversation graph.",
  },
  {
    n: 2,
    title: "Reply to any node",
    desc: "Branch from any message, not just the last one. Each reply grows a new edge on the graph.",
  },
  {
    n: 3,
    title: "Switch model anytime",
    desc: "Pick GPT-4o, Claude, or Gemini per message. A badge on the node shows which model answered.",
  },
]

const viewport = { once: true, amount: 0.5 } as const

function StepOneArt() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" role="img" aria-label="A single node appears">
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={viewport}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{ transformOrigin: "100px 60px" }}
      >
        <rect x="64" y="42" width="72" height="36" rx="9" className="fill-node-user" />
        <rect x="74" y="54" width="40" height="4" rx="2" className="fill-node-user-foreground/70" />
        <rect x="74" y="63" width="26" height="4" rx="2" className="fill-node-user-foreground/50" />
      </motion.g>
    </svg>
  )
}

function StepTwoArt() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" role="img" aria-label="A branch grows from a node">
      <rect x="18" y="44" width="60" height="32" rx="8" className="fill-node-user" />
      <motion.path
        d="M78 60 H120"
        className="stroke-border"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={viewport}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={viewport}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.5 }}
        style={{ transformOrigin: "150px 60px" }}
      >
        <rect x="122" y="44" width="60" height="32" rx="8" className="fill-node-ai" />
      </motion.g>
    </svg>
  )
}

function StepThreeArt() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" role="img" aria-label="A model badge appears on a node">
      <rect x="60" y="40" width="80" height="40" rx="9" className="fill-node-ai" />
      <motion.g
        initial={{ y: -6, scale: 0, opacity: 0 }}
        whileInView={{ y: 0, scale: 1, opacity: 1 }}
        viewport={viewport}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
        style={{ transformOrigin: "150px 40px" }}
      >
        <rect x="118" y="30" width="52" height="18" rx="9" className="fill-primary" />
        <circle cx="128" cy="39" r="3" className="fill-primary-foreground" />
        <rect x="135" y="37" width="28" height="4" rx="2" className="fill-primary-foreground/80" />
      </motion.g>
    </svg>
  )
}

const ART = [StepOneArt, StepTwoArt, StepThreeArt]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-brand">How it works</p>
        <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Three steps to a living conversation
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Every message is a node. Every reply is an edge. Watch your ideas branch instead of scrolling a flat thread.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const Art = ART[i]
          return (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="surface flex flex-col rounded-xl bg-card p-6"
            >
              <div className="mb-5 flex h-28 items-center justify-center rounded-lg border border-border bg-background">
                <Art />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white">
                  {step.n}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
