import type { SessionListItem } from "@chatgrp/shared"

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

export function listSessions(): Promise<SessionListItem[]> {
  return fetch("/api/sessions").then((r) => unwrap<SessionListItem[]>(r))
}

export function createSession(name: string): Promise<SessionListItem> {
  return fetch("/api/sessions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  }).then((r) => unwrap<SessionListItem>(r))
}

export function renameSession(id: string, name: string): Promise<SessionListItem> {
  return fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  }).then((r) => unwrap<SessionListItem>(r))
}

export function deleteSession(id: string): Promise<{ id: string }> {
  return fetch(`/api/sessions/${id}`, { method: "DELETE" }).then((r) =>
    unwrap<{ id: string }>(r),
  )
}
