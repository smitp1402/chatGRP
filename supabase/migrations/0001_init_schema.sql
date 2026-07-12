-- ChatGRP initial schema — 9 tables + Row Level Security
-- Apply via Supabase Dashboard → SQL Editor, or `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Core graph: sessions → nodes → messages → generation_attempts
-- ─────────────────────────────────────────────────────────────
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  layout jsonb,                              -- per-session panel override; null = user default
  created_at timestamptz default now()
);

create table nodes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  parent_id uuid references nodes(id) on delete cascade,   -- null = root
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

-- ─────────────────────────────────────────────────────────────
-- Billing: durable, auditable credit usage (source of truth)
-- ─────────────────────────────────────────────────────────────
create table usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_attempt_id uuid references generation_attempts(id) on delete set null,
  credits_used int not null,
  model_id text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- Prompt library
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- Customizable layout
-- ─────────────────────────────────────────────────────────────
create table layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tree jsonb not null,                       -- dock arrangement, panel sizes, visibility
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

-- ─────────────────────────────────────────────────────────────
-- Helpful indexes
-- ─────────────────────────────────────────────────────────────
create index on nodes (session_id);
create index on nodes (parent_id);
create index on messages (node_id);
create index on messages (session_id);
create index on generation_attempts (node_id);
create index on usage_ledger (user_id, created_at);
create index on saved_prompts (user_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — every user sees only their own rows
-- ─────────────────────────────────────────────────────────────
alter table sessions enable row level security;
alter table nodes enable row level security;
alter table messages enable row level security;
alter table generation_attempts enable row level security;
alter table usage_ledger enable row level security;
alter table prompt_folders enable row level security;
alter table saved_prompts enable row level security;
alter table layouts enable row level security;
alter table user_settings enable row level security;

create policy "own sessions" on sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own nodes" on nodes for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

create policy "own messages" on messages for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

create policy "own attempts" on generation_attempts for all
  using (node_id in (
    select n.id from nodes n join sessions s on n.session_id = s.id
    where s.user_id = auth.uid()));

create policy "own ledger" on usage_ledger for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own folders" on prompt_folders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own prompts" on saved_prompts for all
  using (user_id = auth.uid() or (visibility = 'team' and team_id is not null))
  with check (user_id = auth.uid());

create policy "own layouts" on layouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own settings" on user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
