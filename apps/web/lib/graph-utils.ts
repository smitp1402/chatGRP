import type { CanvasNode } from "@chatgrp/shared"

/** Returns the nodes from the root down to `nodeId`, in order. */
export function pathToRoot(nodes: CanvasNode[], nodeId: string | null): CanvasNode[] {
  if (!nodeId) return []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const path: CanvasNode[] = []
  const seen = new Set<string>()
  let cursor: CanvasNode | undefined = byId.get(nodeId)
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    path.push(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return path.reverse()
}

export function truncate(text: string, max = 24): string {
  const clean = text.trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean || "Untitled"
}

/** Breadcrumb labels (short question text) from root to the selected node. */
export function breadcrumbFor(nodes: CanvasNode[], nodeId: string | null): string[] {
  return pathToRoot(nodes, nodeId).map((n) => truncate(n.question))
}
