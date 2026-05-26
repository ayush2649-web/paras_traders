/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setCartItems([]);
        }
    }, [user]);

    const requireAuth = () => {
        if (!user) {
            navigate('/login');
            throw new Error('LOGIN_REQUIRED');
        }
    };

    const fetchCart = async () => {
        try {
            setLoading(true);
            const res = await API.get('cart/');
            setCartItems(res.data);
        } catch (err) {
            console.error('Failed to fetch cart', err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product, quantity = 1) => {
        requireAuth();
        await API.post('cart/', { product_id: product.id, quantity });
        await fetchCart();
    };

    const updateQuantity = async (itemId, quantity) => {
        requireAuth();
        if (quantity < 1) {
            await API.delete(`cart/${itemId}/`);
        } else {
            await API.patch(`cart/${itemId}/`, { quantity });
        }
        await fetchCart();
    };

    const removeFromCart = async (itemId) => {
        requireAuth();
        await API.delete(`cart/${itemId}/`);
        await fetchCart();
    };

    const clearCart = async () => {
        requireAuth();
        await API.delete('cart/clear/');
        setCartItems([]);
    };

    const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const cartTotal = cartItems.reduce(
        (sum, item) => sum + parseFloat(item.total_price || item.product?.price * item.quantity || 0),
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems, cartCount, cartTotal, loading,
                addToCart, updateQuantity, removeFromCart, clearCart, fetchCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
}
