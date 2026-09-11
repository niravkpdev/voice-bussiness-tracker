import React from 'react';
import { X, Send } from 'lucide-react';

export function ContactModal({ onClose, setStatus }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (setStatus) setStatus('Message sending coming soon. Please contact support by email.');
    onClose();
  };

  return (
    <div className="saas-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="saas-modal-content fade-in" style={{ maxWidth: '440px', width: '100%', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Contact Us</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close" type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="field-label" htmlFor="contact-name" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Name</label>
            <input id="contact-name" name="name" placeholder="Your name" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-email" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Email</label>
            <input id="contact-email" name="email" type="email" placeholder="you@company.com" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="field-label" htmlFor="contact-category" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Category</label>
              <select id="contact-category" name="category" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="Technical Support">Technical Support</option>
                <option value="Billing">Billing</option>
                <option value="Sales">Sales</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="contact-priority" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Priority</label>
              <select id="contact-priority" name="priority" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="contact-subject" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Subject</label>
            <input id="contact-subject" name="subject" placeholder="Brief summary" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-message" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Message</label>
            <textarea id="contact-message" name="message" rows="3" placeholder="How can we help?" required style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}></textarea>
          </div>
          
          <button type="submit" className="saas-primary-button full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px', minHeight: '38px', fontSize: '14px' }}>
            <Send size={16} /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
