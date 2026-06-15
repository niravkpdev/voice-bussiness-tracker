-- Phase 1 Risk 3: Role-aware RLS for company/business membership.
-- Run this file in Supabase SQL Editor after the existing schema and RPC migrations.
--
-- Existing data remains owned by the original row user_id. The membership table
-- adds role-aware access for users invited into that owner's business.

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null default 'default',
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff',
  status text not null default 'active',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_members_role_check check (role in ('owner', 'manager', 'accountant', 'staff')),
  constraint company_members_status_check check (status in ('active', 'invited', 'disabled')),
  constraint company_members_business_id_not_blank check (length(trim(business_id)) > 0),
  unique (owner_user_id, business_id, user_id)
);

alter table public.company_members enable row level security;

create index if not exists company_members_user_idx
  on public.company_members (user_id, status);

create index if not exists company_members_owner_business_idx
  on public.company_members (owner_user_id, business_id, status);

create or replace function public.row_business_id(p_data jsonb)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p_data->>'businessId'), ''), 'default')
$$;

create or replace function public.current_user_role(p_owner_user_id uuid, p_business_id text default 'default')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when auth.uid() = p_owner_user_id then 'owner'
    else (
      select lower(cm.role)
      from public.company_members cm
      where cm.owner_user_id = p_owner_user_id
        and cm.business_id = coalesce(nullif(trim(p_business_id), ''), 'default')
        and cm.user_id = auth.uid()
        and cm.status = 'active'
      limit 1
    )
  end
$$;

create or replace function public.has_company_role(
  p_owner_user_id uuid,
  p_business_id text,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(p_owner_user_id, p_business_id) = any(p_allowed_roles), false)
$$;

create or replace function public.can_select_company_row(
  p_owner_user_id uuid,
  p_business_id text,
  p_table_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_table_name in ('security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('reports', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    else public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant', 'staff'])
  end
$$;

create or replace function public.can_insert_company_row(
  p_owner_user_id uuid,
  p_business_id text,
  p_table_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_table_name in ('businesses', 'security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'attendance', 'notifications')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'staff'])
    else false
  end
$$;

create or replace function public.can_update_company_row(
  p_owner_user_id uuid,
  p_business_id text,
  p_table_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_table_name in ('businesses', 'security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'attendance', 'notifications')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager'])
    else false
  end
$$;

create or replace function public.can_delete_company_row(
  p_owner_user_id uuid,
  p_business_id text,
  p_table_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'attendance', 'notifications', 'reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('businesses', 'security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    else false
  end
$$;

create or replace function public.backfill_owner_company_memberships()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_members (owner_user_id, business_id, user_id, role, status, joined_at)
  select distinct b.user_id, b.id, b.user_id, 'owner', 'active', now()
  from public.businesses b
  on conflict (owner_user_id, business_id, user_id) do update
    set role = 'owner',
        status = 'active',
        updated_at = now();

  insert into public.company_members (owner_user_id, business_id, user_id, role, status, joined_at)
  select distinct source.user_id, 'default', source.user_id, 'owner', 'active', now()
  from (
    select user_id from public.transactions
    union select user_id from public.customers
    union select user_id from public.suppliers
    union select user_id from public.inventory
    union select user_id from public.stock_transactions
    union select user_id from public.invoices
    union select user_id from public.orders
    union select user_id from public.employees
    union select user_id from public.attendance
    union select user_id from public.payments
    union select user_id from public.audit_logs
    union select user_id from public.subscriptions
    union select user_id from public.security_settings
    union select user_id from public.devices
    union select user_id from public.offline_queue
    union select user_id from public.businesses
    union select user_id from public.notifications
    union select user_id from public.reports
    union select user_id from public.settings
  ) source
  on conflict (owner_user_id, business_id, user_id) do update
    set role = 'owner',
        status = 'active',
        updated_at = now();
end;
$$;

select public.backfill_owner_company_memberships();

drop policy if exists "Members read own memberships" on public.company_members;
drop policy if exists "Owners manage company memberships" on public.company_members;

create policy "Members read own memberships" on public.company_members
for select
using (
  auth.uid() = user_id
  or public.has_company_role(owner_user_id, business_id, array['owner'])
);

create policy "Owners manage company memberships" on public.company_members
for all
using (public.has_company_role(owner_user_id, business_id, array['owner']))
with check (public.has_company_role(owner_user_id, business_id, array['owner']));

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

drop policy if exists "Role select transactions" on public.transactions;
drop policy if exists "Role insert transactions" on public.transactions;
drop policy if exists "Role update transactions" on public.transactions;
drop policy if exists "Role delete transactions" on public.transactions;
drop policy if exists "Role select customers" on public.customers;
drop policy if exists "Role insert customers" on public.customers;
drop policy if exists "Role update customers" on public.customers;
drop policy if exists "Role delete customers" on public.customers;
drop policy if exists "Role select suppliers" on public.suppliers;
drop policy if exists "Role insert suppliers" on public.suppliers;
drop policy if exists "Role update suppliers" on public.suppliers;
drop policy if exists "Role delete suppliers" on public.suppliers;
drop policy if exists "Role select inventory" on public.inventory;
drop policy if exists "Role insert inventory" on public.inventory;
drop policy if exists "Role update inventory" on public.inventory;
drop policy if exists "Role delete inventory" on public.inventory;
drop policy if exists "Role select stock transactions" on public.stock_transactions;
drop policy if exists "Role insert stock transactions" on public.stock_transactions;
drop policy if exists "Role update stock transactions" on public.stock_transactions;
drop policy if exists "Role delete stock transactions" on public.stock_transactions;
drop policy if exists "Role select invoices" on public.invoices;
drop policy if exists "Role insert invoices" on public.invoices;
drop policy if exists "Role update invoices" on public.invoices;
drop policy if exists "Role delete invoices" on public.invoices;
drop policy if exists "Role select payments" on public.payments;
drop policy if exists "Role insert payments" on public.payments;
drop policy if exists "Role update payments" on public.payments;
drop policy if exists "Role delete payments" on public.payments;
drop policy if exists "Role select orders" on public.orders;
drop policy if exists "Role insert orders" on public.orders;
drop policy if exists "Role update orders" on public.orders;
drop policy if exists "Role delete orders" on public.orders;
drop policy if exists "Role select employees" on public.employees;
drop policy if exists "Role insert employees" on public.employees;
drop policy if exists "Role update employees" on public.employees;
drop policy if exists "Role delete employees" on public.employees;
drop policy if exists "Role select attendance" on public.attendance;
drop policy if exists "Role insert attendance" on public.attendance;
drop policy if exists "Role update attendance" on public.attendance;
drop policy if exists "Role delete attendance" on public.attendance;
drop policy if exists "Role select audit logs" on public.audit_logs;
drop policy if exists "Role insert audit logs" on public.audit_logs;
drop policy if exists "Role update audit logs" on public.audit_logs;
drop policy if exists "Role delete audit logs" on public.audit_logs;
drop policy if exists "Role select businesses" on public.businesses;
drop policy if exists "Role insert businesses" on public.businesses;
drop policy if exists "Role update businesses" on public.businesses;
drop policy if exists "Role delete businesses" on public.businesses;
drop policy if exists "Role select notifications" on public.notifications;
drop policy if exists "Role insert notifications" on public.notifications;
drop policy if exists "Role update notifications" on public.notifications;
drop policy if exists "Role delete notifications" on public.notifications;
drop policy if exists "Role select reports" on public.reports;
drop policy if exists "Role insert reports" on public.reports;
drop policy if exists "Role update reports" on public.reports;
drop policy if exists "Role delete reports" on public.reports;
drop policy if exists "Role select settings" on public.settings;
drop policy if exists "Role insert settings" on public.settings;
drop policy if exists "Role update settings" on public.settings;
drop policy if exists "Role delete settings" on public.settings;
drop policy if exists "Role select subscriptions" on public.subscriptions;
drop policy if exists "Role insert subscriptions" on public.subscriptions;
drop policy if exists "Role update subscriptions" on public.subscriptions;
drop policy if exists "Role delete subscriptions" on public.subscriptions;
drop policy if exists "Role select security settings" on public.security_settings;
drop policy if exists "Role insert security settings" on public.security_settings;
drop policy if exists "Role update security settings" on public.security_settings;
drop policy if exists "Role delete security settings" on public.security_settings;
drop policy if exists "Role select devices" on public.devices;
drop policy if exists "Role insert devices" on public.devices;
drop policy if exists "Role update devices" on public.devices;
drop policy if exists "Role delete devices" on public.devices;
drop policy if exists "Role select offline queue" on public.offline_queue;
drop policy if exists "Role insert offline queue" on public.offline_queue;
drop policy if exists "Role update offline queue" on public.offline_queue;
drop policy if exists "Role delete offline queue" on public.offline_queue;

create policy "Role select transactions" on public.transactions
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'transactions'));
create policy "Role insert transactions" on public.transactions
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'transactions'));
create policy "Role update transactions" on public.transactions
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'transactions'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'transactions'));
create policy "Role delete transactions" on public.transactions
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'transactions'));

create policy "Role select customers" on public.customers
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'customers'));
create policy "Role insert customers" on public.customers
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'customers'));
create policy "Role update customers" on public.customers
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'customers'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'customers'));
create policy "Role delete customers" on public.customers
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'customers'));

create policy "Role select suppliers" on public.suppliers
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'suppliers'));
create policy "Role insert suppliers" on public.suppliers
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'suppliers'));
create policy "Role update suppliers" on public.suppliers
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'suppliers'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'suppliers'));
create policy "Role delete suppliers" on public.suppliers
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'suppliers'));

create policy "Role select inventory" on public.inventory
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'inventory'));
create policy "Role insert inventory" on public.inventory
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'inventory'));
create policy "Role update inventory" on public.inventory
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'inventory'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'inventory'));
create policy "Role delete inventory" on public.inventory
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'inventory'));

create policy "Role select stock transactions" on public.stock_transactions
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'stock_transactions'));
create policy "Role insert stock transactions" on public.stock_transactions
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'stock_transactions'));
create policy "Role update stock transactions" on public.stock_transactions
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'stock_transactions'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'stock_transactions'));
create policy "Role delete stock transactions" on public.stock_transactions
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'stock_transactions'));

create policy "Role select invoices" on public.invoices
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'invoices'));
create policy "Role insert invoices" on public.invoices
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'invoices'));
create policy "Role update invoices" on public.invoices
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'invoices'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'invoices'));
create policy "Role delete invoices" on public.invoices
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'invoices'));

create policy "Role select payments" on public.payments
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'payments'));
create policy "Role insert payments" on public.payments
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'payments'));
create policy "Role update payments" on public.payments
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'payments'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'payments'));
create policy "Role delete payments" on public.payments
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'payments'));

create policy "Role select orders" on public.orders
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'orders'));
create policy "Role insert orders" on public.orders
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'orders'));
create policy "Role update orders" on public.orders
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'orders'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'orders'));
create policy "Role delete orders" on public.orders
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'orders'));

create policy "Role select employees" on public.employees
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'employees'));
create policy "Role insert employees" on public.employees
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'employees'));
create policy "Role update employees" on public.employees
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'employees'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'employees'));
create policy "Role delete employees" on public.employees
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'employees'));

create policy "Role select attendance" on public.attendance
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'attendance'));
create policy "Role insert attendance" on public.attendance
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'attendance'));
create policy "Role update attendance" on public.attendance
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'attendance'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'attendance'));
create policy "Role delete attendance" on public.attendance
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'attendance'));

create policy "Role select audit logs" on public.audit_logs
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'audit_logs'));
create policy "Role insert audit logs" on public.audit_logs
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'audit_logs'));
create policy "Role update audit logs" on public.audit_logs
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'audit_logs'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'audit_logs'));
create policy "Role delete audit logs" on public.audit_logs
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'audit_logs'));

create policy "Role select businesses" on public.businesses
for select using (public.can_select_company_row(user_id, id, 'businesses'));
create policy "Role insert businesses" on public.businesses
for insert with check (public.can_insert_company_row(user_id, id, 'businesses'));
create policy "Role update businesses" on public.businesses
for update using (public.can_update_company_row(user_id, id, 'businesses'))
with check (public.can_update_company_row(user_id, id, 'businesses'));
create policy "Role delete businesses" on public.businesses
for delete using (public.can_delete_company_row(user_id, id, 'businesses'));

create policy "Role select notifications" on public.notifications
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'notifications'));
create policy "Role insert notifications" on public.notifications
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'notifications'));
create policy "Role update notifications" on public.notifications
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'notifications'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'notifications'));
create policy "Role delete notifications" on public.notifications
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'notifications'));

create policy "Role select reports" on public.reports
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'reports'));
create policy "Role insert reports" on public.reports
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'reports'));
create policy "Role update reports" on public.reports
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'reports'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'reports'));
create policy "Role delete reports" on public.reports
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'reports'));

create policy "Role select settings" on public.settings
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'settings'));
create policy "Role insert settings" on public.settings
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'settings'));
create policy "Role update settings" on public.settings
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'settings'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'settings'));
create policy "Role delete settings" on public.settings
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'settings'));

create policy "Role select subscriptions" on public.subscriptions
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'subscriptions'));
create policy "Role insert subscriptions" on public.subscriptions
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'subscriptions'));
create policy "Role update subscriptions" on public.subscriptions
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'subscriptions'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'subscriptions'));
create policy "Role delete subscriptions" on public.subscriptions
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'subscriptions'));

create policy "Role select security settings" on public.security_settings
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'security_settings'));
create policy "Role insert security settings" on public.security_settings
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'security_settings'));
create policy "Role update security settings" on public.security_settings
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'security_settings'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'security_settings'));
create policy "Role delete security settings" on public.security_settings
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'security_settings'));

create policy "Role select devices" on public.devices
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'devices'));
create policy "Role insert devices" on public.devices
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'devices'));
create policy "Role update devices" on public.devices
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'devices'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'devices'));
create policy "Role delete devices" on public.devices
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'devices'));

create policy "Role select offline queue" on public.offline_queue
for select using (public.can_select_company_row(user_id, public.row_business_id(data), 'offline_queue'));
create policy "Role insert offline queue" on public.offline_queue
for insert with check (public.can_insert_company_row(user_id, public.row_business_id(data), 'offline_queue'));
create policy "Role update offline queue" on public.offline_queue
for update using (public.can_update_company_row(user_id, public.row_business_id(data), 'offline_queue'))
with check (public.can_update_company_row(user_id, public.row_business_id(data), 'offline_queue'));
create policy "Role delete offline queue" on public.offline_queue
for delete using (public.can_delete_company_row(user_id, public.row_business_id(data), 'offline_queue'));

grant select, insert, update, delete on public.company_members to authenticated;
grant execute on function public.current_user_role(uuid, text) to authenticated;
grant execute on function public.has_company_role(uuid, text, text[]) to authenticated;
grant execute on function public.can_select_company_row(uuid, text, text) to authenticated;
grant execute on function public.can_insert_company_row(uuid, text, text) to authenticated;
grant execute on function public.can_update_company_row(uuid, text, text) to authenticated;
grant execute on function public.can_delete_company_row(uuid, text, text) to authenticated;
