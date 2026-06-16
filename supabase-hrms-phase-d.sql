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
