-- Public sharing: an opaque token granting read-only access to one session.
--
-- The token IS the capability — anyone holding it can read the graph. Public
-- reads are served by a Next route using the service-role client, so no RLS
-- policy is relaxed here: `sessions` stays owner-only for every normal path.
-- Revoking a link is just setting share_token back to null.

alter table sessions add column if not exists share_token uuid;

create unique index if not exists sessions_share_token_key
  on sessions (share_token)
  where share_token is not null;
