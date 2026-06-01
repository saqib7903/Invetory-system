import axios from 'axios';

// Get backend API URL from Vite environment, fallback to localhost in dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging or authorization injection in the future
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to extract clean data or standardize error mapping
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error messaging for components
    const message = error.response?.data?.detail || 'An unexpected server error occurred.';
    const customError = new Error(message);
    customError.status = error.response?.status;
    customError.original = error;
    return Promise.reject(customError);
  }
);

export const productAPI = {
  getAll: () => apiClient.get('/products').then((res) => res.data),
  get: (id) => apiClient.get(`/products/${id}`).then((res) => res.data),
  create: (data) => apiClient.post('/products', data).then((res) => res.data),
  update: (id, data) => apiClient.put(`/products/${id}`, data).then((res) => res.data),
  delete: (id) => apiClient.delete(`/products/${id}`).then((res) => res.data),
};

export const customerAPI = {
  getAll: () => apiClient.get('/customers').then((res) => res.data),
  get: (id) => apiClient.get(`/customers/${id}`).then((res) => res.data),
  create: (data) => apiClient.post('/customers', data).then((res) => res.data),
  delete: (id) => apiClient.delete(`/customers/${id}`).then((res) => res.data),
};

export const orderAPI = {
  getAll: () => apiClient.get('/orders').then((res) => res.data),
  get: (id) => apiClient.get(`/orders/${id}`).then((res) => res.data),
  create: (data) => apiClient.post('/orders', data).then((res) => res.data),
  delete: (id) => apiClient.delete(`/orders/${id}`).then((res) => res.data),
};

export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/stats').then((res) => res.data),
};

export default apiClient;
