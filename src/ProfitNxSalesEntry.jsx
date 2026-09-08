import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Download, Printer, MessageSquare,
  Search, Filter, RefreshCw, X, Check, AlertCircle, ShoppingBag,
  ArrowUpDown, ExternalLink, Calendar, DollarSign, Layers, CreditCard
} from 'lucide-react';
import UpiPaymentModal from './UpiPaymentModal.jsx';

export default function ProfitNxSalesEntry({
  invoices = [],
  orders = [],
  inventory = [],
  customers = [],
  profile = {},
  onSaveInvoice,
  onDeleteInvoice,
  onNavigate,
  onStatus
}) {
  // Date filters - default to financial year 2026-2027 as seen in FR.mp4
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate] = useState('2027-03-31');
  const [prefixFilter, setPrefixFilter] = useState('ALL');
  const [billTypeFilter, setBillTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [printTargetInvoice, setPrintTargetInvoice] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, invoice }

  const handleCollectPayment = async (paymentData) => {
    if (!payingInvoice) return;
    const inv = payingInvoice.raw || payingInvoice;
    const currentBal = Number(inv.balance !== undefined ? inv.balance : (inv.netTotal || inv.total || 0));
    const newBal = Math.max(0, currentBal - paymentData.amount);
    const updatedInvoice = {
      ...inv,
      balance: newBal,
      status: newBal <= 0 ? 'Paid' : 'Partial',
      paidAmount: (Number(inv.paidAmount || 0) + paymentData.amount),
      updatedAt: new Date().toISOString(),
    };
    if (onSaveInvoice) {
      await onSaveInvoice(updatedInvoice);
    }
    if (onStatus) {
      onStatus(`Payment of ₹${paymentData.amount} collected for ${payingInvoice.invoiceNo || payingInvoice.billNo || 'bill'}`);
    }
    setPayingInvoice(null);
  };

  // Unified list of sales transactions (combines manual invoices and online store orders)
  const unifiedSalesList = useMemo(() => {
    const list = [];

    // Process manual ERP invoices
    if (Array.isArray(invoices)) {
      invoices.forEach((inv, index) => {
        const totalQty = Array.isArray(inv.items || inv.lines)
          ? (inv.items || inv.lines).reduce((sum, item) => sum + Number(item.qty || item.quantity || 1), 0)
          : 1;

        const taxableAmt = Number(inv.subtotal || inv.taxable || (inv.total ? inv.total * 0.82 : 0)) || 0;
        const gstAmt = Number(inv.tax || inv.gstTotal || (inv.total ? inv.total - taxableAmt : 0)) || 0;
        const netTotal = Number(inv.total || inv.grandTotal || (taxableAmt + gstAmt)) || 0;

        const billNo = inv.invoiceNo || inv.invoice_number || `INV-${String(index + 1).padStart(4, '0')}`;
        const partyName = inv.customer_name || inv.customerName || inv.partyName || 'Cash / Retail Customer';
        const gstin = inv.gstin || inv.customerGstin || (inv.billType === 'B2B' ? '24AABCS1429B1Z' + (index % 9) : '-');
        const billType = inv.billType || (gstin && gstin !== '-' ? 'B2B' : 'B2C');

        list.push({
          id: inv.id || `inv-${index}`,
          original: inv,
          source: inv.source || 'Trinetr ERP',
          billNo,
          date: inv.date || inv.invoice_date || '2026-05-15',
          partyName,
          gstin,
          billType,
          taxType: inv.taxType || (gstin.startsWith('24') || gstin === '-' ? 'CGST + SGST (Gujarat)' : 'IGST (Interstate)'),
          itemsDesc: Array.isArray(inv.items || inv.lines)
            ? (inv.items || inv.lines).map(i => `${i.name || i.productName || 'Namkeen'} (${i.qty || 1})`).join(', ')
            : (inv.description || 'Namkeen / Farsan Assorted'),
          totalQty,
          taxableAmt: Math.round(taxableAmt * 100) / 100,
          gstAmt: Math.round(gstAmt * 100) / 100,
          netTotal: Math.round(netTotal * 100) / 100,
          status: inv.status || 'Paid',
          paymentMode: inv.paymentMode || 'Cash',
          items: inv.items || inv.lines || []
        });
      });
    }

    // Process Online Store Orders as integrated B2C / Retail Sales
    if (Array.isArray(orders)) {
      orders.forEach((ord, index) => {
        const orderNo = ord.orderNo || `ORD-${String(ord.id || index + 1).slice(-4)}`;
        // Avoid duplicate if invoice already created for this order
        if (!list.some(item => item.billNo === orderNo || item.original?.orderId === ord.id)) {
          const totalQty = Array.isArray(ord.items)
            ? ord.items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 1), 0)
            : 1;

          const totalAmt = Number(ord.total || ord.amount || 0);
          const taxableAmt = Math.round((totalAmt / 1.05) * 100) / 100; // Namkeen 5% GST
          const gstAmt = Math.round((totalAmt - taxableAmt) * 100) / 100;

          list.push({
            id: ord.id || `ord-${index}`,
            original: ord,
            source: '🛍️ Online Store',
            billNo: orderNo,
            date: ord.createdAt ? String(ord.createdAt).slice(0, 10) : '2026-05-17',
            partyName: ord.customer || ord.customerName || 'Online Customer',
            gstin: ord.customerGstin || '-',
            billType: 'B2C (Store)',
            taxType: 'CGST + SGST (5%)',
            itemsDesc: Array.isArray(ord.items)
              ? ord.items.map(i => `${i.name || 'Item'} (${i.quantity || 1})`).join(', ')
              : 'Storefront Order Items',
            totalQty,
            taxableAmt,
            gstAmt,
            netTotal: totalAmt,
            status: ord.status || 'Received',
            paymentMode: ord.paymentMethod || 'Online / COD',
            items: ord.items || []
          });
        }
      });
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [invoices, orders]);

  // Filtered rows
  const filteredSales = useMemo(() => {
    return unifiedSalesList.filter((item) => {
      // Date filter
      if (fromDate && item.date && item.date < fromDate) return false;
      if (toDate && item.date && item.date > toDate) return false;

      // Prefix filter
      if (prefixFilter !== 'ALL') {
        if (!item.billNo.toUpperCase().startsWith(prefixFilter.toUpperCase())) {
          return false;
        }
      }

      // Bill Type filter
      if (billTypeFilter !== 'ALL') {
        if (billTypeFilter === 'B2B' && item.billType !== 'B2B') return false;
        if (billTypeFilter === 'B2C' && !item.billType.startsWith('B2C')) return false;
        if (billTypeFilter === 'STORE' && item.source !== '🛍️ Online Store') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesBill = item.billNo.toLowerCase().includes(query);
        const matchesParty = item.partyName.toLowerCase().includes(query);
        const matchesGstin = item.gstin.toLowerCase().includes(query);
        const matchesItems = item.itemsDesc.toLowerCase().includes(query);
        if (!matchesBill && !matchesParty && !matchesGstin && !matchesItems) return false;
      }

      return true;
    });
  }, [unifiedSalesList, fromDate, toDate, prefixFilter, billTypeFilter, searchTerm]);

  // Live footer totals
  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, cur) => {
        acc.count += 1;
        acc.qty += Number(cur.totalQty) || 0;
        acc.taxable += Number(cur.taxableAmt) || 0;
        acc.gst += Number(cur.gstAmt) || 0;
        acc.net += Number(cur.netTotal) || 0;
        return acc;
      },
      { count: 0, qty: 0, taxable: 0, gst: 0, net: 0 }
    );
  }, [filteredSales]);

  // Keyboard shortcut listener (F2: Add, F3: Modify, F4: Delete)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setEditingInvoice(null);
        setShowAddModal(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        const selected = filteredSales.find(i => i.id === selectedInvoiceId);
        if (selected) {
          setEditingInvoice(selected);
          setShowAddModal(true);
        } else if (filteredSales.length > 0) {
          setEditingInvoice(filteredSales[0]);
          setShowAddModal(true);
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (selectedInvoiceId) {
          handleDelete(selectedInvoiceId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInvoiceId, filteredSales]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Handle right-click context menu on row
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setSelectedInvoiceId(item.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleModify = (item) => {
    setEditingInvoice(item);
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    const item = unifiedSalesList.find(i => i.id === id);
    if (!item) return;

    if (window.confirm(`Are you sure you want to delete invoice ${item.billNo} for ${item.partyName}?`)) {
      if (onDeleteInvoice) {
        onDeleteInvoice(item.original?.id || item.id);
      }
      if (selectedInvoiceId === id) setSelectedInvoiceId(null);
      if (onStatus) onStatus(`Invoice ${item.billNo} deleted successfully.`);
    }
  };

  const handlePrint = (item) => {
    setPrintTargetInvoice(item);
    setShowPrintModal(true);
  };

  const handleWhatsApp = (item) => {
    const text = `Namaste ${item.partyName},\nHere is your invoice ${item.billNo} from ${profile.name || 'Jay Ambe Namkeen'}.\nDate: ${item.date}\nAmount: ₹${item.netTotal}\nItems: ${item.itemsDesc}\nThank you for your business!`;
    const phone = item.original?.customerMobile || item.original?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      alert('No sales records to export.');
      return;
    }

    const headers = ['Sr', 'Bill No', 'Date', 'Party Name', 'GSTIN', 'Bill Type', 'Tax Type', 'Items', 'Qty', 'Taxable Amt', 'GST Amt', 'Net Total', 'Status', 'Source'];
    const rows = filteredSales.map((item, idx) => [
      idx + 1,
      `"${item.billNo}"`,
      item.date,
      `"${item.partyName}"`,
      item.gstin,
      item.billType,
      `"${item.taxType}"`,
      `"${item.itemsDesc.replace(/"/g, '""')}"`,
      item.totalQty,
      item.taxableAmt,
      item.gstAmt,
      item.netTotal,
      item.status,
      item.source
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Register_Jay_Ambe_Namkeen_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="profitnx-container" style={{ padding: '16px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      
      {/* 1. Header & Breadcrumb Bar (Matching Profit Nx ERP Header) */}
      <div className="profitnx-header-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 18px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#1e3a8a', color: '#ffffff', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>TRINETR ERP</span>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              1. Transaction &gt; Sales Register / Entry
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Company: <strong>{profile.name || 'JAY AMBE NAMKEEN'}</strong> &nbsp;|&nbsp; GSTIN: <strong>{profile.gstin || '24CPVPC7753J1Z8'}</strong> &nbsp;|&nbsp; FY: <strong>[2026 - 2027]</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate?.('store')}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}
          >
            <ShoppingBag size={14} /> Storefront Orders ({orders.length})
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate?.('production')}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', fontWeight: 600 }}
          >
            <Layers size={14} /> 5. Production Entry
          </button>
        </div>
      </div>

      {/* 2. Top Filter Bar (From Date, To Date, Prefix, Bill Type, Party Search) */}
      <div className="profitnx-filter-bar" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        
        {/* From Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>From:</label>
          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '135px' }}
          />
        </div>

        {/* To Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>To:</label>
          <input
            type="date"
            className="form-control"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '135px' }}
          />
        </div>

        {/* Series / Prefix */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Prefix:</label>
          <select
            className="form-control"
            value={prefixFilter}
            onChange={(e) => setPrefixFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          >
            <option value="ALL">ALL (All Series)</option>
            <option value="GST">GST- (Tax Invoices)</option>
            <option value="INV">INV- (Standard)</option>
            <option value="ORD">ORD- (Online Store)</option>
          </select>
        </div>

        {/* Bill Type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Type:</label>
          <select
            className="form-control"
            value={billTypeFilter}
            onChange={(e) => setBillTypeFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          >
            <option value="ALL">All Invoices</option>
            <option value="B2B">B2B (Registered with GSTIN)</option>
            <option value="B2C">B2C (Consumer Retail)</option>
            <option value="STORE">Online Store Orders</option>
          </select>
        </div>

        {/* Search party / bill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '220px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Party, GSTIN, Bill No or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '5px 8px 5px 28px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setFromDate('2026-04-01');
            setToDate('2027-03-31');
            setPrefixFilter('ALL');
            setBillTypeFilter('ALL');
            setSearchTerm('');
          }}
          title="Reset Filters"
          style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      {/* 3. Action Toolbar (Add F2, Modify F3, Delete F4, Export, Import, Print, WhatsApp, Close) */}
      <div className="profitnx-action-toolbar" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Add (F2) */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingInvoice(null);
              setShowAddModal(true);
            }}
            style={{ background: '#15803d', borderColor: '#166534', color: '#ffffff', fontSize: '12px', fontWeight: 600, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Add <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>F2</span>
          </button>

          {/* Modify (F3) */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const item = filteredSales.find(i => i.id === selectedInvoiceId) || filteredSales[0];
              if (item) handleModify(item);
              else alert('Please select an invoice to modify.');
            }}
            style={{ background: '#0284c7', borderColor: '#0369a1', color: '#ffffff', fontSize: '12px', fontWeight: 600, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit2 size={14} /> Modify <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>F3</span>
          </button>

          {/* Delete (F4) */}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (selectedInvoiceId) handleDelete(selectedInvoiceId);
              else alert('Please select an invoice to delete.');
            }}
            style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff', fontSize: '12px', fontWeight: 600, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} /> Delete <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>F4</span>
          </button>

          <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }} />

          {/* Export CSV */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff' }}
          >
            <Download size={14} /> Export CSV
          </button>

          {/* Direct Print */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const item = filteredSales.find(i => i.id === selectedInvoiceId) || filteredSales[0];
              if (item) handlePrint(item);
              else alert('Please select an invoice to print.');
            }}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff' }}
          >
            <Printer size={14} /> Direct Print
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const item = filteredSales.find(i => i.id === selectedInvoiceId) || filteredSales[0];
              if (item) handleWhatsApp(item);
              else alert('Please select an invoice to share.');
            }}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', color: '#15803d' }}
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{filteredSales.length}</strong> of <strong>{unifiedSalesList.length}</strong> sales
          </span>
          {selectedInvoiceId && (
            <button
              type="button"
              onClick={() => setSelectedInvoiceId(null)}
              style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* 4. High-Density Sales Register Data Grid (Matching Profit Nx Desktop Table) */}
      <div className="profitnx-table-card" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '14px' }}>
        <div style={{ overflowX: 'auto', maxHeight: '58vh' }}>
          <table className="profitnx-grid-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '1050px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#f8fafc', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '100px' }}>Bill No</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '95px' }}>Date</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', minWidth: '160px' }}>Party Name</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '135px' }}>GSTIN</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '85px' }}>Bill Type</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '140px' }}>Tax Type</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', minWidth: '160px' }}>Items Summary</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '70px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '105px', textAlign: 'right' }}>Taxable (₹)</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '95px', textAlign: 'right' }}>GST (₹)</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '110px', textAlign: 'right' }}>Net Amt (₹)</th>
                <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '95px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.5 }} />
                    <strong>No sales records found matching your filters.</strong>
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setEditingInvoice(null);
                          setShowAddModal(true);
                        }}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        <Plus size={14} /> Add First Sale (F2)
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((item, index) => {
                  const isSelected = selectedInvoiceId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInvoiceId(item.id)}
                      onDoubleClick={() => handleModify(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                      style={{
                        background: isSelected ? '#e0f2fe' : index % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      className="profitnx-grid-row"
                    >
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', fontWeight: 700, color: '#1e3a8a' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {item.billNo}
                          {item.source === '🛍️ Online Store' && (
                            <span title="Online Store Order" style={{ fontSize: '10px' }}>🛒</span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', color: '#334155' }}>
                        {item.date}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>
                        {item.partyName}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '11px', color: item.gstin !== '-' ? '#047857' : '#94a3b8' }}>
                        {item.gstin}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: item.billType === 'B2B' ? '#dbeafe' : item.billType.includes('Store') ? '#fef3c7' : '#f1f5f9',
                          color: item.billType === 'B2B' ? '#1e40af' : item.billType.includes('Store') ? '#92400e' : '#475569'
                        }}>
                          {item.billType}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', color: '#475569', fontSize: '11px' }}>
                        {item.taxType}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', color: '#334155', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.itemsDesc}>
                        {item.itemsDesc}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>
                        {item.totalQty}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{item.taxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace', color: '#b45309' }}>
                        ₹{item.gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1e3a8a' }}>
                        ₹{item.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: item.status === 'Paid' ? '#dcfce7' : item.status === 'Received' ? '#e0e7ff' : '#fee2e2',
                          color: item.status === 'Paid' ? '#166534' : item.status === 'Received' ? '#3730a3' : '#991b1b'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {item.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPayingInvoice(item); }}
                              title="Collect UPI Payment"
                              style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '2px' }}
                            >
                              <CreditCard size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleModify(item); }}
                            title="Modify Bill (F3)"
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '2px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePrint(item); }}
                            title="Print Tax Invoice"
                            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px' }}
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            title="Delete Bill (F4)"
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Sticky Live Footer Bar (Matching Profit Nx Total Quantity & Total Amount bar) */}
        <div className="profitnx-footer-summary" style={{ background: '#1e293b', color: '#ffffff', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Total Records: <span style={{ color: '#38bdf8' }}>{totals.count}</span>
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Total Quantity: <span style={{ color: '#4ade80' }}>{totals.qty} Units</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
            <span>
              Taxable: <strong style={{ color: '#f8fafc' }}>₹{totals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span>
              Total GST: <strong style={{ color: '#facc15' }}>₹{totals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ fontSize: '15px', background: '#0f172a', padding: '4px 12px', borderRadius: '4px', border: '1px solid #38bdf8' }}>
              NET TOTAL: <strong style={{ color: '#38bdf8' }}>₹{totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 6. Context Menu on Right-Click */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            minWidth: '180px',
            padding: '4px 0',
            fontSize: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1e3a8a' }}>
            {contextMenu.item.billNo}
          </div>
          <button
            type="button"
            onClick={() => { handleModify(contextMenu.item); setContextMenu(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Edit2 size={13} /> Modify (F3)
          </button>
          {contextMenu.item.status !== 'Paid' && (
            <button
              type="button"
              onClick={() => { setPayingInvoice(contextMenu.item); setContextMenu(null); }}
              style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}
            >
              <CreditCard size={13} /> Collect / UPI
            </button>
          )}
          <button
            type="button"
            onClick={() => { handlePrint(contextMenu.item); setContextMenu(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={13} /> Direct Print
          </button>
          <button
            type="button"
            onClick={() => { handleWhatsApp(contextMenu.item); setContextMenu(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <MessageSquare size={13} /> Send WhatsApp
          </button>
          <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
          <button
            type="button"
            onClick={() => { handleDelete(contextMenu.item.id); setContextMenu(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}
          >
            <Trash2 size={13} /> Delete (F4)
          </button>
        </div>
      )}

      {/* 7. Full Sales Entry / Invoice Add & Edit Modal */}
      {showAddModal && (
        <SalesEntryModal
          editingInvoice={editingInvoice}
          customers={customers}
          inventory={inventory}
          profile={profile}
          onClose={() => setShowAddModal(false)}
          onSave={async (invoiceData) => {
            if (onSaveInvoice) {
              await onSaveInvoice(invoiceData);
            }
            setShowAddModal(false);
            if (onStatus) onStatus(`Invoice ${invoiceData.invoiceNo || 'Sale'} saved successfully!`);
          }}
        />
      )}

      {/* 8. Direct GST Print Modal */}
      {showPrintModal && printTargetInvoice && (
        <SalesPrintModal
          invoice={printTargetInvoice}
          profile={profile}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* 9. Instant UPI Payment Modal */}
      {payingInvoice && (
        <UpiPaymentModal
          isOpen={Boolean(payingInvoice)}
          invoice={{
            ...payingInvoice,
            invoiceNo: payingInvoice.billNo || payingInvoice.invoiceNo || payingInvoice.id,
            total: payingInvoice.netTotal || payingInvoice.total,
            balance: payingInvoice.balance !== undefined ? payingInvoice.balance : (payingInvoice.netTotal || payingInvoice.total),
            customer: payingInvoice.partyName || payingInvoice.customer,
          }}
          profile={profile}
          onClose={() => setPayingInvoice(null)}
          onConfirmPayment={handleCollectPayment}
        />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// Sub-component: Sales Entry Modal (Add / Edit full multi-line invoice)
// -------------------------------------------------------------
function SalesEntryModal({ editingInvoice, customers = [], inventory = [], profile = {}, onClose, onSave }) {
  const [billNo, setBillNo] = useState(editingInvoice ? editingInvoice.billNo : `GST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(editingInvoice ? editingInvoice.date : new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState(editingInvoice ? editingInvoice.partyName : '');
  const [gstin, setGstin] = useState(editingInvoice ? (editingInvoice.gstin !== '-' ? editingInvoice.gstin : '') : '');
  const [phone, setPhone] = useState(editingInvoice?.original?.customerMobile || editingInvoice?.original?.phone || '');
  const [address, setAddress] = useState(editingInvoice?.original?.customerAddress || '');
  const [billType, setBillType] = useState(editingInvoice ? (editingInvoice.billType.startsWith('B2B') ? 'B2B' : 'B2C') : 'B2B');
  const [paymentMode, setPaymentMode] = useState(editingInvoice ? editingInvoice.paymentMode : 'Cash');
  const [status, setStatus] = useState(editingInvoice ? editingInvoice.status : 'Paid');

  // Item Lines
  const [lines, setLines] = useState(() => {
    if (editingInvoice && Array.isArray(editingInvoice.items) && editingInvoice.items.length > 0) {
      return editingInvoice.items.map(item => ({
        id: item.id || Math.random().toString(),
        productId: item.productId || '',
        name: item.name || item.productName || 'Namkeen Item',
        qty: Number(item.qty || item.quantity || 1),
        unit: item.unit || 'kg',
        rate: Number(item.rate || item.price || 150),
        discount: Number(item.discount || 0),
        gstRate: Number(item.gstRate ?? (item.taxRate ?? 5))
      }));
    }
    // Default starting line with Namkeen sample
    return [
      {
        id: 'line-1',
        productId: '',
        name: 'Sev Mamra (250g)',
        qty: 10,
        unit: 'pkt',
        rate: 60,
        discount: 0,
        gstRate: 5
      }
    ];
  });

  // Calculate live line amounts
  const calculatedLines = useMemo(() => {
    return lines.map(line => {
      const gross = (Number(line.qty) || 0) * (Number(line.rate) || 0);
      const discountAmt = gross * ((Number(line.discount) || 0) / 100);
      const taxable = gross - discountAmt;
      const gstAmt = taxable * ((Number(line.gstRate) || 0) / 100);
      const total = taxable + gstAmt;
      return {
        ...line,
        gross,
        taxable: Math.round(taxable * 100) / 100,
        gstAmt: Math.round(gstAmt * 100) / 100,
        total: Math.round(total * 100) / 100
      };
    });
  }, [lines]);

  const invoiceSummary = useMemo(() => {
    const taxable = calculatedLines.reduce((acc, l) => acc + l.taxable, 0);
    const gstTotal = calculatedLines.reduce((acc, l) => acc + l.gstAmt, 0);
    const grandTotal = Math.round((taxable + gstTotal) * 100) / 100;
    return {
      taxable: Math.round(taxable * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      grandTotal
    };
  }, [calculatedLines]);

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: 'line-' + Math.random().toString().slice(2, 7),
        productId: '',
        name: '',
        qty: 1,
        unit: 'kg',
        rate: 100,
        discount: 0,
        gstRate: 5
      }
    ]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, val) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };

      // Auto-fill from inventory if product selected
      if (field === 'productId') {
        const prod = inventory.find(p => p.id === val);
        if (prod) {
          updated[index].name = prod.name || prod.title;
          updated[index].rate = Number(prod.price || prod.salePrice || 100);
          updated[index].unit = prod.unit || 'kg';
          updated[index].gstRate = Number(prod.gstRate ?? 5);
        }
      }
      return updated;
    });
  };

  const handlePartySelect = (custName) => {
    setPartyName(custName);
    const cust = customers.find(c => c.name === custName);
    if (cust) {
      if (cust.gstin) {
        setGstin(cust.gstin);
        setBillType('B2B');
      }
      if (cust.phone || cust.mobile) setPhone(cust.phone || cust.mobile);
      if (cust.address) setAddress(cust.address);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert('Please enter a party name or customer name.');
      return;
    }

    const payload = {
      id: editingInvoice?.original?.id || editingInvoice?.id || 'inv-' + Date.now(),
      invoiceNo: billNo,
      invoice_number: billNo,
      date,
      invoice_date: date,
      customer_name: partyName,
      customerName: partyName,
      partyName,
      customerGstin: gstin || '-',
      gstin: gstin || '-',
      customerMobile: phone,
      customerAddress: address,
      billType,
      taxType: (gstin.startsWith('24') || !gstin) ? 'CGST + SGST (Gujarat)' : 'IGST (Interstate)',
      paymentMode,
      status,
      items: calculatedLines.map(l => ({
        productId: l.productId,
        name: l.name || 'Namkeen Item',
        qty: Number(l.qty) || 1,
        quantity: Number(l.qty) || 1,
        unit: l.unit,
        rate: Number(l.rate) || 0,
        discount: Number(l.discount) || 0,
        gstRate: Number(l.gstRate) || 5,
        taxable: l.taxable,
        gstAmt: l.gstAmt,
        total: l.total
      })),
      lines: calculatedLines,
      taxable: invoiceSummary.taxable,
      subtotal: invoiceSummary.taxable,
      gstTotal: invoiceSummary.gstTotal,
      tax: invoiceSummary.gstTotal,
      total: invoiceSummary.grandTotal,
      grandTotal: invoiceSummary.grandTotal,
      paid: status === 'Paid' ? invoiceSummary.grandTotal : 0,
      balance: status === 'Paid' ? 0 : invoiceSummary.grandTotal,
      source: editingInvoice ? editingInvoice.source : 'Trinetr ERP'
    };

    onSave(payload);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#ffffff', borderRadius: '10px', width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '14px 20px', background: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              {editingInvoice ? '✎ Modify Sales Bill (F3)' : '+ New Sales Entry (F2)'}
            </h2>
            <span style={{ fontSize: '11px', opacity: 0.85 }}>Trinetr ERP &gt; Transaction &gt; Sales Entry</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {/* Row 1: Bill No, Date, Bill Type, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Bill / Invoice No *</label>
              <input
                type="text"
                className="form-control"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                required
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Bill Date *</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Bill Type</label>
              <select
                className="form-control"
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="B2B">B2B (Tax Invoice with GST)</option>
                <option value="B2C">B2C (Retail Cash Memo)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Payment Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid / Credit</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
          </div>

          {/* Row 2: Customer / Party Details */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Party / Customer Name *</label>
                <input
                  type="text"
                  list="party-suggestions"
                  placeholder="Type name or select..."
                  value={partyName}
                  onChange={(e) => handlePartySelect(e.target.value)}
                  required
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                <datalist id="party-suggestions">
                  {customers.map((c, i) => (
                    <option key={i} value={c.name} />
                  ))}
                  <option value="Cash Sale (Retail Counter)" />
                  <option value="Jay Khodiyar Traders" />
                  <option value="Maruti Provision Store" />
                  <option value="Shreeji Sweets & Farsan" />
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Party GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 24AABCS1429B1Z1"
                  value={gstin}
                  onChange={(e) => {
                    setGstin(e.target.value);
                    if (e.target.value.trim().length > 5) setBillType('B2B');
                  }}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Mobile / WhatsApp</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / GPay / Paytm">UPI / GPay / Paytm</option>
                  <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                  <option value="Credit / Khata">Credit / Khata</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Product Line Items Table */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Item Line Details</strong>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddLine}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} /> Add Row
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '35px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', minWidth: '180px' }}>Item / Description</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '70px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '65px' }}>Unit</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '85px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '65px', textAlign: 'right' }}>Disc %</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '75px', textAlign: 'right' }}>GST %</th>
                    <th style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', width: '100px', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedLines.map((line, idx) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          list="product-suggestions"
                          value={line.name}
                          onChange={(e) => handleLineChange(idx, 'name', e.target.value)}
                          placeholder="Select or enter item..."
                          style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={line.qty}
                          onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          value={line.unit}
                          onChange={(e) => handleLineChange(idx, 'unit', e.target.value)}
                          style={{ width: '100%', padding: '4px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="kg">kg</option>
                          <option value="pkt">pkt</option>
                          <option value="box">box</option>
                          <option value="gm">gm</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.rate}
                          onChange={(e) => handleLineChange(idx, 'rate', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discount}
                          onChange={(e) => handleLineChange(idx, 'discount', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          value={line.gstRate}
                          onChange={(e) => handleLineChange(idx, 'gstRate', e.target.value)}
                          style={{ width: '100%', padding: '4px 4px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                        ₹{line.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 1}
                          style={{ background: 'none', border: 'none', color: lines.length <= 1 ? '#cbd5e1' : '#dc2626', cursor: lines.length <= 1 ? 'not-allowed' : 'pointer' }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <datalist id="product-suggestions">
              {inventory.map(p => (
                <option key={p.id} value={p.name || p.title} />
              ))}
              <option value="Sev Mamra (250g)" />
              <option value="Bhavnagri Gathiya (500g)" />
              <option value="Ratlami Sev (500g)" />
              <option value="Sing Bhujia (200g)" />
              <option value="Chana Dal Masala (250g)" />
              <option value="Papdi Gathiya (500g)" />
              <option value="Khatta Meetha Mix (500g)" />
            </datalist>
          </div>

          {/* Row 4: Totals Summary Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Taxable Amount:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{invoiceSummary.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                <span>Total GST:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{invoiceSummary.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ height: '1px', background: '#cbd5e1', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>
                <span>Grand Total:</span>
                <span style={{ fontFamily: 'monospace' }}>₹{invoiceSummary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#1e3a8a', borderColor: '#1e3a8a', padding: '8px 20px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={16} /> {editingInvoice ? 'Update Invoice' : 'Save Invoice (F2)'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-component: Professional GST Tax Invoice Print Modal
// -------------------------------------------------------------
function SalesPrintModal({ invoice, profile = {}, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header Controls */}
        <div style={{ padding: '12px 18px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>TAX INVOICE PREVIEW - {invoice.billNo}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Printer size={14} /> Print Bill
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div ref={printRef} style={{ padding: '32px', overflowY: 'auto', flex: 1, color: '#0f172a', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
          
          {/* Invoice Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>
                {profile.name || 'JAY AMBE NAMKEEN'}
              </h1>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#475569' }}>
                {profile.tagline || 'Namkeen & Farsan Manufacturer & Wholesaler'}
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>
                {profile.address || 'Plot No. 12, GIDC Industrial Area, Gujarat, India'}
              </p>
              <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 700 }}>
                GSTIN: <span style={{ fontFamily: 'monospace' }}>{profile.gstin || '24CPVPC7753J1Z8'}</span>
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>
                Phone: {profile.phone || '+91 8488943771'} | Email: {profile.email || 'trinetr1901@gmail.com'}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ background: '#1e3a8a', color: '#ffffff', fontWeight: 800, padding: '4px 12px', borderRadius: '4px', display: 'inline-block', fontSize: '14px', marginBottom: '6px' }}>
                TAX INVOICE
              </div>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>
                Invoice No: <strong>{invoice.billNo}</strong>
              </p>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>
                Date: <strong>{invoice.date}</strong>
              </p>
              <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>
                Type: {invoice.billType} | {invoice.taxType}
              </p>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Billed To:</strong>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{invoice.partyName}</div>
            <div style={{ fontSize: '12px', color: '#334155' }}>
              GSTIN: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{invoice.gstin}</span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'center', width: '30px' }}>#</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '60px' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Rate (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Taxable (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '70px' }}>GST (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                invoice.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{it.name || it.productName || 'Namkeen Item'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{it.qty || it.quantity || 1} {it.unit || ''}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(it.rate || it.price || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(it.taxable || (it.rate * it.qty * 0.95) || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(it.gstAmt || ((it.rate * it.qty) - (it.taxable || 0)) || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>₹{Number(it.total || (it.rate * it.qty) || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>1</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{invoice.itemsDesc || 'Namkeen Assorted'}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{invoice.totalQty || 1} Units</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(invoice.taxableAmt || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(invoice.taxableAmt || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(invoice.gstAmt || 0).toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>₹{Number(invoice.netTotal || 0).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '350px' }}>
              <p style={{ margin: '0 0 4px 0' }}><strong>Terms & Conditions:</strong></p>
              <p style={{ margin: 0 }}>1. Goods once sold will not be taken back.<br />2. Interest @ 18% p.a. will be charged if bill is not paid on due date.<br />3. Subject to Gujarat jurisdiction only.</p>
            </div>

            <div style={{ width: '240px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Taxable Amount:</span>
                <span style={{ fontFamily: 'monospace' }}>₹{invoice.taxableAmt.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>GST (CGST + SGST):</span>
                <span style={{ fontFamily: 'monospace' }}>₹{invoice.gstAmt.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid #0f172a', fontWeight: 800, fontSize: '14px', color: '#1e3a8a' }}>
                <span>Grand Total:</span>
                <span style={{ fontFamily: 'monospace' }}>₹{invoice.netTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ textAlign: 'center', width: '180px' }}>
              <div style={{ height: '35px' }} />
              <div style={{ borderTop: '1px solid #475569', fontSize: '11px', paddingTop: '4px' }}>Receiver's Signature</div>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '25px' }}>For, {profile.name || 'JAY AMBE NAMKEEN'}</div>
              <div style={{ borderTop: '1px solid #475569', fontSize: '11px', paddingTop: '4px' }}>Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
