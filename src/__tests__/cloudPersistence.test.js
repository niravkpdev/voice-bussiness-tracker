import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  currentUser: { id: 'user-owner-1', email: 'owner@example.com' },
  tables: new Map(),
  rpcCalls: [],
  denyNextWrite: false,
  denyNextDelete: false,
}));

function tableRows(tableName) {
  if (!mockState.tables.has(tableName)) {
    mockState.tables.set(tableName, new Map());
  }
  return mockState.tables.get(tableName);
}

function rowKey(userId, id) {
  return `${userId}:${id}`;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function rowToRecord(row) {
  return { ...clone(row.data), id: row.id, ownerUid: row.user_id };
}

function filterRows(tableName, filters) {
  return [...tableRows(tableName).values()].filter((row) =>
    filters.every((filter) => row[filter.column] === filter.value)
  );
}

function createQuery(tableName, mode) {
  const filters = [];
  const query = {
    eq(column, value) {
      filters.push({ column, value });
      return query;
    },
    order(column, options = {}) {
      const rows = filterRows(tableName, filters)
        .sort((left, right) => {
          const direction = options.ascending ? 1 : -1;
          return String(left[column] || '').localeCompare(String(right[column] || '')) * direction;
        });
      return Promise.resolve({ data: clone(rows), error: null });
    },
    single() {
      const row = filterRows(tableName, filters)[0] || null;
      return Promise.resolve({ data: clone(row), error: row ? null : { code: 'PGRST116', message: 'Row not found' } });
    },
    maybeSingle() {
      const row = filterRows(tableName, filters)[0] || null;
      return Promise.resolve({ data: clone(row), error: null });
    },
    then(resolve, reject) {
      if (mode !== 'delete') {
        return Promise.resolve({ data: clone(filterRows(tableName, filters)), error: null }).then(resolve, reject);
      }
      if (mockState.denyNextDelete) {
        mockState.denyNextDelete = false;
        return Promise.resolve({
          data: null,
          error: { code: '42501', message: 'new row violates row-level security policy' },
        }).then(resolve, reject);
      }
      const rows = filterRows(tableName, filters);
      rows.forEach((row) => tableRows(tableName).delete(rowKey(row.user_id, row.id)));
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    },
  };
  return query;
}

const fakeClient = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: mockState.currentUser }, error: null })),
  },
  from: vi.fn((tableName) => ({
    upsert: vi.fn(async (row) => {
      if (mockState.denyNextWrite) {
        mockState.denyNextWrite = false;
        return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
      }
      tableRows(tableName).set(rowKey(row.user_id, row.id), clone(row));
      return { data: null, error: null };
    }),
    select: vi.fn(() => createQuery(tableName, 'select')),
    delete: vi.fn(() => createQuery(tableName, 'delete')),
  })),
  rpc: vi.fn(async (name, params) => {
    mockState.rpcCalls.push({ name, params: clone(params) });
    if (mockState.denyNextWrite) {
      mockState.denyNextWrite = false;
      return { data: null, error: { code: '42501', message: 'permission denied for table' } };
    }

    if (name === 'post_payment_with_ledger') {
      const payment = { ...params.p_payment, transactionId: params.p_ledger_posting.id };
      const ledgerPosting = params.p_ledger_posting;
      tableRows('payments').set(rowKey(payment.userId, payment.id), {
        id: payment.id,
        user_id: payment.userId,
        data: payment,
        updated_at: new Date().toISOString(),
      });
      tableRows('transactions').set(rowKey(payment.userId, ledgerPosting.id), {
        id: ledgerPosting.id,
        user_id: payment.userId,
        data: ledgerPosting,
        updated_at: new Date().toISOString(),
      });
      return {
        data: {
          payment,
          ledgerPosting,
          auditLogId: `aud-${payment.id}`,
          auditLog: { id: `aud-${payment.id}`, action: 'payment_posted_with_ledger' },
        },
        error: null,
      };
    }

    if (name === 'edit_payment_with_ledger_reversal') {
      const payment = { ...params.p_payment, transactionId: params.p_ledger_posting.id };
      const cancelledLedgerPosting = {
        id: payment.previousTransactionId || `txn-${payment.id}`,
        status: 'Cancelled',
        amount: 0,
      };
      tableRows('payments').set(rowKey(payment.userId, payment.id), {
        id: payment.id,
        user_id: payment.userId,
        data: payment,
        updated_at: new Date().toISOString(),
      });
      tableRows('transactions').set(rowKey(payment.userId, params.p_ledger_posting.id), {
        id: params.p_ledger_posting.id,
        user_id: payment.userId,
        data: params.p_ledger_posting,
        updated_at: new Date().toISOString(),
      });
      return {
        data: {
          payment,
          cancelledLedgerPosting,
          ledgerPosting: params.p_ledger_posting,
          auditLogId: `aud-edit-${payment.id}`,
          auditLog: { id: `aud-edit-${payment.id}`, action: 'payment_edited_with_ledger_reversal' },
        },
        error: null,
      };
    }

    if (name === 'delete_payment_with_ledger_reversal') {
      const id = params.p_payment_id;
      const stored = tableRows('payments').get(rowKey(mockState.currentUser.id, id));
      const payment = {
        ...(stored?.data || { id, userId: mockState.currentUser.id }),
        status: 'Cancelled',
        deletedAt: new Date().toISOString(),
      };
      tableRows('payments').set(rowKey(mockState.currentUser.id, id), {
        id,
        user_id: mockState.currentUser.id,
        data: payment,
        updated_at: new Date().toISOString(),
      });
      return {
        data: {
          payment,
          cancelledLedgerPosting: { id: payment.transactionId || `txn-${id}`, status: 'Cancelled', amount: 0 },
          auditLogId: `aud-delete-${id}`,
          auditLog: { id: `aud-delete-${id}`, action: 'payment_deleted_with_ledger_reversal' },
        },
        error: null,
      };
    }

    return { data: null, error: { code: '42883', message: `function ${name} does not exist` } };
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => fakeClient),
}));

vi.stubEnv('VITE_SUPABASE_URL', 'https://unit-test-project.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', `ey${'a'.repeat(40)}.test.${'b'.repeat(40)}`);

const {
  deleteCloudRecord,
  deletePaymentWithLedgerReversal,
  editPaymentWithLedgerReversal,
  loadCloudCollection,
  postPaymentWithLedger,
  saveCloudRecord,
} = await import('../supabaseClient.js');

beforeEach(() => {
  mockState.currentUser = { id: 'user-owner-1', email: 'owner@example.com' };
  mockState.tables.clear();
  mockState.rpcCalls.length = 0;
  mockState.denyNextWrite = false;
  mockState.denyNextDelete = false;
});

const crudModules = [
  { table: 'customers', label: 'Customer', base: { id: 'cus-test-1', type: 'customer', name: 'Test Customer', phone: '+919999999999', businessId: 'default' }, edit: { name: 'Edited Customer' } },
  { table: 'suppliers', label: 'Supplier', base: { id: 'sup-test-1', type: 'supplier', name: 'Test Supplier', phone: '+918888888888', businessId: 'default' }, edit: { name: 'Edited Supplier' } },
  { table: 'inventory', label: 'Inventory item', base: { id: 'item-test-1', itemId: 'item-test-1', name: 'Test Item', currentStock: 10, businessId: 'default' }, edit: { currentStock: 14 } },
  {
    table: 'employees',
    label: 'Employee',
    base: {
      id: 'emp-test-1',
      employeeId: 'EMP-0001',
      employee_id: 'EMP-0001',
      fullName: 'Test Employee',
      full_name: 'Test Employee',
      name: 'Test Employee',
      mobileNumber: '+917777777777',
      mobile_number: '+917777777777',
      mobile: '+917777777777',
      email: 'employee@example.com',
      department: 'Operations',
      designation: 'Staff',
      role: 'Staff',
      joiningDate: '2026-06-15',
      joining_date: '2026-06-15',
      salary: 10000,
      shiftTiming: '10:00 AM - 7:00 PM',
      shift_timing: '10:00 AM - 7:00 PM',
      reportingManager: 'Owner',
      reporting_manager: 'Owner',
      status: 'Active',
      notes: 'Handles inventory support.',
      description: 'Handles inventory support.',
      businessId: 'default',
    },
    edit: { designation: 'Manager', role: 'Manager', status: 'Inactive', notes: 'Promoted to manager track.' },
  },
  { table: 'orders', label: 'Order', base: { id: 'ord-test-1', orderNo: 'ORD-TEST-1', customer: 'Test Customer', status: 'New Order', businessId: 'default' }, edit: { status: 'Delivered' } },
  { table: 'invoices', label: 'Invoice', base: { id: 'inv-test-1', invoiceNo: 'INV-TEST-1', customerId: 'cus-test-1', total: 500, status: 'Unpaid', businessId: 'default' }, edit: { status: 'Paid', paid: 500, balance: 0 } },
  { table: 'transactions', label: 'Voucher transaction', base: { id: 'txn-test-1', type: 'Receipt', amount: 500, narration: 'Test receipt', businessId: 'default' }, edit: { narration: 'Edited receipt' } },
];

describe('cloud persistence create/edit/delete/refresh flows', () => {
  it.each(crudModules)('$label persists create, edit, delete across reloads', async ({ table, base, edit }) => {
    await expect(saveCloudRecord(mockState.currentUser.id, table, base.id, base)).resolves.toBe(true);
    let rows = await loadCloudCollection(mockState.currentUser.id, table);
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining(base)]));

    const edited = { ...base, ...edit, updatedAt: '2026-06-15T00:00:00.000Z' };
    await expect(saveCloudRecord(mockState.currentUser.id, table, edited.id, edited)).resolves.toBe(true);
    rows = await loadCloudCollection(mockState.currentUser.id, table);
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining(edit)]));

    await expect(deleteCloudRecord(mockState.currentUser.id, table, base.id)).resolves.toBe(true);
    rows = await loadCloudCollection(mockState.currentUser.id, table);
    expect(rows.some((row) => row.id === base.id)).toBe(false);
  });

  it('surfaces permission/RLS failures without creating records', async () => {
    mockState.denyNextWrite = true;
    await expect(
      saveCloudRecord(mockState.currentUser.id, 'customers', 'cus-denied', { id: 'cus-denied', name: 'Denied' })
    ).rejects.toMatchObject({ code: '42501' });

    const rows = await loadCloudCollection(mockState.currentUser.id, 'customers');
    expect(rows).toHaveLength(0);
  });
});

describe('payment RPC accounting-critical flows', () => {
  it('posts, edits, and cancels payments through atomic RPC helpers', async () => {
    const payment = {
      id: 'pay-test-1',
      invoiceId: 'inv-test-1',
      invoiceNo: 'INV-TEST-1',
      amount: 500,
      date: '2026-06-15',
      userId: mockState.currentUser.id,
      businessId: 'default',
    };
    const ledgerPosting = {
      id: 'txn-pay-test-1',
      type: 'Receipt',
      amount: 500,
      date: payment.date,
      paymentId: payment.id,
      businessId: 'default',
    };

    await expect(postPaymentWithLedger(mockState.currentUser.id, payment, ledgerPosting))
      .resolves.toEqual(expect.objectContaining({ payment: expect.objectContaining({ id: payment.id }) }));
    expect(mockState.rpcCalls.at(-1).name).toBe('post_payment_with_ledger');

    let payments = await loadCloudCollection(mockState.currentUser.id, 'payments');
    expect(payments).toEqual(expect.arrayContaining([expect.objectContaining({ id: payment.id, amount: 500 })]));

    const editedPayment = { ...payment, amount: 700, previousTransactionId: ledgerPosting.id };
    const editedLedger = { ...ledgerPosting, id: 'txn-pay-test-1-edit', amount: 700 };
    await expect(editPaymentWithLedgerReversal(mockState.currentUser.id, editedPayment, editedLedger))
      .resolves.toEqual(expect.objectContaining({ ledgerPosting: expect.objectContaining({ amount: 700 }) }));
    expect(mockState.rpcCalls.at(-1).name).toBe('edit_payment_with_ledger_reversal');

    payments = await loadCloudCollection(mockState.currentUser.id, 'payments');
    expect(payments).toEqual(expect.arrayContaining([expect.objectContaining({ id: payment.id, amount: 700 })]));

    await expect(deletePaymentWithLedgerReversal(mockState.currentUser.id, payment.id))
      .resolves.toEqual(expect.objectContaining({ payment: expect.objectContaining({ status: 'Cancelled' }) }));
    expect(mockState.rpcCalls.at(-1).name).toBe('delete_payment_with_ledger_reversal');

    payments = await loadCloudCollection(mockState.currentUser.id, 'payments');
    expect(payments).toEqual(expect.arrayContaining([expect.objectContaining({ id: payment.id, status: 'Cancelled' })]));
  });
});
