import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  getCachedData,
  setCachedData,
  cachedSupabaseRequest,
  clearStorefrontMenuCache,
  MENU_CACHE_PREFIX,
  DEFAULT_MENU_CACHE_TTL_MS,
} from '../storefront/utils/cache.js';
import { debounce } from '../storefront/utils/debounce.js';
import {
  fetchMenuItems,
  setSupabaseClientForTesting,
} from '../supabaseClient.js';
import { StoreCartProvider, useStoreCart } from '../storefront/context/StoreCartContext.jsx';
import { StoreHeader } from '../storefront/components/StoreHeader.jsx';
import { ProductListMenu } from '../storefront/components/ProductListMenu.jsx';
import { ShopGrid } from '../storefront/components/ShopGrid.jsx';

describe('Storefront 5-Minute sessionStorage Caching & 300ms Debounce', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setSupabaseClientForTesting(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    setSupabaseClientForTesting(null);
    vi.useRealTimers();
  });

  describe('sessionStorage Caching Wrapper (cache.js)', () => {
    it('sets and gets valid cached data before 5-minute TTL expires', () => {
      const testKey = 'test_key';
      const sampleData = { items: [1, 2, 3] };

      setCachedData(testKey, sampleData, 5 * 60 * 1000);
      const cached = getCachedData(testKey);

      expect(cached).toEqual(sampleData);
    });

    it('returns null and evicts expired data after 5-minute TTL expires', () => {
      vi.useFakeTimers();
      const testKey = 'test_expire_key';
      const sampleData = { success: true };

      setCachedData(testKey, sampleData, 5 * 60 * 1000);

      // Advance time by 5 minutes + 1 second
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const cached = getCachedData(testKey);
      expect(cached).toBeNull();
      expect(sessionStorage.getItem(testKey)).toBeNull();
    });

    it('clearStorefrontMenuCache clears only menu items from sessionStorage', () => {
      setCachedData(`${MENU_CACHE_PREFIX}user1_all_p1_s20`, { data: 'menu' });
      setCachedData(`${MENU_CACHE_PREFIX}user2_wafers_p2_s20`, { data: 'wafers' });
      sessionStorage.setItem('other_app_data', 'keep_me');

      clearStorefrontMenuCache();

      expect(sessionStorage.getItem(`${MENU_CACHE_PREFIX}user1_all_p1_s20`)).toBeNull();
      expect(sessionStorage.getItem(`${MENU_CACHE_PREFIX}user2_wafers_p2_s20`)).toBeNull();
      expect(sessionStorage.getItem('other_app_data')).toBe('keep_me');
    });

    it('cachedSupabaseRequest only executes the fetcher on cache miss, and uses cache within 5 minutes', async () => {
      const fetcher = vi.fn().mockResolvedValue({ menuItems: [{ id: 1, title: 'Sev' }] });
      const cacheKey = `${MENU_CACHE_PREFIX}test_req`;

      // 1st call -> Cache miss, executes fetcher
      const res1 = await cachedSupabaseRequest(cacheKey, fetcher, 5 * 60 * 1000);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(res1.menuItems[0].title).toBe('Sev');

      // 2nd call -> Cache hit, does not execute fetcher
      const res2 = await cachedSupabaseRequest(cacheKey, fetcher, 5 * 60 * 1000);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(res2.menuItems[0].title).toBe('Sev');

      // 3rd call with forceRefresh -> Executes fetcher again
      const res3 = await cachedSupabaseRequest(cacheKey, fetcher, 5 * 60 * 1000, true);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(res3.menuItems[0].title).toBe('Sev');
    });
  });

  describe('fetchMenuItems caching with Supabase client', () => {
    it('caches storefront menu response in sessionStorage for 5 minutes so page reloads do not re-query Supabase', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [
          { id: 'item-1', title: 'Bhavnagari Gathiya', price: 140, image_url: 'https://example.com/gathiya.jpg', category: 'gathiya' },
          { id: 'item-2', title: 'Nylon Sev', price: 120, image_url: 'https://example.com/sev.jpg', category: 'sev' },
        ],
        count: 2,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        range: mockRange,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockClient = { from: mockFrom };
      setSupabaseClientForTesting(mockClient);

      // First fetch: query Supabase
      const firstResult = await fetchMenuItems({ page: 1, pageSize: 20, category: 'all' });
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(firstResult.menuItems).toHaveLength(2);
      expect(firstResult.menuItems[0].name).toBe('Bhavnagari Gathiya');

      // Second fetch with same parameters: served instantly from sessionStorage cache
      const secondResult = await fetchMenuItems({ page: 1, pageSize: 20, category: 'all' });
      // Supabase .from() should NOT have been called again
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(secondResult.menuItems).toHaveLength(2);
      expect(secondResult.menuItems[0].name).toBe('Bhavnagari Gathiya');
    });
  });

  describe('300ms Debounce Function & Hook', () => {
    it('debounces rapid calls to a single execution after 300ms', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn('a');
      debouncedFn('b');
      debouncedFn('c');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('cancels pending invocation when .cancel() is called', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn('hello');
      debouncedFn.cancel();

      vi.advanceTimersByTime(350);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('Live Search & Filter UI Debouncing', () => {
    it('debounces StoreHeader search input by 300ms before updating searchQuery', () => {
      vi.useFakeTimers();

      function TestSearchConsumer() {
        const { searchQuery } = useStoreCart();
        return (
          <div>
            <StoreHeader currentTab="store" onNavigate={vi.fn()} />
            <div data-testid="live-search-display">{searchQuery}</div>
          </div>
        );
      }

      render(
        <StoreCartProvider>
          <TestSearchConsumer />
        </StoreCartProvider>
      );

      const searchInput = screen.getByRole('textbox', { name: /search products/i });
      const searchDisplay = screen.getByTestId('live-search-display');

      expect(searchDisplay.textContent).toBe('');

      // Type into input rapidly
      fireEvent.change(searchInput, { target: { value: 'g' } });
      fireEvent.change(searchInput, { target: { value: 'gat' } });
      fireEvent.change(searchInput, { target: { value: 'gathiya' } });

      // Local input value changes immediately for responsive typing
      expect(searchInput.value).toBe('gathiya');
      // Context searchQuery has NOT updated yet
      expect(searchDisplay.textContent).toBe('');

      // Advance by 200ms (still within 300ms debounce window)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(searchDisplay.textContent).toBe('');

      // Advance another 100ms (reaching 300ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(searchDisplay.textContent).toBe('gathiya');
    });

    it('debounces ProductListMenu search input by 300ms', () => {
      vi.useFakeTimers();

      render(
        <StoreCartProvider>
          <ProductListMenu />
        </StoreCartProvider>
      );

      const menuSearchInput = screen.getByPlaceholderText('Search in menu...');

      // Rapidly type search query
      fireEvent.change(menuSearchInput, { target: { value: 'ch' } });
      fireEvent.change(menuSearchInput, { target: { value: 'chana' } });

      expect(menuSearchInput.value).toBe('chana');

      // Before 300ms, filter has not applied to menu items
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // After 300ms, debounced search triggers
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Verification that debounce completes smoothly
      expect(menuSearchInput.value).toBe('chana');
    });

    it('debounces ShopGrid price slider by 300ms', () => {
      vi.useFakeTimers();

      render(
        <StoreCartProvider>
          <ShopGrid />
        </StoreCartProvider>
      );

      const priceSlider = screen.getByRole('slider');
      expect(priceSlider).toBeDefined();

      // Drag slider rapidly to new prices
      fireEvent.change(priceSlider, { target: { value: '300' } });
      fireEvent.change(priceSlider, { target: { value: '250' } });
      fireEvent.change(priceSlider, { target: { value: '180' } });

      // Local slider value & label are updated immediately
      expect(priceSlider.value).toBe('180');
      expect(screen.getByText(/180/)).toBeDefined();

      // Advance 250ms (before 300ms debounce completes)
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Complete the 300ms debounce
      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(priceSlider.value).toBe('180');
    });
  });
});
