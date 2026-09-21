import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests against the real stack: Next dev server + the FastAPI AI
 * service (in mock mode) + the Supabase project from apps/web/.env.local.
 *
 * Locally: `pnpm test:e2e` starts both servers. In CI the job provides the
 * same env from secrets and is skipped when they are absent. Point
 * E2E_BASE_URL at an already-running deployment to skip the web servers.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

/**
 * Minimal .env reader so a local run picks up the same values the apps use.
 * Real env always wins (CI passes everything explicitly). Never logs values.
 */
function loadEnvFile(file: string, keys: Record<string, string>) {
  if (!existsSync(file)) return
  const text = readFileSync(file, "utf8")
  for (const [from, to] of Object.entries(keys)) {
    if (process.env[to]) continue
    const m = text.match(new RegExp(`^${from}=(.*)$`, "m"))
    if (m) process.env[to] = m[1].trim().replace(/^["']|["']$/g, "")
  }
}
// The account test creates its throwaway user through the admin API.
loadEnvFile(path.resolve(__dirname, ".env.local"), {
  NEXT_PUBLIC_SUPABASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
})
loadEnvFile(path.resolve(__dirname, "../ai/.env"), { SUPABASE_SERVICE_ROLE_KEY: "E2E_SUPABASE_SERVICE_ROLE_KEY" })
const isWin = process.platform === "win32"

// The AI service's venv lives in apps/ai; CI installs deps globally instead.
// Port 8765, not 8000: Docker Desktop and WSL both squat on 8000 on some machines.
const aiCommand =
  process.env.E2E_AI_COMMAND ??
  (process.env.CI
    ? "python -m uvicorn app.main:app --port 8765"
    : isWin
      ? ".venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8765"
      : ".venv/bin/python -m uvicorn app.main:app --port 8765")

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One worker: every test shares the dev account, so parallel files would
  // see each other's sessions appear and vanish (and trip Supabase's per-IP
  // auth rate limits). e2e/helpers.ts keeps per-test cleanup state at module
  // level on the strength of this - revisit both together.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    // Traces and video record every request, cookies included - i.e. the
    // test account's session token. Keep them local; CI uploads screenshots only.
    trace: process.env.CI ? "off" : "retain-on-failure",
    video: process.env.CI ? "off" : "retain-on-failure",
  },
  projects: [
    // Signs in once and writes e2e/.auth/user.json; every test reuses it.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "pnpm dev",
          url: `${baseURL.replace("localhost", "127.0.0.1")}/login`,
          // Never adopt a server we did not start: it may carry stale env
          // (old NEXT_PUBLIC_AI_URL, no dev credentials). Set E2E_REUSE_SERVER=1
          // to opt in while iterating on the tests themselves.
          reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
          timeout: 120_000,
          // Always talk to the AI service started below, whatever .env.local says.
          // 127.0.0.1 on purpose: uvicorn binds IPv4 only, and on Windows a
          // browser's "localhost" tries ::1 first - where some other process may
          // be listening and answer 404 for us.
          env: { NEXT_PUBLIC_AI_URL: "http://127.0.0.1:8765" },
        },
        {
          command: aiCommand,
          cwd: "../ai",
          // 127.0.0.1, not localhost: uvicorn binds IPv4 only and Windows resolves
          // localhost to ::1 first, which made this probe time out.
          url: "http://127.0.0.1:8765/health",
          reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
          timeout: 60_000,
          env: { USE_MOCK_AI: "true", WEB_ORIGIN: "http://localhost:3000" },
        },
      ],
})
