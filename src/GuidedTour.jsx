import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_STEPS = [
  {
    target: '.sidebar, .side-nav, .saas-sidebar, .profitnx-menubar',
    title: 'Navigation Menu',
    content: 'Access all your business modules from here. Ledgers, Inventory, Invoices, Customers, and Reports are just a click away.',
    position: 'right'
  },
  {
    target: '.desktop-action-strip, .primary-action-pill, #voice-control-pill, .command-bar, .erp-nav-group',
    title: 'Quick Actions',
    content: 'Instantly record sales, create invoices, add customers, or log expenses with one click.',
    position: 'bottom'
  },
  {
    target: '.stat-card-modern, .dashboard-summary-grid, .stat-grid, #dashboard, .hero-panel, .panel',
    title: 'Business Overview',
    content: 'Your dashboard gives you real-time visibility into revenue, monthly sales, cash flow, and financial health.',
    position: 'top'
  },
  {
    target: '.floating-voice-button, .mic-button, .voice-command-floating, [aria-label*="voice" i], [aria-label*="mic" i]',
    title: 'Voice Bookkeeper',
    content: 'Just speak in Hindi, Gujarati, or English to record transactions hands-free with AI assistance anytime!',
    position: 'left'
  }
];

export function GuidedTour({ onFinish }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState(null);
  
  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  useEffect(() => {
    let highlightedEl = null;

    const updatePosition = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        // Graceful fallback: center tour modal on screen
        setPosition({
          top: Math.max(80, Math.floor((window.innerHeight - 240) / 2)),
          left: Math.max(20, Math.floor((window.innerWidth - 340) / 2)),
        });
        return;
      }
      
      highlightedEl = el;
      const rect = el.getBoundingClientRect();
      let top = 0;
      let left = 0;
      
      switch (step.position) {
        case 'right':
          top = rect.top + (rect.height / 2) - 100;
          left = rect.right + 20;
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - 100;
          left = rect.left - 340;
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + (rect.width / 2) - 160;
          break;
        case 'top':
          top = rect.top - 200;
          left = rect.left + (rect.width / 2) - 160;
          break;
        default:
          top = rect.bottom + 16;
          left = rect.left;
      }
      
      // Keep within viewport bounds
      if (top < 20) top = 20;
      if (top + 260 > window.innerHeight) top = Math.max(20, window.innerHeight - 280);
      if (left < 20) left = 20;
      if (left + 340 > window.innerWidth) left = Math.max(20, window.innerWidth - 350);
      
      setPosition({ top, left });
      
      // Highlight target element safely
      try {
        el.style.position = 'relative';
        el.style.zIndex = '9999';
        el.style.boxShadow = '0 0 0 4px var(--brand-primary, #00dfc4), 0 0 0 9999px rgba(0,0,0,0.55)';
      } catch {}
    };
    
    // Give DOM time to render target elements
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      if (highlightedEl) {
        try {
          highlightedEl.style.zIndex = '';
          highlightedEl.style.boxShadow = '';
        } catch {}
      }
    };
  }, [currentStep, step]);

  if (!position) return null;

  return (
    <div style={{
      position: 'fixed',
      top: position.top,
      left: position.left,
      width: '320px',
      background: 'var(--bg-primary)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-xl)',
      padding: '24px',
      zIndex: 10000,
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <button 
        onClick={onFinish}
        style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
      >
        <X size={16} />
      </button>
      
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Step {currentStep + 1} of {TOUR_STEPS.length}
      </div>
      
      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
        {step.title}
      </h3>
      
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
        {step.content}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
          style={{ background: 'transparent', border: 'none', color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: currentStep === 0 ? 'default' : 'pointer', fontWeight: 500, fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}
        >
          <ChevronLeft size={16} style={{ marginRight: '4px' }} /> Back
        </button>
        
        {currentStep < TOUR_STEPS.length - 1 ? (
          <button 
            className="saas-primary-button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Next <ChevronRight size={16} style={{ marginLeft: '4px' }} />
          </button>
        ) : (
          <button 
            className="saas-primary-button"
            onClick={onFinish}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Finish Tour
          </button>
        )}
      </div>
    </div>
  );
}
