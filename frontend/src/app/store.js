import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/authSlice';
import cartReducer from '../features/cartSlice';
import productReducer from '../features/productSlice';
import wishlistReducer from '../features/wishlistSlice';
import uiReducer from '../features/uiSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer,
        products: productReducer,
        wishlist: wishlistReducer,
        ui: uiReducer,
    },
    devTools: import.meta.env.DEV,
});

export default store;
