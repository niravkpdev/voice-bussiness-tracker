import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreferencesPanel from '../PreferencesPanel';

describe('PreferencesPanel Component & Real-time Live Settings', () => {
  const DEFAULT_PREFERENCES = {
    themeMode: 'dark',
    compactMode: false,
    largeText: false,
    defaultLandingPage: 'dashboard',
    showWelcomeMessage: true,
    showWeatherCard: true,
    showAgendaCard: true,
    defaultPaymentMode: 'cash',
    defaultVoucherType: 'receipt',
    enableVoiceShortcut: true,
    confirmBeforeSavingVoucher: true,
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian',
    paymentReminder: true,
    lowStockAlert: true,
    attendanceReminder: false,
    dailySummary: false,
    autoLogout: 'never',
    hideFinancialValues: false,
    confirmBeforeDelete: true,
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.body.className = '';
  });

  it('renders all 6 upgraded preference section cards with headers', () => {
    render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={vi.fn()}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    // Verify all 6 section titles are rendered
    expect(screen.getByText(/^Appearance$/i)).toBeDefined();
    expect(screen.getByText(/^Dashboard Preferences$/i)).toBeDefined();
    expect(screen.getByText(/^Voucher Preferences$/i)).toBeDefined();
    expect(screen.getByText(/^Business Display$/i)).toBeDefined();
    expect(screen.getByText(/^Notifications$/i)).toBeDefined();
    expect(screen.getByText(/^Privacy & Safety$/i)).toBeDefined();
  });

  it('renders theme selector buttons and switches theme mode with DOM update', () => {
    const setUserPreferences = vi.fn();
    render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={setUserPreferences}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    // Verify Theme buttons exist
    const lightBtn = screen.getByRole('button', { name: /Classic White/i });
    const darkBtn = screen.getByRole('button', { name: /Cosmic Dark/i });
    expect(lightBtn).toBeDefined();
    expect(darkBtn).toBeDefined();

    // Click Classic White
    fireEvent.click(lightBtn);
    expect(setUserPreferences).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);

    // Click Cosmic Dark
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('toggles Compact Density Mode and adds .compact-mode class to documentElement', () => {
    const setUserPreferences = vi.fn();
    render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={setUserPreferences}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    const compactToggle = screen.getByRole('checkbox', { name: /Compact Density Mode/i });
    expect(compactToggle.checked).toBe(false);

    fireEvent.click(compactToggle);
    expect(setUserPreferences).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
  });

  it('toggles Large Text Mode and adds .large-text-mode class to documentElement', () => {
    const setUserPreferences = vi.fn();
    render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={setUserPreferences}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    const largeTextToggle = screen.getByRole('checkbox', { name: /Large Text Mode/i });
    expect(largeTextToggle.checked).toBe(false);

    fireEvent.click(largeTextToggle);
    expect(setUserPreferences).toHaveBeenCalled();
    expect(document.documentElement.classList.contains('large-text-mode')).toBe(true);
  });

  it('toggles Hide Financial Values for privacy', () => {
    const setUserPreferences = vi.fn();
    render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={setUserPreferences}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    const hideFinancialsToggle = screen.getByRole('checkbox', { name: /Hide Financial Values/i });
    expect(hideFinancialsToggle.checked).toBe(false);

    fireEvent.click(hideFinancialsToggle);
    expect(setUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ hideFinancialValues: true })
    );
  });

  it('changes Currency, Date Format, and Number Format selections', () => {
    const setUserPreferences = vi.fn();
    const { container } = render(
      <PreferencesPanel
        userPreferences={DEFAULT_PREFERENCES}
        setUserPreferences={setUserPreferences}
        setStatus={vi.fn()}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    const currencySelect = container.querySelector('select[name="currency"]');
    const dateFormatSelect = container.querySelector('select[name="dateFormat"]');
    const numberFormatSelect = container.querySelector('select[name="numberFormat"]');

    expect(currencySelect).toBeDefined();
    expect(dateFormatSelect).toBeDefined();
    expect(numberFormatSelect).toBeDefined();

    fireEvent.change(currencySelect, { target: { value: 'USD' } });
    expect(setUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' })
    );

    fireEvent.change(dateFormatSelect, { target: { value: 'YYYY-MM-DD' } });
    expect(setUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ dateFormat: 'YYYY-MM-DD' })
    );

    fireEvent.change(numberFormatSelect, { target: { value: 'international' } });
    expect(setUserPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ numberFormat: 'international' })
    );
  });

  it('resets preferences to default values when Reset button is clicked', () => {
    window.confirm = vi.fn(() => true);
    const setUserPreferences = vi.fn();
    const setStatus = vi.fn();

    const modifiedPreferences = {
      ...DEFAULT_PREFERENCES,
      themeMode: 'light',
      compactMode: true,
      currency: 'USD',
      hideFinancialValues: true,
    };

    render(
      <PreferencesPanel
        userPreferences={modifiedPreferences}
        setUserPreferences={setUserPreferences}
        setStatus={setStatus}
        DEFAULT_PREFERENCES={DEFAULT_PREFERENCES}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(setUserPreferences).toHaveBeenCalledWith(DEFAULT_PREFERENCES);
    expect(setStatus).toHaveBeenCalledWith('Preferences successfully reset to defaults');
  });
});
