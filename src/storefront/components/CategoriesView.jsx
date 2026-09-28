import React from 'react';
import { CATEGORIES } from '../data/namkeenData';
import { useStoreCart, sanitizeSnackImage, DEFAULT_SNACK_IMAGE } from '../context/StoreCartContext';

export function CategoriesView({ onSelectCategory }) {
  const { setActiveCategory } = useStoreCart();

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  return (
    <div className="trinetr-categories-page-wrapper">
      <div className="trinetr-categories-header-banner">
        <h1 className="trinetr-categories-title">All Product Categories</h1>
        <div className="trinetr-breadcrumbs">
          <span>Home</span> &gt; <span>Only Categories</span>
        </div>
      </div>

      <div className="trinetr-categories-grid-container">
        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="trinetr-category-full-card"
            onClick={() => handleCategoryClick(cat.id)}
          >
            <div className="trinetr-category-img-box">
              <img
                src={sanitizeSnackImage(cat.image)}
                alt={cat.name}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_SNACK_IMAGE;
                }}
              />
            </div>
            <div className="trinetr-category-card-meta">
              <h4 className="category-title" style={{ color: '#0f172a', fontWeight: 800 }}>{cat.name}</h4>
              <span className="category-item-count" style={{ color: '#64748b', fontWeight: 600 }}>{cat.count} Products</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
