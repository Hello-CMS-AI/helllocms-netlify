import axios from 'axios';

// Create an Axios instance with default configuration
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', // Use environment variable for baseURL
});

// Add a request interceptor to include the token in headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors globally
API.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Handle session expiration specifically
    if (error.response?.status === 401 && error.response.data.message === 'Session expired') {
      error.isSessionExpired = true; // Mark it as a session expiration error
    }
    return Promise.reject(error); // Pass the error to the caller
  }
);

export default API;
