import axios from 'axios';
import { API_BASE_URL } from './config';

const API = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
});

API.interceptors.request.use((config) => {
    try {
        const tokens = localStorage.getItem('tokens');
        if (tokens) {
            const parsed = JSON.parse(tokens);
            if (parsed?.access) {
                config.headers.Authorization = `Bearer ${parsed.access}`;
            }
        }
    } catch {
        localStorage.removeItem('tokens');
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';
        const isAuthRoute = requestUrl.includes('auth/login/') || requestUrl.includes('auth/token/refresh/');
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;
            try {
                const tokensRaw = localStorage.getItem('tokens');
                const tokens = tokensRaw ? JSON.parse(tokensRaw) : null;
                if (!tokens?.refresh) {
                    throw new Error('No refresh token available');
                }
                const res = await axios.post(`${API_BASE_URL}auth/token/refresh/`, {
                    refresh: tokens.refresh,
                });
                const newTokens = { ...tokens, access: res.data.access };
                localStorage.setItem('tokens', JSON.stringify(newTokens));
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return API(originalRequest);
            } catch {
                localStorage.removeItem('tokens');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export function extractApiError(err, fallback = 'Something went wrong') {
    if (!err.response) {
        return err.message === 'Network Error'
            ? 'Unable to reach the API server. Check that the backend is running.'
            : (err.message || fallback);
    }

    const data = err.response.data;
    if (!data) return fallback;

    if (typeof data === 'object' && !Array.isArray(data)) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
            const val = data[firstKey];
            return Array.isArray(val) ? val[0] : String(val);
        }
    }

    if (typeof data === 'string') return data;
    return fallback;
}

export default API;
