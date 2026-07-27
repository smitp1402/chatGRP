'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface ResizableSplitProps {
  left: ReactNode
  right: ReactNode
  initial?: number
  min?: number
  max?: number
  /** localStorage key to persist the divider position. */
  storageKey?: string
}

/** A two-pane horizontal split with a draggable divider. Self-contained. */
export function ResizableSplit({
  left,
  right,
  initial = 60,
  min = 30,
  max = 80,
  storageKey,
}: ResizableSplitProps) {
  const [pct, setPct] = useState<number>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = window.localStorage.getItem(storageKey)
      if (saved) return Math.min(max, Math.max(min, Number(saved)))
    }
    return initial
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next = ((e.clientX - rect.left) / rect.width) * 100
      setPct(Math.min(max, Math.max(min, next)))
    },
    [min, max],
  )

  const onUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    if (storageKey) window.localStorage.setItem(storageKey, String(Math.round(pct)))
  }, [pct, storageKey])

  useEffect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [onMove, onUp])

  function startDrag() {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div style={{ width: `${pct}%` }} className="h-full min-w-0">
        {left}
      </div>
      <div
        onPointerDown={startDrag}
        role="separator"
        aria-orientation="vertical"
        className="w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/50"
      />
      <div className="h-full min-w-0 flex-1">{right}</div>
    </div>
  )
}
