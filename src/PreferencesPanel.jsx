import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Monitor, LayoutDashboard, FileText, Globe, Bell, Shield } from 'lucide-react';

export default function PreferencesPanel({ userPreferences, setUserPreferences, setStatus, DEFAULT_PREFERENCES }) {
  const [localPrefs, setLocalPrefs] = useState({ ...userPreferences });

  // Keep localPrefs in sync if userPreferences changes from outside
  useEffect(() => {
    setLocalPrefs({ ...userPreferences });
  }, [userPreferences]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalPrefs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    setUserPreferences(localPrefs);
    localStorage.setItem('trinetr_user_preferences', JSON.stringify(localPrefs));
    setStatus('Preferences saved successfully');
    console.log("[Preferences] saved", localPrefs);
    window.dispatchEvent(new CustomEvent("trinetr-preferences-updated", { detail: localPrefs }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all preferences to default?")) {
      setLocalPrefs({ ...DEFAULT_PREFERENCES });
      setUserPreferences({ ...DEFAULT_PREFERENCES });
      localStorage.setItem('trinetr_user_preferences', JSON.stringify(DEFAULT_PREFERENCES));
      setStatus('Preferences reset to default');
      console.log("[Preferences] reset to defaults");
      window.dispatchEvent(new CustomEvent("trinetr-preferences-updated", { detail: DEFAULT_PREFERENCES }));
    }
  };

  // Helper component for preference rows
  const PrefRow = ({ title, description, control }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 min-content' }}>
        <label style={{ display: 'block', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</label>
        {description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>
        {control}
      </div>
    </div>
  );

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* 1. Appearance */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Monitor size={18} color="var(--brand-primary)" /> Appearance
          </h3>
          <PrefRow 
            title="Theme Mode" 
            control={
              <select className="form-control" name="themeMode" value={localPrefs.themeMode} onChange={handleChange} style={{ width: '150px' }}>
                <option value="system">System Default</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            } 
          />
          <PrefRow 
            title="Compact Mode" 
            description="Reduces padding for denser data display."
            control={<input type="checkbox" name="compactMode" checked={localPrefs.compactMode} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
          <PrefRow 
            title="Large Text" 
            description="Increases font size for better readability."
            control={<input type="checkbox" name="largeText" checked={localPrefs.largeText} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
        </article>

        {/* 2. Dashboard Preferences */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <LayoutDashboard size={18} color="var(--brand-primary)" /> Dashboard Preferences
          </h3>
          <PrefRow 
            title="Default Landing Page" 
            control={
              <select className="form-control" name="defaultLandingPage" value={localPrefs.defaultLandingPage} onChange={handleChange} style={{ width: '150px' }}>
                <option value="dashboard">Dashboard</option>
                <option value="voucher-entry">Voucher Entry</option>
                <option value="day-book">Day Book</option>
                <option value="analytics">Analytics</option>
                <option value="employees">Employees</option>
              </select>
            } 
          />
          <PrefRow 
            title="Show Welcome Message" 
            control={<input type="checkbox" name="showWelcomeMessage" checked={localPrefs.showWelcomeMessage} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
          <PrefRow 
            title="Show Weather Card" 
            control={<input type="checkbox" name="showWeatherCard" checked={localPrefs.showWeatherCard} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
          <PrefRow 
            title="Show Agenda Card" 
            control={<input type="checkbox" name="showAgendaCard" checked={localPrefs.showAgendaCard} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
        </article>

        {/* 3. Voucher Preferences */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <FileText size={18} color="var(--brand-primary)" /> Voucher Preferences
          </h3>
          <PrefRow 
            title="Default Payment Mode" 
            control={
              <select className="form-control" name="defaultPaymentMode" value={localPrefs.defaultPaymentMode} onChange={handleChange} style={{ width: '150px' }}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="upi">UPI</option>
              </select>
            } 
          />
          <PrefRow 
            title="Default Voucher Type" 
            control={
              <select className="form-control" name="defaultVoucherType" value={localPrefs.defaultVoucherType} onChange={handleChange} style={{ width: '150px' }}>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
                <option value="sales">Sales</option>
                <option value="purchase">Purchase</option>
                <option value="expense">Expense</option>
              </select>
            } 
          />
          <PrefRow 
            title="Enable Voice Command Shortcut" 
            control={<input type="checkbox" name="enableVoiceShortcut" checked={localPrefs.enableVoiceShortcut} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
          <PrefRow 
            title="Confirm Before Saving Voucher" 
            control={<input type="checkbox" name="confirmBeforeSavingVoucher" checked={localPrefs.confirmBeforeSavingVoucher} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
        </article>

        {/* 4. Business Display */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Globe size={18} color="var(--brand-primary)" /> Business Display
          </h3>
          <PrefRow 
            title="Currency" 
            control={
              <select className="form-control" name="currency" value={localPrefs.currency} onChange={handleChange} style={{ width: '150px' }}>
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            } 
          />
          <PrefRow 
            title="Date Format" 
            control={
              <select className="form-control" name="dateFormat" value={localPrefs.dateFormat} onChange={handleChange} style={{ width: '150px' }}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            } 
          />
          <PrefRow 
            title="Number Format" 
            control={
              <select className="form-control" name="numberFormat" value={localPrefs.numberFormat} onChange={handleChange} style={{ width: '150px' }}>
                <option value="indian">Indian (1,00,000)</option>
                <option value="international">International (100,000)</option>
              </select>
            } 
          />
        </article>

        {/* 5. Notifications */}
        <article className="glass-card" style={{ padding: '20px', opacity: 0.8 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Bell size={18} color="var(--brand-primary)" /> Notifications <span className="badge badge-warning" style={{ fontSize: '10px', marginLeft: 'auto' }}>Coming Soon</span>
          </h3>
          <PrefRow 
            title="Payment Reminder" 
            control={<input type="checkbox" name="paymentReminder" checked={localPrefs.paymentReminder} onChange={handleChange} disabled style={{ width: '18px', height: '18px' }} />} 
          />
          <PrefRow 
            title="Low Stock Alert" 
            control={<input type="checkbox" name="lowStockAlert" checked={localPrefs.lowStockAlert} onChange={handleChange} disabled style={{ width: '18px', height: '18px' }} />} 
          />
          <PrefRow 
            title="Employee Attendance Reminder" 
            control={<input type="checkbox" name="attendanceReminder" checked={localPrefs.attendanceReminder} onChange={handleChange} disabled style={{ width: '18px', height: '18px' }} />} 
          />
          <PrefRow 
            title="Daily Summary Notification" 
            control={<input type="checkbox" name="dailySummary" checked={localPrefs.dailySummary} onChange={handleChange} disabled style={{ width: '18px', height: '18px' }} />} 
          />
        </article>

        {/* 6. Privacy & Safety */}
        <article className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Shield size={18} color="var(--brand-primary)" /> Privacy & Safety
          </h3>
          <PrefRow 
            title={<>Auto logout after inactivity <span className="badge badge-warning" style={{ fontSize: '10px' }}>Coming Soon</span></>} 
            control={
              <select className="form-control" name="autoLogout" value={localPrefs.autoLogout} onChange={handleChange} disabled style={{ width: '150px' }}>
                <option value="never">Never</option>
                <option value="15m">15 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
              </select>
            } 
          />
          <PrefRow 
            title="Hide Financial Values on Dashboard" 
            control={<input type="checkbox" name="hideFinancialValues" checked={localPrefs.hideFinancialValues} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
          <PrefRow 
            title="Ask Confirmation Before Delete" 
            control={<input type="checkbox" name="confirmBeforeDelete" checked={localPrefs.confirmBeforeDelete} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />} 
          />
        </article>
        
      </div>
    </section>
  );
}
