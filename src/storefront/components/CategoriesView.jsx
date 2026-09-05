import React from 'react';
import { CATEGORIES } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function CategoriesView({ onSelectCategory }) {
  const { setActiveCategory } = useStoreCart();

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  return (
    <div className="bhole-categories-page-wrapper">
      <div className="bhole-categories-header-banner">
        <h2 className="bhole-categories-title">All Product Categories</h2>
        <div className="bhole-breadcrumbs">
          <span>Home</span> &gt; <span>Only Categories</span>
        </div>
      </div>

      <div className="bhole-categories-grid-container">
        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="bhole-category-full-card"
            onClick={() => handleCategoryClick(cat.id)}
          >
            <div className="bhole-category-img-box">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop&q=80';
                }}
              />
            </div>
            <div className="bhole-category-card-meta">
              <h4 className="category-title">{cat.name}</h4>
              <span className="category-item-count">{cat.count} Products</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
