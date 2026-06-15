-- Phase 1 next accounting fix: atomic payment edit/delete reversal.
-- Run this file in Supabase SQL Editor after supabase-phase1-payment-rpc.sql.

create or replace function public.edit_payment_with_ledger_reversal(
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
  v_old_payment jsonb;
  v_old_amount numeric := 0;
  v_new_amount numeric := 0;
  v_invoice_id text;
  v_business_id text;
  v_old_transaction_id text;
  v_new_transaction_id text;
  v_invoice_data jsonb;
  v_updated_invoice jsonb;
  v_existing_paid numeric := 0;
  v_invoice_total numeric := 0;
  v_recalculated_paid numeric := 0;
  v_new_balance numeric := 0;
  v_new_status text := 'Unpaid';
  v_payment_data jsonb;
  v_cancelled_ledger jsonb;
  v_replacement_ledger jsonb;
  v_audit_id text := 'aud-' || replace(gen_random_uuid()::text, '-', '');
  v_audit_data jsonb;
  v_ledger_type text := 'Receipt';
begin
  if v_uid is null then
    raise exception 'Authentication required for payment edit'
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

  select data
    into v_old_payment
    from public.payments
    where user_id = v_uid and id = v_payment_id
    for update;

  if not found then
    raise exception 'Existing payment not found'
      using errcode = '23503';
  end if;

  if coalesce(v_old_payment->>'deletedAt', '') <> '' then
    raise exception 'Deleted payment cannot be edited'
      using errcode = '22023';
  end if;

  if not (p_payment ? 'amount') or not ((p_payment->>'amount') ~ '^[0-9]+(\.[0-9]+)?$') then
    raise exception 'Payment amount must be a positive number'
      using errcode = '22023';
  end if;

  v_old_amount := case
    when coalesce(v_old_payment->>'amount', '0') ~ '^[0-9]+(\.[0-9]+)?$'
      then (v_old_payment->>'amount')::numeric
    else 0
  end;
  v_new_amount := (p_payment->>'amount')::numeric;
  if v_new_amount <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = '22023';
  end if;

  v_invoice_id := nullif(trim(coalesce(p_payment->>'invoiceId', v_old_payment->>'invoiceId', '')), '');
  v_business_id := nullif(trim(coalesce(p_payment->>'businessId', v_old_payment->>'businessId', p_ledger_posting->>'businessId', '')), '');
  if v_business_id is not null and v_business_id <> 'default' then
    if not exists (
      select 1 from public.businesses
      where user_id = v_uid and id = v_business_id
    ) then
      raise exception 'Business not found or not owned by current user'
        using errcode = '42501';
    end if;
  end if;

  v_old_transaction_id := nullif(trim(coalesce(v_old_payment->>'transactionId', '')), '');
  if v_old_transaction_id is null then
    v_old_transaction_id := 'txn-' || v_payment_id;
  end if;

  v_new_transaction_id := nullif(trim(coalesce(p_ledger_posting->>'id', p_payment->>'transactionId', '')), '');
  if v_new_transaction_id is null then
    v_new_transaction_id := v_old_transaction_id || '-edit-' || to_char(v_now, 'YYYYMMDDHH24MISSMS');
  end if;

  v_ledger_type := case
    when p_ledger_posting->>'type' in ('Receipt', 'Payment', 'Sales', 'Purchase', 'Expense', 'income', 'expense', 'inventory', 'customer_due', 'payment_received')
      then p_ledger_posting->>'type'
    else 'Receipt'
  end;

  if v_invoice_id is not null then
    select data
      into v_invoice_data
      from public.invoices
      where user_id = v_uid and id = v_invoice_id
      for update;

    if not found then
      raise exception 'Invoice not found for payment edit'
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
      else v_new_amount
    end;

    v_recalculated_paid := least(v_invoice_total, greatest(0, v_existing_paid - v_old_amount + v_new_amount));
    v_new_balance := greatest(0, v_invoice_total - v_recalculated_paid);
    v_new_status := case
      when v_new_balance = 0 then 'Paid'
      when v_recalculated_paid > 0 then 'Partial Paid'
      else 'Unpaid'
    end;

    v_updated_invoice := v_invoice_data
      || jsonb_build_object(
        'id', v_invoice_id,
        'paid', v_recalculated_paid,
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

  update public.transactions
    set data = data
      || jsonb_build_object(
        'amount', 0,
        'status', 'Cancelled',
        'cancelledAt', v_now,
        'cancelledBy', 'payment_edit',
        'replacementTransactionId', v_new_transaction_id,
        'updatedAt', v_now
      ),
      updated_at = v_now
    where user_id = v_uid and id = v_old_transaction_id
    returning data into v_cancelled_ledger;

  if v_cancelled_ledger is null then
    v_cancelled_ledger := jsonb_build_object(
      'id', v_old_transaction_id,
      'type', 'Receipt',
      'amount', 0,
      'date', current_date::text,
      'narration', 'Cancelled missing ledger posting during payment edit',
      'source', 'payment_reversal',
      'paymentId', v_payment_id,
      'invoiceId', v_invoice_id,
      'status', 'Cancelled',
      'cancelledAt', v_now,
      'updatedAt', v_now,
      'userId', v_uid::text,
      'ownerUid', v_uid::text
    );

    insert into public.transactions (id, user_id, data, updated_at)
    values (v_old_transaction_id, v_uid, v_cancelled_ledger, v_now);
  end if;

  v_payment_data := p_payment
    || jsonb_build_object(
      'id', v_payment_id,
      'amount', v_new_amount,
      'invoiceId', v_invoice_id,
      'transactionId', v_new_transaction_id,
      'previousTransactionId', v_old_transaction_id,
      'editedAt', v_now,
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'updatedAt', v_now
    );

  update public.payments
    set data = v_payment_data,
        updated_at = v_now
    where user_id = v_uid and id = v_payment_id;

  v_replacement_ledger := p_ledger_posting
    || jsonb_build_object(
      'id', v_new_transaction_id,
      'type', v_ledger_type,
      'amount', v_new_amount,
      'date', coalesce(nullif(p_ledger_posting->>'date', ''), nullif(p_payment->>'date', ''), current_date::text),
      'narration', coalesce(
        nullif(p_ledger_posting->>'narration', ''),
        'Edited payment posted for ' || coalesce(nullif(p_payment->>'invoiceNo', ''), v_payment_id)
      ),
      'source', 'payment_edit_posting',
      'paymentId', v_payment_id,
      'invoiceId', v_invoice_id,
      'invoiceNo', p_payment->>'invoiceNo',
      'reversesTransactionId', v_old_transaction_id,
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'updatedAt', v_now
    );

  insert into public.transactions (id, user_id, data, updated_at)
  values (v_new_transaction_id, v_uid, v_replacement_ledger, v_now)
  on conflict (user_id, id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at;

  v_audit_data := jsonb_build_object(
    'id', v_audit_id,
    'action', 'payment_edited_with_ledger_reversal',
    'area', 'Payments',
    'targetId', v_payment_id,
    'targetType', 'payment',
    'paymentId', v_payment_id,
    'oldAmount', v_old_amount,
    'newAmount', v_new_amount,
    'cancelledTransactionId', v_old_transaction_id,
    'replacementTransactionId', v_new_transaction_id,
    'invoiceId', v_invoice_id,
    'createdAt', v_now,
    'updatedAt', v_now,
    'userId', v_uid::text,
    'ownerUid', v_uid::text
  );

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (v_audit_id, v_uid, v_audit_data, v_now);

  return jsonb_build_object(
    'payment', v_payment_data,
    'cancelledLedgerPosting', v_cancelled_ledger,
    'ledgerPosting', v_replacement_ledger,
    'invoice', v_updated_invoice,
    'auditLogId', v_audit_id,
    'auditLog', v_audit_data
  );
end;
$$;

create or replace function public.delete_payment_with_ledger_reversal(
  p_payment_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_payment_id text := nullif(trim(coalesce(p_payment_id, '')), '');
  v_old_payment jsonb;
  v_old_amount numeric := 0;
  v_invoice_id text;
  v_business_id text;
  v_old_transaction_id text;
  v_invoice_data jsonb;
  v_updated_invoice jsonb;
  v_existing_paid numeric := 0;
  v_invoice_total numeric := 0;
  v_recalculated_paid numeric := 0;
  v_new_balance numeric := 0;
  v_new_status text := 'Unpaid';
  v_deleted_payment jsonb;
  v_cancelled_ledger jsonb;
  v_audit_id text := 'aud-' || replace(gen_random_uuid()::text, '-', '');
  v_audit_data jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required for payment delete'
      using errcode = '28000';
  end if;

  if v_payment_id is null then
    raise exception 'Payment id is required'
      using errcode = '23502';
  end if;

  select data
    into v_old_payment
    from public.payments
    where user_id = v_uid and id = v_payment_id
    for update;

  if not found then
    raise exception 'Existing payment not found'
      using errcode = '23503';
  end if;

  if coalesce(v_old_payment->>'deletedAt', '') <> '' then
    raise exception 'Payment is already deleted'
      using errcode = '22023';
  end if;

  v_old_amount := case
    when coalesce(v_old_payment->>'amount', '0') ~ '^[0-9]+(\.[0-9]+)?$'
      then (v_old_payment->>'amount')::numeric
    else 0
  end;

  if v_old_amount <= 0 then
    raise exception 'Stored payment amount is invalid'
      using errcode = '22023';
  end if;

  v_invoice_id := nullif(trim(coalesce(v_old_payment->>'invoiceId', '')), '');
  v_business_id := nullif(trim(coalesce(v_old_payment->>'businessId', '')), '');
  if v_business_id is not null and v_business_id <> 'default' then
    if not exists (
      select 1 from public.businesses
      where user_id = v_uid and id = v_business_id
    ) then
      raise exception 'Business not found or not owned by current user'
        using errcode = '42501';
    end if;
  end if;

  v_old_transaction_id := nullif(trim(coalesce(v_old_payment->>'transactionId', '')), '');
  if v_old_transaction_id is null then
    v_old_transaction_id := 'txn-' || v_payment_id;
  end if;

  if v_invoice_id is not null then
    select data
      into v_invoice_data
      from public.invoices
      where user_id = v_uid and id = v_invoice_id
      for update;

    if not found then
      raise exception 'Invoice not found for payment delete'
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
      else v_old_amount
    end;

    v_recalculated_paid := least(v_invoice_total, greatest(0, v_existing_paid - v_old_amount));
    v_new_balance := greatest(0, v_invoice_total - v_recalculated_paid);
    v_new_status := case
      when v_new_balance = 0 then 'Paid'
      when v_recalculated_paid > 0 then 'Partial Paid'
      else 'Unpaid'
    end;

    v_updated_invoice := v_invoice_data
      || jsonb_build_object(
        'id', v_invoice_id,
        'paid', v_recalculated_paid,
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

  update public.transactions
    set data = data
      || jsonb_build_object(
        'amount', 0,
        'status', 'Cancelled',
        'cancelledAt', v_now,
        'cancelledBy', 'payment_delete',
        'updatedAt', v_now
      ),
      updated_at = v_now
    where user_id = v_uid and id = v_old_transaction_id
    returning data into v_cancelled_ledger;

  if v_cancelled_ledger is null then
    v_cancelled_ledger := jsonb_build_object(
      'id', v_old_transaction_id,
      'type', 'Receipt',
      'amount', 0,
      'date', current_date::text,
      'narration', 'Cancelled missing ledger posting during payment delete',
      'source', 'payment_reversal',
      'paymentId', v_payment_id,
      'invoiceId', v_invoice_id,
      'status', 'Cancelled',
      'cancelledAt', v_now,
      'updatedAt', v_now,
      'userId', v_uid::text,
      'ownerUid', v_uid::text
    );

    insert into public.transactions (id, user_id, data, updated_at)
    values (v_old_transaction_id, v_uid, v_cancelled_ledger, v_now);
  end if;

  v_deleted_payment := v_old_payment
    || jsonb_build_object(
      'id', v_payment_id,
      'amount', v_old_amount,
      'status', 'Cancelled',
      'deletedAt', v_now,
      'transactionId', v_old_transaction_id,
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'updatedAt', v_now
    );

  update public.payments
    set data = v_deleted_payment,
        updated_at = v_now
    where user_id = v_uid and id = v_payment_id;

  v_audit_data := jsonb_build_object(
    'id', v_audit_id,
    'action', 'payment_deleted_with_ledger_reversal',
    'area', 'Payments',
    'targetId', v_payment_id,
    'targetType', 'payment',
    'paymentId', v_payment_id,
    'amount', v_old_amount,
    'cancelledTransactionId', v_old_transaction_id,
    'invoiceId', v_invoice_id,
    'createdAt', v_now,
    'updatedAt', v_now,
    'userId', v_uid::text,
    'ownerUid', v_uid::text
  );

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (v_audit_id, v_uid, v_audit_data, v_now);

  return jsonb_build_object(
    'payment', v_deleted_payment,
    'cancelledLedgerPosting', v_cancelled_ledger,
    'invoice', v_updated_invoice,
    'auditLogId', v_audit_id,
    'auditLog', v_audit_data
  );
end;
$$;

grant execute on function public.edit_payment_with_ledger_reversal(jsonb, jsonb) to authenticated;
grant execute on function public.delete_payment_with_ledger_reversal(text) to authenticated;
