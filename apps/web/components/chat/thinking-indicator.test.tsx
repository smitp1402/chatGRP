/**
 * The waiting state is the only thing on screen for up to ~10s on a cold
 * request, so it has to say something true about which stage we are in and
 * stay announceable to a screen reader.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ThinkingIndicator, type StreamPhase } from './thinking-indicator'

const html = (phase: StreamPhase) =>
  renderToStaticMarkup(<ThinkingIndicator phase={phase} />)

describe('ThinkingIndicator', () => {
  it('names each phase distinctly', () => {
    expect(html('connecting')).toContain('Connecting')
    expect(html('waking')).toContain('Waking the AI service')
    expect(html('thinking')).toContain('Thinking')
  })

  it('does not claim the model is thinking before the request is accepted', () => {
    // "Connecting" and "Waking" both mean we have not reached the provider yet.
    expect(html('connecting')).not.toContain('Thinking')
    expect(html('waking')).not.toContain('Thinking')
  })

  it('announces itself politely to assistive tech', () => {
    const out = html('thinking')
    expect(out).toContain('role="status"')
    expect(out).toContain('aria-live="polite"')
  })

  it('hides the decorative dots from assistive tech', () => {
    // The dots repeat what the label already says; announcing them is noise.
    expect(html('thinking')).toContain('aria-hidden="true"')
  })

  it('staggers the dot animations so they read as one wave', () => {
    const out = html('connecting')
    expect(out).toContain('animation-delay:0ms')
    expect(out).toContain('animation-delay:160ms')
    expect(out).toContain('animation-delay:320ms')
  })
})
