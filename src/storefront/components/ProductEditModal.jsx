import React, { useState, useEffect } from 'react';
import { X, Upload, Link, Plus, Trash2, Check, Sparkles, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';
import { CATEGORIES } from '../data/namkeenData';

export function ProductEditModal() {
  const { editingProduct, setEditingProduct, updateProduct, resetProductOverride } = useStoreCart();

  const [formData, setFormData] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        id: editingProduct.id,
        name: editingProduct.name || '',
        category: editingProduct.category || 'mix-namkeen',
        categoryLabel: editingProduct.categoryLabel || editingProduct.category || '',
        description: editingProduct.description || '',
        image: editingProduct.image || '',
        isTopSeller: Boolean(editingProduct.isTopSeller),
        isNotForJain: Boolean(editingProduct.isNotForJain),
        isOutOfStock: Boolean(editingProduct.isOutOfStock),
        variants: (editingProduct.variants && editingProduct.variants.length > 0)
          ? editingProduct.variants.map(v => ({ ...v }))
          : [{ weight: '250 GM', price: 100, inStock: true }]
      });
      setSaveSuccess(false);
      setErrorMessage('');
    } else {
      setFormData(null);
    }
  }, [editingProduct]);

  if (!editingProduct || !formData) {
    return null;
  }

  const handleClose = () => {
    setEditingProduct(null);
  };

  // Image Upload handler: reads local file into Data URL
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    // Limit size to 4MB for localStorage resilience
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Please select an image under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (result) {
        setFormData(prev => ({ ...prev, image: result }));
        setErrorMessage('');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Variant management
  const handleVariantChange = (index, field, value) => {
    setFormData(prev => {
      const nextVariants = [...prev.variants];
      nextVariants[index] = {
        ...nextVariants[index],
        [field]: field === 'price' ? Math.max(0, parseFloat(value) || 0) : value
      };
      return { ...prev, variants: nextVariants };
    });
  };

  const handleAddVariant = (weight = '500 GM', price = 150) => {
    setFormData(prev => {
      // Calculate suggested price based on first variant if available
      const basePrice = prev.variants[0]?.price || 100;
      let suggestedPrice = price;
      if (weight.includes('100')) suggestedPrice = Math.round(basePrice * 0.45);
      else if (weight.includes('500')) suggestedPrice = Math.round(basePrice * 1.9);
      else if (weight.includes('1 KG') || weight.includes('1KG')) suggestedPrice = Math.round(basePrice * 3.7);
      else if (weight.includes('2 KG') || weight.includes('2KG')) suggestedPrice = Math.round(basePrice * 7.2);

      return {
        ...prev,
        variants: [
          ...prev.variants,
          { weight, price: suggestedPrice, inStock: true }
        ]
      };
    });
  };

  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 1) {
      setErrorMessage('At least one weight pack variant is required.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
    setErrorMessage('');
  };

  // Quick preset samples
  const sampleImages = [
    { label: 'Sev', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80' },
    { label: 'Gathiya', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80' },
    { label: 'Mix Pack', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80' },
    { label: 'Wafer', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80' }
  ];

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Product title is required.');
      return;
    }

    if (!formData.variants || formData.variants.length === 0) {
      setErrorMessage('Please add at least one weight variant.');
      return;
    }

    updateProduct(formData.id, {
      name: formData.name.trim(),
      category: formData.category,
      categoryLabel: formData.categoryLabel.trim() || formData.category,
      description: formData.description.trim(),
      image: formData.image || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
      isTopSeller: formData.isTopSeller,
      isNotForJain: formData.isNotForJain,
      isOutOfStock: formData.isOutOfStock,
      variants: formData.variants
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      handleClose();
    }, 900);
  };

  const handleReset = () => {
    if (window.confirm('Reset this product to its original default details and prices?')) {
      resetProductOverride(formData.id);
      handleClose();
    }
  };

  return (
    <div className="bhole-edit-modal-backdrop" onClick={handleClose}>
      <div 
        className="bhole-edit-modal-content" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="edit-product-heading"
      >
        {/* Modal Header */}
        <div className="bhole-edit-modal-header">
          <div className="bhole-edit-header-left">
            <div className="bhole-edit-header-badge">
              <Sparkles size={16} />
              <span>Owner Product Editor</span>
            </div>
            <h3 id="edit-product-heading" className="bhole-edit-title">Edit Product & Pack Sizes</h3>
            <p className="bhole-edit-subtitle">
              Modify image, title, gram/kilogram weights, and retail prices in real time.
            </p>
          </div>
          <button 
            type="button" 
            className="bhole-edit-modal-close" 
            onClick={handleClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="bhole-edit-alert error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="bhole-edit-alert success">
            <Check size={16} />
            <span>Product saved and synced with store catalog and ERP!</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSave} className="bhole-edit-modal-form">
          <div className="bhole-edit-grid">
            
            {/* Column 1: Image Management */}
            <div className="bhole-edit-col image-col">
              <label className="bhole-edit-label">Product Image Preview</label>
              
              <div className="bhole-edit-img-preview-box">
                {formData.image ? (
                  <img 
                    src={formData.image} 
                    alt={formData.name} 
                    className="bhole-edit-preview-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <div className="bhole-edit-no-img">
                    <ImageIcon size={48} />
                    <span>No Image Selected</span>
                  </div>
                )}
              </div>

              {/* Upload file button */}
              <div className="bhole-edit-upload-box">
                <label className="bhole-file-upload-btn">
                  <Upload size={16} />
                  <span>Upload Image From Device</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
                <span className="bhole-upload-tip">Supports JPG, PNG, WEBP from phone or PC</span>
              </div>

              {/* URL input */}
              <div className="bhole-edit-field">
                <label className="bhole-field-sublabel">
                  <Link size={14} />
                  <span>Or Enter Image URL:</span>
                </label>
                <input 
                  type="text" 
                  className="bhole-edit-input" 
                  value={formData.image} 
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="https://example.com/product-image.jpg"
                />
              </div>

              {/* Sample presets */}
              <div className="bhole-sample-images">
                <span className="bhole-sample-label">Quick Samples:</span>
                <div className="bhole-sample-pills">
                  {sampleImages.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="bhole-sample-pill"
                      onClick={() => setFormData(prev => ({ ...prev, image: s.url }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Product Text & Metadata */}
            <div className="bhole-edit-col details-col">
              {/* Product Name */}
              <div className="bhole-edit-field">
                <label className="bhole-edit-label">Product Name / Title *</label>
                <input 
                  type="text" 
                  className="bhole-edit-input" 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Bhavnagari Gathiya"
                  required
                />
              </div>

              {/* Category & Category Label */}
              <div className="bhole-edit-row-two">
                <div className="bhole-edit-field">
                  <label className="bhole-edit-label">Category</label>
                  <select 
                    className="bhole-edit-select"
                    value={formData.category}
                    onChange={(e) => {
                      const found = CATEGORIES.find(c => c.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        category: e.target.value,
                        categoryLabel: found ? found.name : prev.categoryLabel
                      }));
                    }}
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bhole-edit-field">
                  <label className="bhole-edit-label">Category Badge Label</label>
                  <input 
                    type="text" 
                    className="bhole-edit-input" 
                    value={formData.categoryLabel} 
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryLabel: e.target.value }))}
                    placeholder="e.g. Gathiya Special"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="bhole-edit-field">
                <label className="bhole-edit-label">Description / Taste Notes</label>
                <textarea 
                  className="bhole-edit-textarea" 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe texture, spices, ingredients, and authentic recipe details..."
                />
              </div>

              {/* Product Badges & Flags */}
              <div className="bhole-edit-flags-section">
                <label className="bhole-edit-label">Badges & Inventory Status</label>
                <div className="bhole-flags-row">
                  <label className="bhole-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={formData.isTopSeller} 
                      onChange={(e) => setFormData(prev => ({ ...prev, isTopSeller: e.target.checked }))} 
                    />
                    <span className="checkbox-title">🔥 Top Seller</span>
                  </label>

                  <label className="bhole-checkbox-card">
                    <input 
                      type="checkbox" 
                      checked={formData.isNotForJain} 
                      onChange={(e) => setFormData(prev => ({ ...prev, isNotForJain: e.target.checked }))} 
                    />
                    <span className="checkbox-title">🧅 Not For Jain (NJ)</span>
                  </label>

                  <label className="bhole-checkbox-card danger">
                    <input 
                      type="checkbox" 
                      checked={formData.isOutOfStock} 
                      onChange={(e) => setFormData(prev => ({ ...prev, isOutOfStock: e.target.checked }))} 
                    />
                    <span className="checkbox-title">⚠️ Out Of Stock</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Gram / Kilogram Variants & Pricing */}
          <div className="bhole-edit-variants-section">
            <div className="bhole-variants-header">
              <div>
                <h4 className="bhole-variants-title">Gram / Kilogram Pack Sizes & Pricing</h4>
                <p className="bhole-variants-subtitle">
                  Configure multiple pack sizes (e.g. 250 GM, 500 GM, 1 KG) and their individual retail selling prices.
                </p>
              </div>

              {/* Quick Size Adders */}
              <div className="bhole-quick-size-buttons">
                <span className="quick-label">Quick Add:</span>
                <button type="button" className="bhole-quick-btn" onClick={() => handleAddVariant('100 GM')}>+ 100 GM</button>
                <button type="button" className="bhole-quick-btn" onClick={() => handleAddVariant('250 GM')}>+ 250 GM</button>
                <button type="button" className="bhole-quick-btn" onClick={() => handleAddVariant('500 GM')}>+ 500 GM</button>
                <button type="button" className="bhole-quick-btn" onClick={() => handleAddVariant('1 KG')}>+ 1 KG</button>
                <button type="button" className="bhole-quick-btn" onClick={() => handleAddVariant('2 KG')}>+ 2 KG</button>
              </div>
            </div>

            {/* Variants Table */}
            <div className="bhole-variants-table-wrap">
              <table className="bhole-variants-table">
                <thead>
                  <tr>
                    <th>Pack Size / Weight (Grams / KG)</th>
                    <th>Price (₹)</th>
                    <th>In Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.variants.map((variant, idx) => (
                    <tr key={idx}>
                      <td>
                        <input 
                          type="text" 
                          className="bhole-table-input weight-input"
                          value={variant.weight} 
                          onChange={(e) => handleVariantChange(idx, 'weight', e.target.value)}
                          placeholder="e.g. 250 GM, 500 GM, 1 KG"
                          required
                        />
                      </td>
                      <td>
                        <div className="bhole-table-price-wrap">
                          <span className="currency-symbol">₹</span>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            className="bhole-table-input price-input"
                            value={variant.price} 
                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                            required
                          />
                        </div>
                      </td>
                      <td>
                        <label className="bhole-stock-switch">
                          <input 
                            type="checkbox" 
                            checked={Boolean(variant.inStock)} 
                            onChange={(e) => handleVariantChange(idx, 'inStock', e.target.checked)} 
                          />
                          <span className="switch-text">{variant.inStock ? 'Available' : 'Sold Out'}</span>
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bhole-var-delete-btn"
                          onClick={() => handleRemoveVariant(idx)}
                          disabled={formData.variants.length <= 1}
                          title={formData.variants.length <= 1 ? 'At least one variant required' : 'Remove this pack size'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="bhole-add-variant-row-btn"
              onClick={() => handleAddVariant('500 GM', 150)}
            >
              <Plus size={16} />
              <span>Add Another Weight / Pack Size</span>
            </button>
          </div>

          {/* Modal Footer Actions */}
          <div className="bhole-edit-modal-footer">
            <button
              type="button"
              className="bhole-reset-btn"
              onClick={handleReset}
              title="Revert this product to default factory settings"
            >
              <RefreshCw size={15} />
              <span>Reset to Default</span>
            </button>

            <div className="bhole-footer-right-actions">
              <button
                type="button"
                className="bhole-cancel-btn"
                onClick={handleClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="bhole-save-btn"
              >
                <Check size={18} />
                <span>Save Changes & Sync</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
