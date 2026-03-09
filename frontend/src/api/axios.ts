import axios from 'axios';

// Get base URL from environment variable
const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/api';

// Public Axios instance (for login, sign up)
export const publicApi = axios.create({
    baseURL, // Set a base URL for all requests
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Always send cookies (needed for refresh token)
    timeout: 5000, // Set a request timeout
});

// Private Axios instance (for authenticated requests)
export const privateApi = axios.create({
    baseURL, // Set a base URL for all requests
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // this allows you to send HTTP-only cookies (refresh token)
    timeout: 5000, // Set a request timeout
});

// Bust browser cache on every GET request by appending a unique timestamp param.
// This avoids stale data (e.g. dashboard stats after completing a quiz) without
// adding custom headers that would trigger CORS preflight errors.
privateApi.interceptors.request.use((config) => {
    if (config.method === 'get' || !config.method) {
        config.params = { ...config.params, _t: Date.now() };
    }
    return config;
});