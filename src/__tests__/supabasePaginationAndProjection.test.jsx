import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  fetchMenuItems,
  fetchOrders,
  loadCloudCollectionPaginated,
  setSupabaseClientForTesting,
} from '../supabaseClient.js';
import { StoreCartProvider } from '../storefront/context/StoreCartContext.jsx';
import { ProductListMenu } from '../storefront/components/ProductListMenu.jsx';
import { ShopGrid } from '../storefront/components/ShopGrid.jsx';
import Phase3Ops from '../Phase3Ops.jsx';

describe('Supabase Pagination & Column Projection', () => {
  afterEach(() => {
    setSupabaseClientForTesting(null);
  });

  describe('fetchMenuItems Supabase client integration', () => {
    it('queries menu_items with specific projected columns and .range(0, 19) for page 1', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `menu-${i + 1}`,
          title: `Namkeen Item ${i + 1}`,
          price: 120 + i * 10,
          image_url: `https://example.com/item-${i + 1}.jpg`,
          category: 'gathiya',
        })),
        count: 45,
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

      const result = await fetchMenuItems({ page: 1, pageSize: 20, category: 'all' });

      expect(mockFrom).toHaveBeenCalledWith('menu_items');
      // Verifies specific required columns were selected, NOT select('*')
      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, price, image_url, category',
        { count: 'exact' }
      );
      // Verifies .range(from, to) was called for page 1
      expect(mockRange).toHaveBeenCalledWith(0, 19);
      expect(result.menuItems).toHaveLength(20);
      expect(result.count).toBe(45);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(false);
    });

    it('queries page 2 with .range(20, 39)', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `menu-${i + 21}`,
          title: `Namkeen Item ${i + 21}`,
          price: 150,
          image_url: `https://example.com/item-${i + 21}.jpg`,
          category: 'wafer',
        })),
        count: 45,
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

      const result = await fetchMenuItems({ page: 2, pageSize: 20 });
      expect(mockRange).toHaveBeenCalledWith(20, 39);
      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });
  });

  describe('fetchOrders Supabase client integration', () => {
    it('queries orders with specific required columns and .range(from, to)', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `ord-${i + 1}`,
          user_id: 'user-1',
          data: {
            orderNo: `ORD-${String(i + 1).padStart(4, '0')}`,
            customer: `Customer ${i + 1}`,
            amount: 500,
            status: 'Delivered',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        count: 55,
        error: null,
      });

      const mockOrder = vi.fn().mockReturnValue({
        range: mockRange,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
        order: mockOrder,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockClient = { from: mockFrom };
      setSupabaseClientForTesting(mockClient);

      const result = await fetchOrders({ page: 1, pageSize: 20, status: 'all' });
      expect(mockFrom).toHaveBeenCalledWith('orders');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, user_id, data, created_at, updated_at',
        { count: 'exact' }
      );
      expect(mockRange).toHaveBeenCalledWith(0, 19);
      expect(result.orders).toHaveLength(20);
      expect(result.count).toBe(55);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('loadCloudCollectionPaginated', () => {
    it('calculates 20-item ranges accurately across pages', async () => {
      // Test page 3: from = 40, to = 59
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        count: 65,
        error: null,
      });

      const mockOrder = vi.fn().mockReturnValue({
        range: mockRange,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, error: null }),
        },
      };

      setSupabaseClientForTesting(mockClient);

      const result = await loadCloudCollectionPaginated('00000000-0000-0000-0000-000000000001', 'orders', {
        page: 3,
        pageSize: 20,
      });

      expect(mockRange).toHaveBeenCalledWith(40, 59);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('Storefront ProductListMenu UI Pagination Controls', () => {
    it('renders 20 items per page and navigates with Next and Previous buttons', () => {
      // Generate 48 mock products
      const customInventory = Array.from({ length: 48 }, (_, i) => ({
        id: `prod-${i + 1}`,
        name: `Namkeen Snack Item ${String(i + 1).padStart(2, '0')}`,
        category: 'gathiya',
        sellingPrice: 150,
        currentStock: 50,
        image: 'https://example.com/test.jpg',
      }));

      render(
        <StoreCartProvider customInventory={customInventory} isOwner={false}>
          <ProductListMenu />
        </StoreCartProvider>
      );

      // Verify pagination bar is present
      const paginationBar = screen.getByTestId('menu-pagination');
      expect(paginationBar).toBeInTheDocument();

      // Verify range info: 1-20 of 70 items (48 custom + 22 static)
      expect(paginationBar).toHaveTextContent(/Showing 1–20 of \d+ items/i);
      expect(paginationBar).toHaveTextContent(/Page 1 of \d+/i);

      // Prev button should be disabled on page 1
      const prevBtn = screen.getByTestId('menu-prev-page');
      const nextBtn = screen.getByTestId('menu-next-page');
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      // Click Next -> advances to Page 2
      fireEvent.click(nextBtn);
      expect(paginationBar).toHaveTextContent(/Showing 21–40 of \d+ items/i);
      expect(paginationBar).toHaveTextContent(/Page 2 of \d+/i);
      expect(prevBtn).not.toBeDisabled();

      // Click Previous -> returns to Page 1
      fireEvent.click(prevBtn);
      expect(paginationBar).toHaveTextContent(/Showing 1–20 of \d+ items/i);
      expect(paginationBar).toHaveTextContent(/Page 1 of \d+/i);
    });
  });

  describe('Storefront ShopGrid UI Pagination Controls', () => {
    it('renders 20 items per page and navigates with Next and Previous buttons', () => {
      const customInventory = Array.from({ length: 45 }, (_, i) => ({
        id: `shop-item-${i + 1}`,
        name: `Shop Item ${String(i + 1).padStart(2, '0')}`,
        category: 'wafer',
        sellingPrice: 90,
        currentStock: 25,
        image: 'https://example.com/shop.jpg',
      }));

      render(
        <StoreCartProvider customInventory={customInventory} isOwner={false}>
          <ShopGrid />
        </StoreCartProvider>
      );

      const paginationBar = screen.getByTestId('shop-pagination');
      expect(paginationBar).toBeInTheDocument();
      expect(paginationBar).toHaveTextContent(/Showing 1–20 of \d+ products/i);
      expect(paginationBar).toHaveTextContent(/Page 1 of \d+/i);

      const prevBtn = screen.getByTestId('shop-prev-page');
      const nextBtn = screen.getByTestId('shop-next-page');
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      // Click Next -> advances to Page 2
      fireEvent.click(nextBtn);
      expect(paginationBar).toHaveTextContent(/Showing 21–40 of \d+ products/i);
      expect(paginationBar).toHaveTextContent(/Page 2 of \d+/i);
    });
  });

  describe('Phase3Ops Orders UI Pagination Controls', () => {
    it('renders 20 orders per page and provides Next/Previous controls', () => {
      const mockOrders = Array.from({ length: 45 }, (_, i) => ({
        id: `order-row-${i + 1}`,
        orderNo: `ORD-${String(i + 1).padStart(4, '0')}`,
        customer: `Customer Alpha ${i + 1}`,
        mobile: '9876543210',
        amount: 800,
        deliveryDate: '2026-10-01',
        status: 'In Progress',
        source: 'Storefront',
      }));

      render(
        <Phase3Ops
          activeTab="orders"
          cloudOrders={mockOrders}
          onOrdersChange={() => {}}
        />
      );

      const ordersPagination = screen.getByTestId('orders-pagination');
      expect(ordersPagination).toBeInTheDocument();
      expect(ordersPagination).toHaveTextContent(/Showing 1–20 of 45 orders/i);
      expect(ordersPagination).toHaveTextContent(/Page 1 of 3/i);

      const prevBtn = screen.getByTestId('orders-prev-page');
      const nextBtn = screen.getByTestId('orders-next-page');
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      // Advance to page 2
      fireEvent.click(nextBtn);
      expect(ordersPagination).toHaveTextContent(/Showing 21–40 of 45 orders/i);
      expect(ordersPagination).toHaveTextContent(/Page 2 of 3/i);
    });
  });
});
