# Browser tests (Playwright)

```
pnpm test:e2e            # from the repo root; starts web + AI service itself
pnpm --filter web exec playwright test --ui   # interactive
```

What it needs, and where it gets it:

| Need | Local | CI |
|---|---|---|
| Supabase project | `apps/web/.env.local`, `apps/ai/.env` | secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY` |
| Test account | `NEXT_PUBLIC_DEV_EMAIL` / `NEXT_PUBLIC_DEV_PASSWORD` in `.env.local`; the **Dev quick login** button creates it on first use | secrets `E2E_DEV_EMAIL`, `E2E_DEV_PASSWORD` |
| AI answers | the AI service's mock streamer (`USE_MOCK_AI=true`, no provider keys) | same |
| Migrations | 0008-0010 applied to that project (`/generate` calls their RPCs) | same |

## Use a separate Supabase project for CI

Not optional. The job hands the service-role key (bypasses RLS) and a
password login to a runner executing PR-branch code, and the test account is
a real Supabase Auth user that can sign in from anywhere with that password.
Point the `E2E_*` secrets at a throwaway project. Without the secrets the job
prints a notice and skips - it never fails a fork or a fresh clone.

The tests create sessions named `e2e-<timestamp>` and delete only those.

## Running against an already-running dev server

Locally `reuseExistingServer` is on: if `pnpm dev` is already running,
Playwright uses it as-is and its `env` override (`NEXT_PUBLIC_AI_URL`) does
not apply. That server must itself have been started with
`NEXT_PUBLIC_AI_URL=http://127.0.0.1:8000`, or stop it first.

## Windows gotcha: `localhost` vs `127.0.0.1`

uvicorn binds IPv4 only, and on Windows `localhost` resolves to `::1` first.
If anything else listens on `[::1]:8000` (WSL's `wslrelay.exe` does on this
machine), both Playwright's health probe and the browser's fetches hit that
instead and see 404s. The config therefore uses `127.0.0.1` for the AI
service everywhere. Symptom if it regresses: "Generation failed (404)" toast
while the API works fine when called directly.

## Artifacts

Locally, failed runs keep screenshot + video + trace under
`apps/web/test-results/`. Traces record every request including cookies, so
CI keeps screenshots only.
