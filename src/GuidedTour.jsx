import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_STEPS = [
  {
    target: '.saas-sidebar',
    title: 'Navigation Menu',
    content: 'Access all your business modules from here. Customers, Inventory, Orders, and more are just a click away.',
    position: 'right'
  },
  {
    target: '.quick-add-btn', // I will need to ensure this class exists on the + New button
    title: 'Quick Actions',
    content: 'Instantly create invoices, add customers, or record expenses from anywhere in the app.',
    position: 'bottom'
  },
  {
    target: '.erp-dashboard',
    title: 'Business Overview',
    content: 'Your dashboard gives you a real-time snapshot of your revenue, cash flow, and recent activities.',
    position: 'top'
  },
  {
    target: '.ai-assistant-btn', // The floating chat button
    title: 'Trinetr AI Assistant',
    content: 'Need help or want to quickly check data? Just ask your AI assistant anytime!',
    position: 'left'
  }
];

export function GuidedTour({ onFinish }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState(null);
  
  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      const el = document.querySelector(step.target);
      if (!el) return;
      
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
      }
      
      // Keep within bounds
      if (top < 20) top = 20;
      if (left < 20) left = 20;
      if (left + 320 > window.innerWidth) left = window.innerWidth - 340;
      
      setPosition({ top, left });
      
      // Highlight target
      el.style.position = 'relative';
      el.style.zIndex = '9999';
      el.style.boxShadow = '0 0 0 4px var(--brand-primary), 0 0 0 9999px rgba(0,0,0,0.5)';
      
      return () => {
        el.style.zIndex = '';
        el.style.boxShadow = '';
      };
    };
    
    // Give DOM time to render target elements
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      const el = document.querySelector(step.target);
      if (el) {
        el.style.zIndex = '';
        el.style.boxShadow = '';
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
          style={{ background: 'transparent', border: 'none', color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: currentStep === 0 ? 'default' : 'pointer', fontWeight: 500, fontSize: '14px' }}
        >
          Back
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
