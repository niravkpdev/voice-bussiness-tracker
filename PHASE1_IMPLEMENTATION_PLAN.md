# Phase 1 Implementation Plan

This plan is intentionally limited to Phase 1 stabilization. Do not start Phase 2 or Phase 3 until every Phase 1 checkpoint passes in production-like testing.

## Current Codebase Audit

### App Entry And Routing

- Entry point: `src/main.jsx`
- Main app shell and route switching: `src/VoiceExpenseTrackerPreview.jsx`
- ERP module: `src/Phase2ERP.jsx`
- Operations module: `src/Phase3Ops.jsx`
- Legal pages: `src/LegalPages.jsx`
- Styles: `src/styles.css`

Routing is hash-based inside `VoiceExpenseTrackerPreview.jsx`. There is no external router package.

### Supabase And Auth Flow

- Supabase client and CRUD helpers: `src/supabaseClient.js`
- Signup: `createSupabaseAccount()`
- Login: `signInSupabaseAccount()`
- Password recovery: `sendSupabasePasswordReset()`, `prepareSupabasePasswordRecoverySession()`, `updateCurrentUserPassword()`
- Shared cloud writes: `saveCloudRecord(uid, tableName, id, data)`
- Shared cloud deletes: `deleteCloudRecord(uid, tableName, id)`
- Shared cloud loads: `loadCloudCollection(uid, tableName)`

Production business data is intended to use Supabase only. `src/storageScope.js` blocks production reads/writes for non-global business keys, but development/local UI state still exists.

### Existing Supabase Tables

Defined in `supabase-schema.sql`:

- `transactions`
- `customers`
- `suppliers`
- `inventory`
- `stock_transactions`
- `invoices`
- `orders`
- `employees`
- `attendance`
- `payments`
- `audit_logs`
- `subscriptions`
- `security_settings`
- `devices`
- `offline_queue`
- `businesses`
- `notifications`
- `reports`
- `settings`
- `debug_tests`

Most business payloads are stored in `data jsonb`. This is acceptable for the current app, but Phase 1 should add RPC functions and stricter policies before more UI expansion.

### Current RLS

Current RLS pattern:

```sql
auth.uid() = user_id
```

This protects user ownership, but it is not role-aware. Roles currently exist mainly as frontend/user metadata, not enforceable database permissions.

### Existing Business Logic Hotspots

- Voucher save/delete: `src/VoiceExpenseTrackerPreview.jsx`
- Inventory/product/customer/supplier/invoice logic: `src/Phase2ERP.jsx`
- Orders/employees/attendance/payments/security/audit logs: `src/Phase3Ops.jsx`

Critical consistency risk:

- Invoice creation and inventory stock update are multiple frontend writes, not one database transaction.
- Payment posting does not yet guarantee linked invoice/ledger consistency.
- Audit logging exists mainly in Phase 3, but not consistently across all edit/delete/destructive actions.

### Test Setup

Current `package.json` has:

- `npm run build`
- `npm run smoke`
- `npm run security:audit`
- `npm run production:check`

There is no dedicated unit/integration/E2E test framework yet.

## Phase 1 Goals

Phase 1 is stabilization only:

1. Add Supabase RPC/database functions for:
   - Invoice creation
   - Stock movement
   - Payment posting
   - Ledger posting
2. Add role-aware RLS for:
   - Owner
   - Manager
   - Accountant
   - Staff
3. Verify and fix mobile layout at:
   - 360px
   - 390px
   - 414px
   - 768px
   - Android Chrome
4. Add automated tests for create/edit/delete/refresh persistence:
   - Transactions
   - Customers
   - Suppliers
   - Inventory
   - Employees
   - Orders
5. Add consistent loading skeletons and empty states.
6. Add audit log entries for edit/delete/destructive actions.

## Safe Implementation Sequence

### Commit 1: Add Test Foundation

Purpose: Add test tooling without changing app behavior.

Files likely changed:

- `package.json`
- `package-lock.json`
- `tests/`
- `playwright.config.*` or `vitest.config.*`

Recommended approach:

- Add Playwright for E2E browser persistence tests.
- Add a small test data helper that uses a dedicated test user/environment only.
- Keep tests opt-in first with scripts:
  - `test:e2e`
  - `test:mobile`
  - `test:production`

Validation:

- `npm run build`
- Existing app opens unchanged.

### Commit 2: Add Role Model Migration

Purpose: Add database-level role readiness without breaking current single-owner users.

Add SQL migration:

- `supabase-phase1-roles-rpc.sql`

Proposed new table:

```sql
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null default 'default',
  role text not null check (role in ('Owner', 'Manager', 'Accountant', 'Staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
```

Add helper functions:

```sql
public.current_user_role(target_business_id text default 'default')
public.can_manage_business_data(target_business_id text default 'default')
public.can_write_business_data(target_business_id text default 'default')
public.can_read_business_data(target_business_id text default 'default')
```

Temporary compatibility:

- If no role row exists, treat the authenticated user as `Owner` for their own rows.
- This avoids breaking current users.

Validation:

- Existing users can still read/write their rows.
- No cross-user access.

### Commit 3: Add RPC Functions For Atomic Business Writes

Purpose: Move critical multi-write business actions from frontend-only sequencing into Supabase transactions.

Add SQL functions:

- `public.post_ledger_entry(payload jsonb)`
- `public.create_invoice_with_stock(invoice_payload jsonb, stock_payload jsonb default '[]'::jsonb)`
- `public.post_stock_movement(stock_payload jsonb)`
- `public.post_payment(payment_payload jsonb)`

Rules:

- Functions must use `auth.uid()`.
- Functions must reject missing `user_id` or mismatched owner.
- Functions must insert audit log rows.
- Functions should return saved rows for frontend state updates.

Validation:

- RPC creates invoice and stock updates together.
- If one part fails, nothing is partially saved.

### Commit 4: Wire RPC Into Frontend Behind Existing UI

Purpose: Keep UI unchanged while replacing critical write paths.

Files likely changed:

- `src/supabaseClient.js`
- `src/Phase2ERP.jsx`
- `src/Phase3Ops.jsx`
- `src/VoiceExpenseTrackerPreview.jsx`

Add helpers:

- `createInvoiceWithStock()`
- `postStockMovement()`
- `postPayment()`
- `postLedgerEntry()`

Do not remove `saveCloudRecord()` yet. Use RPC only for critical flows first.

Validation:

- Invoice create/edit still works.
- Inventory changes persist.
- Payment posting persists.
- Dashboard/report values still load after refresh.

### Commit 5: Add Audit Logs For Edit/Delete/Destructive Actions

Purpose: Make business changes traceable.

Required audited actions:

- Voucher create/edit/delete
- Customer create/edit/delete
- Supplier create/edit/delete
- Inventory create/edit/delete/stock adjustment
- Invoice create/edit/delete
- Employee create/edit/delete
- Order create/edit/delete/status change
- Settings reset/restore/destructive actions

Implementation:

- Prefer database function audit for RPC-backed actions.
- Use `saveCloudRecord('audit_logs', ...)` for remaining frontend actions.
- Do not log sensitive tokens/passwords.

Validation:

- Audit log row appears after each destructive action.
- User only sees their own audit logs.

### Commit 6: Add Loading Skeletons And Empty States

Purpose: Improve UX without changing business logic.

Target areas:

- Dashboard
- Day Book
- Customers/Suppliers
- Inventory
- Employees
- Orders
- Reports
- Settings/Profile

Rules:

- No blank panels during load.
- Empty state must show a useful action.
- Error state must show a clear retry or setup instruction.

Validation:

- Fresh user sees helpful empty state, not broken UI.
- Slow Supabase load does not show stale/empty wrong data.

### Commit 7: Add Automated Persistence Tests

Purpose: Prevent regressions before launch.

Test flows:

- Transactions: create, edit, delete, refresh
- Customers: create, edit, delete, refresh
- Suppliers: create, edit, delete, refresh
- Inventory: create, edit, stock movement, delete, refresh
- Employees: create, edit, attendance, delete, refresh
- Orders: create, edit/status update, delete, refresh

Minimum acceptance:

- Record exists after refresh.
- Edited values are visible after refresh.
- Deleted values stay deleted after refresh.
- No other user can read records.

### Commit 8: Mobile QA Fix Pass

Purpose: Fix only confirmed mobile defects.

Widths:

- 360px
- 390px
- 414px
- 768px

Checks:

- First authenticated screen starts at top.
- Header visible.
- Bottom navigation does not create blank space.
- Sidebar drawer opens, scrolls, and closes.
- Forms do not overflow horizontally.
- Buttons are at least 44px tall.
- Inputs are readable in Android Chrome.

Validation:

- Capture screenshots for each width.
- No horizontal scroll.
- No hidden primary actions.

## Phase 1 Acceptance Checklist

Phase 1 is complete only when all are true:

- `npm run build` passes.
- `npm run security:audit` passes.
- New E2E persistence tests pass.
- Supabase SQL migration runs cleanly on a fresh project.
- Existing users can still load old JSON-backed data.
- Invoice + stock write is atomic.
- Payment posting is atomic.
- Audit logs exist for edit/delete/destructive actions.
- Role-aware RLS does not break current Owner access.
- Mobile screenshots are verified at 360, 390, 414, and 768px.

## Risks To Manage

- Existing production data is JSON-backed, so migrations must be additive and backward-compatible.
- Role-aware RLS can lock users out if introduced too aggressively.
- RPC functions can break current UI if response shape is not compatible with existing state.
- Multi-write operations must be migrated one flow at a time.
- Current CSS is override-heavy; mobile fixes should be targeted and screenshot-verified.

## Explicitly Not In Phase 1

- Real AI provider integration.
- Real speech-to-text server integration.
- Play Store packaging.
- Paid subscription/payment provider.
- Full normalized accounting redesign.
- Offline-first IndexedDB sync.
- Multi-business billing model.

These belong to Phase 2 or Phase 3 after Phase 1 is stable.

