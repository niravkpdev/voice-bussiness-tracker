# Supabase Free Tier Setup Guide

Use this guide to run Voice Business Tracker without Google Cloud billing.

## 1. Create A Supabase Project

1. Open [Supabase](https://supabase.com/).
2. Create a free account or sign in.
3. Click **New project**.
4. Choose an organization.
5. Project name: `voice-business-tracker`.
6. Enter a strong database password and save it safely.
7. Choose a region close to your users.
8. Click **Create new project**.

## 2. Get Supabase Environment Variables

In Supabase:

1. Go to **Project Settings > API**.
2. Copy:
   - **Project URL**
   - **anon public key**

In Vercel, add:

```txt
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_public_key
VITE_ENABLE_DEMO_AUTH=false
```

Do not add the Supabase **service_role** key to Vercel frontend env variables.

## 3. Enable Email Authentication

Supabase Auth is enabled by default.

To check:

1. Go to **Authentication > Providers**.
2. Make sure **Email** is enabled.
3. For beginner testing, you may disable **Confirm email** temporarily.
4. For production, enable email confirmation.

## 4. Create Tables And RLS Policies

1. Go to **SQL Editor**.
2. Open [supabase-schema.sql](./supabase-schema.sql).
3. Paste the whole file into SQL Editor.
4. Click **Run**.

This creates:

```txt
transactions
customers
suppliers
inventory
stock_transactions
invoices
orders
employees
attendance
payments
audit_logs
subscriptions
security_settings
devices
offline_queue
reports
settings
debug_tests
```

Every business table has:

```txt
user_id uuid not null
```

Row Level Security is enabled on every table.

## 5. Why This Is Secure

The frontend uses the Supabase anon key. This key is safe to expose only because RLS is enabled.

Every policy uses:

```sql
auth.uid() = user_id
```

This means:

- A user can read only their own rows.
- A user can insert only rows with their own `user_id`.
- A user can update/delete only their own rows.
- Changing frontend code in DevTools does not bypass the database policy.

Never expose the Supabase service role key in the browser.

## 6. Redeploy Vercel

1. Open Vercel project.
2. Go to **Settings > Environment Variables**.
3. Remove any old backend values that do not belong to this Supabase setup.
4. Add the Supabase values.
5. Redeploy.
6. Hard refresh the browser or open the app in incognito.

## 7. Test The Debug Button

1. Register or login.
2. Open **Database Test** from the sidebar.
3. Click **Run Database Test**.
4. Open the browser console.
5. You should see:

```txt
DEBUG_SUPABASE_TEST_START
DEBUG_SUPABASE_TEST_SUCCESS
```

The debug test writes directly to Supabase and verifies the row can be read back.

## 8. Confirm In Supabase

After debug success:

1. Go to **Table Editor**.
2. Open `debug_tests`.
3. You should see a row:

```txt
id: test
user_id: your logged-in user id
message: hello supabase
```

After adding a customer:

```txt
customers
```

After adding a transaction or voice voucher:

```txt
transactions
```

After adding inventory:

```txt
inventory
```

After adding an order or employee:

```txt
orders
employees
attendance
```

## 9. App Data Mapping

The app keeps the same logical structure:

```txt
users/{uid}/transactions/{transactionId} -> transactions table
users/{uid}/customers/{customerId} -> customers table
users/{uid}/suppliers/{supplierId} -> suppliers table
users/{uid}/inventory/{itemId} -> inventory table
users/{uid}/stock_transactions/{stockTransactionId} -> stock_transactions table
users/{uid}/invoices/{invoiceId} -> invoices table
users/{uid}/orders/{orderId} -> orders table
users/{uid}/employees/{employeeId} -> employees table
users/{uid}/attendance/{attendanceId} -> attendance table
users/{uid}/payments/{paymentId} -> payments table
users/{uid}/audit_logs/{auditLogId} -> audit_logs table
users/{uid}/settings/profile -> settings table, id = profile
users/{uid}/debug/test -> debug_tests table, id = test
```

Dashboard and Day Book both read from the `transactions` table filtered by `user_id`.

## 10. Common Errors

### Permission denied / RLS violation

Run `supabase-schema.sql` and confirm RLS policies exist.

### No rows appear after save

Check browser console for:

```txt
SUPABASE_WRITE_START
SUPABASE_WRITE_SUCCESS
SUPABASE_WRITE_ERROR
```

Also confirm:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Email login does not work

Check **Authentication > Providers > Email** and whether email confirmation is required.

### App still says old backend bundle

Redeploy Vercel and hard refresh. Old cached JavaScript can keep running until the browser refreshes.

