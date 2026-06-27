import React from 'react';
import { CreditCard, Download, ExternalLink, Calendar } from 'lucide-react';
import { getTrialDaysLeft, PLAN_LIMITS } from './subscription';
import { SubscriptionBadge } from './SubscriptionBadge';

export function BillingSettings({ profile, onOpenPricing }) {
  const currentPlan = profile?.subscriptionPlan || 'Free Trial';
  const planDetails = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['Free Trial'];
  const trialDaysLeft = getTrialDaysLeft(profile?.trialStartDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Current Plan Overview */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Current Plan <SubscriptionBadge plan={currentPlan} />
            </h3>
            {currentPlan === 'Free Trial' ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                You have {trialDaysLeft} days left in your free trial.
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Your next billing date is {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}.
              </p>
            )}
          </div>
          <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {planDetails.price === 'Custom' ? 'Custom' : `₹${planDetails.price}`}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>/mo</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="saas-primary-button" onClick={onOpenPricing}>
            Upgrade Plan
          </button>
          {currentPlan !== 'Free Trial' && (
            <button className="secondary-button" style={{ color: 'var(--danger-color, #ef4444)' }} onClick={() => alert('To cancel your subscription, please contact support.')}>
              Cancel Plan
            </button>
          )}
        </div>
      </div>

      {/* Plan Limits Overview */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} /> Plan Limits
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Customers</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{planDetails.customers >= 999999 ? 'Unlimited' : planDetails.customers}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Products</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{planDetails.products >= 999999 ? 'Unlimited' : planDetails.products}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Employees</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{planDetails.employees >= 999999 ? 'Unlimited' : planDetails.employees}</div>
          </div>
        </div>
      </div>

      {/* Billing History (Placeholder) */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={18} /> Billing History
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', color: 'var(--text-secondary)', flexDirection: 'column', gap: '12px' }}>
          <p>No invoices available yet.</p>
          <button className="secondary-button compact-button" disabled>
            <Download size={14} /> Download Latest Invoice
          </button>
        </div>
      </div>

    </div>
  );
}
