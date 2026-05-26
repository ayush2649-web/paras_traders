import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─── Async Thunks ────────────────────────────────────────────────

export const fetchProducts = createAsyncThunk(
    'products/fetchProducts',
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await API.get('products/', { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch products' });
        }
    }
);

export const fetchFeaturedProducts = createAsyncThunk(
    'products/fetchFeaturedProducts',
    async (_, { rejectWithValue }) => {
        try {
            const res = await API.get('products/featured/');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch featured products' });
        }
    }
);

export const fetchTopRatedProducts = createAsyncThunk(
    'products/fetchTopRatedProducts',
    async (_, { rejectWithValue }) => {
        try {
            const res = await API.get('products/top_rated/');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch top-rated products' });
        }
    }
);

export const fetchCategories = createAsyncThunk(
    'products/fetchCategories',
    async (_, { rejectWithValue }) => {
        try {
            const res = await API.get('categories/');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch categories' });
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────────

const productSlice = createSlice({
    name: 'products',
    initialState: {
        items: [],
        featured: [],
        topRated: [],
        categories: [],
        totalPages: 1,
        currentPage: 1,
        loading: false,
        featuredLoading: false,
        topRatedLoading: false,
        categoriesLoading: false,
        error: null,
    },
    reducers: {
        clearProducts(state) {
            state.items = [];
            state.totalPages = 1;
            state.currentPage = 1;
        },
    },
    extraReducers: (builder) => {
        // Products
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.loading = false;
                // Handle paginated response
                if (action.payload.results) {
                    state.items = action.payload.results;
                    state.totalPages = Math.ceil(action.payload.count / 12);
                    state.currentPage = action.meta.arg?.page || 1;
                } else {
                    state.items = action.payload;
                }
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Featured
        builder
            .addCase(fetchFeaturedProducts.pending, (state) => {
                state.featuredLoading = true;
            })
            .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
                state.featuredLoading = false;
                state.featured = action.payload;
            })
            .addCase(fetchFeaturedProducts.rejected, (state) => {
                state.featuredLoading = false;
            });

        // Top rated
        builder
            .addCase(fetchTopRatedProducts.pending, (state) => {
                state.topRatedLoading = true;
            })
            .addCase(fetchTopRatedProducts.fulfilled, (state, action) => {
                state.topRatedLoading = false;
                state.topRated = action.payload;
            })
            .addCase(fetchTopRatedProducts.rejected, (state) => {
                state.topRatedLoading = false;
            });

        // Categories
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.categoriesLoading = true;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categoriesLoading = false;
                state.categories = action.payload;
            })
            .addCase(fetchCategories.rejected, (state) => {
                state.categoriesLoading = false;
            });
    },
});

export const { clearProducts } = productSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────

export const selectProducts = (state) => state.products.items;
export const selectFeaturedProducts = (state) => state.products.featured;
export const selectTopRatedProducts = (state) => state.products.topRated;
export const selectCategories = (state) => state.products.categories;
export const selectProductsLoading = (state) => state.products.loading;
export const selectProductsPagination = (state) => ({
    totalPages: state.products.totalPages,
    currentPage: state.products.currentPage,
});

export default productSlice.reducer;
