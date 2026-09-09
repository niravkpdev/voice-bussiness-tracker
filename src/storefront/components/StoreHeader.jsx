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
    <header className="trinetr-store-header">
      {/* Top Announcement Bar */}
      <div className="trinetr-top-bar">
        <div className="trinetr-top-bar-inner">
          <div className="trinetr-announcement">
            <span className="badge-promo-pill">Notice</span>
            <span>⚡ Express Shipping On All Orders Across Gujarat & India!</span>
          </div>

          <div className="trinetr-top-bar-actions">
            {/* Owner Controls: Only shown to registered business owners */}
            {actualIsOwner && (
              <>
                <span className={`trinetr-owner-mode-badge ${customerPreview ? 'preview-mode' : 'active-mode'}`}>
                  {customerPreview ? '👁️ Customer Preview Mode' : '👑 Owner Mode (Edit Enabled)'}
                </span>
                {onToggleCustomerPreview && (
                  <button
                    type="button"
                    onClick={onToggleCustomerPreview}
                    className="trinetr-preview-toggle-btn"
                    title={customerPreview ? "Exit preview and enable editing" : "Preview store exactly as customers see it"}
                  >
                    {customerPreview ? 'Exit Preview' : 'Preview as Customer'}
                  </button>
                )}
                {onSwitchToErp && (
                  <button 
                    type="button" 
                    onClick={onSwitchToErp} 
                    className="trinetr-erp-switch-btn"
                    title="Switch to Internal ERP & Business Manager"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Switch to Business ERP</span>
                  </button>
                )}
                <span className="trinetr-top-divider">|</span>
              </>
            )}

            {/* Customer Side: Retailer Login link for store owners wanting to log in */}
            {!actualIsOwner && onSwitchToLogin && (
              <>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="trinetr-retailer-login-link"
                  title="Retailer or Business Owner? Login with GSTIN"
                >
                  Retailer Login (GST)
                </button>
                <span className="trinetr-top-divider">|</span>
              </>
            )}

            <a href={`tel:${storeInfo?.phone || ''}`} className="trinetr-top-link">
              <Phone size={12} />
              <span>{storeInfo?.phone || ''}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header with Logo, Search, and Cart */}
      <div className="trinetr-main-nav">
        <div className="trinetr-main-nav-inner">
          {/* Mobile Menu Toggle */}
          <button 
            type="button" 
            className="trinetr-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Brand Logo */}
          <div className="trinetr-logo-wrapper" onClick={() => onNavigate('store')}>
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div className="trinetr-logo-emblem">
                <span className="trinetr-logo-accent">{(storeInfo?.name || 'J')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="trinetr-logo-text">
              <span className="trinetr-brand-title">{storeInfo?.name?.toUpperCase()}</span>
              <span className="trinetr-brand-sub">{storeInfo?.tagline?.toUpperCase() || 'NAMKEEN & WAFERS'}</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="trinetr-search-bar">
            <div className="trinetr-search-input-wrap">
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
                className="trinetr-search-submit"
                onClick={() => onNavigate('shop')}
                aria-label="Submit search"
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Header Action Items */}
          <div className="trinetr-nav-actions">
            {/* Wishlist */}
            <button 
              type="button" 
              className="trinetr-icon-action"
              onClick={() => {
                setDietaryFilter(dietaryFilter === 'wishlist' ? 'all' : 'wishlist');
                onNavigate('shop');
              }}
              title={dietaryFilter === 'wishlist' ? 'View All Products' : 'View Wishlist Items'}
            >
              <div className="trinetr-badge-wrapper">
                <Heart size={22} fill={dietaryFilter === 'wishlist' ? '#e11d48' : 'none'} color={dietaryFilter === 'wishlist' ? '#e11d48' : 'currentColor'} />
                {wishlist.length > 0 && <span className="trinetr-badge">{wishlist.length}</span>}
              </div>
              <span className="trinetr-action-text hide-on-mobile">Wishlist</span>
            </button>

            {/* Cart Drawer Trigger */}
            <button 
              type="button" 
              className="trinetr-cart-action-btn"
              onClick={() => setCartDrawerOpen(true)}
              aria-label="Shopping Cart"
            >
              <div className="trinetr-cart-icon-box">
                <ShoppingBag size={20} />
                {cartTotalCount > 0 && <span className="trinetr-badge">{cartTotalCount}</span>}
              </div>
              <div className="trinetr-cart-details hide-on-mobile">
                <span className="trinetr-cart-label">My Cart</span>
                <span className="trinetr-cart-amount">₹{cartSubtotal.toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Menu Bar */}
      <nav className="trinetr-sub-nav">
        <div className="trinetr-sub-nav-inner">
          {/* Departments Dropdown */}
          <div className="trinetr-dept-menu-container">
            <button 
              type="button" 
              className="trinetr-dept-button"
              onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
            >
              <Menu size={16} />
              <span>All Departments</span>
              <ChevronDown size={14} className={`trinetr-chevron ${deptDropdownOpen ? 'open' : ''}`} />
            </button>

            {deptDropdownOpen && (
              <div className="trinetr-dept-dropdown">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className="trinetr-dept-item"
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    <span>{cat.name}</span>
                    <span className="trinetr-dept-count">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Links */}
          <div className={`trinetr-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button 
              type="button" 
              className={`trinetr-nav-link ${currentTab === 'store' ? 'active' : ''}`}
              onClick={() => { onNavigate('store'); setMobileMenuOpen(false); }}
            >
              Home
            </button>
            <button 
              type="button" 
              className={`trinetr-nav-link ${currentTab === 'categories' ? 'active' : ''}`}
              onClick={() => { onNavigate('categories'); setMobileMenuOpen(false); }}
            >
              Category
            </button>
            <button 
              type="button" 
              className={`trinetr-nav-link ${currentTab === 'shop' ? 'active' : ''}`}
              onClick={() => { onNavigate('shop'); setMobileMenuOpen(false); }}
            >
              Products
            </button>
            <button 
              type="button" 
              className={`trinetr-nav-link trinetr-menu-highlight ${currentTab === 'product-menu' ? 'active' : ''}`}
              onClick={() => { onNavigate('product-menu'); setMobileMenuOpen(false); }}
            >
              <Sparkles size={14} className="sparkle-icon" />
              Product List Menu
            </button>
            <button 
              type="button" 
              className={`trinetr-nav-link ${currentTab === 'contact' ? 'active' : ''}`}
              onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
            >
              Contact
            </button>
          </div>

          {/* Hotline */}
          <div className="trinetr-hotline hide-on-tablet">
            <span className="trinetr-hotline-label">Hotline:</span>
            <a href={`tel:${storeInfo.phone}`} className="trinetr-hotline-number">
              {storeInfo.phone}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
