-- Chronicle: accounts and cloud saving (see src/cloud/).
--
-- Run this once in your Supabase project (SQL Editor → New query → paste → Run).
-- It's safe to run again.
--
-- Each timeline and theme is one row holding the whole document as JSON,
-- like the browser's own database. Row-level security makes sure people
-- only ever read and write their own rows; the app's public "anon" key
-- can't get past it.

-- ---------- Tables ----------

create table if not exists public.timelines (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  -- The timeline, with its pictures replaced by references to Storage. Null once deleted.
  data       jsonb,
  -- Kept as a marker, so other devices learn of the deletion.
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.themes (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Devices ask for "everything changed since …"
create index if not exists timelines_user_updated on public.timelines (user_id, updated_at);
create index if not exists themes_user_updated on public.themes (user_id, updated_at);

-- The server's clock decides updated_at, whatever the device sent
create or replace function public.chronicle_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists timelines_touch on public.timelines;
create trigger timelines_touch before insert or update on public.timelines
  for each row execute function public.chronicle_touch();

drop trigger if exists themes_touch on public.themes;
create trigger themes_touch before insert or update on public.themes
  for each row execute function public.chronicle_touch();

-- ---------- Who may use the tables at all ----------
-- Supabase usually grants these itself; stating them means a project with
-- other defaults doesn't fail with "permission denied". Signed-out visitors
-- get nothing.

grant select, insert, update, delete on public.timelines to authenticated;
grant select, insert, update, delete on public.themes to authenticated;
revoke all on public.timelines from anon;
revoke all on public.themes from anon;

-- ---------- Row-level security: your own rows only ----------

alter table public.timelines enable row level security;
alter table public.themes enable row level security;

drop policy if exists "Own timelines" on public.timelines;
create policy "Own timelines" on public.timelines
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own themes" on public.themes;
create policy "Own themes" on public.themes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- Pictures: a private bucket, one folder per person ----------
--
-- Pictures are stored at pictures/<user id>/<hash>.<ext>. Nobody can list,
-- read or write another person's folder.

insert into storage.buckets (id, name, public)
values ('pictures', 'pictures', false)
on conflict (id) do nothing;

drop policy if exists "Read own pictures" on storage.objects;
create policy "Read own pictures" on storage.objects
  for select to authenticated
  using (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Upload own pictures" on storage.objects;
create policy "Upload own pictures" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Delete own pictures" on storage.objects;
create policy "Delete own pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pictures' and (storage.foldername(name))[1] = (select auth.uid())::text);
