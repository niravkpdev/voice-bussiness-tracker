import React, { useState, useEffect } from 'react';

// Data definitions
const helpData = {
  "Getting Started": [
    { title: "How to set up your company", content: ["Go to Company Settings from the top right profile menu.", "Fill in your company name, GST, and address.", "Click Save."] },
    { title: "How to use dashboard", content: ["The dashboard gives you an overview of your business health.", "Check total revenue, profit, and pending tasks.", "Click any card to drill down into the specific module."] },
    { title: "How to use voice command", content: ["Click the Mic icon on the Dashboard or Voice Bookkeeper.", "Speak clearly (e.g., 'Add customer John Doe').", "Review the parsed command and confirm."] }
  ],
  "Company Setup": [],
  "Customers": [
    { title: "How to add your first customer", content: ["Go to Customers or Party Management.", "Click New Party / Add Customer.", "Enter name, phone, email, opening balance if needed.", "Click Save.", "The customer will appear in the list."] },
    { title: "How to edit customer details", content: ["Go to Customers or Party Management.", "Click on the customer to view their profile.", "Click Edit Profile.", "Update the details and save."] },
    { title: "How to check outstanding balance", content: ["Go to Customers.", "The outstanding balance is shown in the main list.", "Click a customer to see their full transaction history and ledger."] }
  ],
  "Suppliers": [
    { title: "How to add supplier", content: ["Go to Suppliers or Party Management.", "Click Add Supplier.", "Fill in the required details.", "Save."] },
    { title: "How to record supplier payment", content: ["Go to Vouchers or Party Management.", "Select the supplier.", "Add a new Payment Voucher.", "Enter the amount and mode (Cash/Bank).", "Save."] }
  ],
  "Inventory": [
    { title: "How to add a product", content: ["Go to Inventory.", "Click Add Item.", "Enter item name, category, and pricing.", "Set the initial stock quantity.", "Save."] },
    { title: "How to update stock", content: ["Go to Inventory.", "Click on the product.", "Use Stock In or Stock Out buttons to adjust quantity.", "Enter the reason/reference.", "Save."] },
    { title: "How to export inventory", content: ["Go to Inventory.", "Click the Export button at the top right.", "Choose CSV or Excel format.", "Download the file."] }
  ],
  "Employees & HRMS": [
    { title: "How to add employee", content: ["Go to HRMS.", "Click Add Employee.", "Enter their personal and salary details.", "Save."] },
    { title: "How to mark employee attendance", content: ["Go to HRMS.", "Click Mark Attendance.", "Select Present, Absent, or Half Day for each employee.", "Submit the daily attendance."] },
    { title: "How to upload employee document", content: ["Go to the employee's profile in HRMS.", "Click Upload Document.", "Select the file (e.g., ID Proof).", "Upload and save."] }
  ],
  "Orders & Invoices": [
    { title: "How to create an invoice", content: ["Go to Orders & Invoices.", "Click Create Invoice.", "Select the customer.", "Add items to the invoice.", "Apply any discounts or taxes.", "Save and Generate."] },
    { title: "How to add receipt", content: ["Go to Vouchers.", "Select Receipt Voucher type.", "Choose the customer.", "Enter the received amount.", "Save."] },
    { title: "How to add payment", content: ["Go to Vouchers.", "Select Payment Voucher type.", "Choose the supplier or expense account.", "Enter the paid amount.", "Save."] },
    { title: "How to use voucher entry", content: ["Go to Vouchers.", "Select the voucher type (Receipt, Payment, Journal, Contra).", "Fill in the debit and credit accounts.", "Enter the amounts and narration.", "Save."] }
  ],
  "Reports": [],
  "Billing": [],
  "Troubleshooting": [
    { title: "How to contact support", content: ["Click the Contact Support button at the bottom of the Help Center.", "Send an email with your issue details.", "We will respond within 24 hours."] }
  ]
};

// Flatten for popular and search
const allArticles = Object.entries(helpData).flatMap(([category, articles]) => 
  articles.map(article => ({ ...article, category }))
);

const popularArticleTitles = [
  'How to add your first customer',
  'How to add a product',
  'How to mark employee attendance',
  'How to create an invoice',
  'How to export inventory',
  'How to use voice command',
  'How to contact support'
];

export function SafeHelpCenterModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedArticle(null);
    onClose();
  };

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@trinetr.co.uk";
  };

  // Content rendering
  let content;

  if (selectedArticle) {
    // Article Detail View
    content = (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', padding: '0', marginRight: '16px' }}>
            ← Back
          </button>
          <span style={{ color: '#666', fontSize: '14px' }}>{selectedArticle.category}</span>
        </div>
        <h2 style={{ color: '#111', fontSize: '22px', marginBottom: '16px', lineHeight: '1.4' }}>{selectedArticle.title}</h2>
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: '1.8' }}>
            {selectedArticle.content.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '12px' }}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    );
  } else if (selectedCategory) {
    // Category View
    const categoryArticles = helpData[selectedCategory] || [];
    content = (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', padding: '0' }}>
            ← Back to Categories
          </button>
        </div>
        <h2 style={{ color: '#111', fontSize: '22px', marginBottom: '20px' }}>{selectedCategory}</h2>
        {categoryArticles.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {categoryArticles.map((art, idx) => (
              <li key={idx} style={{ marginBottom: '12px' }}>
                <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#111', cursor: 'pointer', padding: '16px', fontSize: '15px', textAlign: 'left', width: '100%', borderRadius: '8px', display: 'block', transition: 'all 0.2s' }} onClick={() => setSelectedArticle(art)}>
                  {art.title}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666', padding: '24px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>No articles available in this category yet.</p>
        )}
      </div>
    );
  } else if (searchQuery.trim().length > 0) {
    // Search Results View
    const searchResults = allArticles.filter(a => 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    content = (
      <div>
        <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Search Results</h3>
        {searchResults.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {searchResults.map((art, idx) => (
              <li key={idx} style={{ marginBottom: '12px' }}>
                <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#111', cursor: 'pointer', padding: '16px', fontSize: '15px', textAlign: 'left', width: '100%', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={() => setSelectedArticle(art)}>
                  <span>{art.title}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>{art.category}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666', padding: '24px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>No help articles found.</p>
        )}
      </div>
    );
  } else {
    // Main View
    const popularArticles = allArticles.filter(a => popularArticleTitles.includes(a.title));
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Categories</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {Object.keys(helpData).map((cat, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  <button style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px 0', fontSize: '15px', textAlign: 'left', width: '100%' }} onClick={() => setSelectedCategory(cat)}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#111' }}>Popular Articles</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {popularArticles.map((art, idx) => (
                <li key={idx} style={{ marginBottom: '12px' }}>
                  <button style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 0, fontSize: '15px', textAlign: 'left' }} onClick={() => setSelectedArticle(art)}>
                    • {art.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box'
    }} onClick={handleClose}>
      
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
        maxHeight: '85vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex', flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        <button 
          onClick={handleClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666', padding: '4px 12px', zIndex: 10 }}
        >
          &times;
        </button>

        <div style={{ padding: '32px 32px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#111', fontSize: '24px' }}>Help Center</h2>
            <p style={{ margin: 0, color: '#666' }}>Find guides and support for Trinetr Business Suite.</p>
          </div>

          {(!selectedArticle && !selectedCategory) && (
            <input 
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px', boxSizing: 'border-box',
                border: '1px solid #ccc', marginBottom: '24px', fontSize: '16px'
              }}
            />
          )}

          {content}
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', padding: '24px', borderTop: '1px solid #eee', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
          <button onClick={handleContactSupport} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', marginRight: '16px', marginBottom: '8px' }}>
            Contact Support
          </button>
          <button onClick={handleClose} style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', marginBottom: '8px' }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
