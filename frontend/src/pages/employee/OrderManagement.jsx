import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTruck,
  FiUser,
  FiUserCheck,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import "./OrderManagement.css";

/* ── Constants ── */
const ORDER_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "", label: "All Assignments" },
  { value: "unassigned", label: "Unassigned" },
  { value: "pending", label: "Awaiting Partner" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

/* ── Helpers ── */
const STATUS_CONFIG = {
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", icon: <FiClock /> },
  confirmed: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    icon: <FiCheckCircle />,
  },
  shipped: {
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    icon: <FiTruck />,
  },
  delivered: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    icon: <FiPackage />,
  },
  cancelled: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.14)",
    icon: <FiXCircle />,
  },
};

const PAYMENT_CONFIG = {
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  completed: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  failed: { color: "#f87171", bg: "rgba(248,113,113,0.14)" },
  refunded: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
};

const ASSIGN_CONFIG = {
  unassigned: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  accepted: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  rejected: { color: "#f87171", bg: "rgba(248,113,113,0.14)" },
};

function formatINR(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartners, setSelectedPartners] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [deliveryPartnerFilter, setDeliveryPartnerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assigningOrderId, setAssigningOrderId] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  /* ── Data fetching ── */
  const fetchDeliveryPartners = useCallback(async () => {
    try {
      const res = await API.get("admin/delivery-partners/");
      setDeliveryPartners(res.data?.results || []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to load delivery partners",
      );
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 200 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.payment_status = paymentFilter;
      if (assignmentFilter) params.assignment_status = assignmentFilter;
      if (deliveryPartnerFilter)
        params.delivery_partner_id = deliveryPartnerFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await API.get("admin/orders/", { params });
      const results = res.data?.results || [];
      setOrders(results);
      setTotalCount(res.data?.count ?? results.length);
      setSelectedPartners((prev) => {
        const next = { ...prev };
        results.forEach((order) => {
          next[order.id] = order.assigned_delivery_partner
            ? String(order.assigned_delivery_partner)
            : "";
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    statusFilter,
    paymentFilter,
    assignmentFilter,
    deliveryPartnerFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchDeliveryPartners();
  }, [fetchDeliveryPartners]);
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ── Summary ── */
  const summary = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const awaitingAcceptance = orders.filter(
      (o) => o.assignment_status === "pending",
    ).length;
    return {
      pending,
      confirmed,
      shipped,
      delivered,
      cancelled,
      revenue,
      awaitingAcceptance,
    };
  }, [orders]);

  /* ── Filters ── */
  const hasActiveFilters =
    searchTerm ||
    statusFilter ||
    paymentFilter ||
    assignmentFilter ||
    deliveryPartnerFilter ||
    dateFrom ||
    dateTo;

  const onSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("");
    setPaymentFilter("");
    setAssignmentFilter("");
    setDeliveryPartnerFilter("");
    setDateFrom("");
    setDateTo("");
  };

  /* ── Actions ── */
  const updateOrderStatus = async (orderId, status) => {
    try {
      await API.patch(`admin/orders/${orderId}/status/`, { status });
      toast.success(`Order #${orderId} → ${status}`);
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    try {
      await API.patch(`admin/payments/${paymentId}/status/`, { status });
      toast.success("Payment status updated");
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update payment");
    }
  };

  const assignDeliveryPartner = async (order) => {
    const partnerId = selectedPartners[order.id];
    if (!partnerId) {
      toast.error("Select a delivery partner first");
      return;
    }
    try {
      setAssigningOrderId(order.id);
      await API.patch(`admin/orders/${order.id}/assign-delivery/`, {
        delivery_partner_id: Number(partnerId),
      });
      toast.success(`Partner assigned to order #${order.id}`);
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign partner");
    } finally {
      setAssigningOrderId(null);
    }
  };

  /* ─────────── Render ─────────── */
  return (
    <div className="om-page">
      {/* ── Header ── */}
      <header className="om-header">
        <div className="om-header-text">
          <h1>
            <FiShoppingBag /> Order Management
          </h1>
          <p>
            Confirm orders, assign delivery partners, and monitor each stage.
          </p>
        </div>
        <div className="om-header-actions">
          <button
            type="button"
            className="om-btn om-btn-ghost"
            onClick={fetchOrders}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {/* ── Summary Cards ── */}
      <div className="om-summary">
        <div className="om-card om-card-total">
          <div className="om-card-icon">
            <FiBox />
          </div>
          <div className="om-card-data">
            <span>Total Orders</span>
            <strong>{totalCount}</strong>
          </div>
        </div>
        <div className="om-card om-card-revenue">
          <div className="om-card-icon">
            <FiDollarSign />
          </div>
          <div className="om-card-data">
            <span>Revenue</span>
            <strong>{formatINR(summary.revenue)}</strong>
          </div>
        </div>
        <div className="om-card om-card-pending">
          <div className="om-card-icon">
            <FiClock />
          </div>
          <div className="om-card-data">
            <span>Pending</span>
            <strong>{summary.pending}</strong>
          </div>
        </div>
        <div className="om-card om-card-shipped">
          <div className="om-card-icon">
            <FiTruck />
          </div>
          <div className="om-card-data">
            <span>Shipped</span>
            <strong>{summary.shipped}</strong>
          </div>
        </div>
        <div className="om-card om-card-delivered">
          <div className="om-card-icon">
            <FiCheckCircle />
          </div>
          <div className="om-card-data">
            <span>Delivered</span>
            <strong>{summary.delivered}</strong>
          </div>
        </div>
        <div className="om-card om-card-cancelled">
          <div className="om-card-icon">
            <FiXCircle />
          </div>
          <div className="om-card-data">
            <span>Cancelled</span>
            <strong>{summary.cancelled}</strong>
          </div>
        </div>
      </div>

      {/* ── Toolbar / Filters ── */}
      <div className="om-toolbar">
        <form onSubmit={onSearch} className="om-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by order ID, username, phone, transaction..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="om-search-clear"
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
              }}
            >
              <FiX />
            </button>
          )}
        </form>

        <div className="om-filters">
          <FiFilter />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
          >
            {ASSIGNMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={deliveryPartnerFilter}
            onChange={(e) => setDeliveryPartnerFilter(e.target.value)}
          >
            <option value="">All Partners</option>
            {deliveryPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.username})
              </option>
            ))}
          </select>
          <div className="om-date-range">
            <FiCalendar />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <span className="om-date-sep">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="om-btn om-btn-ghost om-btn-sm"
              onClick={clearFilters}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results bar ── */}
      <div className="om-results-bar">
        Showing <strong>{orders.length}</strong> of{" "}
        <strong>{totalCount}</strong> orders
        {hasActiveFilters && <span className="om-filter-tag">filtered</span>}
      </div>

      {/* ── Orders Table ── */}
      <div className="om-table-section">
        {loading ? (
          <div className="om-loading">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="om-empty">
            <FiShoppingBag />
            <p>No orders found for current filters.</p>
          </div>
        ) : (
          <div className="om-table-wrap">
            <table className="om-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Tracking</th>
                  <th className="om-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const expanded = expandedOrder === order.id;
                  const statusCfg = STATUS_CONFIG[order.status] || {};
                  const paymentCfg =
                    PAYMENT_CONFIG[order.payment?.status] || {};
                  const assignCfg =
                    ASSIGN_CONFIG[order.assignment_status] || {};

                  return (
                    <tr
                      key={order.id}
                      className={expanded ? "om-row-expanded" : ""}
                    >
                      {/* Order ID */}
                      <td>
                        <div className="om-order-id">
                          <strong>#{order.id}</strong>
                          <span className="om-slot">
                            {order.delivery_slot_label || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td>
                        <div className="om-customer">
                          <strong>
                            {order.shipping_name || order.username}
                          </strong>
                          <span className="om-subtle">
                            <FiPhone size={11} /> {order.shipping_phone || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="om-date-cell">
                        {formatDateTime(order.order_date)}
                      </td>

                      {/* Amount */}
                      <td>
                        <strong className="om-amount">
                          {formatINR(order.total_amount)}
                        </strong>
                      </td>

                      {/* Order Status */}
                      <td>
                        <span
                          className="om-status-pill"
                          style={{
                            color: statusCfg.color,
                            background: statusCfg.bg,
                          }}
                        >
                          {statusCfg.icon} {order.status}
                        </span>
                      </td>

                      {/* Payment */}
                      <td>
                        <div className="om-payment-cell">
                          <span className="om-payment-method">
                            {order.payment_method}
                          </span>
                          {order.payment && (
                            <span
                              className="om-payment-pill"
                              style={{
                                color: paymentCfg.color,
                                background: paymentCfg.bg,
                              }}
                            >
                              {order.payment.status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delivery Assignment */}
                      <td>
                        <div className="om-delivery-cell">
                          <span
                            className="om-assign-pill"
                            style={{
                              color: assignCfg.color,
                              background: assignCfg.bg,
                            }}
                          >
                            {order.assignment_status_label ||
                              order.assignment_status}
                          </span>
                          <span className="om-subtle">
                            {order.assigned_delivery_partner_username ||
                              "Not assigned"}
                          </span>
                        </div>
                      </td>

                      {/* Tracking */}
                      <td>
                        {order.tracking_code ? (
                          <div className="om-tracking">
                            <code>{order.tracking_code}</code>
                            <Link
                              className="om-track-link"
                              to={`/track-order?code=${encodeURIComponent(order.tracking_code)}`}
                            >
                              Track →
                            </Link>
                          </div>
                        ) : (
                          <span className="om-muted">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="om-td-actions">
                        <button
                          type="button"
                          className="om-action-btn om-expand-btn"
                          onClick={() =>
                            setExpandedOrder(expanded ? null : order.id)
                          }
                          title="Expand order details"
                        >
                          {expanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Expanded Detail Panels ── */}
            {orders.map((order) => {
              if (expandedOrder !== order.id) return null;
              const canAssign = ["pending", "confirmed"].includes(order.status);

              return (
                <div key={`detail-${order.id}`} className="om-detail-panel">
                  <div className="om-detail-grid">
                    {/* Left: Order Items */}
                    <div className="om-detail-section">
                      <h4>
                        <FiBox /> Order Items
                      </h4>
                      <div className="om-items-list">
                        {(order.items || []).length === 0 ? (
                          <p className="om-muted">No items data available</p>
                        ) : (
                          order.items.map((item, i) => (
                            <div key={i} className="om-item-row">
                              <span className="om-item-name">
                                {item.product_name ||
                                  `Product #${item.product}`}
                              </span>
                              <span className="om-item-qty">
                                ×{item.quantity}
                              </span>
                              <span className="om-item-price">
                                {formatINR(item.price)}
                              </span>
                              <span className="om-item-total">
                                {formatINR(Number(item.price) * item.quantity)}
                              </span>
                            </div>
                          ))
                        )}
                        <div className="om-items-total">
                          <span>Total</span>
                          <strong>{formatINR(order.total_amount)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Shipping Info */}
                    <div className="om-detail-section">
                      <h4>
                        <FiMapPin /> Shipping Details
                      </h4>
                      <div className="om-ship-info">
                        <div>
                          <FiUser size={13} />{" "}
                          <strong>{order.shipping_name}</strong>
                        </div>
                        <div className="om-ship-addr">
                          {order.shipping_address}
                        </div>
                        <div>
                          {order.shipping_city}, {order.shipping_state} –{" "}
                          {order.shipping_pincode}
                        </div>
                        <div>
                          <FiPhone size={13} /> {order.shipping_phone}
                        </div>
                        <div className="om-ship-meta">
                          <span>
                            <FiCalendar size={12} /> Delivery:{" "}
                            {formatDate(order.delivery_date)}
                          </span>
                          <span>
                            Slot:{" "}
                            {order.delivery_slot_label || order.delivery_slot}
                          </span>
                          {order.eco_delivery && (
                            <span className="om-eco-tag">🌿 Eco</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="om-detail-section">
                      <h4>
                        <FiCreditCard /> Manage
                      </h4>
                      <div className="om-manage-grid">
                        {/* Order Status */}
                        <div className="om-manage-field">
                          <label>Order Status</label>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                          >
                            {ORDER_STATUS_OPTIONS.filter((o) => o.value).map(
                              (o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        {/* Payment Status */}
                        {order.payment && (
                          <div className="om-manage-field">
                            <label>Payment Status</label>
                            <select
                              value={order.payment.status}
                              onChange={(e) =>
                                updatePaymentStatus(
                                  order.payment.id,
                                  e.target.value,
                                )
                              }
                            >
                              {PAYMENT_STATUS_OPTIONS.filter(
                                (o) => o.value,
                              ).map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Payment TXN */}
                        {order.payment?.transaction_id && (
                          <div className="om-manage-field">
                            <label>Transaction ID</label>
                            <code className="om-txn-id">
                              {order.payment.transaction_id}
                            </code>
                          </div>
                        )}

                        {/* Delivery Partner Assignment */}
                        <div className="om-manage-field">
                          <label>Delivery Partner</label>
                          {canAssign ? (
                            <div className="om-assign-controls">
                              <select
                                value={selectedPartners[order.id] || ""}
                                onChange={(e) =>
                                  setSelectedPartners((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select partner</option>
                                {deliveryPartners.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.full_name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="om-btn om-btn-primary om-btn-sm"
                                onClick={() => assignDeliveryPartner(order)}
                                disabled={
                                  assigningOrderId === order.id ||
                                  !selectedPartners[order.id]
                                }
                              >
                                {assigningOrderId === order.id
                                  ? "Assigning..."
                                  : order.assigned_delivery_partner
                                    ? "Reassign"
                                    : "Assign"}
                              </button>
                            </div>
                          ) : (
                            <span className="om-muted">
                              Locked after shipment
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
