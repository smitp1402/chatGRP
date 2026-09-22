-- Sum a user's credits for the current month in Postgres.
--
-- /api/me was selecting every usage_ledger row since the month started and
-- adding them up in JavaScript, so producing one number meant shipping one row
-- per generation across the network. A heavy Pro user makes hundreds a month,
-- and /api/me runs on every page load, so the endpoint got slower for exactly
-- the people paying for it.
--
-- reserve_credits (migration 0008) already sums inside Postgres; this gives the
-- web app the same thing. No new index is needed: 0001 created
-- `usage_ledger (user_id, created_at)`, which is exactly this predicate.
--
-- Callable as the signed-in user, not just the service role, because the web
-- app calls it with the user's own client. It takes no arguments and reads
-- auth.uid() itself, so one user cannot ask for another's total — RLS on
-- usage_ledger is `user_id = auth.uid()` and security invoker keeps it applied.

create or replace function monthly_credits_used()
returns int
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(sum(credits_used), 0)::int
    from usage_ledger
   where user_id = auth.uid()
     and created_at >= date_trunc('month', timezone('utc', now())) at time zone 'utc';
$$;

grant execute on function monthly_credits_used() to authenticated;
