-- Retire the Team plan.
--
-- The tier was dropped from the product (no price, no UI, no Stripe mapping),
-- but the column constraint still admitted 'team' and the AI layer would have
-- granted it 10,000 credits/month. Close the door: any straggler falls back
-- to Free and the constraint only knows the two live plans.
--
-- `saved_prompts.visibility = 'team'` is a different concept (prompt sharing)
-- and is left alone.

update profiles set plan = 'free', updated_at = now() where plan = 'team';

alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check check (plan in ('free', 'pro'));
