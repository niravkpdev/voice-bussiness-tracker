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

create table if not exists public.stock_transactions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.invoices (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.orders (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.employees (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.attendance (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payments (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.audit_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.subscriptions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.security_settings (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.devices (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.offline_queue (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

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
  message text not null default 'hello supabase',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'transactions',
    'customers',
    'suppliers',
    'inventory',
    'stock_transactions',
    'invoices',
    'orders',
    'employees',
    'attendance',
    'payments',
    'audit_logs',
    'subscriptions',
    'security_settings',
    'devices',
    'offline_queue',
    'businesses',
    'notifications',
    'reports',
    'settings'
  ]
  loop
    begin
      execute format(
        'alter table public.%I add constraint %I check (length(trim(id)) > 0) not valid',
        table_name,
        table_name || '_id_not_blank'
      );
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'transactions',
    'customers',
    'suppliers',
    'inventory',
    'stock_transactions',
    'invoices',
    'orders',
    'employees',
    'attendance',
    'payments',
    'audit_logs',
    'subscriptions',
    'security_settings',
    'devices',
    'offline_queue',
    'businesses',
    'notifications',
    'reports',
    'settings'
  ]
  loop
    begin
      execute format(
        'alter table public.%I add constraint %I check (jsonb_typeof(data) = ''object'') not valid',
        table_name,
        table_name || '_data_must_be_object'
      );
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

alter table public.transactions enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.orders enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.security_settings enable row level security;
alter table public.devices enable row level security;
alter table public.offline_queue enable row level security;
alter table public.businesses enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;
alter table public.debug_tests enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "Users manage own transactions" on public.transactions;
drop policy if exists "Users manage own customers" on public.customers;
drop policy if exists "Users manage own suppliers" on public.suppliers;
drop policy if exists "Users manage own inventory" on public.inventory;
drop policy if exists "Users manage own stock transactions" on public.stock_transactions;
drop policy if exists "Users manage own invoices" on public.invoices;
drop policy if exists "Users manage own orders" on public.orders;
drop policy if exists "Users manage own employees" on public.employees;
drop policy if exists "Users manage own attendance" on public.attendance;
drop policy if exists "Users manage own payments" on public.payments;
drop policy if exists "Users manage own audit logs" on public.audit_logs;
drop policy if exists "Users manage own subscriptions" on public.subscriptions;
drop policy if exists "Users manage own security settings" on public.security_settings;
drop policy if exists "Users manage own devices" on public.devices;
drop policy if exists "Users manage own offline queue" on public.offline_queue;
drop policy if exists "Users manage own businesses" on public.businesses;
drop policy if exists "Users manage own notifications" on public.notifications;
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

create policy "Users manage own stock transactions" on public.stock_transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own invoices" on public.invoices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own orders" on public.orders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own employees" on public.employees
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own attendance" on public.attendance
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own payments" on public.payments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own audit logs" on public.audit_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own subscriptions" on public.subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own security settings" on public.security_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own devices" on public.devices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own offline queue" on public.offline_queue
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own businesses" on public.businesses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notifications" on public.notifications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own reports" on public.reports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own settings" on public.settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own debug tests" on public.debug_tests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

