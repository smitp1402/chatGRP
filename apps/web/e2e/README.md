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

## What is covered

| Spec | Flow |
|---|---|
| `graph-flow` | sign in → session → streamed answer → fork → two nodes; signed-out redirect |
| `share` | mint a link → read it signed out (read-only, no private data) → stranger is sent to sign-up → signed-in user forks it; unknown token is a clean 404 |
| `attachments` | image upload → model acknowledges it; text file contents reach the model; removed file is not sent |
| `prompts` | save the draft as a prompt → insert it back; delete from the library |
| `nodes` | star / collapse / delete (persisted across reload); rename a session; sidebar filter |
| `layout-export` | layout presets show/hide the canvas; export a branch as markdown |
| `account` | first login → onboarding screens → delete account → login refused; sign-up form gating |

Not covered in the browser: Stripe checkout / portal / webhook (route-level
tests exist; browser coverage needs Stripe test-mode fixtures), cancel-generation
(no UI yet), and the `/app/search` page (see below).

## Known gaps the suite exposed

- **`/app/search` is placeholder UI** - it renders a hardcoded `RESULTS` array
  (`app/app/search/page.tsx`). The node-search test is `test.fixme` until the
  page is wired to real data.
- **Account deletion needs migration 0004** - `delete_account()` is a Postgres
  function; the test skips with a clear message when the project lacks it.
- **Sign-up sends an email** - Supabase's built-in sender allows only a few per
  hour (`over_email_send_rate_limit`), so the account test creates its user via
  the admin API and only checks the sign-up form's client-side gating.

## How the suite stays stable

- **One sign-in per run.** `auth.setup.ts` signs in and saves the browser state;
  every test reuses it. Supabase rate-limits sign-ins per IP, so one-per-test
  turned into a wall of timeouts.
- **One worker.** All tests share the dev account; parallel files saw each
  other's sessions appear and vanish.
- **Each test deletes only what it created** (`e2e-…` names it tracked), never
  "everything with the prefix". That includes the uploads under
  `attachments/{user}/{session}/`, removed through the storage API as the
  user, because deleting a session cascades rows but not files (an app gap
  worth closing in `DELETE /api/sessions/:id` and `delete_account()`).
- **What is not undone:** each generation writes 2 credits to the dev
  account's `usage_ledger` (mock answers are billed like real ones). A full
  run costs ~14 credits of the Pro allowance; the ledger is never reset.
- **`browser.newContext()` inherits the project's `storageState`** in
  `@playwright/test`. A "stranger" context must pass `storageState: SIGNED_OUT`
  explicitly or it is silently signed in.
- **Uploads finish before Send.** The tray lists a file immediately; the size
  text appears when the upload is done, and Send refuses until then.

## Use a separate Supabase project for CI

Not optional. The job hands the service-role key (bypasses RLS) and a
password login to a runner executing PR-branch code, and the test account is
a real Supabase Auth user that can sign in from anywhere with that password.
Point the `E2E_*` secrets at a throwaway project. Without the secrets the job
prints a notice and skips - it never fails a fork or a fresh clone.


## Running against an already-running dev server

Locally `reuseExistingServer` is on: if `pnpm dev` is already running,
Playwright uses it as-is and its `env` override (`NEXT_PUBLIC_AI_URL`) does
not apply. That server must itself have been started with
`NEXT_PUBLIC_AI_URL=http://127.0.0.1:8000`, or stop it first.

## Windows gotcha: `localhost` vs `127.0.0.1`

uvicorn binds IPv4 only, and on Windows `localhost` resolves to `::1` first.
If anything else listens there, both Playwright's health probe and the
browser's fetches hit it instead and see 404s. On this machine Docker Desktop
and WSL both squat on port 8000, so the config runs the AI service on
`127.0.0.1:8765`. Symptom if it regresses: "Generation failed (404)" toast
while the API works fine when called directly.

## Artifacts

Locally, failed runs keep screenshot + video + trace under
`apps/web/test-results/`. Traces record every request including cookies, so
CI keeps screenshots only, and `account.spec.ts` - which sends the
service-role key in a request header - disables traces and video everywhere.
