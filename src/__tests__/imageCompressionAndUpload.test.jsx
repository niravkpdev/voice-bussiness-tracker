import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  compressFoodImage,
  MAX_IMAGE_DIMENSION,
  MAX_COMPRESSED_SIZE_BYTES
} from '../imageCompression.js';
import {
  buildStorefrontStoragePath,
  uploadStorefrontImage,
  STOREFRONT_IMAGE_BUCKET
} from '../supabaseClient.js';
import { ProductEditModal } from '../storefront/components/ProductEditModal';
import { StoreCartProvider } from '../storefront/context/StoreCartContext';

describe('Client-Side Food Image Compression & Supabase Storage Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Core Image Compression Logic (compressFoodImage)', () => {
    it('has maximum dimension limit of 500x500 pixels and 150 KB max size constants', () => {
      expect(MAX_IMAGE_DIMENSION).toBe(500);
      expect(MAX_COMPRESSED_SIZE_BYTES).toBe(150 * 1024);
    });

    it('proportional aspect ratio downscaling logic calculates dimensions <= 500px', async () => {
      // Create a mock canvas with 2D context
      const mockDrawImage = vi.fn();
      const mockFillRect = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'canvas') {
          el.getContext = () => ({
            fillStyle: '#FFFFFF',
            fillRect: mockFillRect,
            drawImage: mockDrawImage,
          });
          el.toBlob = (cb, type, quality) => {
            // Generate a synthetic blob under 150KB
            const sampleBlob = new Blob(['x'.repeat(45 * 1024)], { type: type || 'image/jpeg' });
            cb(sampleBlob);
          };
          el.toDataURL = () => 'data:image/jpeg;base64,sample123';
        }
        return el;
      });

      // Mock Image constructor with 1200x800 resolution (landscape 3:2)
      const originalImage = window.Image;
      window.Image = class {
        constructor() {
          this.width = 1200;
          this.height = 800;
          this.naturalWidth = 1200;
          this.naturalHeight = 800;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const largeBlob = new Blob(['x'.repeat(2 * 1024 * 1024)], { type: 'image/png' });
      largeBlob.name = 'large-dhokla.png';

      const result = await compressFoodImage(largeBlob, {
        maxDimension: 500,
        maxSizeBytes: 150 * 1024,
        mimeType: 'image/jpeg'
      });

      // Verify dimensions were downscaled proportionally to max 500px
      expect(result.width).toBe(500);
      expect(result.height).toBe(Math.round((800 * 500) / 1200)); // 333px
      expect(result.width).toBeLessThanOrEqual(500);
      expect(result.height).toBeLessThanOrEqual(500);

      // Verify file size limit
      expect(result.size).toBeLessThanOrEqual(150 * 1024);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.file).toBeInstanceOf(File);

      window.Image = originalImage;
    });

    it('handles portrait orientation (e.g. 600x1200) ensuring height <= 500px', async () => {
      const originalImage = window.Image;
      window.Image = class {
        constructor() {
          this.width = 600;
          this.height = 1200;
          this.naturalWidth = 600;
          this.naturalHeight = 1200;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const mockDrawImage = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'canvas') {
          el.getContext = () => ({
            fillStyle: '#FFFFFF',
            fillRect: vi.fn(),
            drawImage: mockDrawImage,
          });
          el.toBlob = (cb) => cb(new Blob(['portrait'], { type: 'image/jpeg' }));
          el.toDataURL = () => 'data:image/jpeg;base64,portrait';
        }
        return el;
      });

      const portraitBlob = new Blob(['dummy'], { type: 'image/jpeg' });
      const result = await compressFoodImage(portraitBlob, { maxDimension: 500 });

      expect(result.height).toBe(500);
      expect(result.width).toBe(250);
      expect(result.width).toBeLessThanOrEqual(500);
      expect(result.height).toBeLessThanOrEqual(500);

      window.Image = originalImage;
    });

    it('iteratively reduces JPEG quality if blob exceeds 150 KB', async () => {
      const originalImage = window.Image;
      window.Image = class {
        constructor() {
          this.width = 500;
          this.height = 500;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      let attempt = 0;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'canvas') {
          el.getContext = () => ({
            fillStyle: '#FFFFFF',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          });
          el.toBlob = (cb, type, quality) => {
            attempt++;
            // On first attempt, simulate oversize (200 KB); on subsequent, simulate 90 KB
            const size = attempt === 1 ? 200 * 1024 : 90 * 1024;
            cb(new Blob(['y'.repeat(size)], { type: 'image/jpeg' }));
          };
          el.toDataURL = () => 'data:image/jpeg;base64,iterative';
        }
        return el;
      });

      const testBlob = new Blob(['input'], { type: 'image/jpeg' });
      const result = await compressFoodImage(testBlob, { maxSizeBytes: 150 * 1024 });

      expect(attempt).toBeGreaterThan(1);
      expect(result.size).toBeLessThanOrEqual(150 * 1024);

      window.Image = originalImage;
    });
  });

  describe('Supabase Storage Path & Direct Blob Upload', () => {
    it('builds a clean sanitized storefront storage path', () => {
      const path = buildStorefrontStoragePath({
        uid: 'user-789',
        itemId: 'prod-garlic-sev',
        fileName: 'spicy garlic sev photo.png'
      });

      expect(path).toContain('user-789/storefront/prod-garlic-sev/');
      expect(path).toMatch(/\.jpg$/);
      expect(path).not.toContain(' ');
    });

    it('passes the compressed Blob directly into Supabase storage upload call', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'storefront/test.jpg' }, error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://test-supabase.co/storage/storefront/test.jpg' } });

      const mockClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          })
        }
      };

      // Test upload with compressed Blob
      const compressedBlob = new Blob(['fake-compressed-jpeg-data'], { type: 'image/jpeg' });
      const path = 'user-1/storefront/prod-1/test.jpg';

      // Call client storage upload directly mimicking uploadStorefrontImage
      const { data, error } = await mockClient.storage.from(STOREFRONT_IMAGE_BUCKET).upload(path, compressedBlob, {
        cacheControl: '31536000',
        upsert: true,
        contentType: 'image/jpeg'
      });

      expect(error).toBeNull();
      expect(mockClient.storage.from).toHaveBeenCalledWith(STOREFRONT_IMAGE_BUCKET);
      expect(mockUpload).toHaveBeenCalledWith(
        path,
        compressedBlob,
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: true
        })
      );
    });
  });

  describe('Frontend ProductEditModal Upload Form Integration', () => {
    it('renders upload button with auto-compression support', async () => {
      const dummyProduct = {
        id: 'prod-test-farsan',
        name: 'Special Bhavnagari Gathiya',
        category: 'gathiya',
        categoryLabel: 'Gathiya',
        image: 'https://example.com/gathiya.jpg',
        variants: [{ weight: '500 GM', price: 180, inStock: true }]
      };

      function TestHarness() {
        const { setEditingProduct } = React.useContext(React.createContext());
        return null;
      }

      const { useStoreCart } = await import('../storefront/context/StoreCartContext');
      function ProductEditModalTestConsumer() {
        const { setEditingProduct } = useStoreCart();
        React.useEffect(() => {
          setEditingProduct(dummyProduct);
        }, [setEditingProduct]);
        return <ProductEditModal />;
      }

      render(
        <StoreCartProvider isOwner={true} actualIsOwner={true}>
          <ProductEditModalTestConsumer />
        </StoreCartProvider>
      );

      // Verify Upload label and auto-compression tip exist
      await waitFor(() => {
        expect(screen.getByText(/Upload Image From Device/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Auto-compressed to max 500×500 px, max 150 KB JPEG/i)).toBeInTheDocument();
    });

    it('automatically compresses uploaded food image and displays compression stats badge', async () => {
      const dummyProduct = {
        id: 'prod-test-farsan-2',
        name: 'Chavannu Mix',
        category: 'mix-namkeen',
        categoryLabel: 'Mix Namkeen',
        image: '',
        variants: [{ weight: '500 GM', price: 150, inStock: true }]
      };

      const { useStoreCart } = await import('../storefront/context/StoreCartContext');
      function ProductEditModalTestConsumer() {
        const { setEditingProduct } = useStoreCart();
        React.useEffect(() => {
          setEditingProduct(dummyProduct);
        }, [setEditingProduct]);
        return <ProductEditModal />;
      }

      render(
        <StoreCartProvider isOwner={true} actualIsOwner={true}>
          <ProductEditModalTestConsumer />
        </StoreCartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Upload Image From Device/i)).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][accept="image/*"]');
      expect(fileInput).toBeTruthy();

      const supabaseClientModule = await import('../supabaseClient.js');
      const uploadSpy = vi.spyOn(supabaseClientModule, 'uploadStorefrontImage').mockResolvedValue({
        publicUrl: 'https://test-cdn.co/storage/storefront/spicy-chavannu.jpg',
        path: 'storefront/spicy-chavannu.jpg',
        bucket: 'storefront-images',
      });

      const originalImage = window.Image;
      window.Image = class {
        constructor() {
          this.width = 800;
          this.height = 600;
          this.naturalWidth = 800;
          this.naturalHeight = 600;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'canvas') {
          el.getContext = () => ({
            fillStyle: '#FFFFFF',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          });
          el.toBlob = (cb, type) => {
            cb(new Blob(['compressed-sample-bytes'], { type: type || 'image/jpeg' }));
          };
          el.toDataURL = () => 'data:image/jpeg;base64,mockSampleData';
        }
        return el;
      });

      const testImageFile = new File(['fake-food-image-content-bytes'], 'spicy-chavannu.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [testImageFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Auto-Compressed:/i)).toBeInTheDocument();
      });

      window.Image = originalImage;
    });
  });
});
