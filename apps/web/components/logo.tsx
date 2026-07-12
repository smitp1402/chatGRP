import { cn } from '@/lib/utils'

export function Logo({
  className,
  showWordmark = true,
  animated = true,
}: {
  className?: string
  showWordmark?: boolean
  animated?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('shrink-0', animated && 'logo-animated')}
      >
        <line
          className="logo-edge"
          x1="6"
          y1="6"
          x2="6"
          y2="18"
          stroke="var(--color-node-user)"
          strokeWidth="1.5"
        />
        <line
          className="logo-edge"
          x1="6"
          y1="6"
          x2="18"
          y2="6"
          stroke="var(--color-node-ai)"
          strokeWidth="1.5"
        />
        <line
          className="logo-edge"
          x1="6"
          y1="18"
          x2="18"
          y2="18"
          stroke="var(--color-node-fork)"
          strokeWidth="1.5"
        />
        <circle className="logo-node" cx="6" cy="6" r="3.2" fill="var(--color-node-user)" />
        <circle className="logo-node" cx="18" cy="6" r="3.2" fill="var(--color-node-ai)" />
        <circle className="logo-node" cx="6" cy="18" r="3.2" fill="var(--color-primary)" />
        <circle className="logo-node" cx="18" cy="18" r="3.2" fill="var(--color-node-fork)" />
      </svg>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          Chat<span className="text-primary">GRP</span>
        </span>
      )}
    </div>
  )
}
