import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        mobileMenuOpen: false,
        searchQuery: '',
    },
    reducers: {
        toggleMobileMenu(state) {
            state.mobileMenuOpen = !state.mobileMenuOpen;
        },
        closeMobileMenu(state) {
            state.mobileMenuOpen = false;
        },
        setSearchQuery(state, action) {
            state.searchQuery = action.payload;
        },
    },
});

export const { toggleMobileMenu, closeMobileMenu, setSearchQuery } = uiSlice.actions;

export const selectMobileMenuOpen = (state) => state.ui.mobileMenuOpen;
export const selectSearchQuery = (state) => state.ui.searchQuery;

export default uiSlice.reducer;
