import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { STORE_INFO, PRODUCTS } from '../data/namkeenData';

const StoreCartContext = createContext(null);

const CART_STORAGE_KEY = 'bhole_g_store_cart_v1';
const WISHLIST_STORAGE_KEY = 'bhole_g_store_wishlist_v1';

export function StoreCartProvider({ children }) {
  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist state
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
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

    let text = `🛍️ *NEW ORDER - ${STORE_INFO.name.toUpperCase()}*\n`;
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

    const cleanPhone = STORE_INFO.whatsapp.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const value = {
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
    products: PRODUCTS
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
