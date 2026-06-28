import React from 'react';
import { Briefcase, CheckCircle, AlertCircle, FileText, BarChart2, TrendingUp, Key, CheckSquare, Settings, Copy, Download } from 'lucide-react';

export function AcquisitionPackage() {
  
  const handleExport = (type) => {
    // Show toast or alert safely if PDF generation isn't wired yet
    alert(`${type} export coming soon. Please copy the text manually for now.`);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase size={32} color="var(--brand-primary)" />
            Buyer Readiness Package
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Due diligence documents, tech stack details, and handover instructions for Acquire.com listing.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="secondary-button" onClick={() => handleExport('Product Summary PDF')}><Download size={16} style={{marginRight:'8px'}}/> Summary PDF</button>
          <button className="saas-primary-button" onClick={() => handleExport('Technical Handover PDF')}><Download size={16} style={{marginRight:'8px'}}/> Tech Handover PDF</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20}/> Business Metrics</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>MRR</span> <strong>₹0 / Not started</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customers</span> <strong>0 (Beta Phase)</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Demo Users</span> <strong>Active (Local analytics)</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Signups</span> <strong>Tracking ready</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Monthly Visitors</span> <strong>Tracking ready</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Conversion Rate</span> <strong>Pending data</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Operating Cost</span> <strong>~$0 (Vercel/Supabase Free Tiers)</strong></li>
          </ul>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20}/> Tech Stack</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Frontend</span> <strong>React / Vite</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Backend & Auth</span> <strong>Supabase</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Database</span> <strong>PostgreSQL (Supabase)</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hosting</span> <strong>Vercel</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Styling</span> <strong>Vanilla CSS / Design System</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Analytics</span> <strong>GA4 / Clarity / PostHog (Ready)</strong></li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Gateway</span> <strong>Stripe / Razorpay (Prepared)</strong></li>
          </ul>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Product Summary</h2>
        <p style={{ lineHeight: '1.6', marginBottom: '16px', color: 'var(--text-secondary)' }}>
          Trinetr Business Suite is an AI-assisted business management SaaS for small businesses, retailers, wholesalers, service providers, and growing teams.
          It streamlines operations by allowing users to manage core business functions from a single, unified dashboard.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Core Capabilities:</h3>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px' }}>
              <li>Customers CRM</li>
              <li>Suppliers Management</li>
              <li>Inventory & Stock Tracking</li>
              <li>Employee HRMS & Attendance</li>
              <li>Orders & Invoicing</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Target Customers:</h3>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px' }}>
              <li>Small Retailers</li>
              <li>Wholesalers</li>
              <li>Service Agencies</li>
              <li>Freelancers</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Feature Matrix</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px' }}>Module</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Dashboard', status: 'Completed', color: 'green' },
                { name: 'Customers CRM', status: 'Completed', color: 'green' },
                { name: 'Employees HRMS & Attendance', status: 'Completed', color: 'green' },
                { name: 'Inventory', status: 'Completed', color: 'green' },
                { name: 'Demo Mode & Onboarding', status: 'Completed', color: 'green' },
                { name: 'Pricing/Billing foundation', status: 'Completed', color: 'green' },
                { name: 'Legal Pages & Trust Center', status: 'Completed', color: 'green' },
                { name: 'Analytics foundation', status: 'Completed', color: 'green' },
                { name: 'Suppliers', status: 'In Progress', color: 'orange' },
                { name: 'Orders & Invoices', status: 'In Progress', color: 'orange' },
                { name: 'Reports', status: 'Coming Soon', color: 'blue' },
                { name: 'GST Center', status: 'Coming Soon', color: 'blue' },
                { name: 'AI Assistant', status: 'Coming Soon', color: 'blue' }
              ].map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{f.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600,
                      background: f.color === 'green' ? '#dcfce7' : f.color === 'orange' ? '#fef08a' : '#dbeafe',
                      color: f.color === 'green' ? '#166534' : f.color === 'orange' ? '#854d0e' : '#1e40af'
                    }}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={24}/> Growth Opportunities</h2>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Target small retailers and wholesalers with targeted ads.</li>
            <li>Activate Razorpay/Stripe checkout to start collecting MRR.</li>
            <li>Launch a native Android app wrapper.</li>
            <li>Add WhatsApp invoice sharing for instant client billing.</li>
            <li>Improve AI assistant with deep backend logic.</li>
            <li>Add GST-compliant reporting for Indian businesses.</li>
            <li>Build marketplace integrations (Shopify, WooCommerce).</li>
            <li>Add specific "Accountant Access" role.</li>
            <li>Start SEO and content marketing on the Help Center platform.</li>
            <li>Launch a referral/affiliate program.</li>
          </ul>
        </div>

        <div className="panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={24}/> Known Limitations</h2>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Live payment gateways are structurally ready but not fully activated.</li>
            <li>Real customer traction is still pending; user base is currently zero.</li>
            <li>Some advanced reports may require deeper accounting validation before scaling.</li>
            <li>Mobile app is currently a responsive PWA, not native.</li>
            <li>AI features will require backend API integrations and cost monitoring.</li>
            <li>Legal content uses placeholder text and should undergo professional legal review before full commercial launch.</li>
          </ul>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckSquare size={24}/> Handover Checklist</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', color: 'var(--text-secondary)' }}>
          {['GitHub repository access', 'Vercel project transfer', 'Supabase project transfer', 'Environment variables (.env)', 'Database schema instructions', 'Edge functions (if any)', 'Deployment instructions', 'Admin account credentials', 'Domain transfer', 'Brand assets (Logos, SVG)', 'Documentation', 'Support email inbox', 'Legal pages content', 'Analytics accounts (GA4/Clarity)'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" readOnly checked={false} style={{ width: '16px', height: '16px' }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Roadmap</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--brand-primary)' }}>Next 30 Days: Foundation & Launch</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
              <li>Acquire first 10 pilot users</li>
              <li>Activate live payment integration</li>
              <li>Record and embed product demo video</li>
              <li>Finalize basic Help Center documentation</li>
              <li>Post-launch bug fixing</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--brand-primary)' }}>Next 60 Days: Traction & Marketing</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
              <li>Gather and publish customer testimonials</li>
              <li>Publish SEO-optimized landing pages</li>
              <li>Expand Help Center articles</li>
              <li>Launch customer referral program</li>
              <li>Improve analytical reporting modules</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--brand-primary)' }}>Next 90 Days: Expansion & Handover Prep</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
              <li>Publish native mobile app wrappers (App Store / Play Store)</li>
              <li>Implement WhatsApp invoice sharing</li>
              <li>Rollout advanced AI insights and suggestions</li>
              <li>Enhance multi-company and multi-branch support</li>
              <li>Finalize Buyer Data Room preparation for Acquire.com</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px', marginBottom: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={24}/> Demo Account Access</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Share these credentials with potential buyers for sandbox testing. <br/>
          <strong>Note:</strong> Change these credentials in the backend before sharing publicly.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '250px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Demo URL</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>https://voice-bussiness-tracker.vercel.app</strong>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)' }} onClick={() => handleCopy('https://voice-bussiness-tracker.vercel.app')}><Copy size={16}/></button>
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '250px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Demo Email</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>buyer@trinetr.demo</strong>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)' }} onClick={() => handleCopy('buyer@trinetr.demo')}><Copy size={16}/></button>
            </div>
          </div>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', flex: 1, minWidth: '250px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Demo Password</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>TrinetrBuyer2026!</strong>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)' }} onClick={() => handleCopy('TrinetrBuyer2026!')}><Copy size={16}/></button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Buyer FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[
            { q: 'What does the product do?', a: 'It acts as an all-in-one business management suite with CRM, HRMS, Inventory, and Order management, designed with AI-assistance in mind.' },
            { q: 'Who is it for?', a: 'Small business owners, independent retailers, wholesalers, and service agencies looking for a unified dashboard to replace fragmented tools.' },
            { q: 'What is the tech stack?', a: 'React/Vite on the frontend, Supabase for auth and PostgreSQL database, hosted on Vercel.' },
            { q: 'Is it live?', a: 'Yes, the infrastructure is fully deployed and capable of accepting registrations.' },
            { q: 'Does it have customers?', a: 'Not yet. It is currently in a launch-ready state.' },
            { q: 'Does it generate revenue?', a: 'No, MRR is currently zero. The monetization foundation (pricing plans) is built but requires payment gateway activation.' },
            { q: 'What work is still needed?', a: 'Stripe/Razorpay integration, legal document finalization, and the activation of some pending modules like GST reports.' },
            { q: 'How can it grow?', a: 'Through targeted local SEO, aggressive social media marketing for SMBs, and building highly requested features like WhatsApp invoicing.' },
            { q: 'What assets are included?', a: 'Full source code (GitHub), Vercel project, Supabase database, domain (if applicable), and all brand assets.' },
            { q: 'How difficult is handover?', a: 'Very straightforward. Environment variables are localized, and transferring Vercel and Supabase projects usually takes less than 24 hours.' }
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: i === 9 ? 'none' : '1px solid var(--border-subtle)', paddingBottom: i === 9 ? 0 : '16px' }}>
              <h4 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#111' }}>{faq.q}</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
