import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PricingPage } from '../PricingPage.jsx';
import { ContactModal } from '../ContactModal.jsx';
import { LegalPage } from '../LegalPages.jsx';
import { DemoPreviewModal } from '../DemoPreviewModal.jsx';
import VoiceExpenseTrackerPreview, { STOREFRONT_TABS } from '../VoiceExpenseTrackerPreview.jsx';

describe('Top Navbar Functions & Associated Modals', () => {
  it('includes store in STOREFRONT_TABS for Online Store navigation', () => {
    expect(STOREFRONT_TABS).toContain('store');
    expect(STOREFRONT_TABS).toContain('storefront');
  });

  it('renders PricingPage and triggers plan selection and close', () => {
    const handleClose = vi.fn();
    const handleSelectPlan = vi.fn();
    const handleContactSales = vi.fn();

    render(
      <PricingPage
        onClose={handleClose}
        onSelectPlan={handleSelectPlan}
        onContactSales={handleContactSales}
      />
    );

    expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();

    const basicBtn = screen.getAllByRole('button', { name: /Start Free Trial/i })[0];
    fireEvent.click(basicBtn);
    expect(handleSelectPlan).toHaveBeenCalledWith('Basic', 'monthly');

    const enterpriseBtn = screen.getByRole('button', { name: /Contact Sales/i });
    fireEvent.click(enterpriseBtn);
    expect(handleContactSales).toHaveBeenCalled();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders ContactModal and allows closing and submission', () => {
    const handleClose = vi.fn();
    const setStatus = vi.fn();

    render(<ContactModal onClose={handleClose} setStatus={setStatus} />);

    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Need help' } });
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Support message' } });

    const submitBtn = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.click(submitBtn);

    expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('Message sending coming soon'));
    expect(screen.getByText('Message Received!')).toBeInTheDocument();

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders LegalPage for about-app and triggers onBack', () => {
    const handleBack = vi.fn();

    render(<LegalPage page="about-app" onBack={handleBack} />);

    expect(screen.getByText('About Trinetr Business Suite')).toBeInTheDocument();
    expect(screen.getByText('Manage Your Business with Voice Commands')).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();
  });

  it('renders DemoPreviewModal and allows tab switching and action callbacks', () => {
    const handleClose = vi.fn();
    const handleStartFree = vi.fn();
    const handleTryLiveDemo = vi.fn();

    render(
      <DemoPreviewModal
        isOpen={true}
        onClose={handleClose}
        onStartFree={handleStartFree}
        onTryLiveDemo={handleTryLiveDemo}
      />
    );

    expect(screen.getByText('Trinetr Product Walkthrough')).toBeInTheDocument();
    expect(screen.getByText('Voice AI Bookkeeper')).toBeInTheDocument();
    expect(screen.getByText('GST Invoicing (F2)')).toBeInTheDocument();

    // Switch tab to GST Invoicing
    fireEvent.click(screen.getByText('GST Invoicing (F2)'));
    expect(screen.getByText('Quick Sales Bill (F2)')).toBeInTheDocument();

    // Switch tab to Recipe BOM
    fireEvent.click(screen.getByText('Recipe BOM Master'));
    expect(screen.getByText(/Ratlami Sev/i)).toBeInTheDocument();

    // Action clicks
    const startFreeBtn = screen.getByRole('button', { name: /Start Free Trial/i });
    fireEvent.click(startFreeBtn);
    expect(handleStartFree).toHaveBeenCalled();

    const demoModeBtn = screen.getByRole('button', { name: /Try Instant Demo Mode/i });
    fireEvent.click(demoModeBtn);
    expect(handleTryLiveDemo).toHaveBeenCalled();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('correctly routes 2. Reports Outstanding Receivables and cleans 3. Analytics menu', () => {
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };
    localStorage.setItem('voiceBusinessTrackerAuth', JSON.stringify({ uid: 'test-user', email: 'owner@example.com', role: 'Owner' }));

    render(<VoiceExpenseTrackerPreview />);

    // 1. Check 2. Reports dropdown
    const reportsBtn = screen.getByRole('button', { name: /2\. Reports ▾/i });
    fireEvent.click(reportsBtn);

    // Outstanding Receivables & Payables button exists
    const receivablesBtn = screen.getByRole('button', { name: /Outstanding Receivables & Payables/i });
    expect(receivablesBtn).toBeInTheDocument();

    // Clicking it navigates to reports console
    fireEvent.click(receivablesBtn);
    expect(screen.getByText(/Business Reports Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Outstanding Receivables/i)).toBeInTheDocument();

    // 2. Check 3. Analytics dropdown
    const analyticsBtn = screen.getByRole('button', { name: /3\. Analytics ▾/i });
    fireEvent.click(analyticsBtn);

    // Customer Growth & LTV (which was a duplicate shortcut to Customers) has been removed
    expect(screen.queryByRole('button', { name: /Customer Growth & Lifetime Value/i })).not.toBeInTheDocument();

    // Valid Analytics items are intact
    expect(screen.getByRole('button', { name: /Business Analytics, Revenue Trends/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Business Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voice Command Center/i })).toBeInTheDocument();
  });
});

