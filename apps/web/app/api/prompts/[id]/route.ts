import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { promptUpdateSchema } from "@/lib/validation"

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/prompts/:id — update a prompt. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = promptUpdateSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)

  const p = parsed.data
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (p.title !== undefined) patch.title = p.title
  if (p.body !== undefined) patch.body = p.body
  if (p.kind !== undefined) patch.kind = p.kind
  if (p.variables !== undefined) patch.variables = p.variables
  if (p.tags !== undefined) patch.tags = p.tags
  if (p.folderId !== undefined) patch.folder_id = p.folderId
  if (p.defaultModelId !== undefined) patch.default_model_id = p.defaultModelId
  if (p.visibility !== undefined) patch.visibility = p.visibility

  const { error } = await supabase.from("saved_prompts").update(patch).eq("id", id)
  if (error) return fail(error.message, 500)
  return ok({ id })
}

/** DELETE /api/prompts/:id — delete a prompt. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { error } = await supabase.from("saved_prompts").delete().eq("id", id)
  if (error) return fail(error.message, 500)
  return ok({ id })
}
