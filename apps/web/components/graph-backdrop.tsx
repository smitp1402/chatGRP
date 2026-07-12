"use client"

import { motion } from "framer-motion"

type BackdropNode = {
  cx: number
  cy: number
  r: number
  color: string
}

type BackdropEdge = {
  x1: number
  y1: number
  x2: number
  y2: number
  broken?: boolean
}

const NODES: BackdropNode[] = [
  { cx: 140, cy: 120, r: 5, color: "var(--color-node-user)" },
  { cx: 320, cy: 90, r: 4, color: "var(--color-node-ai)" },
  { cx: 260, cy: 260, r: 6, color: "var(--color-node-fork)" },
  { cx: 480, cy: 200, r: 4, color: "var(--color-node-ai)" },
  { cx: 620, cy: 120, r: 5, color: "var(--color-node-user)" },
  { cx: 720, cy: 300, r: 4, color: "var(--color-node-fork)" },
  { cx: 900, cy: 180, r: 5, color: "var(--color-node-ai)" },
  { cx: 1040, cy: 90, r: 4, color: "var(--color-node-user)" },
  { cx: 180, cy: 420, r: 4, color: "var(--color-node-ai)" },
  { cx: 420, cy: 460, r: 6, color: "var(--color-node-user)" },
  { cx: 640, cy: 500, r: 4, color: "var(--color-node-fork)" },
  { cx: 860, cy: 440, r: 5, color: "var(--color-node-ai)" },
  { cx: 1060, cy: 520, r: 4, color: "var(--color-node-user)" },
]

function baseEdges(): BackdropEdge[] {
  return [
    { x1: 140, y1: 120, x2: 320, y2: 90 },
    { x1: 320, y1: 90, x2: 260, y2: 260 },
    { x1: 260, y1: 260, x2: 480, y2: 200 },
    { x1: 480, y1: 200, x2: 620, y2: 120 },
    { x1: 620, y1: 120, x2: 720, y2: 300 },
    { x1: 720, y1: 300, x2: 900, y2: 180 },
    { x1: 900, y1: 180, x2: 1040, y2: 90 },
    { x1: 180, y1: 420, x2: 420, y2: 460 },
    { x1: 420, y1: 460, x2: 640, y2: 500 },
    { x1: 640, y1: 500, x2: 860, y2: 440 },
    { x1: 860, y1: 440, x2: 1060, y2: 520 },
    { x1: 260, y1: 260, x2: 420, y2: 460 },
    { x1: 720, y1: 300, x2: 640, y2: 500 },
  ]
}

/**
 * A subtle, slowly breathing graph rendered behind page content.
 * When `broken` is set, some edges are dashed and offset to convey a
 * disconnected / error state.
 */
export function GraphBackdrop({ broken = false }: { broken?: boolean }) {
  const edges = baseEdges()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="canvas-grid absolute inset-0 opacity-40" />
      <svg
        className="absolute left-1/2 top-1/2 h-[720px] w-[1200px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 1200 620"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {edges.map((e, i) => {
          const isBroken = broken && i % 3 === 0
          return (
            <motion.line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={isBroken ? (e.x1 + e.x2) / 2 - 12 : e.x2}
              y2={isBroken ? (e.y1 + e.y2) / 2 + 8 : e.y2}
              stroke="var(--color-muted-foreground)"
              strokeWidth="1"
              strokeOpacity={0.18}
              strokeDasharray={isBroken ? "4 6" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: i * 0.05, ease: "easeOut" }}
            />
          )
        })}
        {NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill={n.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.18, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3 + (i % 4),
              delay: i * 0.12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
    </div>
  )
}
