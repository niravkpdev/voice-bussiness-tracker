import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import VoiceExpenseTrackerPreview from '../VoiceExpenseTrackerPreview';
import Phase2ERP from '../Phase2ERP';
import { computeTrialBalance } from '../accounting.js';

describe('Image Audit, Duplicate Removal & UI Upgrades', () => {
  beforeEach(() => {
    localStorage.setItem('voiceBusinessTrackerAuth', JSON.stringify({ uid: 'test-user', email: 'owner@example.com', role: 'Owner' }));
  });

  describe('computeTrialBalance double-entry verification', () => {
    it('correctly calculates balanced debits and credits across assets, liabilities, and income', () => {
      const mockLedgers = [
        { id: 'l-cash', name: 'Cash In Hand', group: 'Cash-in-hand', balanceType: 'debit', openingBalance: 1000 },
        { id: 'l-cap', name: 'Capital Account', group: 'Capital Account', balanceType: 'credit', openingBalance: 1000 },
        { id: 'l-sales', name: 'Sales Account', group: 'Sales Accounts', balanceType: 'credit', openingBalance: 0 },
        { id: 'l-cust', name: 'John Doe', group: 'Sundry Debtors', balanceType: 'debit', openingBalance: 0 },
      ];

      // A sale to John Doe of 500
      const mockVouchers = [
        {
          id: 'vch-1',
          type: 'Sales',
          amount: 500,
          date: '2026-05-10',
          lines: [
            { ledgerId: 'l-cust', debit: 500, credit: 0 },
            { ledgerId: 'l-sales', debit: 0, credit: 500 },
          ],
        },
      ];

      const result = computeTrialBalance(mockLedgers, mockVouchers);
      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(1500); // 1000 cash + 500 debtor
      expect(result.totalCredit).toBe(1500); // 1000 capital + 500 sales
      expect(result.rows).toHaveLength(4);
    });
  });

  describe('Unified Day Book Console', () => {
    it('renders the unified Day Book console with presets, search, metrics, and voucher table', () => {
      window.location.hash = '#day-book';
      render(<VoiceExpenseTrackerPreview />);

      // Verify Day Book & Voucher Register title
      expect(screen.getAllByText(/Day Book & Voucher Register/i).length).toBeGreaterThan(0);

      // Verify Quick Presets are rendered
      expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'This Week' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'This Month' })).toBeInTheDocument();

      // Verify KPI Metric cards exist
      expect(screen.getByText('Total Vouchers')).toBeInTheDocument();
      expect(screen.getByText(/Total Inflows \(Receipts\/Sales\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Outflows \(Payments\/Purchases\)/i)).toBeInTheDocument();
      expect(screen.getByText('Net Movement')).toBeInTheDocument();

      // Verify search input
      expect(screen.getByPlaceholderText(/Search party, narration, ID, amount/i)).toBeInTheDocument();
    });
  });

  describe('Accounting Ledgers & Trial Balance Suite', () => {
    it('renders the complete Trial Balance table with Dr/Cr totals and double-entry balance check', () => {
      window.location.hash = '#accounting-ledgers';
      render(<VoiceExpenseTrackerPreview />);

      // Verify title & subtitle
      expect(screen.getByText('Accounting Ledgers & Trial Balance')).toBeInTheDocument();
      expect(screen.getByText(/Double-Entry Accounting & Ledger Master/i)).toBeInTheDocument();

      // Verify KPI cards
      expect(screen.getByText('Total Ledgers')).toBeInTheDocument();
      expect(screen.getByText(/Total Debits \(Dr\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Credits \(Cr\)/i)).toBeInTheDocument();
      expect(screen.getByText('Balance Verification')).toBeInTheDocument();

      // Verify Trial Balance table header
      expect(screen.getByText('Ledger Particulars')).toBeInTheDocument();
      expect(screen.getByText('Group Head')).toBeInTheDocument();
      expect(screen.getAllByText('Debit (Dr)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Credit (Cr)').length).toBeGreaterThan(0);
      expect(screen.getByText('Closing Balance')).toBeInTheDocument();

      // Verify export & print buttons
      expect(screen.getByRole('button', { name: /Export Trial Balance CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Print Trial Balance/i })).toBeInTheDocument();
    });
  });

  describe('Company Setup & Financial Year Modernization', () => {
    it('renders company setup with business readiness checklist and financial year controls', () => {
      window.location.hash = '#company-setup';
      render(<VoiceExpenseTrackerPreview />);

      // Verify title
      expect(screen.getByText('Company Setup & Financial Year')).toBeInTheDocument();

      // Verify Readiness section
      expect(screen.getByText(/Business Setup & Accounting Readiness/i)).toBeInTheDocument();
      expect(screen.getByText(/Financial Year & Controls/i)).toBeInTheDocument();
      expect(screen.getByText('2026-2027')).toBeInTheDocument();

      // Verify Quick Action buttons
      expect(screen.getByRole('button', { name: /Edit Business Profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export System Backup/i })).toBeInTheDocument();
    });
  });

  describe('Multi-Business Workspaces Modernization (Phase2ERP)', () => {
    it('renders business workspaces with active workspace badge and styled cards', () => {
      render(
        <Phase2ERP
          activeTab="businesses"
          profile={{ name: 'Mega Corp', tagline: 'Headquarters' }}
          vouchers={[]}
          ledgers={[]}
          partySummary={{ customers: [], suppliers: [] }}
          cashBalance={10000}
          netProfit={5000}
          cloudCustomers={[]}
          cloudSuppliers={[]}
          cloudInventory={[]}
          cloudStockTransactions={[]}
          cloudInvoices={[]}
          cloudBusinesses={[
            { id: 'biz-retail', name: 'Downtown Retail Branch', type: 'Retail Store' },
          ]}
          onStatus={vi.fn()}
        />
      );

      // Verify title
      expect(screen.getByText('Business Workspaces & Branches')).toBeInTheDocument();

      // Verify active workspace badge is rendered
      expect(screen.getAllByText(/● Active Workspace/i).length).toBeGreaterThan(0);

      // Verify Add new business form
      expect(screen.getByText(/Add New Business \/ Branch/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Resin Art Studio \/ Trading Business/i)).toBeInTheDocument();
    });
  });
});
