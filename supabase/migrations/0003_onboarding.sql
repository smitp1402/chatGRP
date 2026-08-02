-- Onboarding: track completion + the user's preferred default model.

alter table profiles add column if not exists onboarded boolean not null default false;
alter table profiles add column if not exists default_model_id text;

-- A security-definer function so users can mark themselves onboarded and set a
-- default model WITHOUT a blanket UPDATE policy on profiles (which would let
-- them change their own `plan`). This only touches the two safe columns.
create or replace function complete_onboarding(model text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
     set onboarded = true,
         default_model_id = coalesce(model, default_model_id),
         updated_at = now()
   where user_id = auth.uid();
end;
$$;
