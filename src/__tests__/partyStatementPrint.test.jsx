import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setStorageScope } from '../storageScope.js';
import { writeSavedArray, LEDGERS_KEY, DEFAULT_LEDGERS } from '../accounting.js';
import VoiceExpenseTrackerPreview from '../VoiceExpenseTrackerPreview.jsx';

describe('Customer Entry & Party Statement Printing', () => {
  let mockWindowOpen;
  let mockDoc;

  beforeEach(() => {
    localStorage.clear();
    setStorageScope('test-desktop-user');
    window.innerWidth = 1280;
    window.location.hash = '#party-statement';

    localStorage.setItem(
      'voiceBusinessTrackerAuth',
      JSON.stringify({
        uid: 'test-desktop-user',
        email: 'admin@trinetr.in',
        businessName: 'Trinetr Namkeen Mart',
        role: 'Owner',
        token: 'mock-token',
        emailVerified: true,
      })
    );

    // Provide a sample customer with balance
    const sampleCustomer = {
      id: 'cus-101',
      name: 'NIRAVKUMAR PRAJAPATI',
      group: 'Sundry Debtors',
      balanceType: 'debit',
      openingBalance: 500,
      phone: '9898989898',
      gst: '24ABCDE1234F1Z5',
      createdAt: '2026-09-01T10:00:00.000Z',
    };
    writeSavedArray(LEDGERS_KEY, [...DEFAULT_LEDGERS, sampleCustomer]);

    mockDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };

    mockWindowOpen = vi.fn().mockReturnValue({
      document: mockDoc,
    });
    window.open = mockWindowOpen;

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

  it('renders party statement page with print button and entry receipt button', () => {
    render(<VoiceExpenseTrackerPreview />);

    // Check heading
    expect(screen.getByText('Party Statement Ledger')).toBeInTheDocument();

    // Check Print Statement button exists
    const printStatementBtn = screen.getByRole('button', { name: /🖨️ Print Statement/i });
    expect(printStatementBtn).toBeInTheDocument();

    // Click Print Statement button
    fireEvent.click(printStatementBtn);
    expect(mockWindowOpen).toHaveBeenCalled();

    // Verify printed statement contains customer name and statement details
    const statementHtmlCall = mockDoc.write.mock.calls.find((call) =>
      typeof call[0] === 'string' && call[0].includes('Statement of Account')
    );
    expect(statementHtmlCall).toBeDefined();
    expect(statementHtmlCall[0]).toContain('NIRAVKUMAR PRAJAPATI');
    expect(statementHtmlCall[0]).toContain('CUSTOMER STATEMENT');

    // Check individual entry receipt button in the statement table
    const receiptBtns = screen.getAllByRole('button', { name: /🖨️ Receipt/i });
    expect(receiptBtns.length).toBeGreaterThan(0);

    // Reset doc.write mock and click the row receipt button
    mockDoc.write.mockClear();
    fireEvent.click(receiptBtns[0]);

    expect(mockWindowOpen).toHaveBeenCalled();
    const receiptHtmlCall = mockDoc.write.mock.calls.find((call) =>
      typeof call[0] === 'string' && (call[0].includes('Receipt') || call[0].includes('RECEIPT'))
    );
    expect(receiptHtmlCall).toBeDefined();
    expect(receiptHtmlCall[0]).toContain('NIRAVKUMAR PRAJAPATI');
    expect(receiptHtmlCall[0]).toContain('500');
  });

  it('renders customer statement in hidden print-report-layout during browser print instead of blank P&L', () => {
    const { container } = render(<VoiceExpenseTrackerPreview />);

    expect(screen.getByText('Party Statement Ledger')).toBeInTheDocument();

    const printLayout = container.querySelector('.print-report-layout');
    expect(printLayout).toBeInTheDocument();

    // When on party-statement tab, print layout meta section must render Statement of Account
    const metaTitle = printLayout.querySelector('.print-meta-section h3');
    expect(metaTitle.textContent).toContain('Customer Statement of Account');
    expect(metaTitle.textContent).not.toBe('Profit & Loss Statement');

    // Must not render pnl sheet when on party-statement
    const pnlSheet = printLayout.querySelector('.print-pnl-sheet');
    expect(pnlSheet).toBeNull();

    // Must render print statement sheet with customer name
    const statementSheet = printLayout.querySelector('.print-statement-sheet');
    expect(statementSheet).toBeInTheDocument();
    expect(statementSheet.textContent).toContain('NIRAVKUMAR PRAJAPATI');
  });
});
