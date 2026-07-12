import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

/** Consistent success/error envelope for all API routes. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data }, init)
}

export function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error }, { status })
}

/** Returns the authenticated user's id, or null if unauthenticated. */
export async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}
