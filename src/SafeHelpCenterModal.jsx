import React, { useState, useEffect } from 'react';

export function SafeHelpCenterModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    'Getting Started', 'Company Setup', 'Customers', 'Suppliers',
    'Inventory', 'Employees & HRMS', 'Orders & Invoices', 'Reports',
    'Billing', 'Troubleshooting'
  ];

  const articles = [
    'How to add your first customer',
    'How to add a product',
    'How to mark employee attendance',
    'How to create an invoice',
    'How to export inventory',
    'How to use demo mode',
    'How to contact support'
  ];

  const filteredArticles = articles.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleArticleClick = () => {
    alert('Article coming soon');
  };

  const handleContactSupport = () => {
    alert('Support message sending coming soon. Please contact support by email.');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif'
      }} onClick={(e) => e.stopPropagation()}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
        >
          &times;
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#111', fontSize: '24px' }}>Help Center</h2>
          <p style={{ margin: 0, color: '#666' }}>Find guides and support for Trinetr Business Suite.</p>
        </div>

        <input 
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '8px',
            border: '1px solid #ccc', marginBottom: '32px', fontSize: '16px'
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Categories</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {categories.map((cat, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '15px' }} onClick={handleArticleClick}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Popular Articles</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredArticles.map((art, idx) => (
                <li key={idx} style={{ marginBottom: '12px' }}>
                  <button style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 0, fontSize: '15px', textAlign: 'left' }} onClick={handleArticleClick}>
                    • {art}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #eee' }}>
          <button onClick={handleContactSupport} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', marginRight: '16px' }}>
            Contact Support
          </button>
          <button onClick={onClose} style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
