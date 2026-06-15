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
