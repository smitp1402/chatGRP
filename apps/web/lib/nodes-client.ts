import type { CanvasNode, ModelId } from "@chatgrp/shared"

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return body.data as T
}

const JSON_HEADERS = { "Content-Type": "application/json" }

export function listNodes(sessionId: string): Promise<CanvasNode[]> {
  return fetch(`/api/sessions/${sessionId}/nodes`).then((r) => unwrap<CanvasNode[]>(r))
}

export function createNode(
  sessionId: string,
  input: { parentId?: string | null; question?: string; answer?: string; modelId?: ModelId },
): Promise<CanvasNode> {
  return fetch(`/api/sessions/${sessionId}/nodes`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then((r) => unwrap<CanvasNode>(r))
}

export function updateNode(
  id: string,
  patch: { starred?: boolean; collapsed?: boolean; position_x?: number; position_y?: number },
): Promise<{ id: string }> {
  return fetch(`/api/nodes/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  }).then((r) => unwrap<{ id: string }>(r))
}
