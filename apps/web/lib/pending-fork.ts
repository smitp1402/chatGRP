/**
 * Carries a "fork this graph" intent across sign-up.
 *
 * A visitor who clicks Fork while logged out has to sign up, verify an email,
 * and come back — a journey that loses any React state and may finish in a
 * different tab. localStorage is the only thing that survives all of it, so the
 * share token is parked here and claimed once by the app shell on arrival.
 */

const KEY = "chatgrp:pending-fork"

/** UUID guard — this value is read back and put straight into a request path. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function rememberFork(token: string): void {
  if (typeof window === "undefined" || !UUID.test(token)) return
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    // Private mode or blocked storage — the fork is simply not resumed.
  }
}

/**
 * Read and clear the pending token. Clearing on read means a failed fork is not
 * retried forever on every visit to the app.
 */
export function claimFork(): string | null {
  if (typeof window === "undefined") return null
  try {
    const token = window.localStorage.getItem(KEY)
    window.localStorage.removeItem(KEY)
    return token && UUID.test(token) ? token : null
  } catch {
    return null
  }
}
