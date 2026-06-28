import React from 'react';
import { X, Send } from 'lucide-react';

export function ContactModal({ onClose, setStatus }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (setStatus) setStatus('Message sending coming soon. Please contact support by email.');
    onClose();
  };

  return (
    <div className="saas-modal-overlay">
      <div className="saas-modal-content fade-in" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Contact Us</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="field-label" htmlFor="contact-name">Name</label>
            <input id="contact-name" name="name" placeholder="Your name" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-email">Email</label>
            <input id="contact-email" name="email" type="email" placeholder="you@company.com" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="field-label" htmlFor="contact-category">Category</label>
              <select id="contact-category" name="category" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="Technical Support">Technical Support</option>
                <option value="Billing">Billing</option>
                <option value="Sales">Sales</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="contact-priority">Priority</label>
              <select id="contact-priority" name="priority" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="contact-subject">Subject</label>
            <input id="contact-subject" name="subject" placeholder="Brief summary" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-message">Message</label>
            <textarea id="contact-message" name="message" rows="4" placeholder="How can we help?" required style={{ width: '100%', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}></textarea>
          </div>
          
          <button type="submit" className="saas-primary-button full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <Send size={16} /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
