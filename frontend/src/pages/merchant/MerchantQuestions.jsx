import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { extractApiError } from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiX,
} from "react-icons/fi";
import "./MerchantInventory.css";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "answered", label: "Answered" },
  { value: "all", label: "All Questions" },
];

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN");
  } catch {
    return value;
  }
}

export default function MerchantQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [pendingCount, setPendingCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await API.get("merchant/questions/", { params });
      const results = res.data?.results || [];
      setQuestions(results);
      setPendingCount(res.data?.pending_count ?? 0);
      setAnsweredCount(res.data?.answered_count ?? 0);
      setTotalCount(res.data?.count ?? results.length);

      setDrafts((prev) => {
        const nextDrafts = {};
        results.forEach((question) => {
          nextDrafts[question.id] = prev[question.id] ?? (question.answer || "");
        });
        return nextDrafts;
      });
    } catch (err) {
      toast.error(extractApiError(err, "Failed to load product questions"));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchQuestions();
    const intervalId = setInterval(fetchQuestions, 30000);
    return () => clearInterval(intervalId);
  }, [fetchQuestions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("pending");
  };

  const handleDraftChange = (questionId, value) => {
    setDrafts((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleAnswer = async (question) => {
    const answer = String(drafts[question.id] || "").trim();
    if (!answer) {
      toast.error("Write an answer before sending");
      return;
    }

    try {
      setSavingId(question.id);
      const res = await API.post(
        `merchant/questions/${question.id}/answer/`,
        { answer },
      );
      toast.success(
        res.data?.message ||
          (question.is_answered ? "Answer updated." : "Question answered."),
      );
      await fetchQuestions();
    } catch (err) {
      toast.error(extractApiError(err, "Failed to send answer"));
    } finally {
      setSavingId(null);
    }
  };

  const hasActiveFilters =
    Boolean(searchInput) || Boolean(searchTerm) || statusFilter !== "pending";

  return (
    <div className="merch-inv-page">
      <header className="merch-inv-header">
        <div className="merch-inv-header-text">
          <h1>
            <FiMessageSquare /> Product Questions
          </h1>
          <p>
            Answer customer questions from your employee panel. Replies appear
            on the product page for future shoppers.
          </p>
        </div>
        <div className="merch-inv-header-actions">
          <button
            type="button"
            className="merch-btn merch-btn-ghost"
            onClick={fetchQuestions}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "merch-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="merch-inv-summary">
        <div className="merch-inv-card merch-inv-card-total">
          <div className="merch-inv-card-icon">
            <FiMessageSquare />
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
        <div className="merch-inv-card merch-inv-card-active">
          <div className="merch-inv-card-icon">
            <FiCheckCircle />
          </div>
          <div className="merch-inv-card-data">
            <span>Answered</span>
            <strong>{answeredCount}</strong>
          </div>
        </div>
      </div>

      <div className="merch-inv-toolbar">
        <form onSubmit={handleSearch} className="merch-inv-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by product, customer, question, or answer..."
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
        Showing <strong>{questions.length}</strong> of <strong>{totalCount}</strong>{" "}
        product questions
      </div>

      <div className="merch-inv-table-section">
        {loading ? (
          <div className="merch-inv-loading">
            <FiRefreshCw className="merch-spin" style={{ fontSize: "2rem" }} />
            <p>Loading customer questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="merch-inv-empty">
            <FiMessageSquare />
            <p>No product questions match the current filters.</p>
          </div>
        ) : (
          <div className="merchant-question-list">
            {questions.map((question) => {
              const isSaving = savingId === question.id;
              const draft = drafts[question.id] || "";

              return (
                <article
                  key={question.id}
                  className={`merchant-question-card ${question.is_answered ? "is-answered" : "is-pending"}`}
                >
                  <div className="merchant-question-top">
                    <div>
                      <span className="merchant-question-label">Product</span>
                      <h3>
                        <Link to={`/products/${question.product_id}`}>
                          {question.product_name}
                        </Link>
                      </h3>
                    </div>
                    <span
                      className={`merch-inv-stock-badge ${question.is_answered ? "badge-success" : "badge-warning"}`}
                    >
                      {question.is_answered ? "Answered" : "Pending"}
                    </span>
                  </div>

                  <div className="merchant-question-meta">
                    <span>
                      Asked by <strong>{question.customer_name || question.username || "Customer"}</strong>
                    </span>
                    <span>{formatDateTime(question.created_at)}</span>
                  </div>

                  <div className="merchant-question-body">
                    <span className="merchant-question-label">Customer question</span>
                    <p>{question.question}</p>
                  </div>

                  <div className="merchant-question-answer-section">
                    <label htmlFor={`answer-${question.id}`} className="merchant-question-label">
                      {question.is_answered ? "Update reply" : "Write reply"}
                    </label>
                    <textarea
                      id={`answer-${question.id}`}
                      rows={4}
                      value={draft}
                      onChange={(e) => handleDraftChange(question.id, e.target.value)}
                      placeholder="Answer the customer clearly and specifically."
                    />
                    <div className="merchant-question-actions">
                      <div className="merchant-question-answer-meta">
                        {question.is_answered ? (
                          <span>
                            Last answered by{" "}
                            <strong>
                              {question.answered_by_name || question.answered_by_username || "Merchant"}
                            </strong>
                            {" "}
                            on {formatDateTime(question.answered_at)}
                          </span>
                        ) : (
                          <span>Reply will be visible on the product page.</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="merch-btn merch-btn-primary"
                        disabled={isSaving}
                        onClick={() => handleAnswer(question)}
                      >
                        <FiSend /> {isSaving ? "Sending..." : question.is_answered ? "Update Answer" : "Send Answer"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
