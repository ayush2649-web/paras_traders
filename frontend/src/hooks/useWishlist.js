import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import {
    fetchWishlist,
    toggleWishlistItem,
    removeWishlistItem,
    resetWishlist,
    selectWishlistItems,
    selectWishlistLoading,
    selectIsWishlisted,
} from '../features/wishlistSlice';
import { selectUser } from '../features/authSlice';

/**
 * useWishlist — hook for wishlist operations (fetch, toggle, remove).
 */
export default function useWishlist() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const items = useSelector(selectWishlistItems);
    const loading = useSelector(selectWishlistLoading);

    // Auto-fetch when logged in
    useEffect(() => {
        if (user) {
            dispatch(fetchWishlist());
        } else {
            dispatch(resetWishlist());
        }
    }, [user, dispatch]);

    const toggle = useCallback(
        (productId) => dispatch(toggleWishlistItem(productId)).unwrap(),
        [dispatch]
    );

    const remove = useCallback(
        (itemId) => dispatch(removeWishlistItem(itemId)).unwrap(),
        [dispatch]
    );

    const isWishlisted = useCallback(
        (productId) => items.some(
            (item) => item.product?.id === productId || item.product_id === productId
        ),
        [items]
    );

    return {
        wishlistItems: items,
        wishlistLoading: loading,
        toggleWishlist: toggle,
        removeFromWishlist: remove,
        isWishlisted,
        selectIsWishlisted,
    };
}
