import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, RefreshCw } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';

export function BannerEditModal({ isOpen, onClose, onUpdateProfile }) {
  const { storeInfo, updateStoreProfile, isOwner } = useStoreCart();

  const [headline, setHeadline] = useState(storeInfo?.bannerOffer || 'FLAT 20% OFF');
  const [region, setRegion] = useState(storeInfo?.bannerRegion || "For All Gujarat and Mumbai City's Customers");
  const [tagline, setTagline] = useState(storeInfo?.tagline || 'AUTHENTIC FRESH FOODS & SNACKS');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (storeInfo) {
      setHeadline(storeInfo.bannerOffer || 'FLAT 20% OFF');
      setRegion(storeInfo.bannerRegion || "For All Gujarat and Mumbai City's Customers");
      setTagline(storeInfo.tagline || 'AUTHENTIC FRESH FOODS & SNACKS');
    }
  }, [storeInfo, isOpen]);

  if (!isOpen || !isOwner) {
    return null;
  }

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      bannerOffer: headline.trim() || 'FLAT 20% OFF',
      bannerRegion: region.trim() || "For All Gujarat and Mumbai City's Customers",
      storeTagline: tagline.trim() || storeInfo?.tagline || '',
      tagline: tagline.trim() || storeInfo?.tagline || '',
    };

    if (updateStoreProfile) {
      updateStoreProfile(updates);
    }
    if (onUpdateProfile) {
      onUpdateProfile(updates);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  const handleReset = () => {
    if (window.confirm('Reset hero banner to default "FLAT 20% OFF"?')) {
      const defaults = {
        bannerOffer: 'FLAT 20% OFF',
        bannerRegion: "For All Gujarat and Mumbai City's Customers",
        tagline: 'Authentic Namkeen & Farsan Manufacturer & Wholesaler',
        storeTagline: 'Fresh & Authentic Homemade Snacks & Delicacies',
      };
      if (updateStoreProfile) {
        updateStoreProfile(defaults);
      }
      if (onUpdateProfile) {
        onUpdateProfile(defaults);
      }
      onClose();
    }
  };

  return (
    <div className="bhole-edit-modal-backdrop" onClick={onClose}>
      <div 
        className="bhole-edit-modal-content" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="edit-banner-heading"
        style={{ maxWidth: 500 }}
      >
        {/* Modal Header */}
        <div className="bhole-edit-modal-header">
          <div className="bhole-edit-header-left">
            <div className="bhole-edit-header-badge">
              <Sparkles size={16} />
              <span>Owner Storefront Editor</span>
            </div>
            <h3 id="edit-banner-heading" className="bhole-edit-title">Edit Promotional Hero Banner</h3>
            <p className="bhole-edit-subtitle">
              Changes save instantly to your store and persist across page refreshes.
            </p>
          </div>
          <button 
            type="button" 
            className="bhole-edit-modal-close" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="bhole-edit-modal-body">
          <div className="bhole-edit-field-group">
            <label className="bhole-edit-label" htmlFor="banner-headline-input">
              Banner Headline / Discount Offer *
            </label>
            <input 
              id="banner-headline-input"
              type="text" 
              className="bhole-edit-input"
              value={headline} 
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. FLAT 40% OFF or FESTIVE 30% OFF" 
              required 
              style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}
            />
            <span className="bhole-edit-help">
              This is the bold offer shown at the center of your store home page.
            </span>
          </div>

          <div className="bhole-edit-field-group">
            <label className="bhole-edit-label" htmlFor="banner-region-input">
              Target Delivery Region / Offer Subtitle
            </label>
            <input 
              id="banner-region-input"
              type="text" 
              className="bhole-edit-input"
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. For All Gujarat and Mumbai City's Customers" 
            />
            <span className="bhole-edit-help">
              Subtitle text displayed directly below the discount headline.
            </span>
          </div>

          <div className="bhole-edit-field-group">
            <label className="bhole-edit-label" htmlFor="banner-tagline-input">
              Top Stamp / Accent Tagline
            </label>
            <input 
              id="banner-tagline-input"
              type="text" 
              className="bhole-edit-input"
              value={tagline} 
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. FRESH & AUTHENTIC HOMEMADE SNACKS & DELICACIES" 
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="bhole-edit-modal-footer">
            <button
              type="button"
              className="bhole-reset-btn"
              onClick={handleReset}
              title="Reset banner to standard 20% default"
            >
              <RefreshCw size={15} />
              <span>Reset Default</span>
            </button>

            <div className="bhole-footer-right-actions">
              <button
                type="button"
                className="bhole-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="bhole-save-btn"
              >
                <Check size={18} />
                <span>{saveSuccess ? 'Saved!' : 'Save Banner Offer'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
