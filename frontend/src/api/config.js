const DEFAULT_API_BASE_URL = import.meta.env.DEV
    ? '/api/'
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

    // In development, if the backend returns its own absolute URL (e.g. 127.0.0.1:8000),
    // convert it to a relative path so Vite proxy handles it.
    if (import.meta.env.DEV && path.startsWith('http')) {
        try {
            const url = new URL(path);
            if (url.port === '8000') {
                return url.pathname;
            }
        } catch (e) {
            // ignore
        }
    }

    if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
        return path;
    }

    const apiOrigin = getApiOrigin();
    return apiOrigin ? new URL(path, apiOrigin).toString() : path;
}
