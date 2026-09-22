import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check, Plus, Minus, Search, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';
import { CATEGORIES } from '../data/namkeenData';
import { useDebouncedCallback } from '../utils/debounce.js';

export function ProductListMenu() {
  const { products, addToCart, cart, updateQuantity, currentCurrency, convertPrice } = useStoreCart();
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [menuSearch, setMenuSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedVariants, setSelectedVariants] = useState({}); // { [productId]: variantIndex }
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const debouncedSetMenuSearch = useDebouncedCallback((val) => {
    setMenuSearch(val);
  }, 300);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryFilter, menuSearch]);

  // Filter products
  const filteredProducts = products.filter(item => {
    const matchesCat = activeCategoryFilter === 'all' || item.category === activeCategoryFilter;
    const matchesSearch = !menuSearch || 
      item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
      item.categoryLabel.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Paginate filtered products in pages of 20 items
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProducts.length);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Group paginated products by category for restaurant-style menu organization
  const groupedCategories = CATEGORIES.filter(c => c.id !== 'all').map(cat => ({
    ...cat,
    items: paginatedProducts.filter(p => p.category === cat.id)
  })).filter(cat => cat.items.length > 0);

  const getSelectedVariant = (product) => {
    const idx = selectedVariants[product.id] || 0;
    return product.variants[idx] || product.variants[0];
  };

  const handleSelectVariant = (productId, idx) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: idx }));
  };

  const getCartQuantityForVariant = (product, variant) => {
    const cartItemId = `${product.id}-${variant.weight}`;
    const found = cart.find(c => c.cartItemId === cartItemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="trinetr-product-menu-container">
      {/* Menu Banner */}
      <div className="trinetr-menu-hero-header">
        <div className="trinetr-menu-hero-content">
          <div className="trinetr-hero-tag">
            <Sparkles size={14} />
            <span>Fast Bulk Order Mode</span>
          </div>
          <h2 className="trinetr-menu-title">Product List Menu</h2>
          <p className="trinetr-menu-subtitle">
            Order your favorite fresh Gujarati namkeen, wafers, and snacks quickly in single clicks with custom packet sizes.
          </p>
        </div>

        {/* Quick Search & Category Filter Pills */}
        <div className="trinetr-menu-controls">
          <div className="trinetr-menu-search-input">
            <Search size={18} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                debouncedSetMenuSearch(val);
              }}
              placeholder="Search in menu..."
            />
          </div>

          <div className="trinetr-menu-cat-pills">
            <button
              type="button"
              className={`trinetr-pill-btn ${activeCategoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('all')}
            >
              All Items ({products.length})
            </button>
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`trinetr-pill-btn ${activeCategoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Product Rows Grouped by Category */}
      <div className="trinetr-menu-sections-wrapper">
        {groupedCategories.length === 0 ? (
          <div className="trinetr-empty-menu">
            <p>No products found matching your search.</p>
          </div>
        ) : (
          groupedCategories.map(catGroup => (
            <div key={catGroup.id} className="trinetr-menu-category-block">
              <div className="trinetr-category-heading-row">
                <h3 className="trinetr-category-heading">{catGroup.name}</h3>
                <span className="trinetr-category-count-badge">{catGroup.items.length} Varieties</span>
              </div>

              <div className="trinetr-menu-rows-list">
                {catGroup.items.map(product => {
                  const currentVariant = getSelectedVariant(product);
                  const inCartQty = getCartQuantityForVariant(product, currentVariant);
                  const isAvailable = !product.isOutOfStock && currentVariant.inStock;

                  return (
                    <div 
                      key={product.id} 
                      className={`trinetr-menu-item-row ${!isAvailable ? 'row-disabled' : ''}`}
                    >
                      {/* Product Thumbnail */}
                      <div className="trinetr-menu-thumb-wrap">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="trinetr-menu-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=150&auto=format&fit=crop&q=80';
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="trinetr-menu-item-details">
                        <div className="trinetr-menu-title-row">
                          <h4 className="trinetr-menu-item-name">{product.name}</h4>
                          <div className="trinetr-menu-badges">
                            {product.isTopSeller && <span className="mini-badge top">TOP</span>}
                            {product.isNotForJain && <span className="mini-badge nj">NJ</span>}
                          </div>
                        </div>
                        <p className="trinetr-menu-desc hide-on-mobile">{product.description}</p>

                        {/* Weight Variants Chips Inline */}
                        <div className="trinetr-menu-weight-chips">
                          {product.variants.map((v, vIdx) => {
                            const isSelected = (selectedVariants[product.id] || 0) === vIdx;
                            return (
                              <button
                                key={v.weight}
                                type="button"
                                className={`trinetr-menu-chip ${isSelected ? 'active' : ''}`}
                                onClick={() => handleSelectVariant(product.id, vIdx)}
                              >
                                {v.weight}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pricing & Add / Counter Controls */}
                      <div className="trinetr-menu-item-action-box">
                        <div className="trinetr-menu-price">
                          <span className="cur">{currentCurrency.symbol}</span>
                          <span className="num">{convertPrice(currentVariant.price).toFixed(2)}</span>
                        </div>

                        {!isAvailable ? (
                          <button className="trinetr-menu-out-btn" disabled>
                            Out
                          </button>
                        ) : inCartQty > 0 ? (
                          <div className="trinetr-menu-qty-control">
                            <button
                              type="button"
                              onClick={() => updateQuantity(`${product.id}-${currentVariant.weight}`, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-val">{inCartQty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(product, currentVariant, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="trinetr-menu-add-btn"
                            onClick={() => addToCart(product, currentVariant, 1)}
                          >
                            <Plus size={15} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar (20 items per page) */}
      {filteredProducts.length > 0 && (
        <div className="trinetr-pagination-bar" data-testid="menu-pagination">
          <div className="trinetr-pagination-info">
            Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{filteredProducts.length}</strong> items
          </div>
          <div className="trinetr-pagination-actions">
            <button
              type="button"
              className="trinetr-page-btn"
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                window.scrollTo({ top: 250, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              aria-label="Previous Page"
              data-testid="menu-prev-page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="trinetr-page-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="trinetr-page-btn"
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                window.scrollTo({ top: 250, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              aria-label="Next Page"
              data-testid="menu-next-page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
