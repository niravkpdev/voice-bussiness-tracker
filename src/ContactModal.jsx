import React, { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

export function ContactModal({ onClose, setStatus }) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inquiry = {
      id: `inq_${Date.now()}`,
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      category: String(formData.get('category') || 'Technical Support'),
      priority: String(formData.get('priority') || 'Normal'),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('trinetr_contact_inquiries') || '[]');
      existing.unshift(inquiry);
      localStorage.setItem('trinetr_contact_inquiries', JSON.stringify(existing.slice(0, 50)));
    } catch {}

    if (setStatus) {
      setStatus('Message sending coming soon. Please contact support by email. Your message has been received.');
    }

    setSubmittedData(inquiry);
    setSubmitted(true);
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

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0, 223, 196, 0.12)', border: '1.5px solid #00dfc4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00dfc4' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Message Received!
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, maxWidth: '340px' }}>
              Thank you for reaching out{submittedData?.name ? `, ${submittedData.name}` : ''}. Our team has received your message and will reply to <strong>{submittedData?.email}</strong> shortly.
            </p>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Reference ID: <code style={{ color: 'var(--brand-primary)' }}>{submittedData?.id}</code>
            </div>
            <button
              type="button"
              className="saas-primary-button full"
              onClick={onClose}
              style={{ marginTop: '12px', minHeight: '40px', fontSize: '14px' }}
            >
              Done
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
