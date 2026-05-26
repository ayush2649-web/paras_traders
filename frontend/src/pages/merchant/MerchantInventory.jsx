import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import API, { extractApiError } from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiDollarSign,
  FiEdit3,
  FiFilter,
  FiImage,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiX,
  FiXCircle,
  FiShoppingBag,
} from "react-icons/fi";
import "./MerchantInventory.css";

const STOCK_FILTER_OPTIONS = [
  { value: "all", label: "All Stock" },
  { value: "low", label: "Low Stock (≤ 5)" },
  { value: "out", label: "Out of Stock" },
  { value: "in", label: "In Stock" },
];
const ACTIVE_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const SORT_OPTIONS = [
  { value: "id_desc", label: "Newest First" },
  { value: "id_asc", label: "Oldest First" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price: Low→High" },
  { value: "price_desc", label: "Price: High→Low" },
  { value: "stock_asc", label: "Stock: Low→High" },
  { value: "stock_desc", label: "Stock: High→Low" },
];
const DEFAULT_NEW_PRODUCT = {
  name: "",
  description: "",
  category: "",
  price: "",
  original_price: "",
  stock: "",
  brand: "",
  mfg_date: "",
  expiry_date: "",
  is_featured: false,
  is_active: true,
};

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
function getStockBadge(stock) {
  const qty = Number(stock || 0);
  if (qty === 0) return { label: "Out of Stock", className: "badge-danger" };
  if (qty <= 5) return { label: `Low: ${qty}`, className: "badge-warning" };
  if (qty <= 20) return { label: `${qty} units`, className: "badge-info" };
  return { label: `${qty} units`, className: "badge-success" };
}
function getExpiryBadge(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", className: "badge-danger" };
  if (diffDays <= 30)
    return { label: `${diffDays}d left`, className: "badge-warning" };
  if (diffDays <= 90)
    return { label: `${diffDays}d left`, className: "badge-info" };
  return null;
}
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
function getDiscountPercent(price, originalPrice) {
  if (!originalPrice || !price || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export default function MerchantInventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProduct, setNewProduct] = useState(DEFAULT_NEW_PRODUCT);
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("id_desc");
  const [subscriptionSummary, setSubscriptionSummary] = useState(null);
  const [productUsage, setProductUsage] = useState(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [String(c.id), c.name])),
    [categories],
  );

  const hydrateDrafts = useCallback((productList) => {
    const nextDrafts = {};
    productList.forEach((p) => {
      nextDrafts[p.id] = {
        stock: String(p.stock ?? 0),
        price: String(p.price ?? ""),
        original_price:
          p.original_price == null ? "" : String(p.original_price),
        brand: p.brand || "",
        mfg_date: p.mfg_date || "",
        expiry_date: p.expiry_date || "",
        is_active: Boolean(p.is_active),
        is_featured: Boolean(p.is_featured),
      };
    });
    setDrafts(nextDrafts);
  }, []);

  const abortRef = useRef(null);

  const fetchInventory = useCallback(async () => {
    // Cancel any previous in-flight request to prevent stale-response race conditions
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const [productsRes, categoriesRes, subscriptionRes] = await Promise.all([
        API.get("merchant/products/", { signal: controller.signal }),
        API.get("categories/", { signal: controller.signal }),
        API.get("merchant/subscription/", { signal: controller.signal }),
      ]);
      const productsList = normalizeList(productsRes.data);
      const categoriesList = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data?.results || [];
      setSubscriptionSummary(subscriptionRes.data?.current_subscription || null);
      setProductUsage(subscriptionRes.data?.product_usage || null);
      setProducts(productsList);
      setCategories(categoriesList);
      hydrateDrafts(productsList);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return; // ignore intentional cancels
      toast.error(extractApiError(err, "Failed to load inventory"));
    } finally {
      setLoading(false);
    }
  }, [hydrateDrafts]);

  useEffect(() => {
    fetchInventory();
    return () => abortRef.current?.abort(); // cleanup on unmount
  }, [fetchInventory]);

  // ── Optimistic save ─────────────────────────────────────────────────────
  const saveProductChanges = async (product) => {
    const draft = drafts[product.id];
    if (!draft) return;
    const stock = Number(draft.stock);
    const price = Number(draft.price);
    const origPrice =
      draft.original_price === "" ? null : Number(draft.original_price);
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      toast.error(`Invalid stock for "${product.name}"`);
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error(`Invalid price for "${product.name}"`);
      return;
    }
    if (
      draft.original_price !== "" &&
      (!Number.isFinite(origPrice) || origPrice <= 0)
    ) {
      toast.error(`Invalid original price for "${product.name}"`);
      return;
    }

    const payload = {
      stock,
      price,
      original_price: origPrice,
      brand: draft.brand.trim(),
      mfg_date: draft.mfg_date || null,
      expiry_date: draft.expiry_date || null,
      is_active: Boolean(draft.is_active),
      is_featured: Boolean(draft.is_featured),
    };

    // Snapshot previous data for rollback
    const prevProducts = products;
    const prevDrafts = drafts;

    // Optimistic update: apply draft to the local products list immediately
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p)),
    );

    try {
      setSavingProductId(product.id);
      const res = await API.patch(`merchant/products/${product.id}/`, payload);
      // Reconcile with server response (may differ from what we sent)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...res.data } : p)),
      );
      // Re-hydrate only this product's draft
      setDrafts((prev) => ({
        ...prev,
        [product.id]: {
          stock: String(res.data.stock ?? 0),
          price: String(res.data.price ?? ""),
          original_price:
            res.data.original_price == null
              ? ""
              : String(res.data.original_price),
          brand: res.data.brand || "",
          mfg_date: res.data.mfg_date || "",
          expiry_date: res.data.expiry_date || "",
          is_active: Boolean(res.data.is_active),
          is_featured: Boolean(res.data.is_featured),
        },
      }));
      toast.success(`"${product.name}" updated`);
    } catch (err) {
      // Rollback on failure
      setProducts(prevProducts);
      setDrafts(prevDrafts);
      toast.error(extractApiError(err, "Failed to update product"));
    } finally {
      setSavingProductId(null);
    }
  };

  // ── Optimistic delete ───────────────────────────────────────────────────
  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;

    // Snapshot for rollback
    const prevProducts = products;
    const prevDrafts = drafts;

    // Optimistic removal
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    if (expandedRow === product.id) setExpandedRow(null);

    try {
      setDeletingProductId(product.id);
      await API.delete(`merchant/products/${product.id}/`);
      toast.success(`"${product.name}" deleted`);
    } catch (err) {
      // Rollback on failure
      setProducts(prevProducts);
      setDrafts(prevDrafts);
      toast.error(extractApiError(err, "Failed to delete product"));
    } finally {
      setDeletingProductId(null);
    }
  };

  // ── Create product — always refetch after creation (server assigns ID) ──
  const createProduct = async (e) => {
    e.preventDefault();
    if (!canAddProducts) {
      toast.error(
        subscriptionSummary
          ? "Your current subscription has reached its product listing limit."
          : "Activate a merchant subscription before adding products.",
      );
      return;
    }
    const payload = {
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      category: Number(newProduct.category),
      price: Number(newProduct.price),
      original_price:
        newProduct.original_price === ""
          ? null
          : Number(newProduct.original_price),
      stock: Number(newProduct.stock),
      brand: newProduct.brand.trim(),
      mfg_date: newProduct.mfg_date || null,
      expiry_date: newProduct.expiry_date || null,
      is_featured: Boolean(newProduct.is_featured),
      is_active: Boolean(newProduct.is_active),
    };
    if (!payload.name || !payload.description) {
      toast.error("Name and description are required");
      return;
    }
    if (!Number.isFinite(payload.category) || payload.category <= 0) {
      toast.error("Select a category");
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      toast.error("Price must be > 0");
      return;
    }
    if (
      !Number.isFinite(payload.stock) ||
      payload.stock < 0 ||
      !Number.isInteger(payload.stock)
    ) {
      toast.error("Stock must be a non-negative whole number");
      return;
    }
    try {
      setCreatingProduct(true);
      const res = await API.post("merchant/products/", payload);
      // Append new product and its draft into local state directly — no full refetch
      const newP = res.data;
      setProducts((prev) => [newP, ...prev]);
      setDrafts((prev) => ({
        ...prev,
        [newP.id]: {
          stock: String(newP.stock ?? 0),
          price: String(newP.price ?? ""),
          original_price:
            newP.original_price == null ? "" : String(newP.original_price),
          brand: newP.brand || "",
          mfg_date: newP.mfg_date || "",
          expiry_date: newP.expiry_date || "",
          is_active: Boolean(newP.is_active),
          is_featured: Boolean(newP.is_featured),
        },
      }));
      toast.success("Product added!");
      setNewProduct(DEFAULT_NEW_PRODUCT);
      setShowCreateForm(false);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to create product"));
    } finally {
      setCreatingProduct(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    let results = products.filter((p) => {
      const catName = (categoryMap[String(p.category)] || "").toLowerCase();
      const matchesSearch =
        !search ||
        String(p.id) === search ||
        p.name?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search) ||
        catName.includes(search);
      const matchesCat =
        !categoryFilter || String(p.category) === categoryFilter;
      const stockVal = Number(p.stock || 0);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && stockVal <= 5 && stockVal > 0) ||
        (stockFilter === "out" && stockVal === 0) ||
        (stockFilter === "in" && stockVal > 0);
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && p.is_active) ||
        (activeFilter === "inactive" && !p.is_active);
      return matchesSearch && matchesCat && matchesStock && matchesActive;
    });
    const lastDir = sortBy.endsWith("desc") ? "desc" : "asc";
    const sortField = sortBy.replace(/_asc$|_desc$/, "");
    results.sort((a, b) => {
      let va, vb;
      if (sortField === "name") {
        va = (a.name || "").toLowerCase();
        vb = (b.name || "").toLowerCase();
      } else if (sortField === "price") {
        va = Number(a.price || 0);
        vb = Number(b.price || 0);
      } else if (sortField === "stock") {
        va = Number(a.stock || 0);
        vb = Number(b.stock || 0);
      } else {
        va = a.id;
        vb = b.id;
      }
      if (va < vb) return lastDir === "asc" ? -1 : 1;
      if (va > vb) return lastDir === "asc" ? 1 : -1;
      return 0;
    });
    return results;
  }, [
    products,
    categoryMap,
    searchTerm,
    categoryFilter,
    stockFilter,
    activeFilter,
    sortBy,
  ]);

  const summary = useMemo(() => {
    const init = {
      total: 0,
      active: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
    };
    return products.reduce((acc, p) => {
      const qty = Number(p.stock || 0);
      acc.total++;
      if (p.is_active) acc.active++;
      if (qty === 0) acc.outOfStock++;
      else if (qty <= 5) acc.lowStock++;
      acc.totalValue += Number(p.price || 0) * qty;
      return acc;
    }, init);
  }, [products]);

  const canAddProducts = Boolean(productUsage?.can_add_products);
  const hasListingLimit = Number.isFinite(productUsage?.product_limit);
  const selectedPlanName = subscriptionSummary?.plan?.name || "No Active Plan";

  const onSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };
  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setCategoryFilter("");
    setStockFilter("all");
    setActiveFilter("all");
    setSortBy("id_desc");
  };
  const hasActiveFilters =
    searchTerm ||
    categoryFilter ||
    stockFilter !== "all" ||
    activeFilter !== "all" ||
    sortBy !== "id_desc";

  const updateDraft = (id, key, val) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));

  const isDraftDirty = (product) => {
    const d = drafts[product.id];
    if (!d) return false;
    return (
      String(product.stock ?? 0) !== d.stock ||
      String(product.price ?? "") !== d.price ||
      (product.original_price == null ? "" : String(product.original_price)) !==
        d.original_price ||
      (product.brand || "") !== d.brand ||
      (product.mfg_date || "") !== d.mfg_date ||
      (product.expiry_date || "") !== d.expiry_date ||
      Boolean(product.is_active) !== d.is_active ||
      Boolean(product.is_featured) !== d.is_featured
    );
  };

  const updateNewField = (key, val) =>
    setNewProduct((prev) => ({ ...prev, [key]: val }));

  const imgSrc = (p) => {
    if (p.image) {
      if (p.image.startsWith("http")) return p.image;
      return `${import.meta.env.VITE_API_BASE_URL || ""}${p.image}`;
    }
    return null;
  };

  return (
    <div className="merch-inv-page">
      {/* ── Header ── */}
      <header className="merch-inv-header">
        <div className="merch-inv-header-text">
          <h1>
            <FiShoppingBag /> My Inventory
          </h1>
          <p>Manage your products — stock, pricing, and listings</p>
        </div>
        <div className="merch-inv-header-actions">
          <button
            type="button"
            className="merch-btn merch-btn-ghost"
            onClick={fetchInventory}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "merch-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            className="merch-btn merch-btn-primary"
            onClick={() => setShowCreateForm((v) => !v)}
            disabled={!canAddProducts}
            title={
              canAddProducts
                ? "Add a new product"
                : subscriptionSummary
                  ? "Upgrade your subscription to add more products"
                  : "Activate a merchant subscription to add products"
            }
          >
            {showCreateForm ? (
              <>
                <FiX /> Close
              </>
            ) : (
              <>
                <FiPlus />{" "}
                {canAddProducts
                  ? "Add Product"
                  : subscriptionSummary
                    ? "Plan Limit Reached"
                    : "Activate Plan"}
              </>
            )}
          </button>
        </div>
      </header>

      <div className="merch-subscription-banner">
        <div>
          <span className="merch-subscription-banner-label">Subscription</span>
          <strong>{selectedPlanName}</strong>
          <p>
            {subscriptionSummary
              ? hasListingLimit
                ? `${productUsage?.product_count || 0} of ${productUsage?.product_limit || 0} product listings in use.`
                : `${productUsage?.product_count || 0} product listings active with no plan cap.`
              : "Activate a merchant subscription to add new products and take your store online."}
          </p>
        </div>
        <div className="merch-subscription-banner-actions">
          {subscriptionSummary?.ends_at && (
            <span className="merch-subscription-banner-meta">
              Renews / ends on{" "}
              {new Date(subscriptionSummary.ends_at).toLocaleDateString("en-IN")}
            </span>
          )}
          <Link
            className="merch-btn merch-btn-primary"
            to="/employee/merchant/settings"
          >
            Manage Plan
          </Link>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="merch-inv-summary">
        <div className="merch-inv-card merch-inv-card-total">
          <div className="merch-inv-card-icon">
            <FiBox />
          </div>
          <div className="merch-inv-card-data">
            <span>Total Products</span>
            <strong>{summary.total}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-active">
          <div className="merch-inv-card-icon">
            <FiCheckCircle />
          </div>
          <div className="merch-inv-card-data">
            <span>Active</span>
            <strong>{summary.active}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-low">
          <div className="merch-inv-card-icon">
            <FiAlertTriangle />
          </div>
          <div className="merch-inv-card-data">
            <span>Low Stock</span>
            <strong>{summary.lowStock}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-out">
          <div className="merch-inv-card-icon">
            <FiXCircle />
          </div>
          <div className="merch-inv-card-data">
            <span>Out of Stock</span>
            <strong>{summary.outOfStock}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-value">
          <div className="merch-inv-card-icon">
            <FiTrendingUp />
          </div>
          <div className="merch-inv-card-data">
            <span>Inventory Value</span>
            <strong>₹{summary.totalValue.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>

      {/* ── Create Form ── */}
      {showCreateForm && (
        <div className="merch-inv-create-section">
          <h2>
            <FiPlus /> New Product
          </h2>
          <form onSubmit={createProduct} className="merch-inv-form-grid">
            <div className="merch-inv-field">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Premium Wheat Flour"
                value={newProduct.name}
                onChange={(e) => updateNewField("name", e.target.value)}
                required
              />
            </div>
            <div className="merch-inv-field">
              <label>Category *</label>
              <select
                value={newProduct.category}
                onChange={(e) => updateNewField("category", e.target.value)}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="merch-inv-field">
              <label>Selling Price *</label>
              <div className="merch-inv-input-icon">
                <FiDollarSign />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.price}
                  onChange={(e) => updateNewField("price", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="merch-inv-field">
              <label>Original Price (MRP)</label>
              <div className="merch-inv-input-icon">
                <FiDollarSign />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={newProduct.original_price}
                  onChange={(e) =>
                    updateNewField("original_price", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="merch-inv-field">
              <label>Stock Quantity *</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={newProduct.stock}
                onChange={(e) => updateNewField("stock", e.target.value)}
                required
              />
            </div>
            <div className="merch-inv-field">
              <label>Brand</label>
              <input
                type="text"
                placeholder="Brand name"
                value={newProduct.brand}
                onChange={(e) => updateNewField("brand", e.target.value)}
              />
            </div>
            <div className="merch-inv-field">
              <label>
                <FiCalendar /> MFG Date
              </label>
              <input
                type="date"
                value={newProduct.mfg_date}
                onChange={(e) => updateNewField("mfg_date", e.target.value)}
              />
            </div>
            <div className="merch-inv-field">
              <label>
                <FiCalendar /> Expiry Date
              </label>
              <input
                type="date"
                value={newProduct.expiry_date}
                onChange={(e) => updateNewField("expiry_date", e.target.value)}
              />
            </div>
            <div className="merch-inv-field merch-inv-field-full">
              <label>Description *</label>
              <textarea
                rows="3"
                placeholder="Product description..."
                value={newProduct.description}
                onChange={(e) => updateNewField("description", e.target.value)}
                required
              />
            </div>
            <div className="merch-inv-form-footer merch-inv-field-full">
              <div className="merch-inv-toggles">
                <label className="merch-inv-toggle">
                  <input
                    type="checkbox"
                    checked={newProduct.is_active}
                    onChange={(e) =>
                      updateNewField("is_active", e.target.checked)
                    }
                  />
                  <span className="merch-inv-toggle-slider"></span> Active
                </label>
                <label className="merch-inv-toggle">
                  <input
                    type="checkbox"
                    checked={newProduct.is_featured}
                    onChange={(e) =>
                      updateNewField("is_featured", e.target.checked)
                    }
                  />
                  <span className="merch-inv-toggle-slider"></span> Featured
                </label>
              </div>
              <button
                type="submit"
                className="merch-btn merch-btn-primary"
                disabled={creatingProduct}
              >
                {creatingProduct ? (
                  "Adding..."
                ) : (
                  <>
                    <FiPlus /> Add Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="merch-inv-toolbar">
        <form onSubmit={onSearch} className="merch-inv-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, brand, category, or ID..."
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
          <div className="merch-inv-filter-item">
            <FiFilter />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            {STOCK_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            {ACTIVE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

      {/* ── Results Count ── */}
      <div className="merch-inv-results-bar">
        Showing <strong>{filteredProducts.length}</strong> of{" "}
        <strong>{products.length}</strong> products
      </div>

      {/* ── Table ── */}
      <div className="merch-inv-table-section">
        {loading ? (
          <div className="merch-inv-loading">
            <FiRefreshCw className="merch-spin" style={{ fontSize: "2rem" }} />
            <p>Loading your inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="merch-inv-empty">
            <FiPackage />
            <p>
              {products.length === 0
                ? "You have no products yet. Add your first product!"
                : "No products match the current filters."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="merch-btn merch-btn-ghost"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="merch-inv-table-wrap">
            <table className="merch-inv-table">
              <thead>
                <tr>
                  <th className="merch-inv-th-img"></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>MRP</th>
                  <th>Brand</th>
                  <th>MFG Date</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="merch-inv-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const dirty = isDraftDirty(product);
                  const stockBadge = getStockBadge(product.stock);
                  const discount = getDiscountPercent(
                    product.price,
                    product.original_price,
                  );
                  const expiryBadge = getExpiryBadge(product.expiry_date);
                  const expanded = expandedRow === product.id;
                  const src = imgSrc(product);

                  return (
                    <tr
                      key={product.id}
                      className={`${!product.is_active ? "merch-inv-row-inactive" : ""} ${dirty ? "merch-inv-row-dirty" : ""}`}
                    >
                      <td className="merch-inv-td-img">
                        {src ? (
                          <img
                            src={src}
                            alt={product.name}
                            className="merch-inv-thumb"
                          />
                        ) : (
                          <div className="merch-inv-thumb-placeholder">
                            <FiImage />
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="merch-inv-product-info">
                          <strong className="merch-inv-product-name">
                            {product.name}
                          </strong>
                          <span className="merch-inv-product-id">
                            #{product.id}
                          </span>
                          {product.is_featured && (
                            <span className="merch-inv-featured-badge">
                              <FiStar /> Featured
                            </span>
                          )}
                          {discount && (
                            <span className="merch-inv-discount-badge">
                              -{discount}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="merch-inv-category-chip">
                          {categoryMap[String(product.category)] ||
                            `#${product.category}`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`merch-inv-stock-badge ${stockBadge.className}`}
                        >
                          {stockBadge.label}
                        </span>
                      </td>
                      <td className="merch-inv-price-cell">
                        <strong>
                          ₹{Number(product.price || 0).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td className="merch-inv-price-cell merch-inv-mrp-cell">
                        {product.original_price ? (
                          <span>
                            ₹
                            {Number(product.original_price).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        ) : (
                          <span className="merch-inv-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="merch-inv-brand">
                          {product.brand || (
                            <span className="merch-inv-muted">—</span>
                          )}
                        </span>
                      </td>
                      <td className="merch-inv-date-cell">
                        {formatDate(product.mfg_date) || (
                          <span className="merch-inv-muted">—</span>
                        )}
                      </td>
                      <td className="merch-inv-date-cell">
                        <div className="merch-inv-expiry-wrap">
                          {formatDate(product.expiry_date) || (
                            <span className="merch-inv-muted">—</span>
                          )}
                          {expiryBadge && (
                            <span
                              className={`merch-inv-expiry-badge ${expiryBadge.className}`}
                            >
                              {expiryBadge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`merch-inv-status-badge ${product.is_active ? "merch-inv-status-active" : "merch-inv-status-inactive"}`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="merch-inv-td-actions">
                        <button
                          type="button"
                          className="merch-inv-action-btn merch-inv-edit-btn"
                          onClick={() =>
                            setExpandedRow(expanded ? null : product.id)
                          }
                          title="Edit product"
                        >
                          <FiEdit3 />
                          {expanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        {dirty && (
                          <button
                            type="button"
                            className="merch-inv-action-btn merch-inv-save-btn"
                            onClick={() => saveProductChanges(product)}
                            disabled={savingProductId === product.id}
                            title="Save changes"
                          >
                            <FiSave />{" "}
                            {savingProductId === product.id ? "..." : ""}
                          </button>
                        )}
                        <button
                          type="button"
                          className="merch-inv-action-btn merch-inv-delete-btn"
                          onClick={() => deleteProduct(product)}
                          disabled={deletingProductId === product.id}
                          title="Delete product"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Inline Edit Panels ── */}
            {filteredProducts.map((product) => {
              if (expandedRow !== product.id) return null;
              const draft = drafts[product.id] || {};
              const dirty = isDraftDirty(product);
              return (
                <div
                  key={`edit-${product.id}`}
                  className="merch-inv-edit-panel"
                >
                  <div className="merch-inv-edit-panel-header">
                    <h3>
                      <FiEdit3 /> Editing: {product.name}{" "}
                      <span className="merch-inv-product-id">
                        #{product.id}
                      </span>
                    </h3>
                    {dirty && (
                      <span className="merch-inv-unsaved-badge">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <div className="merch-inv-edit-grid">
                    <div className="merch-inv-field">
                      <label>Stock</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft.stock ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "stock", e.target.value)
                        }
                      />
                    </div>
                    <div className="merch-inv-field">
                      <label>Selling Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.price ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "price", e.target.value)
                        }
                      />
                    </div>
                    <div className="merch-inv-field">
                      <label>Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={draft.original_price ?? ""}
                        onChange={(e) =>
                          updateDraft(
                            product.id,
                            "original_price",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="merch-inv-field">
                      <label>Brand</label>
                      <input
                        type="text"
                        value={draft.brand ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "brand", e.target.value)
                        }
                      />
                    </div>
                    <div className="merch-inv-field">
                      <label>
                        <FiCalendar /> MFG Date
                      </label>
                      <input
                        type="date"
                        value={draft.mfg_date ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "mfg_date", e.target.value)
                        }
                      />
                    </div>
                    <div className="merch-inv-field">
                      <label>
                        <FiCalendar /> Expiry Date
                      </label>
                      <input
                        type="date"
                        value={draft.expiry_date ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "expiry_date", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="merch-inv-edit-footer">
                    <div className="merch-inv-toggles">
                      <label className="merch-inv-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.is_active)}
                          onChange={(e) =>
                            updateDraft(
                              product.id,
                              "is_active",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="merch-inv-toggle-slider"></span> Active
                      </label>
                      <label className="merch-inv-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.is_featured)}
                          onChange={(e) =>
                            updateDraft(
                              product.id,
                              "is_featured",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="merch-inv-toggle-slider"></span>{" "}
                        Featured
                      </label>
                    </div>
                    <div className="merch-inv-edit-actions">
                      <button
                        type="button"
                        className="merch-btn merch-btn-ghost"
                        onClick={() => setExpandedRow(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="merch-btn merch-btn-primary"
                        disabled={!dirty || savingProductId === product.id}
                        onClick={() => saveProductChanges(product)}
                      >
                        <FiSave />{" "}
                        {savingProductId === product.id
                          ? "Saving..."
                          : "Save Changes"}
                      </button>
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
