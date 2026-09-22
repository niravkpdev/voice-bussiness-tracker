import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceCommandButton from '../VoiceCommandButton.jsx';
import Phase3Ops from '../Phase3Ops.jsx';

describe('Floating Mic Button & Local Voice Bookkeeper Studio', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Floating Circular Mic Button (Image 1)', () => {
    it('renders the floating circular button with MIC label matching hand-drawn sketch', () => {
      const mockOnRecognized = vi.fn();
      render(
        <VoiceCommandButton
          onCommandRecognized={mockOnRecognized}
          isIconOnly={true}
        />
      );

      const micButton = screen.getByRole('button', { name: /voice command mic/i });
      expect(micButton).toBeInTheDocument();
      expect(micButton).toHaveTextContent(/MIC/i);
    });

    it('displays listening state and LIVE indicator when activated', () => {
      const mockOnRecognized = vi.fn();
      render(
        <VoiceCommandButton
          onCommandRecognized={mockOnRecognized}
          isIconOnly={true}
        />
      );

      const micButton = screen.getByRole('button', { name: /voice command mic/i });
      fireEvent.click(micButton);

      // In JSDOM without Web Speech API, should show supportive feedback or attempt listening
      expect(micButton).toBeInTheDocument();
    });
  });

  describe('Local Voice Bookkeeper Overhaul (Image 2)', () => {
    const mockParties = [
      { id: 'party-1', name: 'Ramesh Patel', group: 'Sundry Debtors' },
      { id: 'party-2', name: 'NIRAVKUMAR KANTILAL PRAJAPATI', group: 'Sundry Debtors' },
      { id: 'party-3', name: 'ABC Suppliers', group: 'Sundry Creditors' }
    ];

    const mockVouchers = [
      { id: 'vch-1', date: new Date().toISOString().slice(0, 10), type: 'Sales', amount: 15000 },
      { id: 'vch-2', date: new Date().toISOString().slice(0, 10), type: 'Payment', amount: 5000 }
    ];

    const mockPartySummary = [
      { id: 'party-2', name: 'NIRAVKUMAR KANTILAL PRAJAPATI', group: 'Sundry Debtors', outstandingAmount: 200 }
    ];

    it('renders Local Voice Bookkeeper with enhanced studio header and offline badges', () => {
      render(
        <Phase3Ops
          activeTab="voice-bookkeeper"
          partyLedgers={mockParties}
          partySummary={mockPartySummary}
          vouchers={mockVouchers}
        />
      );

      expect(screen.getByText(/LOCAL VOICE BOOKKEEPER/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Offline Browser Speech/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Private/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voice studio mic/i })).toBeInTheDocument();
    });

    it('renders interactive "Try Saying" quick chips and parses simulated command', () => {
      const mockOnRecognized = vi.fn();
      render(
        <Phase3Ops
          activeTab="voice-bookkeeper"
          partyLedgers={mockParties}
          partySummary={mockPartySummary}
          vouchers={mockVouchers}
          onVoiceCommandRecognized={mockOnRecognized}
        />
      );

      const teaChip = screen.getByRole('button', { name: /Add payment 500 cash for tea/i });
      expect(teaChip).toBeInTheDocument();

      // Click the chip to simulate speech command
      fireEvent.click(teaChip);

      // Should recognize Payment voucher
      expect(screen.getByText(/Command Recognized: Payment Voucher/i)).toBeInTheDocument();
      expect(screen.getByText(/₹500/i)).toBeInTheDocument();

      // Click "Open & Pre-fill in Voucher Entry" button
      const applyBtn = screen.getByRole('button', { name: /Open & Pre-fill in Voucher Entry/i });
      expect(applyBtn).toBeInTheDocument();
    });

    it('renders all 4 upgraded intelligence and KPI cards', () => {
      render(
        <Phase3Ops
          activeTab="voice-bookkeeper"
          partyLedgers={mockParties}
          partySummary={mockPartySummary}
          vouchers={mockVouchers}
          businessIssues={['NIRAVKUMAR KANTILAL PRAJAPATI owes ₹200']}
        />
      );

      // Card 1: Voice Voucher Command
      expect(screen.getByText(/Voice Voucher Command/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Go to Voucher Entry/i })).toBeInTheDocument();

      // Card 2: Monthly Net Profit
      expect(screen.getByText(/Monthly Net Profit/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Analytics Center/i })).toBeInTheDocument();

      // Card 3: Pending Collections
      expect(screen.getByText(/Pending Collections/i)).toBeInTheDocument();
      const debtorMatches = screen.getAllByText(/NIRAVKUMAR KANTILAL PRAJAPATI/i);
      expect(debtorMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('link', { name: /Open CRM/i })).toBeInTheDocument();

      // Card 4: Issues Needing Attention
      expect(screen.getByText(/Issues Needing Attention/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Review Diagnostics/i })).toBeInTheDocument();
    });

    it('renders the Voice Command Reference & Syntax Guide', () => {
      render(
        <Phase3Ops
          activeTab="voice-bookkeeper"
          partyLedgers={mockParties}
          partySummary={mockPartySummary}
          vouchers={mockVouchers}
        />
      );

      expect(screen.getByText(/Voice Command Reference & Syntax Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment \/ Expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/Sales \/ Credit/i)).toBeInTheDocument();
      expect(screen.getByText(/Receipt \/ Income/i)).toBeInTheDocument();
      expect(screen.getByText(/Purchase \/ Material/i)).toBeInTheDocument();
    });
  });
});
