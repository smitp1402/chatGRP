import { GitBranch, Plus, Send } from "lucide-react"

const SESSIONS = ["Distributed systems", "RAG evaluation", "Pricing model", "DB schema"]

export function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-node-user/70" />
        <span className="size-2.5 rounded-full bg-node-fork/70" />
        <span className="size-2.5 rounded-full bg-node-ai/70" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">chatgrp.app/app</span>
      </div>

      <div className="grid h-[340px] grid-cols-[132px_1fr_180px] md:grid-cols-[160px_1fr_220px]">
        {/* Sidebar */}
        <aside className="hidden flex-col gap-1 border-r border-border bg-sidebar p-3 sm:flex">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Graphs</span>
            <Plus className="size-3.5 text-muted-foreground" />
          </div>
          {SESSIONS.map((s, i) => (
            <div
              key={s}
              className={`truncate rounded-md px-2 py-1.5 text-xs ${
                i === 0 ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <div className="canvas-grid relative bg-canvas">
          <svg viewBox="0 0 320 340" className="h-full w-full" role="img" aria-label="Conversation graph preview">
            {/* edges */}
            <path d="M96 60 V110" className="stroke-border" strokeWidth="2" fill="none" />
            <path d="M96 152 V202" className="stroke-border" strokeWidth="2" fill="none" />
            <path d="M136 131 C 190 131, 200 210, 214 250" className="stroke-node-fork/60" strokeWidth="2" strokeDasharray="4 4" fill="none" />

            {/* root user node */}
            <g>
              <rect x="40" y="30" width="112" height="30" rx="8" className="fill-node-user" />
              <rect x="50" y="41" width="60" height="4" rx="2" className="fill-node-user-foreground/70" />
              <rect x="50" y="49" width="38" height="4" rx="2" className="fill-node-user-foreground/45" />
            </g>
            {/* ai reply */}
            <g>
              <rect x="40" y="110" width="112" height="42" rx="8" className="fill-node-ai" />
              <rect x="50" y="121" width="72" height="4" rx="2" className="fill-node-ai-foreground/70" />
              <rect x="50" y="129" width="58" height="4" rx="2" className="fill-node-ai-foreground/50" />
              <rect x="50" y="137" width="40" height="4" rx="2" className="fill-node-ai-foreground/40" />
            </g>
            {/* second user node */}
            <g>
              <rect x="40" y="202" width="112" height="30" rx="8" className="fill-node-user" />
              <rect x="50" y="213" width="52" height="4" rx="2" className="fill-node-user-foreground/70" />
              <rect x="50" y="221" width="34" height="4" rx="2" className="fill-node-user-foreground/45" />
            </g>
            {/* forked branch node */}
            <g>
              <rect x="196" y="234" width="104" height="40" rx="8" className="fill-card stroke-node-fork" strokeWidth="1.5" strokeDasharray="4 3" />
              <rect x="206" y="245" width="60" height="4" rx="2" className="fill-node-fork/80" />
              <rect x="206" y="253" width="44" height="4" rx="2" className="fill-muted-foreground/50" />
            </g>
          </svg>
        </div>

        {/* Chat rail */}
        <aside className="flex flex-col border-l border-border bg-card p-3">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <GitBranch className="size-3.5 text-primary" />
            Node thread
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-sm bg-node-user px-2.5 py-1.5 text-[11px] leading-snug text-node-user-foreground">
              How would you shard this?
            </div>
            <div className="mr-auto max-w-[92%] rounded-lg rounded-tl-sm bg-accent px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
              Partition by tenant ID, then range-shard within each tenant to keep hot keys balanced.
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <span className="flex-1 text-[11px] text-muted-foreground">Reply to this node…</span>
            <Send className="size-3.5 text-primary" />
          </div>
        </aside>
      </div>
    </div>
  )
}
