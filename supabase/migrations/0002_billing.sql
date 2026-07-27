-- Phase 5A — per-user plan + auto-provisioning.
-- Credit *usage* is derived from the usage_ledger table (source of truth);
-- this migration only adds where each user's PLAN lives.

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text,        -- filled in Phase 5B
  stripe_subscription_id text,    -- filled in Phase 5B
  current_period_end timestamptz, -- filled in Phase 5B
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

-- Users may read their own profile. Writes happen server-side (trigger below
-- and, in Phase 5B, Stripe webhooks) via the service role, which bypasses RLS.
create policy "own profile read" on profiles for select using (user_id = auth.uid());

-- Auto-create a free profile whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
