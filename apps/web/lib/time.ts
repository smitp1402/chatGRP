export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

export type SessionGroupLabel = "Today" | "Yesterday" | "Last 7 days" | "Older"

const DAY = 86_400_000

export function sessionGroup(iso: string): SessionGroupLabel {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = new Date(iso).getTime()
  if (t >= startOfToday) return "Today"
  if (t >= startOfToday - DAY) return "Yesterday"
  if (t >= startOfToday - 7 * DAY) return "Last 7 days"
  return "Older"
}
