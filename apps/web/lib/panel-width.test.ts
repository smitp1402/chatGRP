import { describe, expect, it } from "vitest"
import {
  SIDEBAR_BOUNDS,
  clampWidth,
  isResizeKey,
  parseStored,
  renderedWidth,
  resolveDrag,
  resolveKey,
  serialize,
  toggleCollapsed,
  type PanelState,
} from "./panel-width"

const B = SIDEBAR_BOUNDS
const expanded = (width: number): PanelState => ({ width, collapsed: false })

describe("clampWidth", () => {
  it("keeps a width that is already in range", () => {
    expect(clampWidth(260)).toBe(260)
  })

  it("clamps to the bounds", () => {
    expect(clampWidth(B.min - 80)).toBe(B.min)
    expect(clampWidth(B.max + 500)).toBe(B.max)
  })

  it("rounds to whole pixels so the layout never lands on a subpixel", () => {
    expect(clampWidth(260.6)).toBe(261)
  })

  it("falls back to the default for values that are not finite", () => {
    expect(clampWidth(Number.NaN)).toBe(B.default)
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(B.default)
  })
})

describe("resolveDrag", () => {
  it("tracks the pointer while inside the bounds", () => {
    expect(resolveDrag(300, expanded(224))).toEqual(expanded(300))
  })

  it("clamps rather than letting the panel exceed its bounds", () => {
    expect(resolveDrag(B.max + 200, expanded(224))).toEqual(expanded(B.max))
  })

  it("snaps to collapsed when dragged past the collapse threshold", () => {
    const next = resolveDrag(B.collapseAt - 1, expanded(300))
    expect(next.collapsed).toBe(true)
  })

  it("remembers the expanded width while collapsed, so re-opening restores it", () => {
    const next = resolveDrag(B.collapseAt - 1, expanded(320))
    expect(next.width).toBe(320)
  })

  it("re-expands when dragged back out past the threshold", () => {
    const collapsedState: PanelState = { width: 320, collapsed: true }
    expect(resolveDrag(260, collapsedState)).toEqual(expanded(260))
  })

  it("ignores a pointer position that is not a finite number", () => {
    const current = expanded(240)
    expect(resolveDrag(Number.NaN, current)).toBe(current)
  })
})

describe("renderedWidth", () => {
  it("reports the rail width while collapsed", () => {
    expect(renderedWidth({ width: 320, collapsed: true })).toBe(B.collapsed)
  })

  it("reports the clamped width while expanded", () => {
    expect(renderedWidth(expanded(300))).toBe(300)
    expect(renderedWidth(expanded(9999))).toBe(B.max)
  })
})

describe("resolveKey", () => {
  it("widens and narrows by one step", () => {
    expect(resolveKey("ArrowRight", false, expanded(240))).toEqual(expanded(256))
    expect(resolveKey("ArrowLeft", false, expanded(240))).toEqual(expanded(224))
  })

  it("takes a larger step while shift is held", () => {
    expect(resolveKey("ArrowRight", true, expanded(240))).toEqual(expanded(288))
  })

  it("jumps to the bounds with Home and End", () => {
    expect(resolveKey("Home", false, expanded(240))).toEqual(expanded(B.min))
    expect(resolveKey("End", false, expanded(240))).toEqual(expanded(B.max))
  })

  it("expands a collapsed panel on ArrowRight rather than nudging the rail", () => {
    // Stepping from the 56px rail would still be under the collapse threshold,
    // which would strand keyboard users in the collapsed state.
    expect(resolveKey("ArrowRight", false, { width: 320, collapsed: true })).toEqual(expanded(320))
  })

  it("leaves an already collapsed panel alone on ArrowLeft", () => {
    const collapsedState: PanelState = { width: 320, collapsed: true }
    expect(resolveKey("ArrowLeft", false, collapsedState)).toBe(collapsedState)
  })

  it("returns null for keys it does not handle, so they keep bubbling", () => {
    expect(resolveKey("Enter", false, expanded(240))).toBeNull()
    expect(resolveKey("a", false, expanded(240))).toBeNull()
  })
})

describe("isResizeKey", () => {
  it("claims exactly the keys resolveKey handles", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(isResizeKey(key)).toBe(true)
      expect(resolveKey(key, false, expanded(240))).not.toBeNull()
    }
  })

  it("does not claim other keys", () => {
    for (const key of ["ArrowUp", "Enter", "Tab", " ", "a"]) {
      expect(isResizeKey(key)).toBe(false)
      expect(resolveKey(key, false, expanded(240))).toBeNull()
    }
  })
})

describe("toggleCollapsed", () => {
  it("collapses an expanded panel and keeps its width", () => {
    expect(toggleCollapsed(expanded(300))).toEqual({
      width: 300,
      collapsed: true,
    })
  })

  it("restores the remembered width when expanding", () => {
    expect(toggleCollapsed({ width: 300, collapsed: true })).toEqual(expanded(300))
  })
})

describe("parseStored", () => {
  it("round-trips through serialize", () => {
    const state: PanelState = { width: 300, collapsed: true }
    expect(parseStored(serialize(state))).toEqual(state)
  })

  it("returns null when nothing is stored", () => {
    expect(parseStored(null)).toBeNull()
    expect(parseStored("")).toBeNull()
  })

  it("returns null for malformed JSON instead of throwing", () => {
    expect(parseStored("{not json")).toBeNull()
  })

  it("returns null when the shape is wrong", () => {
    expect(parseStored('"224"')).toBeNull()
    expect(parseStored("null")).toBeNull()
    expect(parseStored('{"collapsed":true}')).toBeNull()
    expect(parseStored('{"width":"wide"}')).toBeNull()
  })

  it("clamps a stored width that is out of range", () => {
    expect(parseStored('{"width":5000,"collapsed":false}')).toEqual(expanded(B.max))
  })

  it("treats a non-boolean collapsed flag as not collapsed", () => {
    expect(parseStored('{"width":240,"collapsed":"yes"}')).toEqual(expanded(240))
  })
})
