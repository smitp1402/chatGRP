import type { Metadata } from "next"
import { OnboardingFlow } from "./onboarding-flow"

export const metadata: Metadata = {
  title: "Get started — ChatGRP",
  description: "Set up your ChatGRP workspace in a few quick steps.",
}

export default function OnboardingPage() {
  return <OnboardingFlow />
}
