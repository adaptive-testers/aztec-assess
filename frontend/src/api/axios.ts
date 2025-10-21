import axios from 'axios';

// Get base URL from environment variable
const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/api';

// Public Axios instance (for login, sign up)
export const publicApi = axios.create({
baseURL, // Set a base URL for all requests
headers: {
    'Content-Type': 'application/json',
},
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