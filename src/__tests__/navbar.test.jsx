import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PricingPage } from '../PricingPage.jsx';
import { ContactModal } from '../ContactModal.jsx';
import { LegalPage } from '../LegalPages.jsx';
import { STOREFRONT_TABS } from '../VoiceExpenseTrackerPreview.jsx';

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
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();

    const starterBtn = screen.getAllByRole('button', { name: /Start Free Trial/i })[0];
    fireEvent.click(starterBtn);
    expect(handleSelectPlan).toHaveBeenCalledWith('Starter', 'monthly');

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
});
