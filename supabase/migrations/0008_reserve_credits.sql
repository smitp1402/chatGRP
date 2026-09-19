-- Atomic credit reservation.
--
-- Before this, the AI layer summed usage_ledger in Python, decided "allowed",
-- generated, and only then inserted the charge. Two concurrent requests from
-- one user both read the old sum and both passed — the cap could be overshot
-- by as many requests as the user could fire at once.
--
-- reserve_credits() does check + insert in one statement under a row lock on
-- the user's profile, so calls for the same user queue up and each sees the
-- previous one's charge. The charge is written BEFORE generation; on failure
-- or cancel the AI layer calls refund_credits() to delete it again.
--
-- Both functions are callable only by the service role (the AI layer). They
-- take the cost/cap as arguments so pricing stays in application code.

create or replace function reserve_credits(
  p_user_id uuid,
  p_model_id text,
  p_cost int,
  p_cap int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_ledger_id uuid;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now())) at time zone 'utc';
begin
  -- Serialise concurrent reservations for this user. Everyone else proceeds
  -- untouched; a second request from the same user waits here until the first
  -- commits, then sees its ledger row in the sum below.
  perform 1 from profiles where user_id = p_user_id for update;

  select coalesce(sum(credits_used), 0)
    into v_used
    from usage_ledger
   where user_id = p_user_id
     and created_at >= v_month_start;

  if v_used + p_cost > p_cap then
    return jsonb_build_object('ok', false, 'used', v_used, 'cap', p_cap);
  end if;

  insert into usage_ledger (user_id, credits_used, model_id)
  values (p_user_id, p_cost, p_model_id)
  returning id into v_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'used', v_used + p_cost,
    'cap', p_cap,
    'ledger_id', v_ledger_id
  );
end;
$$;

create or replace function refund_credits(p_ledger_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from usage_ledger where id = p_ledger_id;
end;
$$;

revoke execute on function reserve_credits(uuid, text, int, int) from public, anon, authenticated;
revoke execute on function refund_credits(uuid) from public, anon, authenticated;
grant execute on function reserve_credits(uuid, text, int, int) to service_role;
grant execute on function refund_credits(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Lock the ledger down to read-only for users.
--
-- The original policy was FOR ALL, which let a signed-in user delete or
-- insert their own usage_ledger rows through the anon client — i.e. reset
-- their monthly usage from the browser. Only the AI layer (service role,
-- which bypasses RLS) may write; the web app only ever reads it for /api/me.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "own ledger" on usage_ledger;
create policy "own ledger read" on usage_ledger for select
  using (user_id = auth.uid());
