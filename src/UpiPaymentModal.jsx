import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Share2,
  ExternalLink,
  Printer,
  CheckCircle,
  Smartphone,
  CreditCard,
  Banknote,
  Building2,
  FileText,
  AlertCircle
} from 'lucide-react';

export function encodeUpiUri({ pa, pn, am, tn, tr }) {
  const cleanPa = (pa || 'business@upi').trim();
  const cleanPn = (pn || 'Merchant').trim();
  const cleanAm = Number(am) > 0 ? Number(am).toFixed(2) : '0.00';
  const cleanTn = (tn || 'Bill Payment').trim();
  const cleanTr = (tr || `TXN${Date.now()}`).trim();

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

export default function UpiPaymentModal({
  isOpen,
  onClose,
  invoice,
  profile = {},
  onConfirmPayment,
  onUpdateProfile,
}) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'record' | 'standee'
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('UPI');
  const [refNo, setRefNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable merchant UPI ID
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [customUpiId, setCustomUpiId] = useState('');
  const [currentUpiId, setCurrentUpiId] = useState(() => profile.upiId || 'trinetr.namkeen@icici');

  useEffect(() => {
    if (profile.upiId) {
      setCurrentUpiId(profile.upiId);
    }
  }, [profile.upiId]);

  const standeeRef = useRef(null);

  const businessName = profile.name || profile.businessName || 'TRINETR Merchant';
  const upiId = currentUpiId || profile.upiId || 'trinetr.namkeen@icici';
  const invoiceNo = invoice?.invoiceNo || invoice?.id || 'INV-DRAFT';
  const customerName = invoice?.customer || invoice?.customerName || 'Valued Customer';
  const invoiceTotal = Number(invoice?.total || invoice?.grandTotal || 0);
  const invoiceBalance = Number(invoice?.balance ?? invoiceTotal);
  const payableAmount = invoiceBalance > 0 ? invoiceBalance : invoiceTotal;

  const handleSaveUpiId = async () => {
    const trimmed = customUpiId.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid UPI ID containing "@" (e.g. yourname@icici or 9876543210@paytm)');
      return;
    }
    setCurrentUpiId(trimmed);
    setIsEditingUpi(false);
    setErrorMsg('');
    setSuccessMsg(`UPI ID updated to "${trimmed}"! Scannable QR now sends payments directly to your account.`);
    if (typeof onUpdateProfile === 'function') {
      try {
        await onUpdateProfile({ upiId: trimmed });
      } catch (err) {
        console.warn('Could not sync profile upiId:', err);
      }
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Initialize amount whenever invoice changes
  useEffect(() => {
    if (invoice) {
      setAmount(String(payableAmount));
      setRefNo('');
      setNotes(`Payment for ${invoiceNo}`);
      setSuccessMsg('');
      setErrorMsg('');
      setActiveTab('qr');
    }
  }, [invoice, payableAmount, invoiceNo]);

  // Generate real QR code data URL whenever parameters change
  useEffect(() => {
    if (!isOpen || !invoice) return;

    const currentAmount = Number(amount) > 0 ? Number(amount) : payableAmount;
    const uri = encodeUpiUri({
      pa: upiId,
      pn: businessName,
      am: currentAmount,
      tn: invoiceNo,
      tr: `TR${Date.now().toString(36).toUpperCase()}`,
    });

    QRCode.toDataURL(uri, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation error:', err);
      });
  }, [isOpen, invoice, upiId, businessName, amount, payableAmount, invoiceNo]);

  if (!isOpen || !invoice) return null;

  const upiUri = encodeUpiUri({
    pa: upiId,
    pn: businessName,
    am: Number(amount) > 0 ? Number(amount) : payableAmount,
    tn: invoiceNo,
  });

  const copyToClipboard = (text, setFn) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setFn(true);
        setTimeout(() => setFn(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI-QR-${invoiceNo}.png`;
    a.click();
  };

  const handleWhatsAppShare = () => {
    const mobile = invoice.mobile || invoice.phone || '';
    const cleanPhone = String(mobile).replace(/\D/g, '');
    const text = `Namaste ${customerName}!\n\nHere is your payment request for *Invoice ${invoiceNo}*.\nAmount Due: *₹${Number(amount || payableAmount).toLocaleString('en-IN')}*\n\nPay via any UPI App (GPay, PhonePe, Paytm, BHIM):\n${upiUri}\n\nMerchant: ${businessName}\nUPI ID: ${upiId}\n\nThank you!`;
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const paidAmount = Number(amount);
    if (!paidAmount || paidAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (onConfirmPayment) {
        await onConfirmPayment({
          invoice,
          invoiceId: invoice.id,
          invoiceNo,
          amount: paidAmount,
          mode,
          refNo: refNo.trim() || `TXN-${Date.now().toString(36).toUpperCase()}`,
          date,
          notes: notes.trim(),
        });
      }
      setSuccessMsg(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fade-in"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: activeTab === 'standee' ? '540px' : '620px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              minHeight: 'unset',
              margin: 0,
              padding: 0,
            }}
            title="Close"
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              Instant UPI Collection
            </span>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>• {businessName}</span>
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
            Collect Payment: {invoiceNo}
          </h2>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '13px', opacity: 0.9 }}>
            <span>👤 Customer: <strong>{customerName}</strong></span>
            <span>💰 Amount Due: <strong>₹{payableAmount.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '4px 12px 0',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === 'qr' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'qr' ? '#1e3a8a' : '#64748b',
              fontWeight: activeTab === 'qr' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              minHeight: 'unset',
              margin: 0,
            }}
          >
            <QrCode size={15} />
            Dynamic UPI QR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('record')}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === 'record' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'record' ? '#1e3a8a' : '#64748b',
              fontWeight: activeTab === 'record' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              minHeight: 'unset',
              margin: 0,
            }}
          >
            <CheckCircle size={15} />
            Record Payment / Mark Paid
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standee')}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === 'standee' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'standee' ? '#1e3a8a' : '#64748b',
              fontWeight: activeTab === 'standee' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              minHeight: 'unset',
              margin: 0,
            }}
          >
            <Printer size={15} />
            Counter Standee
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #86efac',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: DYNAMIC UPI QR CODE */}
          {activeTab === 'qr' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* QR Container */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '2px dashed #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`UPI QR for ${invoiceNo}`}
                    style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '220px',
                      height: '220px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: '13px',
                    }}
                  >
                    Generating QR...
                  </div>
                )}

                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#166534',
                    background: '#f0fdf4',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>✓ 100% Scannable with GPay, PhonePe, Paytm, BHIM</span>
                </div>
              </div>

              {/* Amount Display */}
              <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Exact Payable Amount</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  ₹{Number(amount || payableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* UPI ID Box with One-Click Inline Change / Edit */}
              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid #cbd5e1',
                  marginBottom: '16px',
                }}
              >
                {isEditingUpi ? (
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', display: 'block', marginBottom: '6px' }}>
                      ⚙️ Set Your Merchant UPI ID (VPA)
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        id="input-modal-upi"
                        type="text"
                        value={customUpiId}
                        onChange={(e) => setCustomUpiId(e.target.value.trim())}
                        placeholder="e.g. 9876543210@paytm, shop@icici, mobile@ybl"
                        style={{
                          flex: 1,
                          minWidth: '220px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1.5px solid #3b82f6',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          background: '#ffffff',
                        }}
                      />
                      <button
                        type="button"
                        id="btn-save-modal-upi"
                        onClick={handleSaveUpiId}
                        style={{
                          padding: '8px 14px',
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Save UPI ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingUpi(false)}
                        style={{
                          padding: '8px 10px',
                          background: '#e2e8f0',
                          color: '#475569',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                      Money paid by customers scanning this QR code will be deposited into this bank account / UPI ID.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                          Merchant UPI ID (VPA)
                        </span>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          Active
                        </span>
                      </div>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginTop: '2px' }}>{upiId}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        id="btn-edit-modal-upi"
                        onClick={() => {
                          setCustomUpiId(upiId);
                          setIsEditingUpi(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Change your UPI ID to receive payments directly in your bank account"
                      >
                        ✏️ Change UPI ID
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiId, setCopiedUpi)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: copiedUpi ? '#16a34a' : '#ffffff',
                          color: copiedUpi ? '#ffffff' : '#1e293b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          minHeight: 'unset',
                          margin: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                        {copiedUpi ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  width: '100%',
                  marginBottom: '16px',
                }}
              >
                <button
                  type="button"
                  onClick={() => copyToClipboard(upiUri, setCopiedLink)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: copiedLink ? '#16a34a' : '#f8fafc',
                    color: copiedLink ? '#ffffff' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  {copiedLink ? 'Link Copied!' : 'Copy Link'}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: '#25d366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  <Share2 size={14} />
                  WhatsApp Request
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  <Download size={14} />
                  Save QR Image
                </button>
              </div>

              {/* Direct UPI App Trigger (for mobile devices) */}
              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                  Mobile Deep-Links (Open directly in installed UPI App)
                </span>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={upiUri}
                    style={{
                      padding: '6px 12px',
                      background: '#4285f4',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Smartphone size={13} /> GPay
                  </a>
                  <a
                    href={upiUri}
                    style={{
                      padding: '6px 12px',
                      background: '#5f259f',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Smartphone size={13} /> PhonePe
                  </a>
                  <a
                    href={upiUri}
                    style={{
                      padding: '6px 12px',
                      background: '#002970',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Smartphone size={13} /> Paytm
                  </a>
                  <a
                    href={upiUri}
                    style={{
                      padding: '6px 12px',
                      background: '#00833e',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Smartphone size={13} /> BHIM
                  </a>
                </div>
              </div>

              {/* Bottom Switch to Record Payment */}
              <div style={{ marginTop: '18px', width: '100%', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('record')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                    minHeight: '44px',
                    margin: 0,
                  }}
                >
                  <CheckCircle size={18} />
                  Confirm & Mark Invoice as Paid (₹{payableAmount.toLocaleString('en-IN')})
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RECORD PAYMENT FORM */}
          {activeTab === 'record' && (
            <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Bill / Customer Reference</div>
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                    {invoiceNo} • {customerName}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Original Total</div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>₹{invoiceTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Payment Mode *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: <Smartphone size={14} /> },
                    { id: 'Cash', label: 'Cash', icon: <Banknote size={14} /> },
                    { id: 'Bank', label: 'Bank / NEFT', icon: <Building2 size={14} /> },
                    { id: 'Cheque', label: 'Cheque', icon: <CreditCard size={14} /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: mode === m.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: mode === m.id ? '#eff6ff' : '#ffffff',
                        color: mode === m.id ? '#1e3a8a' : '#475569',
                        fontWeight: mode === m.id ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minHeight: 'unset',
                        margin: 0,
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  UTR / Reference / Cheque No (Optional)
                </label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g. UPI Ref 3241098234 or Bank UTR"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reconciliation Note / Narration
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cleared full bill via GPay"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle size={16} />
                  {submitting ? 'Recording...' : `Record Payment of ₹${Number(amount || 0).toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PRINTABLE SHOP COUNTER STANDEE */}
          {activeTab === 'standee' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                ref={standeeRef}
                style={{
                  background: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  width: '100%',
                  maxWidth: '360px',
                  textAlign: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                  {businessName}
                </div>
                {profile.gstin && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                    GSTIN: {profile.gstin}
                  </div>
                )}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e3a8a',
                    margin: '8px auto 14px',
                    display: 'inline-block',
                  }}
                >
                  Scan & Pay using Any UPI App
                </div>

                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Counter UPI QR"
                    style={{
                      width: '240px',
                      height: '240px',
                      display: 'block',
                      margin: '0 auto',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                )}

                <div style={{ marginTop: '14px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  UPI ID: <span style={{ color: '#2563eb' }}>{upiId}</span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Accepted: GPay • PhonePe • Paytm • BHIM • Cred • Amazon Pay
                </div>

                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '11px',
                    color: '#94a3b8',
                  }}
                >
                  ⚡ Powered by TRINETR ERP
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Need to use your own bank UPI ID?</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qr');
                    setCustomUpiId(upiId);
                    setIsEditingUpi(true);
                  }}
                  style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    padding: 0,
                    minHeight: 'unset',
                  }}
                >
                  ✏️ Change Standee UPI ID
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handlePrintStandee}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  <Printer size={15} />
                  Print Counter Standee
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: 'unset',
                    margin: 0,
                  }}
                >
                  <Download size={15} />
                  Download QR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
