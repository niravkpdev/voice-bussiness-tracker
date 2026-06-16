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
