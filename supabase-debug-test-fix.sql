create table if not exists public.debug_tests (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null default 'hello firestore',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.debug_tests
  add column if not exists message text not null default 'hello firestore',
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.debug_tests enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.debug_tests to authenticated;

drop policy if exists "Users manage own debug tests" on public.debug_tests;

create policy "Users manage own debug tests" on public.debug_tests
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
