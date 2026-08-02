import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"

/** POST /api/onboarding — mark the user onboarded + save their default model. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = (await request.json().catch(() => ({}))) as { defaultModelId?: string | null }

  // Security-definer RPC updates only `onboarded` + `default_model_id` — never plan.
  const { error } = await supabase.rpc("complete_onboarding", {
    model: body.defaultModelId ?? null,
  })
  if (error) return fail(error.message, 500)

  return ok({ onboarded: true })
}
