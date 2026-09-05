import React, { useState } from 'react';
import { Heart, ShoppingBag, Check, Star } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';

export function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWishlist } = useStoreCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const isWishlisted = wishlist.includes(product.id);
  const isAvailable = !product.isOutOfStock && currentVariant.inStock;

  const handleAddToCart = () => {
    if (!isAvailable) return;
    addToCart(product, currentVariant, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className={`bhole-product-card ${!isAvailable ? 'out-of-stock-card' : ''}`}>
      {/* Badges & Wishlist Overlay */}
      <div className="bhole-card-badge-row">
        <div className="bhole-badge-stack">
          {product.isTopSeller && (
            <span className="bhole-badge-pill badge-top" title="Top Selling Namkeen">
              TOP
            </span>
          )}
          {product.isNotForJain && (
            <span className="bhole-badge-pill badge-nj" title="Not For Jain (Contains Garlic / Onion / Potatoes)">
              NJ
            </span>
          )}
          {!isAvailable && (
            <span className="bhole-badge-pill badge-out" title="Currently Out of Stock">
              OUT OF STOCK
            </span>
          )}
        </div>

        <button
          type="button"
          className={`bhole-wishlist-toggle ${isWishlisted ? 'liked' : ''}`}
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={18} fill={isWishlisted ? '#e53e3e' : 'none'} color={isWishlisted ? '#e53e3e' : '#718096'} />
        </button>
      </div>

      {/* Image */}
      <div className="bhole-product-img-wrap">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="bhole-product-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Product Information */}
      <div className="bhole-product-info">
        <div className="bhole-cat-rating-row">
          <span className="bhole-category-tag">{product.categoryLabel || product.category}</span>
          {product.rating && (
            <div className="bhole-rating-badge">
              <Star size={12} fill="#d97706" color="#d97706" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <h4 className="bhole-product-title" title={product.name}>
          {product.name}
        </h4>

        {/* Multi-Weight Variant Selector Chips */}
        <div className="bhole-weight-selector">
          <span className="bhole-weight-label">Select Pack Size:</span>
          <div className="bhole-chips-grid">
            {product.variants.map((v, idx) => (
              <button
                key={v.weight}
                type="button"
                className={`bhole-weight-chip ${idx === selectedVariantIndex ? 'active' : ''}`}
                onClick={() => setSelectedVariantIndex(idx)}
              >
                {v.weight}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="bhole-price-action-footer">
          <div className="bhole-price-box">
            <span className="bhole-currency">₹</span>
            <span className="bhole-price-num">{currentVariant.price.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className={`bhole-add-cart-btn ${justAdded ? 'added' : ''}`}
            onClick={handleAddToCart}
            disabled={!isAvailable}
          >
            {justAdded ? (
              <>
                <Check size={16} />
                <span>Added</span>
              </>
            ) : !isAvailable ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>Add To Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
