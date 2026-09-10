import React, { useState, useMemo } from 'react';
import { LayoutGrid, List, SlidersHorizontal, ArrowUpDown, X, Filter } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';
import { CATEGORIES } from '../data/namkeenData';
import { ProductCard } from './ProductCard';

export function ShopGrid() {
  const { products, activeCategory, setActiveCategory, searchQuery, setSearchQuery, dietaryFilter, setDietaryFilter, wishlist, formatPrice } = useStoreCart();

  // Layout state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter states
  const [maxPrice, setMaxPrice] = useState(500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default', 'price-asc', 'price-desc', 'rating'

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    let result = products.filter(item => {
      // Wishlist filter
      if (dietaryFilter === 'wishlist' && !wishlist.includes(item.id)) {
        return false;
      }
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.categoryLabel.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      // In stock filter
      if (inStockOnly && item.isOutOfStock) {
        return false;
      }
      // Dietary filter
      if (dietaryFilter === 'jain' && item.isNotForJain) {
        return false;
      }
      if (dietaryFilter === 'nj' && !item.isNotForJain) {
        return false;
      }
      // Price filter (based on minimum variant price)
      const minPrice = Math.min(...item.variants.map(v => v.price));
      if (minPrice > maxPrice) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.variants[0].price - b.variants[0].price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.variants[0].price - a.variants[0].price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'top') {
      result.sort((a, b) => (b.isTopSeller ? 1 : 0) - (a.isTopSeller ? 1 : 0));
    }

    return result;
  }, [products, activeCategory, searchQuery, inStockOnly, dietaryFilter, maxPrice, sortBy, wishlist]);

  return (
    <div className="trinetr-shop-page-wrapper">
      {/* Breadcrumb / Title Bar */}
      <div className="trinetr-shop-header-banner">
        <h2 className="trinetr-shop-title">Shop Grid</h2>
        <div className="trinetr-breadcrumbs">
          <span>Home</span> &gt; <span>Shop Grid</span>
        </div>
      </div>

      <div className="trinetr-shop-layout">
        {/* Mobile Filter Trigger Button */}
        <div className="trinetr-mobile-filter-bar hide-on-desktop">
          <button
            type="button"
            className="trinetr-mobile-filter-btn"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            <SlidersHorizontal size={16} />
            <span>Filter Products</span>
          </button>
          <span className="trinetr-results-count-mobile">{filteredProducts.length} items</span>
        </div>

        {/* Sidebar Filters */}
        <aside className={`trinetr-shop-sidebar ${mobileFilterOpen ? 'mobile-open' : ''}`}>
          <div className="trinetr-sidebar-header hide-on-desktop">
            <h3>Filters</h3>
            <button 
              type="button" 
              onClick={() => setMobileFilterOpen(false)}
              className="trinetr-close-filter-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Price Filter Widget */}
          <div className="trinetr-filter-widget">
            <h4 className="trinetr-filter-widget-title">Price Filter</h4>
            <div className="trinetr-price-slider-wrap">
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="trinetr-range-slider"
              />
              <div className="trinetr-slider-values">
                <span>Range: {formatPrice(50)} - {formatPrice(maxPrice)}</span>
              </div>
            </div>
          </div>

          {/* Product Availability Status */}
          <div className="trinetr-filter-widget">
            <h4 className="trinetr-filter-widget-title">Product Status</h4>
            <label className="trinetr-filter-checkbox-label">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>

          {/* Dietary Segregation Filter ("Not For Jain") */}
          <div className="trinetr-filter-widget">
            <h4 className="trinetr-filter-widget-title">Dietary Filter</h4>
            <div className="trinetr-radio-group">
              <label className="trinetr-filter-radio-label">
                <input
                  type="radio"
                  name="dietary"
                  value="all"
                  checked={dietaryFilter === 'all'}
                  onChange={() => setDietaryFilter('all')}
                />
                <span>All Products</span>
              </label>
              <label className="trinetr-filter-radio-label">
                <input
                  type="radio"
                  name="dietary"
                  value="jain"
                  checked={dietaryFilter === 'jain'}
                  onChange={() => setDietaryFilter('jain')}
                />
                <span>Jain Friendly Only</span>
              </label>
              <label className="trinetr-filter-radio-label highlight-nj">
                <input
                  type="radio"
                  name="dietary"
                  value="nj"
                  checked={dietaryFilter === 'nj'}
                  onChange={() => setDietaryFilter('nj')}
                />
                <span>Explore (NJ) Not For Jain</span>
              </label>
            </div>
          </div>

          {/* Categories List with live counts */}
          <div className="trinetr-filter-widget">
            <h4 className="trinetr-filter-widget-title">Categories</h4>
            <div className="trinetr-category-filter-list">
              <button
                type="button"
                className={`trinetr-cat-filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => { setActiveCategory('all'); setMobileFilterOpen(false); }}
              >
                <span>All Categories</span>
                <span className="trinetr-count">{products.length}</span>
              </button>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                const count = products.filter(p => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`trinetr-cat-filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => { setActiveCategory(cat.id); setMobileFilterOpen(false); }}
                  >
                    <span>{cat.name}</span>
                    <span className="trinetr-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="trinetr-shop-main">
          {/* Top Bar with count, layout switch, and sort */}
          <div className="trinetr-shop-toolbar">
            <div className="trinetr-toolbar-left">
              <span className="trinetr-results-text">
                Showing 1-{filteredProducts.length} of {products.length} results
              </span>
            </div>

            <div className="trinetr-toolbar-right">
              {/* Layout Switcher */}
              <div className="trinetr-view-switcher">
                <button
                  type="button"
                  className={`trinetr-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  type="button"
                  className={`trinetr-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List View"
                >
                  <List size={18} />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="trinetr-sort-wrapper">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="trinetr-sort-select"
                >
                  <option value="default">Default Sorting</option>
                  <option value="top">Best Sellers</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {(activeCategory !== 'all' || dietaryFilter !== 'all' || searchQuery) && (
            <div className="trinetr-active-filters-row">
              <span className="label">Active Filters:</span>
              {activeCategory !== 'all' && (
                <button 
                  type="button" 
                  className="trinetr-active-filter-chip"
                  onClick={() => setActiveCategory('all')}
                >
                  <span>Category: {activeCategory}</span>
                  <X size={12} />
                </button>
              )}
              {dietaryFilter !== 'all' && (
                <button 
                  type="button" 
                  className="trinetr-active-filter-chip"
                  onClick={() => setDietaryFilter('all')}
                >
                  <span>{dietaryFilter === 'wishlist' ? '❤️ Wishlist Only' : dietaryFilter === 'nj' ? 'Not For Jain (NJ)' : 'Jain Friendly'}</span>
                  <X size={12} />
                </button>
              )}
              {searchQuery && (
                <button 
                  type="button" 
                  className="trinetr-active-filter-chip"
                  onClick={() => setSearchQuery('')}
                >
                  <span>Query: "{searchQuery}"</span>
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Products Grid / List */}
          {filteredProducts.length === 0 ? (
            <div className="trinetr-no-results-box">
              <h3>{dietaryFilter === 'wishlist' ? 'Your Wishlist is Empty' : 'No products found'}</h3>
              <p>{dietaryFilter === 'wishlist' ? 'Explore our fresh snacks and click the heart icon on any product to save it here.' : 'Try resetting the price filter or selecting another category.'}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveCategory('all');
                  setDietaryFilter('all');
                  setMaxPrice(500);
                  setInStockOnly(false);
                  setSearchQuery('');
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={`trinetr-products-grid ${viewMode === 'list' ? 'list-mode' : ''}`}>
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
