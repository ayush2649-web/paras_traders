import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─── Async Thunks ────────────────────────────────────────────────

export const fetchWishlist = createAsyncThunk(
    'wishlist/fetchWishlist',
    async (_, { rejectWithValue }) => {
        try {
            const res = await API.get('wishlist/');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch wishlist' });
        }
    }
);

export const toggleWishlistItem = createAsyncThunk(
    'wishlist/toggleWishlistItem',
    async (productId, { dispatch, rejectWithValue }) => {
        try {
            await API.post('wishlist/', { product_id: productId });
            dispatch(fetchWishlist());
            return productId;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to toggle wishlist' });
        }
    }
);

export const removeWishlistItem = createAsyncThunk(
    'wishlist/removeWishlistItem',
    async (itemId, { dispatch, rejectWithValue }) => {
        try {
            await API.delete(`wishlist/${itemId}/`);
            dispatch(fetchWishlist());
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to remove from wishlist' });
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────────

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {
        resetWishlist(state) {
            state.items = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWishlist.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchWishlist.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchWishlist.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { resetWishlist } = wishlistSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistLoading = (state) => state.wishlist.loading;

export const selectIsWishlisted = (productId) => (state) =>
    state.wishlist.items.some(
        (item) => item.product?.id === productId || item.product_id === productId
    );

export default wishlistSlice.reducer;
