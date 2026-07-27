import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { folderNameSchema } from "@/lib/validation"
import type { PromptFolder } from "@chatgrp/shared"

/** GET /api/prompt-folders — list the user's folders. */
export async function GET() {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data, error } = await supabase
    .from("prompt_folders")
    .select("id, name")
    .order("name", { ascending: true })
  if (error) return fail(error.message, 500)

  return ok((data ?? []) as PromptFolder[])
}

/** POST /api/prompt-folders — create a folder. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = folderNameSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)

  const { data, error } = await supabase
    .from("prompt_folders")
    .insert({ user_id: userId, name: parsed.data.name })
    .select("id, name")
    .single()
  if (error) return fail(error.message, 500)

  return ok(data as PromptFolder, { status: 201 })
}
