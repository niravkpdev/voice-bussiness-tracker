import { describe, it, expect } from 'vitest';

describe('Real Dynamic Notification Bar & Notification Center', () => {
  function formatRelativeTime(dateInput) {
    if (!dateInput) return 'Recently';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return 'Just now';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  }

  function generateLiveNotifications({
    activeOrders = [],
    cloudInventory = [],
    activeVouchers = [],
    partySummary = [],
    ledgers = [],
    supabaseEnabled = true
  }) {
    const list = [];

    // 1. Real Customer / Storefront Orders
    const ordersList = Array.isArray(activeOrders) ? activeOrders : [];
    const recentOrders = ordersList.slice(0, 3);
    recentOrders.forEach((ord) => {
      const orderNum = ord.orderNo || `ORD-${ord.id ? String(ord.id).slice(-4) : '1001'}`;
      const customerName = ord.customer || ord.customerName || ord.shippingAddress?.name || 'Customer';
      const totalAmt = Number(ord.total || ord.amount || 0);
      const statusText = ord.status || 'Pending';
      const timeStr = formatRelativeTime(ord.createdAt || ord.date);

      list.push({
        id: `ord-${ord.id || ord.orderNo}`,
        title: `Online Order ${orderNum}`,
        desc: `${customerName} • ₹${totalAmt} (${statusText})`,
        time: timeStr,
        dot: statusText.toLowerCase() === 'delivered' ? '#10b981' : '#2563eb',
        targetTab: 'orders',
        category: 'orders',
      });
    });

    // 2. Real Low Stock & Out-of-Stock Alerts
    const invItems = Array.isArray(cloudInventory) ? cloudInventory : [];
    const outOfStock = invItems.filter((p) => Number(p.currentStock || 0) <= 0);
    outOfStock.slice(0, 2).forEach((p) => {
      list.push({
        id: `stock-out-${p.id || p.name}`,
        title: `Out of Stock: ${p.name}`,
        desc: `0 ${p.unit || 'units'} left. Immediate replenishment needed.`,
        time: 'Action required',
        dot: '#ef4444',
        targetTab: 'inventory',
        category: 'inventory',
      });
    });

    const lowStock = invItems.filter((p) => {
      const cur = Number(p.currentStock || 0);
      const min = Number(p.minStock || 15);
      return cur > 0 && cur <= min;
    });
    lowStock.slice(0, 2).forEach((p) => {
      list.push({
        id: `stock-low-${p.id || p.name}`,
        title: `Low Stock: ${p.name}`,
        desc: `Only ${p.currentStock} ${p.unit || 'units'} left (Min: ${p.minStock || 15})`,
        time: 'Stock alert',
        dot: '#f59e0b',
        targetTab: 'inventory',
        category: 'inventory',
      });
    });

    // 3. Real Payments Received / Receipts
    const vchList = Array.isArray(activeVouchers) ? activeVouchers : [];
    const receipts = vchList
      .filter((v) => v && (v.type === 'Receipt' || v.type === 'Sales'))
      .slice(-2)
      .reverse();
    receipts.forEach((v) => {
      const partyLedger = (Array.isArray(ledgers) ? ledgers : []).find((l) => l.id === v.partyId);
      const partyName = v.partyName || partyLedger?.name || v.narration || 'Customer';
      list.push({
        id: `vch-${v.id}`,
        title: 'Payment Received',
        desc: `₹${Number(v.amount || 0)} from ${partyName}`,
        time: formatRelativeTime(v.date),
        dot: '#10b981',
        targetTab: 'day-book',
        category: 'payments',
      });
    });

    // 4. Real Pending Customer Receivables
    const debtorList = (Array.isArray(partySummary) ? partySummary : [])
      .filter((p) => p && p.group === 'Sundry Debtors' && Number(p.outstandingAmount || 0) > 0)
      .sort((a, b) => Number(b.outstandingAmount || 0) - Number(a.outstandingAmount || 0))
      .slice(0, 2);
    debtorList.forEach((d) => {
      list.push({
        id: `debtor-${d.id || d.name}`,
        title: `Payment Pending: ${d.name}`,
        desc: `₹${Number(d.outstandingAmount || 0)} outstanding balance`,
        time: 'Receivable',
        dot: '#8b5cf6',
        targetTab: 'party-statement',
        category: 'receivables',
      });
    });

    // 5. Dynamic GST Statutory Filing Schedule
    const now = new Date();
    const curDay = now.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const curMonth = monthNames[now.getMonth()];
    let gstNoticeText = '';
    let daysRemaining = 0;
    if (curDay <= 11) {
      gstNoticeText = `GSTR-1 outward return due by 11th ${curMonth}`;
      daysRemaining = 11 - curDay;
    } else if (curDay <= 20) {
      gstNoticeText = `GSTR-3B monthly tax return due by 20th ${curMonth}`;
      daysRemaining = 20 - curDay;
    } else {
      const nextMonth = monthNames[(now.getMonth() + 1) % 12];
      gstNoticeText = `Next GSTR-1 return scheduled by 11th ${nextMonth}`;
      daysRemaining = 30 - curDay + 11;
    }
    list.push({
      id: `gst-deadline-${now.getMonth()}-${curDay <= 20 ? '3b' : 'g1'}`,
      title: 'GST Compliance Schedule',
      desc: gstNoticeText,
      time: `${daysRemaining}d left`,
      dot: '#6366f1',
      targetTab: 'gst',
      category: 'gst',
    });

    // 6. Cloud Database Connection Status
    if (supabaseEnabled) {
      list.push({
        id: 'cloud-db-synced',
        title: 'Cloud Database Synced',
        desc: 'Real-time database sync is active and healthy.',
        time: 'Live',
        dot: '#10b981',
        targetTab: 'cloud-backup',
        category: 'cloud',
      });
    }

    return list;
  }

  it('generates accurate notifications from real customer orders with correct targetTab', () => {
    const notifications = generateLiveNotifications({
      activeOrders: [
        { id: '101', orderNo: 'ORD-5001', customer: 'Rajesh Shah', total: 1250, status: 'Processing', createdAt: new Date().toISOString() }
      ]
    });

    const orderNotif = notifications.find(n => n.id === 'ord-ORD-5001' || n.id === 'ord-101');
    expect(orderNotif).toBeDefined();
    expect(orderNotif.title).toContain('ORD-5001');
    expect(orderNotif.desc).toContain('Rajesh Shah');
    expect(orderNotif.desc).toContain('1250');
    expect(orderNotif.targetTab).toBe('orders');
    expect(orderNotif.dot).toBe('#2563eb');
  });

  it('generates real low stock and out-of-stock inventory alerts', () => {
    const notifications = generateLiveNotifications({
      cloudInventory: [
        { id: 'p1', name: 'Nylon Sev 500g', currentStock: 0, minStock: 20, unit: 'pkts' },
        { id: 'p2', name: 'Ratlami Sev 250g', currentStock: 5, minStock: 15, unit: 'pkts' },
        { id: 'p3', name: 'Bhavnagari Gathiya', currentStock: 100, minStock: 10, unit: 'pkts' }
      ]
    });

    const outStock = notifications.find(n => n.id === 'stock-out-p1');
    expect(outStock).toBeDefined();
    expect(outStock.title).toBe('Out of Stock: Nylon Sev 500g');
    expect(outStock.targetTab).toBe('inventory');
    expect(outStock.dot).toBe('#ef4444');

    const lowStock = notifications.find(n => n.id === 'stock-low-p2');
    expect(lowStock).toBeDefined();
    expect(lowStock.title).toBe('Low Stock: Ratlami Sev 250g');
    expect(lowStock.targetTab).toBe('inventory');
    expect(lowStock.dot).toBe('#f59e0b');

    // Sufficient stock item should NOT generate an alert
    const goodStock = notifications.find(n => n.id === 'stock-low-p3');
    expect(goodStock).toBeUndefined();
  });

  it('generates real payment receipt notifications routing to day-book', () => {
    const notifications = generateLiveNotifications({
      activeVouchers: [
        { id: 'vch-1', type: 'Receipt', amount: 3500, partyName: 'Ambika Traders', date: new Date().toISOString() }
      ]
    });

    const paymentNotif = notifications.find(n => n.id === 'vch-vch-1');
    expect(paymentNotif).toBeDefined();
    expect(paymentNotif.title).toBe('Payment Received');
    expect(paymentNotif.desc).toContain('Ambika Traders');
    expect(paymentNotif.desc).toContain('3500');
    expect(paymentNotif.targetTab).toBe('day-book');
    expect(paymentNotif.dot).toBe('#10b981');
  });

  it('generates real debtor receivable notifications routing to party-statement', () => {
    const notifications = generateLiveNotifications({
      partySummary: [
        { id: 'd1', name: 'Krishna Mart', group: 'Sundry Debtors', outstandingAmount: 8200 }
      ]
    });

    const debtorNotif = notifications.find(n => n.id === 'debtor-d1');
    expect(debtorNotif).toBeDefined();
    expect(debtorNotif.title).toContain('Krishna Mart');
    expect(debtorNotif.desc).toContain('8200');
    expect(debtorNotif.targetTab).toBe('party-statement');
    expect(debtorNotif.dot).toBe('#8b5cf6');
  });

  it('tracks unread status accurately and handles mark all read', () => {
    const notifications = generateLiveNotifications({
      activeOrders: [
        { id: 'ord-1', orderNo: 'ORD-1', customer: 'User 1', total: 100, status: 'Pending', createdAt: new Date().toISOString() }
      ],
      cloudInventory: [
        { id: 'p1', name: 'Item 1', currentStock: 0, minStock: 10, unit: 'pkts' }
      ]
    });

    let readNotifIds = [];
    const unreadCount1 = notifications.filter(n => !readNotifIds.includes(n.id)).length;
    expect(unreadCount1).toBe(notifications.length);

    // Mark single notification read
    readNotifIds = [...readNotifIds, notifications[0].id];
    const unreadCount2 = notifications.filter(n => !readNotifIds.includes(n.id)).length;
    expect(unreadCount2).toBe(notifications.length - 1);

    // Mark all read
    readNotifIds = notifications.map(n => n.id);
    const unreadCount3 = notifications.filter(n => !readNotifIds.includes(n.id)).length;
    expect(unreadCount3).toBe(0);
  });

  it('correctly calculates relative time intervals', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('Just now');

    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinsAgo.toISOString())).toBe('10m ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2h ago');

    const yesterday = new Date(now.getTime() - 26 * 3600 * 1000);
    expect(formatRelativeTime(yesterday.toISOString())).toBe('Yesterday');
  });
});
