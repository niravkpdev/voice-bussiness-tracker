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
