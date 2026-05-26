import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import { getMediaUrl } from "../../api/config";
import ProductCard from "../../components/common/ProductCard";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";
import { toast } from "react-toastify";
import { FiFilter, FiX } from "react-icons/fi";
import "./Products.css";

const MAX_COMPARE_ITEMS = 4;

function formatCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getImageUrl(product) {
  return product.image
    ? getMediaUrl(product.image)
    : "https://placehold.co/120x120?text=No+Image";
}

function normalizeCompareValue(value) {
  return String(value ?? "-")
    .trim()
    .toLowerCase();
}

function getBestValueScore(product) {
  const price = Number(product.price || 0);
  const originalPrice = Number(product.original_price || 0);
  const discountPercent = Number(product.discount_percent || 0);
  const rating = Number(product.avg_rating || 0);
  const savingsRatio =
    originalPrice > price && originalPrice > 0
      ? ((originalPrice - price) / originalPrice) * 100
      : 0;

  return (
    discountPercent * 2.5 +
    savingsRatio +
    rating * 4 +
    (price > 0 ? 10000 / price : 0)
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [compareProducts, setCompareProducts] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const categoryFilter = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const sortBy = searchParams.get("ordering") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    API.get("categories/")
      .then((res) => setCategories(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      API.get("wishlist/")
        .then((res) => {
          setWishlist(res.data.map((entry) => entry.product.id));
        })
        .catch(() => {});
    }
  }, [user]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter && categoryFilter !== "null")
        params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;
      if (sortBy) params.ordering = sortBy;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      params.page = page;

      const res = await API.get("products/", { params });
      setProducts(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, sortBy, minPrice, maxPrice, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const compareProductIds = useMemo(
    () => new Set(compareProducts.map((product) => product.id)),
    [compareProducts],
  );

  const comparisonRows = useMemo(() => {
    const rows = [
      {
        label: "Price",
        values: compareProducts.map((product) => formatCurrency(product.price)),
      },
      {
        label: "Savings",
        values: compareProducts.map((product) => {
          const savings =
            Number(product.original_price || 0) - Number(product.price || 0);
          return savings > 0
            ? `${formatCurrency(savings)} saved`
            : "No live discount";
        }),
      },
      {
        label: "Discount",
        values: compareProducts.map((product) =>
          Number(product.discount_percent || 0) > 0
            ? `${product.discount_percent}% off`
            : "Standard price",
        ),
      },
      {
        label: "Rating",
        values: compareProducts.map((product) =>
          Number(product.avg_rating || 0) > 0
            ? `${Number(product.avg_rating).toFixed(1)} / 5 (${product.review_count || 0})`
            : "No ratings yet",
        ),
      },
      {
        label: "Availability",
        values: compareProducts.map((product) =>
          Number(product.stock || 0) > 0
            ? `${product.stock} in stock`
            : "Out of stock",
        ),
      },
      {
        label: "Brand",
        values: compareProducts.map((product) => product.brand || "Generic"),
      },
      {
        label: "Category",
        values: compareProducts.map(
          (product) => product.category_name || "General",
        ),
      },
      {
        label: "Seller",
        values: compareProducts.map(
          (product) => product.seller_username || "Paras Traders",
        ),
      },
    ];

    return rows.map((row) => ({
      ...row,
      isDifferent: new Set(row.values.map(normalizeCompareValue)).size > 1,
    }));
  }, [compareProducts]);

  const bestValueProductId = useMemo(() => {
    if (compareProducts.length === 0) return null;
    return (
      [...compareProducts].sort(
        (left, right) => getBestValueScore(right) - getBestValueScore(left),
      )[0]?.id || null
    );
  }, [compareProducts]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      toast.success(`${product.name} added to cart!`);
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  const handleToggleWishlist = async (product) => {
    if (!user) {
      toast.info("Please login to use wishlist");
      return;
    }
    try {
      await API.post("wishlist/", { product_id: product.id });
      setWishlist((prev) =>
        prev.includes(product.id)
          ? prev.filter((id) => id !== product.id)
          : [...prev, product.id],
      );
      toast.success(
        wishlist.includes(product.id)
          ? "Removed from wishlist"
          : "Added to wishlist",
      );
    } catch {
      toast.error("Failed");
    }
  };

  const handleToggleCompare = (product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      if (prev.length >= MAX_COMPARE_ITEMS) {
        toast.info(
          `You can compare up to ${MAX_COMPARE_ITEMS} products at a time`,
        );
        return prev;
      }
      return [...prev, product];
    });
  };

  const handleScrollToCompare = () => {
    if (compareProducts.length < 2) {
      toast.info("Select at least 2 products to compare");
      return;
    }

    const panel = document.getElementById("comparison-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const clearCompare = () => {
    setCompareProducts([]);
  };

  const totalPages = Math.ceil(totalCount / 12);
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(categoryFilter),
  );

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>
            {searchQuery
              ? `Search: "${searchQuery}"`
              : selectedCategory?.name || "All Products"}
          </h1>
          <p>{totalCount} products found</p>
        </div>
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter /> Filters
        </button>
      </div>

      {compareProducts.length > 0 && (
        <section className="compare-tray">
          <div className="compare-tray-copy">
            <p className="compare-kicker">Product Comparison Tool</p>
            <h2>
              Selected products ({compareProducts.length}/{MAX_COMPARE_ITEMS})
            </h2>
            <p>
              Build a side-by-side shortlist, spot differences automatically,
              and identify the best-value option before checkout.
            </p>
            <div className="compare-chip-list">
              {compareProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="compare-chip"
                  onClick={() => handleToggleCompare(product)}
                >
                  <span>{product.name}</span>
                  <FiX />
                </button>
              ))}
            </div>
          </div>

          <div className="compare-tray-actions">
            <button
              type="button"
              className="compare-link-btn"
              onClick={clearCompare}
            >
              Clear list
            </button>
            <button
              type="button"
              className="compare-primary-btn"
              onClick={handleScrollToCompare}
              disabled={compareProducts.length < 2}
            >
              Compare now
            </button>
          </div>
        </section>
      )}

      {compareProducts.length >= 2 && (
        <section id="comparison-panel" className="comparison-panel">
          <div className="comparison-panel-header">
            <div>
              <p className="compare-kicker">
                Smart Price Comparison + Transparency
              </p>
              <h2>Side-by-side comparison</h2>
              <p>
                Highlighted rows show where products differ. The blue badge
                marks the strongest value pick from your current shortlist.
              </p>
            </div>
            <button
              type="button"
              className="compare-link-btn"
              onClick={clearCompare}
            >
              Reset comparison
            </button>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {compareProducts.map((product) => (
                    <th key={product.id}>{product.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="comparison-summary-row">
                  <th>Product</th>
                  {compareProducts.map((product) => (
                    <td key={product.id}>
                      <div className="compare-product-card">
                        <img src={getImageUrl(product)} alt={product.name} />
                        <div className="compare-product-meta">
                          <strong>{product.name}</strong>
                          <span>{product.category_name}</span>
                          {bestValueProductId === product.id && (
                            <span className="best-value-badge">Best value</span>
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className={
                      row.isDifferent
                        ? "comparison-different-row"
                        : "comparison-same-row"
                    }
                  >
                    <th>{row.label}</th>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${compareProducts[index]?.id || index}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="products-layout">
        <aside className={`filters-sidebar ${showFilters ? "open" : ""}`}>
          <div className="filter-header">
            <h3>Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="close-filters"
            >
              <FiX />
            </button>
          </div>

          <div className="filter-group">
            <h4>Category</h4>
            <label className={!categoryFilter ? "active" : ""}>
              <input
                type="radio"
                name="category"
                checked={!categoryFilter}
                onChange={() => handleFilterChange("category", "")}
              />
              All Categories
            </label>
            {categories.map((category) => (
              <label
                key={category.id}
                className={
                  String(categoryFilter) === String(category.id) ? "active" : ""
                }
              >
                <input
                  type="radio"
                  name="category"
                  checked={String(categoryFilter) === String(category.id)}
                  onChange={() => handleFilterChange("category", category.id)}
                />
                {category.name} <span>({category.product_count})</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Price Range</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) =>
                  handleFilterChange("min_price", e.target.value)
                }
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) =>
                  handleFilterChange("max_price", e.target.value)
                }
              />
            </div>
          </div>

          <div className="filter-group">
            <h4>Sort By</h4>
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange("ordering", e.target.value)}
            >
              <option value="">Newest First</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="-name">Name: Z to A</option>
            </select>
          </div>

          {(categoryFilter ||
            searchQuery ||
            minPrice ||
            maxPrice ||
            sortBy) && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear All Filters
            </button>
          )}
        </aside>

        <div className="products-main">
          {loading ? (
            <div className="page-loader">
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="no-products">
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms.</p>
              <button onClick={clearFilters} className="btn-primary-lg">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlist.includes(product.id)}
                  onToggleCompare={handleToggleCompare}
                  isCompared={compareProductIds.has(product.id)}
                  disableCompare={compareProducts.length >= MAX_COMPARE_ITEMS}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              {page > 1 && (
                <button onClick={() => handleFilterChange("page", page - 1)}>
                  Previous
                </button>
              )}
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    className={pageNumber === page ? "active" : ""}
                    onClick={() => handleFilterChange("page", pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              {page < totalPages && (
                <button onClick={() => handleFilterChange("page", page + 1)}>
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
