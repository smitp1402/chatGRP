"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import type { LegalDoc } from "@/lib/legal-content"
import { cn } from "@/lib/utils"

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const [activeId, setActiveId] = useState(doc.sections[0]?.id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    )

    for (const section of doc.sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [doc.sections])

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="ChatGRP home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated {doc.updated}</p>
          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            {doc.intro}
          </p>
        </div>

        <div className="flex flex-col gap-10 md:flex-row md:gap-12">
          <aside className="md:sticky md:top-24 md:h-fit md:w-56 md:shrink-0">
            <nav aria-label="Sections" className="flex flex-col gap-1 border-l border-border">
              {doc.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    "-ml-px border-l-2 py-1.5 pl-4 text-sm transition-colors",
                    activeId === section.id
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {section.heading}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-10">
              {doc.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {section.heading}
                  </h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {section.paragraphs.map((p, i) => (
                      <p key={i} className="text-pretty leading-relaxed text-muted-foreground">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
