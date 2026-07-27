import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { promptCreateSchema } from "@/lib/validation"
import { FREE_PROMPT_LIMIT, type SavedPrompt } from "@chatgrp/shared"

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPrompt(row: any): SavedPrompt {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    variables: row.variables ?? [],
    tags: row.tags ?? [],
    folderId: row.folder_id ?? null,
    defaultModelId: row.default_model_id ?? null,
    visibility: row.visibility,
    usageCount: row.usage_count ?? 0,
    lastUsedAt: row.last_used_at ?? null,
  }
}

const COLS =
  "id, title, body, kind, variables, tags, folder_id, default_model_id, visibility, usage_count, last_used_at"

/** GET /api/prompts?q=&folder=&tag= — list the user's prompts (recent first). */
export async function GET(request: Request) {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim().toLowerCase()
  const folder = searchParams.get("folder")
  const tag = searchParams.get("tag")

  let query = supabase
    .from("saved_prompts")
    .select(COLS)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (folder) query = query.eq("folder_id", folder)
  if (tag) query = query.contains("tags", [tag])

  const { data, error } = await query
  if (error) return fail(error.message, 500)

  let prompts = (data ?? []).map(toPrompt)
  if (q) {
    prompts = prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
  return ok(prompts)
}

/** POST /api/prompts — create a prompt (Free tier capped at 10). */
export async function POST(request: Request) {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = promptCreateSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)

  // Enforce the Free-tier cap.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", userId)
    .single()
  if ((profile?.plan ?? "free") === "free") {
    const { count } = await supabase
      .from("saved_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
    if ((count ?? 0) >= FREE_PROMPT_LIMIT) {
      return fail(`Free tier is limited to ${FREE_PROMPT_LIMIT} prompts. Upgrade for unlimited.`, 403)
    }
  }

  const p = parsed.data
  const { data, error } = await supabase
    .from("saved_prompts")
    .insert({
      user_id: userId,
      title: p.title,
      body: p.body,
      kind: p.kind,
      variables: p.variables,
      tags: p.tags,
      folder_id: p.folderId ?? null,
      default_model_id: p.defaultModelId ?? null,
      visibility: p.visibility,
    })
    .select(COLS)
    .single()

  if (error) return fail(error.message, 500)
  return ok(toPrompt(data), { status: 201 })
}
