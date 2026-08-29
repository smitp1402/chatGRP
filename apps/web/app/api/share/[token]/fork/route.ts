import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail, getUserId } from "@/lib/api-response"

type Params = { params: Promise<{ token: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Upper bound on a single fork. Copying is unmetered work triggered by anyone
 * holding a link, so it needs a ceiling even though the graph is the owner's.
 */
const MAX_FORK_NODES = 500

interface SourceNode {
  id: string
  parent_id: string | null
  is_fork: boolean
  starred: boolean
  position_x: number
  position_y: number
  order_index: number
}

interface SourceMessage {
  node_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

/**
 * POST /api/share/:token/fork — copy a shared graph into the caller's account.
 *
 * Reads the source with the service-role client (the caller does not own it;
 * the share token is the entire read capability) and writes everything as the
 * caller, so the copy is theirs outright.
 *
 * Copied: nodes, their messages, and a completed generation_attempt per node so
 * the original model badges survive as honest history.
 *
 * Not copied: attachments — the files live under the original owner's storage
 * prefix and stay private; usage_ledger — the fork costs the new owner nothing.
 */
export async function POST(_request: Request, { params }: Params) {
  const { token } = await params
  if (!UUID.test(token)) return fail("Not found", 404)

  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Sign in to fork this graph", 401)

  const admin = createAdminClient()

  const { data: source, error: sourceErr } = await admin
    .from("sessions")
    .select("id, name")
    .eq("share_token", token)
    .maybeSingle()

  if (sourceErr) return fail(sourceErr.message, 500)
  if (!source) return fail("This link is no longer available.", 404)

  const { data: nodeRows, error: nodesErr } = await admin
    .from("nodes")
    .select("id, parent_id, is_fork, starred, position_x, position_y, order_index")
    .eq("session_id", source.id)
    .order("order_index", { ascending: true })

  if (nodesErr) return fail(nodesErr.message, 500)
  const sourceNodes = (nodeRows ?? []) as SourceNode[]

  if (sourceNodes.length > MAX_FORK_NODES) {
    return fail(`This graph is too large to fork (over ${MAX_FORK_NODES} nodes).`, 413)
  }

  const { data: messageRows, error: msgErr } = await admin
    .from("messages")
    .select("node_id, role, content, created_at")
    .eq("session_id", source.id)
    .order("created_at", { ascending: true })

  if (msgErr) return fail(msgErr.message, 500)
  const sourceMessages = (messageRows ?? []) as SourceMessage[]

  const { data: attemptRows } = await admin
    .from("generation_attempts")
    .select("node_id, model_id, status")
    .in("node_id", sourceNodes.map((n) => n.id))

  const modelByNode = new Map(
    (attemptRows ?? [])
      .filter((a) => (a as { status: string }).status === "completed")
      .map((a) => [a.node_id as string, a.model_id as string]),
  )

  // Create the destination session as the caller — RLS applies from here on.
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({ user_id: userId, name: `${source.name} (fork)` })
    .select("id")
    .single()

  if (sessionErr) return fail(sessionErr.message, 500)
  const sessionId = session.id as string

  if (sourceNodes.length === 0) return ok({ sessionId, nodeCount: 0 }, { status: 201 })

  // Group by depth and insert a level at a time, with ids generated here so
  // every child already knows its remapped parent. One round trip per level
  // instead of one per node — a 500-node graph was 500 sequential inserts.
  const byId = new Map(sourceNodes.map((n) => [n.id, n]))
  const depthOf = (n: SourceNode): number => {
    let d = 0
    let cursor = n.parent_id
    const seen = new Set<string>()
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor)
      d += 1
      cursor = byId.get(cursor)?.parent_id ?? null
    }
    return d
  }

  const idMap = new Map<string, string>(sourceNodes.map((n) => [n.id, crypto.randomUUID()]))

  const levels = new Map<number, SourceNode[]>()
  for (const node of sourceNodes) {
    const d = depthOf(node)
    levels.set(d, [...(levels.get(d) ?? []), node])
  }

  for (const d of [...levels.keys()].sort((a, b) => a - b)) {
    const rows = levels.get(d)!.map((node) => ({
      id: idMap.get(node.id)!,
      session_id: sessionId,
      // A parent outside this graph would orphan the row — treat it as a root.
      parent_id: node.parent_id ? (idMap.get(node.parent_id) ?? null) : null,
      is_fork: node.is_fork,
      starred: node.starred,
      position_x: node.position_x,
      position_y: node.position_y,
      order_index: node.order_index,
    }))
    const { error } = await supabase.from("nodes").insert(rows)
    if (error) return fail(error.message, 500)
  }

  const messagesToInsert = sourceMessages
    .filter((m) => idMap.has(m.node_id))
    .map((m) => ({
      node_id: idMap.get(m.node_id)!,
      session_id: sessionId,
      role: m.role,
      content: m.content,
    }))

  if (messagesToInsert.length > 0) {
    const { error } = await supabase.from("messages").insert(messagesToInsert)
    if (error) return fail(error.message, 500)
  }

  // Model badges only — zero tokens, and nothing written to usage_ledger, so
  // the fork does not look like generations the new owner paid for.
  const attemptsToInsert = [...idMap.entries()]
    .filter(([sourceId]) => modelByNode.has(sourceId))
    .map(([sourceId, newId]) => ({
      node_id: newId,
      model_id: modelByNode.get(sourceId)!,
      status: "completed",
      tokens_input: 0,
      tokens_output: 0,
    }))

  if (attemptsToInsert.length > 0) {
    await supabase.from("generation_attempts").insert(attemptsToInsert)
  }

  return ok({ sessionId, nodeCount: sourceNodes.length }, { status: 201 })
}
