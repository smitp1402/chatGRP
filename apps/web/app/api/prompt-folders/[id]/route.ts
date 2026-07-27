import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"

type Params = { params: Promise<{ id: string }> }

/** DELETE /api/prompt-folders/:id — delete a folder (its prompts become unfiled). */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  // Unfile prompts in this folder, then delete it (FK is ON DELETE SET NULL,
  // but do it explicitly so the UI updates predictably).
  await supabase.from("saved_prompts").update({ folder_id: null }).eq("folder_id", id)
  const { error } = await supabase.from("prompt_folders").delete().eq("id", id)
  if (error) return fail(error.message, 500)

  return ok({ id })
}
