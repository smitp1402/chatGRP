"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CornerDownLeft, GitBranch, MessageSquareText, Search, X } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"
import { MODELS, type ModelId } from "@/lib/chatgrp-data"

type Filter = "all" | "sessions" | "nodes" | "week" | "month"

type SearchResult = {
  id: string
  type: "session" | "node"
  session: string
  preview: string
  breadcrumb: string[]
  model: ModelId
  timeAgo: string
  recency: "week" | "month"
}

const RESULTS: SearchResult[] = [
  {
    id: "n2",
    type: "node",
    session: "Distributed systems design",
    preview:
      "Use hash-based sharding for even distribution, or geo-partitioning to keep data close to users.",
    breadcrumb: ["Root", "Sharding strategies", "Overview"],
    model: "gpt-4o",
    timeAgo: "4m",
    recency: "week",
  },
  {
    id: "n5",
    type: "node",
    session: "Distributed systems design",
    preview: "Forked branch exploring hash sharding trade-offs and rebalancing cost.",
    breadcrumb: ["Root", "Sharding strategies", "Fork: hash sharding"],
    model: "gemini-2.0",
    timeAgo: "6m",
    recency: "week",
  },
  {
    id: "rag-eval",
    type: "session",
    session: "RAG evaluation strategy",
    preview: "Comparing recall@k and faithfulness metrics across retrievers.",
    breadcrumb: ["Root", "Evaluation", "Metrics"],
    model: "claude-3.7",
    timeAgo: "1h",
    recency: "week",
  },
  {
    id: "pricing-model",
    type: "session",
    session: "Credit pricing model",
    preview: "Per-model credit costs and how trial credits should roll over.",
    breadcrumb: ["Root", "Pricing", "Credits"],
    model: "gpt-4o",
    timeAgo: "5h",
    recency: "week",
  },
  {
    id: "db-schema",
    type: "node",
    session: "Multi-tenant DB schema",
    preview: "Row-level security with a tenant_id column vs schema-per-tenant isolation.",
    breadcrumb: ["Root", "Schema", "Tenancy"],
    model: "claude-3.7",
    timeAgo: "1d",
    recency: "week",
  },
  {
    id: "launch-plan",
    type: "session",
    session: "Launch checklist Q3",
    preview: "Sequencing the public launch, waitlist emails, and status page.",
    breadcrumb: ["Root", "Launch", "Checklist"],
    model: "gpt-4o-mini",
    timeAgo: "3d",
    recency: "week",
  },
  {
    id: "brand-voice",
    type: "node",
    session: "Brand voice exploration",
    preview: "Technical but human — confident without hype. Avoid buzzwords.",
    breadcrumb: ["Root", "Brand", "Voice"],
    model: "claude-3.7",
    timeAgo: "5d",
    recency: "week",
  },
  {
    id: "api-design",
    type: "node",
    session: "Public API surface design",
    preview: "Resource naming for nodes, branches, and sessions in the REST API.",
    breadcrumb: ["Root", "API", "Resources"],
    model: "gpt-4o",
    timeAgo: "6d",
    recency: "month",
  },
  {
    id: "ml-paper",
    type: "node",
    session: "Reading: attention is all you need",
    preview: "Notes on scaled dot-product attention and multi-head projections.",
    breadcrumb: ["Root", "Papers", "Attention"],
    model: "gemini-2.0",
    timeAgo: "12d",
    recency: "month",
  },
]

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sessions", label: "Sessions" },
  { id: "nodes", label: "Nodes" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
]

function modelMeta(id: ModelId) {
  return MODELS.find((m) => m.id === id) ?? MODELS[0]
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Simulate async search: the debounce settles behind the live query, and
  // `loading` is derived from the gap. State changes only inside the timer.
  const [settledQuery, setSettledQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSettledQuery(query), 450)
    return () => clearTimeout(t)
  }, [query])
  const loading = query.trim().length > 0 && settledQuery !== query

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return RESULTS.filter((r) => {
      if (filter === "sessions" && r.type !== "session") return false
      if (filter === "nodes" && r.type !== "node") return false
      if (filter === "week" && r.recency !== "week") return false
      if (filter === "month" && r.recency !== "month") return false
      if (q.length === 0) return true
      return (
        r.session.toLowerCase().includes(q) ||
        r.preview.toLowerCase().includes(q) ||
        r.breadcrumb.some((b) => b.toLowerCase().includes(q))
      )
    })
  }, [query, filter])

  const hasQuery = query.trim().length > 0

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Search input */}
        <div className="border-b border-border px-6 py-5">
          <div className="relative mx-auto max-w-3xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sessions and nodes..."
              className="w-full rounded-xl border border-input bg-card py-3.5 pl-12 pr-11 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-3xl">
            {loading ? (
              <SkeletonRows />
            ) : results.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {results.length} result{results.length === 1 ? "" : "s"}
                  {hasQuery && ` for "${query}"`}
                </p>
                <ul className="flex flex-col gap-2">
                  {results.map((r) => (
                    <ResultRow
                      key={r.id}
                      result={r}
                      onOpen={() => router.push("/app")}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ResultRow({
  result,
  onOpen,
}: {
  result: SearchResult
  onOpen: () => void
}) {
  const model = modelMeta(result.model)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-ring/60 hover:bg-accent/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium",
                result.type === "session"
                  ? "bg-node-user/15 text-node-user"
                  : "bg-node-ai/15 text-node-ai",
              )}
            >
              {result.type === "session" ? (
                <MessageSquareText className="size-3" />
              ) : (
                <GitBranch className="size-3" />
              )}
              {result.type}
            </span>
            <span className="truncate text-sm font-semibold text-card-foreground">
              {result.session}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {result.timeAgo} ago
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {result.preview}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Breadcrumb */}
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            {result.breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40">›</span>}
                <span className={cn(i === result.breadcrumb.length - 1 && "text-foreground")}>
                  {b}
                </span>
              </span>
            ))}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ backgroundColor: model.dot }}
            />
            {model.name}
          </span>
          <span className="ml-auto hidden items-center gap-1 font-mono text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex">
            Open <CornerDownLeft className="size-3" />
          </span>
        </div>
      </button>
    </li>
  )
}

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
        <Search className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold">
        {query.trim() ? `No results for "${query}"` : "Search your graph"}
      </h2>
      <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
        {query.trim()
          ? "Try different keywords, check your spelling, or remove filters to broaden the search."
          : "Find any session or node across your workspace. Start typing to search."}
      </p>
    </div>
  )
}
