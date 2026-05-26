import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─── Async Thunks ────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ username, password }, { rejectWithValue }) => {
        try {
            const res = await API.post('auth/login/', { username, password });
            localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
            localStorage.setItem('user', JSON.stringify(res.data.user));
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Login failed' });
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (data, { rejectWithValue }) => {
        try {
            const res = await API.post('auth/register/', data);
            localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
            localStorage.setItem('user', JSON.stringify(res.data.user));
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Registration failed' });
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateUserProfile',
    async (data, { rejectWithValue }) => {
        try {
            const res = await API.put('auth/profile/', data);
            localStorage.setItem('user', JSON.stringify(res.data));
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { detail: 'Profile update failed' });
        }
    }
);

// ─── Helpers ─────────────────────────────────────────────────────

const loadUserFromStorage = () => {
    try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        return null;
    }
};

// ─── Slice ───────────────────────────────────────────────────────

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: loadUserFromStorage(),
        loading: false,
        error: null,
    },
    reducers: {
        logout(state) {
            localStorage.removeItem('tokens');
            localStorage.removeItem('user');
            state.user = null;
            state.error = null;
        },
        setUser(state, action) {
            state.user = action.payload;
        },
        clearAuthError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Register
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update profile
        builder
            .addCase(updateUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { logout, setUser, clearAuthError } = authSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────

export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
