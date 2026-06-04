create table if not exists public.businesses (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.notifications (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.businesses enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users manage own businesses" on public.businesses;
drop policy if exists "Users manage own notifications" on public.notifications;

create policy "Users manage own businesses" on public.businesses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own notifications" on public.notifications
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
