import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
    fetchProducts,
    fetchFeaturedProducts,
    fetchTopRatedProducts,
    fetchCategories,
    clearProducts,
    selectProducts,
    selectFeaturedProducts,
    selectTopRatedProducts,
    selectCategories,
    selectProductsLoading,
    selectProductsPagination,
} from '../features/productSlice';

/**
 * useProducts — hook for product listing, featured, top-rated, and category operations.
 */
export default function useProducts() {
    const dispatch = useDispatch();
    const products = useSelector(selectProducts);
    const featured = useSelector(selectFeaturedProducts);
    const topRated = useSelector(selectTopRatedProducts);
    const categories = useSelector(selectCategories);
    const loading = useSelector(selectProductsLoading);
    const pagination = useSelector(selectProductsPagination);

    const loadProducts = useCallback(
        (params) => dispatch(fetchProducts(params)),
        [dispatch]
    );

    const loadFeatured = useCallback(
        () => dispatch(fetchFeaturedProducts()),
        [dispatch]
    );

    const loadTopRated = useCallback(
        () => dispatch(fetchTopRatedProducts()),
        [dispatch]
    );

    const loadCategories = useCallback(
        () => dispatch(fetchCategories()),
        [dispatch]
    );

    const resetProducts = useCallback(
        () => dispatch(clearProducts()),
        [dispatch]
    );

    return {
        products,
        featured,
        topRated,
        categories,
        loading,
        pagination,
        loadProducts,
        loadFeatured,
        loadTopRated,
        loadCategories,
        resetProducts,
    };
}
