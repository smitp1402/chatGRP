import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { NODE_SELECT, toCanvasNodes, type NodeWithJoins } from "@/lib/canvas-node"
import { CREDIT_TABLE, type CanvasNode, type ModelId } from "@chatgrp/shared"

type Params = { params: Promise<{ id: string }> }

/** GET /api/sessions/:id/nodes — all nodes for a session as canvas view models. */
export async function GET(_request: Request, { params }: Params) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data, error } = await supabase
    .from("nodes")
    .select(NODE_SELECT)
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true })

  if (error) return fail(error.message, 500)

  return ok(toCanvasNodes((data ?? []) as unknown as NodeWithJoins[]))
}

interface CreateNodeBody {
  parentId?: string | null
  question?: string
  answer?: string
  modelId?: ModelId
}

/**
 * POST /api/sessions/:id/nodes — create a node with its user+assistant messages.
 * Used as a dev seed in Phase 1B; real node creation flows through FastAPI
 * /generate in Phase 2.
 */
export async function POST(request: Request, { params }: Params) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = (await request.json().catch(() => ({}))) as CreateNodeBody
  const parentId = body.parentId ?? null
  const modelId: ModelId = body.modelId ?? "gpt-4o-mini"
  const question = body.question ?? "Sample question — what should I explore next?"
  const answer =
    body.answer ?? "Sample assistant reply. Real AI responses arrive in Phase 3."

  // order_index = number of existing siblings under this parent.
  const { count } = await supabase
    .from("nodes")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("parent_id", parentId as never)

  const { data: node, error: nodeErr } = await supabase
    .from("nodes")
    .insert({
      session_id: sessionId,
      parent_id: parentId,
      is_fork: false,
      order_index: count ?? 0,
      position_x: 0,
      position_y: 0,
    })
    .select("id")
    .single()

  if (nodeErr) return fail(nodeErr.message, 500)

  const { error: msgErr } = await supabase.from("messages").insert([
    { node_id: node.id, session_id: sessionId, role: "user", content: question },
    { node_id: node.id, session_id: sessionId, role: "assistant", content: answer },
  ])
  if (msgErr) return fail(msgErr.message, 500)

  // A completed generation attempt so the canvas node shows a model badge.
  await supabase.from("generation_attempts").insert({
    node_id: node.id,
    model_id: modelId,
    status: "completed",
    tokens_input: 0,
    tokens_output: 0,
  })

  const created: CanvasNode = {
    id: node.id,
    parentId,
    isFork: false,
    starred: false,
    collapsed: false,
    question,
    answer,
    modelId,
    credits: CREDIT_TABLE[modelId] ?? 0,
    attachments: [],  // dev-seeded nodes carry no files
    x: 0,
    y: 0,
  }
  return ok(created, { status: 201 })
}
