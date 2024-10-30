// api.js
import axios from 'axios';

// Configure base URL based on environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the full API URL from environment variable
    return process.env.REACT_APP_API_URL || 'https://quillquest-api.onrender.com/api';
  }
  // In development, use the local URL
  return process.env.REACT_APP_API_BASE_URL 
    ? `${process.env.REACT_APP_API_BASE_URL}/api` 
    : 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  // Enable credentials for cross-origin requests
  withCredentials: true
});

// Request interceptor with improved logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Making request:', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        headers: config.headers,
        data: config.data
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorDetails = {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    };

    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      throw new Error('Request timed out. Please try again.');
    } else if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Only log detailed errors in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('Response error:', errorDetails);
      }
      
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Handle unauthorized access
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          throw new Error('Access denied. Please check your permissions.');
        case 404:
          throw new Error('Resource not found.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw error;
      }
    }
  }
);

// Auth endpoints with retry logic
export const authAPI = {
  login: async (credentials, retryCount = 0) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response;
    } catch (error) {
      if (retryCount < 2 && error.code === 'ECONNABORTED') {
        // Retry on timeout
        return authAPI.login(credentials, retryCount + 1);
      }
      throw error;
    }
  },
  
  register: async (userData, retryCount = 0) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      if (retryCount < 2 && error.code === 'ECONNABORTED') {
        // Retry on timeout
        return authAPI.register(userData, retryCount + 1);
      }
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
    } catch (error) {
      // Always clear token on logout, even if request fails
      localStorage.removeItem('token');
      throw error;
    }
  }
};

// Add request/response handlers for monitoring
if (process.env.NODE_ENV === 'production') {
  api.interceptors.request.use(request => {
    request.timestamp = Date.now();
    return request;
  });

  api.interceptors.response.use(response => {
    const duration = Date.now() - response.config.timestamp;
    // You could send this to your monitoring service
    if (duration > 1000) {
      console.warn(`Slow request: ${response.config.url} took ${duration}ms`);
    }
    return response;
  });
}

// Add connection status monitoring
const connectionStatus = {
  isOnline: true,
  listeners: new Set(),
};

// Monitor connection status
window.addEventListener('online', () => {
  connectionStatus.isOnline = true;
  connectionStatus.listeners.forEach(listener => listener(true));
});

window.addEventListener('offline', () => {
  connectionStatus.isOnline = false;
  connectionStatus.listeners.forEach(listener => listener(false));
});

// Export connection monitoring utilities
export const connection = {
  isOnline: () => connectionStatus.isOnline,
  onStatusChange: (listener) => {
    connectionStatus.listeners.add(listener);
    return () => connectionStatus.listeners.delete(listener);
  }
};

export default api;