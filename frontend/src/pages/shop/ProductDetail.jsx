import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { getMediaUrl } from '../../api/config';
import StarRating from '../../components/common/StarRating';
import ProductCard from '../../components/common/ProductCard';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import {
    FiShoppingCart,
    FiHeart,
    FiMinus,
    FiPlus,
    FiArrowLeft,
    FiMessageSquare,
    FiSend,
} from 'react-icons/fi';
import './ProductDetail.css';

const RECENTLY_VIEWED_KEY = 'recently_viewed_products';
const MAX_RECENTLY_VIEWED = 8;
const EMI_OPTIONS = [3, 6, 9, 12];

function toProductCardShape(product) {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image: product.image,
        category_name: product.category_name,
        brand: product.brand,
        stock: product.stock,
        avg_rating: product.avg_rating,
        review_count: product.review_count,
        discount_percent: product.discount_percent,
    };
}

function updateRecentlyViewedProducts(currentProduct) {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        const safeItems = Array.isArray(parsed) ? parsed : [];
        const current = toProductCardShape(currentProduct);
        const merged = [current, ...safeItems.filter((item) => item.id !== current.id)];
        const trimmed = merged.slice(0, MAX_RECENTLY_VIEWED);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(trimmed));
        return trimmed.filter((item) => item.id !== current.id).slice(0, 4);
    } catch (err) {
        console.error('Failed to update recently viewed products', err);
        return [];
    }
}

function normalizeQuestions(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
}

function formatDateTime(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}

export default function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [productQuestions, setProductQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [questionText, setQuestionText] = useState('');
    const [questionSubmitting, setQuestionSubmitting] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [emiPlan, setEmiPlan] = useState(6);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            try {
                const productRes = await API.get(`products/${id}/`);
                const productData = productRes.data;
                setProduct(productData);
                setRecentProducts(updateRecentlyViewedProducts(productData));

                try {
                    const similarRes = await API.get(`products/${id}/similar/`);
                    setSimilarProducts(similarRes.data || []);
                } catch (similarErr) {
                    console.error(similarErr);
                    setSimilarProducts([]);
                }
            } catch (err) {
                console.error(err);
                navigate('/products');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id, navigate]);

    useEffect(() => {
        let ignore = false;

        const loadQuestions = async () => {
            try {
                setQuestionsLoading(true);
                const res = await API.get(`products/${id}/questions/`);
                if (!ignore) {
                    setProductQuestions(normalizeQuestions(res.data));
                }
            } catch (err) {
                console.error(err);
                if (!ignore) {
                    setProductQuestions([]);
                }
            } finally {
                if (!ignore) {
                    setQuestionsLoading(false);
                }
            }
        };

        loadQuestions();
        return () => {
            ignore = true;
        };
    }, [id, user?.id]);

    const handleAddToCart = async (item = product, itemQuantity = 1) => {
        const quantityToAdd = item?.id === product?.id ? quantity : itemQuantity;
        try {
            await addToCart(item, quantityToAdd);
            toast.success(`${item.name} added to cart!`);
        } catch {
            toast.error('Failed to add to cart');
        }
    };

    const handleWishlist = async () => {
        if (!user) { toast.info('Login to use wishlist'); return; }
        try {
            await API.post('wishlist/', { product_id: product.id });
            toast.success('Wishlist updated!');
        } catch {
            toast.error('Failed');
        }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        if (!user) { toast.info('Login to write a review'); return; }
        try {
            await API.post(`products/${id}/reviews/`, { rating: reviewRating, comment: reviewText });
            const res = await API.get(`products/${id}/`);
            setProduct(res.data);
            setReviewText('');
            setReviewRating(5);
            toast.success('Review submitted!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'You may have already reviewed this product');
        }
    };

    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.info('Login to ask a question');
            return;
        }

        const trimmedQuestion = questionText.trim();
        if (!trimmedQuestion) {
            toast.error('Enter your question first');
            return;
        }

        try {
            setQuestionSubmitting(true);
            await API.post(`products/${id}/questions/`, { question: trimmedQuestion });
            const refreshed = await API.get(`products/${id}/questions/`);
            setProductQuestions(normalizeQuestions(refreshed.data));
            setQuestionText('');
            toast.success('Question sent to the merchant');
        } catch (err) {
            toast.error(err.response?.data?.question?.[0] || err.response?.data?.error || 'Failed to submit question');
        } finally {
            setQuestionSubmitting(false);
        }
    };

    if (loading || !product) {
        return <div className="page-loader"><div className="spinner"></div></div>;
    }

    const imgUrl = product.image
        ? getMediaUrl(product.image)
        : 'https://placehold.co/600x600?text=No+Image';
    const monthlyEmi = Number(product.price || 0) / emiPlan;

    return (
        <div className="detail-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <FiArrowLeft /> Back
            </button>

            <div className="detail-grid">
                <div className="detail-image-section">
                    <img src={imgUrl} alt={product.name} className="detail-image" />
                    {product.discount_percent > 0 && (
                        <span className="detail-discount">-{product.discount_percent}% OFF</span>
                    )}
                </div>

                <div className="detail-info">
                    <p className="detail-category">{product.category_name}</p>
                    <h1>{product.name}</h1>

                    <div className="detail-rating">
                        <StarRating rating={product.avg_rating} size={18} />
                        <span>{product.avg_rating} ({product.review_count} reviews)</span>
                    </div>

                    <div className="detail-price">
                        <span className="price-big">₹{Number(product.price).toLocaleString('en-IN')}</span>
                        {product.original_price && Number(product.original_price) > Number(product.price) && (
                            <>
                                <span className="price-old">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
                                <span className="price-save">Save ₹{(Number(product.original_price) - Number(product.price)).toLocaleString('en-IN')}</span>
                            </>
                        )}
                    </div>

                    <p className="detail-desc">{product.description}</p>

                    <div className="detail-meta">
                        {product.brand && <div><strong>Brand:</strong> {product.brand}</div>}
                        <div>
                            <strong>Availability:</strong>{' '}
                            {product.stock > 0
                                ? <span className="in-stock">In Stock ({product.stock} left)</span>
                                : <span className="no-stock">Out of Stock</span>
                            }
                        </div>
                    </div>

                    <div className="detail-payment-tools">
                        <div className="emi-card">
                            <p className="detail-mini-label">Flexible Payment</p>
                            <h3>Estimated no-cost EMI</h3>
                            <p>
                                Split the current price into monthly payments for planning.
                                Final partner offers are confirmed during checkout.
                            </p>

                            <div className="emi-options">
                                {EMI_OPTIONS.map((months) => (
                                    <button
                                        key={months}
                                        type="button"
                                        className={emiPlan === months ? 'active' : ''}
                                        onClick={() => setEmiPlan(months)}
                                    >
                                        {months} months
                                    </button>
                                ))}
                            </div>

                            <div className="emi-summary">
                                <strong>INR {monthlyEmi.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / month</strong>
                                <span>Total payable: INR {Number(product.price).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {product.stock > 0 && (
                        <div className="detail-actions">
                            <div className="quantity-control">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                                <span>{quantity}</span>
                                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><FiPlus /></button>
                            </div>
                            <button className="btn-add-cart-lg" onClick={() => handleAddToCart(product, quantity)}>
                                <FiShoppingCart /> Add to Cart
                            </button>
                            <button className="btn-wishlist-lg" onClick={handleWishlist}>
                                <FiHeart />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <section className="detail-extra-section detail-qa-section">
                <div className="detail-extra-header">
                    <h2>Looking for specific info?</h2>
                    <span className="detail-qa-count">{productQuestions.length} question{productQuestions.length === 1 ? '' : 's'}</span>
                </div>

                <div className="detail-qa-grid">
                    <div className="detail-qa-card detail-qa-ask-card">
                        <div className="detail-qa-card-header">
                            <FiMessageSquare />
                            <div>
                                <h3>Ask the merchant</h3>
                                <p>
                                    Ask about specs, compatibility, delivery notes, or stock details for {product.name}.
                                </p>
                            </div>
                        </div>

                        <form className="detail-qa-form" onSubmit={handleAskQuestion}>
                            <textarea
                                rows={4}
                                placeholder={
                                    user
                                        ? 'Example: Does this work with iPhone 15 and does it include the adapter?'
                                        : 'Login to ask a product question'
                                }
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                disabled={!user || questionSubmitting}
                            />
                            <div className="detail-qa-form-footer">
                                <p>
                                    {user
                                        ? `Questions go directly to ${product.seller_username || 'the merchant'}. Unanswered questions stay visible only to you until the merchant replies.`
                                        : 'Sign in to send a question to the merchant.'}
                                </p>
                                {user ? (
                                    <button type="submit" className="btn-add-cart-lg" disabled={questionSubmitting}>
                                        <FiSend /> {questionSubmitting ? 'Sending...' : 'Send Question'}
                                    </button>
                                ) : (
                                    <Link to="/login" className="detail-qa-login-link">
                                        Login to ask
                                    </Link>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="detail-qa-card detail-qa-list-card">
                        <div className="detail-qa-card-header">
                            <FiMessageSquare />
                            <div>
                                <h3>Questions and answers</h3>
                                <p>Answered questions are public. Your pending questions appear here while you are logged in.</p>
                            </div>
                        </div>

                        {questionsLoading ? (
                            <div className="detail-qa-empty">Loading questions...</div>
                        ) : productQuestions.length === 0 ? (
                            <div className="detail-qa-empty">No questions yet. Start the conversation for this product.</div>
                        ) : (
                            <div className="detail-qa-list">
                                {productQuestions.map((question) => (
                                    <article key={question.id} className="detail-qa-item">
                                        <div className="detail-qa-item-top">
                                            <div>
                                                <strong>{question.customer_name || question.username || 'Customer'}</strong>
                                                <span>{formatDateTime(question.created_at)}</span>
                                            </div>
                                            <span className={`detail-qa-status ${question.is_answered ? 'answered' : 'pending'}`}>
                                                {question.is_answered ? 'Answered' : 'Pending'}
                                            </span>
                                        </div>

                                        <p className="detail-qa-question">{question.question}</p>

                                        {question.is_answered ? (
                                            <div className="detail-qa-answer">
                                                <strong>
                                                    Reply from {question.answered_by_name || question.answered_by_username || product.seller_username || 'Merchant'}
                                                </strong>
                                                <p>{question.answer}</p>
                                                {question.answered_at && (
                                                    <span>{formatDateTime(question.answered_at)}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="detail-qa-pending">
                                                Waiting for the merchant to reply.
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {similarProducts.length > 0 && (
                <section className="detail-extra-section">
                    <div className="detail-extra-header">
                        <h2>You may also like</h2>
                        <Link to={`/products?category=${product.category}`} className="view-all-link">More in this category</Link>
                    </div>
                    <div className="products-grid">
                        {similarProducts.map((item) => (
                            <ProductCard
                                key={item.id}
                                product={item}
                                onAddToCart={handleAddToCart}
                            />
                        ))}
                    </div>
                </section>
            )}

            {recentProducts.length > 0 && (
                <section className="detail-extra-section">
                    <div className="detail-extra-header">
                        <h2>Recently viewed</h2>
                        <Link to="/products" className="view-all-link">Browse all products</Link>
                    </div>
                    <div className="products-grid">
                        {recentProducts.map((item) => (
                            <ProductCard
                                key={item.id}
                                product={item}
                                onAddToCart={handleAddToCart}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Reviews Section */}
            <div className="reviews-section">
                <h2>Customer Reviews ({product.review_count})</h2>

                {user && (
                    <form className="review-form" onSubmit={handleReview}>
                        <h3>Write a Review</h3>
                        <div className="review-rating-input">
                            <label>Your Rating:</label>
                            <StarRating rating={reviewRating} size={24} interactive onRate={setReviewRating} />
                        </div>
                        <textarea
                            placeholder="Share your thoughts about this product..."
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            required
                            rows={4}
                        />
                        <button type="submit" className="btn-primary-lg">Submit Review</button>
                    </form>
                )}

                <div className="reviews-list">
                    {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.map((review) => (
                            <div key={review.id} className="review-card">
                                <div className="review-header">
                                    <div>
                                        <strong>{review.username}</strong>
                                        <StarRating rating={review.rating} size={14} />
                                    </div>
                                    <span className="review-date">
                                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <p>{review.comment}</p>
                            </div>
                        ))
                    ) : (
                        <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
