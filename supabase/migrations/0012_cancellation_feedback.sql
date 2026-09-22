-- Why people cancel.
--
-- Cancelling used to be a browser confirm() and nothing else, so the single
-- most useful thing a departing customer can tell you was thrown away. This
-- records it, and it cannot be reconstructed later from Stripe or the ledger.
--
-- One row per cancellation, not one per user: someone who subscribes, leaves,
-- returns and leaves again has two reasons worth reading, and they may differ.
--
-- Written by the cancel route with the service-role client, after Stripe has
-- accepted the cancellation. RLS is enabled with no policy for `authenticated`,
-- so the anon client can neither read nor write it — a user cannot see anyone
-- else's reason, or forge their own. Reads happen in the dashboard as the
-- owner, which bypasses RLS.

create table cancellation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- Constrained rather than free text so the answers can be counted. Keep in
  -- step with CANCEL_REASONS in apps/web/lib/cancel-reasons.ts.
  reason text not null check (
    reason in ('too_expensive', 'not_using', 'missing_feature', 'found_alternative', 'other')
  ),
  -- Optional free text. Capped so a paste cannot write unbounded rows.
  note text check (note is null or char_length(note) <= 1000),
  -- The plan being left, captured now: profiles.plan flips to free when the
  -- period ends, and by then this row would no longer say what was cancelled.
  plan text,
  created_at timestamptz not null default now()
);

create index on cancellation_feedback (created_at);

alter table cancellation_feedback enable row level security;

-- Deliberately no policies. Only the service role touches this table.
