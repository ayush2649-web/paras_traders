import { useCallback, useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { FiPackage, FiShoppingBag, FiUsers, FiDollarSign, FiAlertTriangle, FiTrendingUp, FiCreditCard } from 'react-icons/fi';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = useCallback(() => {
        API.get('admin/dashboard/')
            .then((res) => setStats(res.data))
            .catch((err) => { console.error(err); toast.error('Failed to load dashboard'); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await API.patch(`admin/orders/${orderId}/status/`, { status: newStatus });
            fetchDashboard();
            toast.success('Order status updated');
        } catch {
            toast.error('Failed to update');
        }
    };

    const handlePaymentUpdate = async (paymentId, newStatus) => {
        try {
            await API.patch(`admin/payments/${paymentId}/status/`, { status: newStatus });
            fetchDashboard();
            toast.success('Payment status updated');
        } catch {
            toast.error('Failed to update payment');
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
    if (!stats) {
        return (
            <div className="admin-page">
                <div className="dashboard-section">
                    <h2>Admin Dashboard</h2>
                    <p className="text-muted">Unable to load dashboard data right now.</p>
                    <button type="button" className="refresh-btn" onClick={fetchDashboard}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Calculate payment stats
    const paymentCompleted = stats.payment_stats?.completed || 0;
    const paymentPending = stats.payment_stats?.pending || 0;

    return (
        <div className="admin-page">
            <h1>Admin Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><FiShoppingBag /></div>
                    <div>
                        <p className="stat-value">{stats.total_products}</p>
                        <p className="stat-label">Products</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(233,69,96,0.1)', color: '#e94560' }}><FiPackage /></div>
                    <div>
                        <p className="stat-value">{stats.total_orders}</p>
                        <p className="stat-label">Total Orders</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}><FiDollarSign /></div>
                    <div>
                        <p className="stat-value">₹{Number(stats.total_revenue).toLocaleString('en-IN')}</p>
                        <p className="stat-label">Revenue</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><FiUsers /></div>
                    <div>
                        <p className="stat-value">{stats.total_users}</p>
                        <p className="stat-label">Users</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245,166,35,0.1)', color: '#f5a623' }}><FiCreditCard /></div>
                    <div>
                        <p className="stat-value">{paymentCompleted} / {paymentPending}</p>
                        <p className="stat-label">Paid / Pending</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><FiAlertTriangle /></div>
                    <div>
                        <p className="stat-value">{stats.low_stock_count}</p>
                        <p className="stat-label">Low Stock Items</p>
                    </div>
                </div>
            </div>

            {/* Order Status Summary */}
            <div className="dashboard-section">
                <h2>Order Status Overview</h2>
                <div className="status-bars">
                    {Object.entries(stats.order_status || {}).map(([status, count]) => (
                        <div key={status} className="status-bar-item">
                            <div className="status-bar-label">
                                <span className="status-dot" style={{ background: getStatusColor(status) }}></span>
                                <span>{status}</span>
                                <strong>{count}</strong>
                            </div>
                            <div className="status-bar-track">
                                <div className="status-bar-fill" style={{
                                    width: `${(count / stats.total_orders * 100) || 0}%`,
                                    background: getStatusColor(status)
                                }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Orders */}
            <div className="dashboard-section">
                <h2>Recent Orders</h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Transaction ID</th>
                                <th>Order Status</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recent_orders.map((order) => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{order.username}</td>
                                    <td>₹{Number(order.total_amount).toLocaleString('en-IN')}</td>
                                    <td>{order.payment_method}</td>
                                    <td className="mono-text">{order.payment?.transaction_id || '-'}</td>
                                    <td>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                            className="status-select"
                                            style={{ color: getStatusColor(order.status) }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td>
                                        {order.payment ? (
                                            <select
                                                value={order.payment.status}
                                                onChange={(e) => handlePaymentUpdate(order.payment.id, e.target.value)}
                                                className="status-select"
                                                style={{ color: getPaymentColor(order.payment.status) }}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="failed">Failed</option>
                                                <option value="refunded">Refunded</option>
                                            </select>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status) {
    const map = { pending: '#f5a623', confirmed: '#3b82f6', shipped: '#8b5cf6', delivered: '#4ade80', cancelled: '#ef4444' };
    return map[status] || '#888';
}

function getPaymentColor(status) {
    const map = { pending: '#f5a623', completed: '#4ade80', failed: '#ef4444', refunded: '#a855f7' };
    return map[status] || '#888';
}
