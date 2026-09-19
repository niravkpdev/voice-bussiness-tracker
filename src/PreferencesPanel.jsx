import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Monitor,
  LayoutDashboard,
  FileText,
  Globe,
  Bell,
  Shield,
  Check,
  Moon,
  Sun,
  Laptop,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from 'lucide-react';

// Custom Modern Toggle Switch Component
function ToggleSwitch({ name, checked, onChange, disabled = false, id, label }) {
  const switchId = id || name;
  return (
    <label
      htmlFor={switchId}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        id={switchId}
        name={name}
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
        aria-label={label || name}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          margin: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: '46px',
          height: '26px',
          borderRadius: '13px',
          background: checked
            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
            : 'var(--toggle-inactive, #cbd5e1)',
          transition: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          boxShadow: checked
            ? '0 2px 10px rgba(59, 130, 246, 0.45)'
            : 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
          border: checked ? '1px solid #2563eb' : '1px solid var(--border-subtle, #94a3b8)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ffffff',
            transition: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && (
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#3b82f6',
              }}
            />
          )}
        </div>
      </div>
    </label>
  );
}

// Reusable preference row with polished typography & spacing
function PrefRow({ title, description, control, icon: RowIcon, badge }) {
  return (
    <div
      className="pref-item-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'var(--pref-row-bg, rgba(248, 250, 252, 0.6))',
        border: '1px solid var(--border-subtle, rgba(226, 232, 240, 0.7))',
        marginBottom: '10px',
        gap: '16px',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {RowIcon && <RowIcon size={15} style={{ color: 'var(--brand-primary, #3b82f6)', flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary, #0f172a)' }}>
            {title}
          </span>
          {badge}
        </div>
        {description && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              margin: '3px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {control}
      </div>
    </div>
  );
}

export default function PreferencesPanel({
  userPreferences = {},
  setUserPreferences,
  setStatus,
  DEFAULT_PREFERENCES = {},
}) {
  const [localPrefs, setLocalPrefs] = useState(() => ({
    ...DEFAULT_PREFERENCES,
    ...userPreferences,
  }));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const prefsRef = React.useRef(localPrefs);

  useEffect(() => {
    prefsRef.current = localPrefs;
  }, [localPrefs]);

  // Sync if external props update
  useEffect(() => {
    const next = {
      ...DEFAULT_PREFERENCES,
      ...userPreferences,
    };
    setLocalPrefs(next);
    prefsRef.current = next;
  }, [userPreferences]);

  // Apply theme classes immediately to DOM
  const applyThemeImmediately = (theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.remove('theme-light');
      root.classList.add('theme-dark', 'dark-neon-suite');
      body.classList.remove('theme-light');
      body.classList.add('dark', 'dark-neon-suite');
    } else {
      root.classList.remove('theme-dark', 'dark-neon-suite');
      root.classList.add('theme-light');
      body.classList.remove('dark', 'dark-neon-suite');
      body.classList.add('theme-light');
    }
  };

  // Immediate live auto-save and state dispatch
  const commitPreferenceUpdate = (nextPrefs) => {
    prefsRef.current = nextPrefs;
    setLocalPrefs(nextPrefs);
    if (setUserPreferences) setUserPreferences(nextPrefs);
    try {
      localStorage.setItem('trinetr_user_preferences', JSON.stringify(nextPrefs));
    } catch {}

    window.dispatchEvent(
      new CustomEvent('trinetr-preferences-updated', { detail: nextPrefs })
    );

    // Flash live saved pill
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  const handleFieldChange = (name, value) => {
    const next = {
      ...prefsRef.current,
      [name]: value,
    };

    if (name === 'themeMode') {
      applyThemeImmediately(value);
    } else if (name === 'compactMode') {
      if (value) document.documentElement.classList.add('compact-mode');
      else document.documentElement.classList.remove('compact-mode');
    } else if (name === 'largeText') {
      if (value) document.documentElement.classList.add('large-text-mode');
      else document.documentElement.classList.remove('large-text-mode');
    }

    commitPreferenceUpdate(next);
  };

  const handleManualSave = () => {
    commitPreferenceUpdate(localPrefs);
    if (setStatus) setStatus('All preferences saved and active');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all preferences to default values?')) {
      const reset = { ...DEFAULT_PREFERENCES };
      applyThemeImmediately(reset.themeMode || 'dark');
      if (reset.compactMode) document.documentElement.classList.add('compact-mode');
      else document.documentElement.classList.remove('compact-mode');
      if (reset.largeText) document.documentElement.classList.add('large-text-mode');
      else document.documentElement.classList.remove('large-text-mode');

      commitPreferenceUpdate(reset);
      if (setStatus) setStatus('Preferences successfully reset to defaults');
    }
  };


  return (
    <section className="panel fade-in preferences-panel-container" id="preferences">
      {/* Header bar */}
      <div
        className="section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Preferences
            </h2>
            {saveSuccess && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#16a34a',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <Check size={13} /> Saved Live
              </span>
            )}
          </div>
          <p className="panel-hint" style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Configure your workspace appearance, regional formats, accounting defaults, and privacy guards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleManualSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
            }}
          >
            <Save size={15} /> Save Preferences
          </button>
        </div>
      </div>

      {/* 6 Upgraded Box Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '22px',
        }}
      >
        {/* BOX 1: APPEARANCE */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <Monitor size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Appearance
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Theme & Styling
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                fontWeight: 700,
              }}
            >
              UI Active
            </span>
          </div>

          {/* Theme Mode Interactive Cards */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Theme Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'dark', label: 'Cosmic Dark', icon: Moon, desc: 'Neon Dark' },
                { id: 'light', label: 'Classic White', icon: Sun, desc: 'Light Mode' },
                { id: 'system', label: 'System', icon: Laptop, desc: 'Auto OS' },
              ].map((t) => {
                const isSelected = (localPrefs.themeMode || 'dark') === t.id;
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleFieldChange('themeMode', t.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 6px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-subtle, #cbd5e1)',
                      background: isSelected
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'var(--card-bg-elevated, rgba(248, 250, 252, 0.5))',
                      boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.25)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComponent
                      size={18}
                      style={{
                        color: isSelected ? '#3b82f6' : 'var(--text-secondary, #64748b)',
                        marginBottom: '6px',
                      }}
                    />
                    <strong style={{ fontSize: '12px', color: isSelected ? '#3b82f6' : 'var(--text-primary)' }}>
                      {t.label}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <PrefRow
            title="Compact Density Mode"
            description="Reduces padding and table margins for dense data presentation."
            control={
              <ToggleSwitch
                id="pref-compact-mode"
                name="compactMode"
                checked={localPrefs.compactMode}
                onChange={(e) => handleFieldChange('compactMode', e.target.checked)}
                label="Compact Density Mode"
              />
            }
          />

          <PrefRow
            title="Large Text Mode"
            description="Scales base font size by 5% for enhanced invoice readability."
            control={
              <ToggleSwitch
                id="pref-large-text"
                name="largeText"
                checked={localPrefs.largeText}
                onChange={(e) => handleFieldChange('largeText', e.target.checked)}
                label="Large Text Mode"
              />
            }
          />
        </article>

        {/* BOX 2: DASHBOARD PREFERENCES */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <LayoutDashboard size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Dashboard Preferences
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Executive Summary
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontWeight: 700,
              }}
            >
              Overview
            </span>
          </div>

          <PrefRow
            title="Default Landing Page"
            description="Tab opened automatically when logging in or opening the app."
            control={
              <select
                className="form-control"
                name="defaultLandingPage"
                value={localPrefs.defaultLandingPage || 'dashboard'}
                onChange={(e) => handleFieldChange('defaultLandingPage', e.target.value)}
                style={{
                  width: '140px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="dashboard">Dashboard</option>
                <option value="voucher-entry">Voucher Entry</option>
                <option value="day-book">Day Book</option>
                <option value="analytics">Analytics</option>
                <option value="employees">Employees</option>
                <option value="store">Online Store</option>
              </select>
            }
          />

          <PrefRow
            title="Show Welcome Banner"
            description="Displays personalized greeting banner at top of dashboard."
            control={
              <ToggleSwitch
                id="pref-welcome-message"
                name="showWelcomeMessage"
                checked={localPrefs.showWelcomeMessage}
                onChange={(e) => handleFieldChange('showWelcomeMessage', e.target.checked)}
                label="Show Welcome Message"
              />
            }
          />

          <PrefRow
            title="Show Weather & Time Card"
            description="Displays local weather forecast card on the dashboard."
            control={
              <ToggleSwitch
                id="pref-weather-card"
                name="showWeatherCard"
                checked={localPrefs.showWeatherCard}
                onChange={(e) => handleFieldChange('showWeatherCard', e.target.checked)}
                label="Show Weather Card"
              />
            }
          />

          <PrefRow
            title="Show Agenda & Action Card"
            description="Displays pending actions and today's schedule on dashboard."
            control={
              <ToggleSwitch
                id="pref-agenda-card"
                name="showAgendaCard"
                checked={localPrefs.showAgendaCard}
                onChange={(e) => handleFieldChange('showAgendaCard', e.target.checked)}
                label="Show Agenda Card"
              />
            }
          />
        </article>

        {/* BOX 3: VOUCHER PREFERENCES */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <FileText size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Voucher Preferences
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Ledger & Accounting
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                fontWeight: 700,
              }}
            >
              Transactions
            </span>
          </div>

          <PrefRow
            title="Default Payment Mode"
            description="Pre-selected account type when opening voucher entry."
            control={
              <select
                className="form-control"
                name="defaultPaymentMode"
                value={localPrefs.defaultPaymentMode || 'cash'}
                onChange={(e) => handleFieldChange('defaultPaymentMode', e.target.value)}
                style={{
                  width: '130px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank / Chq</option>
                <option value="upi">📱 UPI / QR</option>
              </select>
            }
          />

          <PrefRow
            title="Default Voucher Type"
            description="Initial voucher tab opened in the accounting book."
            control={
              <select
                className="form-control"
                name="defaultVoucherType"
                value={localPrefs.defaultVoucherType || 'receipt'}
                onChange={(e) => handleFieldChange('defaultVoucherType', e.target.value)}
                style={{
                  width: '130px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="receipt">📥 Receipt</option>
                <option value="payment">📤 Payment</option>
                <option value="sales">🏷️ Sales</option>
                <option value="purchase">📦 Purchase</option>
                <option value="expense">💼 Expense</option>
              </select>
            }
          />

          <PrefRow
            title="Voice Command Shortcut"
            description="Enables floating voice bookkeeper and spacebar shortcut."
            control={
              <ToggleSwitch
                id="pref-voice-shortcut"
                name="enableVoiceShortcut"
                checked={localPrefs.enableVoiceShortcut}
                onChange={(e) => handleFieldChange('enableVoiceShortcut', e.target.checked)}
                label="Enable Voice Command Shortcut"
              />
            }
          />

          <PrefRow
            title="Confirm Before Saving"
            description="Prompts verification dialog before committing voucher."
            control={
              <ToggleSwitch
                id="pref-confirm-voucher"
                name="confirmBeforeSavingVoucher"
                checked={localPrefs.confirmBeforeSavingVoucher}
                onChange={(e) => handleFieldChange('confirmBeforeSavingVoucher', e.target.checked)}
                label="Confirm Before Saving Voucher"
              />
            }
          />
        </article>

        {/* BOX 4: BUSINESS DISPLAY */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(2, 132, 199, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0ea5e9',
                }}
              >
                <Globe size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Business Display
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Localization & Currency
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(14, 165, 233, 0.1)',
                color: '#0ea5e9',
                fontWeight: 700,
              }}
            >
              Regional
            </span>
          </div>

          <PrefRow
            title="Currency"
            description="Active currency symbol across billing, invoices & reports."
            control={
              <select
                className="form-control"
                name="currency"
                value={localPrefs.currency || 'INR'}
                onChange={(e) => handleFieldChange('currency', e.target.value)}
                style={{
                  width: '135px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            }
          />

          <PrefRow
            title="Date Format"
            description="Calendar date display standard throughout registers."
            control={
              <select
                className="form-control"
                name="dateFormat"
                value={localPrefs.dateFormat || 'DD/MM/YYYY'}
                onChange={(e) => handleFieldChange('dateFormat', e.target.value)}
                style={{
                  width: '135px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            }
          />

          <PrefRow
            title="Number Format"
            description="Separator convention for thousands and lakhs."
            control={
              <select
                className="form-control"
                name="numberFormat"
                value={localPrefs.numberFormat || 'indian'}
                onChange={(e) => handleFieldChange('numberFormat', e.target.value)}
                style={{
                  width: '150px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="indian">Indian (1,00,000)</option>
                <option value="international">Intl (100,000)</option>
              </select>
            }
          />
        </article>

        {/* BOX 5: NOTIFICATIONS */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <Bell size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notifications
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Smart Alerts
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#16a34a',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={11} /> Active
            </span>
          </div>

          <PrefRow
            title="Payment Due Reminders"
            description="Alerts when customer invoices exceed their credit term."
            control={
              <ToggleSwitch
                id="pref-payment-reminder"
                name="paymentReminder"
                checked={localPrefs.paymentReminder}
                onChange={(e) => handleFieldChange('paymentReminder', e.target.checked)}
                label="Payment Reminder"
              />
            }
          />

          <PrefRow
            title="Low Stock & Depletion Alert"
            description="Notifies when warehouse items reach minimum reorder safety levels."
            control={
              <ToggleSwitch
                id="pref-low-stock-alert"
                name="lowStockAlert"
                checked={localPrefs.lowStockAlert}
                onChange={(e) => handleFieldChange('lowStockAlert', e.target.checked)}
                label="Low Stock Alert"
              />
            }
          />

          <PrefRow
            title="Employee Attendance Reminder"
            description="Daily morning shift notification for staff check-ins."
            control={
              <ToggleSwitch
                id="pref-attendance-reminder"
                name="attendanceReminder"
                checked={localPrefs.attendanceReminder}
                onChange={(e) => handleFieldChange('attendanceReminder', e.target.checked)}
                label="Attendance Reminder"
              />
            }
          />

          <PrefRow
            title="Daily Summary Digest"
            description="Evening report notification summarizing revenue and collections."
            control={
              <ToggleSwitch
                id="pref-daily-summary"
                name="dailySummary"
                checked={localPrefs.dailySummary}
                onChange={(e) => handleFieldChange('dailySummary', e.target.checked)}
                label="Daily Summary"
              />
            }
          />
        </article>

        {/* BOX 6: PRIVACY & SAFETY */}
        <article
          className="pref-box-card"
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a855f7',
                }}
              >
                <Shield size={19} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Privacy & Safety
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Data Safeguards
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#9333ea',
                fontWeight: 700,
              }}
            >
              Protected
            </span>
          </div>

          <PrefRow
            title="Inactivity Auto-Logout"
            description="Automatically ends session if no keyboard or mouse activity is detected."
            icon={Clock}
            control={
              <select
                className="form-control"
                name="autoLogout"
                value={localPrefs.autoLogout || 'never'}
                onChange={(e) => handleFieldChange('autoLogout', e.target.value)}
                style={{
                  width: '130px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: 'var(--card-bg-elevated, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="never">Never (Off)</option>
                <option value="15m">15 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
              </select>
            }
          />

          <PrefRow
            title="Hide Financial Values"
            description="Masks revenue, cash balances, and profits with '••••••' for privacy."
            icon={localPrefs.hideFinancialValues ? EyeOff : Eye}
            control={
              <ToggleSwitch
                id="pref-hide-financials"
                name="hideFinancialValues"
                checked={localPrefs.hideFinancialValues}
                onChange={(e) => handleFieldChange('hideFinancialValues', e.target.checked)}
                label="Hide Financial Values"
              />
            }
          />

          <PrefRow
            title="Confirm Before Delete"
            description="Requires an explicit confirmation dialog before deleting parties or vouchers."
            control={
              <ToggleSwitch
                id="pref-confirm-delete"
                name="confirmBeforeDelete"
                checked={localPrefs.confirmBeforeDelete}
                onChange={(e) => handleFieldChange('confirmBeforeDelete', e.target.checked)}
                label="Confirm Before Delete"
              />
            }
          />
        </article>
      </div>
    </section>
  );
}
