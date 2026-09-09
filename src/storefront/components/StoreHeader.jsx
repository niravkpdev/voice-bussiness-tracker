import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, Phone, Menu, X, ChevronDown, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';
import { CATEGORIES } from '../data/namkeenData';

export function StoreHeader({
  currentTab,
  onNavigate,
  onSwitchToErp,
  onSwitchToLogin,
  isOwner = false,
  actualIsOwner = false,
  customerPreview = false,
  onToggleCustomerPreview
}) {
  const { storeInfo, cartTotalCount, cartSubtotal, setCartDrawerOpen, wishlist, searchQuery, setSearchQuery, setActiveCategory, dietaryFilter, setDietaryFilter } = useStoreCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    setDeptDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate('shop');
  };

  return (
    <header className="bhole-store-header">
      {/* Top Announcement Bar */}
      <div className="bhole-top-bar">
        <div className="bhole-top-bar-inner">
          <div className="bhole-announcement">
            <span className="badge-promo-pill">Notice</span>
            <span>⚡ Express Shipping On All Orders Across Gujarat & India!</span>
          </div>

          <div className="bhole-top-bar-actions">
            {/* Owner Controls: Only shown to registered business owners */}
            {actualIsOwner && (
              <>
                <span className={`bhole-owner-mode-badge ${customerPreview ? 'preview-mode' : 'active-mode'}`}>
                  {customerPreview ? '👁️ Customer Preview Mode' : '👑 Owner Mode (Edit Enabled)'}
                </span>
                {onToggleCustomerPreview && (
                  <button
                    type="button"
                    onClick={onToggleCustomerPreview}
                    className="bhole-preview-toggle-btn"
                    title={customerPreview ? "Exit preview and enable editing" : "Preview store exactly as customers see it"}
                  >
                    {customerPreview ? 'Exit Preview' : 'Preview as Customer'}
                  </button>
                )}
                {onSwitchToErp && (
                  <button 
                    type="button" 
                    onClick={onSwitchToErp} 
                    className="bhole-erp-switch-btn"
                    title="Switch to Internal ERP & Business Manager"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Switch to Business ERP</span>
                  </button>
                )}
                <span className="bhole-top-divider">|</span>
              </>
            )}

            {/* Customer Side: Retailer Login link for store owners wanting to log in */}
            {!actualIsOwner && onSwitchToLogin && (
              <>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="bhole-retailer-login-link"
                  title="Retailer or Business Owner? Login with GSTIN"
                >
                  Retailer Login (GST)
                </button>
                <span className="bhole-top-divider">|</span>
              </>
            )}

            <a href={`tel:${storeInfo?.phone || ''}`} className="bhole-top-link">
              <Phone size={12} />
              <span>{storeInfo?.phone || ''}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header with Logo, Search, and Cart */}
      <div className="bhole-main-nav">
        <div className="bhole-main-nav-inner">
          {/* Mobile Menu Toggle */}
          <button 
            type="button" 
            className="bhole-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Brand Logo */}
          <div className="bhole-logo-wrapper" onClick={() => onNavigate('store')}>
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div className="bhole-logo-emblem">
                <span className="bhole-logo-accent">{(storeInfo?.name || 'J')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="bhole-logo-text">
              <span className="bhole-brand-title">{storeInfo?.name?.toUpperCase()}</span>
              <span className="bhole-brand-sub">{storeInfo?.tagline?.toUpperCase() || 'NAMKEEN & WAFERS'}</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="bhole-search-bar">
            <div className="bhole-search-input-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigate('shop');
                  }
                }}
                placeholder="Search fresh gathiya, wafers, chana, fafda..."
                aria-label="Search products"
              />
              <button 
                type="button" 
                className="bhole-search-submit"
                onClick={() => onNavigate('shop')}
                aria-label="Submit search"
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Header Action Items */}
          <div className="bhole-nav-actions">
            {/* Wishlist */}
            <button 
              type="button" 
              className="bhole-icon-action"
              onClick={() => {
                setDietaryFilter(dietaryFilter === 'wishlist' ? 'all' : 'wishlist');
                onNavigate('shop');
              }}
              title={dietaryFilter === 'wishlist' ? 'View All Products' : 'View Wishlist Items'}
            >
              <div className="bhole-badge-wrapper">
                <Heart size={22} fill={dietaryFilter === 'wishlist' ? '#e11d48' : 'none'} color={dietaryFilter === 'wishlist' ? '#e11d48' : 'currentColor'} />
                {wishlist.length > 0 && <span className="bhole-badge">{wishlist.length}</span>}
              </div>
              <span className="bhole-action-text hide-on-mobile">Wishlist</span>
            </button>

            {/* Cart Drawer Trigger */}
            <button 
              type="button" 
              className="bhole-cart-action-btn"
              onClick={() => setCartDrawerOpen(true)}
              aria-label="Shopping Cart"
            >
              <div className="bhole-cart-icon-box">
                <ShoppingBag size={20} />
                {cartTotalCount > 0 && <span className="bhole-badge">{cartTotalCount}</span>}
              </div>
              <div className="bhole-cart-details hide-on-mobile">
                <span className="bhole-cart-label">My Cart</span>
                <span className="bhole-cart-amount">₹{cartSubtotal.toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Menu Bar */}
      <nav className="bhole-sub-nav">
        <div className="bhole-sub-nav-inner">
          {/* Departments Dropdown */}
          <div className="bhole-dept-menu-container">
            <button 
              type="button" 
              className="bhole-dept-button"
              onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
            >
              <Menu size={16} />
              <span>All Departments</span>
              <ChevronDown size={14} className={`bhole-chevron ${deptDropdownOpen ? 'open' : ''}`} />
            </button>

            {deptDropdownOpen && (
              <div className="bhole-dept-dropdown">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className="bhole-dept-item"
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    <span>{cat.name}</span>
                    <span className="bhole-dept-count">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Links */}
          <div className={`bhole-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button 
              type="button" 
              className={`bhole-nav-link ${currentTab === 'store' ? 'active' : ''}`}
              onClick={() => { onNavigate('store'); setMobileMenuOpen(false); }}
            >
              Home
            </button>
            <button 
              type="button" 
              className={`bhole-nav-link ${currentTab === 'categories' ? 'active' : ''}`}
              onClick={() => { onNavigate('categories'); setMobileMenuOpen(false); }}
            >
              Category
            </button>
            <button 
              type="button" 
              className={`bhole-nav-link ${currentTab === 'shop' ? 'active' : ''}`}
              onClick={() => { onNavigate('shop'); setMobileMenuOpen(false); }}
            >
              Products
            </button>
            <button 
              type="button" 
              className={`bhole-nav-link bhole-menu-highlight ${currentTab === 'product-menu' ? 'active' : ''}`}
              onClick={() => { onNavigate('product-menu'); setMobileMenuOpen(false); }}
            >
              <Sparkles size={14} className="sparkle-icon" />
              Product List Menu
            </button>
            <button 
              type="button" 
              className={`bhole-nav-link ${currentTab === 'contact' ? 'active' : ''}`}
              onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
            >
              Contact
            </button>
          </div>

          {/* Hotline */}
          <div className="bhole-hotline hide-on-tablet">
            <span className="bhole-hotline-label">Hotline:</span>
            <a href={`tel:${storeInfo.phone}`} className="bhole-hotline-number">
              {storeInfo.phone}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
