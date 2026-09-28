import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PRODUCTS, CATEGORIES } from '../storefront/data/namkeenData.js';
import { StoreCartProvider, useStoreCart, purgeFishImagesFromStorage, isFishImage, sanitizeSnackImage, DEFAULT_SNACK_IMAGE } from '../storefront/context/StoreCartContext.jsx';
import { ProductCard } from '../storefront/components/ProductCard.jsx';
import { ProductEditModal } from '../storefront/components/ProductEditModal.jsx';
import { saveCloudRecord, getSupabaseClient, setSupabaseClientForTesting } from '../supabaseClient.js';

const FISH_IMAGE_FRAGMENT = 'photo-1626082927389-6cd097cdc6ec';
const DHANIYA_IMAGE_URL = 'https://images.unsplash.com/photo-fresh-dhaniya-coriander.jpg';
const CHANA_CUSTOM_IMAGE_URL = 'https://images.unsplash.com/photo-fresh-chana-masala.jpg';

// Helper component to inspect products from context
function StorefrontCatalogInspector({ onProducts }) {
  const { products, updateProduct, resetProductOverride, setEditingProduct } = useStoreCart();
  React.useEffect(() => {
    if (onProducts) onProducts({ products, updateProduct, resetProductOverride, setEditingProduct });
  }, [products, updateProduct, resetProductOverride, setEditingProduct, onProducts]);

  return (
    <div data-testid="catalog-container">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      <ProductEditModal />
    </div>
  );
}

describe('Product Image Override & Expression in Storefront', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. Default Catalog & Category Integrity', () => {
    it('does not contain any fish aquarium images in PRODUCTS catalog', () => {
      const fishItems = PRODUCTS.filter((p) => p.image && p.image.includes(FISH_IMAGE_FRAGMENT));
      expect(fishItems).toHaveLength(0);
    });

    it('does not contain any fish aquarium images in CATEGORIES list', () => {
      const fishCats = CATEGORIES.filter((c) => c.image && c.image.includes(FISH_IMAGE_FRAGMENT));
      expect(fishCats).toHaveLength(0);
      const mixNamkeen = CATEGORIES.find(c => c.id === 'mix-namkeen');
      expect(mixNamkeen).toBeDefined();
      expect(mixNamkeen.image).not.toContain(FISH_IMAGE_FRAGMENT);
    });

    it('Special Royal Combo, Special Lausan Mix, and Surati Gotado Mix have valid food images', () => {
      const combo = PRODUCTS.find((p) => p.id === 'prod-special-combo');
      const lausan = PRODUCTS.find((p) => p.id === 'prod-lausan-mix');
      const gotado = PRODUCTS.find((p) => p.id === 'prod-gotado-mix');

      expect(combo).toBeDefined();
      expect(combo.image).not.toContain(FISH_IMAGE_FRAGMENT);
      expect(combo.image).toMatch(/^https:\/\/images\.unsplash\.com\//);

      expect(lausan).toBeDefined();
      expect(lausan.image).not.toContain(FISH_IMAGE_FRAGMENT);

      expect(gotado).toBeDefined();
      expect(gotado.image).not.toContain(FISH_IMAGE_FRAGMENT);
    });

    it('purgeFishImagesFromStorage automatically cleanses corrupted fish image overrides', () => {
      // Simulate user having stale overrides with fish image in localStorage
      const corruptOverrides = {
        'prod-special-combo': {
          id: 'prod-special-combo',
          name: 'Special Royal Combo - 8 Taste Pack',
          image: `https://images.unsplash.com/${FISH_IMAGE_FRAGMENT}?w=500`,
        },
        'chana': {
          id: 'prod-moong-jor',
          name: 'chana',
          image: `https://images.unsplash.com/${FISH_IMAGE_FRAGMENT}?w=500`,
        },
      };
      localStorage.setItem('storefront_product_overrides', JSON.stringify(corruptOverrides));
      localStorage.setItem('erpProducts', JSON.stringify([
        { id: 'prod-moong-jor', name: 'chana', image: `https://images.unsplash.com/${FISH_IMAGE_FRAGMENT}` }
      ]));

      purgeFishImagesFromStorage();

      const cleanedOverrides = JSON.parse(localStorage.getItem('storefront_product_overrides'));
      expect(cleanedOverrides['prod-special-combo'].image).not.toContain(FISH_IMAGE_FRAGMENT);
      expect(cleanedOverrides['chana'].image).not.toContain(FISH_IMAGE_FRAGMENT);

      const cleanedErp = JSON.parse(localStorage.getItem('erpProducts'));
      expect(cleanedErp[0].image).not.toContain(FISH_IMAGE_FRAGMENT);
    });
  });

  describe('2. applyProductOverrides by ID and Normalized Name', () => {
    it('expresses custom dhaniya image when override is saved by product ID', () => {
      // Store override by exact catalog ID
      const overrides = {
        'prod-special-combo': {
          id: 'prod-special-combo',
          name: 'Special Royal Combo - 8 Taste Pack',
          image: DHANIYA_IMAGE_URL,
        },
      };
      localStorage.setItem('storefront_product_overrides', JSON.stringify(overrides));

      let contextApi = null;
      render(
        <StoreCartProvider isOwner={false}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      const comboProduct = contextApi.products.find((p) => p.id === 'prod-special-combo');
      expect(comboProduct).toBeDefined();
      expect(comboProduct.image).toBe(DHANIYA_IMAGE_URL);

      // Verify the rendered ProductCard img element has the dhaniya image
      const img = screen.getByAltText('Special Royal Combo - 8 Taste Pack');
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toBe(DHANIYA_IMAGE_URL);
    });

    it('expresses custom dhaniya image when ERP inventory items have different IDs but matching name', () => {
      // Suppose ERP has an item with ID 'inv-custom-combo-99' but same name
      const customInventory = [
        {
          id: 'inv-custom-combo-99',
          name: 'Special Royal Combo - 8 Taste Pack',
          category: 'Mix Namkeen',
          sellingPrice: 450,
          image: 'https://images.unsplash.com/photo-old-default.jpg',
          currentStock: 25,
        },
      ];

      // Override saved with name or catalog ID
      const overrides = {
        'special royal combo - 8 taste pack': {
          name: 'Special Royal Combo - 8 Taste Pack',
          image: DHANIYA_IMAGE_URL,
        },
      };
      localStorage.setItem('storefront_product_overrides', JSON.stringify(overrides));

      let contextApi = null;
      render(
        <StoreCartProvider customInventory={customInventory} isOwner={false}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      const matched = contextApi.products.find(
        (p) => p.name.toLowerCase().trim() === 'special royal combo - 8 taste pack'
      );
      expect(matched).toBeDefined();
      expect(matched.image).toBe(DHANIYA_IMAGE_URL);

      const img = screen.getByAltText('Special Royal Combo - 8 Taste Pack');
      expect(img.getAttribute('src')).toBe(DHANIYA_IMAGE_URL);
    });

    it('expresses custom image when override values contain matching name or ID', () => {
      const customInventory = [
        {
          id: 'erp-item-1234',
          name: 'Special Royal Combo - 8 Taste Pack',
          category: 'Mix Namkeen',
          sellingPrice: 400,
          image: 'https://images.unsplash.com/photo-old.jpg',
          currentStock: 10,
        },
      ];

      // Overrides keyed by catalog ID, but ERP item has erp-item-1234
      const overrides = {
        'prod-special-combo': {
          id: 'prod-special-combo',
          name: 'Special Royal Combo - 8 Taste Pack',
          image: DHANIYA_IMAGE_URL,
        },
      };
      localStorage.setItem('storefront_product_overrides', JSON.stringify(overrides));

      let contextApi = null;
      render(
        <StoreCartProvider customInventory={customInventory} isOwner={false}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      const item = contextApi.products.find((p) => p.id === 'erp-item-1234');
      expect(item).toBeDefined();
      expect(item.image).toBe(DHANIYA_IMAGE_URL);
    });
  });

  describe('3. updateProduct and Global Event Dispatching', () => {
    it('persists override by ID and normalized name and dispatches event with full product', async () => {
      let contextApi = null;
      const eventListener = vi.fn();
      window.addEventListener('trinetr-inventory-updated', eventListener);

      render(
        <StoreCartProvider isOwner={true}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      // Perform updateProduct inside act
      act(() => {
        contextApi.updateProduct('prod-special-combo', {
          name: 'Special Royal Combo - 8 Taste Pack',
          image: DHANIYA_IMAGE_URL,
          description: 'Now with fresh dhaniya flavor blend.',
        });
      });

      // 1. Verify localStorage overrides contain both ID and normalized name keys
      const savedOverrides = JSON.parse(localStorage.getItem('storefront_product_overrides') || '{}');
      expect(savedOverrides['prod-special-combo']).toBeDefined();
      expect(savedOverrides['prod-special-combo'].image).toBe(DHANIYA_IMAGE_URL);
      expect(savedOverrides['special royal combo - 8 taste pack']).toBeDefined();
      expect(savedOverrides['special royal combo - 8 taste pack'].image).toBe(DHANIYA_IMAGE_URL);

      // 2. Verify erpProducts sync in localStorage
      const erpItems = JSON.parse(localStorage.getItem('erpProducts') || '[]');
      const erpItem = erpItems.find((e) => e.name === 'Special Royal Combo - 8 Taste Pack');
      expect(erpItem).toBeDefined();
      expect(erpItem.image).toBe(DHANIYA_IMAGE_URL);

      // 3. Verify event dispatched with both id and product
      expect(eventListener).toHaveBeenCalled();
      const dispatchedDetail = eventListener.mock.calls[0][0].detail;
      expect(dispatchedDetail.id).toBe('prod-special-combo');
      expect(dispatchedDetail.productId).toBe('prod-special-combo');
      expect(dispatchedDetail.product).toBeDefined();
      expect(dispatchedDetail.product.image).toBe(DHANIYA_IMAGE_URL);

      window.removeEventListener('trinetr-inventory-updated', eventListener);
    });
  });

  describe('4. ProductEditModal In-Place Image Update', () => {
    it('allows owner to edit image URL to dhaniya photo and express it immediately on product card', async () => {
      let contextApi = null;
      render(
        <StoreCartProvider isOwner={true}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      // Find the combo product and open modal
      const combo = contextApi.products.find((p) => p.id === 'prod-special-combo');
      expect(combo).toBeDefined();

      act(() => {
        contextApi.setEditingProduct(combo);
      });

      // The modal heading should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });

      // Find the image URL input
      const urlInput = screen.getByPlaceholderText('https://example.com/product-image.jpg');
      expect(urlInput).toBeDefined();

      // Change input to dhaniya image
      fireEvent.change(urlInput, { target: { value: DHANIYA_IMAGE_URL } });
      expect(urlInput.value).toBe(DHANIYA_IMAGE_URL);

      // Click "Save Changes & Sync"
      const saveBtn = screen.getByText('Save Changes & Sync');
      fireEvent.click(saveBtn);

      // Verify success banner and updated image in context/ProductCard
      await waitFor(() => {
        const img = screen.getByAltText('Special Royal Combo - 8 Taste Pack');
        expect(img.getAttribute('src')).toBe(DHANIYA_IMAGE_URL);
      });
    });

    it('cleanses old fish image when modal opens and showcases custom image for chana', async () => {
      // Simulate prior corrupted override with fish image for chana
      const corruptOverrides = {
        'prod-moong-jor': {
          id: 'prod-moong-jor',
          name: 'chana',
          image: `https://images.unsplash.com/${FISH_IMAGE_FRAGMENT}?w=500`,
        },
      };
      localStorage.setItem('storefront_product_overrides', JSON.stringify(corruptOverrides));

      let contextApi = null;
      render(
        <StoreCartProvider isOwner={true}>
          <StorefrontCatalogInspector onProducts={(api) => { contextApi = api; }} />
        </StoreCartProvider>
      );

      // Verify that even before edit, the corrupt fish image was sanitized away
      const chana = contextApi.products.find((p) => p.id === 'prod-moong-jor' || p.name === 'chana');
      expect(chana).toBeDefined();
      expect(chana.image).not.toContain(FISH_IMAGE_FRAGMENT);

      // Now owner edits chana with a custom image
      act(() => {
        contextApi.setEditingProduct(chana);
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });

      const urlInput = screen.getByPlaceholderText('https://example.com/product-image.jpg');
      // The input should NOT show the fish image URL
      expect(urlInput.value).not.toContain(FISH_IMAGE_FRAGMENT);

      fireEvent.change(urlInput, { target: { value: CHANA_CUSTOM_IMAGE_URL } });
      const saveBtn = screen.getByText('Save Changes & Sync');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        const img = screen.getByAltText(chana.name);
        expect(img.getAttribute('src')).toBe(CHANA_CUSTOM_IMAGE_URL);
      });
    });
  });

  describe('5. Supabase buildRow Column Projection for menu_items', () => {
    it('correctly populates explicit columns when saving to menu_items table', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'prod-special-combo',
          title: 'Special Royal Combo - 8 Taste Pack',
          price: 499,
          image_url: DHANIYA_IMAGE_URL,
          category: 'mix-namkeen',
        },
        error: null,
      });

      let capturedUpsertRow = null;
      const mockUpsert = vi.fn((row) => {
        capturedUpsertRow = row;
        return Promise.resolve({ data: row, error: null });
      });

      const mockClient = {
        from: vi.fn((table) => ({
          upsert: mockUpsert,
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-123', email: 'owner@test.com' } },
            error: null,
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user-123' } } },
            error: null,
          }),
        },
      };

      setSupabaseClientForTesting(mockClient);

      await saveCloudRecord('test-user-123', 'menu_items', 'prod-special-combo', {
        title: 'Special Royal Combo - 8 Taste Pack',
        name: 'Special Royal Combo - 8 Taste Pack',
        price: 499,
        image_url: DHANIYA_IMAGE_URL,
        image: DHANIYA_IMAGE_URL,
        category: 'mix-namkeen',
      });

      expect(mockUpsert).toHaveBeenCalled();
      expect(capturedUpsertRow).toBeDefined();
      expect(capturedUpsertRow.id).toBe('prod-special-combo');
      expect(capturedUpsertRow.user_id).toBe('test-user-123');
      // Verify explicit columns on row root
      expect(capturedUpsertRow.title).toBe('Special Royal Combo - 8 Taste Pack');
      expect(capturedUpsertRow.price).toBe(499);
      expect(capturedUpsertRow.image_url).toBe(DHANIYA_IMAGE_URL);
      expect(capturedUpsertRow.category).toBe('mix-namkeen');

      setSupabaseClientForTesting(null);
    });
  });
});
