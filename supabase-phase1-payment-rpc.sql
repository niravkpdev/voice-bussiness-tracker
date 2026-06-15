-- Phase 1 Risk 2: Atomic payment + ledger posting.
-- Run this file in Supabase SQL Editor after supabase-schema.sql.

create or replace function public.post_payment_with_ledger(
  p_payment jsonb,
  p_ledger_posting jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_payment_id text;
  v_transaction_id text;
  v_invoice_id text;
  v_business_id text;
  v_amount numeric;
  v_invoice_data jsonb;
  v_updated_invoice jsonb;
  v_existing_paid numeric := 0;
  v_invoice_total numeric := 0;
  v_new_paid numeric := 0;
  v_new_balance numeric := 0;
  v_new_status text := 'Unpaid';
  v_payment_data jsonb;
  v_ledger_data jsonb;
  v_audit_id text := 'aud-' || replace(gen_random_uuid()::text, '-', '');
  v_audit_data jsonb;
  v_ledger_type text := 'Payment';
begin
  if v_uid is null then
    raise exception 'Authentication required for payment posting'
      using errcode = '28000';
  end if;

  if p_payment is null or jsonb_typeof(p_payment) <> 'object' then
    raise exception 'Payment payload must be a JSON object'
      using errcode = '22023';
  end if;

  v_payment_id := nullif(trim(coalesce(p_payment->>'id', '')), '');
  if v_payment_id is null then
    raise exception 'Payment id is required'
      using errcode = '23502';
  end if;

  if p_payment ? 'userId' and (p_payment->>'userId') <> v_uid::text then
    raise exception 'Payment userId does not match authenticated user'
      using errcode = '42501';
  end if;

  if p_payment ? 'ownerUid' and (p_payment->>'ownerUid') <> v_uid::text then
    raise exception 'Payment ownerUid does not match authenticated user'
      using errcode = '42501';
  end if;

  if not (p_payment ? 'amount') or not ((p_payment->>'amount') ~ '^[0-9]+(\.[0-9]+)?$') then
    raise exception 'Payment amount must be a positive number'
      using errcode = '22023';
  end if;

  v_amount := (p_payment->>'amount')::numeric;
  if v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = '22023';
  end if;

  v_business_id := nullif(trim(coalesce(p_payment->>'businessId', p_ledger_posting->>'businessId', '')), '');
  if v_business_id is not null and v_business_id <> 'default' then
    if not exists (
      select 1 from public.businesses
      where user_id = v_uid and id = v_business_id
    ) then
      raise exception 'Business not found or not owned by current user'
        using errcode = '42501';
    end if;
  end if;

  v_invoice_id := nullif(trim(coalesce(p_payment->>'invoiceId', p_payment->>'invoice_id', '')), '');
  v_transaction_id := nullif(trim(coalesce(p_ledger_posting->>'id', p_payment->>'transactionId', '')), '');
  if v_transaction_id is null then
    v_transaction_id := 'txn-' || v_payment_id;
  end if;

  v_ledger_type := case
    when p_ledger_posting->>'type' in ('Receipt', 'Payment', 'Sales', 'Purchase', 'Expense', 'income', 'expense', 'inventory', 'customer_due', 'payment_received')
      then p_ledger_posting->>'type'
    else 'Payment'
  end;

  v_payment_data := p_payment
    || jsonb_build_object(
      'id', v_payment_id,
      'amount', v_amount,
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'updatedAt', v_now
    );

  insert into public.payments (id, user_id, data, updated_at)
  values (v_payment_id, v_uid, v_payment_data, v_now)
  on conflict (user_id, id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at;

  if v_invoice_id is not null then
    select data
      into v_invoice_data
      from public.invoices
      where user_id = v_uid and id = v_invoice_id
      for update;

    if not found then
      raise exception 'Invoice not found for payment posting'
        using errcode = '23503';
    end if;

    v_existing_paid := case
      when coalesce(v_invoice_data->>'paid', '0') ~ '^[0-9]+(\.[0-9]+)?$'
        then (v_invoice_data->>'paid')::numeric
      else 0
    end;

    v_invoice_total := case
      when coalesce(v_invoice_data->>'total', '0') ~ '^[0-9]+(\.[0-9]+)?$'
        then (v_invoice_data->>'total')::numeric
      else v_amount
    end;

    v_new_paid := least(v_invoice_total, v_existing_paid + v_amount);
    v_new_balance := greatest(0, v_invoice_total - v_new_paid);
    v_new_status := case
      when v_new_balance = 0 then 'Paid'
      when v_new_paid > 0 then 'Partial Paid'
      else 'Unpaid'
    end;

    v_updated_invoice := v_invoice_data
      || jsonb_build_object(
        'id', v_invoice_id,
        'paid', v_new_paid,
        'balance', v_new_balance,
        'status', v_new_status,
        'updatedAt', v_now,
        'userId', v_uid::text,
        'ownerUid', v_uid::text
      );

    update public.invoices
      set data = v_updated_invoice,
          updated_at = v_now
      where user_id = v_uid and id = v_invoice_id;
  end if;

  v_ledger_data := p_ledger_posting
    || jsonb_build_object(
      'id', v_transaction_id,
      'type', v_ledger_type,
      'amount', v_amount,
      'date', coalesce(nullif(p_ledger_posting->>'date', ''), nullif(p_payment->>'date', ''), current_date::text),
      'narration', coalesce(
        nullif(p_ledger_posting->>'narration', ''),
        'Payment posted for ' || coalesce(nullif(p_payment->>'invoiceNo', ''), v_payment_id)
      ),
      'source', 'payment_posting',
      'paymentId', v_payment_id,
      'invoiceId', v_invoice_id,
      'invoiceNo', p_payment->>'invoiceNo',
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'updatedAt', v_now
    );

  insert into public.transactions (id, user_id, data, updated_at)
  values (v_transaction_id, v_uid, v_ledger_data, v_now)
  on conflict (user_id, id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at;

  v_audit_data := jsonb_build_object(
    'id', v_audit_id,
    'action', 'payment_posted_with_ledger',
    'area', 'Payments',
    'targetId', v_payment_id,
    'targetType', 'payment',
    'paymentId', v_payment_id,
    'transactionId', v_transaction_id,
    'invoiceId', v_invoice_id,
    'amount', v_amount,
    'createdAt', v_now,
    'updatedAt', v_now,
    'userId', v_uid::text,
    'ownerUid', v_uid::text
  );

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (v_audit_id, v_uid, v_audit_data, v_now);

  return jsonb_build_object(
    'payment', v_payment_data,
    'ledgerPosting', v_ledger_data,
    'invoice', v_updated_invoice,
    'auditLogId', v_audit_id,
    'auditLog', v_audit_data
  );
end;
$$;

grant execute on function public.post_payment_with_ledger(jsonb, jsonb) to authenticated;
