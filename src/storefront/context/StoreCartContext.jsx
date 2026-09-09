import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORE_INFO, PRODUCTS } from '../data/namkeenData';

const StoreCartContext = createContext(null);

const CART_STORAGE_KEY = 'trinetr_store_cart_v1';
const WISHLIST_STORAGE_KEY = 'trinetr_store_wishlist_v1';
const PRODUCT_OVERRIDES_KEY = 'storefront_product_overrides';

function applyProductOverrides(items) {
  let overrides = {};
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
    if (raw) overrides = JSON.parse(raw) || {};
  } catch {}

  return items.map(item => {
    if (overrides[item.id]) {
      return { ...item, ...overrides[item.id] };
    }
    return item;
  });
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

  const profileData = {
    ...STORE_INFO,
    ...localData,
    ...(customProfile || {})
  };

  // Ensure customized fields from local storage take precedence over default fallbacks
  if (localData?.bannerOffer) profileData.bannerOffer = localData.bannerOffer;
  if (localData?.bannerRegion) profileData.bannerRegion = localData.bannerRegion;
  if (localData?.bannerImage) profileData.bannerImage = localData.bannerImage;
  if (localData?.storeName) profileData.storeName = localData.storeName;
  if (localData?.storeTagline) profileData.storeTagline = localData.storeTagline;
  if (localData?.whatsapp) profileData.whatsapp = localData.whatsapp;
  if (localData?.phone) profileData.phone = localData.phone;
  if (localData?.address) profileData.address = localData.address;
  if (localData?.hours) profileData.hours = localData.hours;
  if (localData?.fssaiNumber) profileData.fssaiNumber = localData.fssaiNumber;

  const name = profileData?.storeName || profileData?.name || STORE_INFO.name || 'Jay Ambe Namkeen';
  const tagline = profileData?.storeTagline || profileData?.tagline || STORE_INFO.tagline;
  const phone = profileData?.phone || STORE_INFO.phone;
  const whatsapp = profileData?.whatsapp || profileData?.phone || STORE_INFO.whatsapp;
  const email = profileData?.email || STORE_INFO.email;
  const address = profileData?.address || STORE_INFO.address;
  const fssaiNumber = profileData?.fssaiNumber || profileData?.fssai || STORE_INFO.fssaiNumber;
  const hours = profileData?.hours || STORE_INFO.hours;
  const bannerOffer = profileData?.bannerOffer || 'FLAT 20% OFF';
  const bannerRegion = profileData?.bannerRegion || "For All Gujarat and Mumbai City's Customers";
  const bannerImage = profileData?.bannerImage || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80';

  return {
    ...STORE_INFO,
    name: (name && name !== 'Trinetr Business Suite') ? name : (STORE_INFO.name || 'Jay Ambe Namkeen'),
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
    logo: profileData?.logo || null
  };
}

function resolveInventoryItems(customInventoryProp) {
  let customItems = [];
  if (Array.isArray(customInventoryProp) && customInventoryProp.length > 0) {
    customItems = customInventoryProp;
  } else {
    try {
      const fromErp = localStorage.getItem('erpProducts');
      if (fromErp) {
        const parsed = JSON.parse(fromErp);
        if (Array.isArray(parsed) && parsed.length > 0) customItems = parsed;
      }
    } catch {}
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
      image: item.image || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
      isTopSeller: Boolean(item.isTopSeller),
      isNotForJain: Boolean(item.isNotForJain),
      isOutOfStock,
      rating: 4.9,
      reviewsCount: 32,
      variants: [
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
        setStoreInfo(resolveStoreInfo(storeProfile));
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

  // Sync inventory if customInventory prop updates or window emits inventory event
  useEffect(() => {
    setProducts(resolveInventoryItems(customInventory));
  }, [customInventory]);

  useEffect(() => {
    const handleInventoryChange = () => {
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

  // Shipping estimate: Free over 500, else 50
  const deliveryCharge = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    return cartSubtotal >= 500 ? 0 : 50;
  }, [cartSubtotal]);

  const cartGrandTotal = cartSubtotal + deliveryCharge;

  // Generate WhatsApp Order URL
  const generateWhatsAppOrderUrl = (customerDetails = {}) => {
    if (cart.length === 0) return '';

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
    text += `────────────────────\n`;
    text += `*ITEMS ORDERED:*\n`;

    cart.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      text += `${index + 1}. *${item.name}*\n   ├ Size: ${item.variantWeight}\n   ├ Qty: ${item.quantity} x ₹${item.price.toFixed(2)}\n   └ Subtotal: ₹${lineTotal.toFixed(2)}\n`;
    });

    text += `────────────────────\n`;
    text += `💰 *Items Subtotal:* ₹${cartSubtotal.toFixed(2)}\n`;
    text += `🚚 *Delivery Fee:* ${deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}\n`;
    text += `⭐ *GRAND TOTAL: ₹${cartGrandTotal.toFixed(2)}*\n`;
    text += `────────────────────\n`;
    text += `Please confirm my order and share estimated dispatch time. Thank you!`;

    const cleanPhone = String(storeInfo.whatsapp || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
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
    setProducts(prevProducts => {
      const updatedList = prevProducts.map(p => {
        if (p.id === productId) {
          return { ...p, ...updatedFields };
        }
        return p;
      });

      // 1. Save override in localStorage
      try {
        const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
        const overrides = raw ? JSON.parse(raw) : {};
        overrides[productId] = { ...(overrides[productId] || {}), ...updatedFields };
        localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
      } catch (e) {
        console.error('Failed to save product override', e);
      }

      // 2. Sync to erpProducts
      try {
        const fromErp = localStorage.getItem('erpProducts');
        let erpItems = fromErp ? JSON.parse(fromErp) : [];
        if (Array.isArray(erpItems)) {
          const idx = erpItems.findIndex(e => e.id === productId || (e.name && e.name.toLowerCase() === updatedFields.name?.toLowerCase()));
          if (idx >= 0) {
            erpItems[idx] = {
              ...erpItems[idx],
              name: updatedFields.name || erpItems[idx].name,
              category: updatedFields.categoryLabel || updatedFields.category || erpItems[idx].category,
              sellingPrice: updatedFields.variants?.[0]?.price ?? erpItems[idx].sellingPrice,
              image: updatedFields.image || erpItems[idx].image,
              details: updatedFields.description || erpItems[idx].details,
              isTopSeller: Boolean(updatedFields.isTopSeller),
              isNotForJain: Boolean(updatedFields.isNotForJain),
              unit: updatedFields.variants?.[0]?.weight || erpItems[idx].unit
            };
          } else {
            erpItems.push({
              id: productId,
              name: updatedFields.name,
              category: updatedFields.categoryLabel || updatedFields.category || 'Namkeen',
              sellingPrice: updatedFields.variants?.[0]?.price || 100,
              currentStock: updatedFields.isOutOfStock ? 0 : 50,
              image: updatedFields.image,
              details: updatedFields.description,
              isTopSeller: Boolean(updatedFields.isTopSeller),
              isNotForJain: Boolean(updatedFields.isNotForJain),
              unit: updatedFields.variants?.[0]?.weight || '250 GM'
            });
          }
          localStorage.setItem('erpProducts', JSON.stringify(erpItems));
        }
      } catch (e) {
        console.error('Failed to sync product to ERP', e);
      }

      // 3. Dispatch global sync event
      window.dispatchEvent(new CustomEvent('trinetr-inventory-updated', { detail: { productId, updatedFields } }));

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
  const resetProductOverride = (productId) => {
    if (!isOwner) {
      console.warn('Unauthorized: Resetting product overrides is restricted to registered owners.');
      return;
    }
    try {
      const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
      if (raw) {
        const overrides = JSON.parse(raw);
        delete overrides[productId];
        localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
      }
    } catch (e) {
      console.error('Failed to reset product override', e);
    }

    setProducts(resolveInventoryItems(customInventory));
    window.dispatchEvent(new CustomEvent('trinetr-inventory-updated', { detail: { productId, reset: true } }));
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
    updateProduct,
    resetProductOverride,
    updateStoreProfile
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
