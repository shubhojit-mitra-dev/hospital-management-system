import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

export const refreshInstance = axios.create({
  baseURL,
  withCredentials: true,
});

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject bearer token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const response = await refreshInstance.post('/api/v1/auth/refresh');
        const newAccessToken = response.data?.data?.accessToken || response.data?.accessToken;
        
        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }
        
        // Update store
        useAuthStore.getState().refresh(newAccessToken);
        
        // Update original request auth header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        
        // Retry original request
        return api.request(originalRequest);
      } catch (refreshError) {
        // Log out user and redirect to login
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
