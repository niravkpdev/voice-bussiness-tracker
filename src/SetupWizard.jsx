import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Building, Settings, Database, Activity, CheckSquare } from 'lucide-react';
import { generateSampleData } from './sampleData.js';

export function SetupWizard({ onComplete, profile, updateProfile }) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState(profile?.name || '');
  const [businessType, setBusinessType] = useState('Retail');
  const [industry, setIndustry] = useState('Technology');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');
  
  const [modules, setModules] = useState({
    dashboard: true,
    customers: true,
    inventory: true,
    employees: true,
    orders: true,
    reports: true
  });
  
  const [addDemoData, setAddDemoData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleFinish = async () => {
    if (loading) return;
    setLoading(true);
    let sampleDataSuccess = true;
    
    try {
      if (addDemoData) {
        try {
          window.demoData = generateSampleData();
        } catch (demoErr) {
          console.error('Failed to generate sample data', demoErr);
          sampleDataSuccess = false;
        }
      }
      
      try {
        await updateProfile({
          name: businessName,
          businessType,
          industry,
          country,
          currency,
          setupCompleted: true,
        });
      } catch (profileErr) {
        console.error('Failed to update profile', profileErr);
        // We continue even if saving to cloud failed, because the wrapper will have saved to localStorage
      }
      
      if (!sampleDataSuccess) {
        setToast('Sample data could not be added, but your workspace is ready.');
      } else {
        setToast('Workspace setup complete.');
      }
      
      setTimeout(() => {
        onComplete(addDemoData && sampleDataSuccess);
      }, 1500);
      
    } catch (e) {
      console.error(e);
      setToast('An unexpected error occurred. Proceeding to Dashboard.');
      setTimeout(() => {
        onComplete(false);
      }, 1500);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="hrms-drawer-overlay" style={{ zIndex: 10000 }}>
      <div className="setup-wizard-container" style={{ 
        background: 'var(--bg-primary)', 
        borderRadius: '16px', 
        width: '100%', 
        maxWidth: '560px',
        margin: '5vh auto',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Workspace Setup</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Step {step} of 4</p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Activity size={32} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>Welcome to Trinetr Business Suite</h3>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '400px', margin: '0 auto' }}>
                Set up your business workspace in a few minutes. We'll configure your dashboard, CRM, inventory, and more.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="saas-form">
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Business Details</h3>
              <div className="form-group wide-field" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Business Name</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Business Type</label>
                  <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>Services</option>
                    <option>Manufacturing</option>
                    <option>SaaS / Tech</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Industry</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Retail</option>
                    <option>Consulting</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                    <option>Canada</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <option>INR (₹)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Modules Setup</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Select the tools you plan to use.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.entries(modules).map(([key, value]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', background: value ? 'var(--bg-secondary)' : 'transparent' }}>
                    <input 
                      type="checkbox" 
                      checked={value} 
                      onChange={e => setModules({...modules, [key]: e.target.checked})} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
                    />
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{key}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--bg-secondary)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Database size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Add Sample Data?</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '400px', margin: '0 auto 32px' }}>
                Would you like to populate your workspace with realistic sample data (Customers, Products, Invoices)? This is highly recommended to see how the app works.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
                <button 
                  type="button" 
                  className={`saas-primary-button full ${addDemoData ? '' : 'secondary'}`}
                  style={!addDemoData ? { background: 'var(--bg-secondary)', color: 'var(--text-primary)' } : {}}
                  onClick={() => setAddDemoData(true)}
                >
                  <CheckSquare size={16} style={{ marginRight: '8px' }} />
                  Yes, add sample data
                </button>
                <button 
                  type="button" 
                  className={`saas-primary-button full ${!addDemoData ? '' : 'secondary'}`}
                  style={addDemoData ? { background: 'var(--bg-secondary)', color: 'var(--text-primary)' } : {}}
                  onClick={() => setAddDemoData(false)}
                >
                  No, start empty
                </button>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div style={{ padding: '12px 24px', background: 'var(--brand-primary)', color: 'white', textAlign: 'center', fontWeight: 500, fontSize: '14px' }}>
            {toast}
          </div>
        )}
        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className="saas-outline-button" 
            onClick={prevStep}
            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          
          {step < 4 ? (
            <button type="button" className="saas-primary-button" onClick={nextStep}>
              Continue <ArrowRight size={16} style={{ marginLeft: '8px' }} />
            </button>
          ) : (
            <button type="button" className="saas-primary-button" onClick={handleFinish} disabled={loading}>
              {loading ? 'Setting up...' : 'Finish & Go to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
