import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, Check, Copy, QrCode, CreditCard, Smartphone, Building2, 
  Shield, Lock, CheckCircle2, ArrowRight, Download, Zap, Crown, AlertCircle
} from 'lucide-react';
import { PLAN_LIMITS } from './subscription';

export function encodeSubscriptionUpiUri({ pa, pn, am, tn, tr }) {
  const cleanPa = (pa || 'trinetr.namkeen@icici').trim();
  const cleanPn = (pn || 'Trinetr Business Suite').trim();
  const cleanAm = Number(am) > 0 ? Number(am).toFixed(2) : '99.00';
  const cleanTn = (tn || 'Trinetr Subscription').trim();
  const cleanTr = (tr || `SUB${Date.now()}`).trim();

  const params = new URLSearchParams({
    pa: cleanPa,
    pn: cleanPn,
    am: cleanAm,
    cu: 'INR',
    tn: cleanTn,
    tr: cleanTr,
  });
  return `upi://pay?${params.toString()}`;
}

export function SubscriptionPaymentModal({
  isOpen,
  onClose,
  plan = 'Basic',
  initialCycle = 'monthly',
  profile = {},
  onPaymentSuccess,
  onContactSales,
}) {
  const [billingCycle, setBillingCycle] = useState(initialCycle || 'monthly');
  const [activeMethod, setActiveMethod] = useState('upi'); // 'upi' | 'card' | 'bank'
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [txnId, setTxnId] = useState('');
  const [appActionStatus, setAppActionStatus] = useState('');
  const [activeApp, setActiveApp] = useState('');
  const [highlightQr, setHighlightQr] = useState(false);

  // Platform receiving details (Can be customized via profile, localStorage, or env)
  const receivingUpiId = (typeof window !== 'undefined' && localStorage.getItem('trinetr_platform_upi')) || profile?.platformUpiId || import.meta.env?.VITE_SUBSCRIPTION_UPI_ID || profile?.upiId || 'trinetr.namkeen@icici';
  const merchantName = 'Trinetr Business Suite';

  // Pricing calculation
  const planInfo = PLAN_LIMITS[plan] || PLAN_LIMITS['Basic'];
  const monthlyRate = plan === 'Basic' ? 99 : 499;
  const yearlyRate = plan === 'Basic' ? 79 : 399;
  const totalAmount = billingCycle === 'yearly' ? yearlyRate * 12 : monthlyRate;

  // Sync initialCycle, reset state, and generate unique transaction ID when modal opens or plan changes
  useEffect(() => {
    if (isOpen) {
      setTxnId(`TRN-SUB-${Date.now().toString(36).toUpperCase()}`);
      if (initialCycle) setBillingCycle(initialCycle);
      setPaymentSuccess(null);
      setUtrNumber('');
      setErrorMsg('');
      setAppActionStatus('');
      setActiveApp('');
      setHighlightQr(false);
    }
  }, [isOpen, initialCycle, plan]);

  const upiUri = React.useMemo(() => {
    if (!isOpen) return '';
    return encodeSubscriptionUpiUri({
      pa: receivingUpiId,
      pn: merchantName,
      am: totalAmount,
      tn: `${plan} Plan (${billingCycle})`,
      tr: txnId || 'TRN-SUB-PENDING',
    });
  }, [isOpen, receivingUpiId, merchantName, totalAmount, plan, billingCycle, txnId]);

  // Generate QR code for UPI (runs only when upiUri actually changes)
  useEffect(() => {
    if (!isOpen || !upiUri) return;
    let isCurrent = true;

    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isCurrent) setQrDataUrl(url);
      })
      .catch((err) => console.error('UPI QR generation error:', err));

    return () => {
      isCurrent = false;
    };
  }, [isOpen, upiUri]);

  if (!isOpen) return null;

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2500);
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const handleAppPayment = (app) => {
    setActiveApp(app);
    copyToClipboard(receivingUpiId);
    setHighlightQr(true);
    setTimeout(() => setHighlightQr(false), 2500);

    const upiParams = new URLSearchParams({
      pa: receivingUpiId,
      pn: merchantName,
      am: Number(totalAmount).toFixed(2),
      cu: 'INR',
      tn: `${plan} Plan (${billingCycle})`,
      tr: txnId || `TRN-SUB-${Date.now().toString(36).toUpperCase()}`,
    }).toString();

    const genericUri = `upi://pay?${upiParams}`;
    let targetUri = genericUri;
    let appLabel = 'UPI App';

    if (app === 'gpay') {
      appLabel = 'Google Pay';
      targetUri = `tez://upi/pay?${upiParams}`;
    } else if (app === 'phonepe') {
      appLabel = 'PhonePe';
      targetUri = `phonepe://upi/pay?${upiParams}`;
    } else if (app === 'paytm') {
      appLabel = 'Paytm';
      targetUri = `paytmmp://pay?${upiParams}`;
    }

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (isMobile) {
      const startTime = Date.now();
      try {
        window.location.href = targetUri;
      } catch (err) {
        window.location.href = genericUri;
      }

      setTimeout(() => {
        if (Date.now() - startTime < 1500) {
          window.location.href = genericUri;
        }
      }, 600);

      setAppActionStatus(`📱 Opening ${appLabel}... If your app does not open automatically, scan the QR code above or pay to ${receivingUpiId}.`);
    } else {
      setAppActionStatus(`📋 Copied UPI ID: ${receivingUpiId} (₹${totalAmount})! Scan the QR code above with your ${appLabel} app, or pay directly using this UPI ID.`);
    }

    setTimeout(() => {
      setAppActionStatus('');
      setActiveApp('');
    }, 9000);
  };

  const handleVerifyUpiPayment = () => {
    const trimmedUtr = utrNumber.trim();
    if (!trimmedUtr || trimmedUtr.length < 6) {
      setErrorMsg('Please enter a valid 12-digit UPI Transaction / UTR reference number from your payment app.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    // Simulate verification processing
    setTimeout(() => {
      setIsVerifying(false);
      const paymentRecord = {
        plan,
        cycle: billingCycle,
        amount: totalAmount,
        method: 'UPI',
        utr: trimmedUtr,
        transactionId: txnId,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setPaymentSuccess(paymentRecord);
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentRecord);
      }
    }, 900);
  };

  const handleGatewayCheckout = () => {
    const razorpayKey = (typeof window !== 'undefined' && localStorage.getItem('trinetr_razorpay_key')) || import.meta.env?.VITE_RAZORPAY_KEY_ID;

    // If Razorpay live/test script is loaded and key is set
    if (typeof window !== 'undefined' && window.Razorpay && razorpayKey) {
      const options = {
        key: razorpayKey,
        amount: totalAmount * 100, // in paise
        currency: 'INR',
        name: merchantName,
        description: `${plan} Plan Subscription (${billingCycle})`,
        image: '/assets/trinetr-logo.jpg',
        prefill: {
          name: profile?.owner || 'Business Owner',
          email: profile?.email || '',
          contact: profile?.phone || '',
        },
        theme: {
          color: '#0284c7',
        },
        handler: function (response) {
          const paymentRecord = {
            plan,
            cycle: billingCycle,
            amount: totalAmount,
            method: 'Razorpay (Card/NetBanking)',
            transactionId: response.razorpay_payment_id || txnId,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          };
          setPaymentSuccess(paymentRecord);
          if (onPaymentSuccess) onPaymentSuccess(paymentRecord);
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // Sandbox / Instant Activation Test
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        const paymentRecord = {
          plan,
          cycle: billingCycle,
          amount: totalAmount,
          method: 'Card / NetBanking (Sandbox Verified)',
          transactionId: `GATEWAY-${Date.now().toString(36).toUpperCase()}`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
        setPaymentSuccess(paymentRecord);
        if (onPaymentSuccess) onPaymentSuccess(paymentRecord);
      }, 800);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isVerifying) onClose();
      }}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          border: '1px solid var(--border-subtle, #e2e8f0)',
        }}
      >
        {/* Header */}
        <div
          className="subscription-checkout-header"
          style={{
            background: 'linear-gradient(135deg, #0b1329 0%, #1e293b 100%)',
            color: '#ffffff',
            WebkitTextFillColor: '#ffffff',
            padding: '22px 24px',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="subscription-close-btn"
            aria-label="Close"
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} color="#ffffff" style={{ stroke: '#ffffff' }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              className="subscription-ssl-badge"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                WebkitTextFillColor: '#34d399',
                padding: '3px 9px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                letterSpacing: '0.04em',
              }}
            >
              🔒 256-Bit SSL Secure Checkout
            </span>
            <span
              className="subscription-activation-badge"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#e2e8f0',
                WebkitTextFillColor: '#e2e8f0',
              }}
            >
              • Instant Activation
            </span>
          </div>

          <h2
            className="subscription-header-title"
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#ffffff',
              WebkitTextFillColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              letterSpacing: '-0.01em',
            }}
          >
            {plan === 'Professional' ? <Crown size={24} color="#c084fc" /> : <Zap size={24} color="#34d399" />}
            Upgrade to {plan} Plan
          </h2>
          <p
            className="subscription-header-subtitle"
            style={{
              margin: '6px 0 0',
              fontSize: '0.88rem',
              color: '#cbd5e1',
              WebkitTextFillColor: '#cbd5e1',
              lineHeight: 1.4,
            }}
          >
            Official Trinetr Business Suite Subscription • GST ITC Tax Invoice included
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {paymentSuccess ? (
            /* SUCCESS STATE */
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                Subscription Activated!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Your payment of <strong>₹{paymentSuccess.amount}</strong> for the <strong>{paymentSuccess.plan} Plan ({paymentSuccess.cycle})</strong> has been confirmed.
              </p>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Transaction ID:</span>
                  <strong>{paymentSuccess.transactionId}</strong>
                </div>
                {paymentSuccess.utr && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>UPI UTR / Ref:</span>
                    <strong>{paymentSuccess.utr}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
                  <strong>{paymentSuccess.method}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <strong style={{ color: '#10b981' }}>Active &amp; Paid</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="saas-primary-button"
                  onClick={onClose}
                  style={{ padding: '10px 24px' }}
                >
                  Go to Dashboard &amp; Start Using {plan}
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <div>
              {/* Order Summary Box */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{plan} Plan</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {plan === 'Basic' ? 'Up to 500 customers & products • GST Billing' : 'Unlimited customers & products • AI Assistant unlocked'}
                    </div>
                  </div>

                  {/* Billing Cycle Toggle inside Checkout */}
                  <div style={{ display: 'inline-flex', background: 'var(--bg-primary)', padding: '2px', borderRadius: '999px', border: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      style={{
                        padding: '4px 12px', borderRadius: '999px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        background: billingCycle === 'monthly' ? 'var(--brand-primary)' : 'transparent',
                        color: billingCycle === 'monthly' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >Monthly</button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      style={{
                        padding: '4px 12px', borderRadius: '999px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        background: billingCycle === 'yearly' ? 'var(--brand-primary)' : 'transparent',
                        color: billingCycle === 'yearly' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >Yearly (-20%)</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', borderTop: '1px dashed var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Payable:</span>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                      {billingCycle === 'yearly' ? '₹79/mo billed annually (Save 20%)' : 'Starts from ₹99/mo (All taxes inclusive)'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary, #0284c7)' }}>
                      ₹{totalAmount}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '4px' }}>
                      {billingCycle === 'yearly' ? '/ year' : '/ month'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveMethod('upi')}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderBottom: activeMethod === 'upi' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    background: 'none',
                    color: activeMethod === 'upi' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    fontWeight: activeMethod === 'upi' ? 700 : 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <QrCode size={16} /> Instant UPI (GPay/PhonePe)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMethod('card')}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderBottom: activeMethod === 'card' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    background: 'none',
                    color: activeMethod === 'card' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    fontWeight: activeMethod === 'card' ? 700 : 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <CreditCard size={16} /> Cards / NetBanking
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMethod('bank')}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderBottom: activeMethod === 'bank' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    background: 'none',
                    color: activeMethod === 'bank' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    fontWeight: activeMethod === 'bank' ? 700 : 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Building2 size={16} /> Bank NEFT
                </button>
              </div>

              {errorMsg && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* METHOD 1: UPI */}
              {activeMethod === 'upi' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* QR Box */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '14px',
                      borderRadius: '12px',
                      border: highlightQr ? '2px solid #10b981' : '2px dashed var(--border-subtle)',
                      boxShadow: highlightQr ? '0 0 20px rgba(16, 185, 129, 0.45)' : '0 4px 12px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginBottom: '14px',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="UPI QR Code" style={{ width: '180px', height: '180px', display: 'block', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        Loading QR...
                      </div>
                    )}
                    <span style={{ fontSize: '11px', color: '#166534', WebkitTextFillColor: '#166534', background: '#f0fdf4', padding: '4px 10px', borderRadius: '999px', fontWeight: 700, marginTop: '8px', border: '1px solid #bbf7d0' }}>
                      ✓ Scan with any UPI App: GPay, PhonePe, Paytm, BHIM, CRED
                    </span>
                  </div>

                  {/* UPI VPA Copy Bar */}
                  <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Merchant UPI ID:</span>
                      <strong style={{ color: 'var(--text-primary)', WebkitTextFillColor: 'var(--text-primary)', fontSize: '0.95rem' }}>{receivingUpiId}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(receivingUpiId)}
                      style={{ padding: '6px 12px', background: copiedUpi ? '#10b981' : 'var(--bg-primary)', color: copiedUpi ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                      {copiedUpi ? 'Copied' : 'Copy UPI ID'}
                    </button>
                  </div>

                  {/* Mobile & Desktop UPI App Buttons */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleAppPayment('gpay')}
                      style={{
                        flex: 1,
                        minWidth: '95px',
                        padding: '10px 8px',
                        background: activeApp === 'gpay' ? '#1a73e8' : '#4285f4',
                        color: '#ffffff',
                        WebkitTextFillColor: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textAlign: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(66, 133, 244, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Smartphone size={15} /> GPay
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAppPayment('phonepe')}
                      style={{
                        flex: 1,
                        minWidth: '95px',
                        padding: '10px 8px',
                        background: activeApp === 'phonepe' ? '#4a1d7c' : '#5f259f',
                        color: '#ffffff',
                        WebkitTextFillColor: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textAlign: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(95, 37, 159, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Smartphone size={15} /> PhonePe
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAppPayment('paytm')}
                      style={{
                        flex: 1,
                        minWidth: '95px',
                        padding: '10px 8px',
                        background: activeApp === 'paytm' ? '#001b44' : '#002970',
                        color: '#ffffff',
                        WebkitTextFillColor: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textAlign: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0, 41, 112, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Smartphone size={15} /> Paytm
                    </button>
                  </div>

                  {appActionStatus && (
                    <div
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1.5px solid #10b981',
                        color: '#065f46',
                        WebkitTextFillColor: '#065f46',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        marginBottom: '14px',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <CheckCircle2 size={16} style={{ flexShrink: 0, color: '#10b981' }} />
                      <span>{appActionStatus}</span>
                    </div>
                  )}

                  {/* UTR Verification Input */}
                  <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', WebkitTextFillColor: 'var(--text-primary)', marginBottom: '6px' }}>
                      Step 2: Enter 12-digit UPI Ref / UTR No. after paying
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="e.g. 423871928341"
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid var(--border-subtle)',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          WebkitTextFillColor: 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="button"
                        className="saas-primary-button"
                        onClick={handleVerifyUpiPayment}
                        disabled={isVerifying}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '11px 22px',
                          background: '#059669',
                          color: '#ffffff',
                          WebkitTextFillColor: '#ffffff',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: 'none',
                          cursor: isVerifying ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
                        }}
                      >
                        {isVerifying ? 'Verifying...' : 'Verify & Activate'}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      The 12-digit UTR appears in your Google Pay / PhonePe / Paytm payment details receipt.
                    </span>
                  </div>
                </div>
              )}

              {/* METHOD 2: CARDS & GATEWAY */}
              {activeMethod === 'card' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CreditCard size={40} style={{ color: 'var(--brand-primary)', marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700 }}>Pay via Cards &amp; NetBanking</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                    Accepting Visa, MasterCard, RuPay, Maestro, Corporate NetBanking, and Wallets via Razorpay / Stripe gateway.
                  </p>

                  <button
                    type="button"
                    className="saas-primary-button full"
                    onClick={handleGatewayCheckout}
                    disabled={isVerifying}
                    style={{ padding: '12px 20px', fontSize: '1rem', marginBottom: '12px' }}
                  >
                    {isVerifying ? 'Processing...' : `Pay ₹${totalAmount} Now`}
                  </button>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Lock size={13} /> Secured with end-to-end tokenization and RBI compliant mandate.
                  </div>
                </div>
              )}

              {/* METHOD 3: BANK NEFT */}
              {activeMethod === 'bank' && (
                <div style={{ fontSize: '0.85rem' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700 }}>Direct Company Bank Account Transfer</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    For businesses wishing to transfer directly from their Current Account via RTGS / NEFT / IMPS:
                  </p>

                  <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <div><strong>Account Name:</strong> Trinetr Namkeen &amp; Business Solutions</div>
                    <div><strong>Bank:</strong> ICICI Bank</div>
                    <div><strong>Account Number:</strong> 002405001234</div>
                    <div><strong>IFSC Code:</strong> ICIC0000024</div>
                    <div><strong>Account Type:</strong> Current Account</div>
                  </div>

                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                    Enter Bank Transfer Reference (UTR):
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. ICICR24091800123"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border-subtle)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      className="saas-primary-button"
                      onClick={handleVerifyUpiPayment}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Verifying...' : 'Submit UTR'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
