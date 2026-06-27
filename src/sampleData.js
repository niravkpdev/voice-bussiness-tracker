export const generateSampleData = () => {
  const now = new Date();
  
  const customers = [
    { id: 'cust-demo-1', type: 'Customer', name: 'Acme Corp', contact: 'John Doe', phone: '+1-555-0101', email: 'john@acme.com', address: '123 Tech Lane, Silicon Valley', status: 'Active', balance: 0, createdAt: now.toISOString() },
    { id: 'cust-demo-2', type: 'Customer', name: 'Globex Inc', contact: 'Jane Smith', phone: '+1-555-0102', email: 'jane@globex.com', address: '456 Innovation Blvd, NY', status: 'Active', balance: 1500, createdAt: now.toISOString() },
    { id: 'cust-demo-3', type: 'Customer', name: 'Soylent Corp', contact: 'Bob Johnson', phone: '+1-555-0103', email: 'bob@soylent.com', address: '789 Future Way, Austin', status: 'Active', balance: 0, createdAt: now.toISOString() },
    { id: 'cust-demo-4', type: 'Customer', name: 'Initech', contact: 'Peter Gibbons', phone: '+1-555-0104', email: 'peter@initech.com', address: '101 Office Park, Dallas', status: 'Active', balance: -500, createdAt: now.toISOString() },
    { id: 'cust-demo-5', type: 'Customer', name: 'Stark Industries', contact: 'Tony Stark', phone: '+1-555-0105', email: 'tony@stark.com', address: 'Malibu Point, CA', status: 'Inactive', balance: 0, createdAt: now.toISOString() }
  ];

  const suppliers = [
    { id: 'supp-demo-1', type: 'Supplier', name: 'TechSource Supply', contact: 'Alice Brown', phone: '+1-555-0201', email: 'sales@techsource.com', status: 'Active', balance: 5000, createdAt: now.toISOString() },
    { id: 'supp-demo-2', type: 'Supplier', name: 'Global Logistics', contact: 'Charlie Davis', phone: '+1-555-0202', email: 'hello@globallogistics.com', status: 'Active', balance: 0, createdAt: now.toISOString() },
    { id: 'supp-demo-3', type: 'Supplier', name: 'Office Depot Prime', contact: 'Eva Green', phone: '+1-555-0203', email: 'eva@officedepotprime.com', status: 'Active', balance: 0, createdAt: now.toISOString() }
  ];

  const inventory = [
    { id: 'prod-demo-1', name: 'MacBook Pro 16"', sku: 'MBP-16-M3', category: 'Laptops', purchasePrice: 2000, sellingPrice: 2499, currentStock: 12, minStock: 5, unit: 'pcs', createdAt: now.toISOString() },
    { id: 'prod-demo-2', name: 'Dell XPS 15', sku: 'DXPS-15', category: 'Laptops', purchasePrice: 1500, sellingPrice: 1899, currentStock: 8, minStock: 10, unit: 'pcs', createdAt: now.toISOString() },
    { id: 'prod-demo-3', name: 'Logitech MX Master 3S', sku: 'LOGI-MX3S', category: 'Accessories', purchasePrice: 70, sellingPrice: 99, currentStock: 45, minStock: 15, unit: 'pcs', createdAt: now.toISOString() },
    { id: 'prod-demo-4', name: 'Keychron K2 Keyboard', sku: 'KEY-K2', category: 'Accessories', purchasePrice: 60, sellingPrice: 89, currentStock: 30, minStock: 10, unit: 'pcs', createdAt: now.toISOString() },
    { id: 'prod-demo-5', name: 'Enterprise Cloud License', sku: 'LIC-ENT-1Y', category: 'Software', purchasePrice: 500, sellingPrice: 1200, currentStock: 999, minStock: 10, unit: 'lic', createdAt: now.toISOString() },
    { id: 'prod-demo-6', name: 'Office 365 Sub', sku: 'LIC-O365', category: 'Software', purchasePrice: 80, sellingPrice: 120, currentStock: 999, minStock: 10, unit: 'lic', createdAt: now.toISOString() },
    { id: 'prod-demo-7', name: 'ErgoChair Pro', sku: 'FURN-ERGO', category: 'Furniture', purchasePrice: 300, sellingPrice: 499, currentStock: 4, minStock: 5, unit: 'pcs', createdAt: now.toISOString() },
    { id: 'prod-demo-8', name: 'Standing Desk Dual Motor', sku: 'FURN-DESK', category: 'Furniture', purchasePrice: 400, sellingPrice: 650, currentStock: 2, minStock: 5, unit: 'pcs', createdAt: now.toISOString() }
  ];

  const employees = [
    { id: 'emp-demo-1', name: 'Sarah Connor', employeeId: 'EMP-001', department: 'Engineering', designation: 'Lead Developer', status: 'Active', salary: 120000, joinDate: '2025-01-15' },
    { id: 'emp-demo-2', name: 'Michael Scott', employeeId: 'EMP-002', department: 'Sales', designation: 'Regional Manager', status: 'Active', salary: 85000, joinDate: '2025-02-01' },
    { id: 'emp-demo-3', name: 'Dwight Schrute', employeeId: 'EMP-003', department: 'Sales', designation: 'Assistant to RM', status: 'Active', salary: 65000, joinDate: '2025-03-10' },
    { id: 'emp-demo-4', name: 'Pam Beesly', employeeId: 'EMP-004', department: 'Admin', designation: 'Office Administrator', status: 'Active', salary: 50000, joinDate: '2025-04-20' }
  ];

  // Generate some realistic past dates for transactions
  const d1 = new Date(now); d1.setDate(d1.getDate() - 2);
  const d2 = new Date(now); d2.setDate(d2.getDate() - 5);
  const d3 = new Date(now); d3.setDate(d3.getDate() - 10);
  const d4 = new Date(now); d4.setDate(d4.getDate() - 15);
  const d5 = new Date(now); d5.setDate(d5.getDate() - 30);

  const transactions = [
    { id: 'txn-demo-1', type: 'Expense', category: 'Office Supplies', amount: 150.00, date: d1.toISOString().split('T')[0], narration: 'Printer ink and paper', partyId: 'supp-demo-3' },
    { id: 'txn-demo-2', type: 'Sale', category: 'Software', amount: 2400.00, date: d2.toISOString().split('T')[0], narration: 'Enterprise Cloud License x2', partyId: 'cust-demo-1' },
    { id: 'txn-demo-3', type: 'Expense', category: 'Software', amount: 299.99, date: d3.toISOString().split('T')[0], narration: 'GitHub Copilot Subs', partyId: '' },
    { id: 'txn-demo-4', type: 'Sale', category: 'Hardware', amount: 4998.00, date: d4.toISOString().split('T')[0], narration: 'MacBook Pro x2', partyId: 'cust-demo-2' },
    { id: 'txn-demo-5', type: 'Purchase', category: 'Hardware', amount: 4000.00, date: d5.toISOString().split('T')[0], narration: 'Restock MacBook Pros', partyId: 'supp-demo-1' },
  ];

  const invoices = [
    { id: 'inv-demo-1', invoiceNumber: 'INV-2026-001', customerId: 'cust-demo-1', date: d2.toISOString().split('T')[0], dueDate: d1.toISOString().split('T')[0], total: 2400.00, status: 'Paid', items: [{ productId: 'prod-demo-5', quantity: 2, price: 1200 }] },
    { id: 'inv-demo-2', invoiceNumber: 'INV-2026-002', customerId: 'cust-demo-2', date: d4.toISOString().split('T')[0], dueDate: d1.toISOString().split('T')[0], total: 4998.00, status: 'Overdue', items: [{ productId: 'prod-demo-1', quantity: 2, price: 2499 }] },
    { id: 'inv-demo-3', invoiceNumber: 'INV-2026-003', customerId: 'cust-demo-2', date: now.toISOString().split('T')[0], dueDate: now.toISOString().split('T')[0], total: 120.00, status: 'Draft', items: [{ productId: 'prod-demo-6', quantity: 1, price: 120 }] },
  ];

  return { customers, suppliers, inventory, employees, transactions, invoices };
};
