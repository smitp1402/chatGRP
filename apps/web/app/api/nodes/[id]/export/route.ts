import { createClient } from "@/lib/supabase/server"
import { fail, getUserId } from "@/lib/api-response"
import { modelById, type ModelId } from "@chatgrp/shared"

type Params = { params: Promise<{ id: string }> }

interface NodeRow {
  id: string
  parent_id: string | null
  session_id: string
}
interface MessageRow {
  id: string
  node_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

/** GET /api/nodes/:id/export — download the branch (root→node) as markdown. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  // Find the node's session, then load all its nodes to walk the parent chain.
  const { data: target } = await supabase
    .from("nodes")
    .select("id, parent_id, session_id")
    .eq("id", id)
    .single()
  if (!target) return fail("Node not found", 404)

  const sessionId = (target as NodeRow).session_id

  const { data: nodesData } = await supabase
    .from("nodes")
    .select("id, parent_id, session_id")
    .eq("session_id", sessionId)
  const nodes = (nodesData ?? []) as NodeRow[]
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // Walk root -> node.
  const path: string[] = []
  const seen = new Set<string>()
  let cursor: string | null = id
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    path.push(cursor)
    cursor = byId.get(cursor)?.parent_id ?? null
  }
  path.reverse()

  const { data: msgData } = await supabase
    .from("messages")
    .select("id, node_id, role, content, created_at")
    .in("node_id", path)
    .order("created_at", { ascending: true })
  const messages = (msgData ?? []) as MessageRow[]

  // File names per user message, so an export records what was attached even
  // though the markdown cannot carry the files themselves.
  const { data: attachmentRows } = await supabase
    .from("attachments")
    .select("message_id, file_name")
    .in(
      "message_id",
      messages.filter((m) => m.role === "user").map((m) => m.id),
    )
  const filesByMessage = new Map<string, string[]>()
  for (const row of (attachmentRows ?? []) as { message_id: string; file_name: string }[]) {
    filesByMessage.set(row.message_id, [
      ...(filesByMessage.get(row.message_id) ?? []),
      row.file_name,
    ])
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("name")
    .eq("id", sessionId)
    .single()

  // Fetch model per node for a small annotation.
  const { data: attempts } = await supabase
    .from("generation_attempts")
    .select("node_id, model_id, status")
    .in("node_id", path)
  const modelByNode = new Map(
    (attempts ?? [])
      .filter((a) => (a as { status: string }).status === "completed")
      .map((a) => [a.node_id as string, a.model_id as string]),
  )

  const breadcrumb = path
    .map((nid) => messages.find((m) => m.node_id === nid && m.role === "user")?.content ?? "")
    .map((q) => (q.length > 40 ? `${q.slice(0, 40)}…` : q))
    .join(" › ")

  const lines: string[] = [
    `# ${session?.name ?? "ChatGRP branch"}`,
    "",
    `> **Path:** ${breadcrumb}`,
    "",
    "---",
    "",
  ]

  for (const nid of path) {
    const userMessage = messages.find((m) => m.node_id === nid && m.role === "user")
    const user = userMessage?.content ?? ""
    const assistant =
      messages.find((m) => m.node_id === nid && m.role === "assistant")?.content ?? ""
    const modelId = modelByNode.get(nid) as ModelId | undefined
    const modelName = modelId ? modelById(modelId)?.name : undefined
    const files = userMessage ? (filesByMessage.get(userMessage.id) ?? []) : []

    lines.push(`### 🧑 ${user}`, "")
    if (files.length > 0) lines.push(`📎 _Attached: ${files.join(", ")}_`, "")
    if (assistant) {
      lines.push(assistant, "")
      if (modelName) lines.push(`_— ${modelName}_`, "")
    }
  }

  const markdown = lines.join("\n")
  const filename = `${(session?.name ?? "branch").replace(/[^\w-]+/g, "-").toLowerCase()}.md`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
