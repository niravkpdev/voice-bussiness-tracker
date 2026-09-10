import React, { useState } from 'react';
import { Heart, ShoppingBag, Check, Star, Edit3 } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';

export function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWishlist, setEditingProduct, isOwner, currentCurrency, convertPrice } = useStoreCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }

  const currentVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const isWishlisted = wishlist.includes(product.id);
  const isAvailable = !product.isOutOfStock && currentVariant.inStock;
  const basePrice = currentVariant.price;
  const currentPrice = convertPrice(basePrice);
  const rawMrp = Math.round(basePrice * 1.25);
  const estimatedMrp = convertPrice(rawMrp);
  const savingsAmount = Math.max(0, estimatedMrp - currentPrice).toFixed(2);

  const handleAddToCart = () => {
    if (!isAvailable) return;
    addToCart(product, currentVariant, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className={`trinetr-product-card ${!isAvailable ? 'out-of-stock-card' : ''}`}>
      {/* Badges & Wishlist Overlay */}
      <div className="trinetr-card-badge-row">
        <div className="trinetr-badge-stack">
          {product.isTopSeller && (
            <span className="trinetr-badge-pill badge-top" title="Top Selling Namkeen">
              ⭐ Bestseller
            </span>
          )}
          {!product.isNotForJain ? (
            <span className="trinetr-badge-pill badge-jain" title="Pure Jain Friendly (No Garlic / Onion / Potatoes)">
              🌱 Jain
            </span>
          ) : (
            <span className="trinetr-badge-pill badge-nj" title="Contains Garlic / Onion / Potatoes">
              NJ
            </span>
          )}
          {!isAvailable && (
            <span className="trinetr-badge-pill badge-out" title="Currently Out of Stock">
              OUT OF STOCK
            </span>
          )}
        </div>

        <button
          type="button"
          className={`trinetr-wishlist-toggle ${isWishlisted ? 'liked' : ''}`}
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={18} fill={isWishlisted ? '#e53e3e' : 'none'} color={isWishlisted ? '#e53e3e' : '#718096'} />
        </button>
      </div>

      {/* Image */}
      <div className="trinetr-product-img-wrap">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="trinetr-product-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80';
          }}
        />

        {/* Owner In-Place Edit Option on Image (Strictly for Registered Owner) */}
        {isOwner && (
          <button
            type="button"
            className="trinetr-product-img-edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (setEditingProduct) setEditingProduct(product);
            }}
            title="Edit image, name, pack weights, and prices (Owner only)"
            aria-label={`Edit ${product.name}`}
          >
            <Edit3 size={13} />
            <span>Edit Product</span>
          </button>
        )}
      </div>

      {/* Product Information */}
      <div className="trinetr-product-info">
        <div className="trinetr-cat-rating-row">
          <span className="trinetr-category-tag">{product.categoryLabel || product.category}</span>
          {product.rating && (
            <div className="trinetr-rating-badge">
              <Star size={12} fill="#d97706" color="#d97706" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <h4 className="trinetr-product-title" title={product.name}>
          {product.name}
        </h4>

        {/* Multi-Weight Variant Selector Chips */}
        <div className="trinetr-weight-selector">
          <span className="trinetr-weight-label">Select Pack Size:</span>
          <div className="trinetr-chips-grid">
            {product.variants.map((v, idx) => (
              <button
                key={v.weight}
                type="button"
                className={`trinetr-weight-chip ${idx === selectedVariantIndex ? 'active' : ''}`}
                onClick={() => setSelectedVariantIndex(idx)}
              >
                {v.weight}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="trinetr-price-action-footer">
          <div className="trinetr-price-box">
            <div className="trinetr-price-main-line">
              <span className="trinetr-currency">{currentCurrency.symbol}</span>
              <span className="trinetr-price-num">{currentPrice.toFixed(2)}</span>
            </div>
            <div className="trinetr-price-sub-line">
              <span className="trinetr-mrp-strike">MRP {currentCurrency.symbol}{estimatedMrp.toFixed(2)}</span>
              <span className="trinetr-save-pill">Save {currentCurrency.symbol}{savingsAmount}</span>
            </div>
          </div>

          <button
            type="button"
            className={`trinetr-add-cart-btn ${justAdded ? 'added' : ''}`}
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
