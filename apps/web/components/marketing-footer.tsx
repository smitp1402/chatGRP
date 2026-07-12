import Link from "next/link"
import { Globe, MessageCircle, AtSign } from "lucide-react"
import { Logo } from "@/components/logo"

const LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Open app", href: "/app" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Shared graph demo", href: "/share/dsd-8f2a" },
      { label: "Onboarding", href: "/onboarding" },
      { label: "Changelog", href: "/#" },
      { label: "Docs", href: "/#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#" },
      { label: "Blog", href: "/#" },
      { label: "Careers", href: "/#" },
      { label: "Contact", href: "/#" },
    ],
  },
]

const SOCIALS = [
  { label: "GitHub", href: "/#", icon: Globe },
  { label: "Twitter", href: "/#", icon: MessageCircle },
  { label: "LinkedIn", href: "/#", icon: AtSign },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-4">
            <Link href="/" aria-label="ChatGRP home" className="w-fit">
              <Logo />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              ChatGRP turns every AI conversation into a visual node graph. Branch, fork, and switch models on one canvas.
            </p>
            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <s.icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {LINK_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="font-mono">© 2026 ChatGRP. All rights reserved.</p>
          <p className="font-mono">Chat in graphs, not threads.</p>
        </div>
      </div>
    </footer>
  )
}
