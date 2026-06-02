import { useEffect, useMemo, useState } from 'react';
import { normalizeAmount, sanitizeEmail, sanitizeText, validateEmail, validatePhone } from './security.js';
import { readScopedString, writeScopedString } from './storageScope.js';

const PRODUCT_KEY = 'erpProducts';
const STOCK_TXN_KEY = 'erpStockTransactions';
const INVOICE_KEY = 'erpInvoices';
const CUSTOMER_KEY = 'erpCustomers';
const SUPPLIER_KEY = 'erpSuppliers';
const BUSINESS_KEY = 'erpBusinesses';
const NOTIFICATION_KEY = 'erpNotifications';
const CLOUD_BACKUP_KEY = 'erpCloudBackupSettings';
const TERMS =
  'Goods once sold will not be returned. Payment is due as per invoice terms. This is a computer generated invoice.';

function readArray(key) {
  try {
    const value = JSON.parse(readScopedString(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  writeScopedString(key, JSON.stringify(value));
}

function readObject(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(readScopedString(key) || '{}') };
  } catch {
    return fallback;
  }
}

function writeObject(key, value) {
  writeScopedString(key, JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function monthKey(date) {
  return (date || today()).slice(0, 7);
}

function qrCells(seed) {
  const text = String(seed || 'invoice');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return Array.from({ length: 49 }, (_, index) => ((hash >> (index % 24)) + index * 7) % 3 === 0);
}

function InvoiceQr({ value }) {
  const cells = qrCells(value);
  return (
    <div className="qr-code" aria-label="Invoice QR code">
      {cells.map((active, index) => (
        <span className={active ? 'active' : ''} key={`${value}-${index}`} />
      ))}
    </div>
  );
}

function SmallBars({ data, valueKey, colorClass = 'primary' }) {
  const maxValue = Math.max(...data.map((item) => Math.abs(Number(item[valueKey]) || 0)), 1);
  return (
    <div className="erp-bars">
      {data.map((item) => (
        <div className="erp-bar-row" key={item.label}>
          <span>{item.label}</span>
          <div>
            <i className={colorClass} style={{ width: `${Math.max(4, (Math.abs(item[valueKey]) / maxValue) * 100)}%` }} />
          </div>
          <strong>{formatCurrency(item[valueKey])}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Phase2ERP({
  activeTab,
  profile,
  vouchers,
  ledgers,
  partySummary,
  cashBalance,
  netProfit,
  cloudCustomers,
  cloudSuppliers,
  cloudInventory,
  cloudUserId,
  peopleLoading,
  onStatus,
  onCloudRecord,
  onCloudDelete,
  onCloudSnapshot,
}) {
  const [products, setProducts] = useState(() => readArray(PRODUCT_KEY));
  const [stockTxns, setStockTxns] = useState(() => readArray(STOCK_TXN_KEY));
  const [invoices, setInvoices] = useState(() => readArray(INVOICE_KEY));
  const [customers, setCustomers] = useState(() => readArray(CUSTOMER_KEY));
  const [suppliers, setSuppliers] = useState(() => readArray(SUPPLIER_KEY));
  const [businesses, setBusinesses] = useState(() => readArray(BUSINESS_KEY));
  const [notifications, setNotifications] = useState(() => readArray(NOTIFICATION_KEY));
  const [peopleTab, setPeopleTab] = useState(activeTab === 'suppliers' ? 'suppliers' : 'customers');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [editingPerson, setEditingPerson] = useState(null);
  const [cloudSettings, setCloudSettings] = useState(() =>
    readObject(CLOUD_BACKUP_KEY, { connected: false, email: '', autoBackup: false, lastBackup: '' })
  );
  const [invoiceLine, setInvoiceLine] = useState({ productId: '', qty: 1, gst: 18, discount: 0 });
  const [invoiceDraft, setInvoiceDraft] = useState({
    customerId: '',
    status: 'Unpaid',
    dueDate: today(),
    terms: TERMS,
    lines: [],
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: `${today().slice(0, 7)}-01`, to: today() });
  const [activeBusinessId, setActiveBusinessId] = useState(() => readScopedString('activeBusinessId') || 'default');

  useEffect(() => writeArray(PRODUCT_KEY, products), [products]);
  useEffect(() => writeArray(STOCK_TXN_KEY, stockTxns), [stockTxns]);
  useEffect(() => writeArray(INVOICE_KEY, invoices), [invoices]);
  useEffect(() => writeArray(CUSTOMER_KEY, customers), [customers]);
  useEffect(() => writeArray(SUPPLIER_KEY, suppliers), [suppliers]);
  useEffect(() => writeArray(BUSINESS_KEY, businesses), [businesses]);
  useEffect(() => writeArray(NOTIFICATION_KEY, notifications), [notifications]);
  useEffect(() => writeObject(CLOUD_BACKUP_KEY, cloudSettings), [cloudSettings]);
  useEffect(() => {
    if (Array.isArray(cloudInventory) && cloudInventory.length > 0) {
      setProducts(cloudInventory);
    }
  }, [cloudInventory]);
  useEffect(() => {
    if (Array.isArray(cloudCustomers)) {
      setCustomers(cloudCustomers);
    }
  }, [cloudCustomers]);
  useEffect(() => {
    if (Array.isArray(cloudSuppliers)) {
      setSuppliers(cloudSuppliers);
    }
  }, [cloudSuppliers]);
  useEffect(() => {
    setPeopleTab(activeTab === 'suppliers' ? 'suppliers' : 'customers');
    setPeopleSearch('');
    setEditingPerson(null);
  }, [activeTab]);
  useEffect(() => {
    onCloudSnapshot?.('phase2_erp_updated');
  }, [products, stockTxns, invoices, customers, suppliers, businesses, notifications, cloudSettings]);

  const scopedProducts = useMemo(
    () => products.filter((product) => (product.businessId || 'default') === activeBusinessId),
    [activeBusinessId, products]
  );
  const scopedInvoices = useMemo(
    () => invoices.filter((invoice) => (invoice.businessId || 'default') === activeBusinessId),
    [activeBusinessId, invoices]
  );
  const scopedCustomers = useMemo(
    () => customers.filter((customer) => (customer.businessId || 'default') === activeBusinessId),
    [activeBusinessId, customers]
  );
  const scopedSuppliers = useMemo(
    () => suppliers.filter((supplier) => (supplier.businessId || 'default') === activeBusinessId),
    [activeBusinessId, suppliers]
  );

  const invoiceTotals = useMemo(() => scopedInvoices.reduce(
    (summary, invoice) => {
      summary.total += invoice.total || 0;
      if (invoice.status === 'Paid') summary.paid += invoice.total || 0;
      if (invoice.status === 'Unpaid' || invoice.status === 'Partial Paid') summary.outstanding += invoice.balance || invoice.total || 0;
      return summary;
    },
    { total: 0, paid: 0, outstanding: 0 }
  ), [scopedInvoices]);

  const inventoryStats = useMemo(() => {
    const value = scopedProducts.reduce((total, product) => total + product.currentStock * product.purchasePrice, 0);
    return {
      totalProducts: scopedProducts.length,
      value,
      lowStock: scopedProducts.filter((product) => product.currentStock > 0 && product.currentStock <= product.minStock).length,
      outOfStock: scopedProducts.filter((product) => product.currentStock <= 0).length,
    };
  }, [scopedProducts]);

  const gstSummary = useMemo(() => {
    const filteredInvoices = scopedInvoices.filter((invoice) => invoice.date >= dateFilter.from && invoice.date <= dateFilter.to);
    const taxableSales = filteredInvoices.reduce((sum, invoice) => sum + (invoice.taxable || 0), 0);
    const gst = filteredInvoices.reduce((sum, invoice) => sum + (invoice.gstTotal || 0), 0);
    const taxablePurchases = vouchers
      .filter((voucher) => voucher.type === 'Purchase' && voucher.date >= dateFilter.from && voucher.date <= dateFilter.to)
      .reduce((sum, voucher) => sum + voucher.amount, 0);
    return {
      taxableSales,
      taxablePurchases,
      cgst: gst / 2,
      sgst: gst / 2,
      igst: 0,
      salesReport: filteredInvoices,
    };
  }, [dateFilter.from, dateFilter.to, scopedInvoices, vouchers]);

  const erpAI = useMemo(() => {
    const byProduct = {};
    scopedInvoices.forEach((invoice) => {
      invoice.lines.forEach((line) => {
        byProduct[line.productId] = (byProduct[line.productId] || 0) + Number(line.qty || 0);
      });
    });
    const productVelocity = scopedProducts
      .map((product) => ({ ...product, soldQty: byProduct[product.id] || 0 }))
      .sort((a, b) => b.soldQty - a.soldQty);
    const overdue = scopedInvoices.filter((invoice) => invoice.status !== 'Paid' && invoice.dueDate < today());
    const bestProducts = productVelocity.filter((product) => product.soldQty > 0).slice(0, 5);
    const deadStock = productVelocity.filter((product) => product.soldQty === 0 && product.currentStock > 0);
    const score = Math.max(
      10,
      Math.min(
        100,
        70 +
          (netProfit > 0 ? 12 : -12) +
          (cashBalance > 0 ? 8 : -10) -
          overdue.length * 4 -
          inventoryStats.lowStock * 2
      )
    );
    return {
      score,
      bestProducts,
      slowProducts: productVelocity.slice(-5).reverse(),
      deadStock,
      lowStock: scopedProducts.filter((product) => product.currentStock <= product.minStock),
      overdue,
      riskAlerts: [
        ...overdue.slice(0, 3).map((invoice) => `Invoice ${invoice.invoiceNo} overdue: ${formatCurrency(invoice.balance || invoice.total)}`),
        ...scopedProducts
          .filter((product) => product.currentStock <= product.minStock)
          .slice(0, 3)
          .map((product) => `${product.name} low stock: ${product.currentStock} ${product.unit}`),
      ],
      recommendations: [
        invoiceTotals.outstanding > 0 ? `Collect ${formatCurrency(invoiceTotals.outstanding)} pending invoice balance.` : 'Collections are clean.',
        deadStock.length > 0 ? `Review ${deadStock.length} dead stock products for discount or bundling.` : 'No dead stock pressure detected.',
        gstSummary.cgst + gstSummary.sgst > 0 ? `Reserve ${formatCurrency(gstSummary.cgst + gstSummary.sgst)} for GST liability.` : 'GST liability is low for selected period.',
      ],
    };
  }, [cashBalance, gstSummary.cgst, gstSummary.sgst, inventoryStats.lowStock, invoiceTotals.outstanding, netProfit, scopedInvoices, scopedProducts]);

  const analytics = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const key = date.toISOString().slice(0, 7);
      return { key, label: date.toLocaleString('en-IN', { month: 'short' }), revenue: 0, expense: 0, profit: 0 };
    });
    months.forEach((month) => {
      month.revenue = scopedInvoices
        .filter((invoice) => monthKey(invoice.date) === month.key)
        .reduce((sum, invoice) => sum + invoice.total, 0);
      month.expense = vouchers
        .filter((voucher) => monthKey(voucher.date) === month.key && (voucher.type === 'Payment' || voucher.type === 'Purchase'))
        .reduce((sum, voucher) => sum + voucher.amount, 0);
      month.profit = month.revenue - month.expense;
    });
    return months;
  }, [scopedInvoices, vouchers]);

  const productPerformance = useMemo(() => erpAI.bestProducts.map((product) => ({
    label: product.name,
    value: product.soldQty * product.sellingPrice,
  })), [erpAI.bestProducts]);

  const addNotification = (title, body, type = 'System') => {
    const next = [{ id: createId('ntf'), title, body, type, date: new Date().toLocaleString(), read: false }, ...notifications].slice(0, 50);
    setNotifications(next);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get('image');
    const product = {
      id: createId('prd'),
      businessId: activeBusinessId,
      name: sanitizeText(form.get('name'), 120),
      category: sanitizeText(form.get('category'), 80) || 'General',
      sku: sanitizeText(form.get('sku'), 60) || `SKU-${Date.now().toString().slice(-5)}`,
      image: image?.size ? await fileToDataUrl(image) : '',
      purchasePrice: normalizeAmount(form.get('purchasePrice')),
      sellingPrice: normalizeAmount(form.get('sellingPrice')),
      currentStock: normalizeAmount(form.get('currentStock')),
      minStock: normalizeAmount(form.get('minStock')),
      unit: sanitizeText(form.get('unit'), 24) || 'pcs',
      createdAt: new Date().toISOString(),
    };
    if (!product.name) {
      onStatus('Product name required');
      return;
    }

    try {
      const saved = await onCloudRecord?.('inventory', product.id, {
        ...product,
        itemId: product.id,
      });
      if (!saved) {
        throw new Error('Inventory save failed');
      }
      setProducts([product, ...products]);
      addNotification('Product added', `${product.name} added with stock ${product.currentStock}.`, 'Inventory');
      event.currentTarget.reset();
      onStatus('Product saved');
    } catch (error) {
      onStatus(error?.message || 'Inventory save failed');
    }
  };

  const stockTransaction = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = form.get('productId');
    const type = form.get('type');
    const qty = normalizeAmount(form.get('qty'));
    if (!productId || qty <= 0) {
      onStatus('Select product and quantity');
      return;
    }
    const updatedProducts = products.map((product) => {
      if (product.id !== productId) return product;
      const nextStock = type === 'Stock Out' ? product.currentStock - qty : type === 'Adjustment' ? qty : product.currentStock + qty;
      return { ...product, currentStock: Math.max(0, nextStock) };
    });
    const updatedProduct = updatedProducts.find((product) => product.id === productId);
    if (updatedProduct) {
      try {
        const saved = await onCloudRecord?.('inventory', updatedProduct.id, {
          ...updatedProduct,
          itemId: updatedProduct.id,
        });
        if (!saved) {
          throw new Error('Stock update failed');
        }
      } catch (error) {
        onStatus(error?.message || 'Stock update failed');
        return;
      }
    }
    setProducts(updatedProducts);
    setStockTxns([
      { id: createId('stk'), businessId: activeBusinessId, productId, type, qty, note: sanitizeText(form.get('note'), 180), date: today() },
      ...stockTxns,
    ]);
    event.currentTarget.reset();
    onStatus('Stock updated');
  };

  const contactPhone = (person) => person.phone || person.mobile || '';

  const personMatchesSearch = (person) => {
    const query = peopleSearch.trim().toLowerCase();
    if (!query) return true;
    return [person.name, contactPhone(person), person.email, person.address, person.gst, person.notes]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const savePerson = async (event, kind) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isCustomer = kind === 'customer';
    const current = editingPerson?.type === kind ? editingPerson : null;
    const id = current?.id || createId(isCustomer ? 'cus' : 'sup');
    const name = sanitizeText(form.get('name'), 120);
    const phone = sanitizeText(form.get('phone'), 24);
    const email = sanitizeEmail(form.get('email'));
    const openingBalance = normalizeAmount(form.get('openingBalance'));
    const amountField = isCustomer ? 'outstandingAmount' : 'payableAmount';
    const amountValue = normalizeAmount(form.get(amountField));
    const collectionName = isCustomer ? 'customers' : 'suppliers';
    const path = cloudUserId ? `users/${cloudUserId}/${collectionName}/${id}` : `${collectionName}/${id}`;

    if (!name) {
      onStatus(`${isCustomer ? 'Customer' : 'Supplier'} name required`);
      return;
    }
    if (email && !validateEmail(email)) {
      onStatus('Enter valid email');
      return;
    }
    if (!validatePhone(phone)) {
      onStatus(`Enter valid ${isCustomer ? 'customer' : 'supplier'} phone`);
      return;
    }

    const person = {
      id,
      [isCustomer ? 'customerId' : 'supplierId']: id,
      businessId: activeBusinessId,
      name,
      phone,
      mobile: phone,
      email,
      address: sanitizeText(form.get('address'), 240),
      gst: sanitizeText(form.get('gst'), 32),
      openingBalance,
      [amountField]: amountValue,
      type: kind,
      notes: sanitizeText(form.get('notes'), 500),
      createdAt: current?.createdAt || new Date().toISOString(),
    };

    console.info('FIRESTORE_PATH_USED', { feature: `${kind}_save`, path });
    if (isCustomer) {
      console.info('CUSTOMER_SAVE_START', { path, customerId: id, isUpdate: Boolean(current) });
    }

    try {
      const saved = await onCloudRecord?.(collectionName, id, person);
      if (!saved) {
        throw new Error(`Firestore save failed for ${path}`);
      }

      if (isCustomer) {
        setCustomers((items) => [person, ...items.filter((item) => item.id !== id)]);
        console.info(current ? 'CUSTOMER_UPDATE_SUCCESS' : 'CUSTOMER_SAVE_SUCCESS', { path, customerId: id });
      } else {
        setSuppliers((items) => [person, ...items.filter((item) => item.id !== id)]);
        console.info(current ? 'SUPPLIER_UPDATE_SUCCESS' : 'SUPPLIER_SAVE_SUCCESS', { path, supplierId: id });
      }
      setEditingPerson(null);
      event.currentTarget.reset();
      onStatus(`${isCustomer ? 'Customer' : 'Supplier'} ${current ? 'updated' : 'saved'}`);
    } catch (error) {
      onStatus(error.message || `${isCustomer ? 'Customer' : 'Supplier'} save failed`);
    }
  };

  const editPerson = (person, kind) => {
    setPeopleTab(kind === 'supplier' ? 'suppliers' : 'customers');
    setEditingPerson({ ...person, type: kind });
  };

  const deletePerson = async (person, kind) => {
    const isCustomer = kind === 'customer';
    if (!confirm(`Delete ${isCustomer ? 'customer' : 'supplier'} "${person.name}"?`)) {
      return;
    }

    const collectionName = isCustomer ? 'customers' : 'suppliers';
    const path = cloudUserId ? `users/${cloudUserId}/${collectionName}/${person.id}` : `${collectionName}/${person.id}`;
    console.info('FIRESTORE_PATH_USED', { feature: `${kind}_delete`, path });

    try {
      const deleted = await onCloudDelete?.(collectionName, person.id);
      if (!deleted) {
        throw new Error(`Firestore delete failed for ${path}`);
      }
      if (isCustomer) {
        setCustomers((items) => items.filter((item) => item.id !== person.id));
        console.info('CUSTOMER_DELETE_SUCCESS', { path, customerId: person.id });
      } else {
        setSuppliers((items) => items.filter((item) => item.id !== person.id));
        console.info('SUPPLIER_DELETE_SUCCESS', { path, supplierId: person.id });
      }
      if (editingPerson?.id === person.id) {
        setEditingPerson(null);
      }
      onStatus(`${isCustomer ? 'Customer' : 'Supplier'} deleted`);
    } catch (error) {
      onStatus(error.message || `${isCustomer ? 'Customer' : 'Supplier'} delete failed`);
    }
  };

  const addInvoiceLine = () => {
    const product = scopedProducts.find((item) => item.id === invoiceLine.productId);
    if (!product) {
      onStatus('Select product');
      return;
    }
    const qty = Math.max(1, normalizeAmount(invoiceLine.qty) || 1);
    const rate = product.sellingPrice;
    const discount = normalizeAmount(invoiceLine.discount);
    const gst = normalizeAmount(invoiceLine.gst);
    const taxable = Math.max(0, qty * rate - discount);
    const gstAmount = (taxable * gst) / 100;
    setInvoiceDraft({
      ...invoiceDraft,
      lines: [
        ...invoiceDraft.lines,
        {
          id: createId('line'),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          qty,
          rate,
          discount,
          gst,
          taxable,
          gstAmount,
          total: taxable + gstAmount,
        },
      ],
    });
    setInvoiceLine({ productId: '', qty: 1, gst: 18, discount: 0 });
  };

  const saveInvoice = async (event) => {
    event.preventDefault();
    if (!invoiceDraft.customerId || invoiceDraft.lines.length === 0) {
      onStatus('Select customer and add products');
      return;
    }
    const taxable = invoiceDraft.lines.reduce((sum, line) => sum + line.taxable, 0);
    const gstTotal = invoiceDraft.lines.reduce((sum, line) => sum + line.gstAmount, 0);
    const total = invoiceDraft.lines.reduce((sum, line) => sum + line.total, 0);
    const paid = invoiceDraft.status === 'Paid' ? total : invoiceDraft.status === 'Partial Paid' ? total / 2 : 0;
    const invoice = {
      ...invoiceDraft,
      terms: sanitizeText(invoiceDraft.terms, 360) || TERMS,
      id: editingInvoiceId || createId('inv'),
      businessId: activeBusinessId,
      invoiceNo: editingInvoiceId
        ? scopedInvoices.find((item) => item.id === editingInvoiceId)?.invoiceNo
        : `INV-${new Date().getFullYear()}-${String(scopedInvoices.length + 1).padStart(4, '0')}`,
      date: today(),
      taxable,
      gstTotal,
      total,
      paid,
      balance: total - paid,
    };
    setInvoices(editingInvoiceId ? invoices.map((item) => (item.id === editingInvoiceId ? invoice : item)) : [invoice, ...invoices]);
    const productsAfterInvoice = products.map((product) => {
      const sold = invoice.lines.filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.qty, 0);
      return sold ? { ...product, currentStock: Math.max(0, product.currentStock - sold) } : product;
    });
    const affectedProducts = productsAfterInvoice
      .filter((product) => invoice.lines.some((line) => line.productId === product.id));
    try {
      await Promise.all(affectedProducts.map(async (product) => {
        const saved = await onCloudRecord?.('inventory', product.id, {
          ...product,
          itemId: product.id,
        });
        if (!saved) {
          throw new Error('Invoice stock update failed');
        }
      }));
    } catch (error) {
      onStatus(error?.message || 'Invoice stock update failed');
      return;
    }
    setProducts(productsAfterInvoice);
    if (invoice.dueDate < today() && invoice.status !== 'Paid') {
      addNotification('Overdue invoice risk', `${invoice.invoiceNo} is due on ${invoice.dueDate}.`, 'Invoice');
    }
    setInvoiceDraft({ customerId: '', status: 'Unpaid', dueDate: today(), terms: TERMS, lines: [] });
    setEditingInvoiceId('');
    onStatus('Invoice saved');
  };

  const editInvoice = (invoice) => {
    setInvoiceDraft({
      customerId: invoice.customerId,
      status: invoice.status,
      dueDate: invoice.dueDate,
      terms: invoice.terms || TERMS,
      lines: invoice.lines || [],
    });
    setEditingInvoiceId(invoice.id);
    onStatus(`Editing ${invoice.invoiceNo}`);
  };

  const deleteInvoice = (invoiceId) => {
    setInvoices(invoices.filter((invoice) => invoice.id !== invoiceId));
    onStatus('Invoice deleted');
  };

  const customerName = (customerId) => scopedCustomers.find((customer) => customer.id === customerId)?.name || 'Customer';

  const invoiceText = (invoice) => [
    `${profile.name}`,
    `Invoice: ${invoice.invoiceNo}`,
    `Customer: ${customerName(invoice.customerId)}`,
    `Date: ${invoice.date}`,
    `Total: ${formatCurrency(invoice.total)}`,
    `Status: ${invoice.status}`,
    `Due: ${invoice.dueDate}`,
  ].join('\n');

  const shareInvoiceWhatsApp = (invoice) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(invoiceText(invoice))}`, '_blank', 'noopener,noreferrer');
  };

  const emailInvoice = (invoice) => {
    const customer = scopedCustomers.find((item) => item.id === invoice.customerId);
    window.location.href = `mailto:${customer?.email || ''}?subject=${encodeURIComponent(invoice.invoiceNo)}&body=${encodeURIComponent(invoiceText(invoice))}`;
  };

  const printInvoice = (invoice) => {
    const customer = scopedCustomers.find((item) => item.id === invoice.customerId) || {};
    const win = window.open('', '_blank', 'width=900,height=900');
    if (!win) {
      onStatus('Allow popups to print invoice');
      return;
    }

    const doc = win.document;
    doc.title = invoice.invoiceNo;
    const style = doc.createElement('style');
    style.textContent = [
      'body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }',
      '.head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; }',
      '.logo { width: 72px; height: 72px; object-fit: contain; }',
      'table { width: 100%; border-collapse: collapse; margin-top: 22px; }',
      'th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }',
      '.total { text-align: right; margin-top: 18px; font-size: 20px; font-weight: 700; }',
      '.signature { margin-top: 80px; text-align: right; }',
    ].join('\n');
    doc.head.append(style);

    const head = doc.createElement('div');
    head.className = 'head';
    const left = doc.createElement('div');
    if (profile.logo) {
      const logo = doc.createElement('img');
      logo.className = 'logo';
      logo.alt = '';
      logo.src = profile.logo;
      left.append(logo);
    }
    const businessName = doc.createElement('h1');
    businessName.textContent = profile.name;
    const businessAddress = doc.createElement('p');
    businessAddress.textContent = profile.address || profile.tagline;
    const gst = doc.createElement('p');
    gst.textContent = `GSTIN: ${profile.gstin || ''}`;
    left.append(businessName, businessAddress, gst);

    const right = doc.createElement('div');
    [['h2', invoice.invoiceNo], ['p', `Date: ${invoice.date}`], ['p', `Status: ${invoice.status}`], ['p', `Due: ${invoice.dueDate}`]]
      .forEach(([tag, value]) => {
        const node = doc.createElement(tag);
        node.textContent = value;
        right.append(node);
      });
    head.append(left, right);
    doc.body.append(head);

    const billTitle = doc.createElement('h3');
    billTitle.textContent = 'Bill To';
    const billTo = doc.createElement('p');
    billTo.textContent = [customer.name, customer.mobile, customer.address, customer.gst ? `GST: ${customer.gst}` : ''].filter(Boolean).join('\n');
    doc.body.append(billTitle, billTo);

    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');
    ['Product', 'Qty', 'Rate', 'GST', 'Total'].forEach((label) => {
      const th = doc.createElement('th');
      th.textContent = label;
      headerRow.append(th);
    });
    thead.append(headerRow);
    const tbody = doc.createElement('tbody');
    invoice.lines.forEach((line) => {
      const row = doc.createElement('tr');
      [line.name, line.qty, formatCurrency(line.rate), `${line.gst}%`, formatCurrency(line.total)].forEach((value) => {
        const cell = doc.createElement('td');
        cell.textContent = String(value ?? '');
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(thead, tbody);
    doc.body.append(table);

    const total = doc.createElement('p');
    total.className = 'total';
    total.textContent = `Grand Total: ${formatCurrency(invoice.total)}`;
    const terms = doc.createElement('p');
    terms.textContent = `Terms: ${invoice.terms || TERMS}`;
    const signature = doc.createElement('div');
    signature.className = 'signature';
    signature.textContent = 'Authorized Signature';
    doc.body.append(total, terms, signature);
    win.setTimeout(() => win.print(), 50);
  };

  const addBusiness = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const business = { id: createId('biz'), name: form.get('name').trim(), type: form.get('type').trim() };
    if (!business.name) return;
    setBusinesses([business, ...businesses]);
    setActiveBusinessId(business.id);
    writeScopedString('activeBusinessId', business.id);
    event.currentTarget.reset();
  };

  const switchBusiness = (businessId) => {
    setActiveBusinessId(businessId);
    writeScopedString('activeBusinessId', businessId);
    onStatus('Business switched');
  };

  const manualCloudBackup = () => {
    const snapshot = {
      createdAt: new Date().toISOString(),
      products,
      stockTxns,
      invoices,
      customers,
      suppliers,
      businesses,
      vouchers,
      ledgers,
      profile,
    };
    writeScopedString('erpLastCloudBackup', JSON.stringify(snapshot));
    setCloudSettings({ ...cloudSettings, lastBackup: new Date().toLocaleString() });
    addNotification('Backup complete', 'Local cloud backup package prepared.', 'Backup');
    onStatus('Backup completed');
  };

  const connectGoogle = (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email').trim();
    if (!email) return;
    setCloudSettings({ ...cloudSettings, connected: true, email });
    addNotification('Google backup connected', `${email} connected for backup settings.`, 'Backup');
  };

  if (activeTab === 'inventory') {
    return (
      <section className="phase2-stack fade-in" id="inventory">
        <div className="erp-hero">
          <div>
            <span className="eyebrow">Inventory Management</span>
            <h2>Product master, stock control, and AI inventory alerts</h2>
          </div>
          <div className="erp-hero-actions">
            <strong>{inventoryStats.totalProducts} products</strong>
            <span>{formatCurrency(inventoryStats.value)} inventory value</span>
          </div>
        </div>
        <div className="summary-grid report-summary">
          <div className="summary-card"><span>Total Products</span><strong>{inventoryStats.totalProducts}</strong></div>
          <div className="summary-card"><span>Inventory Value</span><strong>{formatCurrency(inventoryStats.value)}</strong></div>
          <div className="summary-card"><span>Low Stock</span><strong>{inventoryStats.lowStock}</strong></div>
          <div className="summary-card"><span>Out Of Stock</span><strong>{inventoryStats.outOfStock}</strong></div>
        </div>
        <section className="content-grid">
          <article className="panel">
            <h2>Product Master</h2>
            <form onSubmit={saveProduct}>
              <div className="form-grid">
                <input name="name" placeholder="Product name" />
                <input name="category" placeholder="Category" />
                <input name="sku" placeholder="SKU code" />
                <select name="unit" defaultValue="pcs">
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kg</option>
                  <option value="ltr">Litre</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                </select>
                <input name="purchasePrice" type="number" placeholder="Purchase price" />
                <input name="sellingPrice" type="number" placeholder="Selling price" />
                <input name="currentStock" type="number" placeholder="Current stock" />
                <input name="minStock" type="number" placeholder="Minimum stock" />
                <div className="wide-field"><input name="image" type="file" accept="image/*" /></div>
              </div>
              <button className="manual-button" type="submit">Save Product</button>
            </form>
          </article>
          <article className="panel">
            <h2>Stock Transactions</h2>
            <form onSubmit={stockTransaction}>
              <div className="form-grid">
                <select name="productId">
                  <option value="">Select product</option>
                  {scopedProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <select name="type">
                  <option>Stock In</option>
                  <option>Stock Out</option>
                  <option>Adjustment</option>
                </select>
                <input name="qty" type="number" placeholder="Quantity" />
                <input name="note" placeholder="Reason / note" />
              </div>
              <button className="secondary-button" type="submit">Update Stock</button>
            </form>
            <div className="suggestion-list">
              {erpAI.lowStock.slice(0, 4).map((product) => <div key={product.id}>Low stock alert: {product.name} has {product.currentStock} {product.unit}</div>)}
            </div>
          </article>
        </section>
        <section className="panel">
          <h2>Inventory List</h2>
          <div className="erp-table-wrap">
            <table className="statement-table">
              <thead><tr><th>Product</th><th>Category</th><th>SKU</th><th>Stock</th><th>Purchase</th><th>Selling</th><th>Value</th></tr></thead>
              <tbody>
                {scopedProducts.map((product) => (
                  <tr key={product.id}>
                    <td><div className="product-cell">{product.image && <img src={product.image} alt="" />}<strong>{product.name}</strong></div></td>
                    <td>{product.category}</td>
                    <td>{product.sku}</td>
                    <td>{product.currentStock} {product.unit}</td>
                    <td>{formatCurrency(product.purchasePrice)}</td>
                    <td>{formatCurrency(product.sellingPrice)}</td>
                    <td>{formatCurrency(product.currentStock * product.purchasePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>AI Inventory Insights</h2>
          <div className="ai-checker-grid">
            <div className="ai-list good"><h3>Fast Moving</h3>{erpAI.bestProducts.map((p) => <p key={p.id}>{p.name}: {p.soldQty} sold</p>)}</div>
            <div className="ai-list watch"><h3>Slow / Dead Stock</h3>{erpAI.deadStock.slice(0, 6).map((p) => <p key={p.id}>{p.name}: no sales recorded</p>)}</div>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'invoices') {
    return (
      <section className="phase2-stack fade-in" id="invoices">
        <div className="erp-hero">
          <div><span className="eyebrow">Invoice System</span><h2>Professional GST invoices with PDF, WhatsApp, and email sharing</h2></div>
          <div className="erp-hero-actions"><strong>{formatCurrency(invoiceTotals.total)}</strong><span>Total billed</span></div>
        </div>
        <section className="content-grid">
          <article className="panel">
            <h2>{editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}</h2>
            <form onSubmit={saveInvoice}>
              <div className="form-grid">
                <select value={invoiceDraft.customerId} onChange={(event) => setInvoiceDraft({ ...invoiceDraft, customerId: event.target.value })}>
                  <option value="">Select customer</option>
                  {scopedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
                <select value={invoiceDraft.status} onChange={(event) => setInvoiceDraft({ ...invoiceDraft, status: event.target.value })}>
                  <option>Draft</option><option>Paid</option><option>Partial Paid</option><option>Unpaid</option>
                </select>
                <input type="date" value={invoiceDraft.dueDate} onChange={(event) => setInvoiceDraft({ ...invoiceDraft, dueDate: event.target.value })} />
                <input value={invoiceDraft.terms} onChange={(event) => setInvoiceDraft({ ...invoiceDraft, terms: event.target.value })} />
              </div>
              <div className="invoice-line-builder">
                <select value={invoiceLine.productId} onChange={(event) => setInvoiceLine({ ...invoiceLine, productId: event.target.value })}>
                  <option value="">Product</option>
                  {scopedProducts.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.currentStock})</option>)}
                </select>
                <input type="number" value={invoiceLine.qty} onChange={(event) => setInvoiceLine({ ...invoiceLine, qty: event.target.value })} placeholder="Qty" />
                <input type="number" value={invoiceLine.gst} onChange={(event) => setInvoiceLine({ ...invoiceLine, gst: event.target.value })} placeholder="GST %" />
                <input type="number" value={invoiceLine.discount} onChange={(event) => setInvoiceLine({ ...invoiceLine, discount: event.target.value })} placeholder="Discount" />
                <button className="secondary-button" type="button" onClick={addInvoiceLine}>Add</button>
              </div>
              <div className="compact-list">
                {invoiceDraft.lines.map((line) => (
                  <article className="compact-item" key={line.id}><span>{line.name} x {line.qty}</span><strong>{formatCurrency(line.total)}</strong></article>
                ))}
              </div>
              <button className="manual-button" type="submit">Save Invoice</button>
            </form>
          </article>
          <article className="panel invoice-preview">
            <h2>Invoice Design Preview</h2>
            <div className="invoice-paper">
              <div className="invoice-head">
                {profile.logo && <img src={profile.logo} alt="" />}
                <div><strong>{profile.name}</strong><span>{profile.address || profile.tagline}</span><span>GSTIN: {profile.gstin || 'Not set'}</span></div>
                <InvoiceQr value={editingInvoiceId || 'draft'} />
              </div>
              <p>Customer: {customerName(invoiceDraft.customerId)}</p>
              <p>Terms: {invoiceDraft.terms}</p>
              <div className="signature-box">Signature Area</div>
            </div>
          </article>
        </section>
        <section className="panel">
          <h2>Invoice History</h2>
          <div className="erp-table-wrap">
            <table className="statement-table">
              <thead><tr><th>No</th><th>Customer</th><th>Status</th><th>Total</th><th>Due</th><th>Actions</th></tr></thead>
              <tbody>
                {scopedInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNo}</td>
                    <td>{customerName(invoice.customerId)}</td>
                    <td><span className={`status-pill ${invoice.status.toLowerCase().replaceAll(' ', '-')}`}>{invoice.status}</span></td>
                    <td>{formatCurrency(invoice.total)}</td>
                    <td>{invoice.dueDate}</td>
                    <td>
                      <div className="voucher-actions">
                        <button className="share-entry-button" type="button" onClick={() => editInvoice(invoice)}>Edit</button>
                        <button className="share-entry-button" type="button" onClick={() => printInvoice(invoice)}>PDF</button>
                        <button className="share-entry-button" type="button" onClick={() => shareInvoiceWhatsApp(invoice)}>WhatsApp</button>
                        <button className="share-entry-button" type="button" onClick={() => emailInvoice(invoice)}>Email</button>
                        <button className="delete-entry-button" type="button" onClick={() => deleteInvoice(invoice.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'gst') {
    return (
      <section className="phase2-stack fade-in" id="gst">
        <div className="erp-hero"><div><span className="eyebrow">GST Center</span><h2>GST dashboard, sales tax report, and purchase summary</h2></div></div>
        <div className="filter-row">
          <input type="date" value={dateFilter.from} onChange={(event) => setDateFilter({ ...dateFilter, from: event.target.value })} />
          <input type="date" value={dateFilter.to} onChange={(event) => setDateFilter({ ...dateFilter, to: event.target.value })} />
          <button className="secondary-button compact-button" type="button" onClick={() => window.print()}>Export Report PDF</button>
        </div>
        <div className="summary-grid report-summary">
          <div className="summary-card"><span>Taxable Sales</span><strong>{formatCurrency(gstSummary.taxableSales)}</strong></div>
          <div className="summary-card"><span>Taxable Purchases</span><strong>{formatCurrency(gstSummary.taxablePurchases)}</strong></div>
          <div className="summary-card"><span>CGST</span><strong>{formatCurrency(gstSummary.cgst)}</strong></div>
          <div className="summary-card"><span>SGST</span><strong>{formatCurrency(gstSummary.sgst)}</strong></div>
        </div>
        <section className="panel"><h2>Sales GST Report</h2><SmallBars data={gstSummary.salesReport.map((invoice) => ({ label: invoice.invoiceNo, value: invoice.gstTotal }))} valueKey="value" colorClass="warning" /></section>
      </section>
    );
  }

  if (activeTab === 'crm' || activeTab === 'suppliers') {
    const isCustomer = peopleTab === 'customers';
    const list = (isCustomer ? scopedCustomers : scopedSuppliers).filter(personMatchesSearch);
    const formKind = isCustomer ? 'customer' : 'supplier';
    const currentEdit = editingPerson?.type === formKind ? editingPerson : null;
    return (
      <section className="phase2-stack fade-in" id={activeTab}>
        <div className="erp-hero"><div><span className="eyebrow">People Management</span><h2>Customer and supplier profiles synced to Firestore</h2></div></div>
        <div className="analytics-filter">
          <button className={peopleTab === 'customers' ? 'active' : ''} type="button" onClick={() => { setPeopleTab('customers'); setEditingPerson(null); }}>
            Customers
          </button>
          <button className={peopleTab === 'suppliers' ? 'active' : ''} type="button" onClick={() => { setPeopleTab('suppliers'); setEditingPerson(null); }}>
            Suppliers
          </button>
        </div>
        <section className="content-grid">
          <article className="panel">
            <h2>{currentEdit ? `Edit ${isCustomer ? 'Customer' : 'Supplier'}` : `Add ${isCustomer ? 'Customer' : 'Supplier'}`}</h2>
            <form onSubmit={(event) => savePerson(event, formKind)} key={`${formKind}-${currentEdit?.id || 'new'}`}>
              <div className="form-grid">
                <input name="name" defaultValue={currentEdit?.name || ''} placeholder="Name" />
                <input name="phone" defaultValue={contactPhone(currentEdit || {})} placeholder="Phone" />
                <input name="email" type="email" defaultValue={currentEdit?.email || ''} placeholder="Email" />
                <input name="gst" defaultValue={currentEdit?.gst || ''} placeholder="GST Number" />
                <input name="openingBalance" type="number" defaultValue={currentEdit?.openingBalance || ''} placeholder="Opening balance" />
                {isCustomer ? (
                  <input name="outstandingAmount" type="number" defaultValue={currentEdit?.outstandingAmount ?? currentEdit?.outstanding ?? ''} placeholder="Outstanding amount" />
                ) : (
                  <input name="payableAmount" type="number" defaultValue={currentEdit?.payableAmount || ''} placeholder="Payable amount" />
                )}
                <div className="wide-field"><textarea name="address" defaultValue={currentEdit?.address || ''} placeholder="Address" /></div>
                <div className="wide-field"><textarea name="notes" defaultValue={currentEdit?.notes || ''} placeholder="Notes" /></div>
              </div>
              <div className="inline-actions">
                <button className="manual-button" type="submit">
                  {currentEdit ? `Update ${isCustomer ? 'Customer' : 'Supplier'}` : `Save ${isCustomer ? 'Customer' : 'Supplier'}`}
                </button>
                {currentEdit && (
                  <button className="secondary-button compact-button" type="button" onClick={() => setEditingPerson(null)}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </article>
          <article className="panel">
            <h2>{isCustomer ? 'Customer Dashboard' : 'Supplier Dashboard'}</h2>
            <div className="summary-grid report-summary">
              <div className="summary-card"><span>Total Profiles</span><strong>{isCustomer ? scopedCustomers.length : scopedSuppliers.length}</strong></div>
              <div className="summary-card"><span>Invoices</span><strong>{isCustomer ? scopedInvoices.length : vouchers.filter((v) => v.type === 'Purchase').length}</strong></div>
              <div className="summary-card"><span>{isCustomer ? 'Outstanding' : 'Payable'}</span><strong>{formatCurrency(isCustomer ? scopedCustomers.reduce((sum, item) => sum + (Number(item.outstandingAmount ?? item.outstanding) || 0), 0) : scopedSuppliers.reduce((sum, item) => sum + (Number(item.payableAmount) || 0), 0))}</strong></div>
              <div className="summary-card"><span>Last Transaction</span><strong>{scopedInvoices[0]?.date || 'None'}</strong></div>
            </div>
          </article>
        </section>
        <section className="panel">
          <div className="section-header">
            <div>
              <h2>{isCustomer ? 'Customers' : 'Suppliers'}</h2>
              <p className="panel-hint">
                {isCustomer ? 'Loaded from users/{uid}/customers' : 'Loaded from users/{uid}/suppliers'}
              </p>
            </div>
            <input
              aria-label={`Search ${isCustomer ? 'customers' : 'suppliers'}`}
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder={`Search ${isCustomer ? 'customers' : 'suppliers'}`}
            />
          </div>
          {peopleLoading && <div className="notice">Loading {isCustomer ? 'customers' : 'suppliers'} from Firestore...</div>}
          {list.length === 0 && !peopleLoading ? (
            <div className="empty-state">
              {isCustomer ? 'No customers yet. Add your first customer.' : 'No suppliers yet. Add your first supplier.'}
            </div>
          ) : (
            <>
              <div className="people-table-wrap">
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>{isCustomer ? 'Outstanding' : 'Payable'}</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{contactPhone(item) || '-'}</td>
                        <td>{item.email || '-'}</td>
                        <td>{formatCurrency(isCustomer ? item.outstandingAmount ?? item.outstanding ?? 0 : item.payableAmount || 0)}</td>
                        <td>{item.address || '-'}</td>
                        <td>
                          <div className="voucher-actions">
                            <button className="share-entry-button" type="button" onClick={() => editPerson(item, formKind)}>Edit</button>
                            <button className="delete-entry-button" type="button" onClick={() => deletePerson(item, formKind)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="compact-list people-card-list">
                {list.map((item) => (
              <article className="compact-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{contactPhone(item)} {item.email ? `· ${item.email}` : ''} {item.gst ? `· GST ${item.gst}` : ''}</p>
                  <p>{item.address || 'No address'} {item.notes ? `· ${item.notes}` : ''}</p>
                  <p>
                    {isCustomer
                      ? `Outstanding: ${formatCurrency(item.outstandingAmount ?? item.outstanding ?? 0)}`
                      : `Payable: ${formatCurrency(item.payableAmount || 0)}`}
                  </p>
                </div>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => editPerson(item, formKind)}>Edit</button>
                  <a className="share-entry-button" href={`tel:${contactPhone(item)}`}>Call</a>
                  <a className="share-entry-button" href={`https://wa.me/${String(contactPhone(item)).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <a className="share-entry-button" href="#party-statement">Ledger</a>
                  <button className="share-entry-button" type="button" onClick={() => window.print()}>Statement</button>
                  <button className="delete-entry-button" type="button" onClick={() => deletePerson(item, formKind)}>Delete</button>
                </div>
              </article>
                ))}
              </div>
            </>
          )}
        </section>
      </section>
    );
  }

  if (activeTab === 'analytics') {
    return (
      <section className="phase2-stack fade-in" id="analytics">
        <div className="erp-hero"><div><span className="eyebrow">Analytics Center</span><h2>Revenue, expense, profit, customer growth, and product performance</h2></div></div>
        <div className="analytics-filter"><button>Daily</button><button>Weekly</button><button className="active">Monthly</button><button>Quarterly</button><button>Yearly</button></div>
        <section className="content-grid">
          <article className="panel"><h2>Revenue Trend</h2><SmallBars data={analytics} valueKey="revenue" /></article>
          <article className="panel"><h2>Expense Trend</h2><SmallBars data={analytics} valueKey="expense" colorClass="danger" /></article>
          <article className="panel"><h2>Profit Trend</h2><SmallBars data={analytics} valueKey="profit" colorClass="success" /></article>
          <article className="panel"><h2>Product Performance</h2><SmallBars data={productPerformance} valueKey="value" colorClass="warning" /></article>
        </section>
      </section>
    );
  }

  if (activeTab === 'notifications') {
    const derivedAlerts = [
      ...erpAI.lowStock.slice(0, 5).map((product) => ({ title: 'Low Stock Alert', body: `${product.name}: ${product.currentStock} ${product.unit}` })),
      ...erpAI.overdue.slice(0, 5).map((invoice) => ({ title: 'Overdue Invoice Alert', body: `${invoice.invoiceNo}: ${formatCurrency(invoice.balance || invoice.total)}` })),
      { title: 'GST Reminder', body: `Selected period GST reserve: ${formatCurrency(gstSummary.cgst + gstSummary.sgst)}` },
      { title: 'Backup Reminder', body: cloudSettings.lastBackup ? `Last backup: ${cloudSettings.lastBackup}` : 'No backup created yet.' },
    ];
    return (
      <section className="phase2-stack fade-in" id="notifications">
        <div className="erp-hero"><div><span className="eyebrow">Notification Center</span><h2>Business alerts and reminders</h2></div><div className="erp-hero-actions"><strong>{derivedAlerts.length + notifications.length}</strong><span>alerts</span></div></div>
        <section className="panel">
          <div className="compact-list">
            {[...derivedAlerts, ...notifications].map((item, index) => (
              <article className="compact-item" key={`${item.title}-${index}`}><div><strong>{item.title}</strong><p>{item.body}</p></div><span className="status-pill draft">{item.type || 'Auto'}</span></article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'businesses' || activeTab === 'cloud-backup') {
    return (
      <section className="phase2-stack fade-in" id={activeTab}>
        <div className="erp-hero"><div><span className="eyebrow">{activeTab === 'businesses' ? 'Multi Business Support' : 'Cloud Backup'}</span><h2>{activeTab === 'businesses' ? 'Manage separate dashboards for multiple businesses' : 'Google login, manual backup, and auto backup settings'}</h2></div></div>
        {activeTab === 'businesses' ? (
          <section className="content-grid">
            <article className="panel">
              <h2>Business Switcher</h2>
              <div className="compact-list">
                <article className="compact-item"><strong>Default Business</strong><button className="share-entry-button" type="button" onClick={() => switchBusiness('default')}>Switch</button></article>
                {businesses.map((business) => <article className="compact-item" key={business.id}><div><strong>{business.name}</strong><p>{business.type}</p></div><button className="share-entry-button" type="button" onClick={() => switchBusiness(business.id)}>Switch</button></article>)}
              </div>
            </article>
            <article className="panel">
              <h2>Add Business</h2>
              <form onSubmit={addBusiness}>
                <input name="name" placeholder="Resin Art Studio / Trading Business" />
                <input name="type" placeholder="Business type" />
                <button className="manual-button" type="submit">Add Business</button>
              </form>
            </article>
          </section>
        ) : (
          <section className="content-grid">
            <article className="panel">
              <h2>Google Login</h2>
              <form onSubmit={connectGoogle}>
                <input name="email" type="email" defaultValue={cloudSettings.email} placeholder="Google email" />
                <button className="manual-button" type="submit">{cloudSettings.connected ? 'Update Google Account' : 'Connect Google Backup'}</button>
              </form>
              <p className="panel-hint">Production OAuth can be connected later with Google Cloud credentials.</p>
            </article>
            <article className="panel">
              <h2>Backup Controls</h2>
              <label className="toggle-row"><span>Auto Backup</span><input type="checkbox" checked={cloudSettings.autoBackup} onChange={(event) => setCloudSettings({ ...cloudSettings, autoBackup: event.target.checked })} /></label>
              <button className="secondary-button" type="button" onClick={manualCloudBackup}>Manual Backup</button>
              <p className="panel-hint">Last backup: {cloudSettings.lastBackup || 'Not yet'}</p>
            </article>
          </section>
        )}
      </section>
    );
  }

  return null;
}
