import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getPartySummary, computeLedgerBalance } from '../accounting.js';
import VoiceExpenseTrackerPreview, { navigationConfig } from '../VoiceExpenseTrackerPreview.jsx';

describe('Party Outstanding Balance Sync & Navigation Cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
    localStorage.setItem(
      'voiceBusinessTrackerAuth',
      JSON.stringify({
        uid: 'test-desktop-user',
        email: 'admin@trinetr.in',
        businessName: 'Test Business',
        role: 'Owner',
        token: 'mock-token',
      })
    );
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('computes party summary for customers with profile outstanding balance (like NIRAVKUMAR KANTILAL PRAJAPATI)', () => {
    const ledgers = [
      {
        id: 'cus-mu-prajapati',
        name: 'NIRAVKUMAR KANTILAL PRAJAPATI',
        group: 'Sundry Debtors',
        balanceType: 'debit',
        openingBalance: 300,
        profileOutstanding: 300,
      },
    ];
    const vouchers = [];
    const invoices = [];

    const summary = getPartySummary(ledgers, vouchers, invoices);
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('NIRAVKUMAR KANTILAL PRAJAPATI');
    expect(summary[0].totalSales).toBe(300);
    expect(summary[0].totalPayments).toBe(0);
    expect(summary[0].outstandingAmount).toBe(300);
  });

  it('computes party summary including unpaid customer invoices', () => {
    const ledgers = [
      {
        id: 'cus-1',
        name: 'Shreeji Traders',
        group: 'Sundry Debtors',
        balanceType: 'debit',
        openingBalance: 0,
      },
    ];
    const vouchers = [];
    const invoices = [
      {
        id: 'inv-1',
        customerId: 'cus-1',
        customerName: 'Shreeji Traders',
        total: 1200,
        paid: 400,
        balance: 800,
        status: 'Partial Paid',
        date: '2026-09-15',
      },
    ];

    const summary = getPartySummary(ledgers, vouchers, invoices);
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('Shreeji Traders');
    expect(summary[0].totalSales).toBe(1200);
    expect(summary[0].totalPayments).toBe(400);
    expect(summary[0].outstandingAmount).toBe(800);
    expect(summary[0].lastTransactionDate).toBe('2026-09-15');
  });

  it('computes party summary for suppliers with profile payable amount', () => {
    const ledgers = [
      {
        id: 'sup-1',
        name: 'Gujarat Spices Wholesale',
        group: 'Sundry Creditors',
        balanceType: 'credit',
        openingBalance: 500,
        profileOutstanding: 500,
      },
    ];
    const vouchers = [];

    const summary = getPartySummary(ledgers, vouchers);
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('Gujarat Spices Wholesale');
    expect(summary[0].outstandingAmount).toBe(500);
  });

  it('verifies computeLedgerBalance correctly adds positive credit opening balance for Sundry Creditors', () => {
    const ledgers = [
      {
        id: 'sup-bal-test',
        name: 'Supplier Test',
        group: 'Sundry Creditors',
        balanceType: 'credit',
        openingBalance: 750,
      },
    ];
    const vouchers = [];
    const balance = computeLedgerBalance('sup-bal-test', ledgers, vouchers);
    expect(balance).toBe(750);
  });

  it('verifies duplicate sections are removed from navigationConfig', () => {
    const reportsGroup = navigationConfig.find((group) => group.id === 'reports-menu');
    const processGroup = navigationConfig.find((group) => group.id === 'process-menu');
    const productionGroup = navigationConfig.find((group) => group.id === 'production-menu');

    // reports-hub and vouchers-hub removed from 2. Reports
    expect(reportsGroup.children.some((c) => c.tab === 'reports-hub')).toBe(false);
    expect(reportsGroup.children.some((c) => c.tab === 'vouchers-hub')).toBe(false);

    // masters removed from 4. Process
    expect(processGroup.children.some((c) => c.tab === 'masters')).toBe(false);

    // production-stock removed from 5. Production
    expect(productionGroup.children.some((c) => c.id === 'production-stock')).toBe(false);
    expect(productionGroup.children).toHaveLength(1);
    expect(productionGroup.children[0].tab).toBe('production');
  });

  it('renders customer with outstanding balance in Business Reports Console Customer Outstanding table', async () => {
    const mockCustomers = [
      {
        id: 'cus-mu-test',
        name: 'NIRAVKUMAR KANTILAL PRAJAPATI',
        outstandingAmount: 300,
        phone: '9876543210',
      },
    ];

    // Seed mock customer into localStorage so preview picks it up
    localStorage.setItem('erpCustomers', JSON.stringify(mockCustomers));

    window.location.hash = '#reports';

    render(<VoiceExpenseTrackerPreview />);

    // Switch to Customer Outstanding report tab
    const customerReportBtn = screen.getByRole('button', { name: /Customer Outstanding/i });
    fireEvent.click(customerReportBtn);

    // Table header and customer row should be visible with ₹300
    expect(screen.getByText('Customer Outstanding Receivables')).toBeInTheDocument();
    expect(screen.getAllByText('NIRAVKUMAR KANTILAL PRAJAPATI').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹300/i).length).toBeGreaterThan(0);

    // Should NOT show the settled empty state
    expect(
      screen.queryByText(/All customer accounts are settled! There are currently no outstanding receivables/i)
    ).not.toBeInTheDocument();
  });

  it('correctly calculates outstanding amount 200 and total sales 500 when openingBalance is 500 and profileOutstanding is 200', () => {
    const ledgers = [
      {
        id: 'cus-nirav-500-200',
        name: 'NIRAVKUMAR KANTILAL PRAJAPATI',
        group: 'Sundry Debtors',
        balanceType: 'debit',
        openingBalance: 500,
        profileOutstanding: 200,
      },
    ];
    const vouchers = [];
    const invoices = [];

    const summary = getPartySummary(ledgers, vouchers, invoices);
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('NIRAVKUMAR KANTILAL PRAJAPATI');
    expect(summary[0].totalSales).toBe(500);
    expect(summary[0].totalPayments).toBe(0);
    expect(summary[0].outstandingAmount).toBe(200);
  });

  it('renders customer with outstanding balance on the main Dashboard section', async () => {
    const mockCustomers = [
      {
        id: 'cus-nirav-dash',
        name: 'NIRAVKUMAR KANTILAL PRAJAPATI',
        openingBalance: 500,
        outstandingAmount: 200,
        phone: '+918488943771',
      },
    ];

    localStorage.setItem('erpCustomers', JSON.stringify(mockCustomers));
    window.location.hash = '#dashboard';

    render(<VoiceExpenseTrackerPreview />);

    // Dashboard Outstanding card should display ₹200 and '1 Pending'
    expect(screen.getAllByText(/₹200/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 Pending/i).length).toBeGreaterThan(0);
  });
});
