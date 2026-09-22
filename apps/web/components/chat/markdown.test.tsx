/**
 * Model answers arrive as Markdown. They must render as real elements (the
 * bug was raw `###` and `**` on screen) and must never render model-supplied
 * HTML: an answer is untrusted text.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Markdown } from "./markdown"

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />)

describe("Markdown", () => {
  it("renders headings, bold, lists and inline code as elements", () => {
    const out = html("### IP Address\n\nAn **IP address** is unique.\n\n- IPv4\n- IPv6\n\nUse `ping`.")
    expect(out).toContain("<h3")
    expect(out).toContain("<strong")
    expect(out).toMatch(/<ul[\s\S]*<li[\s\S]*IPv4/)
    expect(out).toContain("<code")
    expect(out).not.toContain("###")
    expect(out).not.toContain("**")
  })

  it("renders fenced code blocks inside <pre>", () => {
    const out = html("```python\nprint('hi')\n```")
    expect(out).toMatch(/<pre[\s\S]*<code[\s\S]*print/)
  })

  it("renders GFM tables", () => {
    const out = html("| a | b |\n|---|---|\n| 1 | 2 |")
    expect(out).toContain("<table")
    expect(out).toContain("<td")
  })

  it("never renders raw HTML from the model", () => {
    const out = html('hello <script>alert(1)</script> <img src=x onerror="alert(2)"> world')
    expect(out).not.toContain("<script")
    expect(out).not.toContain("<img")
    expect(out).not.toContain("onerror=\"alert")
  })

  it("opens links in a new tab without leaking the opener, and drops javascript: URLs", () => {
    const out = html("[docs](https://example.com) and [bad](javascript:alert(1))")
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain("javascript:")
  })

  it("keeps plain text plain", () => {
    expect(html("pong")).toContain("pong")
  })
})
