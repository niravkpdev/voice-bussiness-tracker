import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

export function CustomerReviewsSection() {
  const reviews = [
    {
      id: 1,
      name: 'Pooja Shah',
      location: 'Athwa Lines, Surat',
      rating: 5,
      product: 'Vanela Gathiya & Tikha Papdi',
      comment: 'The gathiya arrived fresh and still had that warm, authentic kitchen aroma! You can immediately taste the difference that pure singtel makes compared to supermarket packets.',
      date: '2 days ago'
    },
    {
      id: 2,
      name: 'Kiritbhai Patel',
      location: 'Borivali West, Mumbai',
      rating: 5,
      product: 'Special Royal Combo - 8 Taste Pack',
      comment: 'Ordered for our family gathering in Mumbai. Delivered in 24 hours in moisture-tight nitrogen bags. Every snack was ultra-crisp. Will definitely order every month!',
      date: '1 week ago'
    },
    {
      id: 3,
      name: 'Mehul Mehta',
      location: 'Navrangpura, Ahmedabad',
      rating: 5,
      product: 'Sing Dana & Bhakarwadi',
      comment: 'The Bhakarwadi has the perfect balance of sweet, tangy, and spicy masala. Ordering through WhatsApp took just 15 seconds. Very genuine and prompt service!',
      date: '2 weeks ago'
    }
  ];

  return (
    <section className="trinetr-reviews-section" aria-label="Customer Reviews">
      <div className="trinetr-reviews-container">
        <div className="trinetr-reviews-header">
          <div className="trinetr-title-with-pill">
            <span className="pill-flair">Verified Snackers</span>
            <h2 className="trinetr-section-title">Loved by Thousands of Families</h2>
          </div>
          <p className="trinetr-section-subtitle">
            Authentic taste, handcrafted hygiene, and express delivery across Gujarat & Mumbai.
          </p>
        </div>

        <div className="trinetr-reviews-grid">
          {reviews.map((rev) => (
            <div key={rev.id} className="trinetr-review-card">
              <div className="trinetr-review-top">
                <div className="trinetr-review-stars">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <span className="trinetr-review-date">{rev.date}</span>
              </div>

              <p className="trinetr-review-comment">"{rev.comment}"</p>

              <div className="trinetr-review-footer">
                <div className="trinetr-review-author-avatar">
                  {rev.name[0]}
                </div>
                <div className="trinetr-review-author-info">
                  <div className="trinetr-review-author-name">
                    <span>{rev.name}</span>
                    <CheckCircle2 size={14} className="trinetr-verified-badge" />
                  </div>
                  <span className="trinetr-review-location">{rev.location}</span>
                  <span className="trinetr-review-product-tag">Ordered: {rev.product}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
