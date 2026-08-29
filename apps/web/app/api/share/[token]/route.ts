import { createAdminClient } from "@/lib/supabase/admin"
import { ok, fail } from "@/lib/api-response"
import { SHARE_NODE_SELECT, toCanvasNodes, type NodeWithJoins } from "@/lib/canvas-node"

type Params = { params: Promise<{ token: string }> }

/** Rejects path segments that are not UUIDs before they ever reach the database. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/share/:token — public, unauthenticated read of one shared session.
 *
 * This is the only route that serves session data without a user. It uses the
 * service-role client (RLS bypassed), so the token lookup is the entire access
 * check: no token match, no data. Nothing here is derived from the caller's
 * identity, and only the columns the share page renders are selected.
 */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params
  if (!UUID.test(token)) return fail("Not found", 404)

  const admin = createAdminClient()

  const { data: session, error: sessionErr } = await admin
    .from("sessions")
    .select("id, name, created_at")
    .eq("share_token", token)
    .maybeSingle()

  if (sessionErr) return fail(sessionErr.message, 500)
  if (!session) return fail("This link is no longer available.", 404)

  const { data, error } = await admin
    .from("nodes")
    .select(SHARE_NODE_SELECT)
    .eq("session_id", session.id)
    .order("order_index", { ascending: true })

  if (error) return fail(error.message, 500)

  return ok({
    name: session.name as string,
    createdAt: session.created_at as string,
    nodes: toCanvasNodes((data ?? []) as unknown as NodeWithJoins[]),
  })
}
