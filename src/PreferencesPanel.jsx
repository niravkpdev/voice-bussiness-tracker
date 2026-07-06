import React, { useState } from 'react';
import { Save, RotateCcw, Monitor, LayoutDashboard, FileText, Globe, Bell, Shield } from 'lucide-react';

export default function PreferencesPanel({ userPreferences, setUserPreferences, setStatus, DEFAULT_PREFERENCES }) {
  const [localPrefs, setLocalPrefs] = useState({ ...userPreferences });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalPrefs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    setUserPreferences(localPrefs);
    localStorage.setItem('trinetr_preferences', JSON.stringify(localPrefs));
    setStatus('Preferences saved successfully');
  };

  const handleReset = () => {
    setLocalPrefs({ ...DEFAULT_PREFERENCES });
    setUserPreferences({ ...DEFAULT_PREFERENCES });
    localStorage.setItem('trinetr_preferences', JSON.stringify(DEFAULT_PREFERENCES));
    setStatus('Preferences reset to default');
  };

  return (
    <section className="panel fade-in" id="preferences">
      <div className="section-header">
        <div>
          <h2>Preferences</h2>
          <p className="panel-hint">Customize your application experience.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="secondary-button" onClick={handleReset}>
            <RotateCcw size={16} /> Reset
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            <Save size={16} /> Save Preferences
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* 1. Appearance */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Monitor size={18} color="var(--brand-primary)" /> Appearance
          </h3>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Theme Mode</label>
            <select className="form-control" name="theme" value={localPrefs.theme} onChange={handleChange}>
              <option value="system">System Default</option>
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="compactMode" checked={localPrefs.compactMode} onChange={handleChange} />
              Compact Mode
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 24px' }}>Reduces padding for denser data display.</p>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="largeText" checked={localPrefs.largeText} onChange={handleChange} />
              Large Text
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 24px' }}>Increases font size for better readability.</p>
          </div>
        </article>

        {/* 2. Dashboard Preferences */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <LayoutDashboard size={18} color="var(--brand-primary)" /> Dashboard Preferences
          </h3>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Default Landing Page</label>
            <select className="form-control" name="landingPage" value={localPrefs.landingPage} onChange={handleChange}>
              <option value="dashboard">Dashboard</option>
              <option value="voucher-entry">Voucher Entry</option>
              <option value="day-book">Day Book</option>
              <option value="analytics">Analytics</option>
              <option value="employees">Employees</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="showWelcomeMessage" checked={localPrefs.showWelcomeMessage} onChange={handleChange} />
              Show welcome message
            </label>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="showWeatherCard" checked={localPrefs.showWeatherCard} onChange={handleChange} />
              Show weather card
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="showAgendaCard" checked={localPrefs.showAgendaCard} onChange={handleChange} />
              Show agenda card
            </label>
          </div>
        </article>

        {/* 3. Voucher Preferences */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <FileText size={18} color="var(--brand-primary)" /> Voucher Preferences
          </h3>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Default Payment Mode</label>
            <select className="form-control" name="paymentMode" value={localPrefs.paymentMode} onChange={handleChange}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Default Voucher Type</label>
            <select className="form-control" name="voucherType" value={localPrefs.voucherType} onChange={handleChange}>
              <option value="receipt">Receipt</option>
              <option value="payment">Payment</option>
              <option value="sales">Sales</option>
              <option value="purchase">Purchase</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="voiceCommandShortcut" checked={localPrefs.voiceCommandShortcut} onChange={handleChange} />
              Enable voice command shortcut
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="confirmBeforeSaving" checked={localPrefs.confirmBeforeSaving} onChange={handleChange} />
              Confirm before saving voucher
            </label>
          </div>
        </article>

        {/* 4. Business Display */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Globe size={18} color="var(--brand-primary)" /> Business Display
          </h3>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Currency</label>
            <select className="form-control" name="currency" value={localPrefs.currency} onChange={handleChange}>
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Date Format</label>
            <select className="form-control" name="dateFormat" value={localPrefs.dateFormat} onChange={handleChange}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="form-group">
            <label>Number Format</label>
            <select className="form-control" name="numberFormat" value={localPrefs.numberFormat} onChange={handleChange}>
              <option value="indian">Indian (1,00,000)</option>
              <option value="international">International (100,000)</option>
            </select>
          </div>
        </article>

        {/* 5. Notifications */}
        <article className="glass-card" style={{ padding: '20px', opacity: 0.8 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Bell size={18} color="var(--brand-primary)" /> Notifications <span className="badge badge-warning" style={{ fontSize: '10px', marginLeft: 'auto' }}>Coming Soon</span>
          </h3>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="paymentReminder" checked={localPrefs.paymentReminder} onChange={handleChange} disabled />
              Payment reminder
            </label>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="lowStockAlert" checked={localPrefs.lowStockAlert} onChange={handleChange} disabled />
              Low stock alert
            </label>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="attendanceReminder" checked={localPrefs.attendanceReminder} onChange={handleChange} disabled />
              Employee attendance reminder
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="dailySummary" checked={localPrefs.dailySummary} onChange={handleChange} disabled />
              Daily summary notification
            </label>
          </div>
        </article>

        {/* 6. Privacy & Safety */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Shield size={18} color="var(--brand-primary)" /> Privacy & Safety
          </h3>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Auto logout after inactivity <span className="badge badge-warning" style={{ fontSize: '10px' }}>Coming Soon</span></label>
            <select className="form-control" name="autoLogout" value={localPrefs.autoLogout} onChange={handleChange} disabled>
              <option value="never">Never</option>
              <option value="15m">15 minutes</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="hideFinancialValues" checked={localPrefs.hideFinancialValues} onChange={handleChange} />
              Hide financial values on dashboard
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="confirmBeforeDelete" checked={localPrefs.confirmBeforeDelete} onChange={handleChange} />
              Ask confirmation before delete
            </label>
          </div>
        </article>
        
      </div>
    </section>
  );
}
