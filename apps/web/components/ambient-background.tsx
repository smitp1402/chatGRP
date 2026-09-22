import { cn } from '@/lib/utils'

/**
 * The light the material surfaces sit in.
 *
 * Deliberately faint — `--ambient-opacity` is 0.16 in dark and 0.3 in light.
 * Without it the tonal surfaces read as flat grey rectangles; turned up any
 * further it stops looking like a professional tool.
 *
 * Fixed and non-interactive, so it never participates in layout or hit testing.
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}
    >
      <div
        className="ambient-blob -left-40 -top-56 size-[42rem]"
        style={{ background: 'radial-gradient(circle, var(--ambient-1), transparent 65%)' }}
      />
      <div
        className="ambient-blob -right-44 top-1/4 size-[38rem]"
        style={{ background: 'radial-gradient(circle, var(--ambient-2), transparent 65%)' }}
      />
      {/* Keeps the large blurred planes from banding on wide gamut displays. */}
      <div className="grain-overlay absolute inset-0" />
    </div>
  )
}
