import React, { useState } from 'react';
import {
  X,
  Mic,
  Play,
  CheckCircle2,
  FileText,
  Package,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
} from 'lucide-react';

const DEMO_COMMANDS = [
  {
    id: 'sale',
    label: 'Record B2B Sale',
    spoken: 'Add credit sale to Ramesh Kumar ₹4,500 for Namkeen 30kg',
    type: 'Sales Invoice (F2)',
    party: 'Ramesh Kumar Traders',
    amount: '₹4,500',
    gst: '₹225 (5% GST)',
    debit: 'Sundry Debtors - Ramesh Kumar',
    credit: 'Sales Account - Namkeen & Snacks',
  },
  {
    id: 'expense',
    label: 'Record Factory Expense',
    spoken: 'Add cash expense ₹180 for chai and breakfast at factory',
    type: 'Payment Voucher',
    party: 'Tea & Refreshments Vendor',
    amount: '₹180',
    gst: '₹0 (Exempt)',
    debit: 'Staff Welfare & Refreshment A/c',
    credit: 'Cash in Hand A/c',
  },
  {
    id: 'stock',
    label: 'BOM Production Batch',
    spoken: 'Create batch run for 50kg Sev Mamra recipe',
    type: 'Production & Recipe BOM',
    party: 'Production Unit #1',
    amount: '₹3,850 Standard Cost',
    gst: 'Raw Material Auto-Deducted',
    debit: 'Finished Goods Inventory (+50 kg)',
    credit: 'Raw Material Stock (-35kg Besan, -12L Oil)',
  },
];

export function DemoPreviewModal({ isOpen, onClose, onStartFree, onTryLiveDemo }) {
  const [activeTab, setActiveTab] = useState('voice');
  const [selectedCommand, setSelectedCommand] = useState(DEMO_COMMANDS[0]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [cartCount, setCartCount] = useState(2);

  if (!isOpen) return null;

  const handleSimulateVoice = (cmd) => {
    setSelectedCommand(cmd);
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 1200);
  };

  return (
    <div
      className="saas-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: 'min(90vh, calc(100dvh - 32px))',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle, #cbd5e1)',
          overflow: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 750 }}>Trinetr Product Walkthrough</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                Experience voice-powered ERP, GST invoicing, production BOM &amp; WhatsApp storefront
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feature Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            background: 'var(--bg-card, #ffffff)',
            padding: '4px 16px 0',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'voice', label: 'Voice AI Bookkeeper', icon: <Mic size={15} /> },
            { id: 'invoicing', label: 'GST Invoicing (F2)', icon: <FileText size={15} /> },
            { id: 'production', label: 'Recipe BOM Master', icon: <Package size={15} /> },
            { id: 'storefront', label: 'WhatsApp Storefront', icon: <ShoppingBag size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #0284c7' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab.id ? '#0284c7' : 'var(--text-secondary, #64748b)',
                fontWeight: activeTab === tab.id ? 750 : 550,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body / Tab Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {activeTab === 'voice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(2,132,199,0.08), rgba(30,58,138,0.04))',
                  border: '1px solid rgba(2,132,199,0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSimulateVoice(selectedCommand)}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: isPlayingAudio ? '#ef4444' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isPlayingAudio ? '0 0 0 8px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(2,132,199,0.3)',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  title="Simulate speaking command"
                >
                  <Mic size={24} />
                </button>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0284c7' }}>
                    {isPlayingAudio ? 'Listening & Parsing Speech...' : 'Try Interactive Voice Simulator'}
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '14.5px', fontWeight: 600 }}>
                    "{selectedCommand.spoken}"
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginBottom: '8px', display: 'block' }}>
                  Tap sample voice instructions to preview automatic accounting translation:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {DEMO_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => handleSimulateVoice(cmd)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selectedCommand.id === cmd.id ? '1.5px solid #0284c7' : '1px solid var(--border-subtle, #e2e8f0)',
                        background: selectedCommand.id === cmd.id ? 'var(--bg-secondary, #f0f9ff)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0f172a)' }}>{cmd.label}</strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>{cmd.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parsed Result Box */}
              <div
                style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontSize: '13px', fontWeight: 750, color: '#10b981' }}>Parsed &amp; Balanced Double-Entry</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                    Ready to Save
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginTop: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '11.5px', display: 'block' }}>Voucher Type</span>
                    <strong>{selectedCommand.type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '11.5px', display: 'block' }}>Amount &amp; Tax</span>
                    <strong style={{ color: '#0284c7' }}>{selectedCommand.amount}</strong> ({selectedCommand.gst})
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '11.5px', display: 'block' }}>Debit Ledger (Dr)</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 650 }}>{selectedCommand.debit}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '11.5px', display: 'block' }}>Credit Ledger (Cr)</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 650 }}>{selectedCommand.credit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoicing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: '#1d4ed8' }}>Profit Nx Standard</span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 750 }}>Quick Sales Bill (F2)</h3>
                  </div>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    Invoice #TRN-2026-089
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '13px' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-card, #fff)', borderRadius: '6px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>Taxable Subtotal</span>
                    <strong style={{ display: 'block', fontSize: '14px' }}>₹12,400.00</strong>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-card, #fff)', borderRadius: '6px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>GST (CGST+SGST 5%)</span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#d97706' }}>₹620.00</strong>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-card, #fff)', borderRadius: '6px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>Net Invoice Amount</span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#16a34a' }}>₹13,020.00</strong>
                  </div>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text-secondary, #475569)', lineHeight: 1.7 }}>
                <li><strong>Keyboard shortcuts:</strong> Press F2 from anywhere to instantly trigger quick bill creation.</li>
                <li><strong>HSN &amp; GST:</strong> Auto-splits SGST, CGST, and IGST with one-click thermal POS and A4 PDF printing.</li>
                <li><strong>Dynamic UPI QR:</strong> Prints real-time NPCI-compliant payment QR codes directly on invoices.</li>
              </ul>
            </div>
          )}

          {activeTab === 'production' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 750 }}>BOM Master: Ratlami Sev (100kg Batch)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card, #fff)', borderRadius: '6px' }}>
                    <span>🌾 Besan (Gram Flour)</span>
                    <strong>70.0 kg • ₹4,200</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card, #fff)', borderRadius: '6px' }}>
                    <span>🛢️ Refined Cottonseed Oil</span>
                    <strong>25.0 L • ₹2,750</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card, #fff)', borderRadius: '6px' }}>
                    <span>🌶️ Clove, Hing &amp; Spices</span>
                    <strong>5.0 kg • ₹950</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderTop: '1px dashed var(--border-subtle, #cbd5e1)', marginTop: '4px' }}>
                    <strong>Total Standard Batch Cost:</strong>
                    <strong style={{ color: '#0284c7' }}>₹7,900 (₹79/kg)</strong>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                Recording a production run automatically subtracts exact raw material weights from your warehouse and adds finished packaged snacks into available stock.
              </p>
            </div>
          )}

          {activeTab === 'storefront' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: '#16a34a' }}>Direct WhatsApp E-Commerce</span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 750 }}>Jay Ambe Online Namkeen Store</h3>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    🛒 Cart: {cartCount} items
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-card, #fff)', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <strong style={{ fontSize: '13.5px', display: 'block' }}>Special Bhavnagri Gathiya</strong>
                    <span style={{ fontSize: '12.5px', color: '#0284c7', fontWeight: 700 }}>₹160 / 500g</span>
                    <button
                      type="button"
                      onClick={() => setCartCount((c) => c + 1)}
                      style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-card, #fff)', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <strong style={{ fontSize: '13.5px', display: 'block' }}>Spicy Ratlami Sev</strong>
                    <span style={{ fontSize: '12.5px', color: '#0284c7', fontWeight: 700 }}>₹180 / 500g</span>
                    <button
                      type="button"
                      onClick={() => setCartCount((c) => c + 1)}
                      style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                Your customers can order directly from mobile with zero commission, sending full order details and payment confirmations straight to your WhatsApp business number.
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748b)' }}>
              1-Month Free Trial • No Credit Card Required
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onTryLiveDemo && (
              <button
                type="button"
                onClick={onTryLiveDemo}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontWeight: 650,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Try Instant Demo Mode
              </button>
            )}
            <button
              type="button"
              onClick={onStartFree}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
                color: '#ffffff',
                fontWeight: 750,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Start Free Trial <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
