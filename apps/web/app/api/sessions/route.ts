import { createClient } from "@/lib/supabase/server"
import { ok, fail, getUserId } from "@/lib/api-response"
import { sessionNameSchema } from "@/lib/validation"
import type { SessionListItem } from "@chatgrp/shared"

/** GET /api/sessions — list the authenticated user's sessions with node counts. */
export async function GET() {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const { data, error } = await supabase
    .from("sessions")
    .select("id, name, created_at, nodes(count)")
    .order("created_at", { ascending: false })

  if (error) return fail(error.message, 500)

  const items: SessionListItem[] = (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    nodeCount: (s.nodes as { count: number }[] | null)?.[0]?.count ?? 0,
    createdAt: s.created_at as string,
  }))

  return ok(items)
}

/** POST /api/sessions — create a new session. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const userId = await getUserId(supabase)
  if (!userId) return fail("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const parsed = sessionNameSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422)

  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId, name: parsed.data.name })
    .select("id, name, created_at")
    .single()

  if (error) return fail(error.message, 500)

  const item: SessionListItem = {
    id: data.id,
    name: data.name,
    nodeCount: 0,
    createdAt: data.created_at,
  }
  return ok(item, { status: 201 })
}
