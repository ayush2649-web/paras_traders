const DEFAULT_API_BASE_URL = import.meta.env.DEV
    ? 'http://127.0.0.1:8000/api/'
    : '/api/';

function ensureTrailingSlash(value) {
    return value.endsWith('/') ? value : `${value}/`;
}

export const API_BASE_URL = ensureTrailingSlash(
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

function getApiOrigin() {
    if (/^https?:\/\//i.test(API_BASE_URL)) {
        return new URL(API_BASE_URL).origin;
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return '';
}

export function getMediaUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
        return path;
    }

    const apiOrigin = getApiOrigin();
    return apiOrigin ? new URL(path, apiOrigin).toString() : path;
}
