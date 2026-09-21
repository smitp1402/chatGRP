-- Shared per-user rate limit for the AI layer.
--
-- The previous limiter counted requests in each Cloud Run instance's memory,
-- so the effective limit was (instances x 30)/min and reset on every deploy.
-- This is a fixed-window counter in Postgres: one row per key, atomically
-- bumped by an upsert, so every instance sees the same number.
--
-- Service-role only — the AI layer calls it; users never touch it.

create table if not exists rate_limits (
  key text primary key,                    -- e.g. 'generate:<user_id>'
  window_start timestamptz not null,
  hits int not null default 0
);

alter table rate_limits enable row level security;   -- no policies: users get nothing

create or replace function hit_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
  v_start timestamptz;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  -- One statement: start a new window if the old one has expired, otherwise
  -- bump the counter. The upsert holds the row lock, so concurrent hits for
  -- the same key are serialised.
  insert into rate_limits (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
                 when rate_limits.window_start + v_window <= now() then 1
                 else rate_limits.hits + 1
               end,
        window_start = case
                 when rate_limits.window_start + v_window <= now() then now()
                 else rate_limits.window_start
               end
  returning hits, window_start into v_hits, v_start;

  return jsonb_build_object(
    'allowed', v_hits <= p_max,
    'hits', v_hits,
    'retry_after', greatest(0, ceil(extract(epoch from (v_start + v_window - now()))))::int
  );
end;
$$;

revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;
