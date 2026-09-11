import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Phase2ERP from '../Phase2ERP';
import { rowToAppRecord } from '../supabaseClient';

describe('Invoice PDF & Detail Rendering across Invoices and Converted Orders', () => {
  let mockWindow;

  beforeEach(() => {
    const popupDoc = document.implementation.createHTMLDocument('Print Invoice');
    mockWindow = {
      document: popupDoc,
      setTimeout: vi.fn((cb) => cb()),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(() => mockWindow);
  });

  it('normalizes database invoice rows correctly with full camelCase and item line guarantees', () => {
    const dbRow = {
      id: 'inv-test-1',
      created_at: '2026-09-11T10:00:00Z',
      data: {
        invoice_number: 'INV-2026-0002',
        customer_name: 'NILESH PRAJAPATI',
        customer_mobile: '9876543210',
        customer_address: 'Ahmedabad, Gujarat',
        customer_gst: '24AAAAA0000A1Z5',
        invoice_date: '2026-09-11',
        due_date: '2026-09-20',
        subtotal: 5000,
        tax: 0,
        total: 5000,
        paid_amount: 0,
        balance_due: 5000,
        status: 'Unpaid',
        items: [{ description: '5000 units of custom namkeen packaging', amount: 5000 }],
      },
    };

    const normalized = rowToAppRecord(dbRow, 'invoices');

    expect(normalized.invoiceNo).toBe('INV-2026-0002');
    expect(normalized.date).toBe('2026-09-11');
    expect(normalized.dueDate).toBe('2026-09-20');
    expect(normalized.customerName).toBe('NILESH PRAJAPATI');
    expect(normalized.customerMobile).toBe('9876543210');
    expect(normalized.customerAddress).toBe('Ahmedabad, Gujarat');
    expect(normalized.customerGst).toBe('24AAAAA0000A1Z5');
    expect(normalized.lines).toHaveLength(1);
    expect(normalized.lines[0].name).toBe('5000 units of custom namkeen packaging');
    expect(normalized.lines[0].qty).toBe(1);
    expect(normalized.lines[0].rate).toBe(5000);
    expect(normalized.lines[0].gst).toBe(0);
    expect(normalized.lines[0].total).toBe(5000);
  });

  it('renders accurate PDF details for an invoice converted from an order (INV-2026-0002)', () => {
    const convertedInvoice = {
      id: 'inv-conv-2',
      invoiceNo: 'INV-2026-0002',
      invoice_number: 'INV-2026-0002',
      customer_name: 'NILESH PRAJAPATI',
      customerName: 'NILESH PRAJAPATI',
      customer_mobile: '9876543210',
      customerMobile: '9876543210',
      customer_address: 'Plot 44, GIDC Industrial Estate, Naroda',
      customerAddress: 'Plot 44, GIDC Industrial Estate, Naroda',
      customer_gst: '24ABCDE1234F1Z5',
      customerGst: '24ABCDE1234F1Z5',
      date: '2026-09-11',
      invoice_date: '2026-09-11',
      dueDate: '2026-09-11',
      due_date: '2026-09-11',
      status: 'Unpaid',
      total: 5000,
      subtotal: 5000,
      paid: 0,
      balance: 5000,
      lines: [
        {
          name: 'Special Diwali Namkeen Gift Boxes (Bulk)',
          qty: 1,
          rate: 5000,
          gst: 0,
          total: 5000,
        },
      ],
    };

    render(
      <Phase2ERP
        activeTab="invoices"
        cloudInvoices={[convertedInvoice]}
        cloudCustomers={[]}
        cloudInventory={[]}
        vouchers={[]}
        ledgers={[]}
        partySummary={{}}
        cashBalance={10000}
        netProfit={5000}
        cloudSuppliers={[]}
        cloudStockTransactions={[]}
        cloudBusinesses={[]}
        cloudNotifications={[]}
      />
    );

    expect(screen.getByText('INV-2026-0002')).toBeInTheDocument();
    expect(screen.getByText('NILESH PRAJAPATI')).toBeInTheDocument();

    const pdfButtons = screen.getAllByRole('button', { name: /pdf/i });
    fireEvent.click(pdfButtons[0]);

    expect(window.open).toHaveBeenCalled();
    const docBody = mockWindow.document.body;

    expect(mockWindow.document.title).toBe('INV-2026-0002');

    expect(docBody.textContent).toContain('INV-2026-0002');
    expect(docBody.textContent).toContain('Date: 2026-09-11');
    expect(docBody.textContent).not.toContain('Date: undefined');
    expect(docBody.textContent).toContain('Status: Unpaid');

    expect(docBody.textContent).toContain('Bill To:');
    expect(docBody.textContent).toContain('NILESH PRAJAPATI');
    expect(docBody.textContent).toContain('Phone: 9876543210');
    expect(docBody.textContent).toContain('Address: Plot 44, GIDC Industrial Estate, Naroda');
    expect(docBody.textContent).toContain('GSTIN: 24ABCDE1234F1Z5');

    expect(docBody.textContent).toContain('Special Diwali Namkeen Gift Boxes (Bulk)');
    expect(docBody.textContent).not.toContain('undefined%');
    expect(docBody.textContent).toContain('0%');

    expect(docBody.textContent).toContain('Grand Total:');
    expect(docBody.textContent).toContain('Balance Due:');

    expect(mockWindow.print).toHaveBeenCalled();
  });

  it('handles standard multi-item invoice with GST, paid amounts, and customer lookups', () => {
    const existingCustomer = {
      id: 'cust-shreeji',
      name: 'Shreeji Farsan Mart',
      phone: '9825012345',
      address: 'Station Road, Anand',
      gst: '24AABCS1429B1Z1',
    };

    const standardInvoice = {
      id: 'inv-std-1',
      invoiceNo: 'INV-2026-0001',
      customerId: 'cust-shreeji',
      date: '2026-05-10',
      dueDate: '2026-05-25',
      status: 'Partial Paid',
      subtotal: 3000,
      taxable: 3000,
      gstTotal: 540,
      total: 3540,
      paid: 2000,
      balance: 1540,
      lines: [
        { id: 'l1', name: 'Nylon Sev (500g)', qty: 10, rate: 150, gst: 18, total: 1770 },
        { id: 'l2', name: 'Bhavnagri Gathiya (500g)', qty: 10, rate: 150, gst: 18, total: 1770 },
      ],
    };

    render(
      <Phase2ERP
        activeTab="invoices"
        cloudInvoices={[standardInvoice]}
        cloudCustomers={[existingCustomer]}
        cloudInventory={[]}
        vouchers={[]}
        ledgers={[]}
        partySummary={{}}
        cashBalance={10000}
        netProfit={5000}
        cloudSuppliers={[]}
        cloudStockTransactions={[]}
        cloudBusinesses={[]}
        cloudNotifications={[]}
      />
    );

    const pdfButtons = screen.getAllByRole('button', { name: /pdf/i });
    fireEvent.click(pdfButtons[0]);

    const docBody = mockWindow.document.body;

    expect(docBody.textContent).toContain('Shreeji Farsan Mart');
    expect(docBody.textContent).toContain('Phone: 9825012345');
    expect(docBody.textContent).toContain('Address: Station Road, Anand');
    expect(docBody.textContent).toContain('GSTIN: 24AABCS1429B1Z1');

    expect(docBody.textContent).toContain('Nylon Sev (500g)');
    expect(docBody.textContent).toContain('Bhavnagri Gathiya (500g)');
    expect(docBody.textContent).toContain('18%');
    expect(docBody.textContent).not.toContain('undefined%');

    expect(docBody.textContent).toContain('Subtotal:');
    expect(docBody.textContent).toContain('GST / Tax:');
    expect(docBody.textContent).toContain('Grand Total:');
    expect(docBody.textContent).toContain('Paid Amount:');
    expect(docBody.textContent).toContain('Balance Due:');
  });

  it('provides safe fallbacks for legacy or minimally-specified invoices without crashing', () => {
    const minimalInvoice = {
      id: 'inv-legacy-99',
      amount: 1200,
    };

    render(
      <Phase2ERP
        activeTab="invoices"
        cloudInvoices={[minimalInvoice]}
        cloudCustomers={[]}
        cloudInventory={[]}
        vouchers={[]}
        ledgers={[]}
        partySummary={{}}
        cashBalance={10000}
        netProfit={5000}
        cloudSuppliers={[]}
        cloudStockTransactions={[]}
        cloudBusinesses={[]}
        cloudNotifications={[]}
      />
    );

    const pdfButtons = screen.getAllByRole('button', { name: /pdf/i });
    fireEvent.click(pdfButtons[0]);

    const docBody = mockWindow.document.body;

    expect(docBody.textContent).toContain('Bill To:');
    expect(docBody.textContent).toContain('Walk-in Customer / Cash Sale');
    expect(docBody.textContent).toContain('Order Goods / Services');
    expect(docBody.textContent).not.toContain('undefined%');
    expect(docBody.textContent).toContain('0%');
    expect(docBody.textContent).toContain('Grand Total:');
  });

  it('converts an order to a complete invoice with proper details in Phase3Ops', async () => {
    const Phase3Ops = (await import('../Phase3Ops')).default;
    const sampleOrder = {
      id: 'ord-test-nilesh',
      orderNo: 'ORD-2026-0002',
      customer: 'NILESH PRAJAPATI',
      mobile: '9876543210',
      details: '5000 units of custom namkeen packaging',
      amount: 5000,
      status: 'New Order',
      deliveryDate: '2026-09-20',
      timeline: [{ status: 'New Order', date: '2026-09-11', note: 'Order created' }],
    };

    let convertedInvoiceCaptured = null;
    const onUpdateInvoiceMock = vi.fn((inv) => {
      convertedInvoiceCaptured = inv;
    });

    render(
      <Phase3Ops
        activeTab="orders"
        cloudOrders={[sampleOrder]}
        invoices={[]}
        customers={[]}
        onUpdateInvoice={onUpdateInvoiceMock}
        supabaseEnabled={false}
        authUser={null}
        profile={{ name: 'Jay Ambe Namkeen' }}
      />
    );

    expect(screen.getByText(/NILESH PRAJAPATI/i)).toBeInTheDocument();
    expect(screen.getByText('5000 units of custom namkeen packaging')).toBeInTheDocument();

    const convertBtn = screen.getByRole('button', { name: /convert to invoice/i });
    fireEvent.click(convertBtn);

    await vi.waitFor(() => {
      expect(onUpdateInvoiceMock).toHaveBeenCalled();
    });
    expect(convertedInvoiceCaptured).toBeDefined();
    expect(convertedInvoiceCaptured.customerName).toBe('NILESH PRAJAPATI');
    expect(convertedInvoiceCaptured.customer_name).toBe('NILESH PRAJAPATI');
    expect(convertedInvoiceCaptured.customerMobile).toBe('9876543210');
    expect(convertedInvoiceCaptured.total).toBe(5000);
    expect(convertedInvoiceCaptured.balance).toBe(5000);
    expect(convertedInvoiceCaptured.date).toBeDefined();
    expect(convertedInvoiceCaptured.lines).toHaveLength(1);
    expect(convertedInvoiceCaptured.lines[0].name).toBe('5000 units of custom namkeen packaging');
    expect(convertedInvoiceCaptured.lines[0].rate).toBe(5000);
    expect(convertedInvoiceCaptured.lines[0].gst).toBe(0);
    expect(convertedInvoiceCaptured.lines[0].total).toBe(5000);
  });
});
