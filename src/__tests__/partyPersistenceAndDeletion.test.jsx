import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addPartyLedger,
  deletePartyLedger,
  DEFAULT_LEDGERS,
  ensureDefaultLedgers,
  readLedgers,
  getPartyLedgers,
  getLedgerStatement,
  computeLedgerBalance,
  LEDGERS_KEY,
  writeSavedArray,
} from '../accounting.js';

describe('Party (Customer / Supplier) Persistence & Deletion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('preserves previous customers when adding subsequent customers', () => {
    // Add first customer
    const firstResult = addPartyLedger('jay bhavani', 'customer');
    expect(firstResult.ledger.name).toBe('jay bhavani');
    expect(firstResult.ledger.group).toBe('Sundry Debtors');
    
    // Stored ledgers should contain jay bhavani
    let stored = readLedgers();
    expect(stored.some((l) => l.name === 'jay bhavani')).toBe(true);

    // Add second customer
    const secondResult = addPartyLedger('Ram Traders', 'customer', firstResult.ledgers);
    expect(secondResult.ledger.name).toBe('Ram Traders');

    // Verify BOTH customers exist in the returned ledgers list
    const partyNames = secondResult.ledgers.map((l) => l.name);
    expect(partyNames).toContain('jay bhavani');
    expect(partyNames).toContain('Ram Traders');

    // Verify stored ledgers contain both customers
    stored = readLedgers();
    const storedNames = stored.map((l) => l.name);
    expect(storedNames).toContain('jay bhavani');
    expect(storedNames).toContain('Ram Traders');
  });

  it('allows adding both customers and suppliers without overwriting each other', () => {
    const res1 = addPartyLedger('jay bhavani', 'customer');
    const res2 = addPartyLedger('Ram Traders', 'customer', res1.ledgers);
    const res3 = addPartyLedger('Gujarat Spices Wholesale', 'supplier', res2.ledgers);

    const parties = getPartyLedgers(res3.ledgers);
    const customerList = parties.filter((p) => p.group === 'Sundry Debtors');
    const supplierList = parties.filter((p) => p.group === 'Sundry Creditors');

    expect(customerList.map((c) => c.name)).toEqual(expect.arrayContaining(['jay bhavani', 'Ram Traders']));
    expect(supplierList.map((s) => s.name)).toEqual(expect.arrayContaining(['Gujarat Spices Wholesale']));
  });

  it('removes deleted party and excludes it from future listings', () => {
    const res1 = addPartyLedger('jay bhavani', 'customer');
    const res2 = addPartyLedger('Ram Traders', 'customer', res1.ledgers);
    const res3 = addPartyLedger('Apex Goods', 'supplier', res2.ledgers);

    // Delete 'jay bhavani'
    const afterDelete = deletePartyLedger(res1.ledger.id, res3.ledgers);

    // 'jay bhavani' should no longer be present
    expect(afterDelete.some((l) => l.id === res1.ledger.id)).toBe(false);
    expect(afterDelete.some((l) => l.name === 'jay bhavani')).toBe(false);

    // 'Ram Traders' and 'Apex Goods' must still be present
    expect(afterDelete.some((l) => l.name === 'Ram Traders')).toBe(true);
    expect(afterDelete.some((l) => l.name === 'Apex Goods')).toBe(true);

    // Verify localStorage was updated
    const saved = readLedgers();
    expect(saved.some((l) => l.name === 'jay bhavani')).toBe(false);
    expect(saved.some((l) => l.name === 'Ram Traders')).toBe(true);
  });

  it('never deletes system default accounts when deletePartyLedger is called', () => {
    const res1 = addPartyLedger('Test Customer', 'customer');
    
    // Attempt to delete a default ledger (e.g. 'ledger-cash')
    const afterDelete = deletePartyLedger('ledger-cash', res1.ledgers);
    expect(afterDelete.some((l) => l.id === 'ledger-cash')).toBe(true);
    expect(afterDelete.some((l) => l.name === 'Cash')).toBe(true);
    expect(afterDelete.some((l) => l.name === 'Sales')).toBe(true);
  });

  it('handles duplicate party names gracefully without creating duplicates', () => {
    const res1 = addPartyLedger('Unique Traders', 'customer');
    const res2 = addPartyLedger('unique traders', 'customer', res1.ledgers);

    const matches = res2.ledgers.filter((l) => l.name.toLowerCase() === 'unique traders');
    expect(matches).toHaveLength(1);
  });

  it('recognizes party in getLedgerStatement and computes statement ledger rows and closing balance', () => {
    const { ledgers, ledger: customer } = addPartyLedger('jay bhavani', 'customer');
    
    // Create vouchers for jay bhavani
    const vouchers = [
      {
        id: 'vch-1',
        date: '2026-09-15',
        dateTime: '2026-09-15 10:00:00',
        type: 'Sales',
        narration: 'Credit Sale to jay bhavani',
        partyId: customer.id,
        partyName: 'jay bhavani',
        lines: [
          { ledgerId: customer.id, debit: 5000, credit: 0 },
          { ledgerId: 'ledger-sales', debit: 0, credit: 5000 },
        ],
      },
      {
        id: 'vch-2',
        date: '2026-09-16',
        dateTime: '2026-09-16 14:00:00',
        type: 'Receipt',
        narration: 'Payment received from jay bhavani',
        partyId: customer.id,
        partyName: 'jay bhavani',
        lines: [
          { ledgerId: 'ledger-cash', debit: 2000, credit: 0 },
          { ledgerId: customer.id, debit: 0, credit: 2000 },
        ],
      },
    ];

    const statement = getLedgerStatement(customer.id, ledgers, vouchers);
    expect(statement.ledger).toBeDefined();
    expect(statement.ledger.name).toBe('jay bhavani');
    expect(statement.rows).toHaveLength(2);
    expect(statement.rows[0].debit).toBe(5000);
    expect(statement.rows[0].balance).toBe(5000);
    expect(statement.rows[1].credit).toBe(2000);
    expect(statement.rows[1].balance).toBe(3000);
    expect(statement.closingBalance).toBe(3000);
  });

  it('recognizes party vouchers matched via partyId or partyName even if line ledgerId differed', () => {
    const { ledgers, ledger: supplier } = addPartyLedger('Gujarat Spices', 'supplier');

    const vouchers = [
      {
        id: 'vch-sup-1',
        date: '2026-09-17',
        dateTime: '2026-09-17 11:00:00',
        type: 'Purchase',
        narration: 'Credit purchase from Gujarat Spices',
        partyId: supplier.id,
        partyName: 'Gujarat Spices',
        lines: [
          { ledgerId: 'ledger-purchase', debit: 4500, credit: 0 },
          { ledgerId: 'cloud-sup-diff-id', debit: 0, credit: 4500 },
        ],
      },
    ];

    const statement = getLedgerStatement(supplier.id, ledgers, vouchers);
    expect(statement.ledger).toBeDefined();
    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0].credit).toBe(4500);
    expect(statement.closingBalance).toBe(4500);
  });
});
