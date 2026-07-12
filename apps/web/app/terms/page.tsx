import type { Metadata } from "next"
import { LegalDocument } from "@/components/legal-doc"
import { TERMS } from "@/lib/legal-content"

export const metadata: Metadata = {
  title: "Terms of Service | ChatGRP",
  description: "The terms governing your use of ChatGRP.",
}

export default function TermsPage() {
  return <LegalDocument doc={TERMS} />
}
