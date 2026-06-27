import { useEffect, useMemo, useState } from 'react';
import { 
  Users, Plus, Search, Filter, Tag, Download, MoreHorizontal, ArrowLeft, ArrowUpRight,
  Edit3, Phone, Mail, MapPin, MessageCircle, Star, AlertCircle, CheckCircle,
  Activity, FileText, CreditCard, Image as ImageIcon, Paperclip, X
} from 'lucide-react';
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
const SHOULD_DEBUG_DATABASE = import.meta.env.DEV || import.meta.env.VITE_DEBUG_DATABASE === 'true';

function debugDatabase(...args) {
  if (SHOULD_DEBUG_DATABASE) {
    console.info(...args);
  }
}

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
  cloudStockTransactions,
  cloudInvoices,
  cloudBusinesses,
  cloudNotifications,
  cloudUserId,
  peopleLoading,
  onStatus,
  onCloudRecord,
  onCloudDelete,
  onAtomicInvoiceWithStock,
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
  const [selectedCrmPerson, setSelectedCrmPerson] = useState(null);
  const [showPersonDrawer, setShowPersonDrawer] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
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
    if (showPersonDrawer || editingPerson) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showPersonDrawer, editingPerson]);
  useEffect(() => {
    if (Array.isArray(cloudInventory)) {
      setProducts(cloudInventory);
    }
  }, [cloudInventory]);
  useEffect(() => {
    if (Array.isArray(cloudStockTransactions)) {
      setStockTxns(cloudStockTransactions);
    }
  }, [cloudStockTransactions]);
  useEffect(() => {
    if (Array.isArray(cloudInvoices)) {
      setInvoices(cloudInvoices);
    }
  }, [cloudInvoices]);
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
    if (Array.isArray(cloudBusinesses)) {
      setBusinesses(cloudBusinesses);
    }
  }, [cloudBusinesses]);
  useEffect(() => {
    if (Array.isArray(cloudNotifications)) {
      setNotifications(cloudNotifications);
    }
  }, [cloudNotifications]);
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

  const addNotification = async (title, body, type = 'System') => {
    const notification = { id: createId('ntf'), title, body, type, date: new Date().toISOString(), read: false };
    try {
      const saved = await onCloudRecord?.('notifications', notification.id, notification);
      if (!saved) {
        throw new Error('Notification save failed');
      }
      setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 50));
    } catch (error) {
      onStatus(error?.message || 'Notification save failed');
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const image = form.get('image');
    const current = editingProduct;
    const product = {
      ...(current || {}),
      id: current?.id || createId('prd'),
      businessId: current?.businessId || activeBusinessId,
      name: sanitizeText(form.get('name'), 120),
      category: sanitizeText(form.get('category'), 80) || 'General',
      sku: sanitizeText(form.get('sku'), 60) || `SKU-${Date.now().toString().slice(-5)}`,
      image: image?.size ? await fileToDataUrl(image) : current?.image || '',
      purchasePrice: normalizeAmount(form.get('purchasePrice')),
      sellingPrice: normalizeAmount(form.get('sellingPrice')),
      currentStock: normalizeAmount(form.get('currentStock')),
      minStock: normalizeAmount(form.get('minStock')),
      unit: sanitizeText(form.get('unit'), 24) || 'pcs',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      setProducts((items) => [product, ...items.filter((item) => item.id !== product.id)]);
      await addNotification(current ? 'Product updated' : 'Product added', `${product.name} saved with stock ${product.currentStock}.`, 'Inventory');
      setEditingProduct(null);
      event.currentTarget.reset();
      onStatus(current ? 'Product updated' : 'Product saved');
    } catch (error) {
      onStatus(error?.message || 'Inventory save failed');
    }
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    onStatus(`Editing ${product.name}`);
  };

  const deleteProduct = async (product) => {
    if (!confirm(`Delete product "${product.name}"?`)) {
      return;
    }

    try {
      const deleted = await onCloudDelete?.('inventory', product.id);
      if (!deleted) {
        throw new Error('Product delete failed');
      }
      setProducts((items) => items.filter((item) => item.id !== product.id));
      if (editingProduct?.id === product.id) {
        setEditingProduct(null);
      }
      onStatus('Product deleted');
    } catch (error) {
      onStatus(error?.message || 'Product delete failed');
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
    const stockEntry = { id: createId('stk'), businessId: activeBusinessId, productId, type, qty, note: sanitizeText(form.get('note'), 180), date: today() };
    if (updatedProduct) {
      try {
        const saved = await onCloudRecord?.('inventory', updatedProduct.id, {
          ...updatedProduct,
          itemId: updatedProduct.id,
        });
        if (!saved) {
          throw new Error('Stock update failed');
        }
        const stockSaved = await onCloudRecord?.('stock_transactions', stockEntry.id, stockEntry);
        if (!stockSaved) {
          throw new Error('Stock transaction save failed');
        }
      } catch (error) {
        onStatus(error?.message || 'Stock update failed');
        return;
      }
    }
    setProducts(updatedProducts);
    setStockTxns([stockEntry, ...stockTxns]);
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

    debugDatabase('SUPABASE_PATH_USED', { feature: `${kind}_save`, path });
    if (isCustomer) {
      debugDatabase('CUSTOMER_SAVE_START', { path, customerId: id, isUpdate: Boolean(current) });
    }

    try {
      const saved = await onCloudRecord?.(collectionName, id, person);
      if (!saved) {
        throw new Error(`Supabase save failed for ${path}`);
      }

      if (isCustomer) {
        setCustomers((items) => [person, ...items.filter((item) => item.id !== id)]);
        debugDatabase(current ? 'CUSTOMER_UPDATE_SUCCESS' : 'CUSTOMER_SAVE_SUCCESS', { path, customerId: id });
      } else {
        setSuppliers((items) => [person, ...items.filter((item) => item.id !== id)]);
        debugDatabase(current ? 'SUPPLIER_UPDATE_SUCCESS' : 'SUPPLIER_SAVE_SUCCESS', { path, supplierId: id });
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
    debugDatabase('SUPABASE_PATH_USED', { feature: `${kind}_delete`, path });

    try {
      const deleted = await onCloudDelete?.(collectionName, person.id);
    if (!deleted) {
      throw new Error(`Supabase delete failed for ${path}`);
    }
      if (isCustomer) {
        setCustomers((items) => items.filter((item) => item.id !== person.id));
        debugDatabase('CUSTOMER_DELETE_SUCCESS', { path, customerId: person.id });
      } else {
        setSuppliers((items) => items.filter((item) => item.id !== person.id));
        debugDatabase('SUPPLIER_DELETE_SUCCESS', { path, supplierId: person.id });
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
    const productsAfterInvoice = products.map((product) => {
      const sold = invoice.lines.filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.qty, 0);
      return sold ? { ...product, currentStock: Math.max(0, product.currentStock - sold) } : product;
    });
    const affectedProducts = productsAfterInvoice
      .filter((product) => invoice.lines.some((line) => line.productId === product.id));
    try {
      let shouldUseLegacyInvoiceSave = !onAtomicInvoiceWithStock;
      if (onAtomicInvoiceWithStock) {
        try {
          const result = await onAtomicInvoiceWithStock(
            invoice,
            affectedProducts.map((product) => ({
              ...product,
              itemId: product.id,
            }))
          );
          if (!result?.invoice) {
            throw new Error('Atomic invoice save failed');
          }
        } catch (error) {
          const errorText = `${error?.code || ''} ${error?.message || ''}`;
          if (!/create_invoice_with_stock|schema cache|function.*not found|pgrst202|42883/i.test(errorText)) {
            throw error;
          }
          shouldUseLegacyInvoiceSave = true;
          onStatus('Phase 1 RPC migration is not installed yet. Saving invoice with legacy flow for now.');
        }
      }

      if (shouldUseLegacyInvoiceSave) {
        const invoiceSaved = await onCloudRecord?.('invoices', invoice.id, invoice);
        if (!invoiceSaved) {
          throw new Error('Invoice save failed');
        }
        await Promise.all(affectedProducts.map(async (product) => {
          const saved = await onCloudRecord?.('inventory', product.id, {
            ...product,
            itemId: product.id,
          });
          if (!saved) {
            throw new Error('Invoice stock update failed');
          }
        }));
      }
    } catch (error) {
      onStatus(error?.message || 'Invoice save failed');
      return;
    }
    setInvoices(editingInvoiceId ? invoices.map((item) => (item.id === editingInvoiceId ? invoice : item)) : [invoice, ...invoices]);
    setProducts(productsAfterInvoice);
    if (invoice.dueDate < today() && invoice.status !== 'Paid') {
      await addNotification('Overdue invoice risk', `${invoice.invoiceNo} is due on ${invoice.dueDate}.`, 'Invoice');
    }
    setInvoiceDraft({ customerId: '', status: 'Unpaid', dueDate: today(), terms: TERMS, lines: [] });
    setEditingInvoiceId('');
    onStatus('Invoice saved to Supabase');
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

  const deleteInvoice = async (invoiceId) => {
    try {
      const deleted = await onCloudDelete?.('invoices', invoiceId);
      if (!deleted) {
        throw new Error('Invoice delete failed');
      }
      setInvoices(invoices.filter((invoice) => invoice.id !== invoiceId));
      onStatus('Invoice deleted');
    } catch (error) {
      onStatus(error?.message || 'Invoice delete failed');
    }
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

  const addBusiness = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const business = {
      id: createId('biz'),
      name: sanitizeText(form.get('name'), 140),
      type: sanitizeText(form.get('type'), 80) || 'Business',
      createdAt: new Date().toISOString(),
    };
    if (!business.name) return;
    try {
      const saved = await onCloudRecord?.('businesses', business.id, business);
      if (!saved) {
        throw new Error('Business save failed');
      }
      setBusinesses([business, ...businesses.filter((item) => item.id !== business.id)]);
      setActiveBusinessId(business.id);
      writeScopedString('activeBusinessId', business.id);
      event.currentTarget.reset();
      onStatus('Business saved');
    } catch (error) {
      onStatus(error?.message || 'Business save failed');
    }
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
            <h2>{editingProduct ? 'Edit Product' : 'Product Master'}</h2>
            <form onSubmit={saveProduct} key={editingProduct?.id || 'new-product'}>
              <div className="form-grid">
                <input name="name" defaultValue={editingProduct?.name || ''} placeholder="Product name" />
                <input name="category" defaultValue={editingProduct?.category || ''} placeholder="Category" />
                <input name="sku" defaultValue={editingProduct?.sku || ''} placeholder="SKU code" />
                <select name="unit" defaultValue={editingProduct?.unit || 'pcs'}>
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kg</option>
                  <option value="ltr">Litre</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                </select>
                <input name="purchasePrice" type="number" defaultValue={editingProduct?.purchasePrice ?? ''} placeholder="Purchase price" />
                <input name="sellingPrice" type="number" defaultValue={editingProduct?.sellingPrice ?? ''} placeholder="Selling price" />
                <input name="currentStock" type="number" defaultValue={editingProduct?.currentStock ?? ''} placeholder="Current stock" />
                <input name="minStock" type="number" defaultValue={editingProduct?.minStock ?? ''} placeholder="Minimum stock" />
                <div className="wide-field"><input name="image" type="file" accept="image/*" /></div>
              </div>
              <div className="inline-actions">
                <button className="manual-button" type="submit">{editingProduct ? 'Update Product' : 'Save Product'}</button>
                {editingProduct && (
                  <button className="secondary-button compact-button" type="button" onClick={() => setEditingProduct(null)}>
                    Cancel
                  </button>
                )}
              </div>
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
              <thead><tr><th>Product</th><th>Category</th><th>SKU</th><th>Stock</th><th>Purchase</th><th>Selling</th><th>Value</th><th>Actions</th></tr></thead>
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
                    <td>
                      <div className="voucher-actions">
                        <button className="share-entry-button" type="button" onClick={() => editProduct(product)}>Edit</button>
                        <button className="delete-entry-button" type="button" onClick={() => deleteProduct(product)}>Delete</button>
                      </div>
                    </td>
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
    const list = (isCustomer ? scopedCustomers : scopedSuppliers)?.filter(personMatchesSearch) || [];
    const formKind = isCustomer ? 'customer' : 'supplier';
    const currentEdit = editingPerson?.type === formKind ? editingPerson : null;
    
    const totalProfiles = list.length;
    const totalOutstanding = isCustomer 
      ? list.reduce((sum, item) => sum + (Number(item?.outstandingAmount ?? item?.outstanding) || 0), 0) 
      : list.reduce((sum, item) => sum + (Number(item?.payableAmount) || 0), 0);
    
    return (
      <section className="phase2-stack fade-in crm-container" id={activeTab} style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
        
        {/* RIGHT SIDE DRAWER FOR ADD/EDIT CUSTOMER */}
        {(showPersonDrawer || currentEdit) && (
          <div className="crm-drawer-overlay" onClick={() => { setShowPersonDrawer(false); setEditingPerson(null); }}>
            <div className="crm-drawer-content" onClick={(e) => e.stopPropagation()}>
              <div className="crm-drawer-header">
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {currentEdit ? `Edit ${isCustomer ? 'Customer' : 'Supplier'}` : `Add ${isCustomer ? 'Customer' : 'Supplier'}`}
                </h3>
                <button type="button" className="icon-button" onClick={() => { setShowPersonDrawer(false); setEditingPerson(null); }}><X size={20}/></button>
              </div>
              <form onSubmit={(event) => { savePerson(event, formKind); setShowPersonDrawer(false); }} key={`${formKind}-${currentEdit?.id || 'new'}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className="crm-drawer-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Basic Information</label>
                      <input name="name" defaultValue={currentEdit?.name || ''} placeholder="Company or Person Name" required style={{ width: '100%', marginBottom: '12px' }} />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input name="phone" defaultValue={contactPhone(currentEdit || {})} placeholder="Phone Number" style={{ flex: 1 }} />
                        <input name="email" type="email" defaultValue={currentEdit?.email || ''} placeholder="Email Address" style={{ flex: 1 }} />
                      </div>
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                    
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Business Details</label>
                      <input name="gst" defaultValue={currentEdit?.gst || ''} placeholder="GSTIN (Optional)" style={{ width: '100%', marginBottom: '12px' }} />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input name="openingBalance" type="number" defaultValue={currentEdit?.openingBalance || ''} placeholder="Opening Balance" style={{ flex: 1 }} />
                        {isCustomer ? (
                          <input name="outstandingAmount" type="number" defaultValue={currentEdit?.outstandingAmount ?? currentEdit?.outstanding ?? ''} placeholder="Current Outstanding" style={{ flex: 1 }} />
                        ) : (
                          <input name="payableAmount" type="number" defaultValue={currentEdit?.payableAmount || ''} placeholder="Current Payable" style={{ flex: 1 }} />
                        )}
                      </div>
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                    
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Location & Notes</label>
                      <textarea name="address" defaultValue={currentEdit?.address || ''} placeholder="Billing Address" rows={3} style={{ width: '100%', marginBottom: '12px' }} />
                      <textarea name="notes" defaultValue={currentEdit?.notes || ''} placeholder="Internal notes, payment terms, or preferences" rows={3} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
                <div className="crm-drawer-footer">
                  <button className="secondary-button" type="button" onClick={() => { setShowPersonDrawer(false); setEditingPerson(null); }}>Cancel</button>
                  <button className="primary-button" type="submit">{currentEdit ? 'Update Profile' : 'Save Profile'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LIST VIEW OR PROFILE VIEW */}
        {!selectedCrmPerson ? (
          <>
            <div className="section-header" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', marginBottom: '0' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={24} className="text-brand" /> {isCustomer ? 'Customers' : 'Suppliers'}</h2>
                <p className="panel-hint">Manage profiles, invoices, payments, balances, documents, and communication.</p>
              </div>
              <div className="inline-actions">
                <button className="primary-button" onClick={() => setShowPersonDrawer(true)}><Plus size={16}/> Add {isCustomer ? 'Customer' : 'Supplier'}</button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="text-secondary">Total Profiles</span>
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)' }}><Users size={18} /></div>
                </div>
                <div className="kpi-value">{totalProfiles}</div>
                <div className="kpi-trend trend-up"><Activity size={12}/> {Math.floor(totalProfiles * 0.8)} Active this month</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="text-secondary">{isCustomer ? 'Total Outstanding' : 'Total Payable'}</span>
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><AlertCircle size={18} /></div>
                </div>
                <div className="kpi-value" style={{ color: isCustomer && totalOutstanding > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{formatCurrency(totalOutstanding)}</div>
                <div className="kpi-trend trend-neutral"><ArrowUpRight size={12}/> Across {totalProfiles} profiles</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="text-secondary">Average LTV</span>
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}><Star size={18} /></div>
                </div>
                <div className="kpi-value">{formatCurrency(totalProfiles > 0 ? (totalOutstanding * 3.5) / totalProfiles : 0)}</div>
                <div className="kpi-trend trend-up"><ArrowUpRight size={12}/> +12% from last year</div>
              </div>
            </div>
            
            <div className="analytics-filter">
              <button className={peopleTab === 'customers' ? 'active' : ''} type="button" onClick={() => { setPeopleTab('customers'); setEditingPerson(null); setSelectedCrmPerson(null); }}>
                Customers
              </button>
              <button className={peopleTab === 'suppliers' ? 'active' : ''} type="button" onClick={() => { setPeopleTab('suppliers'); setEditingPerson(null); setSelectedCrmPerson(null); }}>
                Suppliers
              </button>
            </div>
            
            <div className="crm-toolbar">
              <div className="search-wrap" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="crm-search-input" 
                  placeholder={`Search ${isCustomer ? 'customers' : 'suppliers'}...`}
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                />
              </div>
              <div className="crm-toolbar-actions">
                <button className="secondary-button"><Filter size={16}/> Filters</button>
                <button className="secondary-button"><Tag size={16}/> Tags</button>
                <button className="secondary-button"><Download size={16}/> Export</button>
              </div>
            </div>

            <div className="crm-table-wrapper fade-in">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Contact</th>
                    <th>{isCustomer ? 'Outstanding' : 'Payable'}</th>
                    <th>Status & Tags</th>
                    <th>Assigned To</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '80px', height: '80px', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={32} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No {isCustomer ? 'customers' : 'suppliers'} yet</h3>
                            <p className="text-secondary" style={{ fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>Start building your database by adding your first profile.</p>
                          </div>
                          <button className="primary-button" style={{ marginTop: '8px' }} onClick={() => setShowPersonDrawer(true)}><Plus size={16}/> Add {isCustomer ? 'Customer' : 'Supplier'}</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    list.map((item, i) => {
                      const balance = isCustomer ? item.outstandingAmount ?? item.outstanding ?? 0 : item.payableAmount || 0;
                      
                      // Mock CRM tags for demonstration
                      const tags = [];
                      if (balance > 50000) tags.push({ label: 'VIP', class: 'vip' });
                      if (isCustomer && balance > 10000) tags.push({ label: 'High Risk', class: 'high-risk' });
                      if (i % 3 === 0) tags.push({ label: 'Wholesale', class: 'wholesale' });
                      if (tags.length === 0) tags.push({ label: 'Retail', class: 'retail' });
                      
                      return (
                        <tr key={item?.id || i} onClick={() => setSelectedCrmPerson(item)} style={{cursor: 'pointer'}}>
                          <td>
                            <div className="crm-customer-cell">
                              <div className="crm-avatar">{(item?.name || 'U').charAt(0).toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item?.name || 'Unknown'}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {item?.id?.slice(0,6) || 'N/A'} {item?.gst && `• GST: ${item.gst}`}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{contactPhone(item) || '-'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.email || '-'}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: balance === 0 ? 'var(--success)' : isCustomer ? 'var(--warning)' : 'var(--danger)' }}></div>
                              <strong style={{ color: balance === 0 ? 'var(--text-secondary)' : isCustomer ? 'var(--warning)' : 'var(--danger)' }}>
                                {formatCurrency(Math.abs(balance))}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {tags.map((t, idx) => (
                                <span key={idx} className={`crm-tag ${t.class}`}>{t.label}</span>
                              ))}
                            </div>
                          </td>
                          <td className="text-secondary" style={{ fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Admin</div>
                              Owner
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="voucher-actions" style={{ justifyContent: 'flex-end' }}>
                              <button className="icon-button" onClick={(e) => { e.stopPropagation(); editPerson(item, formKind); }} title="Edit"><Edit3 size={16} /></button>
                              <button className="icon-button" onClick={(e) => { e.stopPropagation(); deletePerson(item, formKind); }} title="Delete"><X size={16} className="text-danger" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* CRM PROFILE VIEW */
          <>
            <div className="crm-toolbar fade-in" style={{ border: 'none', padding: '0 0 16px 0', background: 'transparent' }}>
              <button className="secondary-button" onClick={() => setSelectedCrmPerson(null)}>
                <ArrowLeft size={16} /> Back to List
              </button>
              <div className="crm-toolbar-actions">
                <button className="secondary-button" onClick={() => editPerson(selectedCrmPerson, formKind)}><Edit3 size={16} /> Edit Profile</button>
                {isCustomer && <button className="primary-button"><Plus size={16} /> Create Invoice</button>}
              </div>
            </div>
            
            <div className="profile-grid-layout fade-in">
              {/* Sidebar */}
              <div className="profile-sidebar">
                 <div className="profile-avatar-large">{(selectedCrmPerson?.name || 'U').charAt(0).toUpperCase()}</div>
                 <div style={{ textAlign: 'center' }}>
                   <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{selectedCrmPerson?.name || 'Unknown'}</h2>
                   <p className="text-secondary" style={{ fontSize: '14px' }}>{isCustomer ? 'Customer' : 'Supplier'} Profile</p>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                   <span className="crm-tag vip">VIP</span>
                   <span className="crm-tag retail">Active</span>
                 </div>
                 
                 <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Phone size={16} className="text-secondary" />
                     </div>
                     <div style={{ fontSize: '13px' }}>
                       <div className="text-secondary">Phone</div>
                       <div style={{ fontWeight: '500' }}>{contactPhone(selectedCrmPerson) || 'N/A'}</div>
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Mail size={16} className="text-secondary" />
                     </div>
                     <div style={{ fontSize: '13px' }}>
                       <div className="text-secondary">Email</div>
                       <div style={{ fontWeight: '500' }}>{selectedCrmPerson.email || 'N/A'}</div>
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <MapPin size={16} className="text-secondary" />
                     </div>
                     <div style={{ fontSize: '13px' }}>
                       <div className="text-secondary">Location</div>
                       <div style={{ fontWeight: '500' }}>{selectedCrmPerson.address || 'N/A'}</div>
                     </div>
                   </div>
                 </div>
                 
                 <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <a className="secondary-button" style={{ width: '100%', justifyContent: 'center' }} href={`https://wa.me/${String(contactPhone(selectedCrmPerson)).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Send WhatsApp</a>
                   <a className="secondary-button" style={{ width: '100%', justifyContent: 'center' }} href={`mailto:${selectedCrmPerson.email}`}><Mail size={16} /> Send Email</a>
                 </div>
              </div>
              
              {/* Main Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Financials Row */}
                <div className="dashboard-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div className="kpi-card" style={{ padding: '20px' }}>
                    <div className="kpi-header">
                      <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>Opening Balance</span>
                      <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)' }}>
                        <CreditCard size={18} />
                      </div>
                    </div>
                    <div className="kpi-value" style={{ fontSize: '24px', margin: '12px 0 4px' }}>{formatCurrency(selectedCrmPerson?.openingBalance || 0)}</div>
                    <div className="kpi-trend trend-neutral" style={{ fontSize: '12px' }}>Account initialized</div>
                  </div>
                  
                  <div className="kpi-card" style={{ padding: '20px' }}>
                    <div className="kpi-header">
                      <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>{isCustomer ? 'Outstanding' : 'Payable'}</span>
                      <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                        <AlertCircle size={18} />
                      </div>
                    </div>
                    <div className="kpi-value" style={{ fontSize: '24px', margin: '12px 0 4px', color: ((selectedCrmPerson?.outstandingAmount ?? selectedCrmPerson?.payableAmount) || 0) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatCurrency(isCustomer ? selectedCrmPerson?.outstandingAmount ?? selectedCrmPerson?.outstanding ?? 0 : selectedCrmPerson?.payableAmount || 0)}
                    </div>
                    <div className="kpi-trend trend-neutral" style={{ fontSize: '12px' }}>Current Balance</div>
                  </div>
                  
                  <div className="kpi-card" style={{ padding: '20px' }}>
                    <div className="kpi-header">
                      <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>GST Info</span>
                      <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                        <CheckCircle size={18} />
                      </div>
                    </div>
                    <div className="kpi-value" style={{ fontSize: '16px', margin: '12px 0 4px', wordBreak: 'break-all' }}>{selectedCrmPerson?.gst || 'Unregistered'}</div>
                    <div className="kpi-trend text-secondary" style={{ fontSize: '12px' }}>B2B Profile</div>
                  </div>
                </div>
                
                {/* Timeline & Notes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {/* Timeline */}
                  <div className="panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} className="text-brand" /> CRM Activity
                    </h3>
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-icon" style={{ background: 'var(--brand-secondary)', color: 'var(--brand-primary)' }}>
                          <Users size={14} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-title">Profile Created</div>
                          <div className="timeline-time">In Supabase</div>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                          <Phone size={14} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-title">Sync Complete</div>
                          <div className="timeline-time">Today • All ledgers updated.</div>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                          <MessageCircle size={14} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-title">WhatsApp Message Sent</div>
                          <div className="timeline-time">Automated • Payment Reminder</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Documents & Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Notes */}
                    <div className="panel" style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                          <Star size={18} /> Pinned Note
                        </h3>
                        <button className="icon-button" style={{ color: '#b45309' }}><Edit3 size={16}/></button>
                      </div>
                      <p style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
                        {selectedCrmPerson?.notes || 'No notes added for this profile yet. Click edit to add specific instructions or details.'}
                      </p>
                    </div>
                    
                    {/* Documents */}
                    <div className="panel" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Paperclip size={18} className="text-secondary" /> Documents
                        </h3>
                        <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '12px' }}><Plus size={14}/> Upload</button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="doc-card">
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>PAN_Card.pdf</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Placeholder</div>
                          </div>
                          <Download size={16} className="text-secondary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
    const openAlertAction = (item) => {
      const title = String(item.title || '').toLowerCase();
      if (title.includes('gst')) {
        window.location.hash = 'gst';
        onStatus('Opening GST Center');
        return;
      }
      if (title.includes('backup')) {
        window.location.hash = 'cloud-backup';
        onStatus('Opening Cloud Backup');
        return;
      }
      if (title.includes('stock')) {
        window.location.hash = 'inventory';
        onStatus('Opening Inventory');
        return;
      }
      if (title.includes('invoice')) {
        window.location.hash = 'invoices';
        onStatus('Opening Invoices');
        return;
      }
      onStatus(`${item.title}: ${item.body || 'No extra details available.'}`);
    };
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
              <button
                className="compact-item clickable-alert"
                key={`${item.title}-${index}`}
                type="button"
                onClick={() => openAlertAction(item)}
                aria-label={`Open ${item.title}`}
              >
                <div><strong>{item.title}</strong><p>{item.body}</p></div><span className="status-pill draft">{item.type || 'Auto'}</span>
              </button>
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
