import React, { useState } from 'react';
import { Check, X, Shield, Lock, LifeBuoy, ArrowRight, Zap, Crown } from 'lucide-react';

export function PricingPage({ onClose, onUpgrade, isLoggedIn }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [toast, setToast] = useState('');

  const handleAction = (plan) => {
    if (typeof window !== 'undefined' && window.trackEvent) window.trackEvent('Upgrade clicked', { plan, billingCycle });
    if (plan === 'Enterprise') {
      if (onContactSales) {
        onContactSales();
      } else {
        window.location.href = 'mailto:sales@trinetr.com?subject=Enterprise Inquiry';
      }
      return;
    }
    
    if (onUpgrade) {
      onUpgrade(plan, billingCycle);
    } else {
      setToast('Payment checkout coming soon.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="pricing-page-container fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)',
      overflowY: 'auto', display: 'flex', flexDirection: 'column'
    }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px',
          borderRadius: '8px', zIndex: 1100, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/assets/trinetr-logo.jpg" alt="Trinetr" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>Trinetr Business Suite</span>
        </div>
        {onClose && (
          <button className="icon-button" onClick={onClose}><X size={24} /></button>
        )}
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', fontWeight: 700, letterSpacing: '-0.02em' }}>Simple, transparent pricing</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Choose the right plan to manage and grow your business. No hidden fees. Cancel anytime.
        </p>
        
        {/* Toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '999px', alignItems: 'center', gap: '4px' }}>
          <button 
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 24px', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer',
              background: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >Monthly</button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 24px', borderRadius: '999px', border: 'none', fontWeight: 600, cursor: 'pointer',
              background: billingCycle === 'yearly' ? 'var(--bg-primary)' : 'transparent',
              color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Yearly <span style={{ color: 'var(--success-color, #10b981)', fontSize: '0.8rem', marginLeft: '4px' }}>Save 20%</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>
        
        {/* Starter */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'var(--brand-primary)', marginBottom: '16px' }}><Zap size={28} /></div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Starter</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>Perfect for small shops just getting started.</p>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>₹{billingCycle === 'monthly' ? '499' : '399'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>/mo</span>
          </div>
          <button className="saas-primary-button full" style={{ marginBottom: '32px' }} onClick={() => handleAction('Starter')}>
            {isLoggedIn ? 'Upgrade to Starter' : 'Start Free Trial'}
          </button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', flex: 1 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--success-color, #10b981)" /> Up to 500 Customers</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--success-color, #10b981)" /> Up to 500 Products</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--success-color, #10b981)" /> Basic Reports</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--success-color, #10b981)" /> Basic HRMS (10 Employees)</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--success-color, #10b981)" /> Email Support</li>
          </ul>
        </div>

        {/* Professional */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '32px', border: '2px solid var(--brand-primary)', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 12px 24px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
            RECOMMENDED
          </div>
          <div style={{ color: 'var(--brand-primary)', marginBottom: '16px' }}><Crown size={28} /></div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Professional</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>For growing businesses needing advanced tools.</p>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>₹{billingCycle === 'monthly' ? '999' : '799'}</span>
            <span style={{ color: 'var(--text-secondary)' }}>/mo</span>
          </div>
          <button className="saas-primary-button full" style={{ marginBottom: '32px', background: 'var(--brand-primary)' }} onClick={() => handleAction('Professional')}>
            {isLoggedIn ? 'Upgrade to Pro' : 'Start Free Trial'}
          </button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', flex: 1 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, color: 'var(--text-primary)' }}><Check size={18} color="var(--brand-primary)" /> Everything in Starter, plus:</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--brand-primary)" /> Unlimited Customers & Products</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--brand-primary)" /> Advanced GST Reports</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--brand-primary)" /> Multiple Users (Up to 5)</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--brand-primary)" /> Trinetr AI Assistant</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--brand-primary)" /> Priority Support</li>
          </ul>
        </div>

        {/* Enterprise */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'var(--text-primary)', marginBottom: '16px' }}><Shield size={28} /></div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Enterprise</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>Custom limits and dedicated management.</p>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', height: '48px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700 }}>Custom</span>
          </div>
          <button className="secondary-button full" style={{ marginBottom: '32px' }} onClick={() => handleAction('Enterprise')}>
            Contact Sales
          </button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', flex: 1 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--text-primary)" /> Multi-branch Management</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--text-primary)" /> Advanced Custom Roles</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--text-primary)" /> Full Audit Logs</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--text-primary)" /> Dedicated Success Manager</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Check size={18} color="var(--text-primary)" /> Custom Onboarding</li>
          </ul>
        </div>

      </section>

      {/* Trust Elements */}
      <section style={{ background: 'var(--bg-secondary)', padding: '60px 24px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontWeight: 600 }}><Lock size={20} color="var(--brand-primary)" /> Secure Payments</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>All transactions are encrypted and processed securely by industry-leading payment gateways.</p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontWeight: 600 }}><Shield size={20} color="var(--success-color, #10b981)" /> Your Data is Yours</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>We never sell your data. You can export your full business history as a JSON backup at any time.</p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', fontWeight: 600 }}><LifeBuoy size={20} color="var(--danger-color, #ef4444)" /> Cancel Anytime</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>No long-term contracts or hidden fees. If you downgrade, you keep all your existing data.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
