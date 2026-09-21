# ChatGRP — Phase 0 Setup Guide

Step-by-step to go from the current v0.dev UI export to a running, deployed walking skeleton.
Order matters: **Local scaffold → Supabase → apps/ai → Local wire-up → Deploy (Railway → Vercel → Cloudflare)**.

Platform: Windows 11 + PowerShell. All commands are PowerShell-friendly.

---

## 0. Prerequisites (install once)

Check what you have:
```powershell
node -v      # need >= 18.17 (Next.js 14)
pnpm -v      # need >= 9
python --version   # need >= 3.11
git --version
```

Install anything missing (Windows `winget`):
```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Git.Git
npm install -g pnpm
```

Accounts you'll need (all have free tiers): **Supabase**, **Railway**, **Vercel**, **Stripe**, **Cloudflare**, plus API keys for **OpenAI / Anthropic / Google AI** (only needed at Phase 3, not now).

---

## 1. Initialize the monorepo

From the project root (`c:/DRIVE_F/Master/YC/GauntletAI/ChatGRP`):

```powershell
git init
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create a root `package.json`:
```json
{
  "name": "chatgrp",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:ai": "pnpm --filter ai dev"
  }
}
```

Create a `.gitignore`:
```
node_modules/
.next/
.env
.env.local
__pycache__/
.venv/
dist/
STUDY_GUIDE.md
```

---

## 2. Scaffold `apps/web` and migrate the v0 UI

The v0 export gives you source (`app/`, `components/`, `lib/`, `public/`) but **no config**. Fastest fix: generate a clean Next.js app, then overlay your v0 source on top.

**2a. Move the existing v0 source out of the way temporarily:**
```powershell
New-Item -ItemType Directory _v0_src
Move-Item app,components,lib,public _v0_src
```

**2b. Scaffold a fresh Next.js 14 app:**
```powershell
pnpm create next-app@latest apps/web --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```

**2c. Overlay your v0 source (overwrites the scaffold's default app/):**
```powershell
Copy-Item _v0_src/app        apps/web/ -Recurse -Force
Copy-Item _v0_src/components  apps/web/ -Recurse -Force
Copy-Item _v0_src/lib         apps/web/ -Recurse -Force
Copy-Item _v0_src/public      apps/web/ -Recurse -Force
Remove-Item _v0_src -Recurse -Force
```

**2d. Install the libraries the v0 code + our stack need.**
> Note: this v0 export uses **Base UI** (`@base-ui/react`), **not** Radix, plus `framer-motion`, `tw-animate-css`, and `shadcn` (the last two are referenced by `globals.css`). Verify actual imports with:
> `grep -rhoE "from ['\"]@?[a-z][^'\"]*['\"]" apps/web/app apps/web/components | sort -u`

```powershell
# UI runtime deps (from the v0 export)
pnpm --filter web add @base-ui/react framer-motion lucide-react next-themes sonner `
  @vercel/analytics class-variance-authority clsx tailwind-merge

# CSS-import dev deps (referenced by globals.css)
pnpm --filter web add -D tw-animate-css shadcn

# our stack (canvas, layout, state, data, validation)
pnpm --filter web add @xyflow/react dockview-react zustand `
  @supabase/supabase-js @supabase/ssr zod

# shared workspace package (create it in step 3 first)
pnpm --filter web add @chatgrp/shared@workspace:*
```

**2e. Run it locally to confirm the UI renders:**
```powershell
pnpm --filter web dev
```
Open `http://localhost:3000` → the ChatGRP landing page should render. Fix any missing-import errors it reports (usually one more `@radix-ui/*` or a small path tweak). **This is the milestone: your v0 UI now runs.**

---

## 3. Create `packages/shared` (cross-service contracts)

```powershell
New-Item -ItemType Directory packages/shared -Force
```

`packages/shared/package.json`:
```json
{
  "name": "@chatgrp/shared",
  "version": "0.0.0",
  "main": "index.ts",
  "types": "index.ts"
}
```

Seed the model + credit registry (from the plan's adjusted table) in `packages/shared/credits.ts`:
```ts
export const CREDIT_TABLE = {
  "gpt-4o-mini": 2,
  "gemini-flash": 3,
  "gpt-4o": 10,
  "claude-opus": 15,
  "claude-sonnet": 10, // adjusted from 8
  "gemini-pro": 7,     // adjusted from 5
} as const
export type ModelId = keyof typeof CREDIT_TABLE
```
Then `cd apps/web && pnpm add @chatgrp/shared --workspace && cd ../..`

---

## 4. Supabase — the foundation (do this BEFORE any deploy)

Both backends are useless without Supabase, so it's genuinely first.

**4a. Create the project:** supabase.com → New project. Save the **Project URL**, **anon key**, **service_role key**, and **JWT secret** (Settings → API).

**4b. Install the CLI and link:**
```powershell
pnpm add -g supabase
supabase login
supabase init
supabase link --project-ref <your-project-ref>
```

**4c. Create the schema migration:**
```powershell
supabase migration new init_schema
```
Paste this into the generated `supabase/migrations/*_init_schema.sql` (all 9 tables + RLS):
```sql
create extension if not exists "pgcrypto";

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  layout jsonb,
  created_at timestamptz default now()
);

create table nodes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  parent_id uuid references nodes(id) on delete cascade,
  is_fork boolean default false,
  starred boolean default false,
  collapsed boolean default false,
  position_x float default 0,
  position_y float default 0,
  order_index int default 0,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text default '',
  created_at timestamptz default now()
);

create table generation_attempts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  node_id uuid references nodes(id) on delete cascade,
  model_id text not null,
  status text not null check (status in ('pending','streaming','completed','failed','cancelled')),
  error text,
  tokens_input int default 0,
  tokens_output int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_attempt_id uuid references generation_attempts(id) on delete set null,
  credits_used int not null,
  model_id text not null,
  created_at timestamptz default now()
);

create table prompt_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid,
  title text not null,
  body text not null,
  kind text not null check (kind in ('user_prompt','system_prompt')),
  variables jsonb default '[]',
  tags text[] default '{}',
  folder_id uuid references prompt_folders(id) on delete set null,
  default_model_id text,
  visibility text not null default 'private' check (visibility in ('private','team')),
  usage_count int default 0,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tree jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  default_layout_id uuid references layouts(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: users see only their own data
alter table sessions enable row level security;
alter table nodes enable row level security;
alter table messages enable row level security;
alter table generation_attempts enable row level security;
alter table usage_ledger enable row level security;
alter table prompt_folders enable row level security;
alter table saved_prompts enable row level security;
alter table layouts enable row level security;
alter table user_settings enable row level security;

create policy "own sessions" on sessions for all using (user_id = auth.uid());
create policy "own nodes" on nodes for all using (
  session_id in (select id from sessions where user_id = auth.uid()));
create policy "own messages" on messages for all using (
  session_id in (select id from sessions where user_id = auth.uid()));
create policy "own attempts" on generation_attempts for all using (
  node_id in (select n.id from nodes n join sessions s on n.session_id = s.id where s.user_id = auth.uid()));
create policy "own ledger" on usage_ledger for all using (user_id = auth.uid());
create policy "own folders" on prompt_folders for all using (user_id = auth.uid());
create policy "own prompts" on saved_prompts for all using (
  user_id = auth.uid() or (visibility = 'team' and team_id is not null));
create policy "own layouts" on layouts for all using (user_id = auth.uid());
create policy "own settings" on user_settings for all using (user_id = auth.uid());
```

Apply it:
```powershell
supabase db push
```

**4d. Enable auth providers:** Supabase dashboard → Authentication → Providers → enable **Email** and **Google** (paste a Google OAuth client ID/secret from Google Cloud Console → Credentials).

**4e. Wire the web app.** Create `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_AI_URL=http://localhost:8000
```
Add a Supabase browser client in `apps/web/lib/supabase.ts` and connect the existing v0 `login`/`signup` pages to `supabase.auth.signInWithPassword` / `signInWithOAuth`.

---

## 5. Create `apps/ai` (FastAPI skeleton)

```powershell
New-Item -ItemType Directory apps/ai/app -Force
cd apps/ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi "uvicorn[standard]" sse-starlette "PyJWT[crypto]" supabase pydantic pydantic-settings
pip freeze > requirements.txt
```

`apps/ai/app/main.py` (skeleton with health + JWT verify + a mock stream):
```python
import asyncio, os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from jose import jwt

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

# Tokens are verified against the project JWKS — see apps/ai/app/auth.py.

def verify_user(authorization: str = "") -> str:
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except Exception:
        raise HTTPException(401, "invalid token")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/generate")
async def generate():
    async def stream():
        for tok in ["Hello", " from", " ChatGRP", " (mock)"]:
            await asyncio.sleep(0.2)
            yield {"data": tok}
    return EventSourceResponse(stream())
```

`apps/ai/package.json` (so pnpm can run it):
```json
{
  "name": "ai",
  "scripts": { "dev": "uvicorn app.main:app --reload --port 8000" }
}
```

`apps/ai/.env`:
```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```
Run it: `uvicorn app.main:app --reload --port 8000` → `http://localhost:8000/health` returns `{"ok":true}`. `cd ../..`

---

## 6. Verify locally (both services)

Two terminals:
```powershell
pnpm --filter web dev     # terminal 1 → :3000
pnpm --filter ai dev      # terminal 2 → :8000  (activate .venv first)
```
Checklist:
- `http://localhost:3000` renders the UI.
- `/signup` creates a real user (check Supabase → Authentication → Users).
- `curl http://localhost:8000/health` → `{"ok":true}`.
- The mock `/generate` streams tokens.

**If all four pass, local Phase 0 is done.** Now deploy — in this exact order.

---

## 7. Deploy (Supabase ✅ already done → Railway → Vercel → Cloudflare)

### 7a. Railway (apps/ai) — deploy this BEFORE Vercel
The web app needs Railway's URL, so Railway goes first.
```powershell
pnpm add -g @railway/cli
railway login
cd apps/ai
railway init
railway up
```
In the Railway dashboard, add the env vars from `apps/ai/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN`). Copy the generated public URL, e.g. `https://chatgrp-ai.up.railway.app`. `cd ../..`

### 7b. Vercel (apps/web)
```powershell
pnpm add -g vercel
cd apps/web
vercel
```
In the Vercel dashboard → Settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL         = https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = <anon-key>
NEXT_PUBLIC_AI_URL               = https://chatgrp-ai.up.railway.app
```
Then `vercel --prod`. Add the production URL to Supabase → Authentication → URL Configuration (redirect URLs). `cd ../..`

### 7c. Stripe (test mode — needed at Phase 5, set keys now)
Create a Stripe account, grab **test** publishable + secret keys, store them as env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) in Vercel. No products needed until Phase 5.

### 7d. Cloudflare
Point your domain's DNS at Vercel (CNAME) and Railway, proxy enabled. Turn on "Always Use HTTPS". WAF rules come in Phase 8.

---

## 8. Final end-to-end check

- Visit your **production** Vercel URL → landing page loads over HTTPS.
- Sign up / log in with Google on production → user appears in Supabase.
- From the deployed app, hit the mock `/generate` on Railway → tokens stream (confirms cross-service auth + CORS + SSE-through-proxy all work).

If that streams on the deployed URL, the walking skeleton is live and every later phase ships to a real URL.

---

## Environment variable reference

| Var | Where | Value |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | web (Vercel + .env.local) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Supabase anon key |
| `NEXT_PUBLIC_AI_URL` | web | Railway URL (local: `http://localhost:8000`) |
| `SUPABASE_URL` | ai (Railway + .env) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ai | Supabase service_role key (server only) |
| `STRIPE_SECRET_KEY` | web | Stripe test secret (Phase 5) |
| `STRIPE_WEBHOOK_SECRET` | web | Stripe webhook signing secret (Phase 5) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` | ai | Provider keys (Phase 3) |

**Golden rule:** service-role key and provider keys live **only** on the server (Railway / Vercel server env) — never in `NEXT_PUBLIC_*` or client code.
</content>
