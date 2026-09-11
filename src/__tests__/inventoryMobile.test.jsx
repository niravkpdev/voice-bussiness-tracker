import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Phase2ERP from '../Phase2ERP';

describe('Inventory Management Mobile Responsiveness & Layout (#inventory)', () => {
  const sampleProducts = [
    {
      id: 'p1',
      name: 'Nylon Sev 500g',
      sku: 'NS-500',
      category: 'Namkeen',
      currentStock: 120,
      minStock: 20,
      purchasePrice: 110,
      sellingPrice: 140,
      unit: 'Packet'
    },
    {
      id: 'p2',
      name: 'Ratlami Sev 250g',
      sku: 'RS-250',
      category: 'Namkeen',
      currentStock: 0,
      minStock: 15,
      purchasePrice: 65,
      sellingPrice: 85,
      unit: 'Packet'
    }
  ];

  it('renders inventory management view with all 8 KPI summary cards', () => {
    const { container } = render(
      <Phase2ERP
        activeTab="inventory"
        cloudInventory={sampleProducts}
        vouchers={[]}
        ledgers={[]}
        partySummary={{}}
        cashBalance={10000}
        netProfit={5000}
        cloudCustomers={[]}
        cloudSuppliers={[]}
        cloudStockTransactions={[]}
        cloudInvoices={[]}
        cloudBusinesses={[]}
        cloudNotifications={[]}
      />
    );

    // Verify #inventory container is present
    const inventorySection = container.querySelector('#inventory');
    expect(inventorySection).toBeInTheDocument();
    expect(inventorySection).toHaveClass('phase2-stack');

    // Verify header and action buttons
    const header = container.querySelector('.inventory-premium-header');
    expect(header).toBeInTheDocument();
    expect(screen.getByText('Inventory Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Product/i })).toBeInTheDocument();
    expect(screen.getByText(/New Purchase Voucher/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Export$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Stock Report$/i })).toBeInTheDocument();

    // Verify KPI cards
    const kpiGrid = container.querySelector('.inventory-kpi-grid');
    expect(kpiGrid).toBeInTheDocument();
    const cards = kpiGrid.querySelectorAll('.kpi-card');
    expect(cards.length).toBe(8);

    // Verify specific KPI metric labels exist
    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('Total Stock Value')).toBeInTheDocument();
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
    expect(screen.getAllByText('Out of Stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Fast Moving')).toBeInTheDocument();
    expect(screen.getByText('Inventory Turnover')).toBeInTheDocument();
    expect(screen.getByText('Purchase Value')).toBeInTheDocument();
    expect(screen.getByText('Sales Value')).toBeInTheDocument();

    // Verify filter bar
    const filters = container.querySelector('.hrms-filters');
    expect(filters).toBeInTheDocument();
    expect(container.querySelector('.hrms-search-box')).toBeInTheDocument();
    expect(container.querySelector('.hrms-filter-dropdowns')).toBeInTheDocument();

    // Verify table scrolling wrappers
    const tableWrap = container.querySelector('.erp-table-wrap');
    expect(tableWrap).toBeInTheDocument();
    const responsiveWrap = container.querySelector('.table-responsive');
    expect(responsiveWrap).toBeInTheDocument();
    const table = container.querySelector('table.statement-table.hrms-directory-table');
    expect(table).toBeInTheDocument();
  });
});
