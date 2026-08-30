import {
  CREDIT_TABLE,
  type AttachmentKind,
  type CanvasAttachment,
  type CanvasNode,
  type ModelId,
} from "@chatgrp/shared"

/**
 * Shape returned by the `nodes` select with its message + attempt joins. Shared
 * by the owner route (`/api/sessions/:id/nodes`) and the public share route so
 * both render identical canvas view models.
 */
export interface NodeWithJoins {
  id: string
  parent_id: string | null
  is_fork: boolean
  starred: boolean
  collapsed: boolean
  position_x: number
  position_y: number
  order_index: number
  messages: {
    role: "user" | "assistant"
    content: string
    attachments:
      | {
          id: string
          storage_path: string
          file_name: string
          mime_type: string
          kind: AttachmentKind
        }[]
      | null
  }[] | null
  generation_attempts: { model_id: string; status: string }[] | null
}

const NODE_COLUMNS =
  "id, parent_id, is_fork, starred, collapsed, position_x, position_y, order_index, "

/** The select string that produces a `NodeWithJoins` row for the owner. */
export const NODE_SELECT =
  NODE_COLUMNS +
  "messages(role, content, attachments(id, storage_path, file_name, mime_type, kind)), " +
  "generation_attempts(model_id, status)"

/**
 * Select for the public share route — deliberately omits the attachments join.
 *
 * A storage path is `{user_id}/{session_id}/{uuid}.{ext}`, so returning one on
 * an unauthenticated endpoint would publish the owner's user id. Shared graphs
 * therefore show the conversation text only; the files stay private.
 */
export const SHARE_NODE_SELECT =
  NODE_COLUMNS + "messages(role, content), generation_attempts(model_id, status)"

/** Collapse a node row and its joins into the view model the canvas renders. */
export function toCanvasNode(n: NodeWithJoins): CanvasNode {
  const messages = n.messages ?? []
  const attempts = n.generation_attempts ?? []
  // Prefer the completed attempt's model — retries can leave earlier rows behind.
  const modelId = (attempts.find((a) => a.status === "completed")?.model_id ??
    attempts[0]?.model_id ??
    null) as ModelId | null

  // Attachments always ride on the user message — the question, not the answer.
  const attachments: CanvasAttachment[] = (
    messages.find((m) => m.role === "user")?.attachments ?? []
  ).map((a) => ({
    id: a.id,
    storagePath: a.storage_path,
    fileName: a.file_name,
    mimeType: a.mime_type,
    kind: a.kind,
  }))

  return {
    id: n.id,
    parentId: n.parent_id ?? null,
    isFork: n.is_fork,
    starred: n.starred,
    collapsed: n.collapsed,
    question: messages.find((m) => m.role === "user")?.content ?? "",
    answer: messages.find((m) => m.role === "assistant")?.content ?? "",
    modelId,
    credits: modelId ? (CREDIT_TABLE[modelId] ?? 0) : 0,
    attachments,
    x: n.position_x,
    y: n.position_y,
  }
}

export function toCanvasNodes(rows: NodeWithJoins[]): CanvasNode[] {
  return rows.map(toCanvasNode)
}
