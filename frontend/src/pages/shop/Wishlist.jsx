import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import ProductCard from '../../components/common/ProductCard';
import useCart from '../../hooks/useCart';
import { toast } from 'react-toastify';
import { FiHeart } from 'react-icons/fi';
import './Wishlist.css';

export default function Wishlist() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            const res = await API.get('wishlist/');
            setItems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (product) => {
        try {
            await API.post('wishlist/', { product_id: product.id });
            setItems((prev) => prev.filter((i) => i.product.id !== product.id));
            toast.success('Removed from wishlist');
        } catch {
            toast.error('Failed');
        }
    };

    const handleAddToCart = async (product) => {
        try {
            await addToCart(product);
            toast.success(`${product.name} added to cart!`);
        } catch {
            toast.error('Failed');
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="wishlist-page">
            <h1><FiHeart /> My Wishlist ({items.length})</h1>
            {items.length === 0 ? (
                <div className="empty-wishlist">
                    <p>Your wishlist is empty. Start adding products you love!</p>
                    <Link to="/products" className="btn-primary-lg">Browse Products</Link>
                </div>
            ) : (
                <div className="products-grid">
                    {items.map((item) => (
                        <ProductCard
                            key={item.id}
                            product={item.product}
                            onAddToCart={handleAddToCart}
                            onToggleWishlist={handleRemove}
                            isWishlisted={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
