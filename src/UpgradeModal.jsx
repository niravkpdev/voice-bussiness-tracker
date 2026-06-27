import React from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

export function UpgradeModal({ currentPlan, featureMessage, onClose, onUpgrade }) {
  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center', padding: '32px 24px' }}>
        <button className="icon-button" style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={onClose}>
          <X size={20} />
        </button>
        
        <div style={{ margin: '0 auto 20px', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
          <ShieldAlert size={28} />
        </div>
        
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Plan Limit Reached</h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          {featureMessage || `You've reached the limit for your ${currentPlan || 'Free Trial'} plan.`}
        </p>
        
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
          <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.9rem' }}>Upgrade to unlock:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} color="var(--success-color, #10b981)" /> Unlimited Customers & Products
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} color="var(--success-color, #10b981)" /> Advanced Analytics & GST Reports
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success-color, #10b981)" /> Priority Email & Chat Support
            </li>
          </ul>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="saas-primary-button full" onClick={onUpgrade}>
            View Plans & Upgrade
          </button>
          <button className="secondary-button full" onClick={onClose} style={{ border: 'none' }}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
