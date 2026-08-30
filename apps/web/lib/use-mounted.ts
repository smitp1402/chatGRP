import { useSyncExternalStore } from "react"

/** Nothing to subscribe to — the value flips once, at hydration. */
const subscribe = () => () => {}

/**
 * False while server-rendering, true once hydrated.
 *
 * The usual spelling of this is `useState(false)` plus `useEffect(() => setMounted(true))`,
 * which React 19 flags: a synchronous setState in an effect forces a second
 * render pass on every mount. `useSyncExternalStore` expresses the same thing
 * with no state and no effect — the server snapshot is `false`, the client
 * snapshot is `true`, and React picks the right one.
 *
 * Use it where markup must differ between server and client (theme, randomness,
 * anything read off `window`) to avoid a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
