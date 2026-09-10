import React, { useState, useEffect } from 'react';
import { StoreCartProvider, useStoreCart } from './context/StoreCartContext';
import { StoreHeader } from './components/StoreHeader';
import { CategoryCarousel } from './components/CategoryCarousel';
import { ProductCard } from './components/ProductCard';
import { ProductListMenu } from './components/ProductListMenu';
import { ShopGrid } from './components/ShopGrid';
import { CategoriesView } from './components/CategoriesView';
import { ContactView } from './components/ContactView';
import { CartDrawer } from './components/CartDrawer';
import { ProductEditModal } from './components/ProductEditModal';
import { DeliverySettingsModal } from './components/DeliverySettingsModal';
import { QualityTrustStrip } from './components/QualityTrustStrip';
import { CustomerReviewsSection } from './components/CustomerReviewsSection';
import { BannerEditModal } from './components/BannerEditModal';
import { StoreFooter } from './components/StoreFooter';
import { PRODUCTS, CATEGORIES, STORE_INFO } from './data/namkeenData';
import { Truck, Award, Headphones, Zap, ShoppingBag, ArrowRight, Sparkles, CheckCircle2, Edit3, Star, Camera } from 'lucide-react';
import './storefront.css';

function StorefrontContent(props) {
  const {
    initialTab = 'store',
    onSwitchToErp,
    onSwitchToLogin,
    isOwner = false,
    actualIsOwner = false,
    customerPreview = false,
    onToggleCustomerPreview,
    onUpdateProfile
  } = props;
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [homeDietaryFilter, setHomeDietaryFilter] = useState('all');
  const { 
    setActiveCategory, 
    setDietaryFilter, 
    storeInfo, 
    products, 
    cartTotalCount, 
    cartGrandTotal, 
    setCartDrawerOpen,
    formatPrice
  } = useStoreCart();
  const activeStore = storeInfo || STORE_INFO;
  const catalog = products && products.length > 0 ? products : PRODUCTS;

  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  const navigateTo = (tab, category = null, dietary = null) => {
    if (category) setActiveCategory(category);
    if (dietary) setDietaryFilter(dietary);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Best Sellers (marked as isTopSeller or first items)
  const bestSellers = catalog.filter(p => p.isTopSeller);

  // "NJ" Not For Jain items (garlic, onion, potato)
  const notForJainProducts = catalog.filter(p => p.isNotForJain);

  // New Arrivals (includes new custom ERP items)
  const newArrivals = catalog.filter(p => 
    p.id === 'prod-gotado-mix' || 
    p.id === 'prod-kumbhaniya-gathiya' || 
    p.id === 'prod-patra-gathiya' || 
    p.id === 'prod-cheese-ball' || 
    p.id === 'prod-vatka' ||
    String(p.id).startsWith('erp-') ||
    String(p.id).startsWith('prd-')
  );

  return (
    <div className="trinetr-storefront-root">
      {/* Universal Storefront Header */}
      <StoreHeader
        currentTab={currentTab}
        onNavigate={(tab) => navigateTo(tab)}
        onSwitchToErp={onSwitchToErp}
        onSwitchToLogin={onSwitchToLogin}
        isOwner={isOwner}
        actualIsOwner={actualIsOwner}
        customerPreview={customerPreview}
        onToggleCustomerPreview={onToggleCustomerPreview}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Owner In-Place Product Editor Modal (Strictly for Registered Owner) */}
      {isOwner && <ProductEditModal />}

      {/* Owner In-Place Banner Offer Editor Modal */}
      {isOwner && (
        <BannerEditModal 
          isOpen={isEditingBanner} 
          onClose={() => setIsEditingBanner(false)} 
          onUpdateProfile={onUpdateProfile} 
        />
      )}

      {/* Owner Delivery Partner Integration Modal */}
      {isOwner && (
        <DeliverySettingsModal
          isOpen={isEditingDelivery}
          onClose={() => setIsEditingDelivery(false)}
        />
      )}

      {/* Render Current Tab Page */}
      {currentTab === 'shop' && (
        <ShopGrid />
      )}

      {currentTab === 'product-menu' && (
        <ProductListMenu />
      )}

      {currentTab === 'categories' && (
        <CategoriesView onSelectCategory={(catId) => navigateTo('shop', catId)} />
      )}

      {currentTab === 'contact' && (
        <ContactView />
      )}

      {/* Default Tab: Homepage (as shown in modification.mp4) */}
      {currentTab === 'store' && (
        <main className="trinetr-home-content">
          {/* Circular Category Quick Carousel */}
          <CategoryCarousel onSelectCategory={(catId) => navigateTo('shop', catId)} />

          {/* 4-Pillar Quality & Authenticity Trust Strip */}
          <QualityTrustStrip />

          {/* Hero Promotional Banner - Modern D2C Split Showcase */}
          <section className="trinetr-hero-promo-banner">
            <div className="trinetr-hero-promo-card">
              {isOwner && (
                <div className="trinetr-owner-hero-actions">
                  <button
                    type="button"
                    className="trinetr-banner-edit-trigger"
                    onClick={() => setIsEditingBanner(true)}
                    title="Owner: Edit Hero Banner Headline & Offer"
                  >
                    <Edit3 size={14} />
                    <span>Edit Offer Banner</span>
                  </button>
                  <button
                    type="button"
                    className="trinetr-delivery-settings-trigger"
                    onClick={() => setIsEditingDelivery(true)}
                    title="Owner: Connect Delivery Partner (Shiprocket, Borzo, Dunzo)"
                  >
                    <Truck size={14} />
                    <span>Delivery App Connect</span>
                  </button>
                </div>
              )}
              
              <div className="trinetr-hero-split-grid">
                <div className="trinetr-hero-content-col">
                  <div className="trinetr-hero-live-badge">
                    <span className="live-dot"></span>
                    <span>🔥 Fresh Daily Batch • Traditional Surat Kitchen</span>
                  </div>
                  
                  <h1 className="trinetr-promo-heading">
                    {activeStore.bannerOffer || 'FLAT 40% OFF'}
                  </h1>
                  
                  <h3 className="trinetr-promo-subheading">
                    {activeStore.bannerRegion || "For All Gujarat and Mumbai City's Customers"}
                  </h3>
                  
                  <p className="trinetr-promo-detail">
                    Handcrafted authentic namkeens prepared daily in 100% pure double-filtered groundnut oil. Vacuum & nitrogen sealed to maintain peak crispness and authentic Gujarati aroma!
                  </p>

                  <div className="trinetr-hero-chips-row">
                    <span className="trinetr-hero-chip">🌿 100% Pure Singtel</span>
                    <span className="trinetr-hero-chip">🛡️ 90-Day Fresh Seal</span>
                    <span className="trinetr-hero-chip">⚡ 24hr Express Dispatch</span>
                  </div>

                  <div className="trinetr-hero-actions-row">
                    <button 
                      type="button" 
                      className="trinetr-promo-order-btn"
                      onClick={() => navigateTo('shop')}
                    >
                      <ShoppingBag size={20} />
                      <span>Explore Snacks & Order Now 🛒</span>
                    </button>
                    <button 
                      type="button" 
                      className="trinetr-promo-secondary-btn"
                      onClick={() => navigateTo('product-menu')}
                    >
                      <span>View Price List 📋</span>
                    </button>
                  </div>
                </div>

                <div className="trinetr-hero-visual-col">
                  <div className="trinetr-hero-snack-card">
                    <img 
                      src={activeStore.bannerImage || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80'} 
                      alt="Fresh Kathiyawadi Namkeen" 
                      className="trinetr-hero-snack-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80';
                      }}
                    />
                    {isOwner && (
                      <button
                        type="button"
                        className="trinetr-banner-img-edit-btn"
                        onClick={() => setIsEditingBanner(true)}
                        title="Owner: Change Banner Photo"
                      >
                        <Camera size={13} />
                        <span>Change Photo</span>
                      </button>
                    )}
                    <div className="trinetr-hero-glass-pill">
                      <Star size={16} fill="#f59e0b" color="#f59e0b" />
                      <div className="pill-text">
                        <strong>4.9 / 5 Rating</strong>
                        <span>2,400+ Happy Snack Lovers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Explore Best Sellers */}
          <section className="trinetr-product-showcase-section">
            <div className="trinetr-section-header">
              <div className="trinetr-title-with-pill">
                <span className="pill-flair">Customer Favorites</span>
                <h2 className="trinetr-section-title">Explore Best Sellers</h2>
              </div>
              <button
                type="button"
                className="trinetr-view-all-btn"
                onClick={() => navigateTo('shop')}
              >
                <span>View All Products</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Quick Dietary Taste Filters */}
            <div className="trinetr-dietary-pills-row">
              <button
                type="button"
                className={`trinetr-filter-pill ${homeDietaryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setHomeDietaryFilter('all')}
              >
                🌟 All Bestsellers
              </button>
              <button
                type="button"
                className={`trinetr-filter-pill ${homeDietaryFilter === 'jain' ? 'active' : ''}`}
                onClick={() => setHomeDietaryFilter('jain')}
              >
                🌱 100% Jain Friendly
              </button>
              <button
                type="button"
                className={`trinetr-filter-pill ${homeDietaryFilter === 'kathor' ? 'active' : ''}`}
                onClick={() => setHomeDietaryFilter('kathor')}
              >
                💪 Roasted Kathor
              </button>
              <button
                type="button"
                className={`trinetr-filter-pill ${homeDietaryFilter === 'combo' ? 'active' : ''}`}
                onClick={() => setHomeDietaryFilter('combo')}
              >
                🎁 Special Combos
              </button>
            </div>

            <div className="trinetr-products-carousel-grid">
              {bestSellers
                .filter(p => {
                  if (homeDietaryFilter === 'jain') return !p.isNotForJain;
                  if (homeDietaryFilter === 'combo') return p.category === 'mix-namkeen';
                  if (homeDietaryFilter === 'kathor') return p.category === 'kathor' || p.category === 'dana';
                  return true;
                })
                .map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </section>

          {/* Section: Explore (NJ) Not For Jain */}
          <section className="trinetr-product-showcase-section trinetr-nj-highlight-section">
            <div className="trinetr-section-header">
              <div className="trinetr-title-with-pill">
                <span className="pill-flair pill-nj">Garlic & Onion Delicacies</span>
                <h2 className="trinetr-section-title">Explore (NJ) Not For Jain</h2>
              </div>
              <p className="trinetr-section-note">
                Handpicked special savory snacks containing potato, garlic, and rich spices.
              </p>
            </div>

            <div className="trinetr-products-carousel-grid">
              {notForJainProducts.slice(0, 5).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* 4-Column USP Value Proposition Bar */}
          <section className="trinetr-usp-value-bar">
            <div className="trinetr-usp-grid">
              <div className="trinetr-usp-item">
                <div className="usp-icon-wrap">
                  <Truck size={28} />
                </div>
                <div className="usp-text">
                  <h4>All India Home Delivery</h4>
                  <p>Cash On Delivery In Surat City</p>
                </div>
              </div>

              <div className="trinetr-usp-item">
                <div className="usp-icon-wrap">
                  <Award size={28} />
                </div>
                <div className="usp-text">
                  <h4>More Variations</h4>
                  <p>140+ Authentic Snacks & Wafers</p>
                </div>
              </div>

              <div className="trinetr-usp-item">
                <div className="usp-icon-wrap">
                  <Headphones size={28} />
                </div>
                <div className="usp-text">
                  <h4>Support 12/6</h4>
                  <p>Call 10:00 am to 9:00 pm</p>
                </div>
              </div>

              <div className="trinetr-usp-item">
                <div className="usp-icon-wrap">
                  <Zap size={28} />
                </div>
                <div className="usp-text">
                  <h4>Fast Dispatch</h4>
                  <p>Dispatched within 24 Hours</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: New Arrivals */}
          <section className="trinetr-product-showcase-section">
            <div className="trinetr-section-header">
              <div className="trinetr-title-with-pill">
                <span className="pill-flair">Fresh Batch</span>
                <h2 className="trinetr-section-title">New Arrivals</h2>
              </div>
              <button
                type="button"
                className="trinetr-view-all-btn"
                onClick={() => navigateTo('shop')}
              >
                <span>Browse Store</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="trinetr-products-carousel-grid">
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Traditional Indian Mandala Brand Banner */}
          <section className="trinetr-brand-mandala-banner">
            <div className="trinetr-mandala-box">
              <div className="trinetr-mandala-emblem">
                <h3>{activeStore.name.toUpperCase()}</h3>
                <p className="timing-notice">{activeStore.hours ? activeStore.hours.toUpperCase() : 'OPEN AT 10:30 AM EVERY DAY'}</p>
                <p className="address-line">{activeStore.address}</p>
                <div className="brand-social-handles">
                  <span>FOLLOW US:</span>
                  <span>{activeStore.email}</span>
                  <span>{activeStore.instagram}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Shop By Category Deep Highlights */}
          <section className="trinetr-deep-category-section">
            <div className="trinetr-section-header text-center">
              <h2 className="trinetr-section-title">Shop By Category</h2>
              <p className="trinetr-section-note">Browse through our vast spectrum of Gujarati snacks and namkeens</p>
            </div>

            {/* Category 1: Chana */}
            <div className="trinetr-category-shelf">
              <div className="shelf-header">
                <h3>Chana Varieties</h3>
                <button type="button" onClick={() => navigateTo('shop', 'chana')}>View All ({CATEGORIES.find(c=>c.id==='chana')?.count})</button>
              </div>
              <div className="trinetr-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'chana').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>

            {/* Category 2: Wafer */}
            <div className="trinetr-category-shelf">
              <div className="shelf-header">
                <h3>Potato & Banana Wafers</h3>
                <button type="button" onClick={() => navigateTo('shop', 'wafer')}>View All ({CATEGORIES.find(c=>c.id==='wafer')?.count})</button>
              </div>
              <div className="trinetr-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'wafer').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>

            {/* Category 3: Soya Sticks */}
            <div className="trinetr-category-shelf">
              <div className="shelf-header">
                <h3>Crunchy Soya Sticks</h3>
                <button type="button" onClick={() => navigateTo('shop', 'soya-sticks')}>View All ({CATEGORIES.find(c=>c.id==='soya-sticks')?.count})</button>
              </div>
              <div className="trinetr-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'soya-sticks').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>

          {/* Brand Story Collage: "Foodies Welcome Here" */}
          <section className="trinetr-story-collage-section">
            <div className="trinetr-story-container">
              <div className="trinetr-story-image-collage">
                <div className="collage-col">
                  <img src="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop&q=80" alt="Namkeen Store" className="collage-img main" />
                </div>
                <div className="collage-col">
                  <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80" alt="Fresh Gathiya" className="collage-img" />
                  <div className="story-stat-card">
                    <span className="stat-num">{activeStore.varietiesCount || '100+'}</span>
                    <span className="stat-lbl">Plus Varieties</span>
                  </div>
                </div>
              </div>

              <div className="trinetr-story-text-content">
                <span className="story-badge">Our Heritage</span>
                <h3 className="story-title">"Foodies Welcome Here" — Explore Your Hunger with {activeStore.name}</h3>
                <p className="story-body">
                  Established in {activeStore.establishedYear || '1992'}, {activeStore.name} has become a trusted destination
                  for authentic snacks, quality foods, and regional delicacies. We craft every product with premium ingredients and consistent taste.
                </p>
                <p className="story-body">
                  What started as a dedicated local store has now grown into a loved brand serving thousands of happy families
                  with fresh orders delivered directly.
                </p>

                <div className="story-checklist">
                  <div className="check-item">
                    <CheckCircle2 size={18} className="text-amber" />
                    <span>Pure Groundnut Oil & Fresh Ingredients</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={18} className="text-amber" />
                    <span>Hygienic Packaging in Sealed Food-Grade Pouches</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={18} className="text-amber" />
                    <span>FSSAI Certified Standards</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Verified Customer Feedback Section */}
          <CustomerReviewsSection />
        </main>
      )}

      {/* Mobile Floating Sticky Cart Bar */}
      {cartTotalCount > 0 && (
        <aside className="trinetr-mobile-cart-float" aria-label="Mobile Cart Quick Checkout">
          <div className="trinetr-mobile-cart-info">
            <span className="trinetr-mobile-cart-count">{cartTotalCount} {cartTotalCount === 1 ? 'Item' : 'Items'} in Cart</span>
            <span className="trinetr-mobile-cart-total">{formatPrice(cartGrandTotal)}</span>
          </div>
          <button 
            type="button" 
            className="trinetr-mobile-cart-btn"
            onClick={() => setCartDrawerOpen(true)}
          >
            <span>View Cart & Order 🛒</span>
          </button>
        </aside>
      )}

      {/* Universal Storefront Footer */}
      <StoreFooter onNavigate={(tab) => navigateTo(tab)} />
    </div>
  );
}

export default function StorefrontHome(props) {
  const [customerPreview, setCustomerPreview] = useState(false);
  const effectiveIsOwner = Boolean(props.isOwner && !customerPreview);

  return (
    <StoreCartProvider
      storeProfile={props.profile}
      customInventory={props.customInventory}
      isOwner={effectiveIsOwner}
    >
      <StorefrontContent
        {...props}
        isOwner={effectiveIsOwner}
        actualIsOwner={Boolean(props.isOwner)}
        customerPreview={customerPreview}
        onToggleCustomerPreview={() => setCustomerPreview(prev => !prev)}
      />
    </StoreCartProvider>
  );
}
