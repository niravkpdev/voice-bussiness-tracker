import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, MessageCircle, CheckCircle, ShoppingBag, Truck, MapPin } from 'lucide-react';
import { useStoreCart } from '../context/StoreCartContext';
import { STORE_INFO } from '../data/namkeenData';

export function CartDrawer() {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    deliveryCharge,
    cartGrandTotal,
    generateWhatsAppOrderUrl
  } = useStoreCart();

  const [checkoutMode, setCheckoutMode] = useState('cart'); // 'cart' | 'guest-form' | 'success'
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'Surat',
    paymentMethod: 'cod'
  });
  const [orderConfirmedId, setOrderConfirmedId] = useState('');

  if (!cartDrawerOpen) return null;

  const handleWhatsAppOrder = () => {
    const url = generateWhatsAppOrderUrl(customer);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!customer.name || !customer.phone || !customer.address) {
      alert('Please enter your name, mobile number, and delivery address.');
      return;
    }

    const orderId = 'BG-' + Math.floor(100000 + Math.random() * 900000);
    setOrderConfirmedId(orderId);

    // Also persist order to local storage for history
    try {
      const orders = JSON.parse(localStorage.getItem('bhole_g_guest_orders') || '[]');
      orders.unshift({
        orderId,
        date: new Date().toISOString(),
        customer,
        items: cart,
        total: cartGrandTotal,
        status: 'Confirmed'
      });
      localStorage.setItem('bhole_g_guest_orders', JSON.stringify(orders));
    } catch (err) {
      console.error(err);
    }

    setCheckoutMode('success');
  };

  const handleFinish = () => {
    clearCart();
    setCheckoutMode('cart');
    setCartDrawerOpen(false);
  };

  return (
    <div className="bhole-drawer-overlay">
      <div className="bhole-drawer-backdrop" onClick={() => setCartDrawerOpen(false)} />

      <div className="bhole-cart-drawer">
        {/* Header */}
        <div className="bhole-drawer-header">
          <div className="bhole-drawer-title-box">
            <ShoppingBag size={20} className="text-amber" />
            <h3>Your Shopping Cart ({cart.length})</h3>
          </div>
          <button
            type="button"
            className="bhole-drawer-close"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode: Success View */}
        {checkoutMode === 'success' ? (
          <div className="bhole-order-success-view">
            <div className="success-icon-wrap">
              <CheckCircle size={56} className="text-success" />
            </div>
            <h3>Order Placed Successfully!</h3>
            <p className="order-id">Order ID: <strong>#{orderConfirmedId}</strong></p>
            <p className="order-msg">
              Thank you, <strong>{customer.name}</strong>! We have received your order for {customer.city}.
              Our team will prepare your fresh namkeens and dispatch them shortly.
            </p>

            <div className="success-actions">
              <button
                type="button"
                className="btn-whatsapp-full"
                onClick={handleWhatsAppOrder}
              >
                <MessageCircle size={18} />
                <span>Send Order Receipt via WhatsApp</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleFinish}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : checkoutMode === 'guest-form' ? (
          /* Mode: Fast Guest Checkout Form */
          <form onSubmit={handleGuestSubmit} className="bhole-guest-form">
            <div className="bhole-guest-header">
              <h4>Guest Delivery Details</h4>
              <p>No password needed! Enter your delivery address below.</p>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Shah"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Mobile / WhatsApp Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Delivery Address & Landmark *</label>
              <textarea
                required
                rows={3}
                placeholder="Flat / House No, Building, Street, Landmark..."
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>City / Location</label>
              <input
                type="text"
                value={customer.city}
                onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <div className="payment-options">
                <label className="radio-pill">
                  <input
                    type="radio"
                    name="pm"
                    value="cod"
                    checked={customer.paymentMethod === 'cod'}
                    onChange={() => setCustomer({ ...customer, paymentMethod: 'cod' })}
                  />
                  <span>Cash on Delivery (COD)</span>
                </label>
                <label className="radio-pill">
                  <input
                    type="radio"
                    name="pm"
                    value="upi"
                    checked={customer.paymentMethod === 'upi'}
                    onChange={() => setCustomer({ ...customer, paymentMethod: 'upi' })}
                  />
                  <span>UPI / QR on Delivery</span>
                </label>
              </div>
            </div>

            <div className="guest-form-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCheckoutMode('cart')}
              >
                Back to Cart
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Confirm Order (₹{cartGrandTotal.toFixed(2)})
              </button>
            </div>
          </form>
        ) : (
          /* Mode: Cart Items List */
          <>
            <div className="bhole-cart-items-scroll">
              {cart.length === 0 ? (
                <div className="bhole-cart-empty">
                  <ShoppingBag size={48} className="empty-icon" />
                  <h4>Your cart is currently empty</h4>
                  <p>Browse our best seller gathiya, wafers, and namkeens to add items.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartItemId} className="bhole-cart-item-row">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="bhole-cart-item-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=120&auto=format&fit=crop&q=80';
                      }}
                    />

                    <div className="bhole-cart-item-info">
                      <div className="cart-title-row">
                        <h5 className="cart-item-name">{item.name}</h5>
                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() => removeFromCart(item.cartItemId)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="cart-variant-badge">
                        <span>Pack: {item.variantWeight}</span>
                        {item.isNotForJain && <span className="nj-tag">NJ</span>}
                      </div>

                      <div className="cart-price-qty-row">
                        <span className="cart-unit-price">₹{item.price.toFixed(2)}</span>

                        <div className="cart-qty-pill">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            aria-label="Decrease"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            aria-label="Increase"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <span className="cart-line-total">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary & Action Buttons */}
            {cart.length > 0 && (
              <div className="bhole-cart-footer">
                <div className="bhole-cart-summary">
                  <div className="summary-row">
                    <span>Items Subtotal:</span>
                    <span>₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Delivery Charges:</span>
                    <span>{deliveryCharge === 0 ? <strong className="text-free">FREE</strong> : `₹${deliveryCharge.toFixed(2)}`}</span>
                  </div>
                  {deliveryCharge > 0 && (
                    <div className="free-shipping-tip">
                      <Truck size={13} />
                      <span>Add ₹{(500 - cartSubtotal).toFixed(2)} more for Free Shipping!</span>
                    </div>
                  )}
                  <div className="summary-row grand-total">
                    <span>Grand Total:</span>
                    <span>₹{cartGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bhole-checkout-actions">
                  {/* WhatsApp Direct Order Button */}
                  <button
                    type="button"
                    className="bhole-btn-whatsapp"
                    onClick={handleWhatsAppOrder}
                    title="Instant order via WhatsApp directly with store owner"
                  >
                    <MessageCircle size={18} />
                    <span>Order via WhatsApp</span>
                  </button>

                  {/* Fast Guest Checkout Button */}
                  <button
                    type="button"
                    className="bhole-btn-guest-checkout"
                    onClick={() => setCheckoutMode('guest-form')}
                  >
                    <span>Continue to Guest Checkout</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
