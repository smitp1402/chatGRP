import type { Metadata } from "next"
import { ShareView } from "./share-view"

export const metadata: Metadata = {
  title: "Shared graph — ChatGRP",
  description: "A read-only ChatGRP conversation graph shared with you.",
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ShareView id={id} />
}
