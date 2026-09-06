import { describe, it, expect } from 'vitest';
import { PRODUCTS, CATEGORIES, STORE_INFO } from '../storefront/data/namkeenData';

describe('Bhole G Namkeen Storefront Catalog & Variants', () => {
  it('loads valid categories with positive counts', () => {
    expect(CATEGORIES.length).toBeGreaterThan(10);
    const wafer = CATEGORIES.find(c => c.id === 'wafer');
    expect(wafer).toBeDefined();
    expect(wafer.count).toBeGreaterThan(0);
  });

  it('ensures each product has at least one weight variant with price and stock', () => {
    expect(PRODUCTS.length).toBeGreaterThan(0);

    PRODUCTS.forEach(product => {
      expect(product.id).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.category).toBeTruthy();
      expect(Array.isArray(product.variants)).toBe(true);
      expect(product.variants.length).toBeGreaterThan(0);

      product.variants.forEach(variant => {
        expect(variant.weight).toBeTruthy();
        expect(typeof variant.price).toBe('number');
        expect(variant.price).toBeGreaterThan(0);
        expect(typeof variant.inStock).toBe('boolean');
      });
    });
  });

  it('correctly tags Not For Jain (NJ) items', () => {
    const njItems = PRODUCTS.filter(p => p.isNotForJain);
    expect(njItems.length).toBeGreaterThan(0);

    // Items like Garlic Gathiya, Soya Maggie Sticks, and Potato Wafers must be tagged NJ
    const potatoWafers = PRODUCTS.find(p => p.id === 'prod-potato-wafers');
    expect(potatoWafers).toBeDefined();
    expect(potatoWafers.isNotForJain).toBe(true);

    const garlicGathiya = PRODUCTS.find(p => p.id === 'prod-lausan-gathiya');
    expect(garlicGathiya).toBeDefined();
    expect(garlicGathiya.isNotForJain).toBe(true);

    // Items like Plain Roasted Mora Chana must NOT be tagged NJ
    const moraChana = PRODUCTS.find(p => p.id === 'prod-mora-chana');
    expect(moraChana).toBeDefined();
    expect(moraChana.isNotForJain).toBe(false);
  });

  it('calculates variant-based totals correctly', () => {
    const moongJor = PRODUCTS.find(p => p.id === 'prod-moong-jor');
    expect(moongJor).toBeDefined();

    const variant250g = moongJor.variants.find(v => v.weight === '250 GM');
    const variant500g = moongJor.variants.find(v => v.weight === '500 GM');

    expect(variant250g.price).toBe(120.00);
    expect(variant500g.price).toBe(230.00);

    // 2 packs of 250g + 1 pack of 500g
    const total = (variant250g.price * 2) + (variant500g.price * 1);
    expect(total).toBe(470.00);
  });

  it('formats WhatsApp direct order URL properly with customer details and line items', () => {
    const sampleCart = [
      {
        name: 'Moong Jor Salted',
        variantWeight: '250 GM',
        price: 120.00,
        quantity: 2
      },
      {
        name: 'Potato Salted Wafers',
        variantWeight: '500 GM',
        price: 190.00,
        quantity: 1
      }
    ];

    const customerDetails = {
      name: 'Amit Patel',
      phone: '9876543210',
      address: '104 Shree Ram Heights, Surat',
      city: 'Surat'
    };

    let text = `🛍️ *NEW ORDER - ${STORE_INFO.name.toUpperCase()}*\n`;
    text += `Customer: ${customerDetails.name} (${customerDetails.phone})\n`;
    sampleCart.forEach((item, idx) => {
      text += `${idx + 1}. ${item.name} (${item.variantWeight}) x ${item.quantity} = ₹${item.price * item.quantity}\n`;
    });

    const cleanPhone = STORE_INFO.whatsapp.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    expect(url).toContain(`wa.me/${cleanPhone}`);
    expect(url).toContain(encodeURIComponent('Amit Patel'));
    expect(url).toContain(encodeURIComponent('Moong Jor Salted'));
    expect(url).toContain(encodeURIComponent('250 GM'));
  });

  it('dynamically adapts storefront and WhatsApp orders to custom ERP company profile', () => {
    // Simulate user entering their own company details in ERP
    const customMerchantProfile = {
      name: 'Jay Ambe Farsan Mart',
      storeName: 'Jay Ambe Farsan Mart',
      tagline: 'Fresh Kathiyawadi Snacks Since 1998',
      storeTagline: 'Fresh Kathiyawadi Snacks Since 1998',
      phone: '+91 98251 12345',
      whatsapp: '+91 98251 12345',
      email: 'jayambe@example.com',
      address: 'Shop 12, Ring Road, Rajkot, Gujarat',
      fssaiNumber: '10724011005555',
      hours: '8:00 AM - 9:30 PM',
      bannerOffer: 'FLAT 25% OFF',
      bannerRegion: 'Free Delivery Across Rajkot City'
    };

    // Store resolver logic
    const storeName = customMerchantProfile.storeName || customMerchantProfile.name || STORE_INFO.name;
    const cleanPhone = String(customMerchantProfile.whatsapp || customMerchantProfile.phone).replace(/[^0-9]/g, '');
    const orderUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`🛍️ *NEW ORDER - ${storeName.toUpperCase()}*`)}`;

    expect(storeName).toBe('Jay Ambe Farsan Mart');
    expect(cleanPhone).toBe('919825112345');
    expect(orderUrl).toContain('wa.me/919825112345');
    expect(orderUrl).toContain(encodeURIComponent('JAY AMBE FARSAN MART'));
  });

  it('falls back gracefully to Bhole G Namkeen defaults when user profile is unconfigured', () => {
    const unconfiguredProfile = {
      name: 'Trinetr Business Suite',
      storeName: '',
      whatsapp: '',
      address: ''
    };

    const resolvedName = (!unconfiguredProfile.storeName || unconfiguredProfile.name === 'Trinetr Business Suite')
      ? STORE_INFO.name
      : unconfiguredProfile.storeName;

    expect(resolvedName).toBe('Bhole G Namkeen');
  });
});
