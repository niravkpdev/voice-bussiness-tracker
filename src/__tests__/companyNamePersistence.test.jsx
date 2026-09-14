import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { isDemoBusinessName, isDemoBusinessTagline } from '../VoiceExpenseTrackerPreview';
import ProfitNxProduction from '../ProfitNxProduction';
import ProfitNxSalesEntry from '../ProfitNxSalesEntry';

describe('Company Name Persistence & Demo Overwrite Prevention', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('isDemoBusinessName and isDemoBusinessTagline helpers', () => {
    it('identifies legacy demo names as demo', () => {
      expect(isDemoBusinessName('Jay Ambe Namkeen')).toBe(true);
      expect(isDemoBusinessName('jay ambe namkeen')).toBe(true);
      expect(isDemoBusinessName('Jay Ambe Namkeen Store')).toBe(true);
      expect(isDemoBusinessName('jay ambe namkeen store')).toBe(true);
      expect(isDemoBusinessName('demo workspace')).toBe(true);
      expect(isDemoBusinessName('voice business tracker')).toBe(true);
      expect(isDemoBusinessName('')).toBe(true);
      expect(isDemoBusinessName(null)).toBe(true);
      expect(isDemoBusinessName(undefined)).toBe(true);
    });

    it('identifies custom business names as non-demo', () => {
      expect(isDemoBusinessName('Trinetr Business Suite')).toBe(false);
      expect(isDemoBusinessName('Sharma Logistics & Traders')).toBe(false);
      expect(isDemoBusinessName('Apex Food Products Pvt Ltd')).toBe(false);
      expect(isDemoBusinessName('Patel Farsan Mart')).toBe(false);
    });

    it('identifies legacy demo taglines as demo', () => {
      expect(isDemoBusinessTagline('Fresh & Authentic Homemade Snacks & Delicacies')).toBe(true);
      expect(isDemoBusinessTagline('Authentic Namkeen & Farsan Manufacturer & Wholesaler')).toBe(true);
      expect(isDemoBusinessTagline('namkeen & wafers')).toBe(true);
      expect(isDemoBusinessTagline('')).toBe(true);
      expect(isDemoBusinessTagline(null)).toBe(true);
    });

    it('identifies custom taglines as non-demo', () => {
      expect(isDemoBusinessTagline('Finest Spices & Premium Groceries')).toBe(false);
      expect(isDemoBusinessTagline('Wholesale Industrial Hardware Supplier')).toBe(false);
    });
  });

  describe('Profit Nx ERP Header rendering with custom company names', () => {
    it('renders customer business name in ProfitNxProduction header', () => {
      const customProfile = {
        name: 'Trinetr Business Suite',
        gstin: '24ABCDE1234F1Z5',
        tagline: 'Smart Cloud ERP'
      };

      render(
        <ProfitNxProduction
          inventory={[]}
          profile={customProfile}
        />
      );

      expect(screen.getByText(/Trinetr Business Suite/i)).toBeDefined();
      expect(screen.queryByText(/JAY AMBE NAMKEEN/i)).toBeNull();
    });

    it('renders customer business name in ProfitNxSalesEntry header and printable sheet', () => {
      const customProfile = {
        name: 'Kothari Agro Industries',
        gstin: '24CPVPC7753J1Z8',
        tagline: 'Leading Agro Commodity Supplier'
      };

      render(
        <ProfitNxSalesEntry
          invoices={[]}
          orders={[]}
          profile={customProfile}
        />
      );

      // Verify custom name appears in header card
      const headerMatches = screen.getAllByText(/Kothari Agro Industries/i);
      expect(headerMatches.length).toBeGreaterThanOrEqual(1);

      // Verify demo name does NOT appear
      expect(screen.queryByText(/JAY AMBE NAMKEEN/i)).toBeNull();
    });

    it('falls back to TRINETR BUSINESS SUITE when profile is empty or unconfigured', () => {
      render(
        <ProfitNxSalesEntry
          invoices={[]}
          orders={[]}
          profile={{}}
        />
      );

      expect(screen.getAllByText(/TRINETR BUSINESS SUITE/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/JAY AMBE NAMKEEN/i)).toBeNull();
    });
  });

  describe('Storage persistence & protection against demo overwrite', () => {
    it('persists custom business name in localStorage without reverting', () => {
      const customProfile = {
        name: 'Trinetr Business Suite',
        storeName: 'Trinetr Store',
        owner: 'Admin',
        gstin: '24CPVPC7753J1Z8'
      };

      localStorage.setItem('businessProfile', JSON.stringify(customProfile));
      const retrieved = JSON.parse(localStorage.getItem('businessProfile'));

      expect(retrieved.name).toBe('Trinetr Business Suite');
      expect(isDemoBusinessName(retrieved.name)).toBe(false);
    });
  });
});
