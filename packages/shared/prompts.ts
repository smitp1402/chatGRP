import type { ModelId } from "./credits"

export type PromptKind = "user_prompt" | "system_prompt"
export type PromptVisibility = "private" | "team"

export interface PromptVariable {
  name: string
  label: string
  default?: string
}

export interface SavedPrompt {
  id: string
  title: string
  body: string
  kind: PromptKind
  variables: PromptVariable[]
  tags: string[]
  folderId: string | null
  defaultModelId: ModelId | null
  visibility: PromptVisibility
  usageCount: number
  lastUsedAt: string | null
}

export interface PromptFolder {
  id: string
  name: string
}

/** Free tier can save at most this many prompts. */
export const FREE_PROMPT_LIMIT = 10

const VAR_RE = /\{\{\s*([\w-]+)\s*\}\}/g

/** Distinct variable names referenced in a template body, e.g. {{topic}}. */
export function extractVariableNames(body: string): string[] {
  const seen = new Set<string>()
  for (const m of body.matchAll(VAR_RE)) seen.add(m[1])
  return [...seen]
}

/** Replace {{name}} placeholders with provided values (missing → empty). */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (_full, name) => values[name] ?? "")
}
