-- Track whether a subscription is scheduled to cancel at period end, so the
-- billing UI can show "cancels on <date>" without re-querying Stripe.
alter table profiles add column if not exists cancel_at_period_end boolean not null default false;
