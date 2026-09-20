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
const isWin = process.platform === "win32"

// The AI service's venv lives in apps/ai; CI installs deps globally instead.
const aiCommand =
  process.env.E2E_AI_COMMAND ??
  (process.env.CI
    ? "python -m uvicorn app.main:app --port 8000"
    : isWin
      ? ".venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000"
      : ".venv/bin/python -m uvicorn app.main:app --port 8000")

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "pnpm dev",
          url: `${baseURL.replace("localhost", "127.0.0.1")}/login`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          // Always talk to the AI service started below, whatever .env.local says.
          // 127.0.0.1 on purpose: uvicorn binds IPv4 only, and on Windows a
          // browser's "localhost" tries ::1 first - where some other process may
          // be listening and answer 404 for us.
          env: { NEXT_PUBLIC_AI_URL: "http://127.0.0.1:8000" },
        },
        {
          command: aiCommand,
          cwd: "../ai",
          // 127.0.0.1, not localhost: uvicorn binds IPv4 only and Windows resolves
          // localhost to ::1 first, which made this probe time out.
          url: "http://127.0.0.1:8000/health",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
          env: { USE_MOCK_AI: "true", WEB_ORIGIN: "http://localhost:3000" },
        },
      ],
})
