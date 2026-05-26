import { Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { getMediaUrl } from '../../api/config';
import StarRating from './StarRating';
import './ProductCard.css';

export default function ProductCard({
    product,
    onAddToCart,
    onToggleWishlist,
    isWishlisted,
    onToggleCompare,
    isCompared = false,
    disableCompare = false,
}) {
    const imgUrl = product.image
        ? getMediaUrl(product.image)
        : 'https://via.placeholder.com/300x300?text=No+Image';

    return (
        <div className="product-card">
            {product.discount_percent > 0 && (
                <span className="discount-badge">-{product.discount_percent}%</span>
            )}

            {onToggleWishlist && (
                <button
                    className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); onToggleWishlist(product); }}
                >
                    {isWishlisted ? <FaHeart /> : <FiHeart />}
                </button>
            )}

            <Link to={`/products/${product.id}`} className="card-image-link">
                <img src={imgUrl} alt={product.name} className="card-image" />
            </Link>

            <div className="card-body">
                <p className="card-category">{product.category_name}</p>
                <Link to={`/products/${product.id}`} className="card-title">
                    {product.name}
                </Link>

                {product.avg_rating > 0 && (
                    <div className="card-rating">
                        <StarRating rating={product.avg_rating} />
                        <span className="rating-count">({product.review_count})</span>
                    </div>
                )}

                <div className="card-price">
                    <span className="price-current">₹{Number(product.price).toLocaleString('en-IN')}</span>
                    {product.original_price && Number(product.original_price) > Number(product.price) && (
                        <span className="price-original">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
                    )}
                </div>

                <div className="card-footer">
                    {product.stock > 0 ? (
                        <button
                            className="btn-add-cart"
                            onClick={() => onAddToCart && onAddToCart(product)}
                        >
                            <FiShoppingCart /> Add to Cart
                        </button>
                    ) : (
                        <span className="out-of-stock">Out of Stock</span>
                    )}

                    {onToggleCompare && (
                        <button
                            type="button"
                            className={`btn-compare ${isCompared ? 'active' : ''}`}
                            onClick={() => onToggleCompare(product)}
                            disabled={disableCompare && !isCompared}
                        >
                            {isCompared ? 'Selected' : 'Compare'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
