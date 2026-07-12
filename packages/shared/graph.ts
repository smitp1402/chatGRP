import type { ModelId } from "./credits"

/** A row in the `sessions` table. */
export interface SessionRow {
  id: string
  user_id: string
  name: string
  layout: unknown | null
  created_at: string
}

/** A row in the `nodes` table — owns graph structure, not content. */
export interface NodeRow {
  id: string
  session_id: string
  parent_id: string | null
  is_fork: boolean
  starred: boolean
  collapsed: boolean
  position_x: number
  position_y: number
  order_index: number
  created_at: string
}

/** A row in the `messages` table — one node has one user + one assistant. */
export interface MessageRow {
  id: string
  node_id: string
  session_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

/** Sidebar list item — a session plus its node count. */
export interface SessionListItem {
  id: string
  name: string
  nodeCount: number
  createdAt: string
}

/** View model the canvas renders — one node = one exchange. */
export interface CanvasNode {
  id: string
  parentId: string | null
  isFork: boolean
  starred: boolean
  collapsed: boolean
  question: string
  answer: string
  modelId: ModelId | null
  credits: number
  x: number
  y: number
}
