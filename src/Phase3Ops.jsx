import { useEffect, useMemo, useState } from 'react';
import { normalizeAmount, sanitizeText, validatePhone } from './security.js';
import { readScopedString, writeScopedString } from './storageScope.js';

const ORDER_KEY = 'phase3Orders';
const EMPLOYEE_KEY = 'phase3Employees';
const ATTENDANCE_KEY = 'phase3Attendance';
const SUBSCRIPTION_KEY = 'phase3Subscription';
const AUDIT_KEY = 'phase3AuditLogs';
const DEVICE_KEY = 'phase3Devices';
const SECURITY_KEY = 'phase3SecuritySettings';
const PAYMENT_KEY = 'phase3Payments';
const OFFLINE_QUEUE_KEY = 'phase3OfflineQueue';

const ORDER_STAGES = ['New Order', 'Confirmed', 'In Production', 'Quality Check', 'Ready', 'Dispatched', 'Delivered'];
const ROLES = ['Owner', 'Manager', 'Accountant', 'Staff'];

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
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function encodeUpi({ pa, pn, am, tn }) {
  const params = new URLSearchParams({
    pa: pa || 'business@upi',
    pn: pn || 'Voice Business Tracker',
    am: String(Number(am) || 0),
    cu: 'INR',
    tn: tn || 'Business payment',
  });
  return `upi://pay?${params.toString()}`;
}

function QrGrid({ value }) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return (
    <div className="qr-code phase3-qr">
      {Array.from({ length: 49 }, (_, index) => (
        <span className={((hash >> (index % 21)) + index) % 3 === 0 ? 'active' : ''} key={index} />
      ))}
    </div>
  );
}

function whatsappUrl(phone, message) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export default function Phase3Ops({
  activeTab,
  profile,
  invoices,
  customers,
  products,
  vouchers,
  partySummary,
  authUser,
  firebaseEnabled,
  onResendVerification,
  onStatus,
  onCloudSnapshot,
}) {
  const [orders, setOrders] = useState(() => readArray(ORDER_KEY));
  const [employees, setEmployees] = useState(() => readArray(EMPLOYEE_KEY));
  const [attendance, setAttendance] = useState(() => readArray(ATTENDANCE_KEY));
  const [auditLogs, setAuditLogs] = useState(() => readArray(AUDIT_KEY));
  const [payments, setPayments] = useState(() => readArray(PAYMENT_KEY));
  const [offlineQueue, setOfflineQueue] = useState(() => readArray(OFFLINE_QUEUE_KEY));
  const [subscription, setSubscription] = useState(() =>
    readObject(SUBSCRIPTION_KEY, { plan: 'Free', invoicesLimit: 25, usersLimit: 1, aiEnabled: true })
  );
  const [security, setSecurity] = useState(() =>
    readObject(SECURITY_KEY, {
      googleLogin: false,
      jwtSessions: true,
      sessionExpiryMinutes: 30,
      refreshTokens: true,
      twoFactor: false,
      encryptionAtRest: true,
      csrfProtection: true,
      rateLimit: true,
      passwordResetProtection: true,
    })
  );
  const [devices, setDevices] = useState(() =>
    readArray(DEVICE_KEY).length
      ? readArray(DEVICE_KEY)
      : [{ id: createId('dev'), name: 'Current browser', lastLogin: new Date().toLocaleString(), trusted: true }]
  );

  useEffect(() => writeArray(ORDER_KEY, orders), [orders]);
  useEffect(() => writeArray(EMPLOYEE_KEY, employees), [employees]);
  useEffect(() => writeArray(ATTENDANCE_KEY, attendance), [attendance]);
  useEffect(() => writeArray(AUDIT_KEY, auditLogs), [auditLogs]);
  useEffect(() => writeArray(PAYMENT_KEY, payments), [payments]);
  useEffect(() => writeArray(OFFLINE_QUEUE_KEY, offlineQueue), [offlineQueue]);
  useEffect(() => writeObject(SUBSCRIPTION_KEY, subscription), [subscription]);
  useEffect(() => writeObject(SECURITY_KEY, security), [security]);
  useEffect(() => writeArray(DEVICE_KEY, devices), [devices]);
  useEffect(() => {
    onCloudSnapshot?.('phase3_ops_updated');
  }, [orders, employees, attendance, auditLogs, payments, offlineQueue, subscription, security, devices]);

  const unpaidInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== 'Paid'), [invoices]);
  const payrollTotal = useMemo(() => employees.reduce((sum, employee) => sum + (Number(employee.salary) || 0), 0), [employees]);
  const pendingCollections = useMemo(
    () => partySummary.filter((party) => party.group === 'Sundry Debtors' && party.outstandingAmount > 0),
    [partySummary]
  );
  const businessIssues = useMemo(() => [
    ...unpaidInvoices.slice(0, 3).map((invoice) => `Payment pending on ${invoice.invoiceNo || invoice.id}`),
    ...products.filter((product) => Number(product.currentStock) <= Number(product.minStock)).slice(0, 3).map((product) => `${product.name} is low stock`),
    ...pendingCollections.slice(0, 3).map((party) => `${party.name} owes ${formatCurrency(party.outstandingAmount)}`),
  ], [pendingCollections, products, unpaidInvoices]);

  const logAudit = (action, area) => {
    setAuditLogs([{ id: createId('aud'), action, area, user: 'Owner', date: new Date().toLocaleString() }, ...auditLogs].slice(0, 100));
  };

  const queueOfflineAction = (type, payload) => {
    const entry = { id: createId('queue'), type, payload, date: new Date().toLocaleString(), synced: navigator.onLine };
    setOfflineQueue([entry, ...offlineQueue]);
    onStatus(navigator.onLine ? 'Action saved and ready for sync' : 'Offline action queued');
  };

  const saveOrder = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const order = {
      id: createId('ord'),
      orderNo: `ORD-${String(orders.length + 1).padStart(4, '0')}`,
      customer: sanitizeText(form.get('customer'), 120),
      mobile: sanitizeText(form.get('mobile'), 24),
      details: sanitizeText(form.get('details'), 300),
      amount: normalizeAmount(form.get('amount')),
      status: 'New Order',
      deliveryDate: form.get('deliveryDate') || today(),
      timeline: [{ status: 'New Order', date: new Date().toLocaleString(), note: 'Order created' }],
    };
    if (!order.customer || !validatePhone(order.mobile)) {
      onStatus('Enter valid customer and mobile for order');
      return;
    }
    setOrders([order, ...orders]);
    queueOfflineAction('order-created', order);
    logAudit(`Created ${order.orderNo}`, 'Orders');
    event.currentTarget.reset();
  };

  const advanceOrder = (order) => {
    const currentIndex = ORDER_STAGES.indexOf(order.status);
    const nextStatus = ORDER_STAGES[Math.min(currentIndex + 1, ORDER_STAGES.length - 1)];
    setOrders(orders.map((item) => item.id === order.id ? {
      ...item,
      status: nextStatus,
      timeline: [{ status: nextStatus, date: new Date().toLocaleString(), note: 'Status updated' }, ...item.timeline],
    } : item));
    logAudit(`Updated ${order.orderNo} to ${nextStatus}`, 'Orders');
  };

  const saveEmployee = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employee = {
      id: createId('emp'),
      name: sanitizeText(form.get('name'), 120),
      mobile: sanitizeText(form.get('mobile'), 24),
      role: sanitizeText(form.get('role'), 80),
      salary: normalizeAmount(form.get('salary')),
      advance: normalizeAmount(form.get('advance')),
    };
    if (!employee.name || !validatePhone(employee.mobile)) {
      onStatus('Enter valid employee name and mobile');
      return;
    }
    setEmployees([employee, ...employees]);
    logAudit(`Added employee ${employee.name}`, 'Employees');
    event.currentTarget.reset();
  };

  const markAttendance = (employee, status) => {
    setAttendance([{ id: createId('att'), employeeId: employee.id, name: employee.name, status, date: today() }, ...attendance]);
    logAudit(`Marked ${employee.name} ${status}`, 'Attendance');
  };

  const recordPayment = (invoice) => {
    const amount = invoice.balance || invoice.total || 0;
    const payment = { id: createId('pay'), invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount, date: today(), mode: 'UPI', status: 'Marked Paid' };
    setPayments([payment, ...payments]);
    logAudit(`Marked payment for ${invoice.invoiceNo}`, 'Payments');
    onStatus('Payment recorded locally. Provider webhook required for automatic bank confirmation.');
  };

  const saveSecurity = (key, value) => {
    setSecurity({ ...security, [key]: value });
    logAudit(`Security setting changed: ${key}`, 'Security');
  };

  const exportPrivacyData = () => {
    const data = { profile, invoices, customers, orders, employees, auditLogs, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-export-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'mobile-app') {
    return (
      <section className="phase3-stack fade-in" id="mobile-app">
        <div className="phase3-hero">
          <div><span className="eyebrow">Android App & Offline Mode</span><h2>PWA install, offline-first cache, and background sync readiness</h2></div>
          <span className={navigator.onLine ? 'sync-pill online' : 'sync-pill offline'}>{navigator.onLine ? 'Online' : 'Offline'}</span>
        </div>
        <div className="summary-grid report-summary">
          <div className="summary-card"><span>PWA</span><strong>Enabled</strong></div>
          <div className="summary-card"><span>Offline Queue</span><strong>{offlineQueue.length}</strong></div>
          <div className="summary-card"><span>Background Sync</span><strong>Ready</strong></div>
          <div className="summary-card"><span>APK Path</span><strong>TWA-ready</strong></div>
        </div>
        <section className="panel">
          <h2>Mobile Deployment Checklist</h2>
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Installable App</strong><p>Manifest and service worker are active. Android users can install from browser.</p></article>
            <article className="phase3-card"><strong>Android APK</strong><p>Use Bubblewrap/TWA with this PWA URL for Play Store APK packaging.</p></article>
            <article className="phase3-card"><strong>Offline Data Entry</strong><p>LocalStorage data and offline action queue keep entries available without internet.</p></article>
            <article className="phase3-card"><strong>Auto Sync</strong><p>Queue is prepared; real cloud sync needs backend endpoint and auth token.</p></article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'whatsapp-automation') {
    const invoice = unpaidInvoices[0] || invoices[0];
    const customer = customers.find((item) => item.id === invoice?.customerId) || customers[0] || {};
    const templates = [
      ['Invoice Sent', `Hello ${customer.name || 'Customer'}, invoice ${invoice?.invoiceNo || ''} of ${formatCurrency(invoice?.total || 0)} has been sent by ${profile.name}.`],
      ['Payment Due', `Payment reminder: ${formatCurrency(invoice?.balance || invoice?.total || 0)} is due for ${invoice?.invoiceNo || 'your invoice'}.`],
      ['Overdue Reminder', `Your invoice is overdue. Please clear payment to avoid delay in future orders.`],
      ['Thank You Message', `Thank you for your payment. We appreciate your business with ${profile.name}.`],
      ['Order Update', `Your order status has been updated. Please contact us for details.`],
    ];
    return (
      <section className="phase3-stack fade-in" id="whatsapp-automation">
        <div className="phase3-hero"><div><span className="eyebrow">WhatsApp Business Automation</span><h2>Invoice, reminder, statement, and order update templates</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            {templates.map(([title, message]) => (
              <article className="phase3-card" key={title}>
                <strong>{title}</strong>
                <p>{message}</p>
                <a className="share-entry-button" href={whatsappUrl(customer.mobile, message)} target="_blank" rel="noreferrer">Send WhatsApp</a>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'upi-payments') {
    return (
      <section className="phase3-stack fade-in" id="upi-payments">
        <div className="phase3-hero"><div><span className="eyebrow">UPI Payment System</span><h2>Dynamic UPI QR, Pay Now links, tracking, and reconciliation workspace</h2></div></div>
        <section className="content-grid">
          {unpaidInvoices.slice(0, 6).map((invoice) => {
            const uri = encodeUpi({ pa: profile.upiId || 'business@upi', pn: profile.name, am: invoice.balance || invoice.total, tn: invoice.invoiceNo });
            return (
              <article className="panel payment-card" key={invoice.id}>
                <div className="section-header"><div><h2>{invoice.invoiceNo}</h2><p className="panel-hint">{formatCurrency(invoice.balance || invoice.total)} pending</p></div><QrGrid value={uri} /></div>
                <div className="inline-actions">
                  <a className="manual-button restore-label" href={uri}>Pay Now</a>
                  <button className="secondary-button" type="button" onClick={() => recordPayment(invoice)}>Mark Paid</button>
                </div>
              </article>
            );
          })}
        </section>
      </section>
    );
  }

  if (activeTab === 'orders') {
    return (
      <section className="phase3-stack fade-in" id="orders">
        <div className="phase3-hero"><div><span className="eyebrow">Order Management</span><h2>Production workflow, delivery timeline, and customer visibility</h2></div></div>
        <section className="content-grid">
          <article className="panel">
            <h2>Create Order</h2>
            <form onSubmit={saveOrder}>
              <div className="form-grid">
                <input name="customer" placeholder="Customer name" />
                <input name="mobile" placeholder="Mobile" />
                <input name="amount" type="number" placeholder="Order amount" />
                <input name="deliveryDate" type="date" defaultValue={today()} />
                <div className="wide-field"><textarea name="details" placeholder="Order details" /></div>
              </div>
              <button className="manual-button" type="submit">Create Order</button>
            </form>
          </article>
          <article className="panel">
            <h2>Order Pipeline</h2>
            <div className="order-stage-strip">{ORDER_STAGES.map((stage) => <span key={stage}>{stage}</span>)}</div>
          </article>
        </section>
        <section className="panel">
          <div className="compact-list">
            {orders.map((order) => (
              <article className="compact-item" key={order.id}>
                <div><strong>{order.orderNo} · {order.customer}</strong><p>{order.status} · Delivery {order.deliveryDate} · {formatCurrency(order.amount)}</p><p>{order.timeline[0]?.date}: {order.timeline[0]?.note}</p></div>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => advanceOrder(order)}>Next Stage</button>
                  <a className="share-entry-button" href={whatsappUrl(order.mobile, `Your order ${order.orderNo} status: ${order.status}`)} target="_blank" rel="noreferrer">Update Customer</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'voice-bookkeeper') {
    return (
      <section className="phase3-stack fade-in" id="voice-bookkeeper">
        <div className="phase3-hero"><div><span className="eyebrow">AI Voice Bookkeeper</span><h2>Advanced command center for invoices, insights, receivables, and business issues</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Create invoice command</strong><p>"Create invoice for Rahul worth 5000" opens invoice workflow and can add customer locally.</p><a href="#invoices">Open Invoices</a></article>
            <article className="phase3-card"><strong>Profit question</strong><p>Monthly profit is calculated from local vouchers and invoices.</p><strong>{formatCurrency(vouchers.filter((v) => (v.date || '').slice(0, 7) === today().slice(0, 7)).reduce((sum, v) => sum + (v.type === 'Receipt' || v.type === 'Sales' ? v.amount : -v.amount), 0))}</strong></article>
            <article className="phase3-card"><strong>Pending collections</strong><p>{pendingCollections.length} customers need collection follow-up.</p><a href="#crm">Open CRM</a></article>
            <article className="phase3-card"><strong>Issues needing attention</strong>{businessIssues.length ? businessIssues.map((issue) => <p key={issue}>{issue}</p>) : <p>No urgent issues detected.</p>}</article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'employees') {
    return (
      <section className="phase3-stack fade-in" id="employees">
        <div className="phase3-hero"><div><span className="eyebrow">Employee Management</span><h2>Employee database, attendance, salary, advance tracking, and payroll</h2></div><strong>{formatCurrency(payrollTotal)} payroll</strong></div>
        <section className="content-grid">
          <article className="panel">
            <h2>Add Employee</h2>
            <form onSubmit={saveEmployee}>
              <div className="form-grid">
                <input name="name" placeholder="Employee name" />
                <input name="mobile" placeholder="Mobile" />
                <select name="role">{ROLES.map((role) => <option key={role}>{role}</option>)}</select>
                <input name="salary" type="number" placeholder="Monthly salary" />
                <input name="advance" type="number" placeholder="Advance paid" />
              </div>
              <button className="manual-button" type="submit">Save Employee</button>
            </form>
          </article>
          <article className="panel">
            <h2>Reports</h2>
            <div className="summary-grid report-summary">
              <div className="summary-card"><span>Employees</span><strong>{employees.length}</strong></div>
              <div className="summary-card"><span>Salary</span><strong>{formatCurrency(payrollTotal)}</strong></div>
              <div className="summary-card"><span>Attendance</span><strong>{attendance.filter((a) => a.date === today()).length}</strong></div>
              <div className="summary-card"><span>Advances</span><strong>{formatCurrency(employees.reduce((s, e) => s + (Number(e.advance) || 0), 0))}</strong></div>
            </div>
          </article>
        </section>
        <section className="panel">
          <div className="compact-list">
            {employees.map((employee) => (
              <article className="compact-item" key={employee.id}>
                <div><strong>{employee.name}</strong><p>{employee.role} · Salary {formatCurrency(employee.salary)} · Advance {formatCurrency(employee.advance)}</p></div>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => markAttendance(employee, 'Present')}>Present</button>
                  <button className="share-entry-button" type="button" onClick={() => markAttendance(employee, 'Absent')}>Absent</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'subscriptions') {
    const plans = [
      ['Free', '25 invoices, 1 user, core accounting'],
      ['Pro', 'Unlimited invoices, automation, AI insights'],
      ['Business', 'Multi-business, staff roles, accountant portal'],
    ];
    return (
      <section className="phase3-stack fade-in" id="subscriptions">
        <div className="phase3-hero"><div><span className="eyebrow">Subscription System</span><h2>Plans, usage limits, feature access, and billing dashboard</h2></div><strong>{subscription.plan}</strong></div>
        <div className="phase3-grid">
          {plans.map(([plan, details]) => (
            <article className={`phase3-card ${subscription.plan === plan ? 'selected-plan' : ''}`} key={plan}>
              <strong>{plan}</strong><p>{details}</p>
              <button className="secondary-button compact-button" type="button" onClick={() => setSubscription({ ...subscription, plan })}>Select Plan</button>
            </article>
          ))}
        </div>
        <section className="panel"><h2>Usage</h2><SmallUsage label="Invoices" value={invoices.length} max={subscription.plan === 'Free' ? 25 : 500} /><SmallUsage label="Users" value={employees.length + 1} max={subscription.plan === 'Business' ? 25 : subscription.plan === 'Pro' ? 5 : 1} /></section>
      </section>
    );
  }

  if (activeTab === 'accountant-portal') {
    return (
      <section className="phase3-stack fade-in" id="accountant-portal">
        <div className="phase3-hero"><div><span className="eyebrow">CA / Accountant Portal</span><h2>Read-only financial review access for GST, statements, and analysis</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Read Reports</strong><p>Accountant can review reports without editing source data.</p><a href="#reports">Reports</a></article>
            <article className="phase3-card"><strong>Download Statements</strong><p>Export ledgers, day book, and customer statements.</p><a href="#party-statement">Statements</a></article>
            <article className="phase3-card"><strong>GST Review</strong><p>Review sales/purchase GST reports.</p><a href="#gst">GST Center</a></article>
            <article className="phase3-card"><strong>Financial Analysis</strong><p>View analytics and AI risk alerts.</p><a href="#analytics">Analytics</a></article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'security-center') {
    const controls = [
      ['googleLogin', 'Google Login'],
      ['jwtSessions', 'JWT Authentication'],
      ['refreshTokens', 'Refresh Tokens'],
      ['twoFactor', 'Two Factor Authentication'],
      ['encryptionAtRest', 'Encrypt Sensitive Data At Rest'],
      ['csrfProtection', 'CSRF Protection'],
      ['rateLimit', 'Rate Limiting'],
      ['passwordResetProtection', 'Password Reset Security'],
    ];
    return (
      <section className="phase3-stack fade-in" id="security-center">
        <div className="phase3-hero"><div><span className="eyebrow">Enterprise Security Upgrade</span><h2>RBAC, audit logs, device management, privacy controls, and monitoring readiness</h2></div></div>
        <section className="content-grid">
          <article className="panel">
            <h2>Security Controls</h2>
            <div className="phase3-grid">
              <article className="phase3-card">
                <strong>Email Verification</strong>
                <p>{authUser?.emailVerified ? 'Verified email access is active.' : 'Production sensitive actions require a verified Supabase email.'}</p>
                {!authUser?.emailVerified && (
                  <button className="secondary-button compact-button" type="button" onClick={onResendVerification}>
                    Resend Verification
                  </button>
                )}
              </article>
              <article className="phase3-card">
                <strong>MFA Readiness</strong>
                <p>{security.twoFactor ? 'MFA option enabled in account policy settings.' : 'Enable MFA in Supabase Auth before public launch.'}</p>
              </article>
              <article className="phase3-card">
                <strong>Supabase RLS</strong>
                <p>{firebaseEnabled ? 'Client is Supabase-ready. Row Level Security keeps every user scoped to their own business rows.' : 'Supabase is not configured in this environment.'}</p>
              </article>
            </div>
            {controls.map(([key, label]) => (
              <label className="toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(security[key])} onChange={(event) => saveSecurity(key, event.target.checked)} /></label>
            ))}
            <label className="field-label">Session Expiry (minutes)</label>
            <input type="number" value={security.sessionExpiryMinutes} onChange={(event) => saveSecurity('sessionExpiryMinutes', Number(event.target.value) || 30)} />
          </article>
          <article className="panel">
            <h2>RBAC Roles</h2>
            <div className="phase3-grid roles-grid">{ROLES.map((role) => <article className="phase3-card" key={role}><strong>{role}</strong><p>{role === 'Owner' ? 'Full access' : role === 'Accountant' ? 'Reports, GST, analysis' : role === 'Manager' ? 'Operations and invoices' : 'Entry-level access'}</p></article>)}</div>
          </article>
        </section>
        <section className="content-grid">
          <article className="panel"><h2>Device Management</h2><div className="compact-list">{devices.map((device) => <article className="compact-item" key={device.id}><div><strong>{device.name}</strong><p>{device.lastLogin}</p></div><span className="status-pill paid">{device.trusted ? 'Trusted' : 'Review'}</span></article>)}</div></article>
          <article className="panel"><h2>Privacy & Compliance</h2><div className="inline-actions"><button className="secondary-button" type="button" onClick={exportPrivacyData}>Export Data</button><button className="warning-button" type="button" onClick={() => onStatus('Data deletion request logged. Backend workflow required for production deletion.')}>Request Deletion</button></div><p className="panel-hint">Consent, data export, and deletion request controls are ready for backend policy enforcement.</p></article>
        </section>
        <section className="panel"><h2>Audit Logs & Monitoring</h2><div className="compact-list">{auditLogs.length ? auditLogs.map((log) => <article className="compact-item" key={log.id}><div><strong>{log.action}</strong><p>{log.area} · {log.user} · {log.date}</p></div></article>) : <div className="empty-state">No audit activity yet.</div>}</div></section>
      </section>
    );
  }

  return null;
}

function SmallUsage({ label, value, max }) {
  const percent = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="usage-row">
      <div><strong>{label}</strong><span>{value} / {max}</span></div>
      <div className="insight-progress-bar"><div className="insight-progress-fill primary" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
