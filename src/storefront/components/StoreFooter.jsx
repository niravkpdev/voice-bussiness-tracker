import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, Star, MessageCircle, Truck } from 'lucide-react';
import { STORE_INFO } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function StoreFooter({ onNavigate }) {
  const { generateWhatsAppOrderUrl } = useStoreCart();

  const handleFloatingWhatsApp = () => {
    const cleanPhone = STORE_INFO.whatsapp.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello Bhole G Namkeen! I would like to inquire about your fresh farsan and snacks.")}`;
    window.open(url, '_blank');
  };

  return (
    <footer className="bhole-store-footer">
      {/* Animated Delivery Truck Road Strip */}
      <div className="bhole-delivery-road-strip">
        <div className="bhole-road-line">
          <div className="bhole-truck-animation">
            <div className="bhole-truck-icon">
              <Truck size={24} />
              <span className="truck-tag">Fast Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust, FSSAI & Google Review Showcase */}
      <div className="bhole-trust-section">
        <div className="bhole-trust-container">
          {/* FSSAI Certification */}
          <div className="bhole-trust-card fssai-card">
            <div className="trust-icon-box">
              <ShieldCheck size={28} className="text-emerald" />
            </div>
            <div className="trust-text">
              <h4>We Are FSSAI Certified</h4>
              <p>Adhering to the highest standards of food safety, hygiene, and authentic taste.</p>
              <span className="fssai-license">Lic No: {STORE_INFO.fssaiNumber}</span>
            </div>
          </div>

          {/* Google Reviews */}
          <div className="bhole-trust-card review-card">
            <div className="trust-icon-box">
              <Star size={28} fill="#f59e0b" color="#f59e0b" />
            </div>
            <div className="trust-text">
              <h4>Google 5-Star Rated Store</h4>
              <p>Loved by 50,000+ farsan and namkeen lovers across Gujarat and India.</p>
              <a 
                href="https://maps.google.com/?q=Bhole+G+Namkeen+Surat" 
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

      {/* Store Location Map */}
      <div className="bhole-map-section">
        <div className="bhole-map-wrapper">
          <iframe
            title="Bhole G Namkeen Surat Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.8249826391494!2d72.8315486!3d21.1991054!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04e5f0d7e4cf7%3A0x861ec6e0339ad61b!2sMahidharpura%2C%20Haripura%2C%20Surat%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1699999999999!5m2!1sen!2sin"
            width="100%"
            height="260"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="bhole-footer-main">
        <div className="bhole-footer-container">
          {/* Brand Info */}
          <div className="bhole-footer-col brand-col">
            <div className="bhole-footer-logo">
              <span className="logo-text">{STORE_INFO.name}</span>
              <span className="tagline">{STORE_INFO.tagline}</span>
            </div>
            <p className="brand-description">
              Handcrafted with pure groundnut oil and authentic Gujarati recipes since {STORE_INFO.establishedYear}. 
              Offering {STORE_INFO.varietiesCount} varieties of fresh gathiya, wafers, chana, and snacks.
            </p>
            <div className="bhole-social-links">
              <span className="social-pill">{STORE_INFO.facebook}</span>
              <span className="social-pill">{STORE_INFO.instagram}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bhole-footer-col">
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
          <div className="bhole-footer-col">
            <h4 className="footer-col-title">Customer Care</h4>
            <ul className="footer-links-list">
              <li><span>Shipping: All India Delivery</span></li>
              <li><span>Surat City: Cash on Delivery</span></li>
              <li><span>Timings: {STORE_INFO.hours}</span></li>
              <li><span>Support: 12 Hours / 6 Days</span></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="bhole-footer-col">
            <h4 className="footer-col-title">Talk To Us</h4>
            <div className="footer-contact-info">
              <div className="contact-item">
                <Phone size={16} />
                <a href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a>
              </div>
              <div className="contact-item">
                <Mail size={16} />
                <a href={`mailto:${STORE_INFO.email}`}>{STORE_INFO.email}</a>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>{STORE_INFO.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bhole-footer-bottom">
        <div className="bhole-footer-bottom-inner">
          <p>© {new Date().getFullYear()} {STORE_INFO.name}. All Rights Reserved.</p>
          <p className="developed-by">Designed with authentic Indian Snack Storefront Architecture.</p>
        </div>
      </div>

      {/* Persistent Floating WhatsApp Action Button */}
      <button
        type="button"
        className="bhole-floating-whatsapp-btn"
        onClick={handleFloatingWhatsApp}
        title="Chat with Store on WhatsApp"
        aria-label="Chat with Store on WhatsApp"
      >
        <MessageCircle size={28} />
      </button>
    </footer>
  );
}
