import type { PromptInput } from "@/lib/prompts-client"

/** Curated prompts new users can seed into their library with one click. */
export const STARTER_PROMPTS: PromptInput[] = [
  {
    title: "Summarize a topic",
    body: "Summarize {{topic}} in {{count}} clear bullet points a beginner can follow.",
    kind: "user_prompt",
    tags: ["summary", "learning"],
    variables: [
      { name: "topic", label: "Topic" },
      { name: "count", label: "Number of bullets", default: "5" },
    ],
  },
  {
    title: "Explain like I'm five",
    body: "Explain {{concept}} in simple terms with an everyday analogy.",
    kind: "user_prompt",
    tags: ["learning"],
    variables: [{ name: "concept", label: "Concept" }],
  },
  {
    title: "Senior engineer persona",
    body: "You are a pragmatic senior software engineer. Give direct, production-minded advice with tradeoffs, not generic answers.",
    kind: "system_prompt",
    tags: ["engineering", "persona"],
    variables: [],
  },
  {
    title: "Pros and cons",
    body: "List the key pros and cons of {{option}}, then give a one-line recommendation.",
    kind: "user_prompt",
    tags: ["decision"],
    variables: [{ name: "option", label: "Option to evaluate" }],
  },
  {
    title: "Debug this error",
    body: "I'm getting this error:\n\n{{error}}\n\nExplain the likely cause and the smallest fix.",
    kind: "user_prompt",
    tags: ["engineering", "debug"],
    variables: [{ name: "error", label: "Error message" }],
  },
]
