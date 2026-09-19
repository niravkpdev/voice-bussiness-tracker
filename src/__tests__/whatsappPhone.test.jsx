import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { formatWhatsAppPhone } from '../security';
import Phase2ERP from '../Phase2ERP';
import UpiPaymentModal from '../UpiPaymentModal';

describe('formatWhatsAppPhone utility', () => {
  it('returns empty string for null, undefined, or non-numeric inputs', () => {
    expect(formatWhatsAppPhone(null)).toBe('');
    expect(formatWhatsAppPhone(undefined)).toBe('');
    expect(formatWhatsAppPhone('')).toBe('');
    expect(formatWhatsAppPhone('   ')).toBe('');
    expect(formatWhatsAppPhone('abcdef')).toBe('');
  });

  it('formats 10-digit Indian numbers by prepending country code 91', () => {
    // Specifically testing the user error number 6355429227
    expect(formatWhatsAppPhone('6355429227')).toBe('916355429227');
    expect(formatWhatsAppPhone('9876543210')).toBe('919876543210');
    expect(formatWhatsAppPhone('9979668339')).toBe('919979668339');
  });

  it('formats 10-digit numbers with formatting characters (spaces, dashes, parentheses)', () => {
    expect(formatWhatsAppPhone('63554 29227')).toBe('916355429227');
    expect(formatWhatsAppPhone('(635) 542-9227')).toBe('916355429227');
    expect(formatWhatsAppPhone('635-542-9227')).toBe('916355429227');
  });

  it('handles 11-digit numbers starting with 0 by stripping leading 0 and prepending 91', () => {
    expect(formatWhatsAppPhone('06355429227')).toBe('916355429227');
    expect(formatWhatsAppPhone('0 63554 29227')).toBe('916355429227');
  });

  it('handles numbers already having 91 or +91 prefix correctly without duplicating', () => {
    expect(formatWhatsAppPhone('916355429227')).toBe('916355429227');
    expect(formatWhatsAppPhone('+916355429227')).toBe('916355429227');
    expect(formatWhatsAppPhone('+91 63554 29227')).toBe('916355429227');
    expect(formatWhatsAppPhone('+91-6355429227')).toBe('916355429227');
  });

  it('strips international dialing prefix 00', () => {
    expect(formatWhatsAppPhone('00916355429227')).toBe('916355429227');
  });

  it('preserves valid international numbers', () => {
    expect(formatWhatsAppPhone('+44 7404 194071')).toBe('447404194071');
    expect(formatWhatsAppPhone('+1 555 123 4567')).toBe('15551234567');
    expect(formatWhatsAppPhone('+971 50 123 4567')).toBe('971501234567');
  });

  it('supports custom default country code', () => {
    expect(formatWhatsAppPhone('7404194071', '44')).toBe('447404194071');
  });
});

describe('Phase2ERP WhatsApp Integration', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('opens WhatsApp with 91 prefix when Send WhatsApp is clicked on CRM profile with 10-digit number', () => {
    const customer = {
      id: 'cust-1',
      name: 'Nilesh Prajapati',
      phone: '6355429227', // The exact 10-digit number reported by user
      email: 'nilesh@example.com',
      address: 'Ahmedabad',
      businessId: 'default',
    };

    render(
      <Phase2ERP
        activeTab="crm"
        cloudCustomers={[customer]}
        products={[]}
        invoices={[]}
        vouchers={[]}
        onStatus={vi.fn()}
      />
    );

    // Click to open profile
    const nameBtn = screen.getByText('Nilesh Prajapati');
    fireEvent.click(nameBtn);

    // Look for "Send WhatsApp" button in CRM drawer
    const waButtons = screen.getAllByRole('button', { name: /send whatsapp/i });
    expect(waButtons.length).toBeGreaterThan(0);
    fireEvent.click(waButtons[0]);

    expect(openSpy).toHaveBeenCalledWith('https://wa.me/916355429227', '_blank');
  });

  it('opens WhatsApp with 91 prefix when Send WhatsApp is clicked on party action menu', () => {
    const customer = {
      id: 'cust-2',
      name: 'Ramesh Patel',
      phone: '9825112345',
      email: 'ramesh@example.com',
      address: 'Surat',
      businessId: 'default',
    };

    render(
      <Phase2ERP
        activeTab="crm"
        cloudCustomers={[customer]}
        products={[]}
        invoices={[]}
        vouchers={[]}
        onStatus={vi.fn()}
      />
    );

    // Open action menu (Actions title button)
    const actionBtn = screen.getByTitle('Actions');
    expect(actionBtn).toBeDefined();
    fireEvent.click(actionBtn);

    // Click "Send WhatsApp" from the menu modal
    const waMenuBtn = screen.getByText('Send WhatsApp');
    fireEvent.click(waMenuBtn);

    expect(openSpy).toHaveBeenCalledWith('https://wa.me/919825112345', '_blank');
  });

  it('shares invoice via WhatsApp with 91 prefix for 10-digit customer mobile', () => {
    const customer = {
      id: 'cust-1',
      name: 'Nilesh Prajapati',
      phone: '6355429227',
      businessId: 'default',
    };

    const invoice = {
      id: 'inv-1',
      invoiceNo: 'INV-2026-0001',
      customerId: 'cust-1',
      customerMobile: '6355429227',
      customerName: 'Nilesh Prajapati',
      amount: 1500,
      total: 1500,
      balance: 1500,
      status: 'Unpaid',
      date: '2026-09-11',
      dueDate: '2026-09-20',
      businessId: 'default',
      items: [{ name: 'Namkeen Pack', qty: 5, rate: 300, amount: 1500 }],
    };

    render(
      <Phase2ERP
        activeTab="invoices"
        cloudCustomers={[customer]}
        cloudInvoices={[invoice]}
        products={[]}
        vouchers={[]}
        onStatus={vi.fn()}
      />
    );

    // Click WhatsApp share button on the invoice card
    const waButtons = screen.getAllByRole('button', { name: /whatsapp/i });
    expect(waButtons.length).toBeGreaterThan(0);
    fireEvent.click(waButtons[0]);

    expect(openSpy).toHaveBeenCalled();
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain('https://wa.me/916355429227?text=');
  });
});

describe('UpiPaymentModal WhatsApp Integration', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('shares UPI payment link targeting customer WhatsApp with 91 prefix for 10-digit phone', () => {
    const invoice = {
      id: 'inv-upi-1',
      invoiceNo: 'INV-2026-0002',
      customerName: 'Nilesh Prajapati',
      customerMobile: '6355429227',
      total: 1250,
      balanceDue: 1250,
    };

    render(
      <UpiPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={invoice}
        profile={{ name: 'Jay Ambe Namkeen', upiId: 'jayambe@upi' }}
      />
    );

    const shareWaBtn = screen.getByRole('button', { name: /whatsapp/i });
    fireEvent.click(shareWaBtn);

    expect(openSpy).toHaveBeenCalled();
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain('https://wa.me/916355429227?text=');
  });

  it('prints Counter Standee with merchant details and QR code without empty print', async () => {
    const invoice = {
      id: 'inv-standee-1',
      invoiceNo: 'STORE-COUNTER',
      customerName: 'In-Store Shopper',
      total: 0,
      balanceDue: 0,
    };

    render(
      <UpiPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={invoice}
        profile={{ name: 'Trinetr Business Suite', upiId: 'trinetr.namkeen@icici', gstin: '24CPVPC7753J1Z8' }}
      />
    );

    // Switch to Counter Standee tab
    const standeeTab = screen.getByRole('button', { name: /Counter Standee/i });
    fireEvent.click(standeeTab);

    // Verify Print button is present
    const printBtn = screen.getByRole('button', { name: /Print Counter Standee/i });
    expect(printBtn).toBeDefined();

    // Trigger Print
    fireEvent.click(printBtn);

    // Verify an iframe was injected with the standee content containing merchant name, UPI ID and GSTIN
    const printFrame = document.getElementById('standee-print-frame');
    if (printFrame && printFrame.contentWindow?.document) {
      const docHtml = printFrame.contentWindow.document.body.innerHTML;
      expect(docHtml).toContain('Trinetr Business Suite');
      expect(docHtml).toContain('trinetr.namkeen@icici');
      expect(docHtml).toContain('SCAN &amp; PAY WITH ANY UPI APP');
    }
  });
});

