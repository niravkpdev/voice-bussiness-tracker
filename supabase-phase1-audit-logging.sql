-- Phase 1 Risk 4: Full append-only audit logging.
-- Safe to rerun. Run after supabase-schema.sql and supabase-phase1-member-management.sql.

create index if not exists audit_logs_user_updated_idx
  on public.audit_logs (user_id, updated_at desc);

create or replace function public.row_business_id(p_data jsonb)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p_data->>'businessId'), ''), 'default')
$$;

create or replace function public.audit_redact_json(p_data jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when p_data is null then null
    else p_data
      - 'password'
      - 'newPassword'
      - 'confirmPassword'
      - 'token'
      - 'access_token'
      - 'refresh_token'
      - 'jwt'
      - 'secret'
      - 'anonKey'
      - 'serviceRoleKey'
      - 'apiKey'
  end
$$;

create or replace function public.audit_row_business_id(p_table_name text, p_record_id text, p_data jsonb)
returns text
language sql
immutable
as $$
  select case
    when p_table_name = 'businesses' then coalesce(nullif(trim(p_record_id), ''), 'default')
    else coalesce(nullif(trim(p_data->>'businessId'), ''), 'default')
  end
$$;

create or replace function public.audit_log_id()
returns text
language sql
volatile
as $$
  select 'aud-' || replace(gen_random_uuid()::text, '-', '')
$$;

create or replace function public.audit_json_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_owner uuid;
  v_record_id text;
  v_business_id text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_audit_data jsonb;
begin
  if tg_table_name = 'audit_logs' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_action := 'create';
    v_owner := new.user_id;
    v_record_id := new.id;
    v_old_data := null;
    v_new_data := public.audit_redact_json(new.data);
  elsif tg_op = 'UPDATE' then
    if old.data is not distinct from new.data then
      return new;
    end if;
    v_action := 'edit';
    v_owner := new.user_id;
    v_record_id := new.id;
    v_old_data := public.audit_redact_json(old.data);
    v_new_data := public.audit_redact_json(new.data);
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_owner := old.user_id;
    v_record_id := old.id;
    v_old_data := public.audit_redact_json(old.data);
    v_new_data := null;
  else
    return coalesce(new, old);
  end if;

  v_business_id := public.audit_row_business_id(
    tg_table_name,
    v_record_id,
    coalesce(v_new_data, v_old_data, '{}'::jsonb)
  );

  v_audit_data := jsonb_build_object(
    'id', public.audit_log_id(),
    'action', v_action,
    'actionType', v_action,
    'area', tg_table_name,
    'module', tg_table_name,
    'tableName', tg_table_name,
    'recordId', v_record_id,
    'targetId', v_record_id,
    'targetType', tg_table_name,
    'businessId', v_business_id,
    'actorUid', coalesce(v_actor::text, 'system'),
    'ownerUid', v_owner::text,
    'oldData', v_old_data,
    'newData', v_new_data,
    'createdAt', now(),
    'updatedAt', now(),
    'occurredAt', now(),
    'source', 'db_trigger'
  );

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (v_audit_data->>'id', v_owner, v_audit_data, now());

  return coalesce(new, old);
end;
$$;

create or replace function public.audit_company_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_owner uuid;
  v_member_id text;
  v_business_id text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_audit_data jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_owner := new.owner_user_id;
    v_member_id := new.id::text;
    v_business_id := new.business_id;
    v_old_data := null;
    v_new_data := public.audit_redact_json(to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_action := 'edit';
    v_owner := new.owner_user_id;
    v_member_id := new.id::text;
    v_business_id := new.business_id;
    v_old_data := public.audit_redact_json(to_jsonb(old));
    v_new_data := public.audit_redact_json(to_jsonb(new));
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_owner := old.owner_user_id;
    v_member_id := old.id::text;
    v_business_id := old.business_id;
    v_old_data := public.audit_redact_json(to_jsonb(old));
    v_new_data := null;
  else
    return coalesce(new, old);
  end if;

  v_audit_data := jsonb_build_object(
    'id', public.audit_log_id(),
    'action', v_action,
    'actionType', v_action,
    'area', 'company_members',
    'module', 'company_members',
    'tableName', 'company_members',
    'recordId', v_member_id,
    'targetId', v_member_id,
    'targetType', 'company_member',
    'businessId', v_business_id,
    'actorUid', coalesce(v_actor::text, 'system'),
    'ownerUid', v_owner::text,
    'oldData', v_old_data,
    'newData', v_new_data,
    'createdAt', now(),
    'updatedAt', now(),
    'occurredAt', now(),
    'source', 'db_trigger'
  );

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (v_audit_data->>'id', v_owner, v_audit_data, now());

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_transactions_changes on public.transactions;
create trigger audit_transactions_changes
after insert or update or delete on public.transactions
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_customers_changes on public.customers;
create trigger audit_customers_changes
after insert or update or delete on public.customers
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_suppliers_changes on public.suppliers;
create trigger audit_suppliers_changes
after insert or update or delete on public.suppliers
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_inventory_changes on public.inventory;
create trigger audit_inventory_changes
after insert or update or delete on public.inventory
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_stock_transactions_changes on public.stock_transactions;
create trigger audit_stock_transactions_changes
after insert or update or delete on public.stock_transactions
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_invoices_changes on public.invoices;
create trigger audit_invoices_changes
after insert or update or delete on public.invoices
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_payments_changes on public.payments;
create trigger audit_payments_changes
after insert or update or delete on public.payments
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_orders_changes on public.orders;
create trigger audit_orders_changes
after insert or update or delete on public.orders
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_employees_changes on public.employees;
create trigger audit_employees_changes
after insert or update or delete on public.employees
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_attendance_changes on public.attendance;
create trigger audit_attendance_changes
after insert or update or delete on public.attendance
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_businesses_changes on public.businesses;
create trigger audit_businesses_changes
after insert or update or delete on public.businesses
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_settings_changes on public.settings;
create trigger audit_settings_changes
after insert or update or delete on public.settings
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_notifications_changes on public.notifications;
create trigger audit_notifications_changes
after insert or update or delete on public.notifications
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_security_settings_changes on public.security_settings;
create trigger audit_security_settings_changes
after insert or update or delete on public.security_settings
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_subscriptions_changes on public.subscriptions;
create trigger audit_subscriptions_changes
after insert or update or delete on public.subscriptions
for each row execute function public.audit_json_table_change();

drop trigger if exists audit_company_members_changes on public.company_members;
create trigger audit_company_members_changes
after insert or update or delete on public.company_members
for each row execute function public.audit_company_member_change();

drop policy if exists "Users manage own audit logs" on public.audit_logs;
drop policy if exists "Role select audit logs" on public.audit_logs;
drop policy if exists "Role insert audit logs" on public.audit_logs;
drop policy if exists "Role update audit logs" on public.audit_logs;
drop policy if exists "Role delete audit logs" on public.audit_logs;
drop policy if exists "Audit logs read by accounting roles" on public.audit_logs;
drop policy if exists "Audit logs append by accounting roles" on public.audit_logs;

create policy "Audit logs read by accounting roles" on public.audit_logs
for select
using (public.can_select_company_row(user_id, public.row_business_id(data), 'audit_logs'));

-- Append-only compatibility for existing RPC/manual audit inserts.
-- No update/delete policy is created, so frontend users cannot edit/delete logs.
create policy "Audit logs append by accounting roles" on public.audit_logs
for insert
with check (public.has_company_role(user_id, public.row_business_id(data), array['owner', 'manager', 'accountant']));

revoke update, delete on public.audit_logs from authenticated;
grant select, insert on public.audit_logs to authenticated;
grant execute on function public.audit_redact_json(jsonb) to authenticated;
