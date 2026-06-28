import React, { useState } from 'react';

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const categories = [
    { title: 'Getting Started', articles: ['How to set up your profile', 'Navigating the dashboard', 'Quick Add basics'] },
    { title: 'Company Setup', articles: ['Adding your company details', 'Managing permissions', 'Exporting data'] },
    { title: 'Customers', articles: ['How to add your first customer', 'Managing customer notes', 'Deleting a customer'] },
    { title: 'Inventory', articles: ['How to add a product', 'Tracking stock levels', 'How to export inventory'] },
    { title: 'Employees & HRMS', articles: ['Adding an employee', 'How to mark employee attendance', 'Managing payroll'] },
    { title: 'Orders & Invoices', articles: ['How to create an invoice', 'Sending invoices via email', 'Tracking payments'] },
    { title: 'Billing', articles: ['Upgrading your plan', 'Managing payment methods', 'Viewing past invoices'] },
    { title: 'Troubleshooting', articles: ['How to use demo mode', 'Resetting your password', 'Contacting support'] }
  ];

  const goBack = () => {
    window.location.hash = 'dashboard';
  };

  const goContact = () => {
    alert('Contact Support coming soon. Please email support@trinetr.com.');
  };

  if (selectedArticle) {
    return (
      <div style={{ padding: '60px 20px', minHeight: '100vh', background: 'var(--bg-secondary)', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setSelectedArticle(null)} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', background: '#eee', border: 'none', borderRadius: '4px' }}>
            &larr; Back to Help Center
          </button>
          <h2>{selectedArticle}</h2>
          <p style={{ lineHeight: '1.6', marginTop: '20px', color: '#555' }}>
            <strong>Article coming soon!</strong><br/><br/>
            Support articles are currently being drafted by our documentation team.
          </p>
          <button onClick={goContact} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  const filteredCategories = categories.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.articles.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '60px 20px', minHeight: '100vh', background: 'var(--bg-secondary)', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1>Help Center</h1>
          <p style={{ color: '#555', marginBottom: '20px' }}>Find guides and support for Trinetr Business Suite.</p>
          <input 
            type="text" 
            placeholder="Search help articles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: '500px', padding: '12px 20px', fontSize: '16px', borderRadius: '24px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredCategories.map((cat, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, color: '#111' }}>{cat.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cat.articles.map((art, artIdx) => (
                  <li key={artIdx} style={{ marginBottom: '10px' }}>
                    <button 
                      onClick={() => setSelectedArticle(art)}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {art}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <button onClick={goContact} style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Contact Support
          </button>
          <button onClick={goBack} style={{ padding: '10px 20px', cursor: 'pointer', background: '#eee', color: '#333', border: 'none', borderRadius: '4px' }}>
            Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
