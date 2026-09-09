import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';

const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80';

const PRESET_BANNER_IMAGES = [
  {
    name: 'Gujarati Farsan Platter',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80'
  },
  {
    name: 'Kathiyawadi Gathiya',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=80'
  },
  {
    name: 'Crispy Spiced Sev',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&auto=format&fit=crop&q=80'
  },
  {
    name: 'Roasted Sing Dana',
    url: 'https://images.unsplash.com/photo-1567653418876-5bb0e566e1c2?w=700&auto=format&fit=crop&q=80'
  }
];

export function BannerEditModal({ isOpen, onClose, onUpdateProfile }) {
  const { storeInfo, updateStoreProfile, isOwner } = useStoreCart();

  const [headline, setHeadline] = useState(storeInfo?.bannerOffer || 'FLAT 20% OFF');
  const [region, setRegion] = useState(storeInfo?.bannerRegion || "For All Gujarat and Mumbai City's Customers");
  const [tagline, setTagline] = useState(storeInfo?.tagline || 'AUTHENTIC FRESH FOODS & SNACKS');
  const [bannerImage, setBannerImage] = useState(storeInfo?.bannerImage || DEFAULT_BANNER_IMAGE);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (storeInfo) {
      setHeadline(storeInfo.bannerOffer || 'FLAT 20% OFF');
      setRegion(storeInfo.bannerRegion || "For All Gujarat and Mumbai City's Customers");
      setTagline(storeInfo.tagline || 'AUTHENTIC FRESH FOODS & SNACKS');
      setBannerImage(storeInfo.bannerImage || DEFAULT_BANNER_IMAGE);
    }
  }, [storeInfo, isOpen]);

  if (!isOpen || !isOwner) {
    return null;
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setBannerImage(loadEvt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      bannerOffer: headline.trim() || 'FLAT 20% OFF',
      bannerRegion: region.trim() || "For All Gujarat and Mumbai City's Customers",
      storeTagline: tagline.trim() || storeInfo?.tagline || '',
      tagline: tagline.trim() || storeInfo?.tagline || '',
      bannerImage: bannerImage.trim() || DEFAULT_BANNER_IMAGE
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
    if (window.confirm('Reset hero banner to default settings?')) {
      const defaults = {
        bannerOffer: 'FLAT 20% OFF',
        bannerRegion: "For All Gujarat and Mumbai City's Customers",
        tagline: 'Authentic Namkeen & Farsan Manufacturer & Wholesaler',
        storeTagline: 'Fresh & Authentic Homemade Snacks & Delicacies',
        bannerImage: DEFAULT_BANNER_IMAGE
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
    <div className="trinetr-edit-modal-backdrop" onClick={onClose}>
      <div 
        className="trinetr-edit-modal-content" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="edit-banner-heading"
        style={{ maxWidth: 500 }}
      >
        {/* Modal Header */}
        <div className="trinetr-edit-modal-header">
          <div className="trinetr-edit-header-left">
            <div className="trinetr-edit-header-badge">
              <Sparkles size={16} />
              <span>Owner Storefront Editor</span>
            </div>
            <h3 id="edit-banner-heading" className="trinetr-edit-title">Edit Promotional Hero Banner</h3>
            <p className="trinetr-edit-subtitle">
              Changes save instantly to your store and persist across page refreshes.
            </p>
          </div>
          <button 
            type="button" 
            className="trinetr-edit-modal-close" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="trinetr-edit-modal-body">
          {/* Banner Photo Section */}
          <div className="trinetr-edit-field-group">
            <label className="trinetr-edit-label">
              Banner Showcase Image (Photo)
            </label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
              <div style={{
                width: 90,
                height: 68,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                flexShrink: 0
              }}>
                <img 
                  src={bannerImage} 
                  alt="Banner preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BANNER_IMAGE;
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <input 
                  type="text" 
                  className="trinetr-edit-input"
                  value={bannerImage} 
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="Paste image URL (https://...)" 
                  style={{ fontSize: 12 }}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="trinetr-reset-btn"
                    style={{ padding: '5px 10px', fontSize: 11, background: '#f8fafc' }}
                  >
                    <Upload size={13} />
                    <span>Upload From Device</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Authentic Namkeen Presets */}
            <span className="trinetr-edit-help" style={{ marginBottom: 6, display: 'block' }}>
              Or choose an authentic Gujarati namkeen photo:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PRESET_BANNER_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBannerImage(preset.url)}
                  style={{
                    border: bannerImage === preset.url ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#ffffff',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: bannerImage === preset.url ? '0 0 0 2px rgba(245, 158, 11, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img 
                    src={preset.url} 
                    alt={preset.name} 
                    style={{ width: '100%', height: 48, objectFit: 'cover' }} 
                  />
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 2px', textAlign: 'center', color: '#334155' }}>
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="trinetr-edit-field-group">
            <label className="trinetr-edit-label" htmlFor="banner-headline-input">
              Banner Headline / Discount Offer *
            </label>
            <input 
              id="banner-headline-input"
              type="text" 
              className="trinetr-edit-input"
              value={headline} 
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. FLAT 40% OFF or FESTIVE 30% OFF" 
              required 
              style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}
            />
            <span className="trinetr-edit-help">
              This is the bold offer shown at the center of your store home page.
            </span>
          </div>

          <div className="trinetr-edit-field-group">
            <label className="trinetr-edit-label" htmlFor="banner-region-input">
              Target Delivery Region / Offer Subtitle
            </label>
            <input 
              id="banner-region-input"
              type="text" 
              className="trinetr-edit-input"
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. For All Gujarat and Mumbai City's Customers" 
            />
            <span className="trinetr-edit-help">
              Subtitle text displayed directly below the discount headline.
            </span>
          </div>

          <div className="trinetr-edit-field-group">
            <label className="trinetr-edit-label" htmlFor="banner-tagline-input">
              Top Stamp / Accent Tagline
            </label>
            <input 
              id="banner-tagline-input"
              type="text" 
              className="trinetr-edit-input"
              value={tagline} 
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. FRESH & AUTHENTIC HOMEMADE SNACKS & DELICACIES" 
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="trinetr-edit-modal-footer">
            <button
              type="button"
              className="trinetr-reset-btn"
              onClick={handleReset}
              title="Reset banner to standard 20% default"
            >
              <RefreshCw size={15} />
              <span>Reset Default</span>
            </button>

            <div className="trinetr-footer-right-actions">
              <button
                type="button"
                className="trinetr-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="trinetr-save-btn"
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
