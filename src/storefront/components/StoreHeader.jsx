import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, Heart, Phone, Menu, X, ChevronDown, Sparkles, SlidersHorizontal, ArrowRight, Globe, Truck } from 'lucide-react';
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
  const { 
    storeInfo, 
    cartTotalCount, 
    cartSubtotal, 
    setCartDrawerOpen, 
    wishlist, 
    searchQuery, 
    setSearchQuery, 
    setActiveCategory, 
    dietaryFilter, 
    setDietaryFilter,
    currentCurrency,
    currencies,
    setCurrency,
    formatPrice,
    openDeliveryModal,
    deliveryConfig
  } = useStoreCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    setDeptDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate('shop');
  };

  return (
    <header className="trinetr-store-header">

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
            {/* Currency Selector Dropdown */}
            <div className="trinetr-currency-dropdown-wrap" ref={currencyRef}>
              <button
                type="button"
                className="trinetr-currency-btn"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                title="Change Currency (INR, USD, EUR, GBP)"
                aria-label="Select Currency"
              >
                <Globe size={16} className="trinetr-globe-icon" />
                <span className="trinetr-currency-flag">{currentCurrency.flag}</span>
                <span className="trinetr-currency-code">{currentCurrency.code} ({currentCurrency.symbol})</span>
                <ChevronDown size={13} className={`trinetr-currency-chevron ${currencyDropdownOpen ? 'open' : ''}`} />
              </button>

              {currencyDropdownOpen && (
                <div className="trinetr-currency-menu">
                  <div className="trinetr-currency-menu-title">Select Store Currency</div>
                  {Object.values(currencies).map(cur => (
                    <button
                      key={cur.code}
                      type="button"
                      className={`trinetr-currency-option ${cur.code === currentCurrency.code ? 'active' : ''}`}
                      onClick={() => {
                        setCurrency(cur.code);
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <span className="currency-flag-large">{cur.flag}</span>
                      <div className="currency-option-info">
                        <span className="currency-option-name">{cur.name}</span>
                        <span className="currency-option-rate">{cur.code} • {cur.symbol}</span>
                      </div>
                      {cur.code === currentCurrency.code && <span className="currency-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            {/* Delivery Partner Action */}
            <button 
              type="button" 
              className="trinetr-icon-action delivery-top-action"
              onClick={openDeliveryModal}
              title="Connect Delivery Partner App (Shiprocket, Borzo, Dunzo, Delhivery)"
              aria-label="Delivery Partner Setup"
            >
              <div className="trinetr-badge-wrapper">
                <Truck size={20} color="#0284c7" />
              </div>
              <span className="trinetr-action-text hide-on-mobile" style={{ color: '#0284c7', fontWeight: 700 }}>Delivery</span>
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
                <span className="trinetr-cart-amount">{formatPrice(cartSubtotal)}</span>
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
            <button 
              type="button" 
              className="trinetr-nav-link trinetr-delivery-highlight"
              onClick={() => { openDeliveryModal(); setMobileMenuOpen(false); }}
              title="Connect Delivery Partner (Shiprocket, Borzo, Dunzo)"
              style={{ color: '#0284c7', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Truck size={14} />
              <span>Delivery Partner</span>
            </button>
          </div>

          {/* Hotline & Business Switch Actions */}
          <div className="trinetr-sub-nav-actions">
            {/* Delivery Partner Setup Button */}
            <button
              type="button"
              onClick={openDeliveryModal}
              className="trinetr-delivery-partner-btn-nav"
              title="Connect Delivery Partner App (Shiprocket, Borzo, Dunzo, Delhivery)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: '750',
                cursor: 'pointer'
              }}
            >
              <Truck size={14} />
              <span>🚚 Delivery Partner Setup</span>
            </button>

            {/* Switch to Business ERP (Owner) */}
            {actualIsOwner && onSwitchToErp && (
              <button 
                type="button" 
                onClick={onSwitchToErp} 
                className="trinetr-erp-switch-btn-nav"
                title="Switch to Internal ERP & Business Manager"
              >
                <SlidersHorizontal size={14} />
                <span>Switch to Business ERP</span>
              </button>
            )}

            {/* Retailer Login Link (Customer) */}
            {!actualIsOwner && onSwitchToLogin && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="trinetr-retailer-login-btn-nav"
                title="Retailer or Business Owner? Login with GSTIN"
              >
                <span>Retailer Login (GST)</span>
              </button>
            )}

            {/* Hotline */}
            <div className="trinetr-hotline hide-on-tablet">
              <Phone size={14} className="trinetr-hotline-icon" />
              <span className="trinetr-hotline-label">Hotline:</span>
              <a href={`tel:${storeInfo.phone}`} className="trinetr-hotline-number">
                {storeInfo.phone}
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
