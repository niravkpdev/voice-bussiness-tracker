import React from 'react';
import { ShieldCheck, Flame, Truck, MessageCircle } from 'lucide-react';

export function QualityTrustStrip() {
  const pillars = [
    {
      icon: <Flame size={24} className="trinetr-trust-icon-svg" />,
      title: '100% Pure Groundnut Oil',
      desc: 'Handcrafted daily in pure double-filtered singtel for rich, authentic aroma.',
      badge: 'Traditional Recipe'
    },
    {
      icon: <ShieldCheck size={24} className="trinetr-trust-icon-svg" />,
      title: 'Nitrogen Sealed Crunch',
      desc: 'Hygienic moisture-barrier packaging keeps snacks 100% crispy for 90 days.',
      badge: 'Food Safe & Fresh'
    },
    {
      icon: <Truck size={24} className="trinetr-trust-icon-svg" />,
      title: 'Express Regional Dispatch',
      desc: 'Dispatched within 24 hours across Gujarat, Mumbai, and all major cities.',
      badge: 'Safe Doorstep Delivery'
    },
    {
      icon: <MessageCircle size={24} className="trinetr-trust-icon-svg" />,
      title: 'Direct WhatsApp Support',
      desc: '1-click ordering, custom packaging & bulk wholesale support from the owner.',
      badge: 'Owner Direct'
    }
  ];

  return (
    <section className="trinetr-trust-strip-section" aria-label="Brand Quality Standards">
      <div className="trinetr-trust-strip-container">
        <div className="trinetr-trust-grid">
          {pillars.map((p, idx) => (
            <div key={idx} className="trinetr-trust-card">
              <div className="trinetr-trust-icon-box">
                {p.icon}
              </div>
              <div className="trinetr-trust-content">
                <div className="trinetr-trust-badge">{p.badge}</div>
                <h4 className="trinetr-trust-title">{p.title}</h4>
                <p className="trinetr-trust-desc">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
