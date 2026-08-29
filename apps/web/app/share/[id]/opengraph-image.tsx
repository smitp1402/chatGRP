import { ImageResponse } from "next/og"
import { createAdminClient } from "@/lib/supabase/admin"

export const alt = "A shared ChatGRP conversation graph"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Social preview for a shared graph.
 *
 * A link pasted into Slack or X is the whole acquisition loop, so the card
 * shows what makes this worth opening: the graph's name and how much thinking
 * is in it. Only the title and two counts are read — never message content,
 * which would leak a private conversation into link previews and their caches.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let title = "A shared conversation graph"
  let nodeCount = 0
  let branchCount = 0

  if (UUID.test(id)) {
    const admin = createAdminClient()
    const { data: session } = await admin
      .from("sessions")
      .select("id, name")
      .eq("share_token", id)
      .maybeSingle()

    if (session) {
      title = (session.name as string) || title
      const { data: nodes } = await admin
        .from("nodes")
        .select("is_fork")
        .eq("session_id", session.id)
      nodeCount = nodes?.length ?? 0
      branchCount = (nodes ?? []).filter((n) => (n as { is_fork: boolean }).is_fork).length
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1012",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#6366f1",
              display: "flex",
            }}
          />
          <span style={{ color: "#e6e8ea", fontSize: 30, fontWeight: 600 }}>ChatGRP</span>
          <span
            style={{
              marginLeft: 8,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid #2a2e33",
              color: "#9aa1a9",
              fontSize: 20,
            }}
          >
            Shared graph
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <span
            style={{
              color: "#f4f5f6",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              // og images have no line-clamp; cap the string instead
              display: "flex",
            }}
          >
            {title.length > 70 ? `${title.slice(0, 70)}…` : title}
          </span>
          <span style={{ color: "#9aa1a9", fontSize: 30, display: "flex", gap: "24px" }}>
            <span>
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </span>
            <span>·</span>
            <span>
              {branchCount} {branchCount === 1 ? "branch" : "branches"}
            </span>
          </span>
        </div>

        <span style={{ color: "#6f767e", fontSize: 26 }}>
          Open it to read the branch — or fork it into your own account.
        </span>
      </div>
    ),
    size,
  )
}
