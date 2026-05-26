import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─── Async Thunks ────────────────────────────────────────────────

export const fetchCart = createAsyncThunk(
    'cart/fetchCart',
    async (_, { rejectWithValue }) => {
        try {
            const res = await API.get('cart/');
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to fetch cart' });
        }
    }
);

export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async ({ productId, quantity = 1 }, { dispatch, rejectWithValue }) => {
        try {
            await API.post('cart/', { product_id: productId, quantity });
            dispatch(fetchCart());
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to add to cart' });
        }
    }
);

export const updateCartQuantity = createAsyncThunk(
    'cart/updateCartQuantity',
    async ({ itemId, quantity }, { dispatch, rejectWithValue }) => {
        try {
            if (quantity < 1) {
                await API.delete(`cart/${itemId}/`);
            } else {
                await API.patch(`cart/${itemId}/`, { quantity });
            }
            dispatch(fetchCart());
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to update quantity' });
        }
    }
);

export const removeCartItem = createAsyncThunk(
    'cart/removeCartItem',
    async (itemId, { dispatch, rejectWithValue }) => {
        try {
            await API.delete(`cart/${itemId}/`);
            dispatch(fetchCart());
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to remove item' });
        }
    }
);

export const clearCartItems = createAsyncThunk(
    'cart/clearCartItems',
    async (_, { rejectWithValue }) => {
        try {
            await API.delete('cart/clear/');
            return [];
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Failed to clear cart' });
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────────

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {
        resetCart(state) {
            state.items = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch cart
        builder
            .addCase(fetchCart.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchCart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Clear cart
        builder
            .addCase(clearCartItems.fulfilled, (state) => {
                state.items = [];
            });
    },
});

export const { resetCart } = cartSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────

export const selectCartItems = (state) => state.cart.items;
export const selectCartLoading = (state) => state.cart.loading;

export const selectCartCount = (state) =>
    state.cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

export const selectCartTotal = (state) =>
    state.cart.items.reduce(
        (sum, item) => sum + parseFloat(item.total_price || item.product?.price * item.quantity || 0),
        0
    );

export default cartSlice.reducer;
