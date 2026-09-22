import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Phase2ERP from '../Phase2ERP';

describe('Analytics Center (#analytics)', () => {
  const mockProducts = [
    { id: 'p1', name: 'Ratlami Sev (500g)', currentStock: 50, sellingPrice: 200, purchasePrice: 150, unit: 'pkts' },
    { id: 'p2', name: 'Bhavnagri Gathiya', currentStock: 30, sellingPrice: 180, purchasePrice: 130, unit: 'pkts' }
  ];

  const mockInvoices = [
    {
      id: 'inv-1',
      invoiceNo: 'INV-001',
      date: new Date().toISOString().slice(0, 10),
      total: 12000,
      customerName: 'Shreeji Farsan',
      lines: [{ productId: 'p1', qty: 60, price: 200 }]
    }
  ];

  const mockVouchers = [
    {
      id: 'vch-1',
      type: 'Payment',
      amount: 4000,
      date: new Date().toISOString().slice(0, 10),
      narration: 'Office maintenance'
    },
    {
      id: 'vch-2',
      type: 'Sales',
      amount: 5000,
      date: new Date().toISOString().slice(0, 10),
      partyName: 'Nirav Enterprise',
      narration: 'Direct counter sale'
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('businessProducts', JSON.stringify(mockProducts));
  });

  it('renders top summary KPI cards with unified revenue, expenses, net profit, and active customers', () => {
    render(
      <Phase2ERP
        activeTab="analytics"
        vouchers={mockVouchers}
        cloudInventory={mockProducts}
        cloudInvoices={mockInvoices}
      />
    );

    // Hero title & Eyebrow
    expect(screen.getByText('Analytics Center')).toBeDefined();
    expect(screen.getByText('Revenue, expense, profit, customer growth, and product performance')).toBeDefined();

    // Top Summary KPI Cards should be present
    expect(screen.getByText('Total Revenue')).toBeDefined();
    expect(screen.getByText('Total Expenses')).toBeDefined();
    expect(screen.getByText('Net Profit')).toBeDefined();
    expect(screen.getByText('Active Customers')).toBeDefined();

    // Unified revenue includes invoice (12,000) + sales voucher (5,000) = 17,000
    const revenueKpi = screen.getAllByText(/₹17,000/);
    expect(revenueKpi.length).toBeGreaterThan(0);

    // Expense includes 4,000
    const expenseKpi = screen.getAllByText(/₹4,000/);
    expect(expenseKpi.length).toBeGreaterThan(0);

    // Net Profit: 17,000 - 4,000 = 13,000
    const profitKpi = screen.getAllByText(/₹13,000/);
    expect(profitKpi.length).toBeGreaterThan(0);
  });

  it('renders Customer Performance & Growth card with transacting customers', () => {
    render(
      <Phase2ERP
        activeTab="analytics"
        vouchers={mockVouchers}
        cloudInventory={mockProducts}
        cloudInvoices={mockInvoices}
      />
    );

    expect(screen.getByText('Customer Performance & Growth')).toBeDefined();
    // Shreeji Farsan from invoice and Nirav Enterprise from sales voucher
    expect(screen.getByText('Shreeji Farsan')).toBeDefined();
    expect(screen.getByText('Nirav Enterprise')).toBeDefined();
  });

  it('renders Product Performance with fallback catalog valuation when no sales exist', () => {
    render(
      <Phase2ERP
        activeTab="analytics"
        vouchers={[]}
        cloudInventory={mockProducts}
        cloudInvoices={[]}
      />
    );

    expect(screen.getByText('Product Performance')).toBeDefined();
    // Catalog fallback indicator
    expect(screen.getByText('Inventory Catalog')).toBeDefined();
    expect(screen.getByText(/Showing top catalog items by stock valuation/)).toBeDefined();
    expect(screen.getByText('Ratlami Sev (500g)')).toBeDefined();
  });

  it('allows period filter switching between Daily, Weekly, Monthly, Quarterly, and Yearly', () => {
    render(
      <Phase2ERP
        activeTab="analytics"
        vouchers={mockVouchers}
        cloudInventory={mockProducts}
        cloudInvoices={mockInvoices}
      />
    );

    const dailyBtn = screen.getByRole('button', { name: 'Daily' });
    const yearlyBtn = screen.getByRole('button', { name: 'Yearly' });

    fireEvent.click(dailyBtn);
    expect(dailyBtn.className).toContain('active');
    expect(screen.getByText(/Showing Today/)).toBeDefined();

    fireEvent.click(yearlyBtn);
    expect(yearlyBtn.className).toContain('active');
    expect(screen.getByText(/Showing Financial Year/)).toBeDefined();
  });

  it('triggers CSV download when Export CSV button is clicked', () => {
    const statusSpy = vi.fn();
    render(
      <Phase2ERP
        activeTab="analytics"
        vouchers={mockVouchers}
        cloudInventory={mockProducts}
        cloudInvoices={mockInvoices}
        onStatus={statusSpy}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);

    expect(statusSpy).toHaveBeenCalledWith('Analytics report downloaded successfully');
  });
});
