import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
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
} from "react-icons/fi";
import "./InventoryManagement.css";

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
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "stock_asc", label: "Stock: Low to High" },
  { value: "stock_desc", label: "Stock: High to Low" },
  { value: "id_desc", label: "Newest First" },
  { value: "id_asc", label: "Oldest First" },
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

function normalizeProductsResponse(payload) {
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

export default function InventoryManagement() {
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

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        API.get("admin/products/"),
        API.get("categories/"),
      ]);
      const productsList = normalizeProductsResponse(productsRes.data);
      const categoriesList = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data?.results || [];
      setProducts(productsList);
      setCategories(categoriesList);
      hydrateDrafts(productsList);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [hydrateDrafts]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

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
        (stockFilter === "low" && stockVal <= 5) ||
        (stockFilter === "out" && stockVal === 0) ||
        (stockFilter === "in" && stockVal > 0);
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && p.is_active) ||
        (activeFilter === "inactive" && !p.is_active);
      return matchesSearch && matchesCat && matchesStock && matchesActive;
    });

    const [field, dir] = sortBy.split("_");
    results.sort((a, b) => {
      let va, vb;
      if (field === "name") {
        va = (a.name || "").toLowerCase();
        vb = (b.name || "").toLowerCase();
      } else if (field === "price") {
        va = Number(a.price || 0);
        vb = Number(b.price || 0);
      } else if (field === "stock") {
        va = Number(a.stock || 0);
        vb = Number(b.stock || 0);
      } else {
        va = a.id;
        vb = b.id;
      }
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
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
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const lowStock = products.filter(
      (p) => Number(p.stock || 0) <= 5 && Number(p.stock || 0) > 0,
    ).length;
    const outOfStock = products.filter(
      (p) => Number(p.stock || 0) === 0,
    ).length;
    const totalValue = products.reduce(
      (s, p) => s + Number(p.price || 0) * Number(p.stock || 0),
      0,
    );
    return { total, active, lowStock, outOfStock, totalValue };
  }, [products]);

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

  const updateDraft = (id, key, val) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  };

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
    try {
      setSavingProductId(product.id);
      await API.patch(`admin/products/${product.id}/`, {
        stock,
        price,
        original_price: origPrice,
        brand: draft.brand.trim(),
        mfg_date: draft.mfg_date || null,
        expiry_date: draft.expiry_date || null,
        is_active: Boolean(draft.is_active),
        is_featured: Boolean(draft.is_featured),
      });
      toast.success(`"${product.name}" updated successfully`);
      await fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update product");
    } finally {
      setSavingProductId(null);
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}" from inventory? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      setDeletingProductId(product.id);
      await API.delete(`admin/products/${product.id}/`);
      toast.success(`"${product.name}" deleted`);
      await fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
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
      toast.error("Price must be greater than zero");
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
    if (
      newProduct.original_price !== "" &&
      (!Number.isFinite(payload.original_price) || payload.original_price <= 0)
    ) {
      toast.error("Original price must be > 0");
      return;
    }
    try {
      setCreatingProduct(true);
      await API.post("admin/products/", payload);
      toast.success("Product added to inventory!");
      setNewProduct(DEFAULT_NEW_PRODUCT);
      setShowCreateForm(false);
      await fetchInventory();
    } catch (err) {
      const apiErr = err.response?.data;
      if (typeof apiErr === "object" && apiErr !== null) {
        toast.error(
          String(
            Object.values(apiErr).flat().find(Boolean) ||
              "Failed to create product",
          ),
        );
      } else {
        toast.error("Failed to create product");
      }
    } finally {
      setCreatingProduct(false);
    }
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
    <div className="admin-page inv-page">
      {/* ── Header ── */}
      <header className="inv-header">
        <div className="inv-header-text">
          <h1>
            <FiPackage /> Inventory Management
          </h1>
          <p>Manage stock levels, pricing, and product catalog</p>
        </div>
        <div className="inv-header-actions">
          <button
            type="button"
            className="inv-btn inv-btn-ghost"
            onClick={fetchInventory}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            {showCreateForm ? (
              <>
                <FiX /> Close
              </>
            ) : (
              <>
                <FiPlus /> Add Product
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Summary Cards ── */}
      <div className="inv-summary">
        <div className="inv-card inv-card-total">
          <div className="inv-card-icon">
            <FiBox />
          </div>
          <div className="inv-card-data">
            <span>Total Products</span>
            <strong>{summary.total}</strong>
          </div>
        </div>
        <div className="inv-card inv-card-active">
          <div className="inv-card-icon">
            <FiCheckCircle />
          </div>
          <div className="inv-card-data">
            <span>Active</span>
            <strong>{summary.active}</strong>
          </div>
        </div>
        <div className="inv-card inv-card-low">
          <div className="inv-card-icon">
            <FiAlertTriangle />
          </div>
          <div className="inv-card-data">
            <span>Low Stock</span>
            <strong>{summary.lowStock}</strong>
          </div>
        </div>
        <div className="inv-card inv-card-out">
          <div className="inv-card-icon">
            <FiXCircle />
          </div>
          <div className="inv-card-data">
            <span>Out of Stock</span>
            <strong>{summary.outOfStock}</strong>
          </div>
        </div>
        <div className="inv-card inv-card-value">
          <div className="inv-card-icon">
            <FiTrendingUp />
          </div>
          <div className="inv-card-data">
            <span>Inventory Value</span>
            <strong>₹{summary.totalValue.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>

      {/* ── Create Product Form ── */}
      {showCreateForm && (
        <div className="inv-create-section">
          <h2>
            <FiPlus /> New Product
          </h2>
          <form onSubmit={createProduct} className="inv-create-form">
            <div className="inv-form-grid">
              <div className="inv-field">
                <label>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Premium Wheat Flour"
                  value={newProduct.name}
                  onChange={(e) => updateNewField("name", e.target.value)}
                  required
                />
              </div>
              <div className="inv-field">
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
              <div className="inv-field">
                <label>Selling Price *</label>
                <div className="inv-input-icon">
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
              <div className="inv-field">
                <label>Original Price</label>
                <div className="inv-input-icon">
                  <FiDollarSign />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional MRP"
                    value={newProduct.original_price}
                    onChange={(e) =>
                      updateNewField("original_price", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="inv-field">
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
              <div className="inv-field">
                <label>Brand</label>
                <input
                  type="text"
                  placeholder="Brand name"
                  value={newProduct.brand}
                  onChange={(e) => updateNewField("brand", e.target.value)}
                />
              </div>
              <div className="inv-field">
                <label>
                  <FiCalendar /> MFG Date
                </label>
                <input
                  type="date"
                  value={newProduct.mfg_date}
                  onChange={(e) => updateNewField("mfg_date", e.target.value)}
                />
              </div>
              <div className="inv-field">
                <label>
                  <FiCalendar /> Expiry Date
                </label>
                <input
                  type="date"
                  value={newProduct.expiry_date}
                  onChange={(e) =>
                    updateNewField("expiry_date", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="inv-field inv-field-full">
              <label>Description *</label>
              <textarea
                rows="3"
                placeholder="Product description..."
                value={newProduct.description}
                onChange={(e) => updateNewField("description", e.target.value)}
                required
              />
            </div>
            <div className="inv-form-footer">
              <div className="inv-toggles">
                <label className="inv-toggle">
                  <input
                    type="checkbox"
                    checked={newProduct.is_active}
                    onChange={(e) =>
                      updateNewField("is_active", e.target.checked)
                    }
                  />
                  <span className="inv-toggle-slider"></span> Active
                </label>
                <label className="inv-toggle">
                  <input
                    type="checkbox"
                    checked={newProduct.is_featured}
                    onChange={(e) =>
                      updateNewField("is_featured", e.target.checked)
                    }
                  />
                  <span className="inv-toggle-slider"></span> Featured
                </label>
              </div>
              <button
                type="submit"
                className="inv-btn inv-btn-primary"
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

      {/* ── Filters & Search ── */}
      <div className="inv-toolbar">
        <form onSubmit={onSearch} className="inv-search">
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
              className="inv-search-clear"
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
              }}
            >
              <FiX />
            </button>
          )}
        </form>
        <div className="inv-filters">
          <div className="inv-filter-item">
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
              className="inv-btn inv-btn-ghost inv-btn-sm"
              onClick={clearFilters}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="inv-results-bar">
        <span>
          Showing <strong>{filteredProducts.length}</strong> of{" "}
          <strong>{products.length}</strong> products
        </span>
      </div>

      {/* ── Product Table ── */}
      <div className="inv-table-section">
        {loading ? (
          <div className="inv-loading">
            <div className="spinner"></div>
            <p>Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="inv-empty">
            <FiPackage />
            <p>No products match the current filters</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="inv-btn inv-btn-ghost"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th className="inv-th-img"></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>MRP</th>
                  <th>Brand</th>
                  <th>MFG Date</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="inv-th-actions">Actions</th>
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
                      className={`${!product.is_active ? "inv-row-inactive" : ""} ${dirty ? "inv-row-dirty" : ""}`}
                    >
                      <td className="inv-td-img">
                        {src ? (
                          <img
                            src={src}
                            alt={product.name}
                            className="inv-thumb"
                          />
                        ) : (
                          <div className="inv-thumb-placeholder">
                            <FiImage />
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="inv-product-info">
                          <strong className="inv-product-name">
                            {product.name}
                          </strong>
                          <span className="inv-product-id">#{product.id}</span>
                          {product.is_featured && (
                            <span className="inv-featured-badge">
                              <FiStar /> Featured
                            </span>
                          )}
                          {discount && (
                            <span className="inv-discount-badge">
                              -{discount}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="inv-category-chip">
                          {categoryMap[String(product.category)] ||
                            `#${product.category}`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inv-stock-badge ${stockBadge.className}`}
                        >
                          {stockBadge.label}
                        </span>
                      </td>
                      <td className="inv-price-cell">
                        <strong>
                          ₹{Number(product.price || 0).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td className="inv-price-cell inv-mrp-cell">
                        {product.original_price ? (
                          <span>
                            ₹
                            {Number(product.original_price).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        ) : (
                          <span className="inv-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="inv-brand">
                          {product.brand || (
                            <span className="inv-muted">—</span>
                          )}
                        </span>
                      </td>
                      <td className="inv-date-cell">
                        {formatDate(product.mfg_date) || (
                          <span className="inv-muted">—</span>
                        )}
                      </td>
                      <td className="inv-date-cell">
                        <div className="inv-expiry-wrap">
                          {formatDate(product.expiry_date) || (
                            <span className="inv-muted">—</span>
                          )}
                          {expiryBadge && (
                            <span
                              className={`inv-expiry-badge ${expiryBadge.className}`}
                            >
                              {expiryBadge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inv-status-badge ${product.is_active ? "inv-status-active" : "inv-status-inactive"}`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="inv-td-actions">
                        <button
                          type="button"
                          className="inv-action-btn inv-edit-btn"
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
                            className="inv-action-btn inv-save-btn"
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
                          className="inv-action-btn inv-delete-btn"
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

            {/* ── Expanded Inline Edit Panels ── */}
            {filteredProducts.map((product) => {
              if (expandedRow !== product.id) return null;
              const draft = drafts[product.id] || {};
              const dirty = isDraftDirty(product);
              return (
                <div key={`edit-${product.id}`} className="inv-edit-panel">
                  <div className="inv-edit-panel-header">
                    <h3>
                      <FiEdit3 /> Editing: {product.name}{" "}
                      <span className="inv-product-id">#{product.id}</span>
                    </h3>
                    {dirty && (
                      <span className="inv-unsaved-badge">Unsaved changes</span>
                    )}
                  </div>
                  <div className="inv-edit-grid">
                    <div className="inv-field">
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
                    <div className="inv-field">
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
                    <div className="inv-field">
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
                    <div className="inv-field">
                      <label>Brand</label>
                      <input
                        type="text"
                        value={draft.brand ?? ""}
                        onChange={(e) =>
                          updateDraft(product.id, "brand", e.target.value)
                        }
                      />
                    </div>
                    <div className="inv-field">
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
                    <div className="inv-field">
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
                  <div className="inv-edit-footer">
                    <div className="inv-toggles">
                      <label className="inv-toggle">
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
                        <span className="inv-toggle-slider"></span> Active
                      </label>
                      <label className="inv-toggle">
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
                        <span className="inv-toggle-slider"></span> Featured
                      </label>
                    </div>
                    <div className="inv-edit-actions">
                      <button
                        type="button"
                        className="inv-btn inv-btn-ghost"
                        onClick={() => setExpandedRow(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn-primary"
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
