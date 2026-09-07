import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfitNxSalesEntry from '../ProfitNxSalesEntry';
import ProfitNxProduction from '../ProfitNxProduction';

describe('Profit Nx Sales Entry Register (Matching FR.mp4)', () => {
  const mockProfile = {
    name: 'Jay Ambe Namkeen',
    gstin: '24CPVPC7753J1Z8',
    financialYear: '2026-2027',
    phone: '+918488943771'
  };

  const sampleInvoices = [
    {
      id: 'inv-1',
      invoiceNo: 'GST-2026-001',
      date: '2026-05-10',
      customer_name: 'Shreeji Farsan Mart',
      gstin: '24AABCS1429B1Z1',
      billType: 'B2B',
      taxType: 'CGST + SGST (Gujarat)',
      items: [
        { name: 'Sev Mamra (250g)', qty: 20, rate: 60, taxable: 1142.86, gstAmt: 57.14, total: 1200 }
      ],
      taxable: 1142.86,
      gstTotal: 57.14,
      total: 1200,
      status: 'Paid'
    },
    {
      id: 'inv-2',
      invoiceNo: 'GST-2026-002',
      date: '2026-05-12',
      customer_name: 'Cash Customer',
      gstin: '-',
      billType: 'B2C',
      taxType: 'CGST + SGST (Gujarat)',
      items: [
        { name: 'Bhavnagri Gathiya (500g)', qty: 5, rate: 160, taxable: 761.9, gstAmt: 38.1, total: 800 }
      ],
      taxable: 761.9,
      gstTotal: 38.1,
      total: 800,
      status: 'Paid'
    }
  ];

  const sampleOrders = [
    {
      id: 'ord-101',
      orderNo: 'ORD-1001',
      createdAt: '2026-05-15T10:00:00Z',
      customer: 'Pooja Shah',
      amount: 500,
      total: 500,
      status: 'Received',
      items: [
        { name: 'Ratlami Sev (500g)', quantity: 2, price: 250 }
      ]
    }
  ];

  it('renders Profit Nx header with Jay Ambe Namkeen company profile and GSTIN', () => {
    render(
      <ProfitNxSalesEntry
        invoices={sampleInvoices}
        orders={sampleOrders}
        profile={mockProfile}
      />
    );

    expect(screen.getByText(/JAY AMBE NAMKEEN/i)).toBeDefined();
    expect(screen.getByText(/24CPVPC7753J1Z8/i)).toBeDefined();
    expect(screen.getByText(/\[2026 - 2027\]/i)).toBeDefined();
    expect(screen.getByText(/1\. Transaction > Sales Register \/ Entry/i)).toBeDefined();
  });

  it('displays both ERP invoices and Online Store Orders in high-density grid', () => {
    render(
      <ProfitNxSalesEntry
        invoices={sampleInvoices}
        orders={sampleOrders}
        profile={mockProfile}
      />
    );

    expect(screen.getByText('GST-2026-001')).toBeDefined();
    expect(screen.getByText('Shreeji Farsan Mart')).toBeDefined();
    expect(screen.getByText('GST-2026-002')).toBeDefined();
    expect(screen.getByText('ORD-1001')).toBeDefined();
    expect(screen.getByText('Pooja Shah')).toBeDefined();
  });

  it('calculates accurate live totals in footer bar', () => {
    render(
      <ProfitNxSalesEntry
        invoices={sampleInvoices}
        orders={sampleOrders}
        profile={mockProfile}
      />
    );

    // Total Records = 2 invoices + 1 order = 3
    expect(screen.getByText('Total Records:')).toBeDefined();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);

    // Total Quantity = 20 + 5 + 2 = 27
    expect(screen.getByText(/27 Units/i)).toBeDefined();

    // Net Total = 1200 + 800 + 500 = 2500
    expect(screen.getByText(/2,500/i)).toBeDefined();
  });

  it('filters invoices by search term', () => {
    render(
      <ProfitNxSalesEntry
        invoices={sampleInvoices}
        orders={sampleOrders}
        profile={mockProfile}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search Party, GSTIN, Bill No or Product/i);
    fireEvent.change(searchInput, { target: { value: 'Shreeji' } });

    expect(screen.getByText('Shreeji Farsan Mart')).toBeDefined();
    expect(screen.queryByText('Pooja Shah')).toBeNull();
  });

  it('opens Sales Entry modal on Add (F2) click', () => {
    render(
      <ProfitNxSalesEntry
        invoices={sampleInvoices}
        orders={sampleOrders}
        profile={mockProfile}
      />
    );

    const addButton = screen.getByText(/Add/i);
    fireEvent.click(addButton);

    expect(screen.getByText(/\+ New Sales Entry \(F2\)/i)).toBeDefined();
    expect(screen.getByText(/Bill \/ Invoice No/i)).toBeDefined();
  });
});

describe('Profit Nx Production Module (Namkeen BOM & Batch Processing)', () => {
  const mockProfile = {
    name: 'Jay Ambe Namkeen',
    gstin: '24CPVPC7753J1Z8'
  };

  it('renders Recipe BOM master with authentic Namkeen formulations', () => {
    render(
      <ProfitNxProduction
        profile={mockProfile}
      />
    );

    expect(screen.getByText(/5\. Production > Namkeen Recipe BOM & Batch Entry/i)).toBeDefined();

    // Switch to Recipes tab
    const recipeTabButton = screen.getByText(/Recipe \/ BOM Master/i);
    fireEvent.click(recipeTabButton);

    expect(screen.getByText(/Sev Mamra Special \(100 kg Batch\)/i)).toBeDefined();
    expect(screen.getByText(/Bhavnagri Gathiya \(50 kg Batch\)/i)).toBeDefined();
    expect(screen.getByText(/Ratlami Sev Tikha \(50 kg Batch\)/i)).toBeDefined();
    expect(screen.getByText(/Sing Bhujia \/ Masala Peanuts \(50 kg Batch\)/i)).toBeDefined();
  });

  it('calculates required raw materials based on batch scale multiplier', () => {
    render(
      <ProfitNxProduction
        profile={mockProfile}
      />
    );

    // Initial 1x batch of Sev Mamra requires 60kg Mamra, 25kg Besan, 15Ltr Oil
    expect(screen.getByText(/Mamra \(Puffed Rice\)/i)).toBeDefined();
    expect(screen.getByText(/60 kg/i)).toBeDefined();
    expect(screen.getByText(/25 kg/i)).toBeDefined();

    // Adjust batch multiplier to 2x
    const multiplierInputs = screen.getAllByDisplayValue('1');
    fireEvent.change(multiplierInputs[0], { target: { value: '2' } });

    // Now requires 120kg Mamra, 50kg Besan
    expect(screen.getByText(/120 kg/i)).toBeDefined();
    expect(screen.getAllByText(/50 kg/i).length).toBeGreaterThan(0);
  });

  it('records a new production batch into history', () => {
    const onSave = vi.fn();
    render(
      <ProfitNxProduction
        profile={mockProfile}
        onSaveProductionBatch={onSave}
      />
    );

    // Click execute batch
    const executeButton = screen.getByText(/Execute & Record Batch Run/i);
    fireEvent.click(executeButton);

    expect(onSave).toHaveBeenCalled();
  });
});
