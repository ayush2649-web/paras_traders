import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
    loginUser,
    registerUser,
    updateUserProfile,
    logout,
    clearAuthError,
    selectUser,
    selectAuthLoading,
    selectAuthError,
} from '../features/authSlice';

/**
 * useAuth — drop-in replacement for the old Context-based useAuth().
 * Provides the same API: { user, loading, error, login, register, logout, updateProfile }.
 */
export default function useAuth() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const loading = useSelector(selectAuthLoading);
    const error = useSelector(selectAuthError);

    const login = useCallback(
        (username, password) => dispatch(loginUser({ username, password })).unwrap(),
        [dispatch]
    );

    const register = useCallback(
        (data) => dispatch(registerUser(data)).unwrap(),
        [dispatch]
    );

    const doLogout = useCallback(() => dispatch(logout()), [dispatch]);

    const updateProfile = useCallback(
        (data) => dispatch(updateUserProfile(data)).unwrap(),
        [dispatch]
    );

    const clearError = useCallback(() => dispatch(clearAuthError()), [dispatch]);

    return {
        user,
        loading,
        error,
        login,
        register,
        logout: doLogout,
        updateProfile,
        clearError,
    };
}
