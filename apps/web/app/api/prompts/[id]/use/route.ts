import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"

type Params = { params: Promise<{ id: string }> }

/** POST /api/prompts/:id/use — bump usage_count + last_used_at (powers recents). */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data: current } = await supabase
    .from("saved_prompts")
    .select("usage_count")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("saved_prompts")
    .update({
      usage_count: (current?.usage_count ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return fail(error.message, 500)
  return ok({ id })
}
