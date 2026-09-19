import React, { useState, useEffect } from 'react';

export const isDemoStorefrontName = (val) => {
  if (!val || typeof val !== 'string') return true;
  const s = val.trim().toLowerCase();
  return (
    s === '' ||
    s === 'jay ambe namkeen' ||
    s === 'jay ambe namkeen store' ||
    s === 'trinetr store' ||
    s === 'trinetr business suite' ||
    s === 'default store' ||
    s === 'demo workspace' ||
    s === 'voice business tracker'
  );
};

export const isDemoStorefrontTagline = (val) => {
  if (!val || typeof val !== 'string') return true;
  const s = val.trim().toLowerCase();
  return (
    s === '' ||
    s === 'fresh & authentic homemade snacks & delicacies' ||
    s === 'authentic namkeen & farsan manufacturer & wholesaler' ||
    s === 'authentic namkeen & farsan manufacturer & wholesale' ||
    s === 'namkeen & wafers' ||
    s === 'fresh & authentic quality products' ||
    s === 'enterprise business management & point of sale'
  );
};

export default function BusinessProfileForm({
  profile = {},
  onSave,
  onReset,
  setActiveTab,
}) {
  const resolveInitialStoreName = (p) => {
    if (!p?.storeName || isDemoStorefrontName(p.storeName) || p.storeName === p.name) {
      return p?.name || '';
    }
    return p.storeName;
  };

  const resolveInitialStoreTagline = (p) => {
    if (!p?.storeTagline || isDemoStorefrontTagline(p.storeTagline) || p.storeTagline === p.tagline) {
      return p?.tagline || '';
    }
    return p.storeTagline;
  };

  const resolveInitialWhatsapp = (p) => {
    if (
      !p?.whatsapp ||
      p.whatsapp === '919979668339' ||
      p.whatsapp === '+91 9979668339' ||
      p.whatsapp === p.phone
    ) {
      return p?.phone || '';
    }
    return p.whatsapp;
  };

  const [name, setName] = useState(profile.name || '');
  const [owner, setOwner] = useState(profile.owner || '');
  const [tagline, setTagline] = useState(profile.tagline || '');
  const [gstin, setGstin] = useState(profile.gstin || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [address, setAddress] = useState(profile.address || '');
  const [upiId, setUpiId] = useState(profile.upiId || '');

  const [storeName, setStoreName] = useState(() => resolveInitialStoreName(profile));
  const [storeTagline, setStoreTagline] = useState(() => resolveInitialStoreTagline(profile));
  const [whatsapp, setWhatsapp] = useState(() => resolveInitialWhatsapp(profile));
  const [fssai, setFssai] = useState(profile.fssaiNumber || '');
  const [hours, setHours] = useState(profile.hours || 'Mon - Sun: 9:00 AM - 10:00 PM');
  const [logoPreview, setLogoPreview] = useState(profile.logo || '');

  // Tracking flags: whether user has manually customized storefront-specific values
  const [isStoreNameCustomized, setIsStoreNameCustomized] = useState(
    Boolean(profile.storeName && !isDemoStorefrontName(profile.storeName) && profile.storeName !== profile.name)
  );
  const [isStoreTaglineCustomized, setIsStoreTaglineCustomized] = useState(
    Boolean(profile.storeTagline && !isDemoStorefrontTagline(profile.storeTagline) && profile.storeTagline !== profile.tagline)
  );
  const [isWhatsappCustomized, setIsWhatsappCustomized] = useState(
    Boolean(
      profile.whatsapp &&
      profile.whatsapp !== profile.phone &&
      profile.whatsapp !== '919979668339' &&
      profile.whatsapp !== '+91 9979668339'
    )
  );

  // Synchronize whenever profile prop updates (e.g. from Supabase sync or reset defaults)
  useEffect(() => {
    setName(profile.name || '');
    setOwner(profile.owner || '');
    setTagline(profile.tagline || '');
    setGstin(profile.gstin || '');
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setAddress(profile.address || '');
    setUpiId(profile.upiId || '');
    setFssai(profile.fssaiNumber || '');
    setHours(profile.hours || 'Mon - Sun: 9:00 AM - 10:00 PM');
    setLogoPreview(profile.logo || '');

    const resolvedStoreName = resolveInitialStoreName(profile);
    setStoreName(resolvedStoreName);
    setIsStoreNameCustomized(
      Boolean(profile.storeName && !isDemoStorefrontName(profile.storeName) && profile.storeName !== profile.name)
    );

    const resolvedStoreTagline = resolveInitialStoreTagline(profile);
    setStoreTagline(resolvedStoreTagline);
    setIsStoreTaglineCustomized(
      Boolean(profile.storeTagline && !isDemoStorefrontTagline(profile.storeTagline) && profile.storeTagline !== profile.tagline)
    );

    const resolvedWhatsapp = resolveInitialWhatsapp(profile);
    setWhatsapp(resolvedWhatsapp);
    setIsWhatsappCustomized(
      Boolean(
        profile.whatsapp &&
        profile.whatsapp !== profile.phone &&
        profile.whatsapp !== '919979668339' &&
        profile.whatsapp !== '+91 9979668339'
      )
    );
  }, [profile]);

  // Reactive Handlers: Automatic Sync from ERP details to Storefront details
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    // Auto-sync storefront name if not explicitly customized or currently empty/demo/equal to current name
    if (!isStoreNameCustomized || !storeName || isDemoStorefrontName(storeName) || storeName === name) {
      setStoreName(val);
    }
  };

  const handleStoreNameChange = (e) => {
    const val = e.target.value;
    setStoreName(val);
    if (val.trim() && val.trim().toLowerCase() !== name.trim().toLowerCase()) {
      setIsStoreNameCustomized(true);
    } else {
      setIsStoreNameCustomized(false);
      if (!val.trim()) {
        setStoreName(name);
      }
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    // Auto-sync WhatsApp number if not explicitly customized or currently matches phone
    if (!isWhatsappCustomized || !whatsapp || whatsapp === phone || whatsapp === '919979668339' || whatsapp === '+91 9979668339') {
      setWhatsapp(val);
    }
  };

  const handleWhatsappChange = (e) => {
    const val = e.target.value;
    setWhatsapp(val);
    if (val.trim() && val.trim() !== phone.trim()) {
      setIsWhatsappCustomized(true);
    } else {
      setIsWhatsappCustomized(false);
      if (!val.trim()) {
        setWhatsapp(phone);
      }
    }
  };

  const handleTaglineChange = (e) => {
    const val = e.target.value;
    setTagline(val);
    // Auto-sync storefront tagline if not explicitly customized or currently empty/demo/equal to current tagline
    if (!isStoreTaglineCustomized || !storeTagline || isDemoStorefrontTagline(storeTagline) || storeTagline === tagline) {
      setStoreTagline(val);
    }
  };

  const handleStoreTaglineChange = (e) => {
    const val = e.target.value;
    setStoreTagline(val);
    if (val.trim() && val.trim().toLowerCase() !== tagline.trim().toLowerCase()) {
      setIsStoreTaglineCustomized(true);
    } else {
      setIsStoreTaglineCustomized(false);
      if (!val.trim()) {
        setStoreTagline(tagline);
      }
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        setLogoPreview(url);
      } catch {}
    }
  };

  return (
    <form onSubmit={onSave}>
      <div className="profile-editor-grid">
        <div className="profile-logo-card">
          <img className="profile-logo-preview" src={logoPreview || profile.logo} alt="Business logo preview" />
          <label className="field-label" htmlFor="profile-logo">
            Upload Business Logo
          </label>
          <input accept="image/*" id="profile-logo" name="profileLogo" type="file" onChange={handleLogoFileChange} />
        </div>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="profile-name">
              Company / Shop Name
            </label>
            <input
              id="profile-name"
              name="profileName"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Priya Enterprise"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="profile-owner">
              Owner Name
            </label>
            <input
              id="profile-owner"
              name="profileOwner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. Priya Prajapati"
              required
            />
          </div>
          <div className="wide-field">
            <label className="field-label" htmlFor="profile-tagline">
              Business Tagline / Description
            </label>
            <input
              id="profile-tagline"
              name="profileTagline"
              value={tagline}
              onChange={handleTaglineChange}
              placeholder="e.g. My business is serve original rasin products"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="profile-gstin">
              GSTIN Number
            </label>
            <input
              id="profile-gstin"
              name="profileGstin"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 24CPVPC7753J1Z8"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="profile-phone">
              Mobile Number
            </label>
            <input
              id="profile-phone"
              name="profilePhone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="e.g. +91 8488943771"
              required
            />
          </div>
          <div className="wide-field">
            <label className="field-label" htmlFor="profile-email">
              Email Address
            </label>
            <input
              id="profile-email"
              name="profileEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@business.com"
              required
            />
          </div>
          <div className="wide-field">
            <label className="field-label" htmlFor="profile-address">
              Business Address
            </label>
            <textarea
              id="profile-address"
              name="profileAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State, ZIP"
            />
          </div>

          <div className="wide-field" style={{ marginTop: '16px', padding: '16px 18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>💳</span>
              <div>
                <strong style={{ fontSize: '15px', color: '#14532d', display: 'block' }}>
                  Merchant UPI ID (VPA) & Digital Payments QR Code
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#166534' }}>
                  All invoice QR codes, Pay Now buttons, and Counter Standees will deposit payments directly into your bank account via this UPI ID.
                </p>
              </div>
            </div>
            <label className="field-label" htmlFor="profile-upi-id" style={{ marginTop: '10px', color: '#14532d', fontWeight: 600 }}>
              Your Bank / App UPI ID (VPA)
            </label>
            <input
              id="profile-upi-id"
              name="profileUpiId"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9876543210@paytm, shopname@icici, mobile@okhdfcbank, name@ybl"
              style={{ background: '#ffffff', borderColor: '#4ade80', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#374151' }}>
              <span>📱 <strong>Google Pay:</strong> Tap profile &rarr; UPI ID</span>
              <span>📱 <strong>PhonePe:</strong> Tap profile photo &rarr; My QR / UPI ID</span>
              <span>📱 <strong>Paytm:</strong> Tap top-left avatar &rarr; UPI ID</span>
              <span>📱 <strong>BHIM:</strong> Home screen &rarr; Profile &rarr; UPI ID</span>
            </div>
          </div>

          <div className="wide-field" style={{ marginTop: '24px', borderTop: '2px dashed var(--border, #e2e8f0)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  🛍️ Customer Online Storefront & WhatsApp E-Commerce
                </h3>
                <p className="panel-hint" style={{ margin: '4px 0 0 0' }}>
                  Customize how your public online store looks to customers. Changes reflect immediately on your live storefront.
                </p>
              </div>
              {setActiveTab && (
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => {
                    setActiveTab('store');
                    window.location.hash = 'store';
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Preview Live Store ↗</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="profile-store-name">
              Online Storefront Name
            </label>
            <input
              id="profile-store-name"
              name="profileStoreName"
              value={storeName}
              onChange={handleStoreNameChange}
              placeholder="Automatically filled from Company Name"
            />
            <span className="field-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Automatically fills from Company Name. Displays in storefront header, logo badge, and order confirmations.
            </span>
          </div>

          <div>
            <label className="field-label" htmlFor="profile-whatsapp">
              WhatsApp Orders Mobile Number *
            </label>
            <input
              id="profile-whatsapp"
              name="profileWhatsapp"
              value={whatsapp}
              onChange={handleWhatsappChange}
              placeholder="Automatically filled from Mobile Number"
              required
            />
            <span className="field-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Automatically fills from Mobile Number. Customers send 1-click cart orders directly to this WhatsApp number.
            </span>
          </div>

          <div className="wide-field">
            <label className="field-label" htmlFor="profile-store-tagline">
              Store Tagline / Subtitle
            </label>
            <input
              id="profile-store-tagline"
              name="profileStoreTagline"
              value={storeTagline}
              onChange={handleStoreTaglineChange}
              placeholder="Automatically filled from Business Tagline"
            />
            <span className="field-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Automatically fills from Business Tagline. Displayed under your storefront banner and brand header.
            </span>
          </div>

          <div>
            <label className="field-label" htmlFor="profile-fssai">
              FSSAI Food License Number
            </label>
            <input
              id="profile-fssai"
              name="profileFssai"
              value={fssai}
              onChange={(e) => setFssai(e.target.value)}
              placeholder="e.g. 10722026001234"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="profile-hours">
              Store Timings / Working Hours
            </label>
            <input
              id="profile-hours"
              name="profileHours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. Mon - Sun: 9:00 AM - 10:00 PM"
            />
          </div>

          <div className="wide-field" style={{ marginTop: '8px', padding: '14px 16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🏷️</span>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Storefront Discount Offers & Banners</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Your discount headline offers (e.g. <em>FLAT 20% OFF</em>), regional delivery notes, and hero background images can be edited directly on the live storefront using the in-place <strong>Banner Edit</strong> button.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="inline-actions">
        <button className="manual-button" type="submit">
          Save Business Profile
        </button>
        <button className="warning-button" type="button" onClick={onReset}>
          Reset Defaults
        </button>
      </div>
    </form>
  );
}
