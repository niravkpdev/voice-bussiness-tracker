import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function CategoryCarousel({ onSelectCategory }) {
  const { activeCategory, setActiveCategory } = useStoreCart();
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (id) => {
    setActiveCategory(id);
    if (onSelectCategory) {
      onSelectCategory(id);
    }
  };

  return (
    <div className="bhole-category-carousel-section">
      <div className="bhole-carousel-header">
        <h3 className="bhole-carousel-title">Explore Categories</h3>
        <div className="bhole-carousel-nav-arrows hide-on-mobile">
          <button 
            type="button" 
            onClick={() => scroll('left')} 
            className="bhole-arrow-btn"
            aria-label="Previous categories"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            type="button" 
            onClick={() => scroll('right')} 
            className="bhole-arrow-btn"
            aria-label="Next categories"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bhole-category-scroll-container" ref={scrollContainerRef}>
        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`bhole-cat-circle-card ${isActive ? 'active' : ''}`}
              onClick={() => handleCategorySelect(cat.id)}
            >
              <div className="bhole-cat-circle-img-wrap">
                <img 
                  src={cat.image} 
                  alt={cat.name} 
                  loading="lazy" 
                  className="bhole-cat-circle-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
              <span className="bhole-cat-name">{cat.name}</span>
              <span className="bhole-cat-count-pill">{cat.count} Items</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
