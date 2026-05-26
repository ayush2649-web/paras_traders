import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchCart,
    addToCart as addToCartThunk,
    updateCartQuantity,
    removeCartItem,
    clearCartItems,
    resetCart,
    selectCartItems,
    selectCartCount,
    selectCartTotal,
    selectCartLoading,
} from '../features/cartSlice';
import { selectUser } from '../features/authSlice';

/**
 * useCart — drop-in replacement for the old Context-based useCart().
 * Provides: { cartItems, cartCount, cartTotal, loading, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart }.
 */
export default function useCart() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectUser);
    const cartItems = useSelector(selectCartItems);
    const cartCount = useSelector(selectCartCount);
    const cartTotal = useSelector(selectCartTotal);
    const loading = useSelector(selectCartLoading);

    // Auto-fetch cart when user changes
    useEffect(() => {
        if (user) {
            dispatch(fetchCart());
        } else {
            dispatch(resetCart());
        }
    }, [user, dispatch]);

    const requireAuth = useCallback(() => {
        if (!user) {
            navigate('/login');
            throw new Error('LOGIN_REQUIRED');
        }
    }, [user, navigate]);

    const addToCart = useCallback(
        async (product, quantity = 1) => {
            requireAuth();
            return dispatch(addToCartThunk({ productId: product.id, quantity })).unwrap();
        },
        [dispatch, requireAuth]
    );

    const updateQuantity = useCallback(
        async (itemId, quantity) => {
            requireAuth();
            return dispatch(updateCartQuantity({ itemId, quantity })).unwrap();
        },
        [dispatch, requireAuth]
    );

    const removeFromCart = useCallback(
        async (itemId) => {
            requireAuth();
            return dispatch(removeCartItem(itemId)).unwrap();
        },
        [dispatch, requireAuth]
    );

    const clearCart = useCallback(
        async () => {
            requireAuth();
            return dispatch(clearCartItems()).unwrap();
        },
        [dispatch, requireAuth]
    );

    const doFetchCart = useCallback(() => dispatch(fetchCart()), [dispatch]);

    return {
        cartItems,
        cartCount,
        cartTotal,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        fetchCart: doFetchCart,
    };
}
