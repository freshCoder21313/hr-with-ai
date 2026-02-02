/// <reference types="vite/client" />
import axios from 'axios';

// Get Base URL from environment or default to relative path (handled by proxy)
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Default timeout of 30 seconds
  timeout: 30000,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here in the future
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly for convenience
    return response.data;
  },
  (error) => {
    // Handle global errors (like 401 Unauthorized) here
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error [${status}]:`, data?.message || error.message);

      // Example: Redirect to login on 401 (if authentication is implemented later)
      // if (status === 401) { ... }
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }

    return Promise.reject(error);
  }
);
