import Dagre from "@dagrejs/dagre"
import type { CanvasNode } from "@chatgrp/shared"

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 116

/**
 * Computes a top-down tree layout for the graph. A node keeps its stored
 * position if it was ever moved (non-zero); otherwise it gets an auto-layout
 * position so freshly created nodes never stack at the origin.
 */
export function autoLayout(nodes: CanvasNode[]): Record<string, { x: number; y: number }> {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 72 })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const n of nodes) {
    if (n.parentId && nodes.some((p) => p.id === n.parentId)) {
      g.setEdge(n.parentId, n.id)
    }
  }

  Dagre.layout(g)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) {
    const hasStoredPosition = n.x !== 0 || n.y !== 0
    if (hasStoredPosition) {
      positions[n.id] = { x: n.x, y: n.y }
      continue
    }
    const laidOut = g.node(n.id)
    // Dagre returns center coords; React Flow uses top-left.
    positions[n.id] = {
      x: laidOut.x - NODE_WIDTH / 2,
      y: laidOut.y - NODE_HEIGHT / 2,
    }
  }
  return positions
}
