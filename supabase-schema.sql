create table if not exists public.transactions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.customers (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.suppliers (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.inventory (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.reports (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.settings (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.debug_tests (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.transactions enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;
alter table public.debug_tests enable row level security;

drop policy if exists "Users manage own transactions" on public.transactions;
drop policy if exists "Users manage own customers" on public.customers;
drop policy if exists "Users manage own suppliers" on public.suppliers;
drop policy if exists "Users manage own inventory" on public.inventory;
drop policy if exists "Users manage own reports" on public.reports;
drop policy if exists "Users manage own settings" on public.settings;
drop policy if exists "Users manage own debug tests" on public.debug_tests;

create policy "Users manage own transactions" on public.transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own customers" on public.customers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own suppliers" on public.suppliers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own inventory" on public.inventory
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own reports" on public.reports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own settings" on public.settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own debug tests" on public.debug_tests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
