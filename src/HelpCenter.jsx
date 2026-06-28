import React, { useState } from 'react';
import { Search, ChevronRight, BookOpen, Users, Package, FileText, Settings, PlayCircle, CreditCard, LifeBuoy } from 'lucide-react';

const CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started', icon: <PlayCircle size={24} />, articles: ['How to set up your profile', 'Navigating the dashboard', 'Quick Add basics'] },
  { id: 'company-setup', title: 'Company Setup', icon: <Settings size={24} />, articles: ['Adding your company details', 'Managing permissions', 'Exporting data'] },
  { id: 'customers', title: 'Customers', icon: <Users size={24} />, articles: ['How to add your first customer', 'Managing customer notes', 'Deleting a customer'] },
  { id: 'inventory', title: 'Inventory', icon: <Package size={24} />, articles: ['How to add a product', 'Tracking stock levels', 'How to export inventory'] },
  { id: 'employees', title: 'Employees & HRMS', icon: <Users size={24} />, articles: ['Adding an employee', 'How to mark employee attendance', 'Managing payroll'] },
  { id: 'orders', title: 'Orders & Invoices', icon: <FileText size={24} />, articles: ['How to create an invoice', 'Sending invoices via email', 'Tracking payments'] },
  { id: 'billing', title: 'Billing', icon: <CreditCard size={24} />, articles: ['Upgrading your plan', 'Managing payment methods', 'Viewing past invoices'] },
  { id: 'troubleshooting', title: 'Troubleshooting', icon: <LifeBuoy size={24} />, articles: ['How to use demo mode', 'Resetting your password', 'Contacting support'] }
];

export function HelpCenter({ onBack, onContact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const renderArticle = () => (
    <div className="fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-primary)', borderRadius: '12px' }}>
      <button className="secondary-button" style={{ marginBottom: '24px' }} onClick={() => setSelectedArticle(null)}>
        &larr; Back to Help Center
      </button>
      <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>{selectedArticle}</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong>Article coming soon!</strong><br/><br/>Support articles are currently being drafted by our documentation team.
        If you need immediate assistance with this topic, please reach out to our support team directly.
      </p>
      <div style={{ marginTop: '32px' }}>
        <button className="saas-primary-button" onClick={onContact}>Contact Support</button>
      </div>
    </div>
  );

  if (selectedArticle) return renderArticle();

  const filteredCategories = CATEGORIES.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery) || 
    cat.articles.some(art => art.toLowerCase().includes(searchQuery))
  );

  return (
    <section className="saas-section fade-in" style={{ padding: '60px 20px', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="saas-container" style={{ maxWidth: '1000px' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>Help Center</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Find answers, guides, and troubleshooting tips for Trinetr Business Suite.
          </p>
          
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search for articles..." 
              value={searchQuery}
              onChange={handleSearch}
              style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: '1rem', borderRadius: '999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}
            />
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filteredCategories.map(category => (
            <div key={category.id} style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--brand-primary)' }}>
                {category.icon}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{category.title}</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {category.articles.map(article => (
                  <li key={article}>
                    <button 
                      type="button" 
                      onClick={() => setSelectedArticle(article)}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left' }}
                    >
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{article}</span>
                      <ChevronRight size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '64px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Can't find what you're looking for?</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="saas-primary-button" onClick={onContact}>Contact Support</button>
            <button className="secondary-button" onClick={onBack}>Back to Home</button>
          </div>
        </div>

      </div>
    </section>
  );
}
