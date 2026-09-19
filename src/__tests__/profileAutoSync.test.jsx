import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BusinessProfileForm, {
  isDemoStorefrontName,
  isDemoStorefrontTagline,
} from '../BusinessProfileForm';
import { StoreCartProvider, useStoreCart } from '../storefront/context/StoreCartContext';

describe('ERP Business Profile to Storefront Profile Auto-Sync & Discount Box Removal', () => {
  it('identifies default demo storefront names and taglines', () => {
    expect(isDemoStorefrontName('')).toBe(true);
    expect(isDemoStorefrontName('Trinetr Store')).toBe(true);
    expect(isDemoStorefrontName('Trinetr Business Suite')).toBe(true);
    expect(isDemoStorefrontName('Jay Ambe Namkeen Store')).toBe(true);
    expect(isDemoStorefrontName('Default Store')).toBe(true);
    expect(isDemoStorefrontName('Priya Enterprise')).toBe(false);

    expect(isDemoStorefrontTagline('')).toBe(true);
    expect(isDemoStorefrontTagline('Fresh & Authentic Homemade Snacks & Delicacies')).toBe(true);
    expect(isDemoStorefrontTagline('Authentic Namkeen & Farsan Manufacturer & Wholesaler')).toBe(true);
    expect(isDemoStorefrontTagline('Enterprise Business Management & Point of Sale')).toBe(true);
    expect(isDemoStorefrontTagline('Fresh & Authentic Quality Products')).toBe(true);
    expect(isDemoStorefrontTagline('My business is serve original rasin products')).toBe(false);
  });

  it('automatically syncs ERP Company Name to Online Storefront Name in real-time', () => {
    const mockProfile = {
      name: '',
      storeName: '',
      phone: '',
      whatsapp: '',
      tagline: '',
      storeTagline: '',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={vi.fn()}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/Company \/ Shop Name/i);
    const storeNameInput = screen.getByLabelText(/Online Storefront Name/i);

    // Initial state
    expect(nameInput.value).toBe('');
    expect(storeNameInput.value).toBe('');

    // User types into ERP Company Name
    fireEvent.change(nameInput, { target: { value: 'PRIYA ENTERPRISE' } });

    // Storefront Name should automatically match!
    expect(nameInput.value).toBe('PRIYA ENTERPRISE');
    expect(storeNameInput.value).toBe('PRIYA ENTERPRISE');
  });

  it('automatically syncs ERP Mobile Number to WhatsApp Orders Number in real-time', () => {
    const mockProfile = {
      name: 'PRIYA ENTERPRISE',
      storeName: 'PRIYA ENTERPRISE',
      phone: '',
      whatsapp: '',
      tagline: '',
      storeTagline: '',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={vi.fn()}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    const phoneInput = screen.getByLabelText(/^Mobile Number/i);
    const whatsappInput = screen.getByLabelText(/WhatsApp Orders Mobile Number/i);

    // User types mobile number
    fireEvent.change(phoneInput, { target: { value: '+918488943771' } });

    // WhatsApp number should automatically match!
    expect(phoneInput.value).toBe('+918488943771');
    expect(whatsappInput.value).toBe('+918488943771');
  });

  it('automatically syncs ERP Business Tagline to Store Tagline in real-time', () => {
    const mockProfile = {
      name: 'PRIYA ENTERPRISE',
      storeName: 'PRIYA ENTERPRISE',
      phone: '+918488943771',
      whatsapp: '+918488943771',
      tagline: '',
      storeTagline: '',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={vi.fn()}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    const taglineInput = screen.getByLabelText(/Business Tagline \/ Description/i);
    const storeTaglineInput = screen.getByLabelText(/Store Tagline \/ Subtitle/i);

    // User types business tagline
    fireEvent.change(taglineInput, {
      target: { value: 'My business is serve original rasin products' },
    });

    // Store Tagline should automatically match!
    expect(taglineInput.value).toBe('My business is serve original rasin products');
    expect(storeTaglineInput.value).toBe('My business is serve original rasin products');
  });

  it('allows user to customize Storefront Name independently if desired', () => {
    const mockProfile = {
      name: 'PRIYA ENTERPRISE',
      storeName: 'PRIYA ENTERPRISE',
      phone: '',
      whatsapp: '',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={vi.fn()}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/Company \/ Shop Name/i);
    const storeNameInput = screen.getByLabelText(/Online Storefront Name/i);

    // User explicitly customizes storefront name
    fireEvent.change(storeNameInput, { target: { value: 'Priya Express Store' } });
    expect(storeNameInput.value).toBe('Priya Express Store');

    // Updating company name should NOT overwrite intentional custom storefront name
    fireEvent.change(nameInput, { target: { value: 'PRIYA ENTERPRISE PVT LTD' } });
    expect(nameInput.value).toBe('PRIYA ENTERPRISE PVT LTD');
    expect(storeNameInput.value).toBe('Priya Express Store');

    // If user clears custom storefront name, it re-syncs to company name
    fireEvent.change(storeNameInput, { target: { value: '' } });
    expect(storeNameInput.value).toBe('PRIYA ENTERPRISE PVT LTD');
  });

  it('does NOT contain redundant discount box inputs and shows banner guidance note', () => {
    const mockProfile = {
      name: 'PRIYA ENTERPRISE',
      bannerOffer: 'FLAT 25% OFF SPECIAL',
      bannerRegion: 'Surat & Navsari',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={vi.fn()}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    // Check that Hero Banner headline input is removed
    expect(screen.queryByLabelText(/Hero Banner Headline \/ Offer/i)).toBeNull();
    // Check that Banner Subtitle / Delivery Area input is removed
    expect(screen.queryByLabelText(/Banner Subtitle \/ Delivery Area/i)).toBeNull();

    // Check that the guidance notice is visible
    expect(screen.getByText(/Storefront Discount Offers & Banners/i)).toBeDefined();
    expect(
      screen.getByText(/can be edited directly on the live storefront using the in-place/i)
    ).toBeDefined();
  });

  it('submits form with auto-filled storefront details upon save', () => {
    const handleSave = vi.fn((e) => e.preventDefault());
    const mockProfile = {
      name: '',
      owner: 'PRIYA PRAJAPATI',
      email: 'nirav.prajapati.dev@gmail.com',
      phone: '',
      address: '364 , PRAJAPATI VAS , MANDALI KHAROD',
      gstin: '24CPVPC7753J1Z8',
    };

    render(
      <BusinessProfileForm
        profile={mockProfile}
        onSave={handleSave}
        onReset={vi.fn()}
        setActiveTab={vi.fn()}
      />
    );

    // User fills ERP details
    fireEvent.change(screen.getByLabelText(/Company \/ Shop Name/i), {
      target: { value: 'PRIYA ENTERPRISE' },
    });
    fireEvent.change(screen.getByLabelText(/^Mobile Number/i), {
      target: { value: '+918488943771' },
    });
    fireEvent.change(screen.getByLabelText(/Business Tagline \/ Description/i), {
      target: { value: 'My business is serve original rasin products' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save Business Profile/i }));

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Online Storefront Name/i).value).toBe('PRIYA ENTERPRISE');
    expect(screen.getByLabelText(/WhatsApp Orders Mobile Number/i).value).toBe('+918488943771');
    expect(screen.getByLabelText(/Store Tagline \/ Subtitle/i).value).toBe(
      'My business is serve original rasin products'
    );
  });

  it('StoreCartContext resolves PRIYA ENTERPRISE when storeName was default demo name', () => {
    localStorage.clear();
    const customProfile = {
      name: 'PRIYA ENTERPRISE',
      storeName: 'Trinetr Business Suite', // stale demo storeName
      tagline: 'My business is serve original rasin products',
      storeTagline: 'Enterprise Business Management & Point of Sale', // stale demo tagline
      phone: '+918488943771',
      whatsapp: '919979668339', // stale demo whatsapp
    };

    function TestConsumer() {
      const { storeInfo } = useStoreCart();
      return (
        <div>
          <span data-testid="live-store-name">{storeInfo.name}</span>
          <span data-testid="live-store-tagline">{storeInfo.tagline}</span>
          <span data-testid="live-store-phone">{storeInfo.phone}</span>
          <span data-testid="live-store-whatsapp">{storeInfo.whatsapp}</span>
        </div>
      );
    }

    const { getByTestId } = render(
      <StoreCartProvider storeProfile={customProfile} isOwner={false}>
        <TestConsumer />
      </StoreCartProvider>
    );

    expect(getByTestId('live-store-name').textContent).toBe('PRIYA ENTERPRISE');
    expect(getByTestId('live-store-tagline').textContent).toBe(
      'My business is serve original rasin products'
    );
    expect(getByTestId('live-store-phone').textContent).toBe('+918488943771');
    expect(getByTestId('live-store-whatsapp').textContent).toBe('+918488943771');
  });
});
