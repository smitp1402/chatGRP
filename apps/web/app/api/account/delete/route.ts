import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"

/** POST /api/account/delete — permanently delete the user + all their data. */
export async function POST() {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { error } = await supabase.rpc("delete_account")
  if (error) return fail(error.message, 500)

  return ok({ deleted: true })
}
