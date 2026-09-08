import React, { useState, useEffect } from 'react';
import { StoreCartProvider, useStoreCart } from './context/StoreCartContext';
import { StoreHeader } from './components/StoreHeader';
import { CategoryCarousel } from './components/CategoryCarousel';
import { ProductCard } from './components/ProductCard';
import { ProductListMenu } from './components/ProductListMenu';
import { ShopGrid } from './components/ShopGrid';
import { CategoriesView } from './components/CategoriesView';
import { ContactView } from './components/ContactView';
import { VideoReelSection } from './components/VideoReelSection';
import { CartDrawer } from './components/CartDrawer';
import { ProductEditModal } from './components/ProductEditModal';
import { StoreFooter } from './components/StoreFooter';
import { PRODUCTS, CATEGORIES, STORE_INFO } from './data/namkeenData';
import { Truck, Award, Headphones, Zap, ShoppingBag, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import './storefront.css';

function StorefrontContent({ initialTab = 'store', onSwitchToErp }) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const { setActiveCategory, setDietaryFilter, storeInfo, products } = useStoreCart();
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
    <div className="bhole-storefront-root">
      {/* Universal Storefront Header */}
      <StoreHeader
        currentTab={currentTab}
        onNavigate={(tab) => navigateTo(tab)}
        onSwitchToErp={onSwitchToErp}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Owner In-Place Product Editor Modal */}
      <ProductEditModal />

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
        <main className="bhole-home-content">
          {/* Circular Category Quick Carousel */}
          <CategoryCarousel onSelectCategory={(catId) => navigateTo('shop', catId)} />

          {/* Hero Promotional Banner */}
          <section className="bhole-hero-promo-banner">
            <div className="bhole-hero-promo-card">
              <div className="bhole-promo-accent-stamp">
                <span>{activeStore.tagline?.toUpperCase() || 'AUTHENTIC FRESH FOODS & SNACKS'}</span>
              </div>
              <h1 className="bhole-promo-heading">
                {activeStore.bannerOffer || 'FLAT 20% OFF'}
              </h1>
              <h3 className="bhole-promo-subheading">
                {activeStore.bannerRegion || "For All Gujarat and Mumbai City's Customers"}
              </h3>
              <p className="bhole-promo-detail">
                Freshly prepared with pure ingredients and hygienic packaging. Quick delivery to your home!
              </p>
              <button 
                type="button" 
                className="bhole-promo-order-btn"
                onClick={() => navigateTo('shop')}
              >
                <ShoppingBag size={20} />
                <span>ORDER NOW 🛒</span>
              </button>
            </div>
          </section>

          {/* Video Reels Showcase */}
          <VideoReelSection 
            onExploreMenu={() => navigateTo('product-menu')}
            onWatchVideos={() => navigateTo('shop')}
            storeName={activeStore.name}
          />

          {/* Section: Explore Best Sellers */}
          <section className="bhole-product-showcase-section">
            <div className="bhole-section-header">
              <div className="bhole-title-with-pill">
                <span className="pill-flair">Customer Favorites</span>
                <h2 className="bhole-section-title">Explore Best Sellers</h2>
              </div>
              <button
                type="button"
                className="bhole-view-all-btn"
                onClick={() => navigateTo('shop')}
              >
                <span>View All Products</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="bhole-products-carousel-grid">
              {bestSellers.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Section: Explore (NJ) Not For Jain */}
          <section className="bhole-product-showcase-section bhole-nj-highlight-section">
            <div className="bhole-section-header">
              <div className="bhole-title-with-pill">
                <span className="pill-flair pill-nj">Garlic & Onion Delicacies</span>
                <h2 className="bhole-section-title">Explore (NJ) Not For Jain</h2>
              </div>
              <p className="bhole-section-note">
                Handpicked special savory snacks containing potato, garlic, and rich spices.
              </p>
            </div>

            <div className="bhole-products-carousel-grid">
              {notForJainProducts.slice(0, 5).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* 4-Column USP Value Proposition Bar */}
          <section className="bhole-usp-value-bar">
            <div className="bhole-usp-grid">
              <div className="bhole-usp-item">
                <div className="usp-icon-wrap">
                  <Truck size={28} />
                </div>
                <div className="usp-text">
                  <h4>All India Home Delivery</h4>
                  <p>Cash On Delivery In Surat City</p>
                </div>
              </div>

              <div className="bhole-usp-item">
                <div className="usp-icon-wrap">
                  <Award size={28} />
                </div>
                <div className="usp-text">
                  <h4>More Variations</h4>
                  <p>140+ Authentic Snacks & Wafers</p>
                </div>
              </div>

              <div className="bhole-usp-item">
                <div className="usp-icon-wrap">
                  <Headphones size={28} />
                </div>
                <div className="usp-text">
                  <h4>Support 12/6</h4>
                  <p>Call 10:00 am to 9:00 pm</p>
                </div>
              </div>

              <div className="bhole-usp-item">
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
          <section className="bhole-product-showcase-section">
            <div className="bhole-section-header">
              <div className="bhole-title-with-pill">
                <span className="pill-flair">Fresh Batch</span>
                <h2 className="bhole-section-title">New Arrivals</h2>
              </div>
              <button
                type="button"
                className="bhole-view-all-btn"
                onClick={() => navigateTo('shop')}
              >
                <span>Browse Store</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="bhole-products-carousel-grid">
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Traditional Indian Mandala Brand Banner */}
          <section className="bhole-brand-mandala-banner">
            <div className="bhole-mandala-box">
              <div className="bhole-mandala-emblem">
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
          <section className="bhole-deep-category-section">
            <div className="bhole-section-header text-center">
              <h2 className="bhole-section-title">Shop By Category</h2>
              <p className="bhole-section-note">Browse through our vast spectrum of Gujarati snacks and namkeens</p>
            </div>

            {/* Category 1: Chana */}
            <div className="bhole-category-shelf">
              <div className="shelf-header">
                <h3>Chana Varieties</h3>
                <button type="button" onClick={() => navigateTo('shop', 'chana')}>View All ({CATEGORIES.find(c=>c.id==='chana')?.count})</button>
              </div>
              <div className="bhole-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'chana').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>

            {/* Category 2: Wafer */}
            <div className="bhole-category-shelf">
              <div className="shelf-header">
                <h3>Potato & Banana Wafers</h3>
                <button type="button" onClick={() => navigateTo('shop', 'wafer')}>View All ({CATEGORIES.find(c=>c.id==='wafer')?.count})</button>
              </div>
              <div className="bhole-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'wafer').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>

            {/* Category 3: Soya Sticks */}
            <div className="bhole-category-shelf">
              <div className="shelf-header">
                <h3>Crunchy Soya Sticks</h3>
                <button type="button" onClick={() => navigateTo('shop', 'soya-sticks')}>View All ({CATEGORIES.find(c=>c.id==='soya-sticks')?.count})</button>
              </div>
              <div className="bhole-products-carousel-grid">
                {PRODUCTS.filter(p => p.category === 'soya-sticks').slice(0, 4).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>

          {/* Brand Story Collage: "Foodies Welcome Here" */}
          <section className="bhole-story-collage-section">
            <div className="bhole-story-container">
              <div className="bhole-story-image-collage">
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

              <div className="bhole-story-text-content">
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
        </main>
      )}

      {/* Universal Storefront Footer */}
      <StoreFooter onNavigate={(tab) => navigateTo(tab)} />
    </div>
  );
}

export default function StorefrontHome(props) {
  return (
    <StoreCartProvider storeProfile={props.profile} customInventory={props.customInventory}>
      <StorefrontContent {...props} />
    </StoreCartProvider>
  );
}
