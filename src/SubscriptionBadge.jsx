import React from 'react';
import { Crown, Zap, Shield, Play } from 'lucide-react';

export function SubscriptionBadge({ plan, onClick }) {
  const currentPlan = plan || 'Free Trial';
  
  let config = {
    color: '#3b82f6',
    bg: '#eff6ff',
    icon: <Play size={12} />,
    label: 'Free Trial'
  };

  if (currentPlan === 'Starter') {
    config = { color: '#10b981', bg: '#ecfdf5', icon: <Zap size={12} />, label: 'Starter' };
  } else if (currentPlan === 'Professional') {
    config = { color: '#8b5cf6', bg: '#f5f3ff', icon: <Crown size={12} />, label: 'Professional' };
  } else if (currentPlan === 'Enterprise') {
    config = { color: '#0f172a', bg: '#f1f5f9', icon: <Shield size={12} />, label: 'Enterprise' };
  } else if (currentPlan === 'Expired') {
    config = { color: '#ef4444', bg: '#fef2f2', icon: <Shield size={12} />, label: 'Expired' };
  }

  return (
    <button 
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}33`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
      title="Manage Subscription"
      className="subscription-badge"
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  );
}
