import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { FiCheck } from 'react-icons/fi';
import './Checkout.css';

const DELIVERY_WINDOW_DAYS = 14;

const SLOT_LABELS = {
    morning: 'Morning (9 AM - 12 PM)',
    afternoon: 'Afternoon (12 PM - 4 PM)',
    evening: 'Evening (4 PM - 9 PM)',
};

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateWithOffset(days) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
}

function formatDeliveryDate(dateValue) {
    if (!dateValue) return '-';
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Checkout() {
    const { cartItems, cartTotal, loading: cartLoading, fetchCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(null);
    const [form, setForm] = useState({
        shipping_name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
        shipping_address: user?.profile?.address || '',
        shipping_city: user?.profile?.city || '',
        shipping_state: user?.profile?.state || '',
        shipping_pincode: user?.profile?.pincode || '',
        shipping_phone: user?.profile?.phone || '',
        delivery_date: getDateWithOffset(1),
        delivery_slot: 'evening',
        eco_delivery: false,
        payment_method: 'COD',
        save_address: false,
    });

    const minDeliveryDate = getDateWithOffset(0);
    const maxDeliveryDate = getDateWithOffset(DELIVERY_WINDOW_DAYS);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [e.target.name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('orders/create/', form);
            await fetchCart();
            setOrderPlaced(res.data);
            toast.success('Order placed successfully!');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const firstError = Object.values(data)[0];
                const message = Array.isArray(firstError) ? firstError[0] : firstError;
                toast.error(message || 'Failed to place order');
            } else {
                toast.error(data?.error || 'Failed to place order');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!cartLoading && cartItems.length === 0 && !orderPlaced) {
            navigate('/cart');
        }
    }, [cartLoading, cartItems, orderPlaced, navigate]);

    if (cartLoading) return <div className="page-loader"><div className="spinner"></div></div>;

    if (orderPlaced) {
        return (
            <div className="order-success">
                <div className="success-icon"><FiCheck /></div>
                <h1>Order Placed Successfully!</h1>
                <p>Your order <strong>#{orderPlaced.id}</strong> has been confirmed.</p>
                <div className="success-details">
                    <div><strong>Total:</strong> INR {Number(orderPlaced.total_amount).toLocaleString('en-IN')}</div>
                    <div><strong>Payment:</strong> {orderPlaced.payment_method}</div>
                    <div><strong>Status:</strong> {orderPlaced.status}</div>
                    <div><strong>Delivery:</strong> {formatDeliveryDate(orderPlaced.delivery_date)}</div>
                    <div><strong>Slot:</strong> {orderPlaced.delivery_slot_label || SLOT_LABELS[orderPlaced.delivery_slot] || orderPlaced.delivery_slot}</div>
                    <div><strong>Eco Delivery:</strong> {orderPlaced.eco_delivery ? 'Enabled' : 'No'}</div>
                </div>
                <div className="success-actions">
                    <Link to="/profile" className="btn-primary-lg">View Orders</Link>
                    <Link to="/rewards" className="btn-outline-lg">Scratch Reward</Link>
                    <Link to="/products" className="btn-outline-lg">Continue Shopping</Link>
                </div>
            </div>
        );
    }

    if (cartItems.length === 0) return null;

    const shipping = cartTotal >= 999 ? 0 : 99;

    return (
        <div className="checkout-page">
            <h1>Checkout</h1>
            <div className="checkout-layout">
                <form className="checkout-form" onSubmit={handleSubmit}>
                    <h2>Shipping Information</h2>
                    <div className="form-grid">
                        <div className="form-group full">
                            <label>Full Name *</label>
                            <input name="shipping_name" value={form.shipping_name} onChange={handleChange} required />
                        </div>
                        <div className="form-group full">
                            <label>Address *</label>
                            <textarea name="shipping_address" value={form.shipping_address} onChange={handleChange} required rows={3} />
                        </div>
                        <div className="form-group">
                            <label>City *</label>
                            <input name="shipping_city" value={form.shipping_city} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>State *</label>
                            <input name="shipping_state" value={form.shipping_state} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Pincode *</label>
                            <input name="shipping_pincode" value={form.shipping_pincode} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Phone *</label>
                            <input name="shipping_phone" value={form.shipping_phone} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group full" style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none' }}>
                            <input
                                type="checkbox"
                                name="save_address"
                                checked={form.save_address}
                                onChange={handleChange}
                                style={{ width: 'auto' }}
                            />
                            Save this address for future orders
                        </label>
                    </div>

                    <h2>Delivery Preferences</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Delivery Date *</label>
                            <input
                                type="date"
                                name="delivery_date"
                                min={minDeliveryDate}
                                max={maxDeliveryDate}
                                value={form.delivery_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Time Slot *</label>
                            <select
                                name="delivery_slot"
                                value={form.delivery_slot}
                                onChange={handleChange}
                                required
                            >
                                {Object.entries(SLOT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group full">
                            <label className="eco-checkbox-label">
                                <input
                                    type="checkbox"
                                    name="eco_delivery"
                                    checked={form.eco_delivery}
                                    onChange={handleChange}
                                />
                                Green delivery: eco-friendly packaging and optimized dispatch
                            </label>
                        </div>
                    </div>

                    <h2>Payment Method</h2>
                    <div className="payment-options">
                        <label className={form.payment_method === 'COD' ? 'active' : ''}>
                            <input type="radio" name="payment_method" value="COD"
                                checked={form.payment_method === 'COD'} onChange={handleChange} />
                            <div>
                                <strong>Cash on Delivery</strong>
                                <span>Pay when you receive your order</span>
                            </div>
                        </label>
                        <label className={form.payment_method === 'UPI' ? 'active' : ''}>
                            <input type="radio" name="payment_method" value="UPI"
                                checked={form.payment_method === 'UPI'} onChange={handleChange} />
                            <div>
                                <strong>UPI Payment</strong>
                                <span>Pay via UPI (demo mode)</span>
                            </div>
                        </label>
                        <label className={form.payment_method === 'Card' ? 'active' : ''}>
                            <input type="radio" name="payment_method" value="Card"
                                checked={form.payment_method === 'Card'} onChange={handleChange} />
                            <div>
                                <strong>Credit / Debit Card</strong>
                                <span>Secure card payment (demo mode)</span>
                            </div>
                        </label>
                    </div>

                    <button type="submit" className="btn-place-order" disabled={loading}>
                        {loading ? 'Placing Order...' : `Place Order - INR ${(cartTotal + shipping).toLocaleString('en-IN')}`}
                    </button>
                </form>

                <div className="checkout-summary">
                    <h3>Order Summary</h3>
                    <div className="checkout-items">
                        {cartItems.map((item) => (
                            <div key={item.id || item.product?.id} className="checkout-item">
                                <span className="ci-name">{item.product?.name}</span>
                                <span className="ci-qty">x{item.quantity}</span>
                                <span className="ci-price">INR {(Number(item.product?.price) * item.quantity).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="summary-row"><span>Subtotal</span><span>INR {cartTotal.toLocaleString('en-IN')}</span></div>
                    <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `INR ${shipping}`}</span></div>
                    <div className="summary-row"><span>Delivery Date</span><span>{formatDeliveryDate(form.delivery_date)}</span></div>
                    <div className="summary-row"><span>Delivery Slot</span><span>{SLOT_LABELS[form.delivery_slot]}</span></div>
                    <div className="summary-row"><span>Green Delivery</span><span>{form.eco_delivery ? 'Yes' : 'No'}</span></div>
                    <div className="summary-row total"><span>Total</span><span>INR {(cartTotal + shipping).toLocaleString('en-IN')}</span></div>
                </div>
            </div>
        </div>
    );
}
