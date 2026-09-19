import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceExpenseTrackerPreview from '../VoiceExpenseTrackerPreview';

describe('Dashboard Layout: KPI 4x2 arrangement & removed widgets', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
    localStorage.setItem('voiceBusinessTrackerAuth', JSON.stringify({
      uid: 'test-desktop-user',
      email: 'admin@trinetr.in',
      businessName: 'Test Business',
      role: 'Owner',
      token: 'mock-token',
    }));
    window.location.hash = '#dashboard';
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders all 8 KPI cards in the executive overview in correct 4x2 pairing', async () => {
    const { container } = render(<VoiceExpenseTrackerPreview />);

    // Check presence of the 8 KPI titles
    expect(screen.getByText('Business Health')).toBeDefined();
    expect(screen.getByText('Monthly Revenue')).toBeDefined();
    expect(screen.getByText('Total Expenses')).toBeDefined();
    expect(screen.getByText('Inventory Value')).toBeDefined();
    expect(screen.getByText('Cash Flow')).toBeDefined();
    expect(screen.getByText('Outstanding')).toBeDefined();
    expect(screen.getByText('Monthly Profit')).toBeDefined();
    expect(screen.getByText('Attendance')).toBeDefined();

    // Check that dashboard-kpi-grid exists
    const kpiGrid = container.querySelector('.dashboard-kpi-grid');
    expect(kpiGrid).toBeDefined();

    // Check order of KPI titles inside .dashboard-kpi-grid
    if (kpiGrid) {
      const titles = Array.from(kpiGrid.querySelectorAll('.glass-panel span')).map((s) => s.textContent);
      expect(titles[0]).toBe('Business Health');
      expect(titles[1]).toBe('Monthly Revenue');
      expect(titles[2]).toBe('Total Expenses');
      expect(titles[3]).toBe('Inventory Value'); // Beside Total Expenses in row 1!
      expect(titles[4]).toBe('Cash Flow');
      expect(titles[5]).toBe('Outstanding');
      expect(titles[6]).toBe('Monthly Profit');
      expect(titles[7]).toBe('Attendance'); // Beside Monthly Profit in row 2!
    }
  });

  it('verifies that Financial Summary and AI Business Insights boxes are completely removed', () => {
    render(<VoiceExpenseTrackerPreview />);

    // Financial Summary title should not be rendered on the dashboard
    expect(screen.queryByText('Financial Summary')).toBeNull();

    // AI Business Insights title should not be rendered on the dashboard
    expect(screen.queryByText('AI Business Insights')).toBeNull();
  });

  it('verifies that the Notification box on the dashboard is completely removed', () => {
    render(<VoiceExpenseTrackerPreview />);

    // In the dashboard side column or main column, there should be no Notifications card with "Mark all read"
    expect(screen.queryByText('Mark all read')).toBeNull();
    expect(screen.queryByText('All caught up! No active alerts.')).toBeNull();
  });

  it('verifies that Quick Notes box is present on the dashboard below the KPIs', () => {
    render(<VoiceExpenseTrackerPreview />);

    expect(screen.getByText('Quick Notes')).toBeDefined();
    expect(screen.getByRole('button', { name: /Save Note/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Jot down quick thoughts/i)).toBeDefined();
  });
});
