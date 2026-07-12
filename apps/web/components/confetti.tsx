"use client"

import { useEffect, useState } from "react"
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

/** A one-shot confetti burst that falls from the top of the viewport. */
export function Confetti({ count = 90 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  // Generate randomized pieces only on the client to avoid SSR hydration mismatch.
  useEffect(() => {
    setPieces(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.6,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 160,
        size: 6 + Math.random() * 6,
        rounded: Math.random() > 0.5,
      })),
    )
  }, [count])

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
