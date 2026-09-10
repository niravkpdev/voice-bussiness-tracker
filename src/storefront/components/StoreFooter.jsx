import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, Star, MessageCircle, Truck } from 'lucide-react';
import { STORE_INFO } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function StoreFooter({ onNavigate }) {
  const { generateWhatsAppOrderUrl, storeInfo, openDeliveryModal } = useStoreCart();
  const activeStore = storeInfo || STORE_INFO;

  const handleFloatingWhatsApp = () => {
    const cleanPhone = String(activeStore.whatsapp || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${activeStore.name}! I would like to inquire about your products and fresh snacks.`)}`;
    window.open(url, '_blank');
  };

  const mapQuery = encodeURIComponent(`${activeStore.name} ${activeStore.address}`);

  return (
    <footer className="trinetr-store-footer" style={{ background: '#0f172a', color: '#f8fafc' }}>
      {/* Animated Delivery Truck Road Strip */}
      <div 
        className="trinetr-delivery-road-strip" 
        style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}
      >
        <div className="trinetr-road-line">
          <div className="trinetr-truck-animation">
            <div className="trinetr-truck-icon" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: '1.5px solid #38bdf8' }}>
              <Truck size={22} color="#ffffff" />
              <span className="truck-tag" style={{ color: '#ffffff', fontWeight: 800 }}>⚡ Express Pan-India Delivery • Surat Kitchen Fresh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust, FSSAI & Google Review Showcase */}
      <div className="trinetr-trust-section" style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '28px 16px' }}>
        <div className="trinetr-trust-container">
          {/* FSSAI Certification */}
          <div className="trinetr-trust-card fssai-card" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px' }}>
            <div className="trust-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <ShieldCheck size={28} color="#10b981" />
            </div>
            <div className="trust-text">
              <h4 style={{ color: '#ffffff', fontSize: '15.5px', fontWeight: 800, margin: '0 0 4px 0' }}>We Are FSSAI Certified</h4>
              <p style={{ color: '#cbd5e1', fontSize: '12.5px', margin: 0, lineHeight: 1.5 }}>Adhering to the highest standards of food safety, hygiene, and authentic taste.</p>
            </div>
          </div>

          {/* Google Reviews */}
          <div className="trinetr-trust-card review-card" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px' }}>
            <div className="trust-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Star size={28} fill="#f59e0b" color="#f59e0b" />
            </div>
            <div className="trust-text">
              <h4 style={{ color: '#ffffff', fontSize: '15.5px', fontWeight: 800, margin: '0 0 4px 0' }}>Google 5-Star Rated Store</h4>
              <p style={{ color: '#cbd5e1', fontSize: '12.5px', margin: '0 0 6px 0', lineHeight: 1.5 }}>Loved by thousands of snack and food lovers across the region.</p>
              <a 
                href={`https://maps.google.com/?q=${mapQuery}`} 
                target="_blank" 
                rel="noreferrer" 
                className="google-review-link"
                style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 750, textDecoration: 'underline' }}
              >
                Click Here To Leave a Review! ⭐⭐⭐⭐⭐
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="trinetr-footer-main" style={{ background: '#0f172a' }}>
        <div className="trinetr-footer-container">
          {/* Brand Info */}
          <div className="trinetr-footer-col brand-col">
            <div className="trinetr-footer-logo">
              <span className="logo-text" style={{ color: '#ffffff', fontSize: '22px', fontWeight: 900 }}>{activeStore.name}</span>
              <span className="tagline" style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{activeStore.tagline}</span>
            </div>
            <p className="brand-description" style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6, margin: '12px 0 16px 0' }}>
              Handcrafted with pure quality and authentic recipes. 
              Offering {activeStore.varietiesCount || '100+'} varieties of fresh delicacies, snacks, and foods.
            </p>
            <div className="trinetr-social-links">
              <span className="social-pill" style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '5px 12px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700 }}>{activeStore.facebook || 'Facebook'}</span>
              <span className="social-pill" style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '5px 12px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700 }}>{activeStore.instagram || 'Instagram'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title" style={{ color: '#ffffff', fontSize: '15.5px', fontWeight: 800, margin: '0 0 16px 0' }}>Quick Explore</h4>
            <ul className="footer-links-list">
              <li><button type="button" onClick={() => onNavigate('store')} style={{ color: '#cbd5e1', fontSize: '13.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Home</button></li>
              <li><button type="button" onClick={() => onNavigate('categories')} style={{ color: '#cbd5e1', fontSize: '13.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>All Categories</button></li>
              <li><button type="button" onClick={() => onNavigate('shop')} style={{ color: '#cbd5e1', fontSize: '13.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Products Grid</button></li>
              <li><button type="button" onClick={() => onNavigate('product-menu')} style={{ color: '#cbd5e1', fontSize: '13.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Product List Menu</button></li>
              <li><button type="button" onClick={() => onNavigate('contact')} style={{ color: '#cbd5e1', fontSize: '13.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Contact & Location</button></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title" style={{ color: '#ffffff', fontSize: '15.5px', fontWeight: 800, margin: '0 0 16px 0' }}>Customer Care</h4>
            <ul className="footer-links-list">
              <li><span style={{ color: '#cbd5e1', fontSize: '13.5px' }}>Shipping: Express Delivery</span></li>
              <li><span style={{ color: '#cbd5e1', fontSize: '13.5px' }}>Orders: 1-Click WhatsApp Checkout</span></li>
              <li><span style={{ color: '#cbd5e1', fontSize: '13.5px' }}>Timings: {activeStore.hours || '9:00 AM - 10:00 PM'}</span></li>
              <li><span style={{ color: '#cbd5e1', fontSize: '13.5px' }}>Support: Fast Order Assistance</span></li>
              <li><span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700 }}>Coverage: Pan-India Express Dispatch</span></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title" style={{ color: '#ffffff', fontSize: '15.5px', fontWeight: 800, margin: '0 0 16px 0' }}>Talk To Us</h4>
            <div className="footer-contact-info">
              <div className="contact-item" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Phone size={16} color="#38bdf8" />
                <a href={`tel:${activeStore.phone}`} style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none', fontSize: '13.5px' }}>{activeStore.phone}</a>
              </div>
              <div className="contact-item" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Mail size={16} color="#38bdf8" />
                <a href={`mailto:${activeStore.email}`} style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none', fontSize: '13.5px' }}>{activeStore.email}</a>
              </div>
              <div className="contact-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <MapPin size={16} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5 }}>{activeStore.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="trinetr-footer-bottom" style={{ background: '#090d16', borderTop: '1px solid #1e293b', padding: '20px 16px' }}>
        <div className="trinetr-footer-bottom-inner">
          <p style={{ color: '#94a3b8', fontSize: '12.5px', margin: 0 }}>© {new Date().getFullYear()} {activeStore.name}. All Rights Reserved.</p>
          <p className="developed-by" style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Online E-Commerce Storefront Architecture.</p>
        </div>
      </div>

      {/* Persistent Floating WhatsApp Action Button */}
      <button
        type="button"
        className="trinetr-floating-whatsapp-btn"
        onClick={handleFloatingWhatsApp}
        title={`Chat with ${activeStore.name} on WhatsApp`}
        aria-label={`Chat with ${activeStore.name} on WhatsApp`}
      >
        <MessageCircle size={28} />
      </button>
    </footer>
  );
}
