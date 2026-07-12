import type { Metadata } from "next"
import { LegalDocument } from "@/components/legal-doc"
import { PRIVACY } from "@/lib/legal-content"

export const metadata: Metadata = {
  title: "Privacy Policy | ChatGRP",
  description: "How ChatGRP collects, uses, and protects your information.",
}

export default function PrivacyPage() {
  return <LegalDocument doc={PRIVACY} />
}
