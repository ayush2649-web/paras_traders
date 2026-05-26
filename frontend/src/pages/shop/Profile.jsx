import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import { toast } from 'react-toastify';
import { FiUser, FiPackage, FiEdit2, FiSave, FiMapPin } from 'react-icons/fi';
import './Profile.css';

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function Profile() {
    const { user, updateProfile, logout } = useAuth();
    const { fetchCart } = useCart();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('orders');
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [reorderingOrderId, setReorderingOrderId] = useState(null);
    const [trackingCodeInput, setTrackingCodeInput] = useState('');
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gender: '',
    });

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('orders/');
            setOrders(res.data.results || res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.profile?.phone || '',
            address: user.profile?.address || '',
            city: user.profile?.city || '',
            state: user.profile?.state || '',
            pincode: user.profile?.pincode || '',
            gender: user.profile?.gender || '',
        });
        fetchOrders();
    }, [user, fetchOrders]);

    const handleSave = async () => {
        try {
            await updateProfile(form);
            setEditing(false);
            toast.success('Profile updated!');
        } catch {
            toast.error('Failed to update');
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                await API.delete('auth/delete/');
                logout();
                toast.success('Account deleted successfully');
                navigate('/');
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete account');
            }
        }
    };

    const statusColor = (status) => {
        const colors = {
            pending: '#f5a623',
            confirmed: '#3b82f6',
            shipped: '#8b5cf6',
            delivered: '#4ade80',
            cancelled: '#ef4444',
        };
        return colors[status] || '#888';
    };

    const canCancelOrder = (status) => ['pending', 'confirmed'].includes(status);
    const canReorderOrder = (order) => Array.isArray(order.items) && order.items.length > 0 && order.status !== 'cancelled';

    const formatDeliveryDate = (dateValue) => {
        if (!dateValue) return '-';
        const date = new Date(`${dateValue}T00:00:00`);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const shouldSuggestReorder = (order) => {
        if (order.status !== 'delivered') return false;
        const orderTime = new Date(order.order_date).getTime();
        const daysSinceOrder = Math.floor((Date.now() - orderTime) / (1000 * 60 * 60 * 24));
        return daysSinceOrder >= 21;
    };

    const handleCancelOrder = async (orderId) => {
        const confirmed = window.confirm('Cancel this order? Stock and payment status will be updated automatically.');
        if (!confirmed) return;

        try {
            setUpdatingOrderId(orderId);
            await API.post(`orders/${orderId}/cancel/`);
            toast.success('Order cancelled successfully');
            await fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to cancel order');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const goToTracking = (trackingCode) => {
        if (!trackingCode) return;
        navigate(`/track-order?code=${encodeURIComponent(trackingCode)}`);
    };

    const handleTrackByCode = (e) => {
        e.preventDefault();
        const code = trackingCodeInput.trim();
        if (!code) {
            toast.error('Enter tracking code');
            return;
        }
        goToTracking(code);
    };

    const handleReorder = async (order) => {
        if (!canReorderOrder(order)) {
            toast.info('This order has no items available to reorder');
            return;
        }

        setReorderingOrderId(order.id);
        try {
            const results = await Promise.allSettled(
                order.items.map((item) => API.post('cart/', {
                    product_id: item.product,
                    quantity: item.quantity,
                }))
            );
            const addedCount = results.filter((result) => result.status === 'fulfilled').length;
            const failedCount = results.length - addedCount;

            await fetchCart();

            if (addedCount === 0) {
                toast.error('Unable to add these items to cart');
                return;
            }

            if (failedCount > 0) {
                toast.warn(`${addedCount} item(s) added. ${failedCount} item(s) could not be reordered.`);
            } else {
                toast.success('Items added to cart');
            }

            navigate('/cart');
        } catch (err) {
            console.error(err);
            toast.error('Failed to reorder this order');
        } finally {
            setReorderingOrderId(null);
        }
    };

    const getGenderLabel = (value) => GENDER_OPTIONS.find((option) => option.value === value)?.label || '-';

    return (
        <div className="profile-page">
            <div className="profile-header-section">
                <div className="profile-avatar">
                    {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <h1>{user?.first_name} {user?.last_name}</h1>
                    <p>@{user?.username} | {user?.email}</p>
                </div>
            </div>

            <div className="profile-tabs">
                <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
                    <FiPackage /> Orders
                </button>
                <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
                    <FiUser /> Profile Settings
                </button>
            </div>

            {tab === 'orders' && (
                <div className="orders-section">
                    <div className="orders-head">
                        <h2>My Orders ({orders.length})</h2>
                        <form className="profile-track-form" onSubmit={handleTrackByCode}>
                            <FiMapPin />
                            <input
                                type="text"
                                value={trackingCodeInput}
                                onChange={(e) => setTrackingCodeInput(e.target.value)}
                                placeholder="Enter tracking code"
                            />
                            <button type="submit">Track</button>
                        </form>
                    </div>
                    {loading ? (
                        <div className="page-loader"><div className="spinner"></div></div>
                    ) : orders.length === 0 ? (
                        <div className="no-orders">
                            <p>You haven't placed any orders yet.</p>
                            <Link to="/products" className="btn-primary-lg">Start Shopping</Link>
                        </div>
                    ) : (
                        <div className="orders-list">
                            {orders.map((order) => (
                                <div key={order.id} className="order-card">
                                    <div className="order-card-header">
                                        <div>
                                            <strong>Order #{order.id}</strong>
                                            <span>{new Date(order.order_date).toLocaleDateString('en-IN', {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}</span>
                                        </div>
                                        <span className="order-status" style={{ color: statusColor(order.status), borderColor: statusColor(order.status) }}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="order-items-list">
                                        {order.items?.map((item) => (
                                            <div key={item.id} className="order-item-row">
                                                <span>{item.product_name}</span>
                                                <span>x{item.quantity}</span>
                                                <span>INR {Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="order-delivery-meta">
                                        <span>
                                            Delivery: {formatDeliveryDate(order.delivery_date)} | {order.delivery_slot_label || order.delivery_slot}
                                        </span>
                                        {order.eco_delivery && <span className="eco-delivery-pill">Green Delivery</span>}
                                    </div>
                                    <div className="order-tracking-meta">
                                        <span>
                                            Tracking Code: {order.tracking_code || 'Will be generated after delivery partner acceptance'}
                                        </span>
                                        {order.customer_delivery_otp && (
                                            <span className="customer-otp-chip">
                                                Delivery OTP: <strong>{order.customer_delivery_otp}</strong> (share with delivery partner)
                                            </span>
                                        )}
                                        {order.tracking_code && (
                                            <button
                                                type="button"
                                                className="track-order-btn"
                                                onClick={() => goToTracking(order.tracking_code)}
                                            >
                                                <FiMapPin /> Order List
                                            </button>
                                        )}
                                    </div>
                                    <div className="order-card-footer">
                                        <span>
                                            Payment: {order.payment_method}
                                            {order.payment && (
                                                <span className="payment-status-badge" data-status={order.payment.status}>
                                                    {order.payment.status}
                                                </span>
                                            )}
                                        </span>
                                        <div className="order-footer-actions">
                                            {shouldSuggestReorder(order) && (
                                                <span className="reorder-reminder-chip">Time to restock</span>
                                            )}
                                            <strong>Total: INR {Number(order.total_amount).toLocaleString('en-IN')}</strong>
                                            {canReorderOrder(order) && (
                                                <button
                                                    type="button"
                                                    className="buy-again-btn"
                                                    onClick={() => handleReorder(order)}
                                                    disabled={reorderingOrderId === order.id}
                                                >
                                                    {reorderingOrderId === order.id ? 'Adding...' : 'Buy Again'}
                                                </button>
                                            )}
                                            {canCancelOrder(order.status) && (
                                                <button
                                                    className="cancel-order-btn"
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    disabled={updatingOrderId === order.id}
                                                >
                                                    {updatingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'profile' && (
                <div className="profile-settings">
                    <div className="settings-header">
                        <h2>Profile Settings</h2>
                        {!editing ? (
                            <button className="edit-btn" onClick={() => setEditing(true)}><FiEdit2 /> Edit</button>
                        ) : (
                            <button className="save-btn" onClick={handleSave}><FiSave /> Save</button>
                        )}
                    </div>
                    <div className="settings-grid">
                        {Object.entries(form).map(([key, val]) => (
                            <div className="setting-field" key={key}>
                                <label>{key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</label>
                                {editing ? (
                                    key === 'gender' ? (
                                        <select value={val} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                                            <option value="">Select gender</option>
                                            {GENDER_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input value={val} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                                    )
                                ) : (
                                    <p>{key === 'gender' ? getGenderLabel(val) : (val || '-')}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="danger-zone" style={{ marginTop: '3rem', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '2rem' }}>
                        <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.1rem' }}>Danger Zone</h3>
                        <button
                            onClick={handleDeleteAccount}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FiUser /> Delete My Account
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
