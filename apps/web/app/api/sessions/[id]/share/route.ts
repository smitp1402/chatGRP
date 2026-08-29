import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/sessions/:id/share — mint (or return) this session's share token.
 *
 * Runs on the RLS-scoped client, so a non-owner's update simply matches no rows
 * and we answer 404 rather than leaking whether the session exists.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data: existing, error: readErr } = await supabase
    .from("sessions")
    .select("share_token")
    .eq("id", id)
    .maybeSingle()

  if (readErr) return fail(readErr.message, 500)
  if (!existing) return fail("Session not found", 404)
  if (existing.share_token) return ok({ token: existing.share_token as string })

  const token = crypto.randomUUID()
  const { data, error } = await supabase
    .from("sessions")
    .update({ share_token: token })
    .eq("id", id)
    .select("share_token")
    .maybeSingle()

  if (error) return fail(error.message, 500)
  if (!data) return fail("Session not found", 404)

  return ok({ token: data.share_token as string }, { status: 201 })
}

/** DELETE /api/sessions/:id/share — revoke the link; existing URLs stop working. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data, error } = await supabase
    .from("sessions")
    .update({ share_token: null })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) return fail(error.message, 500)
  if (!data) return fail("Session not found", 404)

  return ok({ revoked: true })
}
