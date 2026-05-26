import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiRefreshCw,
  FiTrendingUp,
  FiPackage,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiShoppingBag,
  FiBarChart2,
  FiDollarSign,
  FiActivity,
} from "react-icons/fi";
import "./MerchantAnalytics.css";

function fmtCurrency(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function getStockClass(stock) {
  const qty = Number(stock || 0);
  if (qty === 0) return "ma-badge-danger";
  if (qty <= 5) return "ma-badge-warning";
  if (qty <= 20) return "ma-badge-info";
  return "ma-badge-success";
}

export default function MerchantAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("merchant/analytics/");
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load analytics";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxTopRevenue = useMemo(() => {
    if (!data?.top_products?.length) return 1;
    return Math.max(...data.top_products.map((p) => p.revenue), 1);
  }, [data]);

  const maxMonthRevenue = useMemo(() => {
    if (!data?.monthly_trend?.length) return 1;
    return Math.max(...data.monthly_trend.map((m) => m.revenue), 1);
  }, [data]);

  return (
    <div className="merch-analytics-page">
      {/* ── Header ── */}
      <header className="merch-analytics-header">
        <div className="merch-analytics-header-text">
          <h1>
            <FiBarChart2 /> My Analytics
          </h1>
          <p>Sales performance, revenue trends, and product insights</p>
        </div>
        <button
          type="button"
          className="merch-analytics-refresh-btn"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "ma-spin" : ""} /> Refresh
        </button>
      </header>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="merch-analytics-loading">
          <FiRefreshCw className="ma-spin" style={{ fontSize: "2rem" }} />
          <p>Loading analytics...</p>
        </div>
      )}
      {error && !loading && (
        <div className="merch-analytics-error">
          <FiAlertTriangle style={{ fontSize: "2rem" }} />
          <p>{error}</p>
          <button
            type="button"
            className="merch-analytics-refresh-btn"
            onClick={fetchAnalytics}
          >
            Retry
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Summary Cards ── */}
          <div className="merch-analytics-summary">
            <div className="ma-card ma-card-revenue">
              <div className="ma-card-icon">
                <FiDollarSign />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Total Revenue</span>
                <span className="ma-value">
                  {fmtCurrency(data.summary.total_revenue)}
                </span>
              </div>
            </div>
            <div className="ma-card ma-card-units">
              <div className="ma-card-icon">
                <FiPackage />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Units Sold</span>
                <span className="ma-value">
                  {data.summary.total_units_sold.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="ma-card ma-card-orders">
              <div className="ma-card-icon">
                <FiShoppingBag />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Orders</span>
                <span className="ma-value">{data.summary.total_orders}</span>
              </div>
            </div>
            <div className="ma-card ma-card-products">
              <div className="ma-card-icon">
                <FiActivity />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Total Products</span>
                <span className="ma-value">{data.summary.total_products}</span>
              </div>
            </div>
            <div className="ma-card ma-card-active">
              <div className="ma-card-icon">
                <FiCheckCircle />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Active</span>
                <span className="ma-value">{data.summary.active_products}</span>
              </div>
            </div>
            <div className="ma-card ma-card-low">
              <div className="ma-card-icon">
                <FiAlertTriangle />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Low Stock</span>
                <span className="ma-value">{data.summary.low_stock}</span>
              </div>
            </div>
            <div className="ma-card ma-card-out">
              <div className="ma-card-icon">
                <FiXCircle />
              </div>
              <div className="ma-card-data">
                <span className="ma-label">Out of Stock</span>
                <span className="ma-value">{data.summary.out_of_stock}</span>
              </div>
            </div>
          </div>

          {/* ── Charts Row ── */}
          <div className="merch-analytics-body">
            <div className="ma-two-col">
              {/* Top Products Bar Chart */}
              <div className="ma-section">
                <div className="ma-section-header">
                  <h2>
                    <FiTrendingUp /> Top 5 Products by Revenue
                  </h2>
                </div>
                {data.top_products.length === 0 ? (
                  <p className="ma-empty">
                    No sales data yet. Start selling to see your top performers!
                  </p>
                ) : (
                  <div className="ma-top-products">
                    {data.top_products.map((product) => (
                      <div key={product.product_id} className="ma-bar-row">
                        <span
                          className="ma-bar-label"
                          title={product.product_name}
                        >
                          {product.product_name}
                        </span>
                        <div className="ma-bar-track">
                          <div
                            className="ma-bar-fill"
                            style={{
                              width: `${(product.revenue / maxTopRevenue) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="ma-bar-value">
                          {fmtCurrency(product.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Monthly Trend */}
              <div className="ma-section">
                <div className="ma-section-header">
                  <h2>
                    <FiBarChart2 /> Monthly Revenue (Last 6 Months)
                  </h2>
                </div>
                {data.monthly_trend.length === 0 ? (
                  <p className="ma-trend-empty">
                    No data in the last 6 months.
                  </p>
                ) : (
                  <div className="ma-trend-chart">
                    <div className="ma-trend-bars">
                      {data.monthly_trend.map((m) => (
                        <div key={m.month} className="ma-trend-col">
                          <div className="ma-trend-bar-wrap">
                            <div
                              className="ma-trend-bar"
                              style={{
                                height: `${Math.max((m.revenue / maxMonthRevenue) * 100, 3)}%`,
                              }}
                              title={`${fmtMonth(m.month)}: ${fmtCurrency(m.revenue)}`}
                            />
                          </div>
                          <span className="ma-trend-month">
                            {fmtMonth(m.month)}
                          </span>
                          <span className="ma-trend-rev">
                            {m.revenue >= 1000
                              ? `₹${(m.revenue / 1000).toFixed(1)}k`
                              : fmtCurrency(m.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Product Breakdown Table ── */}
            <div className="ma-section">
              <div className="ma-section-header">
                <h2>
                  <FiPackage /> Product Breakdown
                </h2>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                  {data.product_breakdown.length} products
                </span>
              </div>
              {data.product_breakdown.length === 0 ? (
                <p className="ma-empty">
                  No products found. Add products from your inventory.
                </p>
              ) : (
                <div className="ma-table-wrap">
                  <table className="ma-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Revenue</th>
                        <th>Units Sold</th>
                        <th>Orders</th>
                        <th>Current Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.product_breakdown.map((p, idx) => (
                        <tr key={p.product_id}>
                          <td style={{ color: "#64748b", fontSize: "0.8rem" }}>
                            {idx + 1}
                          </td>
                          <td>
                            <span className="ma-product-name">
                              {p.product_name}
                            </span>
                            <span className="ma-product-id">
                              #{p.product_id}
                            </span>
                          </td>
                          <td className="ma-revenue-cell">
                            {p.revenue > 0 ? (
                              fmtCurrency(p.revenue)
                            ) : (
                              <span className="ma-muted">—</span>
                            )}
                          </td>
                          <td className="ma-units-cell">
                            {p.units_sold > 0 ? (
                              p.units_sold.toLocaleString("en-IN")
                            ) : (
                              <span className="ma-muted">0</span>
                            )}
                          </td>
                          <td style={{ color: "#94a3b8" }}>
                            {p.order_count > 0 ? (
                              p.order_count
                            ) : (
                              <span className="ma-muted">0</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`ma-stock-badge ${getStockClass(p.current_stock)}`}
                            >
                              {p.current_stock === 0
                                ? "Out of Stock"
                                : `${p.current_stock} units`}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`ma-stock-badge ${p.is_active ? "ma-active-badge" : "ma-inactive-badge"}`}
                            >
                              {p.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
