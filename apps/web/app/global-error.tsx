'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Last-resort boundary for errors in the root layout. Must render its own
// <html>/<body> because it replaces the whole document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // See app/error.tsx: server errors carry a digest and are already reported.
    if (!error.digest) Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#ededed',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
            The app hit an unexpected error.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#7c6cf5',
              color: 'white',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
