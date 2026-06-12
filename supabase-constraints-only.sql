-- Run this whole file in Supabase SQL Editor.
-- Do not select a single line such as "and length(...)" by itself.
-- These constraints are NOT VALID so existing old rows are not blocked,
-- but new/updated rows must keep a safer shape.

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
