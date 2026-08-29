-- ─────────────────────────────────────────────────────────────
-- Attachments — files and images carried by a user message
--
-- One row per uploaded file, linked to the `messages` row it was sent with.
-- The bytes live in the private `attachments` storage bucket; this table only
-- holds the pointer plus the metadata the UI and the AI layer need without
-- downloading the object first.
-- ─────────────────────────────────────────────────────────────

create table attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,                       -- object key inside the `attachments` bucket
  file_name text not null,                          -- original name, shown in the UI
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  kind text not null check (kind in ('image', 'document')),
  created_at timestamptz default now()
);

create index on attachments (message_id);
create index on attachments (session_id);
create index on attachments (user_id);

alter table attachments enable row level security;

-- Same ownership rule as messages: reachable only through your own sessions.
create policy "own attachments" on attachments for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Storage bucket
--
-- Private. Objects are keyed `{user_id}/{session_id}/{uuid}.{ext}` so the
-- first path segment can be checked against auth.uid() by the policies below.
-- The AI layer reads objects with the service-role key, which bypasses RLS.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,  -- 10 MB, enforced again in the client and the API
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'text/plain', 'text/markdown', 'text/csv',
    'application/json', 'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "own attachment objects read" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own attachment objects insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own attachment objects delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
