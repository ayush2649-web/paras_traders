import { useCallback, useEffect, useState } from "react";
import API, { extractApiError } from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import "./MerchantInventory.css";

const STATUS_OPTIONS = [
  { value: "new", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN");
  } catch {
    return value;
  }
}

function getStatusBadgeClass(status) {
  if (status === "hired") return "badge-success";
  if (status === "rejected") return "badge-danger";
  if (status === "reviewed" || status === "shortlisted") return "badge-info";
  if (status === "interview") return "badge-warning";
  return "badge-warning";
}

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return "—";
  return `₹${numericValue.toLocaleString("en-IN")}`;
}

export default function MerchantApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("new");
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [decidingId, setDecidingId] = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 200,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await API.get("merchant/applications/", { params });
      const results = res.data?.results || [];
      setApplications(results);
      setPendingCount(res.data?.pending_count ?? 0);
      setTotalCount(res.data?.count ?? results.length);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to load merchant applications"));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchApplications();
    const intervalId = setInterval(fetchApplications, 30000);
    return () => clearInterval(intervalId);
  }, [fetchApplications]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("new");
  };

  const handleDecision = async (application, decision) => {
    if (decision === "reject") {
      const confirmed = window.confirm(
        `Reject ${application.full_name}'s merchant application and remove it?`,
      );
      if (!confirmed) return;
    }

    try {
      setDecidingId(application.id);
      const res = await API.post(
        `merchant/applications/${application.id}/decision/`,
        { decision },
      );
      toast.success(
        res.data?.message ||
          (decision === "accept"
            ? "Merchant application approved."
            : "Merchant application rejected."),
      );
      await fetchApplications();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to process merchant application"));
    } finally {
      setDecidingId(null);
    }
  };

  const hasActiveFilters = Boolean(searchTerm) || statusFilter !== "new" || Boolean(searchInput);

  return (
    <div className="merch-inv-page">
      <header className="merch-inv-header">
        <div className="merch-inv-header-text">
          <h1>
            <FiUserCheck /> Merchant Applications
          </h1>
          <p>Review and approve merchant partner onboarding requests from the employee section.</p>
        </div>
        <div className="merch-inv-header-actions">
          <button
            type="button"
            className="merch-btn merch-btn-ghost"
            onClick={fetchApplications}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "merch-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="merch-inv-summary">
        <div className="merch-inv-card merch-inv-card-total">
          <div className="merch-inv-card-icon">
            <FiShield />
          </div>
          <div className="merch-inv-card-data">
            <span>Total Results</span>
            <strong>{totalCount}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-low">
          <div className="merch-inv-card-icon">
            <FiClock />
          </div>
          <div className="merch-inv-card-data">
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>
      </div>

      <div className="merch-inv-toolbar">
        <form onSubmit={handleSearch} className="merch-inv-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, email, phone, city, or business name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="merch-inv-search-clear"
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
              }}
            >
              <FiX />
            </button>
          )}
        </form>

        <div className="merch-inv-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              className="merch-btn merch-btn-ghost merch-btn-sm"
              onClick={clearFilters}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="merch-inv-results-bar">
        Showing <strong>{applications.length}</strong> of <strong>{totalCount}</strong> merchant applications
      </div>

      <div className="merch-inv-table-section">
        {loading ? (
          <div className="merch-inv-loading">
            <FiRefreshCw className="merch-spin" style={{ fontSize: "2rem" }} />
            <p>Loading merchant applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="merch-inv-empty">
            <FiUserCheck />
            <p>No merchant applications match the current filters.</p>
          </div>
        ) : (
          <div className="merch-inv-table-wrap">
            <table className="merch-inv-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Business</th>
                  <th>Experience</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th className="merch-inv-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => {
                  const isPending = application.status === "new";
                  const isBusy = decidingId === application.id;

                  return (
                    <tr key={application.id}>
                      <td>
                        <div className="merch-inv-product-info">
                          <strong className="merch-inv-product-name">{application.full_name}</strong>
                          <span className="merch-inv-product-id">{application.email}</span>
                          <span className="merch-inv-product-id">{application.phone} {application.city ? `| ${application.city}` : ""}</span>
                        </div>
                      </td>
                      <td>
                        <div className="merch-inv-product-info">
                          <strong className="merch-inv-brand">
                            {application.business_name || "—"}
                          </strong>
                          <span className="merchant-app-plan">
                            Plan:{" "}
                            <strong>
                              {application.selected_subscription_plan_name || "Starter"}
                            </strong>
                            {application.selected_billing_cycle
                              ? ` • ${application.selected_billing_cycle_label || application.selected_billing_cycle}`
                              : " • Monthly"}
                            {application.selected_subscription_amount
                              ? ` • ${formatCurrency(application.selected_subscription_amount)}`
                              : ""}
                          </span>
                          <span className="merchant-app-message">
                            {application.message || "No business note provided."}
                          </span>
                        </div>
                      </td>
                      <td>{application.experience_years} years</td>
                      <td>
                        <span
                          className={`merch-inv-stock-badge ${getStatusBadgeClass(application.status)}`}
                        >
                          {application.status_label || application.status}
                        </span>
                      </td>
                      <td>{formatDateTime(application.created_at)}</td>
                      <td className="merch-inv-td-actions">
                        {isPending ? (
                          <div className="merchant-app-actions">
                            <button
                              type="button"
                              className="merch-btn merch-btn-primary merch-btn-sm"
                              disabled={isBusy}
                              onClick={() => handleDecision(application, "accept")}
                            >
                              <FiCheckCircle /> {isBusy ? "Processing..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="merch-btn merch-btn-ghost merch-btn-sm merchant-app-reject-btn"
                              disabled={isBusy}
                              onClick={() => handleDecision(application, "reject")}
                            >
                              <FiTrash2 /> {isBusy ? "Processing..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="merch-inv-muted">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
