import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { STORE_INFO } from '../data/namkeenData';
import { useStoreCart } from '../context/StoreCartContext';

export function ContactView() {
  const { storeInfo } = useStoreCart();
  const activeStore = storeInfo || STORE_INFO;
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="trinetr-contact-page-wrapper">
      <div className="trinetr-contact-header-banner">
        <h2 className="trinetr-contact-title">Keep In Touch With Us</h2>
        <div className="trinetr-breadcrumbs">
          <span>Home</span> &gt; <span>Contact Us</span>
        </div>
      </div>

      <div className="trinetr-contact-content-grid">
        {/* Contact Form */}
        <div className="trinetr-contact-form-box">
          <h3 className="form-title">Send A Message</h3>
          <p className="form-sub">Have questions regarding wholesale bulk orders, wedding packages, or custom gift hampers? Let us know!</p>

          {submitted ? (
            <div className="contact-submitted-box">
              <CheckCircle size={44} className="text-emerald" />
              <h4>Message Sent Successfully!</h4>
              <p>Thank you for reaching out, {form.name}. Our {activeStore.name} team will get back to you shortly.</p>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Your Email / Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your email or phone"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Bulk Namkeen Order / Delivery Inquiry"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Your Message *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button type="submit" className="trinetr-contact-submit-btn">
                <Send size={16} />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>

        {/* Store Information Sidebar */}
        <div className="trinetr-contact-info-card">
          <h3 className="info-card-title">Our Shop Location</h3>
          <p className="info-card-desc">
            Visit our physical location or order directly via WhatsApp for freshly prepared orders delivered to your doorstep!
          </p>

          <div className="info-list">
            <div className="info-item">
              <MapPin size={20} className="icon" />
              <div>
                <h5>Physical Store</h5>
                <p>{activeStore.address}</p>
              </div>
            </div>

            <div className="info-item">
              <Clock size={20} className="icon" />
              <div>
                <h5>Store Timings</h5>
                <p>{activeStore.hours}</p>
              </div>
            </div>

            <div className="info-item">
              <Phone size={20} className="icon" />
              <div>
                <h5>Direct Call & WhatsApp</h5>
                <p>{activeStore.phone}</p>
              </div>
            </div>

            <div className="info-item">
              <Mail size={20} className="icon" />
              <div>
                <h5>Email Inquiries</h5>
                <p>{activeStore.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
