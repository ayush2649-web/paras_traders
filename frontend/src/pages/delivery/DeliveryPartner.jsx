import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import {
    FiBell,
    FiCheckCircle,
    FiClock,
    FiCopy,
    FiFilter,
    FiMapPin,
    FiPhoneCall,
    FiRefreshCw,
    FiSearch,
    FiTruck,
} from 'react-icons/fi';
import './DeliveryPartner.css';

const STATUS_OPTIONS = [
    { value: '', label: 'All Assigned Orders' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
];

const ASSIGNMENT_OPTIONS = [
    { value: '', label: 'All Assignment States' },
    { value: 'pending', label: 'Pending Acceptance' },
    { value: 'accepted', label: 'Accepted by Me' },
];

const SLOT_OPTIONS = [
    { value: '', label: 'All Time Slots' },
    { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
    { value: 'evening', label: 'Evening (4 PM - 9 PM)' },
];

const STATUS_PRIORITY = {
    shipped: 0,
    confirmed: 1,
    delivered: 2,
    cancelled: 3,
};

const STATUS_STAGE = {
    confirmed: 1,
    shipped: 2,
    delivered: 3,
    cancelled: 3,
};

function nextStatusFor(orderStatus) {
    if (orderStatus === 'confirmed') return 'shipped';
    if (orderStatus === 'shipped') return 'delivered';
    return null;
}

function nextStatusLabel(orderStatus) {
    if (orderStatus === 'confirmed') return 'Mark as Shipped';
    if (orderStatus === 'shipped') return 'Mark as Delivered';
    return null;
}

function assignmentBadgeColor(status) {
    const map = {
        pending: '#f5a623',
        accepted: '#4ade80',
        rejected: '#ef4444',
        unassigned: '#94a3b8',
    };
    return map[status] || '#94a3b8';
}

function toLocalDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

function getDueMeta(deliveryDate, status) {
    if (!deliveryDate || ['delivered', 'cancelled'].includes(status)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${deliveryDate}T00:00:00`);

    const daysDiff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (daysDiff < 0) {
        return { label: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''}`, tone: 'overdue' };
    }
    if (daysDiff === 0) return { label: 'Due Today', tone: 'today' };
    if (daysDiff === 1) return { label: 'Due Tomorrow', tone: 'soon' };
    return null;
}

function getAddressMapUrl(order) {
    const query = [
        order.shipping_address,
        order.shipping_city,
        order.shipping_state,
        order.shipping_pincode,
    ].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getTotalItems(orderItems) {
    if (!Array.isArray(orderItems)) return 0;
    return orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export default function DeliveryPartner() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState('');
    const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
    const [deliverySlotFilter, setDeliverySlotFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [acceptingOrderId, setAcceptingOrderId] = useState(null);
    const [deliveryOtpInputs, setDeliveryOtpInputs] = useState({});
    const [markingNotificationId, setMarkingNotificationId] = useState(null);
    const [markingAllNotifications, setMarkingAllNotifications] = useState(false);

    const notificationInitRef = useRef(false);
    const knownNotificationIdsRef = useRef(new Set());

    const todayIso = useMemo(() => toLocalDateInput(new Date()), []);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (assignmentFilter) params.assignment_status = assignmentFilter;
            if (deliveryDateFilter) params.delivery_date = deliveryDateFilter;
            if (deliverySlotFilter) params.delivery_slot = deliverySlotFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await API.get('delivery/orders/', { params });
            setOrders(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to load delivery orders');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, assignmentFilter, deliveryDateFilter, deliverySlotFilter, searchTerm]);

    const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) {
                setNotificationsLoading(true);
            }
            const res = await API.get('delivery/notifications/', { params: { limit: 8 } });
            const payload = res.data || {};
            const items = Array.isArray(payload.results) ? payload.results : [];

            setNotifications(items);
            setUnreadNotifications(Number(payload.unread_count || 0));

            const knownIds = knownNotificationIdsRef.current;
            const newItems = items.filter((item) => !knownIds.has(item.id));

            if (notificationInitRef.current && newItems.length > 0) {
                const newest = newItems[0];
                toast.info(`New order notification: #${newest.order_id}`);
            }

            knownNotificationIdsRef.current = new Set(items.map((item) => item.id));
            notificationInitRef.current = true;
        } catch (err) {
            if (!silent) {
                console.error(err);
                toast.error(err.response?.data?.error || 'Failed to load notifications');
            }
        } finally {
            if (!silent) {
                setNotificationsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        const pollId = window.setInterval(() => {
            fetchNotifications({ silent: true });
        }, 25000);

        return () => {
            window.clearInterval(pollId);
        };
    }, [fetchNotifications]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchTerm(searchInput.trim());
    };

    const clearAllFilters = () => {
        setSearchInput('');
        setSearchTerm('');
        setStatusFilter('');
        setAssignmentFilter('');
        setDeliveryDateFilter('');
        setDeliverySlotFilter('');
    };

    const handleRefresh = async () => {
        await Promise.all([
            fetchOrders(),
            fetchNotifications(),
        ]);
    };

    const handleMarkNotificationRead = async (notificationId) => {
        try {
            setMarkingNotificationId(notificationId);
            await API.patch(`delivery/notifications/${notificationId}/read/`, {});
            setNotifications((prev) => prev.map((item) => (
                item.id === notificationId ? { ...item, is_read: true } : item
            )));
            setUnreadNotifications((prev) => Math.max(prev - 1, 0));
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to mark notification as read');
        } finally {
            setMarkingNotificationId(null);
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        if (!unreadNotifications) return;
        try {
            setMarkingAllNotifications(true);
            await API.post('delivery/notifications/read-all/', {});
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
            setUnreadNotifications(0);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to mark all notifications as read');
        } finally {
            setMarkingAllNotifications(false);
        }
    };

    const applyQuickFilter = (type) => {
        if (type === 'all') {
            clearAllFilters();
            return;
        }
        if (type === 'pending') {
            setStatusFilter('');
            setAssignmentFilter('pending');
            return;
        }
        if (type === 'in_transit') {
            setStatusFilter('shipped');
            setAssignmentFilter('accepted');
            return;
        }
        if (type === 'delivered') {
            setStatusFilter('delivered');
            setAssignmentFilter('');
            return;
        }
        if (type === 'today') {
            setDeliveryDateFilter(todayIso);
        }
    };

    const handleAcceptAssignment = async (order) => {
        try {
            setAcceptingOrderId(order.id);
            await API.patch(`delivery/orders/${order.id}/accept/`, {});
            toast.success(`Accepted order #${order.id}`);
            await fetchOrders();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to accept assignment');
        } finally {
            setAcceptingOrderId(null);
        }
    };

    const handleStatusUpdate = async (order) => {
        const nextStatus = nextStatusFor(order.status);
        if (!nextStatus) return;

        const payload = { status: nextStatus };
        if (nextStatus === 'delivered') {
            const deliveryOtp = (deliveryOtpInputs[order.id] || '').trim();
            if (deliveryOtp.length !== 6) {
                toast.error('Enter valid 6-digit customer OTP before marking delivered');
                return;
            }
            payload.delivery_otp = deliveryOtp;
        }

        try {
            setUpdatingOrderId(order.id);
            await API.patch(`delivery/orders/${order.id}/status/`, payload);
            toast.success(`Order #${order.id} updated to ${nextStatus}`);
            if (nextStatus === 'delivered') {
                setDeliveryOtpInputs((prev) => {
                    const next = { ...prev };
                    delete next[order.id];
                    return next;
                });
            }
            await fetchOrders();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to update order status');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleDeliveryOtpChange = (orderId, value) => {
        const sanitized = value.replace(/\D/g, '').slice(0, 6);
        setDeliveryOtpInputs((prev) => ({ ...prev, [orderId]: sanitized }));
    };

    const handleCopyTrackingCode = async (trackingCode) => {
        if (!trackingCode) return;
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error('Clipboard not supported');
            }
            await navigator.clipboard.writeText(trackingCode);
            toast.success(`Tracking code ${trackingCode} copied`);
        } catch {
            toast.info(`Tracking code: ${trackingCode}`);
        }
    };

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const statusRank = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
            if (statusRank !== 0) return statusRank;

            const dateA = a.delivery_date ? new Date(`${a.delivery_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.delivery_date ? new Date(`${b.delivery_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
            if (dateA !== dateB) return dateA - dateB;

            return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
        });
    }, [orders]);

    const stats = useMemo(() => {
        const pendingAcceptance = orders.filter((order) => order.assignment_status === 'pending').length;
        const inTransit = orders.filter((order) => order.status === 'shipped').length;
        const delivered = orders.filter((order) => order.status === 'delivered').length;
        const dueToday = orders.filter(
            (order) => order.delivery_date === todayIso && !['delivered', 'cancelled'].includes(order.status)
        ).length;
        const overdue = orders.filter((order) => {
            if (!order.delivery_date || ['delivered', 'cancelled'].includes(order.status)) return false;
            return order.delivery_date < todayIso;
        }).length;

        const total = orders.length;
        const completionRate = total ? Math.round((delivered / total) * 100) : 0;
        return { pendingAcceptance, inTransit, delivered, dueToday, overdue, total, completionRate };
    }, [orders, todayIso]);

    const isAnyFilterActive = Boolean(
        searchTerm || statusFilter || assignmentFilter || deliveryDateFilter || deliverySlotFilter
    );

    const quickState = {
        all: !isAnyFilterActive,
        pending: assignmentFilter === 'pending',
        inTransit: statusFilter === 'shipped',
        delivered: statusFilter === 'delivered',
        today: deliveryDateFilter === todayIso,
    };

    return (
        <div className="delivery-page">
            <div className="delivery-header">
                <div>
                    <h1><FiTruck /> Delivery Partner Panel</h1>
                    <p>Handle assignments quickly, keep customers updated, and verify secure handoff OTP.</p>
                </div>
                <div className="delivery-header-actions">
                    <button type="button" className="refresh-btn" onClick={handleRefresh}>
                        <FiRefreshCw /> Refresh
                    </button>
                    {isAnyFilterActive && (
                        <button type="button" className="clear-btn" onClick={clearAllFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <section className="delivery-notification-panel">
                <div className="delivery-notification-head">
                    <h2><FiBell /> Notifications</h2>
                    <div className="delivery-notification-head-actions">
                        <span className={`notification-count-badge ${unreadNotifications ? 'has-unread' : ''}`}>
                            {unreadNotifications} unread
                        </span>
                        <button
                            type="button"
                            className="small-ghost-btn"
                            onClick={handleMarkAllNotificationsRead}
                            disabled={!unreadNotifications || markingAllNotifications}
                        >
                            {markingAllNotifications ? 'Marking...' : 'Mark All Read'}
                        </button>
                    </div>
                </div>

                {notificationsLoading ? (
                    <p className="delivery-notification-empty">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                    <p className="delivery-notification-empty">No order notifications yet.</p>
                ) : (
                    <ul className="delivery-notification-list">
                        {notifications.map((notification) => (
                            <li
                                key={notification.id}
                                className={`delivery-notification-item ${notification.is_read ? 'read' : 'unread'}`}
                            >
                                <div className="delivery-notification-content">
                                    <p className="delivery-notification-title">{notification.title}</p>
                                    <p className="delivery-notification-message">{notification.message}</p>
                                    <p className="delivery-notification-meta">
                                        Order #{notification.order_id} | {formatDateTime(notification.created_at)}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <button
                                        type="button"
                                        className="small-ghost-btn"
                                        onClick={() => handleMarkNotificationRead(notification.id)}
                                        disabled={markingNotificationId === notification.id}
                                    >
                                        {markingNotificationId === notification.id ? 'Marking...' : 'Mark Read'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <div className="delivery-stats">
                <button
                    type="button"
                    className={`delivery-stat-card ${quickState.all ? 'active' : ''}`}
                    onClick={() => applyQuickFilter('all')}
                >
                    <span>Total Assigned</span>
                    <strong>{stats.total}</strong>
                </button>
                <button
                    type="button"
                    className={`delivery-stat-card ${quickState.pending ? 'active' : ''}`}
                    onClick={() => applyQuickFilter('pending')}
                >
                    <span>Pending Acceptance</span>
                    <strong>{stats.pendingAcceptance}</strong>
                </button>
                <button
                    type="button"
                    className={`delivery-stat-card ${quickState.inTransit ? 'active' : ''}`}
                    onClick={() => applyQuickFilter('in_transit')}
                >
                    <span>In Transit</span>
                    <strong>{stats.inTransit}</strong>
                </button>
                <button
                    type="button"
                    className={`delivery-stat-card ${quickState.delivered ? 'active' : ''}`}
                    onClick={() => applyQuickFilter('delivered')}
                >
                    <span>Delivered</span>
                    <strong>{stats.delivered}</strong>
                </button>
                <button
                    type="button"
                    className={`delivery-stat-card ${quickState.today ? 'active' : ''}`}
                    onClick={() => applyQuickFilter('today')}
                >
                    <span>Due Today</span>
                    <strong>{stats.dueToday}</strong>
                </button>
                <div className="delivery-stat-card">
                    <span>Completion Rate</span>
                    <strong>{stats.completionRate}%</strong>
                    <p className="delivery-stat-subtext">Overdue: {stats.overdue}</p>
                </div>
            </div>

            <div className="delivery-controls-panel">
                <form onSubmit={handleSearch} className="delivery-search-form">
                    <FiSearch />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by order id, customer, phone, or tracking code"
                    />
                    <button type="submit">Search</button>
                </form>

                <div className="delivery-filter-row">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}>
                        {ASSIGNMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={deliveryDateFilter}
                        onChange={(e) => setDeliveryDateFilter(e.target.value)}
                        className="delivery-date-filter"
                    />
                    <select value={deliverySlotFilter} onChange={(e) => setDeliverySlotFilter(e.target.value)}>
                        {SLOT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                <div className="delivery-results-meta">
                    <span><FiFilter /> Showing {sortedOrders.length} orders</span>
                </div>
            </div>

            {loading ? (
                <div className="page-loader"><div className="spinner"></div></div>
            ) : sortedOrders.length === 0 ? (
                <div className="empty-delivery">
                    <FiClock />
                    <h3>No delivery orders found</h3>
                    <p>Try adjusting filters or clear all filters to load your full queue.</p>
                </div>
            ) : (
                <div className="delivery-orders-grid">
                    {sortedOrders.map((order) => {
                        const nextAction = nextStatusLabel(order.status);
                        const canAccept = order.assignment_status !== 'accepted' && !['delivered', 'cancelled'].includes(order.status);
                        const dueMeta = getDueMeta(order.delivery_date, order.status);
                        const totalItems = getTotalItems(order.items);
                        const stage = STATUS_STAGE[order.status] || 0;
                        const mapUrl = getAddressMapUrl(order);
                        const orderItems = Array.isArray(order.items) ? order.items : [];
                        const itemPreview = orderItems.slice(0, 3);
                        const remainingItems = Math.max(orderItems.length - itemPreview.length, 0);

                        return (
                            <article key={order.id} className="delivery-order-card">
                                <div className="delivery-order-head">
                                    <div className="delivery-order-customer">
                                        <h3>Order #{order.id}</h3>
                                        <p>{order.username}</p>
                                        <div className="delivery-contact-row">
                                            <a href={`tel:${order.shipping_phone}`}>
                                                <FiPhoneCall /> {order.shipping_phone}
                                            </a>
                                            <a href={mapUrl} target="_blank" rel="noreferrer">
                                                <FiMapPin /> Open Map
                                            </a>
                                        </div>
                                    </div>
                                    <div className="delivery-badge-column">
                                        <span className={`delivery-status status-${order.status}`}>{order.status}</span>
                                        <span
                                            className="delivery-status assignment-status"
                                            style={{
                                                color: assignmentBadgeColor(order.assignment_status),
                                                borderColor: assignmentBadgeColor(order.assignment_status),
                                            }}
                                        >
                                            {order.assignment_status_label || order.assignment_status}
                                        </span>
                                        {dueMeta && (
                                            <span className={`due-badge due-${dueMeta.tone}`}>
                                                {dueMeta.label}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="delivery-progress">
                                    <span className={stage >= 1 ? 'done' : 'pending'}>Confirmed</span>
                                    <span className={stage >= 2 ? 'done' : 'pending'}>Shipped</span>
                                    <span className={stage >= 3 ? 'done' : 'pending'}>Delivered</span>
                                </div>

                                <div className="delivery-order-body">
                                    <div className="delivery-meta-grid">
                                        <p>
                                            <span>Placed</span>
                                            <strong>{formatDateTime(order.order_date)}</strong>
                                        </p>
                                        <p>
                                            <span>Delivery Window</span>
                                            <strong>{formatDeliveryDate(order.delivery_date)} | {order.delivery_slot_label || order.delivery_slot}</strong>
                                        </p>
                                        <p>
                                            <span>Items</span>
                                            <strong>{totalItems}</strong>
                                        </p>
                                        <p>
                                            <span>Amount</span>
                                            <strong>INR {Number(order.total_amount).toLocaleString('en-IN')}</strong>
                                        </p>
                                    </div>

                                    <p className="address-line">
                                        <strong>Address:</strong> {order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
                                    </p>

                                    {itemPreview.length > 0 && (
                                        <div className="item-preview-wrap">
                                            <span className="items-heading">Item Preview</span>
                                            <ul className="delivery-items-list">
                                                {itemPreview.map((item, index) => (
                                                    <li key={`${order.id}-${item.product_name}-${index}`}>
                                                        <span>{item.product_name}</span>
                                                        <strong>x{item.quantity}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                            {remainingItems > 0 && (
                                                <p className="remaining-items-note">+ {remainingItems} more item(s)</p>
                                            )}
                                        </div>
                                    )}

                                    {order.tracking_code ? (
                                        <div className="tracking-line">
                                            <p><strong>Tracking Code:</strong> <span className="mono-text">{order.tracking_code}</span></p>
                                            <div className="tracking-actions">
                                                <button
                                                    type="button"
                                                    className="small-ghost-btn"
                                                    onClick={() => handleCopyTrackingCode(order.tracking_code)}
                                                >
                                                    <FiCopy /> Copy
                                                </button>
                                                <Link to={`/track-order?code=${encodeURIComponent(order.tracking_code)}`} className="tracking-link">
                                                    <FiMapPin /> View Tracking
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="tracking-line tracking-pending">
                                            <strong>Tracking Code:</strong> Generated after assignment acceptance
                                        </p>
                                    )}

                                    {order.status === 'shipped' && order.delivery_otp_required && (
                                        <p className="delivery-otp-note">
                                            <strong>OTP Required:</strong> Ask customer for OTP before completing delivery.
                                        </p>
                                    )}
                                    {order.delivery_otp_verified && (
                                        <p className="delivery-otp-verified">
                                            <FiCheckCircle /> Delivery OTP verified
                                        </p>
                                    )}
                                </div>

                                <div className="delivery-order-actions">
                                    {canAccept ? (
                                        <button
                                            type="button"
                                            onClick={() => handleAcceptAssignment(order)}
                                            disabled={acceptingOrderId === order.id}
                                        >
                                            {acceptingOrderId === order.id ? 'Accepting...' : 'Accept Assignment'}
                                        </button>
                                    ) : nextAction ? (
                                        <div className="delivery-action-stack">
                                            {order.status === 'shipped' && (
                                                <div className="delivery-otp-input-wrap">
                                                    <label htmlFor={`otp-${order.id}`}>Customer OTP</label>
                                                    <input
                                                        id={`otp-${order.id}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="Enter 6-digit OTP"
                                                        value={deliveryOtpInputs[order.id] || ''}
                                                        onChange={(e) => handleDeliveryOtpChange(order.id, e.target.value)}
                                                        maxLength={6}
                                                    />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate(order)}
                                                disabled={updatingOrderId === order.id}
                                            >
                                                {updatingOrderId === order.id ? 'Updating...' : nextAction}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="done-badge"><FiCheckCircle /> Completed</span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
