import { useCallback, useEffect, useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import { FiRefreshCw, FiCheckCircle, FiClock, FiBox } from "react-icons/fi";
import "./MerchantInventory.css"; // Reusing standard UI elements

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    API.get("merchant/orders/")
      .then((res) => setOrders(res.data.results || res.data))
      .catch(() => toast.error("Failed to load live orders"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    API.get("merchant/orders/")
      .then((res) => setOrders(res.data.results || res.data))
      .catch(() => toast.error("Failed to load live orders"))
      .finally(() => setLoading(false));

    // Zomato style: fetch new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateItemStatus = async (orderId, itemId, newStatus) => {
    try {
      await API.patch(`merchant/orders/${orderId}/update_item_status/`, {
        item_id: itemId,
        status: newStatus,
      });
      toast.success(`Item status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update item status");
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Live Orders Dashboard</h1>
        <button
          className="btn-save"
          onClick={fetchOrders}
          style={{ display: "flex", gap: "8px", alignItems: "center" }}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {orders.length === 0 && (
        <div className="empty-state">
          <FiBox size={48} className="text-muted" />
          <h3>No Active Orders</h3>
          <p className="text-muted">
            You have no pending orders at the moment.
          </p>
        </div>
      )}

      <div
        className="orders-grid"
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {orders.map((order) => (
          <div
            key={order.id}
            className="stat-card"
            style={{ display: "block", padding: "20px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #333",
                paddingBottom: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                <p
                  className="text-muted"
                  style={{ margin: 0, fontSize: "0.9rem" }}
                >
                  Placed: {new Date(order.order_date).toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  className={`badge badge-${order.status === "pending" ? "warning" : "info"}`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: "500" }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>
                        ID: {item.product}
                      </div>
                    </td>
                    <td>x{item.quantity}</td>
                    <td>₹{item.price}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="btn-save"
                          onClick={() =>
                            updateItemStatus(order.id, item.id, "preparing")
                          }
                          style={{
                            padding: "4px 12px",
                            fontSize: "0.85rem",
                            display: "flex",
                            gap: "5px",
                            alignItems: "center",
                          }}
                        >
                          <FiClock /> Preparing
                        </button>
                        <button
                          className="btn-action"
                          onClick={() =>
                            updateItemStatus(order.id, item.id, "ready")
                          }
                          style={{
                            padding: "4px 12px",
                            fontSize: "0.85rem",
                            background: "#4ade80",
                            color: "#000",
                            display: "flex",
                            gap: "5px",
                            alignItems: "center",
                          }}
                        >
                          <FiCheckCircle /> Ready
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
