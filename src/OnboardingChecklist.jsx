import React from 'react';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';

export function OnboardingChecklist({ 
  customers = [], 
  inventory = [], 
  employees = [], 
  invoices = [], 
  payments = [],
  profile,
  setActiveTab
}) {
  const steps = [
    { id: 'profile', title: 'Add company details', isComplete: !!(profile?.name && profile?.businessType), action: () => document.getElementById('settings-tab')?.click() },
    { id: 'customer', title: 'Add first customer', isComplete: customers.length > 0, action: () => setActiveTab('crm') },
    { id: 'product', title: 'Add first product', isComplete: inventory.length > 0, action: () => setActiveTab('inventory') },
    { id: 'employee', title: 'Add first employee', isComplete: employees.length > 0, action: () => setActiveTab('employees') },
    { id: 'invoice', title: 'Create first invoice', isComplete: invoices.length > 0, action: () => setActiveTab('orders') },
    { id: 'payment', title: 'Record first payment', isComplete: payments.length > 0, action: () => setActiveTab('reports') },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (progressPercent === 100) return null;

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-subtle)', marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>Setup Guide</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Follow these steps to get your workspace ready.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)' }}>{progressPercent}%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ height: '100%', background: 'var(--brand-primary)', width: `${progressPercent}%`, transition: 'width 0.5s ease-out' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {steps.map(step => (
          <div 
            key={step.id}
            onClick={step.action}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px 16px', 
              background: 'var(--bg-primary)', 
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              opacity: step.isComplete ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {step.isComplete ? (
              <CheckCircle size={20} color="var(--success-color)" style={{ marginRight: '12px', flexShrink: 0 }} />
            ) : (
              <Circle size={20} color="var(--text-secondary)" style={{ marginRight: '12px', flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, textDecoration: step.isComplete ? 'line-through' : 'none' }}>
              {step.title}
            </span>
            {!step.isComplete && <ChevronRight size={16} color="var(--text-secondary)" />}
          </div>
        ))}
      </div>
    </div>
  );
}
