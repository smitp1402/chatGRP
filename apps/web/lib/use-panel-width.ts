"use client"

import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react"
import {
  SIDEBAR_BOUNDS,
  isResizeKey,
  parseStored,
  renderedWidth,
  resolveDrag,
  resolveKey,
  serialize,
  toggleCollapsed,
  type PanelState,
  type WidthBounds,
} from "@/lib/panel-width"
import { useMounted } from "@/lib/use-mounted"

export interface PanelWidthControls {
  /** The width to render, already accounting for the collapsed rail. */
  readonly width: number
  readonly collapsed: boolean
  readonly dragging: boolean
  /**
   * False on the server and for the first client render, true afterwards. The
   * panel uses it to skip its width transition on first paint, so restoring a
   * stored width does not look like an animation the user did not ask for.
   */
  readonly hydrated: boolean
  readonly bounds: WidthBounds
  readonly startDrag: (e: PointerEvent) => void
  readonly onKeyDown: (e: KeyboardEvent) => void
  readonly toggle: () => void
}

function readStored(storageKey: string, bounds: WidthBounds): PanelState | null {
  if (typeof window === "undefined") return null
  try {
    return parseStored(window.localStorage.getItem(storageKey), bounds)
  } catch {
    // Private mode or blocked storage — falling back to the default is fine.
    return null
  }
}

/**
 * Drag-to-resize state for a side panel, persisted per browser.
 *
 * The maths lives in lib/panel-width.ts and is unit tested; this hook is only
 * the DOM wiring around it.
 *
 * Hydration: state is seeded from localStorage in the lazy initializer, but the
 * stored value is not *applied* until `useMounted` flips. The first client
 * render therefore produces the same width the server did, and the stored width
 * lands on the next render — no mismatch, and no setState inside an effect.
 */
export function usePanelWidth(
  /**
   * Ref to the panel element, owned by the caller. The hook deliberately does
   * not create and return it: the React Compiler treats any object containing a
   * ref as ref-valued, which would make every `panel.width` read at render time
   * a "cannot access refs during render" error at the call site.
   */
  panelRef: RefObject<HTMLElement | null>,
  storageKey: string,
  bounds: WidthBounds = SIDEBAR_BOUNDS,
): PanelWidthControls {
  const mounted = useMounted()
  const [state, setState] = useState<PanelState>(
    () => readStored(storageKey, bounds) ?? { width: bounds.default, collapsed: false },
  )
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!mounted) return
    try {
      window.localStorage.setItem(storageKey, serialize(state))
    } catch {
      // Losing the preference is acceptable; failing the render is not.
    }
  }, [state, mounted, storageKey])

  useEffect(() => {
    if (!dragging) return

    function onMove(e: globalThis.PointerEvent) {
      const el = panelRef.current
      if (!el) return
      const left = el.getBoundingClientRect().left
      setState((prev) => resolveDrag(e.clientX - left, prev, bounds))
    }
    function stop() {
      setDragging(false)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)

    // Hold the resize cursor even when the pointer leaves the handle, and keep
    // the drag from selecting the sidebar's text.
    const { style } = document.body
    const prevCursor = style.cursor
    const prevSelect = style.userSelect
    style.cursor = "col-resize"
    style.userSelect = "none"

    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
      // Runs on unmount too, so an interrupted drag cannot strand the cursor.
      style.cursor = prevCursor
      style.userSelect = prevSelect
    }
  }, [dragging, bounds, panelRef])

  const startDrag = useCallback((e: PointerEvent) => {
    // Left button only; a right-click drag should open the context menu.
    if (e.button !== 0) return
    e.preventDefault()
    setDragging(true)
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isResizeKey(e.key)) return
      e.preventDefault()
      const { key, shiftKey } = e
      setState((prev) => resolveKey(key, shiftKey, prev, bounds) ?? prev)
    },
    [bounds],
  )

  const toggle = useCallback(() => setState(toggleCollapsed), [])

  const applied: PanelState = mounted ? state : { width: bounds.default, collapsed: false }

  return {
    width: renderedWidth(applied, bounds),
    collapsed: applied.collapsed,
    dragging,
    hydrated: mounted,
    bounds,
    startDrag,
    onKeyDown,
    toggle,
  }
}
