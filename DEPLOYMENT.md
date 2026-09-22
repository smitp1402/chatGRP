# Deployment — where everything lives

The links people use are permanent. Deploys update them in place; nothing
needs re-pointing after a merge. (SETUP.md §7 still describes the original
Railway plan — the AI service actually runs on Cloud Run, as below.)

## Permanent links

| What | URL | Changes? |
|---|---|---|
| **App (frontend)** | https://chatgrp-beta.vercel.app | No. Updated on every merge to `main`. |
| **AI service (backend)** | https://chatgrp-ai-sdzuzysyma-uc.a.run.app | No. Updated on every merge to `main` that touches `apps/ai/`. |
| AI service, alternate name | https://chatgrp-ai-589866597263.us-central1.run.app | No. Same service, second permanent hostname. |
| AI health check | https://chatgrp-ai-sdzuzysyma-uc.a.run.app/health | Returns `{"ok":true}` when the service is up. |
| Supabase project | https://eqfcxhdkvtgjetczzeod.supabase.co | No. |
| Repository | https://github.com/smitp1402/chatGRP | — |

Links that DO change, and can be ignored:

- `https://chatgrp-<hash>-smitp1402s-projects.vercel.app` — one per Vercel deployment.
- `chatgrp-ai-000NN-xxx` — Cloud Run revision names (labels, not URLs).
- Anything on `web-one-peach-86.vercel.app` — an old, unrelated Vercel project (`web`). Not the app. Safe to delete in Vercel.

## Dashboards

| Service | Console |
|---|---|
| Vercel (project `chatgrp`) | https://vercel.com/smitp1402s-projects/chatgrp |
| Cloud Run (project `chatgrp-ai-prod`, us-central1) | https://console.cloud.google.com/run/detail/us-central1/chatgrp-ai?project=chatgrp-ai-prod |
| Secret Manager | https://console.cloud.google.com/security/secret-manager?project=chatgrp-ai-prod |
| GCP billing budget ($25 alert) | https://console.cloud.google.com/billing/014CE3-5C5A32-C6BE8C/budgets |
| Supabase | https://supabase.com/dashboard/project/eqfcxhdkvtgjetczzeod |
| GitHub Actions | https://github.com/smitp1402/chatGRP/actions |

## How a deploy happens

1. Merge a PR into `main`.
2. **Frontend:** Vercel's Git integration builds `apps/web` and updates `chatgrp-beta.vercel.app`. ~2 min.
3. **Backend:** the `Deploy AI service` workflow (`.github/workflows/deploy-ai.yml`) builds the Docker image from the repo root, pushes it, deploys to Cloud Run, and probes `/health`. Runs only when `apps/ai/**` or `packages/shared/pricing.json` changed. ~3 min.
4. **Database:** migrations in `supabase/migrations/` are applied by hand (`supabase db push` or the SQL editor). Applied so far: 0001–0010.

Env vars and secrets are **not** set by the deploy — Cloud Run carries the previous revision's configuration forward. Never pass `--clear-env-vars`.

## Where each setting is configured

| Setting | Lives in | Value |
|---|---|---|
| Frontend → backend URL | Vercel env `NEXT_PUBLIC_AI_URL` (baked into the build; redeploy after changing) | the Cloud Run URL above |
| Backend CORS | Cloud Run env `WEB_ORIGIN` | `https://chatgrp-beta.vercel.app` |
| Auth redirects | Supabase → Authentication → URL Configuration | Site URL `https://chatgrp-beta.vercel.app`; allow-list `https://chatgrp-beta.vercel.app/**` and `http://localhost:3000/**` |
| Stripe return URLs | Vercel env `NEXT_PUBLIC_APP_URL` | `https://chatgrp-beta.vercel.app` |
| Stripe webhook endpoint | Stripe dashboard | `https://chatgrp-beta.vercel.app/api/webhooks/stripe` |
| Provider API keys | Secret Manager: `openai-api-key`, `google-api-key`, `anthropic-api-key` | mounted on Cloud Run as `OPENAI_API_KEY` etc. |
| Real vs mock models | Cloud Run env `USE_MOCK_AI` | `false` (production) |
| Answer length cap | Cloud Run env `MAX_OUTPUT_TOKENS` | `2048` |
| Answer style | Cloud Run env `SYSTEM_PROMPT` (optional) | unset → the default in `apps/ai/app/config.py` |
| Cost ceiling | Cloud Run `--max-instances` (also pinned in `deploy-ai.yml`) | `1` while testing; raise for launch |
| Error reporting | Vercel `NEXT_PUBLIC_SENTRY_DSN`, Cloud Run `SENTRY_DSN` | unset = off |

## If a custom domain is added later

Attaching e.g. `chatgrp.app` means updating, in this order: Vercel domain →
`NEXT_PUBLIC_APP_URL` → Cloud Run `WEB_ORIGIN` → Supabase Site URL and
allow-list → Stripe webhook endpoint. About five minutes; nothing in code.
