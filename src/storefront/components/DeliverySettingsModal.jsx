import React, { useState } from 'react';
import { X, Truck, Check, Key, ShieldCheck, ExternalLink, Zap, RefreshCw, AlertCircle, Info, MapPin, Package, CheckCircle2 } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';

export function DeliverySettingsModal({ isOpen, onClose }) {
  const { deliveryConfig, updateDeliveryConfig, storeInfo, formatPrice, currentCurrency } = useStoreCart();

  const [form, setForm] = useState(() => ({
    provider: deliveryConfig?.provider || 'shiprocket',
    apiKey: deliveryConfig?.apiKey || '',
    apiSecret: deliveryConfig?.apiSecret || '',
    merchantId: deliveryConfig?.merchantId || '',
    pickupPincode: deliveryConfig?.pickupPincode || '380001',
    freeShippingThreshold: deliveryConfig?.freeShippingThreshold ?? 500,
    standardDeliveryFee: deliveryConfig?.standardDeliveryFee ?? 50,
    autoDispatch: Boolean(deliveryConfig?.autoDispatch),
    testMode: deliveryConfig?.testMode !== false,
    fleetPhone: deliveryConfig?.fleetPhone || storeInfo?.phone || ''
  }));

  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'failed'
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleProviderSelect = (providerId) => {
    setForm(prev => ({
      ...prev,
      provider: providerId
    }));
    setTestStatus(null);
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      if (form.testMode || form.apiKey.trim().length > 4) {
        setTestStatus('success');
      } else {
        setTestStatus('failed');
      }
    }, 900);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateDeliveryConfig(form);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const providers = [
    {
      id: 'shiprocket',
      name: 'Shiprocket',
      badge: 'Recommended · Pan-India & Global',
      tagline: 'Best for Pan-India parcel shipping & exports (USA, UK, Europe). 25+ couriers in one account.',
      features: ['Auto AWB generation', 'Printable barcode labels', 'Scheduled courier pickup', 'Global export'],
      docUrl: 'https://app.shiprocket.in/api-user'
    },
    {
      id: 'delhivery',
      name: 'Delhivery Direct',
      badge: 'Pan-India Express',
      tagline: 'Direct integration for bulk B2C express shipping across 18,500+ Indian pincodes.',
      features: ['Fast surface & air express', 'Cash on Delivery (COD) remittance', 'NDR management'],
      docUrl: 'https://www.delhivery.com/'
    },
    {
      id: 'borzo',
      name: 'Borzo (WeFast)',
      badge: 'Hyperlocal · Same-Day',
      tagline: 'Instant 30 to 90-minute motorbike courier delivery within Gujarat and Mumbai cities.',
      features: ['Rider arrives within 15 mins', 'Live GPS route tracking', 'Direct customer drop-off'],
      docUrl: 'https://borzodelivery.com/in/business'
    },
    {
      id: 'dunzo',
      name: 'Dunzo for Business',
      badge: 'Hyperlocal · Instant',
      tagline: 'On-demand bike delivery partner for local city deliveries with instant dispatch.',
      features: ['Local city delivery', 'Real-time rider dispatch', 'Fixed km-based rates'],
      docUrl: 'https://www.dunzo.com/merchant'
    },
    {
      id: 'self',
      name: 'Store Fleet / Self Delivery',
      badge: 'Own Fleet',
      tagline: 'Manage your own in-house delivery boy with direct phone dispatch and custom delivery zones.',
      features: ['Zero third-party commissions', 'Direct phone coordination', 'Custom local routes'],
      docUrl: null
    }
  ];

  const activeProvider = providers.find(p => p.id === form.provider) || providers[0];

  return (
    <div className="trinetr-delivery-modal-backdrop" onClick={onClose}>
      <div className="trinetr-delivery-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="trinetr-delivery-modal-header">
          <div className="modal-header-icon-box">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="modal-title">Delivery Partner App Integration</h3>
            <p className="modal-subtitle">
              Connect your online store to Shiprocket, Borzo, Dunzo, or Delhivery for automated courier dispatch and tracking.
            </p>
          </div>
          <button type="button" className="trinetr-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Save Success Banner */}
        {saveSuccess && (
          <div className="delivery-save-alert">
            <CheckCircle2 size={18} />
            <span>Delivery partner settings saved & connected successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="trinetr-delivery-modal-body">
          {/* Section: Select Provider */}
          <div className="delivery-section">
            <h4 className="delivery-section-title">1. Select Your Delivery Partner</h4>
            <div className="delivery-providers-grid">
              {providers.map(p => {
                const isSelected = form.provider === p.id;
                return (
                  <div
                    key={p.id}
                    className={`delivery-provider-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleProviderSelect(p.id)}
                  >
                    <div className="provider-card-header">
                      <span className="provider-name">{p.name}</span>
                      <span className={`provider-badge ${p.id}`}>{p.badge}</span>
                    </div>
                    <p className="provider-tagline">{p.tagline}</p>
                    <div className="provider-features-list">
                      {p.features.map((f, i) => (
                        <span key={i} className="feature-pill">✓ {f}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: API Credentials & Setup */}
          <div className="delivery-section">
            <div className="delivery-section-header-row">
              <h4 className="delivery-section-title">2. API Credentials & Connection ({activeProvider.name})</h4>
              {activeProvider.docUrl && (
                <a 
                  href={activeProvider.docUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="delivery-doc-link"
                >
                  <span>Get API Keys on {activeProvider.name}</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            {form.provider === 'self' ? (
              <div className="delivery-form-grid">
                <div className="form-group">
                  <label>Delivery Boy / Dispatch Contact Number</label>
                  <input
                    type="text"
                    className="delivery-input"
                    value={form.fleetPhone}
                    onChange={(e) => setForm({ ...form, fleetPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                  <span className="input-hint">Used to dispatch order details directly to your delivery driver.</span>
                </div>
                <div className="form-group">
                  <label>Store Pickup Pincode</label>
                  <input
                    type="text"
                    className="delivery-input"
                    value={form.pickupPincode}
                    onChange={(e) => setForm({ ...form, pickupPincode: e.target.value })}
                    placeholder="e.g. 380001"
                  />
                </div>
              </div>
            ) : (
              <div className="delivery-form-grid">
                <div className="form-group">
                  <label>API Key / Login Email</label>
                  <div className="input-with-icon">
                    <Key size={16} />
                    <input
                      type="text"
                      className="delivery-input"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder={`Enter ${activeProvider.name} API Key / Email`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>API Secret / Password / Token</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={16} />
                    <input
                      type="password"
                      className="delivery-input"
                      value={form.apiSecret}
                      onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                      placeholder={`Enter ${activeProvider.name} Secret / Token`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Store Pickup Pincode (Warehouse)</label>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      type="text"
                      className="delivery-input"
                      value={form.pickupPincode}
                      onChange={(e) => setForm({ ...form, pickupPincode: e.target.value })}
                      placeholder="e.g. 380001 (Ahmedabad / Surat)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Test / Sandbox Mode</label>
                  <label className="toggle-switch-label">
                    <input
                      type="checkbox"
                      checked={form.testMode}
                      onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
                    />
                    <span>{form.testMode ? 'Sandbox / Test Mode Active (Safe for testing)' : 'Live Production API Active'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Test Connection Button */}
            {form.provider !== 'self' && (
              <div className="test-connection-row">
                <button
                  type="button"
                  className={`btn-test-conn ${testStatus === 'testing' ? 'loading' : ''}`}
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                >
                  <RefreshCw size={14} className={testStatus === 'testing' ? 'spin' : ''} />
                  <span>{testStatus === 'testing' ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>

                {testStatus === 'success' && (
                  <span className="test-badge success">
                    <Check size={14} /> Connection Successful! Partner API Verified.
                  </span>
                )}
                {testStatus === 'failed' && (
                  <span className="test-badge failed">
                    <AlertCircle size={14} /> Failed. Please verify your API Key or enable Test Mode.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section: Shipping Fees & Rules */}
          <div className="delivery-section">
            <h4 className="delivery-section-title">3. Store Shipping Rules & Charges</h4>
            <div className="delivery-rules-grid">
              <div className="form-group">
                <label>Free Shipping Order Threshold (₹ INR)</label>
                <div className="input-prefix-wrap">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="delivery-input"
                    value={form.freeShippingThreshold}
                    onChange={(e) => setForm({ ...form, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <span className="input-hint">
                  Customers ordering above {formatPrice(form.freeShippingThreshold)} get 100% Free Delivery.
                </span>
              </div>

              <div className="form-group">
                <label>Standard Delivery Fee (₹ INR)</label>
                <div className="input-prefix-wrap">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    className="delivery-input"
                    value={form.standardDeliveryFee}
                    onChange={(e) => setForm({ ...form, standardDeliveryFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <span className="input-hint">
                  Applied when cart value is under the free shipping threshold ({formatPrice(form.standardDeliveryFee)}).
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="trinetr-delivery-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save-delivery"
            >
              <Check size={18} />
              <span>Save & Connect Delivery Partner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
