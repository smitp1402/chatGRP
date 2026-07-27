import type { SavedPrompt, PromptFolder } from "@chatgrp/shared"

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!res.ok || !body?.success) throw new Error(body?.error ?? `Request failed (${res.status})`)
  return body.data as T
}

const JSON_HEADERS = { "Content-Type": "application/json" }

export type PromptInput = Partial<Omit<SavedPrompt, "id" | "usageCount" | "lastUsedAt">>

export function listPrompts(params?: { q?: string; folder?: string; tag?: string }): Promise<SavedPrompt[]> {
  const sp = new URLSearchParams()
  if (params?.q) sp.set("q", params.q)
  if (params?.folder) sp.set("folder", params.folder)
  if (params?.tag) sp.set("tag", params.tag)
  const qs = sp.toString()
  return fetch(`/api/prompts${qs ? `?${qs}` : ""}`).then((r) => unwrap<SavedPrompt[]>(r))
}

export function createPrompt(input: PromptInput): Promise<SavedPrompt> {
  return fetch("/api/prompts", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then((r) => unwrap<SavedPrompt>(r))
}

export function updatePrompt(id: string, input: PromptInput): Promise<{ id: string }> {
  return fetch(`/api/prompts/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  }).then((r) => unwrap<{ id: string }>(r))
}

export function deletePrompt(id: string): Promise<{ id: string }> {
  return fetch(`/api/prompts/${id}`, { method: "DELETE" }).then((r) => unwrap<{ id: string }>(r))
}

export function recordPromptUse(id: string): Promise<{ id: string }> {
  return fetch(`/api/prompts/${id}/use`, { method: "POST" }).then((r) => unwrap<{ id: string }>(r))
}

export function listFolders(): Promise<PromptFolder[]> {
  return fetch("/api/prompt-folders").then((r) => unwrap<PromptFolder[]>(r))
}

export function createFolder(name: string): Promise<PromptFolder> {
  return fetch("/api/prompt-folders", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  }).then((r) => unwrap<PromptFolder>(r))
}

export function deleteFolder(id: string): Promise<{ id: string }> {
  return fetch(`/api/prompt-folders/${id}`, { method: "DELETE" }).then((r) =>
    unwrap<{ id: string }>(r),
  )
}
