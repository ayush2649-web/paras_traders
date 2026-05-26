/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch {
            localStorage.removeItem('user');
            localStorage.removeItem('tokens');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const res = await API.post('auth/login/', { username, password });
        localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const register = async (data) => {
        const res = await API.post('auth/register/', data);
        localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateProfile = async (data) => {
        const res = await API.put('auth/profile/', data);
        localStorage.setItem('user', JSON.stringify(res.data));
        setUser(res.data);
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
