import React, { useState } from 'react';
import { CreditCard, Download, ExternalLink, Calendar, Check, Zap, Crown, Shield, Play, ArrowUpRight, CheckCircle2, Lock, Settings, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { getTrialDaysLeft, PLAN_LIMITS } from './subscription';
import { SubscriptionBadge } from './SubscriptionBadge';
import { SubscriptionPaymentModal } from './SubscriptionPaymentModal';

export function BillingSettings({ profile, onOpenPricing, onSelectPlan, onUpgradePlan, onContactSales, usage = {}, isPlatformOwner = false }) {
  const showPlatformOwnerSetup = Boolean(isPlatformOwner || profile?.isPlatformOwner);
  const currentPlan = profile?.subscriptionPlan || 'Free Trial';
  const planDetails = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['Free Trial'];
  const trialDaysLeft = getTrialDaysLeft(profile?.trialStartDate);
  const [billingCycle, setBillingCycle] = useState(profile?.subscriptionCycle || 'monthly');
  const [downloadSuccess, setDownloadSuccess] = useState('');

  // Checkout modal state
  const [checkoutModal, setCheckoutModal] = useState({
    isOpen: false,
    plan: 'Basic',
    cycle: 'monthly'
  });

  // Admin Payment Receiving Settings
  const [showAdminPaymentSetup, setShowAdminPaymentSetup] = useState(false);
  const [adminUpiId, setAdminUpiId] = useState(() => localStorage.getItem('trinetr_platform_upi') || profile?.platformUpiId || profile?.upiId || 'trinetr.namkeen@icici');
  const [adminRazorpayKey, setAdminRazorpayKey] = useState(() => localStorage.getItem('trinetr_razorpay_key') || '');
  const [adminSetupNotice, setAdminSetupNotice] = useState('');

  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem('trinetr_subscription_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'TRN-INV-2026-001',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        plan: currentPlan,
        cycle: billingCycle === 'yearly' ? 'Annual (20% Off)' : 'Monthly',
        amount: currentPlan === 'Free Trial' ? 0 : (billingCycle === 'yearly' ? (currentPlan === 'Basic' ? 948 : 4788) : (planDetails.price || 99)),
        status: currentPlan === 'Free Trial' ? 'Free Trial' : 'Paid'
      }
    ];
  });

  const customerCount = usage.customers ?? 0;
  const productCount = usage.products ?? 0;
  const employeeCount = usage.employees ?? 0;

  const handleAction = (targetPlan) => {
    if (targetPlan === 'Enterprise') {
      if (onContactSales) {
        onContactSales();
      } else {
        window.location.href = 'mailto:sales@trinetr.com?subject=Enterprise Plan Inquiry';
      }
      return;
    }

    if (targetPlan === 'Free Trial') {
      const callback = onSelectPlan || onUpgradePlan;
      if (callback) callback('Free Trial', billingCycle);
      return;
    }

    // Open Real Payment Checkout Modal for paid plans
    setCheckoutModal({
      isOpen: true,
      plan: targetPlan,
      cycle: billingCycle,
    });
  };

  const handlePaymentSuccess = (paymentRecord) => {
    const callback = onSelectPlan || onUpgradePlan;
    if (callback) {
      callback(paymentRecord.plan, paymentRecord.cycle);
    }
    const newInvoice = {
      id: paymentRecord.transactionId || `TRN-INV-${Date.now().toString(36).toUpperCase()}`,
      date: paymentRecord.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      plan: paymentRecord.plan,
      cycle: paymentRecord.cycle === 'yearly' ? 'Annual (20% Off)' : 'Monthly',
      amount: paymentRecord.amount,
      status: 'Paid',
      utr: paymentRecord.utr,
    };
    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);
    try {
      localStorage.setItem('trinetr_subscription_invoices', JSON.stringify(nextInvoices));
    } catch {}
    setDownloadSuccess(`🎉 Payment received! Successfully activated ${paymentRecord.plan} Plan.`);
    setTimeout(() => setDownloadSuccess(''), 5000);
  };

  const handleSaveAdminPaymentConfig = () => {
    try {
      localStorage.setItem('trinetr_platform_upi', adminUpiId.trim());
      localStorage.setItem('trinetr_razorpay_key', adminRazorpayKey.trim());
      setAdminSetupNotice('Payment receiving settings saved! Customer subscription payments will be routed to your account.');
      setTimeout(() => setAdminSetupNotice(''), 4000);
    } catch (e) {
      console.warn('Could not save payment config:', e);
    }
  };

  const handleDownloadInvoice = (inv) => {
    if (!inv) return;
    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${inv.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 20px; }
    .brand { font-size: 24px; font-weight: bold; color: #0284c7; }
    .meta { text-align: right; }
    .badge { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #059669; border-radius: 999px; font-size: 12px; font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .table th, .table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
    .table th { background: #f8fafc; font-weight: 600; }
    .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Trinetr Business Suite</div>
      <div style="color: #64748b;">Enterprise Business Management & Point of Sale</div>
      <div style="font-size: 13px; margin-top: 6px;">GSTIN: 24CPVPC7753J1Z8 | support@trinetr.com</div>
    </div>
    <div class="meta">
      <h2 style="margin: 0 0 6px 0; color: #0f172a;">TAX INVOICE</h2>
      <div><strong>Invoice #:</strong> ${inv.id}</div>
      <div><strong>Date:</strong> ${inv.date}</div>
      <div style="margin-top: 4px;"><span class="badge">${inv.status.toUpperCase()}</span></div>
    </div>
  </div>
  <div style="margin: 24px 0; font-size: 14px; line-height: 1.6;">
    <strong>Billed To:</strong><br/>
    ${profile?.name || 'Valued Business Customer'}<br/>
    ${profile?.owner ? 'Attn: ' + profile.owner + '<br/>' : ''}
    ${profile?.email ? profile.email + '<br/>' : ''}
    ${profile?.gstin ? 'Customer GSTIN: ' + profile.gstin + '<br/>' : ''}
  </div>
  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Billing Cycle</th>
        <th>SAC Code</th>
        <th>Qty</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Trinetr Business Suite - ${inv.plan} Plan</td>
        <td>${inv.cycle}</td>
        <td>998313 (Cloud SaaS Hosting)</td>
        <td>1</td>
        <td style="text-align: right;">₹${inv.amount}</td>
      </tr>
    </tbody>
  </table>
  <div class="total">
    <div>Total Paid: ₹${inv.amount}</div>
    <div style="font-size: 12px; color: #64748b; font-weight: normal; margin-top: 4px;">(Inclusive of all applicable GST taxes)</div>
  </div>
  <div class="footer">
    Thank you for choosing Trinetr Business Suite. All cloud business records are encrypted and secured with real-time replication.
  </div>
</body>
</html>`;

    try {
      const blob = new Blob([invoiceHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trinetr-Invoice-${inv.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(`Invoice ${inv.id} downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(''), 3500);
    } catch (e) {
      console.error('Invoice download failed:', e);
    }
  };

  const getCapacityPercent = (used, max) => {
    if (!max || max >= 999999) return 10;
    return Math.min(100, Math.round((used / max) * 100));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {downloadSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '12px 16px',
          borderRadius: '8px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} /> {downloadSuccess}
        </div>
      )}
      
      {/* Current Plan Overview */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Current Plan <SubscriptionBadge plan={currentPlan} />
            </h3>
            {currentPlan === 'Free Trial' ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                You have {trialDaysLeft} days left in your 1-month free trial.
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Your plan is currently active on <strong>{billingCycle === 'yearly' ? 'Yearly billing (20% Discount)' : 'Monthly billing'}</strong>. Next renewal: {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-IN')}.
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {planDetails.price === 'Custom' ? 'Custom' : `₹${planDetails.price}`}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginLeft: '4px' }}>/mo</span>
            {billingCycle === 'yearly' && currentPlan !== 'Free Trial' && currentPlan !== 'Enterprise' && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Billed annually with 20% discount</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="saas-primary-button" onClick={onOpenPricing || (() => {})}>
            Upgrade Plan
          </button>
          {currentPlan !== 'Free Trial' ? (
            <button
              className="secondary-button"
              style={{ color: 'var(--danger-color, #ef4444)' }}
              onClick={() => {
                if (window.confirm('Are you sure you want to revert to the Free Trial? You will keep all existing data.')) {
                  handleAction('Free Trial');
                }
              }}
            >
              Revert to Free Trial
            </button>
          ) : (
            <button className="secondary-button" onClick={() => handleAction('Basic')}>
              <Zap size={15} style={{ color: '#10b981' }} /> Switch to Basic (₹99/mo)
            </button>
          )}
        </div>
      </div>

      {/* Plan Limits & Live Usage Overview */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} /> Plan Limits &amp; Real-time Usage
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Customers Capacity</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {customerCount} / {planDetails.customers >= 999999 ? 'Unlimited' : planDetails.customers}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              {planDetails.customers >= 999999 ? 'Unlimited' : planDetails.customers}
            </div>
            <div style={{ background: 'var(--border-subtle)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                background: getCapacityPercent(customerCount, planDetails.customers) > 85 ? '#ef4444' : 'var(--brand-primary, #0284c7)',
                height: '100%',
                width: `${getCapacityPercent(customerCount, planDetails.customers)}%`
              }} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Product Catalog</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {productCount} / {planDetails.products >= 999999 ? 'Unlimited' : planDetails.products}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              {planDetails.products >= 999999 ? 'Unlimited' : planDetails.products}
            </div>
            <div style={{ background: 'var(--border-subtle)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                background: getCapacityPercent(productCount, planDetails.products) > 85 ? '#ef4444' : '#10b981',
                height: '100%',
                width: `${getCapacityPercent(productCount, planDetails.products)}%`
              }} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Employees (HRMS)</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {employeeCount} / {planDetails.employees >= 999999 ? 'Unlimited' : planDetails.employees}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              {planDetails.employees >= 999999 ? 'Unlimited' : planDetails.employees}
            </div>
            <div style={{ background: 'var(--border-subtle)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                background: getCapacityPercent(employeeCount, planDetails.employees) > 85 ? '#ef4444' : '#8b5cf6',
                height: '100%',
                width: `${getCapacityPercent(employeeCount, planDetails.employees)}%`
              }} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Trinetr AI Assistant</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: planDetails.ai ? '#10b981' : 'var(--text-secondary)' }}>
              {planDetails.ai ? 'Active & Unlocked' : 'Requires Pro / Enterprise'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {planDetails.ai ? 'Full access to voice & AI queries' : 'Upgrade to Pro to unlock AI insights'}
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans & Upgrade Matrix */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', fontWeight: 700 }}>Choose or Switch Subscription Plan</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Plans start from ₹99/mo with 1-Month Free Trial for everyone. No hidden fees.
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: '999px',
            alignItems: 'center',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              type="button"
              style={{
                padding: '6px 16px', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                background: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'transparent',
                color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: billingCycle === 'monthly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('yearly')}
              type="button"
              style={{
                padding: '6px 16px', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                background: billingCycle === 'yearly' ? 'var(--bg-primary)' : 'transparent',
                color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: billingCycle === 'yearly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Yearly <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: '4px', fontWeight: 700 }}>Save 20%</span>
            </button>
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          
          {/* Free Trial */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: currentPlan === 'Free Trial' ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {currentPlan === 'Free Trial' && (
              <div style={{ position: 'absolute', top: '-10px', right: '16px', background: 'var(--brand-primary)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px' }}>
                CURRENT PLAN
              </div>
            )}
            <div style={{ color: '#3b82f6', marginBottom: '12px' }}><Play size={24} /></div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>Free Trial</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0', minHeight: '36px' }}>
              1 Month Free Trial for everyone. Full core ERP access to test and evaluate.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>₹0</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '4px' }}>/ 30 days</span>
            </div>
            <button
              className={currentPlan === 'Free Trial' ? 'secondary-button full' : 'saas-primary-button full'}
              disabled={currentPlan === 'Free Trial'}
              onClick={() => handleAction('Free Trial')}
              style={{ marginBottom: '20px', opacity: currentPlan === 'Free Trial' ? 0.7 : 1 }}
            >
              {currentPlan === 'Free Trial' ? 'Active Plan' : 'Switch to Free Trial'}
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Up to 50 Customers</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Up to 50 Products</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> 5 Employees HRMS</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> GST Invoicing &amp; Billing</li>
            </ul>
          </div>

          {/* Basic Plan */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: (currentPlan === 'Basic' || currentPlan === 'Starter') ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {(currentPlan === 'Basic' || currentPlan === 'Starter') && (
              <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px' }}>
                CURRENT PLAN
              </div>
            )}
            <div style={{ color: '#10b981', marginBottom: '12px' }}><Zap size={24} /></div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>Basic</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0', minHeight: '36px' }}>
              Entry-level plan starting at ₹99. Perfect for small shops, retail counters, and freelancers.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>₹{billingCycle === 'monthly' ? '99/mo' : '79/mo'}</span>
            </div>
            <button
              className={(currentPlan === 'Basic' || currentPlan === 'Starter') ? 'secondary-button full' : 'saas-primary-button full'}
              disabled={currentPlan === 'Basic' || currentPlan === 'Starter'}
              onClick={() => handleAction('Basic')}
              style={{ marginBottom: '20px', opacity: (currentPlan === 'Basic' || currentPlan === 'Starter') ? 0.7 : 1 }}
            >
              {(currentPlan === 'Basic' || currentPlan === 'Starter') ? 'Active Plan' : 'Upgrade to Basic'}
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Up to 500 Customers</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Up to 500 Products</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> 10 Employees HRMS</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> GST Invoicing &amp; P&amp;L Reports</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Email &amp; WhatsApp Support</li>
            </ul>
          </div>

          {/* Professional Plan */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: currentPlan === 'Professional' ? '2px solid #8b5cf6' : '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '-10px', left: '16px', background: 'var(--brand-primary)', color: '#05131d', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
              RECOMMENDED
            </div>
            {currentPlan === 'Professional' && (
              <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#8b5cf6', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px' }}>
                CURRENT PLAN
              </div>
            )}
            <div style={{ color: '#8b5cf6', marginBottom: '12px' }}><Crown size={24} /></div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>Professional</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0', minHeight: '36px' }}>
              For growing businesses needing advanced ERP &amp; AI tools.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>₹{billingCycle === 'monthly' ? '499/mo' : '399/mo'}</span>
            </div>
            <button
              className={currentPlan === 'Professional' ? 'secondary-button full' : 'saas-primary-button full'}
              disabled={currentPlan === 'Professional'}
              onClick={() => handleAction('Professional')}
              style={{ marginBottom: '20px', opacity: currentPlan === 'Professional' ? 0.7 : 1 }}
            >
              {currentPlan === 'Professional' ? 'Active Plan' : 'Upgrade to Professional'}
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}><Check size={16} color="#8b5cf6" /> Unlimited Customers &amp; Products</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#8b5cf6" /> 50 Employees &amp; 5 Multiple Users</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#8b5cf6" /> Advanced GST &amp; Tax Reports</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#8b5cf6" /> Trinetr AI Assistant Unlocked</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#8b5cf6" /> Priority 24/7 Support</li>
            </ul>
          </div>

          {/* Enterprise Plan */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: currentPlan === 'Enterprise' ? '2px solid #0f172a' : '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {currentPlan === 'Enterprise' && (
              <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#0f172a', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '999px' }}>
                CURRENT PLAN
              </div>
            )}
            <div style={{ color: 'var(--text-primary)', marginBottom: '12px' }}><Shield size={24} /></div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>Enterprise</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0', minHeight: '36px' }}>
              Custom limits, multi-branch, and dedicated management.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>Custom</span>
            </div>
            <button
              className="secondary-button full"
              onClick={() => handleAction('Enterprise')}
              style={{ marginBottom: '20px' }}
            >
              Contact Sales
            </button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--text-primary)" /> Multi-branch Operations</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--text-primary)" /> Advanced Custom Roles</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--text-primary)" /> Dedicated Account Manager</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--text-primary)" /> 99.9% SLA &amp; Custom Integrations</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Billing Invoices & Receipts */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Invoices &amp; Payment History
          </h3>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => invoices[0] && handleDownloadInvoice(invoices[0])}
            disabled={!invoices || invoices.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download Latest Invoice
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Invoice ID</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Plan</th>
                <th style={{ padding: '10px 12px' }}>Amount</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{inv.id}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{inv.date}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 600 }}>{inv.plan}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '6px' }}>({inv.cycle})</span>
                    {inv.utr && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ref: {inv.utr}</div>}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>₹{inv.amount}.00</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: inv.status === 'Free Trial' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: inv.status === 'Free Trial' ? '#3b82f6' : '#10b981'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => handleDownloadInvoice(inv)}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      <Download size={13} style={{ marginRight: '4px' }} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Lock size={16} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
          <span>Payments are processed securely with 256-bit encryption. Supports UPI (GPay, PhonePe, Paytm), RuPay/Visa/MasterCard, and NetBanking. All invoices include 18% GST for Input Tax Credit claim.</span>
        </div>
      </div>

      {/* Platform Owner Payment Receiving Setup (only shown to platform owners, never on customer billing side) */}
      {showPlatformOwnerSetup && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowAdminPaymentSetup(!showAdminPaymentSetup)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={20} style={{ color: 'var(--brand-primary)' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Payment Gateway &amp; Receiving Setup (For Platform Owner)</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Configure where customer subscription payments (UPI &amp; Razorpay) are deposited into your bank account.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAdminPaymentSetup(!showAdminPaymentSetup);
              }}
              aria-label={showAdminPaymentSetup ? "Collapse payment setup" : "Expand payment setup"}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              {showAdminPaymentSetup ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showAdminPaymentSetup && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {adminSetupNotice && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {adminSetupNotice}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  1. Merchant UPI ID (For Direct 0% Commission Bank Deposits)
                </label>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                  <input
                    type="text"
                    value={adminUpiId}
                    onChange={(e) => setAdminUpiId(e.target.value)}
                    placeholder="e.g. yourshop@icici or 9876543210@paytm"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  />
                  <button
                    type="button"
                    className="saas-primary-button"
                    onClick={handleSaveAdminPaymentConfig}
                  >
                    Save UPI ID
                  </button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  When customers pay for Basic (₹99) or Pro (₹499) via GPay / PhonePe QR code, money goes directly into this UPI bank account with 0% gateway fee.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  2. Razorpay API Key ID (For Automated Cards &amp; NetBanking)
                </label>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                  <input
                    type="text"
                    value={adminRazorpayKey}
                    onChange={(e) => setAdminRazorpayKey(e.target.value)}
                    placeholder="rzp_live_xxxxxxxxxxxxxxxx"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <button
                    type="button"
                    className="saas-primary-button"
                    onClick={handleSaveAdminPaymentConfig}
                  >
                    Save Key
                  </button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Get your API Key from <a href="https://dashboard.razorpay.com/#/app/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)' }}>Razorpay Dashboard &gt; Settings &gt; API Keys</a>. Funds settle automatically into your linked bank account on T+1 days.
                </p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                <strong>📋 Bank Transfer (NEFT/IMPS) Receiving Details:</strong>
                <div style={{ marginTop: '6px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Bank: ICICI Bank | A/C: 002405001234 | IFSC: ICIC0000024 | Current A/C<br />
                  To change bank transfer details, update your business registration profile in Settings.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Subscription Payment Modal */}
      {checkoutModal.isOpen && (
        <SubscriptionPaymentModal
          isOpen={checkoutModal.isOpen}
          onClose={() => setCheckoutModal({ ...checkoutModal, isOpen: false })}
          plan={checkoutModal.plan}
          initialCycle={checkoutModal.cycle}
          profile={{
            ...profile,
            platformUpiId: adminUpiId,
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onContactSales={onContactSales}
        />
      )}

    </div>
  );
}

