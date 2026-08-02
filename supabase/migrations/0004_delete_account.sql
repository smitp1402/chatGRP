-- Account self-deletion. Deleting the auth.users row cascades to every app
-- table (all reference auth.users ON DELETE CASCADE): profiles, sessions →
-- nodes → messages, generation_attempts, usage_ledger, prompts, folders,
-- layouts, user_settings.
create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
