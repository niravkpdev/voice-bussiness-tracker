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
