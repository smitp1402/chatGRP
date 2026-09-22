/**
 * What the assistant bubble shows before the first token arrives.
 *
 * That gap is long enough to need explaining: a cold Cloud Run instance boots
 * in 3-8s (min-instances is 0), then the service makes its ownership, quota
 * and context queries, and only then does the provider start producing. A
 * single static "Thinking…" across all of that reads as a hang.
 *
 * The phase is driven by real signals, never a guess — see chat-panel.tsx.
 * `connecting` holds until the server's `node` event proves the request was
 * accepted; `thinking` means we are waiting on the model alone.
 */
export type StreamPhase = 'connecting' | 'waking' | 'thinking'

const LABEL: Record<StreamPhase, string> = {
  connecting: 'Connecting…',
  waking: 'Waking the AI service…',
  thinking: 'Thinking…',
}

/** Staggered so the dots read as a wave rather than three things blinking. */
const DOT_DELAYS_MS = [0, 160, 320]

export function ThinkingIndicator({ phase }: { phase: StreamPhase }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-muted-foreground"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {DOT_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-pulse rounded-full bg-current"
            style={{ animationDelay: `${delay}ms`, animationDuration: '1100ms' }}
          />
        ))}
      </span>
      {LABEL[phase]}
    </span>
  )
}
