import { createClient } from "@/lib/supabase/client"
import type { ModelId } from "@chatgrp/shared"

const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000"

export interface GenerateInput {
  sessionId: string
  message: string
  modelId: ModelId
  parentId: string | null
}

export interface GenerateCallbacks {
  onNode?: (nodeId: string, parentId: string | null) => void
  onToken?: (chunk: string) => void
  onDone?: (nodeId: string) => void
  onError?: (message: string) => void
}

/** POST to the FastAPI /generate endpoint and consume its SSE stream. */
export async function generateStream(
  input: GenerateInput,
  cb: GenerateCallbacks,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    cb.onError?.("Not authenticated — please log in again.")
    return
  }

  let res: Response
  try {
    res = await fetch(`${AI_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: input.sessionId,
        message: input.message,
        model_id: input.modelId,
        parent_id: input.parentId,
      }),
    })
  } catch {
    cb.onError?.("Could not reach the AI service. Is `pnpm dev:ai` running?")
    return
  }

  if (!res.ok || !res.body) {
    cb.onError?.(`Generation failed (${res.status})`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by a blank line — tolerate LF or CRLF endings.
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ""
    for (const block of blocks) {
      const { event, data } = parseSseBlock(block)
      if (!event) continue
      if (event === "node") {
        const p = JSON.parse(data) as { node_id: string; parent_id: string | null }
        cb.onNode?.(p.node_id, p.parent_id)
      } else if (event === "token") {
        cb.onToken?.(data)
      } else if (event === "done") {
        const p = JSON.parse(data) as { node_id: string }
        cb.onDone?.(p.node_id)
      } else if (event === "error") {
        cb.onError?.(data)
      }
    }
  }
}

function parseSseBlock(block: string): { event: string | null; data: string } {
  let event: string | null = null
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
  }
  return { event, data: dataLines.join("\n") }
}
