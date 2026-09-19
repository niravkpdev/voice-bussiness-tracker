import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { BillingSettings } from '../BillingSettings';
import VoiceExpenseTrackerPreview from '../VoiceExpenseTrackerPreview';

describe('Mobile Responsive Buttons & Interaction Fixes', () => {
  beforeEach(() => {
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };
    window.scrollTo = vi.fn();
    localStorage.clear();
  });

  describe('useIsMobile Hook Breakpoint', () => {
    it('defaults to 768px matching mobile CSS media queries', () => {
      function TestComponent() {
        const isMob = useIsMobile();
        return <div data-testid="is-mobile">{isMob ? 'mobile' : 'desktop'}</div>;
      }

      // Test 400px (phone)
      window.innerWidth = 400;
      render(<TestComponent />);
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('mobile');

      // Test 768px (tablet portrait / mobile boundary)
      window.innerWidth = 768;
      fireEvent(window, new Event('resize'));
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('mobile');

      // Test 1024px (desktop)
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('desktop');
    });
  });

  describe('BillingSettings Platform Owner Chevron Toggle Button', () => {
    it('does not render platform owner payment setup on customer side by default', () => {
      render(<BillingSettings onNavigate={vi.fn()} />);
      expect(screen.queryByText(/Payment Gateway & Receiving Setup/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /payment setup/i })).not.toBeInTheDocument();
    });

    it('renders platform owner payment setup and customer subscriptions when logged in as owner email ap0767573@gmail.com', () => {
      render(<BillingSettings onNavigate={vi.fn()} currentUserEmail="ap0767573@gmail.com" />);
      expect(screen.getByText(/Payment Gateway & Receiving Setup \(For Platform Owner\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /payment setup/i })).toBeInTheDocument();
      expect(screen.getByText(/Customer Subscriptions & Received Payments/i)).toBeInTheDocument();
      expect(screen.getByText('TRN-SUB-MU8F5YF0')).toBeInTheDocument();
      expect(screen.getByText('pn74062-2@okaxis')).toBeInTheDocument();
    });

    it('clicking the chevron button toggles the payment receiving setup panel when isPlatformOwner is true', () => {
      render(<BillingSettings onNavigate={vi.fn()} isPlatformOwner={true} />);

      // Initially closed
      expect(screen.queryByText(/1\. Merchant UPI ID/i)).not.toBeInTheDocument();

      // Find the toggle button via aria-label
      const toggleBtn = screen.getByRole('button', { name: /payment setup/i });
      expect(toggleBtn).toBeInTheDocument();

      // Click to open
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/1\. Merchant UPI ID/i)).toBeInTheDocument();

      // Click to close
      fireEvent.click(toggleBtn);
      expect(screen.queryByText(/1\. Merchant UPI ID/i)).not.toBeInTheDocument();
    });
  });

  describe('Mobile Bottom Navigation & Dropdown Actions', () => {
    beforeEach(() => {
      window.innerWidth = 390; // iPhone width
      localStorage.setItem('voiceBusinessTrackerAuth', JSON.stringify({
        uid: 'test-mobile-user',
        email: 'owner@example.com',
        role: 'Owner',
        businessName: 'Trinetr Mobile Biz'
      }));
    });

    it('renders mobile bottom navigation bar with responsive click handlers', () => {
      const { container } = render(<VoiceExpenseTrackerPreview />);

      const bottomNav = container.querySelector('.mobile-bottom-nav');
      expect(bottomNav).toBeInTheDocument();

      const homeLink = within(bottomNav).getByRole('link', { name: /Home/i });
      const entriesLink = within(bottomNav).getByRole('link', { name: /Entries/i });
      const partiesLink = within(bottomNav).getByRole('link', { name: /Parties/i });
      const stockLink = within(bottomNav).getByRole('link', { name: /Stock/i });
      const moreLink = within(bottomNav).getByRole('link', { name: /More/i });

      expect(homeLink).toBeInTheDocument();
      expect(entriesLink).toBeInTheDocument();
      expect(partiesLink).toBeInTheDocument();
      expect(stockLink).toBeInTheDocument();
      expect(moreLink).toBeInTheDocument();

      // Tap Parties
      fireEvent.click(partiesLink);
      expect(window.location.hash).toBe('#crm');

      // Tap Stock
      fireEvent.click(stockLink);
      expect(window.location.hash).toBe('#inventory');

      // Tap Entries
      fireEvent.click(entriesLink);
      expect(window.location.hash).toBe('#day-book');
    });

    it('navigates via Mobile More Options view tiles', () => {
      const { container } = render(<VoiceExpenseTrackerPreview />);
      const bottomNav = container.querySelector('.mobile-bottom-nav');

      // Switch to more tab
      const moreLink = within(bottomNav).getByRole('link', { name: /More/i });
      fireEvent.click(moreLink);

      expect(screen.getByText('More Modules & Actions')).toBeInTheDocument();

      // Verify and click Invoices tile
      const invoicesBtn = screen.getByRole('button', { name: /Invoices/i });
      expect(invoicesBtn).toBeInTheDocument();
      fireEvent.click(invoicesBtn);
      expect(window.location.hash).toBe('#invoices');

      // Go back to more
      fireEvent.click(moreLink);

      // Verify and click Billing & Plan tile
      const billingBtn = screen.getByRole('button', { name: /Billing & Plan/i });
      expect(billingBtn).toBeInTheDocument();
      fireEvent.click(billingBtn);
      expect(window.location.hash).toBe('#billing');
    });

    it('opens Quick Add dropdown and triggers action on mobile', () => {
      render(<VoiceExpenseTrackerPreview />);

      // Find Quick Add trigger button in topbar
      const quickAddBtn = screen.getByRole('button', { name: /Add/i });
      fireEvent.click(quickAddBtn);

      // Dropdown items should be rendered
      expect(screen.getByRole('button', { name: /Sales Entry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Production Batch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Customer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Product/i })).toBeInTheDocument();

      // Click New Customer
      const newCustBtn = screen.getByRole('button', { name: /New Customer/i });
      fireEvent.click(newCustBtn);
      expect(window.location.hash).toBe('#crm');
    });

    it('suppresses mobile bottom navigation bar in Online Storefront mode', () => {
      const { container } = render(<VoiceExpenseTrackerPreview />);

      // Switch to storefront
      const storefrontBtn = screen.getByTitle(/View Customer Online Storefront/i);
      fireEvent.click(storefrontBtn);

      // Verify bottom nav is not rendered
      const bottomNav = container.querySelector('.mobile-bottom-nav');
      expect(bottomNav).not.toBeInTheDocument();
    });
  });
});
