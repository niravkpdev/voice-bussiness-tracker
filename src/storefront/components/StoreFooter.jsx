import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, Star, MessageCircle, Truck } from 'lucide-react';
import { STORE_INFO } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function StoreFooter({ onNavigate }) {
  const { generateWhatsAppOrderUrl, storeInfo } = useStoreCart();
  const activeStore = storeInfo || STORE_INFO;

  const handleFloatingWhatsApp = () => {
    const cleanPhone = String(activeStore.whatsapp || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${activeStore.name}! I would like to inquire about your products and fresh snacks.`)}`;
    window.open(url, '_blank');
  };

  const mapQuery = encodeURIComponent(`${activeStore.name} ${activeStore.address}`);

  return (
    <footer className="trinetr-store-footer">
      {/* Animated Delivery Truck Road Strip */}
      <div className="trinetr-delivery-road-strip">
        <div className="trinetr-road-line">
          <div className="trinetr-truck-animation">
            <div className="trinetr-truck-icon">
              <Truck size={24} />
              <span className="truck-tag">Fast Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust, FSSAI & Google Review Showcase */}
      <div className="trinetr-trust-section">
        <div className="trinetr-trust-container">
          {/* FSSAI Certification */}
          <div className="trinetr-trust-card fssai-card">
            <div className="trust-icon-box">
              <ShieldCheck size={28} className="text-emerald" />
            </div>
            <div className="trust-text">
              <h4>We Are FSSAI Certified</h4>
              <p>Adhering to the highest standards of food safety, hygiene, and authentic taste.</p>
            </div>
          </div>

          {/* Google Reviews */}
          <div className="trinetr-trust-card review-card">
            <div className="trust-icon-box">
              <Star size={28} fill="#f59e0b" color="#f59e0b" />
            </div>
            <div className="trust-text">
              <h4>Google 5-Star Rated Store</h4>
              <p>Loved by thousands of snack and food lovers across the region.</p>
              <a 
                href={`https://maps.google.com/?q=${mapQuery}`} 
                target="_blank" 
                rel="noreferrer" 
                className="google-review-link"
              >
                Click Here To Leave a Review! ⭐⭐⭐⭐⭐
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="trinetr-footer-main">
        <div className="trinetr-footer-container">
          {/* Brand Info */}
          <div className="trinetr-footer-col brand-col">
            <div className="trinetr-footer-logo">
              <span className="logo-text">{activeStore.name}</span>
              <span className="tagline">{activeStore.tagline}</span>
            </div>
            <p className="brand-description">
              Handcrafted with pure quality and authentic recipes. 
              Offering {activeStore.varietiesCount || '100+'} varieties of fresh delicacies, snacks, and foods.
            </p>
            <div className="trinetr-social-links">
              <span className="social-pill">{activeStore.facebook || 'Facebook'}</span>
              <span className="social-pill">{activeStore.instagram || 'Instagram'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title">Quick Explore</h4>
            <ul className="footer-links-list">
              <li><button type="button" onClick={() => onNavigate('store')}>Home</button></li>
              <li><button type="button" onClick={() => onNavigate('categories')}>All Categories</button></li>
              <li><button type="button" onClick={() => onNavigate('shop')}>Products Grid</button></li>
              <li><button type="button" onClick={() => onNavigate('product-menu')}>Product List Menu</button></li>
              <li><button type="button" onClick={() => onNavigate('contact')}>Contact & Location</button></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title">Customer Care</h4>
            <ul className="footer-links-list">
              <li><span>Shipping: Express Delivery</span></li>
              <li><span>Orders: 1-Click WhatsApp Checkout</span></li>
              <li><span>Timings: {activeStore.hours || '9:00 AM - 10:00 PM'}</span></li>
              <li><span>Support: Fast Order Assistance</span></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="trinetr-footer-col">
            <h4 className="footer-col-title">Talk To Us</h4>
            <div className="footer-contact-info">
              <div className="contact-item">
                <Phone size={16} />
                <a href={`tel:${activeStore.phone}`}>{activeStore.phone}</a>
              </div>
              <div className="contact-item">
                <Mail size={16} />
                <a href={`mailto:${activeStore.email}`}>{activeStore.email}</a>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>{activeStore.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="trinetr-footer-bottom">
        <div className="trinetr-footer-bottom-inner">
          <p>© {new Date().getFullYear()} {activeStore.name}. All Rights Reserved.</p>
          <p className="developed-by">Online E-Commerce Storefront Architecture.</p>
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
