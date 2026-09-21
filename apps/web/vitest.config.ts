import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  // Component tests render with react-dom/server; no plugin needed beyond JSX.
  esbuild: { jsx: "automatic" },
  resolve: {
    // Mirror tsconfig's "@/*" so route handlers import the same way in tests.
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
  },
})
