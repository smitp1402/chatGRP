import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const nodePatchSchema = z.object({
  starred: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

/** PATCH /api/nodes/:id — update node state (star, collapse, position). */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = nodePatchSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)
  if (Object.keys(parsed.data).length === 0) return fail("No fields to update", 422)

  // RLS ensures the node belongs to one of the user's sessions.
  const { data, error } = await supabase
    .from("nodes")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .single()

  if (error) return fail(error.message, 500)
  if (!data) return fail("Node not found", 404)

  return ok({ id: data.id })
}

/** DELETE /api/nodes/:id — delete a node and its whole subtree (FK cascade). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  // parent_id is ON DELETE CASCADE, so descendants + their messages +
  // generation_attempts are removed automatically. RLS scopes to the user.
  const { error } = await supabase.from("nodes").delete().eq("id", id)
  if (error) return fail(error.message, 500)

  return ok({ id })
}
