"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Copy, Check, Eye, GitBranch, Loader2, MessageSquareText } from "lucide-react"
import { modelById, type CanvasNode } from "@chatgrp/shared"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { FlowCanvas } from "@/components/canvas/flow-canvas"
import { fetchSharedGraph, type SharedGraph } from "@/lib/share-client"

const PROVIDER_DOT: Record<string, string> = {
  openai: "var(--chart-5)",
  anthropic: "var(--chart-3)",
  google: "var(--chart-4)",
}

/** No-op handlers — every mutating control is hidden in read-only mode. */
const noop = () => {}

export function ShareView({ id }: { id: string }) {
  const [graph, setGraph] = useState<SharedGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSharedGraph(id)
      .then((data) => {
        if (cancelled) return
        setGraph(data)
        setSelectedId(data.nodes[0]?.id ?? null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this graph.")
      })
    return () => {
      cancelled = true
    }
  }, [id])

  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const nodes: CanvasNode[] = graph?.nodes ?? []
  const selected = nodes.find((n) => n.id === selectedId) ?? null
  const branches = nodes.filter((n) => n.isFork).length
  const model = selected?.modelId ? modelById(selected.modelId) : undefined

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

        <div className="hidden min-w-0 items-center justify-center md:flex">
          <span className="truncate text-sm font-medium text-foreground">
            {graph?.name ?? ""}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={copyLink} className="hidden sm:inline-flex">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Sign up free
          </Button>
        </div>
      </header>

      {error ? (
        <Centered title="This link isn't available" body={error} />
      ) : !graph ? (
        <Centered title="Loading graph…" body="Fetching the shared conversation." spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold tracking-tight">{graph.name}</h1>
              <span className="font-mono text-xs text-muted-foreground">
                Shared read-only · {new Date(graph.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="size-4" />
                {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GitBranch className="size-4" />
                {branches} {branches === 1 ? "branch" : "branches"}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col lg:flex-row">
            <div className="relative h-[420px] flex-1 lg:h-auto">
              {nodes.length === 0 ? (
                <Centered title="Empty graph" body="This session has no nodes yet." />
              ) : (
                <FlowCanvas
                  nodes={nodes}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMoveNode={noop}
                  onToggleStar={noop}
                  onToggleCollapse={noop}
                  onDeleteNode={noop}
                  readOnly
                />
              )}
            </div>

            <aside className="w-full shrink-0 border-t border-border bg-card p-5 lg:w-80 lg:border-l lg:border-t-0">
              {selected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Selected node
                    </span>
                    <p className="text-sm font-medium leading-snug text-card-foreground">
                      {selected.question || "Untitled node"}
                    </p>
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-muted-foreground">
                    {selected.answer || "No answer recorded."}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: PROVIDER_DOT[model?.provider ?? ""] }}
                      />
                      <span className="font-mono text-muted-foreground">
                        {model?.name ?? "Unknown model"}
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
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-6 py-3 text-center">
          <span className="text-sm text-muted-foreground">
            Viewing a shared ChatGRP session.{" "}
            <span className="text-foreground">Create your own for free.</span>
          </span>
          <Button size="sm" render={<Link href="/signup" />}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  )
}

function Centered({
  title,
  body,
  spinner,
}: {
  title: string
  body: string
  spinner?: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      {spinner && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
