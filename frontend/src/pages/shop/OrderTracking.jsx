import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiMapPin, FiPackage } from 'react-icons/fi';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import './OrderTracking.css';

const ORDER_LIST_FILTERS = [
    { value: 'all', label: 'All Orders' },
    { value: 'current', label: 'Current Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-IN');
}

function formatDeliveryDate(value) {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function buildStatusTimelineFromOrder(order) {
    const statusRank = {
        pending: 0,
        confirmed: 1,
        shipped: 2,
        delivered: 3,
        cancelled: -1,
    };
    const currentRank = statusRank[order.status] ?? 0;

    const steps = [
        { key: 'placed', label: 'Order Placed', at: order.order_date },
        { key: 'confirmed', label: 'Order Confirmed', at: order.confirmed_at },
        { key: 'shipped', label: 'Out for Delivery', at: order.shipped_at },
        { key: 'delivered', label: 'Delivered', at: order.delivered_at },
    ];

    const resolved = steps.map((step, index) => {
        if (step.at) return { ...step, state: 'done' };
        if (order.status === 'cancelled') return { ...step, state: 'pending' };
        if (index <= currentRank) return { ...step, state: 'current' };
        return { ...step, state: 'pending' };
    });

    if (order.status === 'cancelled') {
        resolved.push({
            key: 'cancelled',
            label: 'Order Cancelled',
            at: order.updated_at || order.order_date,
            state: 'done',
        });
    }

    return resolved;
}

function buildTrackingPreview(order) {
    return {
        tracking_code: order.tracking_code || null,
        order_id: order.id,
        status: order.status,
        assignment_status: order.assignment_status,
        assignment_status_label: order.assignment_status_label || order.assignment_status || 'Unassigned',
        delivery_partner: order.assigned_delivery_partner_username || null,
        delivery_date: order.delivery_date,
        delivery_slot: order.delivery_slot,
        delivery_slot_label: order.delivery_slot_label,
        delivery_otp_required: Boolean(order.delivery_otp_required),
        delivery_otp_verified_at: order.delivery_otp_verified_at || null,
        customer_delivery_otp: order.customer_delivery_otp || null,
        shipping_city: order.shipping_city,
        items: order.items || [],
        timeline: buildStatusTimelineFromOrder(order),
        last_updated: order.updated_at || order.order_date,
        is_preview: true,
    };
}

export default function OrderTracking() {
    const [searchParams, setSearchParams] = useSearchParams();
    const codeFromUrl = (searchParams.get('code') || '').trim();
    const orderFromUrl = (searchParams.get('order') || '').trim();
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [trackingData, setTrackingData] = useState(null);
    const [previewTrackingData, setPreviewTrackingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [listFilter, setListFilter] = useState('all');

    const activeTrackingData = previewTrackingData || trackingData;
    const isDetailsMode = Boolean(codeFromUrl || orderFromUrl || activeTrackingData);

    const fetchTracking = useCallback(async (rawCode) => {
        const code = rawCode.trim();
        if (!code) {
            setTrackingData(null);
            setError('');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const res = await API.get(`orders/track/${encodeURIComponent(code)}/`);
            setTrackingData(res.data);
        } catch (err) {
            console.error(err);
            setTrackingData(null);
            setError(err.response?.data?.error || 'Tracking code not found');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            setLoadingOrders(true);
            const res = await API.get('orders/');
            const results = res.data?.results || res.data || [];
            setOrders(Array.isArray(results) ? results : []);
        } catch (err) {
            console.error(err);
            setOrders([]);
            toast.error(err.response?.data?.error || 'Failed to load order list');
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        if (!codeFromUrl) return;
        setPreviewTrackingData(null);
        fetchTracking(codeFromUrl);
    }, [codeFromUrl, fetchTracking]);

    useEffect(() => {
        if (codeFromUrl || !orderFromUrl) return;

        const orderId = Number(orderFromUrl);
        if (!Number.isInteger(orderId) || orderId <= 0) {
            setPreviewTrackingData(null);
            setError('Invalid order id');
            return;
        }

        const selectedOrder = orders.find((item) => item.id === orderId);
        if (selectedOrder) {
            setTrackingData(null);
            setError('');
            setPreviewTrackingData(buildTrackingPreview(selectedOrder));
            return;
        }

        if (!loadingOrders) {
            setPreviewTrackingData(null);
            setTrackingData(null);
            setError('Order not found');
        }
    }, [codeFromUrl, orderFromUrl, orders, loadingOrders]);

    useEffect(() => {
        if (codeFromUrl || orderFromUrl) return;
        setTrackingData(null);
        setPreviewTrackingData(null);
        setError('');
    }, [codeFromUrl, orderFromUrl]);

    const openOrderDetailsInCurrentPage = (order) => {
        const code = (order.tracking_code || '').trim();
        if (code) {
            setPreviewTrackingData(null);
            setError('');
            if (codeFromUrl === code) {
                fetchTracking(code);
            } else {
                setSearchParams({ code });
            }
            return;
        }

        setTrackingData(null);
        setError('');
        setSearchParams({ order: String(order.id) });
        setPreviewTrackingData(buildTrackingPreview(order));
    };

    const trackFromOrder = (order) => {
        if (!order) return;
        openOrderDetailsInCurrentPage(order);
    };

    const backToOrderList = () => {
        setSearchParams({});
        setTrackingData(null);
        setPreviewTrackingData(null);
        setError('');
    };

    const filteredOrders = useMemo(() => {
        if (listFilter === 'all') return orders;
        if (listFilter === 'current') {
            return orders.filter((order) => ['pending', 'confirmed', 'shipped'].includes(order.status));
        }
        return orders.filter((order) => order.status === listFilter);
    }, [orders, listFilter]);

    return (
        <div className="tracking-page">
            <div className="tracking-header">
                <div>
                    <h1><FiMapPin /> Order Tracking</h1>
                    <p>Track the full flow from confirmation to delivery from your order list.</p>
                </div>
                {isDetailsMode && (
                    <div className="tracking-header-actions">
                        <button type="button" className="tracking-back-btn" onClick={backToOrderList}>
                            <FiPackage /> Back to Order List
                        </button>
                    </div>
                )}
            </div>

            {!isDetailsMode && (
                <div className="tracking-order-list-card">
                    <div className="tracking-order-list-head">
                        <h2><FiPackage /> Order List</h2>
                        <div className="tracking-list-controls">
                            <select
                                value={listFilter}
                                onChange={(e) => setListFilter(e.target.value)}
                                className="tracking-list-filter"
                            >
                                {ORDER_LIST_FILTERS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span>{filteredOrders.length} / {orders.length} Orders</span>
                        </div>
                    </div>
                    {loadingOrders ? (
                        <p className="tracking-help">Loading orders...</p>
                    ) : orders.length === 0 ? (
                        <p className="tracking-help">No orders found yet.</p>
                    ) : filteredOrders.length === 0 ? (
                        <p className="tracking-help">No orders match this filter.</p>
                    ) : (
                        <div className="tracking-order-list">
                            {filteredOrders.map((order) => {
                                const isCurrentOrder = ['pending', 'confirmed', 'shipped'].includes(order.status);
                                const isCancelled = order.status === 'cancelled';
                                const isSelected = activeTrackingData?.order_id === order.id;
                                return (
                                    <div className={`tracking-order-row ${isSelected ? 'selected' : ''}`} key={order.id}>
                                        <div className="tracking-order-main">
                                            <button
                                                type="button"
                                                className="tracking-order-id-btn"
                                                onClick={() => trackFromOrder(order)}
                                            >
                                                Order #{order.id}
                                            </button>
                                            <p>
                                                {new Date(order.order_date).toLocaleDateString('en-IN')} | {order.status}
                                            </p>
                                            <p>Tracking: {order.tracking_code || 'Pending generation'}</p>
                                        </div>
                                        {isCurrentOrder ? (
                                            <button
                                                type="button"
                                                className="tracking-order-action-btn"
                                                onClick={() => trackFromOrder(order)}
                                            >
                                                Track
                                            </button>
                                        ) : (
                                            <span className={`tracking-order-state ${isCancelled ? 'cancelled' : 'completed'}`}>
                                                {isCancelled ? 'Cancelled' : 'Completed'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="page-loader"><div className="spinner"></div></div>
            )}

            {!loading && error && (
                <div className="tracking-error">
                    <FiClock />
                    <p>{error}</p>
                </div>
            )}

            {!loading && activeTrackingData && (
                <div className="tracking-result" id="tracking-result-section">
                    {activeTrackingData.is_preview && (
                        <p className="tracking-preview-note">
                            Live tracking code not generated yet. Showing current order status.
                        </p>
                    )}
                    <div className="tracking-overview-grid">
                        <article className="tracking-info-card">
                            <span>Order ID</span>
                            <strong>#{activeTrackingData.order_id}</strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Order Status</span>
                            <strong className={`status-${activeTrackingData.status}`}>{activeTrackingData.status}</strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Assignment</span>
                            <strong>{activeTrackingData.assignment_status_label}</strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Delivery OTP</span>
                            <strong>
                                {activeTrackingData.delivery_otp_verified_at
                                    ? 'Verified'
                                    : activeTrackingData.customer_delivery_otp
                                        ? activeTrackingData.customer_delivery_otp
                                    : activeTrackingData.delivery_otp_required
                                        ? 'Pending Verification'
                                        : 'Not Required'}
                            </strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Delivery Partner</span>
                            <strong>{activeTrackingData.delivery_partner || 'Pending assignment'}</strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Delivery Window</span>
                            <strong>
                                {formatDeliveryDate(activeTrackingData.delivery_date)} | {activeTrackingData.delivery_slot_label}
                            </strong>
                        </article>
                        <article className="tracking-info-card">
                            <span>Last Updated</span>
                            <strong>{formatDateTime(activeTrackingData.last_updated)}</strong>
                        </article>
                    </div>

                    <div className="tracking-body-grid">
                        <section className="timeline-card">
                            <h3><FiClock /> Timeline</h3>
                            <ul className="tracking-timeline">
                                {activeTrackingData.timeline?.map((step) => (
                                    <li key={step.key} className={`timeline-step ${step.state}`}>
                                        <span className="timeline-dot" />
                                        <div>
                                            <h4>{step.label}</h4>
                                            <p>
                                                {step.at ? formatDateTime(step.at) : step.state === 'current' ? 'In progress' : 'Pending'}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="timeline-card">
                            <h3><FiPackage /> Order Items</h3>
                            <ul className="tracking-items">
                                {activeTrackingData.items?.map((item) => (
                                    <li key={`${activeTrackingData.order_id}-${item.product_name}`}>
                                        <span>{item.product_name}</span>
                                        <strong>x{item.quantity}</strong>
                                    </li>
                                ))}
                            </ul>
                            <p className="tracking-city">Destination: {activeTrackingData.shipping_city}</p>
                        </section>
                    </div>
                </div>
            )}

            <div className="tracking-footer-links">
                <Link to="/profile">Go to My Orders</Link>
                <Link to="/products">Continue Shopping</Link>
            </div>
        </div>
    );
}
