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

/**
 * Copy a shared graph into the signed-in user's account.
 *
 * Throws with a 401-flavoured message when there is no session — the caller
 * turns that into a sign-up redirect rather than an error toast.
 */
export async function forkSharedGraph(
  token: string,
): Promise<{ sessionId: string; nodeCount: number }> {
  const res = await fetch(`/api/share/${token}/fork`, { method: "POST" })
  if (res.status === 401) throw new UnauthenticatedError()
  return unwrap<{ sessionId: string; nodeCount: number }>(res)
}

/** Thrown when forking is attempted without a session. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign in to fork this graph")
    this.name = "UnauthenticatedError"
  }
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
