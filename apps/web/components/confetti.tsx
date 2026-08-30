"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"

const COLORS = [
  "var(--color-node-user)",
  "var(--color-node-ai)",
  "var(--color-node-fork)",
  "var(--color-primary)",
]

type Piece = {
  id: number
  left: number
  color: string
  delay: number
  duration: number
  rotate: number
  drift: number
  size: number
  rounded: boolean
}

/**
 * Deterministic pseudo-random in [0, 1) from an integer seed.
 *
 * Confetti needs pieces that *look* unrelated, not true randomness. Deriving
 * them from the index keeps the render pure and makes server and client agree,
 * so there is no hydration mismatch to guard against in the first place.
 */
function scatter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** A one-shot confetti burst that falls from the top of the viewport. */
export function Confetti({ count = 90 }: { count?: number }) {
  const pieces: Piece[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: scatter(i) * 100,
        color: COLORS[i % COLORS.length],
        delay: scatter(i + 101) * 0.5,
        duration: 2.4 + scatter(i + 211) * 1.6,
        rotate: scatter(i + 307) * 360,
        drift: (scatter(i + 419) - 0.5) * 160,
        size: 6 + scatter(i + 523) * 6,
        rounded: scatter(i + 631) > 0.5,
      })),
    [count],
  )

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            borderRadius: p.rounded ? "9999px" : "2px",
          }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{
            y: "105vh",
            x: p.drift,
            opacity: [0, 1, 1, 0.9, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  )
}
