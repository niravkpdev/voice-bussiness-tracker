-- Phase 1 Risk 1: atomic invoice + inventory write.
-- Run this in Supabase SQL Editor after supabase-schema.sql.

create or replace function public.create_invoice_with_stock(
  p_invoice jsonb,
  p_inventory jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invoice_id text := nullif(trim(p_invoice->>'id'), '');
  v_now timestamptz := now();
  v_inventory_item jsonb;
  v_inventory_id text;
  v_saved_inventory jsonb := '[]'::jsonb;
  v_audit_id text := 'aud-' || replace(gen_random_uuid()::text, '-', '');
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_invoice) is distinct from 'object' then
    raise exception 'Invoice payload must be a JSON object' using errcode = '22023';
  end if;

  if v_invoice_id is null then
    raise exception 'Invoice id is required' using errcode = '22023';
  end if;

  if coalesce(p_invoice->>'userId', v_uid::text) <> v_uid::text then
    raise exception 'Invoice owner mismatch' using errcode = '42501';
  end if;

  if jsonb_typeof(p_inventory) is distinct from 'array' then
    raise exception 'Inventory payload must be a JSON array' using errcode = '22023';
  end if;

  insert into public.invoices (id, user_id, data, updated_at)
  values (
    v_invoice_id,
    v_uid,
    p_invoice
      || jsonb_build_object(
        'id', v_invoice_id,
        'invoiceId', v_invoice_id,
        'userId', v_uid::text,
        'ownerUid', v_uid::text,
        'updatedAt', v_now
      ),
    v_now
  )
  on conflict (user_id, id)
  do update set
    data = excluded.data,
    updated_at = excluded.updated_at;

  for v_inventory_item in
    select value from jsonb_array_elements(p_inventory)
  loop
    if jsonb_typeof(v_inventory_item) is distinct from 'object' then
      raise exception 'Each inventory item must be a JSON object' using errcode = '22023';
    end if;

    v_inventory_id := nullif(trim(coalesce(v_inventory_item->>'id', v_inventory_item->>'itemId')), '');
    if v_inventory_id is null then
      raise exception 'Inventory item id is required' using errcode = '22023';
    end if;

    if coalesce(v_inventory_item->>'userId', v_uid::text) <> v_uid::text then
      raise exception 'Inventory owner mismatch' using errcode = '42501';
    end if;

    insert into public.inventory (id, user_id, data, updated_at)
    values (
      v_inventory_id,
      v_uid,
      v_inventory_item
        || jsonb_build_object(
          'id', v_inventory_id,
          'itemId', v_inventory_id,
          'userId', v_uid::text,
          'ownerUid', v_uid::text,
          'updatedAt', v_now
        ),
      v_now
    )
    on conflict (user_id, id)
    do update set
      data = excluded.data,
      updated_at = excluded.updated_at;

    v_saved_inventory := v_saved_inventory || jsonb_build_array(
      v_inventory_item
        || jsonb_build_object(
          'id', v_inventory_id,
          'itemId', v_inventory_id,
          'userId', v_uid::text,
          'ownerUid', v_uid::text,
          'updatedAt', v_now
        )
    );
  end loop;

  insert into public.audit_logs (id, user_id, data, updated_at)
  values (
    v_audit_id,
    v_uid,
    jsonb_build_object(
      'id', v_audit_id,
      'userId', v_uid::text,
      'ownerUid', v_uid::text,
      'action', 'invoice_upsert_with_stock',
      'area', 'Invoices',
      'targetId', v_invoice_id,
      'targetType', 'invoice',
      'inventoryCount', jsonb_array_length(p_inventory),
      'createdAt', v_now,
      'updatedAt', v_now
    ),
    v_now
  );

  return jsonb_build_object(
    'invoice', p_invoice
      || jsonb_build_object(
        'id', v_invoice_id,
        'invoiceId', v_invoice_id,
        'userId', v_uid::text,
        'ownerUid', v_uid::text,
        'updatedAt', v_now
      ),
    'inventory', v_saved_inventory,
    'auditLogId', v_audit_id
  );
end;
$$;

grant execute on function public.create_invoice_with_stock(jsonb, jsonb) to authenticated;

