import React, { useState, useEffect } from 'react';
import { Activity, Users, ShoppingCart, Briefcase, Eye, MousePointerClick, TrendingUp } from 'lucide-react';

const LOCAL_ANALYTICS_KEY = 'TRINETR_LOCAL_ANALYTICS';

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const loadMetrics = () => {
      try {
        const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
        if (raw) setMetrics(JSON.parse(raw));
      } catch (e) {
        // ignore
      }
    };
    
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Poll every 5s for demo
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <div className="notice">No local analytics data recorded yet.</div>;
  }

  // Calculate most used module
  let topModule = 'None';
  let topModuleHits = 0;
  Object.entries(metrics.moduleUsage || {}).forEach(([module, hits]) => {
    if (hits > topModuleHits) {
      topModuleHits = hits;
      topModule = module;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="notice" style={{ background: 'var(--brand-primary)', color: 'white', border: 'none' }}>
        <strong>Local Analytics Preview</strong> - These metrics are currently stored in your browser session for testing purposes.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* Core SaaS Metrics */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Total Signups
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.totalSignups}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Demo Users
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.demoUsers}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} /> Active Users (Local)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.activeUsers}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Most Used Module
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>
            {topModule} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>({topModuleHits} views)</span>
          </div>
        </div>

        {/* Feature Usage Metrics */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={16} /> Customers Added
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.customersAdded}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={16} /> Products Added
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.productsAdded}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> Employees Added
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.employeesAdded}</div>
        </div>

        {/* Funnel Metrics */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={16} /> Pricing Page Views
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.pricingPageViews}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MousePointerClick size={16} /> Upgrade Clicks
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.upgradeClicks}</div>
        </div>

      </div>
    </div>
  );
}
