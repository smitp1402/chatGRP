export default function AppLoading() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar skeleton */}
      <div className="flex w-56 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-3">
        <div className="h-8 w-24 animate-pulse rounded bg-accent/50" />
        <div className="mt-2 h-9 animate-pulse rounded-lg bg-accent/50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-accent/40" />
        ))}
      </div>
      {/* Canvas skeleton */}
      <div className="relative flex-1 bg-canvas">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </div>
    </div>
  )
}
