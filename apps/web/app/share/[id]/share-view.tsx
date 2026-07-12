"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy, Check, Eye, GitBranch, MessageSquareText } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { GraphCanvas } from "@/components/graph-canvas"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GRAPH_NODES, GRAPH_EDGES, modelById } from "@/lib/chatgrp-data"

export function ShareView({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(GRAPH_NODES[0]?.id ?? null)

  const selected = GRAPH_NODES.find((n) => n.id === selectedId) ?? null

  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background pb-14">
      <header className="grid grid-cols-2 items-center gap-3 border-b border-border px-6 py-3 md:grid-cols-3">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="ChatGRP home">
            <Logo />
          </Link>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex">
            <Eye className="size-3" />
            Read-only
          </span>
        </div>

        {/* Centered session name */}
        <div className="hidden min-w-0 items-center justify-center md:flex">
          <span className="truncate text-sm font-medium text-foreground">
            Distributed systems design
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={copyLink} className="hidden sm:inline-flex">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button size="sm" render={<Link href="/onboarding" />}>
            Sign up free
          </Button>
        </div>
      </header>

      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">
            Distributed systems design
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="size-5">
              <AvatarImage src="/user-avatar.png" alt="" />
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            Shared by Ada Lovelace
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono text-xs">grp/{id}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquareText className="size-4" />
            {GRAPH_NODES.filter((n) => n.role !== "fork").length} messages
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="size-4" />
            {GRAPH_NODES.filter((n) => n.role === "fork").length} branches
          </span>
        </div>
      </div>

      {/* Canvas + detail */}
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative h-[420px] flex-1 lg:h-auto">
          <GraphCanvas
            nodes={GRAPH_NODES}
            edges={GRAPH_EDGES}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <aside className="w-full shrink-0 border-t border-border bg-card p-5 lg:w-80 lg:border-l lg:border-t-0">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Selected node
                </span>
                <p className="text-sm font-medium leading-snug text-card-foreground">
                  {selected.question}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-muted-foreground">
                {selected.answer}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: modelById(selected.model).dot }}
                  />
                  <span className="font-mono text-muted-foreground">
                    {modelById(selected.model).name}
                  </span>
                </span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {selected.credits} credits
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a node to read the full exchange.
            </p>
          )}
        </aside>
      </div>

      {/* Fixed signup banner */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-6 py-3 text-center">
          <span className="text-sm text-muted-foreground">
            Viewing a shared ChatGRP session.{" "}
            <span className="text-foreground">Create your own for free.</span>
          </span>
          <Button size="sm" render={<Link href="/onboarding" />}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  )
}
