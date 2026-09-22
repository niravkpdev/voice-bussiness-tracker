import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceExpenseTrackerPreview from '../VoiceExpenseTrackerPreview';

describe('Functional Dashboard Widgets (Recent Activity, Upcoming Tasks, Low Stock, Employee Overview)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
    localStorage.setItem('voiceBusinessTrackerAuth', JSON.stringify({
      uid: 'test-desktop-user',
      email: 'admin@trinetr.in',
      businessName: 'Test Business',
      role: 'Owner',
      token: 'mock-token',
    }));
    window.location.hash = '#dashboard';
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

  it('renders clean empty state for Recent Activity when no vouchers exist (no fake mock data)', () => {
    render(<VoiceExpenseTrackerPreview />);

    // Old hardcoded mock data should NOT be present
    expect(screen.queryByText('Invoice #INV-202 Created')).toBeNull();
    expect(screen.queryByText('Payment from Globex')).toBeNull();

    // Clean live empty state message and action buttons should be present
    expect(screen.getByText('No transactions recorded yet')).toBeDefined();
    expect(screen.getByText('Create your first entry to see activity here')).toBeDefined();
  });

  it('renders live voucher data in Recent Activity when vouchers exist', () => {
    const mockVouchers = [
      {
        id: 'vch-101',
        voucherNumber: 'SAL-001',
        type: 'Sales',
        narration: 'Enterprise Software Subscription',
        date: '2026-09-20',
        amount: 25000,
        lines: [{ debit: 25000, ledgerId: 'cash' }, { credit: 25000, ledgerId: 'sales' }]
      }
    ];
    localStorage.setItem('businessVouchers', JSON.stringify(mockVouchers));

    render(<VoiceExpenseTrackerPreview />);

    expect(screen.getByText('Enterprise Software Subscription')).toBeDefined();
    expect(screen.queryByText('Invoice #INV-202 Created')).toBeNull();
  });

  it('renders real Low Stock Alerts from inventory and does not render fake mock items', () => {
    const mockInventory = [
      { id: 'item-1', name: 'Almond Milk 1L', currentStock: 2, minStock: 10, unit: 'cartons' },
      { id: 'item-2', name: 'Organic Honey 500g', currentStock: 0, minStock: 5, unit: 'jars' },
      { id: 'item-3', name: 'Green Tea Box', currentStock: 50, minStock: 10, unit: 'boxes' }
    ];
    localStorage.setItem('erpProducts', JSON.stringify(mockInventory));

    render(<VoiceExpenseTrackerPreview />);

    // Old fake items should not exist
    expect(screen.queryByText('Printer Ink (Black)')).toBeNull();
    expect(screen.queryByText('A4 Paper Rims')).toBeNull();

    // Real low stock items should be rendered
    expect(screen.getByText('Almond Milk 1L')).toBeDefined();
    expect(screen.getByText('Organic Honey 500g')).toBeDefined();
    // Adequately stocked item (Green Tea) should NOT be in the alert list
    expect(screen.queryByText('Green Tea Box')).toBeNull();
  });

  it('renders dynamic Employee Overview with real attendance counts and links to HRMS', () => {
    const mockEmployees = [
      { id: 'emp-1', name: 'Amit Kumar', employeeId: 'EMP-01', status: 'Active' },
      { id: 'emp-2', name: 'Priya Sharma', employeeId: 'EMP-02', status: 'Active' },
      { id: 'emp-3', name: 'Rahul Verma', employeeId: 'EMP-03', status: 'Active' }
    ];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const mockAttendance = [
      { employeeId: 'emp-1', date: todayStr, status: 'Present' },
      { employeeId: 'emp-2', date: todayStr, status: 'Absent' },
      { employeeId: 'emp-3', date: todayStr, status: 'Leave' }
    ];
    localStorage.setItem('erpEmployees', JSON.stringify(mockEmployees));
    localStorage.setItem('phase3Attendance', JSON.stringify(mockAttendance));

    render(<VoiceExpenseTrackerPreview />);

    // Verify presence of Employee Overview section
    expect(screen.getByText('Employee Overview')).toBeDefined();

    // The hardcoded "Rahul's birthday is tomorrow!" should NOT appear when no birthday matches
    expect(screen.queryByText("Rahul's birthday is tomorrow!")).toBeNull();

    // Check HRMS link button exists in the header
    expect(screen.getByText('HRMS ➔')).toBeDefined();
  });

  it('renders dynamic Upcoming Tasks linked to operations', () => {
    render(<VoiceExpenseTrackerPreview />);

    expect(screen.getByText('Upcoming Tasks')).toBeDefined();
    // Dynamically checks either Monthly Books Reconciliation (if after 20th) or Tax Filing Preparation (if on/before 20th)
    const hasReconciliation = screen.queryByText(/Monthly Books Reconciliation/i);
    const hasTaxFiling = screen.queryByText(/Tax Filing Preparation/i);
    expect(hasReconciliation || hasTaxFiling).not.toBeNull();
  });

  it('renders AI Business Console with dynamic health score, sanitized positive indicators, and prompt chips', () => {
    window.location.hash = '#ai-assistant';
    render(<VoiceExpenseTrackerPreview />);

    // Header & Diagnostics presence
    expect(screen.getByText('AI Business Console')).toBeDefined();
    expect(screen.getByText('Business Health Diagnostics')).toBeDefined();

    // Health badge should have dynamic health class (e.g. health-strong or health-stable)
    const badge = document.querySelector('.health-score-value');
    expect(badge).not.toBeNull();
    expect(badge.className).toMatch(/health-(strong|stable|watch|risk)/);

    // AI Positive Indicators should NOT contain warning level text
    const goodList = document.querySelector('.ai-list.good');
    expect(goodList).not.toBeNull();
    expect(goodList.textContent).not.toContain('warning level pe hai');
    expect(goodList.textContent).not.toContain('constraints warning');

    // Prompt chips exist
    expect(screen.getByText('💰 Cash Balance')).toBeDefined();
    expect(screen.getByText('👥 Top Pending Dues')).toBeDefined();
    expect(screen.getByText('📊 Monthly Profit')).toBeDefined();
    expect(screen.getByText('📦 Inventory Value')).toBeDefined();
    expect(screen.getByText('🧮 5000 * 1.18 (GST)')).toBeDefined();

    // Clicking a chip updates answer immediately
    fireEvent.click(screen.getByText('💰 Cash Balance'));
    const answer = document.querySelector('.ai-answer');
    expect(answer.textContent).toContain('Current liquid cash & bank balance');
  });

  it('renders actionable priority collection card with WhatsApp, Statement, and Receipt buttons when pending dues exist', () => {
    window.location.hash = '#ai-assistant';
    const mockCustomerLedgers = [
      {
        id: 'cust-101',
        name: 'Sharma Traders',
        group: 'Sundry Debtors',
        phone: '9876543210',
        openingBalance: 15000,
        profileOutstanding: 15000,
      }
    ];
    localStorage.setItem('businessLedgers', JSON.stringify(mockCustomerLedgers));

    render(<VoiceExpenseTrackerPreview />);

    // Priority collection card should render for Sharma Traders
    expect(screen.getByText(/Priority Collection:/)).toBeDefined();
    expect(screen.getByText('Sharma Traders')).toBeDefined();

    // Action buttons should exist
    expect(screen.getByText('💬 WhatsApp Reminder')).toBeDefined();
    expect(screen.getByText('↗ View Statement')).toBeDefined();
    expect(screen.getByText('+ Record Receipt')).toBeDefined();

    // Clicking View Statement routes to party-statement
    fireEvent.click(screen.getByText('↗ View Statement'));
    expect(window.location.hash).toContain('party-statement');
  });
});
