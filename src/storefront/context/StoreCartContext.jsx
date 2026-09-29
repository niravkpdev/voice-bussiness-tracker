import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORE_INFO, PRODUCTS } from '../data/namkeenData';
import { formatWhatsAppPhone } from '../../security.js';
import { fetchMenuItems, clearStorefrontMenuCache } from '../../supabaseClient.js';
import { readScopedString, writeScopedString } from '../../storageScope.js';

const StoreCartContext = createContext(null);

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', name: 'Indian Rupee', rate: 1.0, flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', name: 'US Dollar', rate: 0.012, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', name: 'Euro', rate: 0.011, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', name: 'British Pound', rate: 0.0093, flag: '🇬🇧' },
};

const CART_STORAGE_KEY = 'trinetr_store_cart_v1';
const WISHLIST_STORAGE_KEY = 'trinetr_store_wishlist_v1';
const PRODUCT_OVERRIDES_KEY = 'storefront_product_overrides';
const CURRENCY_STORAGE_KEY = 'trinetr_store_currency';
const DELIVERY_CONFIG_KEY = 'trinetr_delivery_partner_config';

export const FISH_IMAGE_IDS = [
  '1599488615731', // Neon fish aquarium with bubbles
  '7e5c2823ff28',
  '1626082927389', // Fried chicken drumsticks
  '6cd097cdc6ec'
];
export const FISH_IMAGE_FRAGMENT = 'photo-1599488615731-7e5c2823ff28';
export const DEFAULT_SNACK_IMAGE = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80';
export const DEFAULT_BANNER_SNACK_IMAGE = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=80';

export function isFishImage(url) {
  if (!url || typeof url !== 'string') return false;
  return FISH_IMAGE_IDS.some(id => url.includes(id));
}

export function getCategoryFallbackImage(category = '') {
  const norm = String(category || '').toLowerCase().trim();
  if (norm.includes('chana') || norm.includes('kathor') || norm.includes('chewda') || norm.includes('moong')) {
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80';
  }
  if (norm.includes('dana') || norm.includes('sing') || norm.includes('peanut')) {
    return 'https://images.unsplash.com/photo-1567653418876-5bb0e566e1c2?w=500&auto=format&fit=crop&q=80';
  }
  if (norm.includes('wafer') || norm.includes('potato') || norm.includes('chips') || norm.includes('frymes')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80';
  }
  if (norm.includes('stick') || norm.includes('fulvadi') || norm.includes('soya')) {
    return 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500&auto=format&fit=crop&q=80';
  }
  if (norm.includes('sev')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80';
  }
  return DEFAULT_SNACK_IMAGE;
}

export function sanitizeSnackImage(url, fallback = DEFAULT_SNACK_IMAGE, category = '') {
  if (!url || typeof url !== 'string' || !url.trim() || isFishImage(url)) {
    return category ? getCategoryFallbackImage(category) : fallback;
  }
  return url;
}

export function purgeFishImagesFromStorage() {
  // 1. Purge product overrides
  try {
    const rawOverrides = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
    if (rawOverrides && FISH_IMAGE_IDS.some(id => rawOverrides.includes(id))) {
      const overrides = JSON.parse(rawOverrides) || {};
      let modified = false;
      Object.keys(overrides).forEach(key => {
        const item = overrides[key];
        if (item && isFishImage(item.image)) {
          item.image = getCategoryFallbackImage(item.category);
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
      }
    }
  } catch {}

  // 2. Purge erpProducts (plain)
  try {
    const rawErp = localStorage.getItem('erpProducts');
    if (rawErp && FISH_IMAGE_IDS.some(id => rawErp.includes(id))) {
      const erp = JSON.parse(rawErp) || [];
      if (Array.isArray(erp)) {
        let modified = false;
        const cleaned = erp.map(item => {
          if (item && isFishImage(item.image)) {
            modified = true;
            return { ...item, image: getCategoryFallbackImage(item.category) };
          }
          return item;
        });
        if (modified) {
          localStorage.setItem('erpProducts', JSON.stringify(cleaned));
        }
      }
    }
  } catch {}

  // 3. Purge scoped erpProducts
  try {
    const scopedRaw = readScopedString('erpProducts');
    if (scopedRaw && FISH_IMAGE_IDS.some(id => scopedRaw.includes(id))) {
      const parsed = JSON.parse(scopedRaw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map(item => {
          if (item && isFishImage(item.image)) {
            return { ...item, image: getCategoryFallbackImage(item.category) };
          }
          return item;
        });
        writeScopedString('erpProducts', JSON.stringify(cleaned));
      }
    }
  } catch {}

  // 4. Purge businessProfile bannerImage
  try {
    const rawProfile = localStorage.getItem('businessProfile');
    if (rawProfile && FISH_IMAGE_IDS.some(id => rawProfile.includes(id))) {
      const profile = JSON.parse(rawProfile);
      if (profile && isFishImage(profile.bannerImage)) {
        profile.bannerImage = DEFAULT_BANNER_SNACK_IMAGE;
        localStorage.setItem('businessProfile', JSON.stringify(profile));
      }
    }
  } catch {}

  // 5. Purge all scoped inventory & business inventory across localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const val = localStorage.getItem(k);
      if (val && FISH_IMAGE_IDS.some(id => val.includes(id))) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map(item => {
              if (item && isFishImage(item.image)) {
                return { ...item, image: getCategoryFallbackImage(item.category) };
              }
              return item;
            });
            localStorage.setItem(k, JSON.stringify(cleaned));
          } else if (parsed && typeof parsed === 'object') {
            if (isFishImage(parsed.bannerImage)) {
              parsed.bannerImage = DEFAULT_BANNER_SNACK_IMAGE;
            }
            if (isFishImage(parsed.image)) {
              parsed.image = DEFAULT_SNACK_IMAGE;
            }
            localStorage.setItem(k, JSON.stringify(parsed));
          }
        } catch {}
      }
    }
  } catch {}
}

export const DEFAULT_DELIVERY_CONFIG = {
  provider: 'shiprocket', // 'shiprocket' | 'delhivery' | 'borzo' | 'dunzo' | 'self'
  apiKey: '',
  apiSecret: '',
  merchantId: '',
  pickupPincode: '380001',
  freeShippingThreshold: 500, // in INR
  standardDeliveryFee: 50, // in INR
  autoDispatch: false,
  testMode: true,
  trackingBaseUrl: 'https://shiprocket.co/tracking/'
};

function applyProductOverrides(items) {
  if (!Array.isArray(items)) return [];
  purgeFishImagesFromStorage();
  let overrides = {};
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
    if (raw) overrides = JSON.parse(raw) || {};
  } catch {}

  const overrideKeys = Object.keys(overrides);
  if (overrideKeys.length === 0) {
    return items.map(item => ({
      ...item,
      image: sanitizeSnackImage(item?.image, undefined, item?.category)
    }));
  }

  const overrideValues = Object.values(overrides);

  return items.map(item => {
    if (!item) return item;
    // 1. Direct ID match
    let matchedOverride = overrides[item.id];

    // 2. Direct normalized name match
    const normName = item.name ? item.name.toLowerCase().trim() : '';
    if (!matchedOverride && normName) {
      matchedOverride = overrides[normName];
      if (matchedOverride?.id && overrides[matchedOverride.id]) {
        matchedOverride = overrides[matchedOverride.id];
      }
    }

    // 3. Search through values if key was different ID/alias
    if (!matchedOverride) {
      const foundVal = overrideValues.find(val => {
        if (!val || typeof val !== 'object') return false;
        if (val.id && item.id && val.id === item.id) return true;
        if (normName && val.name && val.name.toLowerCase().trim() === normName) return true;
        return false;
      });
      if (foundVal) {
        matchedOverride = foundVal;
      }
    }

    let resolved = item;
    if (matchedOverride) {
      const { id: _ignoredId, ...overrideFields } = matchedOverride;
      resolved = { ...item, ...overrideFields, id: item.id };
    }
    return {
      ...resolved,
      image: sanitizeSnackImage(resolved.image, undefined, resolved.category)
    };
  });
}

function isDefaultDemoName(val) {
  if (!val || typeof val !== 'string') return true;
  const s = val.trim().toLowerCase();
  return (
    s === '' ||
    s === 'jay ambe namkeen' ||
    s === 'jay ambe namkeen store' ||
    s === 'trinetr store' ||
    s === 'default store' ||
    s === 'demo workspace' ||
    s === 'voice business tracker'
  );
}

function isDefaultDemoTagline(val) {
  if (!val || typeof val !== 'string') return true;
  const s = val.trim().toLowerCase();
  return (
    s === '' ||
    s === 'fresh & authentic homemade snacks & delicacies' ||
    s === 'authentic namkeen & farsan manufacturer & wholesaler' ||
    s === 'authentic namkeen & farsan manufacturer & wholesale' ||
    s === 'namkeen & wafers' ||
    s === 'fresh & authentic quality products' ||
    s === 'enterprise business management & point of sale'
  );
}

function resolveStoreInfo(customProfile) {
  let localData = {};
  try {
    const saved = localStorage.getItem('businessProfile');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        localData = parsed;
      }
    }
  } catch {
    // ignore
  }

  // Combine defaults, localStorage, and live customProfile prop
  const profileData = {
    ...STORE_INFO,
    ...localData,
    ...(customProfile || {})
  };

  // Preserve owner customized banner overrides from local storage
  if (localData?.bannerOffer) profileData.bannerOffer = localData.bannerOffer;
  if (localData?.bannerRegion) profileData.bannerRegion = localData.bannerRegion;
  if (localData?.bannerImage) profileData.bannerImage = localData.bannerImage;

  // Resolve business name:
  // 1. If customProfile or localData has an explicitly customized company name (from Company Settings/ERP), that is the source of truth!
  // 2. If an explicit storeName was set and is NOT the default demo name, allow it.
  // 3. Otherwise, if the company name was updated in ERP/Settings, storefront name MUST adopt it!
  const compNameCandidate = (customProfile?.name && !isDefaultDemoName(customProfile.name))
    ? customProfile.name
    : (localData?.name && !isDefaultDemoName(localData.name) ? localData.name : null);

  let storeNameCandidate = (customProfile?.storeName && !isDefaultDemoName(customProfile.storeName))
    ? customProfile.storeName
    : (localData?.storeName && !isDefaultDemoName(localData.storeName) ? localData.storeName : null);

  // If company name was customized to a real business (not 'Trinetr Business Suite'), and storeName is still 'Trinetr Business Suite' or 'Trinetr Store', treat storeName as default so company name takes precedence!
  if (compNameCandidate && compNameCandidate.toLowerCase() !== 'trinetr business suite' && storeNameCandidate && (storeNameCandidate.toLowerCase() === 'trinetr business suite' || storeNameCandidate.toLowerCase() === 'trinetr store')) {
    storeNameCandidate = null;
  }

  let name = '';
  if (storeNameCandidate && storeNameCandidate !== compNameCandidate && !isDefaultDemoName(storeNameCandidate)) {
    name = storeNameCandidate;
  } else if (compNameCandidate) {
    name = compNameCandidate;
  } else if (storeNameCandidate) {
    name = storeNameCandidate;
  } else {
    name = profileData?.storeName || profileData?.name || STORE_INFO.name || 'Jay Ambe Namkeen';
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    name = STORE_INFO.name || 'Jay Ambe Namkeen';
  }

  // Resolve business tagline:
  const compTaglineCandidate = (customProfile?.tagline && !isDefaultDemoTagline(customProfile.tagline))
    ? customProfile.tagline
    : (localData?.tagline && !isDefaultDemoTagline(localData.tagline) ? localData.tagline : null);

  let storeTaglineCandidate = (customProfile?.storeTagline && !isDefaultDemoTagline(customProfile.storeTagline))
    ? customProfile.storeTagline
    : (localData?.storeTagline && !isDefaultDemoTagline(localData.storeTagline) ? localData.storeTagline : null);

  if (compTaglineCandidate && storeTaglineCandidate && (storeTaglineCandidate.toLowerCase() === 'enterprise business management & point of sale' || storeTaglineCandidate.toLowerCase() === 'fresh & authentic quality products')) {
    storeTaglineCandidate = null;
  }

  let tagline = '';
  if (storeTaglineCandidate && storeTaglineCandidate !== compTaglineCandidate && !isDefaultDemoTagline(storeTaglineCandidate)) {
    tagline = storeTaglineCandidate;
  } else if (compTaglineCandidate) {
    tagline = compTaglineCandidate;
  } else if (storeTaglineCandidate) {
    tagline = storeTaglineCandidate;
  } else {
    tagline = profileData?.storeTagline || profileData?.tagline || STORE_INFO.tagline;
  }

  const phone = profileData?.phone || STORE_INFO.phone;
  let whatsapp = profileData?.whatsapp || profileData?.phone || STORE_INFO.whatsapp;
  if (phone && phone !== STORE_INFO.phone && (whatsapp === STORE_INFO.whatsapp || whatsapp === '+91 9979668339' || whatsapp === '919979668339')) {
    whatsapp = phone;
  }
  const email = profileData?.email || STORE_INFO.email;
  const address = profileData?.address || STORE_INFO.address;
  const fssaiNumber = profileData?.fssaiNumber || profileData?.fssai || STORE_INFO.fssaiNumber;
  const hours = profileData?.hours || STORE_INFO.hours;
  const bannerOffer = profileData?.bannerOffer || 'FLAT 20% OFF';
  const bannerRegion = profileData?.bannerRegion || "For All Gujarat and Mumbai City's Customers";
  const rawBanner = profileData?.bannerImage;
  const bannerImage = (rawBanner && !isFishImage(rawBanner)) ? rawBanner : DEFAULT_BANNER_SNACK_IMAGE;

  // Dynamic social handles matching business name if not customized
  let facebook = profileData?.facebook;
  let instagram = profileData?.instagram;
  if (!facebook || facebook === '@jayambenamkeen') {
    facebook = !isDefaultDemoName(name) ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@jayambenamkeen';
  }
  if (!instagram || instagram === '@jayambenamkeen') {
    instagram = !isDefaultDemoName(name) ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@jayambenamkeen';
  }

  let description = profileData?.description;
  if (!description) {
    if (!isDefaultDemoName(name)) {
      description = tagline && !isDefaultDemoTagline(tagline)
        ? `${tagline}. Handcrafted with pure quality and authentic taste.`
        : `Handcrafted with pure quality. Offering fresh delicacies, snacks, and foods.`;
    } else {
      description = 'Handcrafted with pure quality and authentic recipes. Offering 175+ varieties of fresh delicacies, snacks, and foods.';
    }
  }

  // Auto-sync localStorage if company name was updated but storeName was still holding demo default
  if (compNameCandidate && (isDefaultDemoName(localData?.storeName) || !localData?.storeName || (compNameCandidate.toLowerCase() !== 'trinetr business suite' && localData?.storeName?.toLowerCase() === 'trinetr business suite'))) {
    try {
      const repaired = { ...localData, storeName: compNameCandidate, name: compNameCandidate };
      localStorage.setItem('businessProfile', JSON.stringify(repaired));
    } catch {}
  }

  return {
    ...STORE_INFO,
    name,
    tagline,
    phone,
    whatsapp,
    email,
    address,
    fssaiNumber,
    hours,
    bannerOffer,
    bannerRegion,
    bannerImage,
    logo: profileData?.logo || null,
    facebook,
    instagram,
    description
  };
}

function resolveInventoryItems(customInventoryProp) {
  purgeFishImagesFromStorage();
  let customItems = [];
  if (Array.isArray(customInventoryProp) && customInventoryProp.length > 0) {
    customItems = customInventoryProp;
  } else {
    try {
      const scopedRaw = readScopedString('erpProducts');
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) customItems = parsed;
      }
    } catch {}
    if (customItems.length === 0) {
      try {
        const fromErp = localStorage.getItem('erpProducts');
        if (fromErp) {
          const parsed = JSON.parse(fromErp);
          if (Array.isArray(parsed) && parsed.length > 0) customItems = parsed;
        }
      } catch {}
    }
    if (customItems.length === 0) {
      try {
        const fromBusiness = localStorage.getItem('businessInventory');
        if (fromBusiness) {
          const parsed = JSON.parse(fromBusiness);
          if (Array.isArray(parsed) && parsed.length > 0) customItems = parsed;
        }
      } catch {}
    }
    if (customItems.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.endsWith(':erpProducts') || k.endsWith(':businessInventory'))) {
            const parsed = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) {
              customItems = parsed;
              break;
            }
          }
        }
      } catch {}
    }
  }

  if (!customItems || customItems.length === 0) {
    return applyProductOverrides(PRODUCTS);
  }

  // Map ERP items into Storefront Product schema
  const mappedCustom = customItems.map(item => {
    const stock = Number(item.currentStock ?? 10);
    const isOutOfStock = stock <= 0;
    const price = Number(item.sellingPrice) || Number(item.purchasePrice) || 100;
    const weight = item.unit || '1 Pack';
    return {
      id: item.id || `erp-${(item.name || 'item').toLowerCase().replace(/\s+/g, '-')}`,
      name: item.name || 'Special Item',
      category: (item.category || 'mix-namkeen').toLowerCase().replace(/\s+/g, '-'),
      categoryLabel: item.category || 'General',
      description: item.details || item.description || `Fresh & authentic ${item.name || 'product'}. Made with pure ingredients and hygienic packaging.`,
      image: sanitizeSnackImage(item.image, undefined, item.category),
      isTopSeller: Boolean(item.isTopSeller),
      isNotForJain: Boolean(item.isNotForJain),
      isOutOfStock,
      rating: 4.9,
      reviewsCount: 32,
      variants: Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [
        { weight, price, inStock: !isOutOfStock }
      ]
    };
  });

  const customNames = new Set(mappedCustom.map(c => c.name.toLowerCase().trim()));
  const customIds = new Set(mappedCustom.map(c => c.id));
  const remainingStatic = PRODUCTS.filter(p => !customIds.has(p.id) && !customNames.has(p.name.toLowerCase().trim()));

  return applyProductOverrides([...mappedCustom, ...remainingStatic]);
}

export function StoreCartProvider({ children, storeProfile, customInventory, isOwner = false }) {
  const [storeInfo, setStoreInfo] = useState(() => resolveStoreInfo(storeProfile));

  useEffect(() => {
    setStoreInfo(resolveStoreInfo(storeProfile));
  }, [storeProfile]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const updated = e?.detail || resolveStoreInfo(storeProfile);
      setStoreInfo(resolveStoreInfo(updated));
    };
    window.addEventListener('trinetr-profile-updated', handleProfileUpdate);
    const handleStorage = (e) => {
      if (e.key === 'businessProfile') {
        let updatedProfile = null;
        try {
          if (e.newValue) updatedProfile = JSON.parse(e.newValue);
        } catch {}
        setStoreInfo(resolveStoreInfo(updatedProfile || storeProfile));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('trinetr-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [storeProfile]);

  const updateStoreProfile = (updates) => {
    let currentProfile = {};
    try {
      const raw = localStorage.getItem('businessProfile');
      if (raw) currentProfile = JSON.parse(raw);
    } catch {}

    const nextProfile = { ...currentProfile, ...updates };
    try {
      localStorage.setItem('businessProfile', JSON.stringify(nextProfile));
      window.dispatchEvent(new CustomEvent('trinetr-profile-updated', { detail: nextProfile }));
    } catch (e) {
      console.error('Failed to save store profile update', e);
    }

    setStoreInfo(resolveStoreInfo(nextProfile));
    return nextProfile;
  };
  
  // Catalog products state (merged ERP inventory + Storefront catalog)
  const [products, setProducts] = useState(() => resolveInventoryItems(customInventory));

  // Sync inventory if customInventory prop updates
  useEffect(() => {
    setProducts(resolveInventoryItems(customInventory));
  }, [customInventory]);

  // Handle global inventory updates and storage changes without race conditions
  useEffect(() => {
    const handleInventoryChange = (e) => {
      if (e?.detail?.updatedFields || e?.detail?.product) {
        const prod = e.detail.product || e.detail.updatedFields;
        const targetId = e.detail.id || e.detail.productId || prod?.id;
        const targetName = prod?.name ? prod.name.toLowerCase().trim() : '';
        setProducts(prevProducts => {
          let matched = false;
          const next = prevProducts.map(p => {
            const matchesId = targetId && p.id === targetId;
            const matchesName = targetName && p.name && p.name.toLowerCase().trim() === targetName;
            if (matchesId || matchesName) {
              matched = true;
              return {
                ...p,
                ...prod,
                image: sanitizeSnackImage(prod.image || p.image)
              };
            }
            return p;
          });
          if (!matched && targetId) {
            return [{ id: targetId, ...prod, image: sanitizeSnackImage(prod.image) }, ...next];
          }
          return next;
        });
        return;
      }
      setProducts(resolveInventoryItems(customInventory));
    };
    window.addEventListener('trinetr-inventory-updated', handleInventoryChange);
    window.addEventListener('storage', handleInventoryChange);
    return () => {
      window.removeEventListener('trinetr-inventory-updated', handleInventoryChange);
      window.removeEventListener('storage', handleInventoryChange);
    };
  }, [customInventory]);

  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('bhole_g_store_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY) || localStorage.getItem('bhole_g_store_wishlist_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Currency State (INR ₹, USD $, EUR €, GBP £)
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      return (saved && CURRENCIES[saved]) ? saved : 'INR';
    } catch {
      return 'INR';
    }
  });

  const currentCurrency = useMemo(() => {
    return CURRENCIES[selectedCurrency] || CURRENCIES.INR;
  }, [selectedCurrency]);

  const setCurrency = (code) => {
    if (CURRENCIES[code]) {
      setSelectedCurrency(code);
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      } catch {}
    }
  };

  const convertPrice = (amountInInr, targetCurrency = selectedCurrency) => {
    const num = Number(amountInInr) || 0;
    const cur = CURRENCIES[targetCurrency] || CURRENCIES.INR;
    return cur.code === 'INR' ? num : Number((num * cur.rate).toFixed(2));
  };

  const convertToInr = (foreignAmount, sourceCurrency = selectedCurrency) => {
    const num = Number(foreignAmount) || 0;
    const cur = CURRENCIES[sourceCurrency] || CURRENCIES.INR;
    if (cur.code === 'INR' || !cur.rate) return num;
    return Number((num / cur.rate).toFixed(2));
  };

  const formatPrice = (amountInInr, includeSymbol = true, targetCurrency = selectedCurrency) => {
    const cur = CURRENCIES[targetCurrency] || CURRENCIES.INR;
    const converted = convertPrice(amountInInr, targetCurrency);
    const formatted = cur.code === 'INR'
      ? (Number.isInteger(converted) ? converted.toLocaleString('en-IN') : converted.toFixed(2))
      : converted.toFixed(2);
    return includeSymbol ? `${cur.symbol}${formatted}` : formatted;
  };

  // Delivery Partner Configuration State (Shiprocket, Delhivery, Borzo, Dunzo, Self)
  const [deliveryConfig, setDeliveryConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(DELIVERY_CONFIG_KEY);
      return saved ? { ...DEFAULT_DELIVERY_CONFIG, ...JSON.parse(saved) } : DEFAULT_DELIVERY_CONFIG;
    } catch {
      return DEFAULT_DELIVERY_CONFIG;
    }
  });

  const updateDeliveryConfig = (updates) => {
    setDeliveryConfig(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(DELIVERY_CONFIG_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save delivery config', e);
      }
      return next;
    });
  };

  // Delivery Partner Modal open/close state
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const openDeliveryModal = () => setDeliveryModalOpen(true);
  const closeDeliveryModal = () => setDeliveryModalOpen(false);

  // Cart Drawer open/close state
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Active category filter state
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'jain', 'nj'

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Persist wishlist
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
  }, [wishlist]);

  // Add item to cart with selected weight variant
  const addToCart = (product, variant, quantity = 1) => {
    if (!product || !variant) return;

    const cartItemId = `${product.id}-${variant.weight}`;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            cartItemId,
            productId: product.id,
            name: product.name,
            categoryLabel: product.categoryLabel,
            image: product.image,
            variantWeight: variant.weight,
            price: variant.price,
            isNotForJain: product.isNotForJain,
            quantity
          }
        ];
      }
    });

    // Auto open drawer briefly or show badge
    setCartDrawerOpen(true);
  };

  // Update item quantity
  const updateQuantity = (cartItemId, delta) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remove single item from cart
  const removeFromCart = (cartItemId) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Toggle Wishlist
  const toggleWishlist = (productId) => {
    setWishlist(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Financial calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const cartTotalCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Shipping estimate: Free over freeShippingThreshold, else standardDeliveryFee
  const deliveryCharge = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    const threshold = deliveryConfig?.freeShippingThreshold ?? 500;
    const fee = deliveryConfig?.standardDeliveryFee ?? 50;
    return cartSubtotal >= threshold ? 0 : fee;
  }, [cartSubtotal, deliveryConfig]);

  const cartGrandTotal = cartSubtotal + deliveryCharge;

  // Generate WhatsApp Order URL
  const generateWhatsAppOrderUrl = (customerDetails = {}) => {
    if (cart.length === 0) return '';

    const cur = currentCurrency;
    const isForeign = cur.code !== 'INR';

    let text = `🛍️ *NEW ORDER - ${storeInfo.name.toUpperCase()}*\n`;
    text += `────────────────────\n`;
    if (customerDetails.name) {
      text += `👤 *Customer:* ${customerDetails.name}\n`;
    }
    if (customerDetails.phone) {
      text += `📞 *Phone:* ${customerDetails.phone}\n`;
    }
    if (customerDetails.address) {
      text += `📍 *Delivery Address:* ${customerDetails.address}\n`;
    }
    if (customerDetails.city) {
      text += `🏙️ *City:* ${customerDetails.city}\n`;
    }
    if (isForeign) {
      text += `💱 *Currency:* ${cur.name} (${cur.code} ${cur.symbol})\n`;
    }
    text += `────────────────────\n`;
    text += `*ITEMS ORDERED:*\n`;

    cart.forEach((item, index) => {
      const lineTotalInr = item.price * item.quantity;
      if (isForeign) {
        const unitForeign = formatPrice(item.price);
        const lineForeign = formatPrice(lineTotalInr);
        text += `${index + 1}. *${item.name}*\n   ├ Size: ${item.variantWeight}\n   ├ Qty: ${item.quantity} x ${unitForeign}\n   └ Subtotal: ${lineForeign} (₹${lineTotalInr.toFixed(2)})\n`;
      } else {
        text += `${index + 1}. *${item.name}*\n   ├ Size: ${item.variantWeight}\n   ├ Qty: ${item.quantity} x ₹${item.price.toFixed(2)}\n   └ Subtotal: ₹${lineTotalInr.toFixed(2)}\n`;
      }
    });

    text += `────────────────────\n`;
    if (isForeign) {
      text += `💰 *Items Subtotal:* ${formatPrice(cartSubtotal)} (₹${cartSubtotal.toFixed(2)})\n`;
      text += `🚚 *Delivery Fee:* ${deliveryCharge === 0 ? 'FREE' : `${formatPrice(deliveryCharge)} (₹${deliveryCharge.toFixed(2)})`}\n`;
      text += `⭐ *GRAND TOTAL: ${formatPrice(cartGrandTotal)} (Approx ₹${cartGrandTotal.toFixed(2)} INR)*\n`;
    } else {
      text += `💰 *Items Subtotal:* ₹${cartSubtotal.toFixed(2)}\n`;
      text += `🚚 *Delivery Fee:* ${deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}\n`;
      text += `⭐ *GRAND TOTAL: ₹${cartGrandTotal.toFixed(2)}*\n`;
    }
    text += `────────────────────\n`;
    text += `Please confirm my order and share estimated dispatch time. Thank you!`;

    const cleanPhone = formatWhatsAppPhone(storeInfo.whatsapp || '919979668339');
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Editing Product state (Strictly controlled by Registered Owner)
  const [editingProduct, setEditingProduct] = useState(null);

  const safeSetEditingProduct = (product) => {
    if (!isOwner) {
      console.warn('Unauthorized: Storefront product editing is restricted to registered owners.');
      return;
    }
    setEditingProduct(product);
  };

  // Update a product: persists override, syncs with ERP, updates cart & triggers event
  const updateProduct = (productId, updatedFields) => {
    if (!isOwner) {
      console.warn('Unauthorized: Storefront product updates are restricted to registered owners.');
      return;
    }

    const normUpdatedName = updatedFields.name ? updatedFields.name.toLowerCase().trim() : '';
    const safeImage = sanitizeSnackImage(updatedFields.image, getCategoryFallbackImage(updatedFields.category), updatedFields.category);
    const sanitizedFields = {
      ...updatedFields,
      image: safeImage
    };

    // 1. Clean up old conflicting aliases and save override in localStorage
    try {
      const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
      const overrides = raw ? JSON.parse(raw) : {};

      // Remove any prior alias entries pointing to the same productId or old name
      Object.keys(overrides).forEach(k => {
        if (overrides[k]?.id === productId) {
          delete overrides[k];
        }
      });

      const overrideData = {
        ...sanitizedFields,
        id: productId,
      };
      overrides[productId] = overrideData;
      if (normUpdatedName) {
        overrides[normUpdatedName] = overrideData;
      }
      localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.error('Failed to save product override', e);
    }

    // 2. Sync to erpProducts (both plain and scoped storage)
    let syncedErpProduct = null;
    try {
      const fromErp = localStorage.getItem('erpProducts');
      let erpItems = fromErp ? JSON.parse(fromErp) : [];
      if (Array.isArray(erpItems)) {
        const idx = erpItems.findIndex(e => e.id === productId || (normUpdatedName && e.name && e.name.toLowerCase().trim() === normUpdatedName));
        if (idx >= 0) {
          erpItems[idx] = {
            ...erpItems[idx],
            name: sanitizedFields.name || erpItems[idx].name,
            category: sanitizedFields.categoryLabel || sanitizedFields.category || erpItems[idx].category,
            sellingPrice: sanitizedFields.variants?.[0]?.price ?? erpItems[idx].sellingPrice,
            image: sanitizedFields.image,
            details: sanitizedFields.description || erpItems[idx].details,
            isTopSeller: Boolean(sanitizedFields.isTopSeller),
            isNotForJain: Boolean(sanitizedFields.isNotForJain),
            unit: sanitizedFields.variants?.[0]?.weight || erpItems[idx].unit,
            variants: sanitizedFields.variants
          };
          syncedErpProduct = erpItems[idx];
        } else {
          syncedErpProduct = {
            id: productId,
            name: sanitizedFields.name,
            category: sanitizedFields.categoryLabel || sanitizedFields.category || 'Namkeen',
            sellingPrice: sanitizedFields.variants?.[0]?.price || 100,
            currentStock: sanitizedFields.isOutOfStock ? 0 : 50,
            image: sanitizedFields.image,
            details: sanitizedFields.description,
            isTopSeller: Boolean(sanitizedFields.isTopSeller),
            isNotForJain: Boolean(sanitizedFields.isNotForJain),
            unit: sanitizedFields.variants?.[0]?.weight || '250 GM',
            variants: sanitizedFields.variants
          };
          erpItems.push(syncedErpProduct);
        }
        localStorage.setItem('erpProducts', JSON.stringify(erpItems));
        writeScopedString('erpProducts', JSON.stringify(erpItems));
      }
    } catch (e) {
      console.error('Failed to sync product to ERP', e);
    }

    // 3. Dispatch global sync event with both formats
    const fullProduct = syncedErpProduct || { id: productId, ...sanitizedFields };
    window.dispatchEvent(new CustomEvent('trinetr-inventory-updated', {
      detail: {
        id: productId,
        productId,
        product: fullProduct,
        updatedFields: sanitizedFields
      }
    }));

    // Invalidate menu cache
    try {
      clearStorefrontMenuCache();
    } catch {}

    // 4. Update products state
    setProducts(prevProducts => {
      let found = false;
      const updatedList = prevProducts.map(p => {
        const matchesId = p.id === productId;
        const matchesName = normUpdatedName && p.name && p.name.toLowerCase().trim() === normUpdatedName;
        if (matchesId || matchesName) {
          found = true;
          return { ...p, ...sanitizedFields };
        }
        return p;
      });

      if (!found) {
        return [{ id: productId, ...sanitizedFields }, ...updatedList];
      }
      return updatedList;
    });

    // 4. Update cart items if variant prices or titles changed
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const matchingVariant = updatedFields.variants?.find(v => v.weight === item.variantWeight);
          return {
            ...item,
            name: updatedFields.name || item.name,
            image: updatedFields.image || item.image,
            price: matchingVariant ? matchingVariant.price : item.price
          };
        }
        return item;
      });
    });
  };

  // Reset product back to its defaults
  const resetProductOverride = (productId, productName = '') => {
    if (!isOwner) {
      console.warn('Unauthorized: Resetting product overrides is restricted to registered owners.');
      return;
    }
    try {
      const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
      if (raw) {
        const overrides = JSON.parse(raw);
        delete overrides[productId];
        if (productName) {
          delete overrides[productName.toLowerCase().trim()];
        }
        Object.keys(overrides).forEach(k => {
          if (overrides[k]?.id === productId) {
            delete overrides[k];
          }
        });
        localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
      }
    } catch (e) {
      console.error('Failed to reset product override', e);
    }

    try {
      clearStorefrontMenuCache();
    } catch {}

    setProducts(resolveInventoryItems(customInventory));
    window.dispatchEvent(new CustomEvent('trinetr-inventory-updated', { detail: { id: productId, productId, reset: true } }));
  };

  const value = {
    isOwner: Boolean(isOwner),
    storeInfo,
    cart,
    cartTotalCount,
    cartSubtotal,
    deliveryCharge,
    cartGrandTotal,
    cartDrawerOpen,
    setCartDrawerOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    wishlist,
    toggleWishlist,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    dietaryFilter,
    setDietaryFilter,
    generateWhatsAppOrderUrl,
    products,
    editingProduct,
    setEditingProduct: safeSetEditingProduct,
    selectedCurrency,
    currentCurrency,
    currencies: CURRENCIES,
    setCurrency,
    formatPrice,
    convertPrice,
    convertToInr,
    deliveryConfig,
    updateDeliveryConfig,
    deliveryModalOpen,
    setDeliveryModalOpen,
    openDeliveryModal,
    closeDeliveryModal,
    updateProduct,
    resetProductOverride,
    updateStoreProfile,
    fetchMenuItemsPaginated: async ({ page = 1, pageSize = 20, category = 'all', searchQuery = '' } = {}) => {
      try {
        const res = await fetchMenuItems({ page, pageSize, category });
        if (res && res.menuItems && res.menuItems.length > 0) {
          return res;
        }
      } catch {}

      let filtered = products;
      if (category && category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.categoryLabel || '').toLowerCase().includes(q));
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / pageSize) || (total > 0 ? 1 : 0);
      const from = Math.max(0, (page - 1) * pageSize);
      const to = from + pageSize;
      const slice = filtered.slice(from, to).map(item => ({
        id: item.id,
        title: item.name,
        name: item.name,
        price: item.variants?.[0]?.price ?? 100,
        image_url: item.image,
        image: item.image,
        category: item.category,
        categoryLabel: item.categoryLabel,
        description: item.description,
        variants: item.variants,
        isTopSeller: item.isTopSeller,
        isNotForJain: item.isNotForJain,
        isOutOfStock: item.isOutOfStock,
      }));

      return {
        menuItems: slice,
        count: total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    },
  };

  return (
    <StoreCartContext.Provider value={value}>
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const context = useContext(StoreCartContext);
  if (!context) {
    throw new Error('useStoreCart must be used within a StoreCartProvider');
  }
  return context;
}
