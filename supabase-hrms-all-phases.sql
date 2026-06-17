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

create table if not exists public.leave_balances (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.leave_requests (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.holidays (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.salary_history (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payslips (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.employee_documents (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.employee_user_mappings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null default 'default',
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text not null,
  employee_email text not null,
  status text not null default 'active',
  invited_at timestamptz not null default now(),
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, business_id, user_id),
  unique (owner_user_id, business_id, employee_id)
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
    'leave_balances',
    'leave_requests',
    'holidays',
    'salary_history',
    'payslips',
    'employee_documents',
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
begin
  alter table public.transactions
    add constraint transactions_data_shape
    check (
      data ? 'id'
      and data ? 'type'
      and (data->>'type') in ('Receipt', 'Payment', 'Sales', 'Purchase', 'Expense', 'income', 'expense', 'inventory', 'customer_due', 'payment_received')
      and case
        when data ? 'amount' and (data->>'amount') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'amount')::numeric >= 0
        else false
      end
    ) not valid;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.customers
    add constraint customers_data_shape
    check (
      data ? 'id'
      and data ? 'name'
      and length(trim(data->>'name')) > 0
      and coalesce(data->>'type', 'customer') = 'customer'
    ) not valid;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.suppliers
    add constraint suppliers_data_shape
    check (
      data ? 'id'
      and data ? 'name'
      and length(trim(data->>'name')) > 0
      and coalesce(data->>'type', 'supplier') = 'supplier'
    ) not valid;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.inventory
    add constraint inventory_data_shape
    check (
      data ? 'id'
      and data ? 'name'
      and length(trim(data->>'name')) > 0
      and case
        when data ? 'currentStock' and (data->>'currentStock') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'currentStock')::numeric >= 0
        else false
      end
      and case
        when data ? 'purchasePrice' and (data->>'purchasePrice') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'purchasePrice')::numeric >= 0
        else false
      end
      and case
        when data ? 'sellingPrice' and (data->>'sellingPrice') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'sellingPrice')::numeric >= 0
        else false
      end
    ) not valid;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.orders
    add constraint orders_data_shape
    check (
      data ? 'id'
      and data ? 'customer'
      and length(trim(data->>'customer')) > 0
      and case
        when data ? 'amount' and (data->>'amount') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'amount')::numeric >= 0
        else false
      end
    ) not valid;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter table public.employees
    add constraint employees_data_shape
    check (
      data ? 'id'
      and data ? 'name'
      and length(trim(data->>'name')) > 0
      and case
        when data ? 'salary' and (data->>'salary') ~ '^[0-9]+(\.[0-9]+)?$'
          then (data->>'salary')::numeric >= 0
        else false
      end
    ) not valid;
exception when duplicate_object then
  null;
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
    'leave_balances',
    'leave_requests',
    'holidays',
    'salary_history',
    'payslips',
    'employee_documents',
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
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.holidays enable row level security;
alter table public.salary_history enable row level security;
alter table public.payslips enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_user_mappings enable row level security;
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
drop policy if exists "Users manage own leave balances" on public.leave_balances;
drop policy if exists "Users manage own leave requests" on public.leave_requests;
drop policy if exists "Users manage own holidays" on public.holidays;
drop policy if exists "Users manage own salary history" on public.salary_history;
drop policy if exists "Users manage own payslips" on public.payslips;
drop policy if exists "Users manage own employee documents" on public.employee_documents;
drop policy if exists "Users manage own employee mappings" on public.employee_user_mappings;
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

create policy "Users manage own leave balances" on public.leave_balances
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own leave requests" on public.leave_requests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own holidays" on public.holidays
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own salary history" on public.salary_history
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own payslips" on public.payslips
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own employee documents" on public.employee_documents
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own employee mappings" on public.employee_user_mappings
for all using (auth.uid() = owner_user_id or auth.uid() = user_id)
with check (auth.uid() = owner_user_id);

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

-- HRMS Phase A: Employee Master foundation.
-- Safe to run after the base Supabase schema. This migration only improves the
-- existing JSON-backed employees table; it does not touch accounting tables.

create index if not exists employees_employee_id_idx
  on public.employees (user_id, lower(coalesce(data->>'employeeId', data->>'employee_id', '')));

create index if not exists employees_department_idx
  on public.employees (user_id, lower(coalesce(data->>'department', '')));

create index if not exists employees_status_idx
  on public.employees (user_id, coalesce(data->>'status', 'Active'));

do $$
begin
  alter table public.employees
    add constraint employees_hrms_phase_a_shape
    check (
      jsonb_typeof(data) = 'object'
      and data ? 'id'
      and (
        not (data ? 'employeeId')
        or length(trim(data->>'employeeId')) > 0
      )
      and (
        not (data ? 'employee_id')
        or length(trim(data->>'employee_id')) > 0
      )
      and (
        (data ? 'fullName' and length(trim(data->>'fullName')) > 0)
        or (data ? 'full_name' and length(trim(data->>'full_name')) > 0)
        or (data ? 'name' and length(trim(data->>'name')) > 0)
      )
      and (
        not (data ? 'status')
        or data->>'status' in ('Active', 'Inactive')
      )
      and (
        not (data ? 'salary')
        or (
          (data->>'salary') ~ '^[0-9]+(\.[0-9]+)?$'
          and (data->>'salary')::numeric >= 0
        )
      )
    ) not valid;
exception
  when duplicate_object then null;
end $$;

comment on constraint employees_hrms_phase_a_shape on public.employees is
  'Backward-compatible HRMS Phase A validation for new employee master JSON records. NOT VALID preserves existing legacy rows.';
-- HRMS Phase B: attendance, leave management, and holiday calendar.
-- Safe standalone migration. It does not modify accounting tables.

create table if not exists public.leave_balances (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.leave_requests (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.holidays (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.holidays enable row level security;

create index if not exists attendance_employee_date_idx
  on public.attendance (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'attendanceDate', data->>'date', ''));

create index if not exists leave_balances_employee_type_idx
  on public.leave_balances (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'leaveType', ''));

create index if not exists leave_requests_employee_status_idx
  on public.leave_requests (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'status', 'Pending'));

create index if not exists holidays_date_idx
  on public.holidays (user_id, coalesce(data->>'holidayDate', data->>'holiday_date', ''));

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
    when p_table_name in ('attendance', 'leave_balances', 'leave_requests', 'holidays')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant', 'staff'])
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
    when p_table_name in ('attendance', 'leave_balances', 'leave_requests', 'holidays')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'staff'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'notifications')
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
    when p_table_name in ('attendance', 'leave_balances', 'leave_requests', 'holidays')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'notifications')
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
    when p_table_name in ('attendance', 'leave_balances', 'leave_requests', 'holidays')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'notifications', 'reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('businesses', 'security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    else false
  end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['leave_balances', 'leave_requests', 'holidays']
  loop
    execute format('drop policy if exists "%1$s select own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s insert own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s update own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s delete own company rows" on public.%1$I', table_name);

    execute format(
      'create policy "%1$s select own company rows" on public.%1$I for select using (auth.uid() = user_id or public.can_select_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s insert own company rows" on public.%1$I for insert with check (auth.uid() = user_id and public.can_insert_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s update own company rows" on public.%1$I for update using (auth.uid() = user_id and public.can_update_company_row(user_id, public.row_business_id(data), %2$L)) with check (auth.uid() = user_id and public.can_update_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s delete own company rows" on public.%1$I for delete using (auth.uid() = user_id and public.can_delete_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
  end loop;
end $$;

create or replace function public.is_own_employee_record(
  p_owner_user_id uuid,
  p_employee_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.user_id = p_owner_user_id
      and e.id = p_employee_id
      and lower(coalesce(e.data->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
  )
$$;

drop policy if exists "leave_balances select own company rows" on public.leave_balances;
drop policy if exists "leave_balances insert own company rows" on public.leave_balances;
drop policy if exists "leave_balances update own company rows" on public.leave_balances;
drop policy if exists "leave_balances delete own company rows" on public.leave_balances;
drop policy if exists "leave_requests select own company rows" on public.leave_requests;
drop policy if exists "leave_requests insert own company rows" on public.leave_requests;
drop policy if exists "leave_requests update own company rows" on public.leave_requests;
drop policy if exists "leave_requests delete own company rows" on public.leave_requests;
drop policy if exists "holidays select own company rows" on public.holidays;
drop policy if exists "holidays insert own company rows" on public.holidays;
drop policy if exists "holidays update own company rows" on public.holidays;
drop policy if exists "holidays delete own company rows" on public.holidays;

drop policy if exists "Users manage own attendance" on public.attendance;
drop policy if exists "attendance select own company rows" on public.attendance;
drop policy if exists "attendance insert own company rows" on public.attendance;
drop policy if exists "attendance update own company rows" on public.attendance;
drop policy if exists "attendance delete own company rows" on public.attendance;
drop policy if exists "attendance select hrms scoped rows" on public.attendance;
drop policy if exists "attendance insert hrms manager rows" on public.attendance;
drop policy if exists "attendance update hrms manager rows" on public.attendance;
drop policy if exists "attendance delete hrms manager rows" on public.attendance;

create policy "attendance select hrms scoped rows" on public.attendance
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_own_employee_record(user_id, data->>'employeeId')
);

create policy "attendance insert hrms manager rows" on public.attendance
for insert
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "attendance update hrms manager rows" on public.attendance
for update
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
)
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "attendance delete hrms manager rows" on public.attendance
for delete
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "leave_balances select hrms scoped rows" on public.leave_balances
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_own_employee_record(user_id, data->>'employeeId')
);

create policy "leave_balances insert hrms manager rows" on public.leave_balances
for insert
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "leave_balances update hrms manager rows" on public.leave_balances
for update
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
)
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "leave_balances delete hrms manager rows" on public.leave_balances
for delete
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "leave_requests select hrms scoped rows" on public.leave_requests
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_own_employee_record(user_id, data->>'employeeId')
);

create policy "leave_requests insert hrms scoped rows" on public.leave_requests
for insert
with check (
  auth.uid() = user_id
  and (
    public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
    or public.is_own_employee_record(user_id, data->>'employeeId')
  )
);

create policy "leave_requests update hrms manager rows" on public.leave_requests
for update
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
)
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "leave_requests delete hrms manager rows" on public.leave_requests
for delete
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "holidays select hrms company rows" on public.holidays
for select
using (public.can_select_company_row(user_id, public.row_business_id(data), 'holidays'));

create policy "holidays insert hrms manager rows" on public.holidays
for insert
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "holidays update hrms manager rows" on public.holidays
for update
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
)
with check (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

create policy "holidays delete hrms manager rows" on public.holidays
for delete
using (
  auth.uid() = user_id
  and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
);

do $$
begin
  alter table public.attendance
    add constraint attendance_hrms_phase_b_shape
    check (
      jsonb_typeof(data) = 'object'
      and data ? 'id'
      and (
        not (data ? 'status')
        or data->>'status' in ('Present', 'Absent', 'Half Day', 'Leave')
      )
    ) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leave_requests
    add constraint leave_requests_hrms_phase_b_shape
    check (
      jsonb_typeof(data) = 'object'
      and data ? 'id'
      and data->>'leaveType' in ('SL', 'CL', 'PL')
      and data->>'status' in ('Pending', 'Approved', 'Rejected')
    ) not valid;
exception
  when duplicate_object then null;
end $$;
-- HRMS Phase C: salary history, payslips, and employee document storage.
-- Safe standalone migration. It does not modify accounting tables.

create table if not exists public.salary_history (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payslips (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.employee_documents (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.salary_history enable row level security;
alter table public.payslips enable row level security;
alter table public.employee_documents enable row level security;

create index if not exists salary_history_employee_idx
  on public.salary_history (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'effectiveFrom', data->>'effective_from', ''));

create index if not exists payslips_employee_month_idx
  on public.payslips (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'salaryMonth', data->>'salary_month', ''));

create index if not exists employee_documents_employee_category_idx
  on public.employee_documents (user_id, coalesce(data->>'employeeId', ''), coalesce(data->>'documentCategory', data->>'document_category', ''));

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
    when p_table_name in ('salary_history', 'payslips')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('employee_documents')
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
    when p_table_name in ('salary_history', 'payslips')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('employee_documents')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'attendance', 'leave_balances', 'leave_requests', 'holidays', 'notifications')
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
    when p_table_name in ('salary_history', 'payslips')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('employee_documents')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager', 'accountant'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'attendance', 'leave_balances', 'leave_requests', 'holidays', 'notifications')
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
    when p_table_name in ('salary_history', 'payslips')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('employee_documents')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('transactions', 'payments', 'invoices')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'accountant'])
    when p_table_name in ('attendance', 'leave_balances', 'leave_requests', 'holidays')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner', 'manager'])
    when p_table_name in ('customers', 'suppliers', 'inventory', 'stock_transactions', 'orders', 'employees', 'notifications', 'reports')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    when p_table_name in ('businesses', 'security_settings', 'subscriptions', 'devices', 'offline_queue', 'settings', 'audit_logs')
      then public.has_company_role(p_owner_user_id, p_business_id, array['owner'])
    else false
  end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['salary_history', 'payslips', 'employee_documents']
  loop
    execute format('drop policy if exists "%1$s select own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s insert own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s update own company rows" on public.%1$I', table_name);
    execute format('drop policy if exists "%1$s delete own company rows" on public.%1$I', table_name);

    execute format(
      'create policy "%1$s select own company rows" on public.%1$I for select using (public.can_select_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s insert own company rows" on public.%1$I for insert with check (auth.uid() = user_id and public.can_insert_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s update own company rows" on public.%1$I for update using (auth.uid() = user_id and public.can_update_company_row(user_id, public.row_business_id(data), %2$L)) with check (auth.uid() = user_id and public.can_update_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
    execute format(
      'create policy "%1$s delete own company rows" on public.%1$I for delete using (auth.uid() = user_id and public.can_delete_company_row(user_id, public.row_business_id(data), %2$L))',
      table_name,
      table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hrms-documents',
  'hrms-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "HRMS documents owner scoped read" on storage.objects;
drop policy if exists "HRMS documents owner scoped insert" on storage.objects;
drop policy if exists "HRMS documents owner scoped update" on storage.objects;
drop policy if exists "HRMS documents owner scoped delete" on storage.objects;

create policy "HRMS documents owner scoped read" on storage.objects
for select
using (
  bucket_id = 'hrms-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "HRMS documents owner scoped insert" on storage.objects
for insert
with check (
  bucket_id = 'hrms-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "HRMS documents owner scoped update" on storage.objects
for update
using (
  bucket_id = 'hrms-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'hrms-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "HRMS documents owner scoped delete" on storage.objects
for delete
using (
  bucket_id = 'hrms-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
-- HRMS Phase D: Employee self-service login mapping and employee-scoped RLS.
-- Safe standalone migration. It does not modify accounting tables.

create table if not exists public.employee_user_mappings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null default 'default',
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text not null,
  employee_email text not null,
  status text not null default 'active',
  invited_at timestamptz not null default now(),
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_user_mappings_status_check check (status in ('active', 'invited', 'disabled')),
  constraint employee_user_mappings_business_not_blank check (length(trim(business_id)) > 0),
  constraint employee_user_mappings_employee_not_blank check (length(trim(employee_id)) > 0),
  unique (owner_user_id, business_id, user_id),
  unique (owner_user_id, business_id, employee_id)
);

alter table public.employee_user_mappings enable row level security;

create index if not exists employee_user_mappings_user_idx
  on public.employee_user_mappings (user_id, status);

create index if not exists employee_user_mappings_owner_employee_idx
  on public.employee_user_mappings (owner_user_id, business_id, employee_id, status);

create or replace function public.is_mapped_employee_record(
  p_owner_user_id uuid,
  p_business_id text,
  p_employee_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_user_mappings eum
    where eum.owner_user_id = p_owner_user_id
      and eum.business_id = coalesce(nullif(trim(p_business_id), ''), 'default')
      and eum.employee_id = p_employee_id
      and eum.user_id = auth.uid()
      and eum.status = 'active'
  )
$$;

create or replace function public.log_employee_self_service_event(
  p_owner_user_id uuid,
  p_business_id text,
  p_employee_id text,
  p_action text,
  p_module text,
  p_record_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id text := coalesce(nullif(trim(p_business_id), ''), 'default');
begin
  if auth.uid() is null then
    raise exception 'Login is required.' using errcode = '42501';
  end if;

  if not (
    auth.uid() = p_owner_user_id
    or public.is_mapped_employee_record(p_owner_user_id, v_business_id, p_employee_id)
  ) then
    raise exception 'Employee self-service audit event is not allowed.' using errcode = '42501';
  end if;

  insert into public.audit_logs (id, user_id, data, created_at, updated_at)
  values (
    'aud-' || replace(gen_random_uuid()::text, '-', ''),
    p_owner_user_id,
    jsonb_build_object(
      'action', p_action,
      'area', 'HRMS',
      'module', p_module,
      'recordId', p_record_id,
      'employeeId', p_employee_id,
      'businessId', v_business_id,
      'actorUid', auth.uid(),
      'metadata', coalesce(p_metadata, '{}'::jsonb),
      'createdAt', now()
    ),
    now(),
    now()
  );
end;
$$;

create or replace function public.audit_employee_leave_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id text := coalesce(NEW.data->>'employeeId', NEW.data->>'employee_id', '');
  v_business_id text := public.row_business_id(NEW.data);
begin
  if auth.uid() is not null and v_employee_id <> '' then
    insert into public.audit_logs (id, user_id, data, created_at, updated_at)
    values (
      'aud-' || replace(gen_random_uuid()::text, '-', ''),
      NEW.user_id,
      jsonb_build_object(
        'action', 'employee leave applied',
        'area', 'HRMS',
        'module', 'Employee Self Service',
        'recordId', NEW.id,
        'employeeId', v_employee_id,
        'businessId', v_business_id,
        'actorUid', auth.uid(),
        'newData', NEW.data,
        'createdAt', now()
      ),
      now(),
      now()
    );
  end if;

  return NEW;
end;
$$;

create or replace function public.link_employee_user_by_email(
  p_owner_user_id uuid,
  p_business_id text,
  p_employee_id text,
  p_employee_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id text := coalesce(nullif(trim(p_business_id), ''), 'default');
  v_employee_email text := lower(trim(p_employee_email));
  v_employee_user_id uuid;
  v_mapping public.employee_user_mappings%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_owner_user_id then
    raise exception 'Only the company owner can link employee users.' using errcode = '42501';
  end if;

  if not public.has_company_role(p_owner_user_id, v_business_id, array['owner']) then
    raise exception 'Only owner role can link employee users.' using errcode = '42501';
  end if;

  if p_employee_id is null or length(trim(p_employee_id)) = 0 then
    raise exception 'Employee id is required.' using errcode = '22023';
  end if;

  select u.id
  into v_employee_user_id
  from auth.users u
  where lower(u.email) = v_employee_email
  limit 1;

  if v_employee_user_id is null then
    raise exception 'Employee user must register with this email before linking.' using errcode = 'P0002';
  end if;

  if v_employee_user_id = p_owner_user_id then
    raise exception 'Owner user cannot be mapped as employee.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.employees e
    where e.user_id = p_owner_user_id
      and e.id = p_employee_id
      and public.row_business_id(e.data) = v_business_id
  ) then
    raise exception 'Employee record was not found for this company.' using errcode = 'P0002';
  end if;

  insert into public.employee_user_mappings (
    owner_user_id,
    business_id,
    user_id,
    employee_id,
    employee_email,
    status,
    linked_at
  )
  values (
    p_owner_user_id,
    v_business_id,
    v_employee_user_id,
    p_employee_id,
    v_employee_email,
    'active',
    now()
  )
  on conflict (owner_user_id, business_id, employee_id) do update
    set user_id = excluded.user_id,
        employee_email = excluded.employee_email,
        status = 'active',
        linked_at = now(),
        updated_at = now()
  returning * into v_mapping;

  insert into public.audit_logs (id, user_id, data, created_at, updated_at)
  values (
    'aud-' || replace(gen_random_uuid()::text, '-', ''),
    p_owner_user_id,
    jsonb_build_object(
      'action', 'employee user linked',
      'area', 'HRMS',
      'module', 'Employee Self Service',
      'employeeId', p_employee_id,
      'employeeEmail', v_employee_email,
      'businessId', v_business_id,
      'actorUid', auth.uid(),
      'createdAt', now()
    ),
    now(),
    now()
  );

  return jsonb_build_object(
    'id', v_mapping.id,
    'owner_user_id', v_mapping.owner_user_id,
    'business_id', v_mapping.business_id,
    'user_id', v_mapping.user_id,
    'employee_id', v_mapping.employee_id,
    'employee_email', v_mapping.employee_email,
    'status', v_mapping.status,
    'invited_at', v_mapping.invited_at,
    'linked_at', v_mapping.linked_at,
    'created_at', v_mapping.created_at,
    'updated_at', v_mapping.updated_at
  );
end;
$$;

drop policy if exists "Employee mappings owner read" on public.employee_user_mappings;
drop policy if exists "Employee mappings employee read own" on public.employee_user_mappings;
drop policy if exists "Employee mappings owner insert" on public.employee_user_mappings;
drop policy if exists "Employee mappings owner update" on public.employee_user_mappings;
drop policy if exists "Employee mappings owner delete" on public.employee_user_mappings;

create policy "Employee mappings owner read" on public.employee_user_mappings
for select
using (public.has_company_role(owner_user_id, business_id, array['owner']));

create policy "Employee mappings employee read own" on public.employee_user_mappings
for select
using (auth.uid() = user_id and status = 'active');

create policy "Employee mappings owner insert" on public.employee_user_mappings
for insert
with check (auth.uid() = owner_user_id and public.has_company_role(owner_user_id, business_id, array['owner']));

create policy "Employee mappings owner update" on public.employee_user_mappings
for update
using (auth.uid() = owner_user_id and public.has_company_role(owner_user_id, business_id, array['owner']))
with check (auth.uid() = owner_user_id and public.has_company_role(owner_user_id, business_id, array['owner']));

create policy "Employee mappings owner delete" on public.employee_user_mappings
for delete
using (auth.uid() = owner_user_id and public.has_company_role(owner_user_id, business_id, array['owner']));

drop policy if exists "employees select hrms scoped rows" on public.employees;
drop policy if exists "attendance select hrms scoped rows" on public.attendance;
drop policy if exists "leave_balances select hrms scoped rows" on public.leave_balances;
drop policy if exists "leave_requests select hrms scoped rows" on public.leave_requests;
drop policy if exists "leave_requests insert hrms scoped rows" on public.leave_requests;
drop policy if exists "salary_history select own company rows" on public.salary_history;
drop policy if exists "payslips select own company rows" on public.payslips;
drop policy if exists "employee_documents select own company rows" on public.employee_documents;

create policy "employees select hrms scoped rows" on public.employees
for select
using (
  public.can_select_company_row(user_id, public.row_business_id(data), 'employees')
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), id)
);

create policy "attendance select hrms scoped rows" on public.attendance
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "leave_balances select hrms scoped rows" on public.leave_balances
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "leave_requests select hrms scoped rows" on public.leave_requests
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "leave_requests insert hrms scoped rows" on public.leave_requests
for insert
with check (
  (
    auth.uid() = user_id
    and public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager'])
  )
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "salary_history select hrms scoped rows" on public.salary_history
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'accountant'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "payslips select hrms scoped rows" on public.payslips
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'accountant'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

create policy "employee_documents select hrms scoped rows" on public.employee_documents
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner'])
  or public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
);

drop trigger if exists audit_employee_leave_request_insert_trigger on public.leave_requests;
create trigger audit_employee_leave_request_insert_trigger
after insert on public.leave_requests
for each row execute function public.audit_employee_leave_request_insert();

drop policy if exists "HRMS documents owner scoped read" on storage.objects;
drop policy if exists "HRMS documents owner or mapped employee read" on storage.objects;

create policy "HRMS documents owner or mapped employee read" on storage.objects
for select
using (
  bucket_id = 'hrms-documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_mapped_employee_record(
      ((storage.foldername(name))[1])::uuid,
      (storage.foldername(name))[2],
      (storage.foldername(name))[3]
    )
  )
);

grant execute on function public.link_employee_user_by_email(uuid, text, text, text) to authenticated;
grant execute on function public.log_employee_self_service_event(uuid, text, text, text, text, text, jsonb) to authenticated;
-- HRMS Phase E: Leave Policy Configuration and Attendance Reports
-- Safe standalone migration.

create table if not exists public.leave_policies (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.leave_policies enable row level security;

-- Simple RLS matching the user's existing schema
create policy "Users manage own leave policies" on public.leave_policies
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "salary_history select hrms scoped rows" on public.salary_history;
create policy "salary_history select hrms scoped rows" on public.salary_history
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'accountant'])
  or (
    public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
    and coalesce(data->>'status', 'Draft') in ('Approved', 'Paid')
  )
);

drop policy if exists "payslips select hrms scoped rows" on public.payslips;
create policy "payslips select hrms scoped rows" on public.payslips
for select
using (
  public.has_company_role(user_id, public.row_business_id(data), array['owner', 'accountant'])
  or (
    public.is_mapped_employee_record(user_id, public.row_business_id(data), coalesce(data->>'employeeId', data->>'employee_id'))
    and coalesce(data->>'status', 'Draft') in ('Approved', 'Paid')
  )
);
-- Phase H: Employee Self-Edit Permissions
-- This table stores profile change requests made by employees for approval by Owner/Manager.

CREATE TABLE IF NOT EXISTS public.employee_profile_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    business_id TEXT DEFAULT 'default',
    company_id TEXT DEFAULT 'default',
    requested_by TEXT NOT NULL,
    changes JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.employee_profile_requests ENABLE ROW LEVEL SECURITY;

-- 1. Employees can select their own requests, OR Owner/Manager/Accountant can select all requests.
-- For simplicity, if auth.uid() = requested_by OR user role in owner/manager.
CREATE POLICY "Allow select on employee_profile_requests"
    ON public.employee_profile_requests
    FOR SELECT
    USING (
        auth.uid()::text = requested_by 
        OR 
        public.has_company_role(auth.uid(), business_id, array['owner', 'manager', 'accountant'])
    );

-- 2. Employees can insert requests for themselves.
CREATE POLICY "Allow insert on employee_profile_requests"
    ON public.employee_profile_requests
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = requested_by
    );

-- 3. Owner/Manager can update requests (to Approve/Reject).
CREATE POLICY "Allow update on employee_profile_requests"
    ON public.employee_profile_requests
    FOR UPDATE
    USING (
        public.has_company_role(auth.uid(), business_id, array['owner', 'manager'])
    );

-- Employees are strictly blocked from updating the main 'employees' table directly.
-- The existing RLS on 'employees' handles this (only Owner/Manager have full UPDATE).
-- Phase I: Employee Login System RPCs

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Employee Login RPC
CREATE OR REPLACE FUNCTION public.create_employee_login(
    p_email text,
    p_password text,
    p_employee_id text,
    p_business_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_user_id uuid;
    v_owner_user_id uuid := auth.uid();
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to create employee logins for this business.';
    END IF;

    -- Check if email already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists.';
    END IF;

    -- Check if mapping already exists and is active for this employee
    IF EXISTS (
        SELECT 1 FROM public.employee_user_mappings 
        WHERE employee_id = p_employee_id 
        AND business_id = p_business_id 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'This employee already has an active login mapped.';
    END IF;

    -- Insert into auth.users using pgcrypto for password hashing
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"force_password_change":true}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_new_user_id;

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        format('{"sub":"%s","email":"%s"}', v_new_user_id::text, p_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    -- Insert or update the employee_user_mappings
    INSERT INTO public.employee_user_mappings (
        owner_user_id,
        business_id,
        user_id,
        employee_id,
        employee_email,
        status,
        linked_at,
        created_at
    ) VALUES (
        v_owner_user_id,
        p_business_id,
        v_new_user_id,
        p_employee_id,
        p_email,
        'active',
        now(),
        now()
    )
    ON CONFLICT (owner_user_id, business_id, employee_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        employee_email = EXCLUDED.employee_email,
        status = 'active',
        linked_at = now();

    RETURN v_new_user_id;
END;
$$;


-- 2. Reset Employee Password RPC
CREATE OR REPLACE FUNCTION public.reset_employee_password(
    p_employee_id text,
    p_business_id text,
    p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_owner_user_id uuid := auth.uid();
    v_target_user_id uuid;
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to reset employee passwords for this business.';
    END IF;

    -- Find the mapped user
    SELECT user_id INTO v_target_user_id
    FROM public.employee_user_mappings
    WHERE employee_id = p_employee_id
      AND business_id = p_business_id
      AND status = 'active'
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'No active login mapping found for this employee.';
    END IF;

    -- Update auth.users password and set force_password_change
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"force_password_change":true}'::jsonb,
        updated_at = now()
    WHERE id = v_target_user_id;
END;
$$;


-- 3. Disable Employee Login RPC
CREATE OR REPLACE FUNCTION public.disable_employee_login(
    p_employee_id text,
    p_business_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_owner_user_id uuid := auth.uid();
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to manage employee logins for this business.';
    END IF;

    -- Update mapping status to 'disabled'
    UPDATE public.employee_user_mappings
    SET status = 'disabled'
    WHERE employee_id = p_employee_id
      AND business_id = p_business_id;

    -- We do not delete the auth.users record, we just disable the mapping.
    -- The RLS policies rely on status = 'active'.
END;
$$;


-- 4. Employee Change Password RPC
CREATE OR REPLACE FUNCTION public.employee_change_password(
    p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.';
    END IF;

    -- Update auth.users password and clear force_password_change
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        raw_user_meta_data = raw_user_meta_data - 'force_password_change',
        updated_at = now()
    WHERE id = v_user_id;
END;
$$;
