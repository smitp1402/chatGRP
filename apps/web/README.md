# apps/web

Next.js 16 front end. Deployed to Vercel.

## Vercel project settings

These live in the Vercel dashboard, not in a file — there is deliberately no
`vercel.json`. A root-level one used to override the build and caused two
failure modes worth remembering:

| Setting | Value | Why |
|---|---|---|
| Root Directory | `apps/web` | `next` is in this package, not the repo root. Pointing Vercel at the root fails with "No Next.js version detected" |
| Include files outside root | **Enabled** | `@chatgrp/shared` is a workspace package one level up |
| Build Command | *default* | Vercel runs `next build` |
| Output Directory | *default* | Resolves to `.next` **inside** the root directory. Setting it to `apps/web/.next` produces `apps/web/apps/web/.next` |
| Install Command | *default* | Vercel detects pnpm workspaces and installs from the repo root |
| Node version | from `engines.node` | Root `package.json` pins `22.x`; a range like `>=22.0.0` is rejected |

## Local development

```bash
pnpm dev:web    # http://localhost:3000
pnpm dev:ai     # http://localhost:8000 — required for /generate
```

Environment variables go in `apps/web/.env.local`; see `SETUP.md` at the repo
root for the full list.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

CI runs all three on every pull request (`.github/workflows/ci.yml`).
