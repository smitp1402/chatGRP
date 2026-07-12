import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { sessionNameSchema } from "@/lib/validation"
import type { SessionListItem } from "@chatgrp/shared"

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/sessions/:id — rename a session. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = sessionNameSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)

  // RLS ensures the user can only update their own session.
  const { data, error } = await supabase
    .from("sessions")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id, name, created_at, nodes(count)")
    .single()

  if (error) return fail(error.message, 500)
  if (!data) return fail("Session not found", 404)

  const item: SessionListItem = {
    id: data.id,
    name: data.name,
    nodeCount: (data.nodes as { count: number }[] | null)?.[0]?.count ?? 0,
    createdAt: data.created_at,
  }
  return ok(item)
}

/** DELETE /api/sessions/:id — delete a session (cascades to nodes + messages). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { error } = await supabase.from("sessions").delete().eq("id", id)
  if (error) return fail(error.message, 500)

  return ok({ id })
}
