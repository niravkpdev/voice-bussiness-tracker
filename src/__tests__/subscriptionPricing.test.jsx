import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PLAN_LIMITS, getTrialDaysLeft, getPlanLimit, canUseFeature } from '../subscription';
import { PricingPage } from '../PricingPage';
import { BillingSettings } from '../BillingSettings';

describe('Subscription & Pricing Core Logic', () => {
  it('has Basic model starting from ₹99 and Starter backwards compatibility', () => {
    expect(PLAN_LIMITS['Basic']).toBeDefined();
    expect(PLAN_LIMITS['Basic'].price).toBe(99);
    expect(PLAN_LIMITS['Basic'].label).toBe('Basic');
    expect(PLAN_LIMITS['Basic'].customers).toBe(500);
    expect(PLAN_LIMITS['Basic'].products).toBe(500);

    // Starter alias for backwards compatibility
    expect(PLAN_LIMITS['Starter']).toBeDefined();
    expect(PLAN_LIMITS['Starter'].price).toBe(99);
  });

  it('has 1-Month Free Trial (30 days) configured for everyone', () => {
    expect(PLAN_LIMITS['Free Trial']).toBeDefined();
    expect(PLAN_LIMITS['Free Trial'].price).toBe(0);
    expect(PLAN_LIMITS['Free Trial'].trialDays).toBe(30);

    // New user with no trialStartDate set yet gets full 30 days
    expect(getTrialDaysLeft(null)).toBe(30);
    expect(getTrialDaysLeft(undefined)).toBe(30);

    // Today's signup gets 30 days
    const today = new Date().toISOString();
    expect(getTrialDaysLeft(today)).toBe(30);

    // 10 days into trial gets 20 days remaining
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysLeft(tenDaysAgo)).toBe(20);

    // 35 days ago returns 0 (not negative)
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysLeft(thirtyFiveDaysAgo)).toBe(0);
  });

  it('enforces feature limits based on plan', () => {
    expect(getPlanLimit('Basic', 'customers')).toBe(500);
    expect(canUseFeature('Basic', 'customers', 499)).toBe(true);
    expect(canUseFeature('Basic', 'customers', 500)).toBe(false);
  });
});

describe('PricingPage Component', () => {
  it('renders 1-Month Free Trial banner and Basic model starting at ₹99', () => {
    const handleSelectPlan = vi.fn();
    render(
      <PricingPage
        onClose={vi.fn()}
        onSelectPlan={handleSelectPlan}
        isLoggedIn={false}
      />
    );

    // Free trial banner
    expect(screen.getByText(/1 Month Free Trial for everyone/i)).toBeInTheDocument();

    // Basic model card
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText(/Entry-level plan starting at ₹99/i)).toBeInTheDocument();
    expect(screen.getByText('₹99')).toBeInTheDocument();

    // Action button triggers Basic plan
    const basicTrialBtn = screen.getAllByRole('button', { name: /Start Free Trial/i })[0];
    fireEvent.click(basicTrialBtn);
    expect(handleSelectPlan).toHaveBeenCalledWith('Basic', 'monthly');
  });

  it('calculates discounted price for yearly billing cycle', () => {
    render(<PricingPage onClose={vi.fn()} isLoggedIn={false} />);

    // Toggle to yearly
    const yearlyBtn = screen.getByRole('button', { name: /Yearly/i });
    fireEvent.click(yearlyBtn);

    // Basic should now display ₹79
    expect(screen.getByText('₹79')).toBeInTheDocument();
  });
});

describe('BillingSettings Component', () => {
  it('displays 1-month free trial countdown for trial users', () => {
    const profile = { subscriptionPlan: 'Free Trial', trialStartDate: new Date().toISOString() };
    render(<BillingSettings profile={profile} onOpenPricing={vi.fn()} />);

    expect(screen.getByText(/You have 30 days left in your 1-month free trial/i)).toBeInTheDocument();
  });

  it('displays ₹99/mo for Basic plan subscribers', () => {
    const profile = { subscriptionPlan: 'Basic' };
    render(<BillingSettings profile={profile} onOpenPricing={vi.fn()} />);

    expect(screen.getByText('₹99')).toBeInTheDocument();
  });
});
