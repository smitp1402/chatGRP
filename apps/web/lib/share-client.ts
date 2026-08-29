import type { CanvasNode } from "@chatgrp/shared"

/** A shared session as the public share page renders it. */
export interface SharedGraph {
  name: string
  createdAt: string
  nodes: CanvasNode[]
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return body.data as T
}

/** Public read — no session required. */
export async function fetchSharedGraph(token: string): Promise<SharedGraph> {
  return fetch(`/api/share/${token}`).then((r) => unwrap<SharedGraph>(r))
}

/** Owner-only: mint (or fetch) the share token for a session. */
export async function createShareLink(sessionId: string): Promise<string> {
  const { token } = await fetch(`/api/sessions/${sessionId}/share`, {
    method: "POST",
  }).then((r) => unwrap<{ token: string }>(r))
  return token
}

/** Owner-only: revoke the link. Existing URLs stop resolving immediately. */
export async function revokeShareLink(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}/share`, { method: "DELETE" }).then((r) =>
    unwrap<{ revoked: boolean }>(r),
  )
}
