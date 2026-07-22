import axios from 'axios';

const apiURL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000') 
  : '/api';
const cleanApiURL = apiURL.replace(/\/$/, '');
const baseURL = cleanApiURL.endsWith('/api') ? `${cleanApiURL}/` : `${cleanApiURL}/api/`;

const API = axios.create({
  baseURL,
  withCredentials: true, // Send secure HttpOnly cookies (refresh tokens) with API requests
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const getCsrfToken = () => {
  const cookieToken = getCookie('csrfToken');
  if (cookieToken) return cookieToken;
  const storedToken = localStorage.getItem('csrfToken');
  if (storedToken) return storedToken;
  return null;
};

// Interceptor to inject Bearer token and CSRF token in the headers of requests
API.interceptors.request.use(
  (config) => {
    // Attach Bearer token if present in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Attach CSRF token if present in cookie or stored in localStorage
    const csrfToken = getCsrfToken();
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle session expirations and perform token refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/register') ||
        originalRequest.url.includes('/auth/refresh') ||
        originalRequest.url.includes('/auth/2fa/login')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${baseURL}auth/refresh`, { refreshToken }, { withCredentials: true });

        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        processQueue(null, data.token);
        isRefreshing = false;

        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        const hadUser = !!localStorage.getItem('userInfo');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');

        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && hadUser) {
          window.location.href = '/login?session_expired=true';
        }
        return Promise.reject(refreshError);
      }
    }

    // Automatic retry with exponential backoff for GET requests on server/network errors
    if (originalRequest && originalRequest.method === 'get') {
      const status = error.response?.status;
      if (!status || (status >= 500 && status <= 599)) {
        originalRequest.retry = originalRequest.retry !== undefined ? originalRequest.retry : 3;
        originalRequest.retryDelay = originalRequest.retryDelay !== undefined ? originalRequest.retryDelay : 1000;
        originalRequest.__retryCount = originalRequest.__retryCount || 0;

        if (originalRequest.__retryCount < originalRequest.retry) {
          originalRequest.__retryCount += 1;
          const delay = originalRequest.retryDelay * Math.pow(2, originalRequest.__retryCount - 1);
          console.warn(`[API Retry] GET ${originalRequest.url} failed. Retrying in ${delay}ms (${originalRequest.__retryCount}/${originalRequest.retry})...`);
          
          await new Promise((resolve) => setTimeout(resolve, delay));
          return API(originalRequest);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Endpoints definitions
export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  getProfile: () => API.get('/auth/profile'),
  updateProfile: (profileData) => API.put('/auth/profile', profileData),
  updateFcmToken: (fcmToken) => API.put('/auth/fcm-token', { fcmToken }),
  getCaptcha: () => API.get('/auth/captcha'),
  getCsrfToken: () => API.get('/auth/csrf'),
  logout: (refreshToken) => API.post('/auth/logout', { refreshToken }),
  setup2FA: (data) => API.post('/auth/2fa/setup', data),
  verify2FASetup: (data) => API.post('/auth/2fa/verify-setup', data),
  disable2FA: (data) => API.post('/auth/2fa/disable', data),
  login2FA: (data) => API.post('/auth/2fa/login', data),
  regenerateRecoveryCodes: (data) => API.post('/auth/2fa/recovery-codes', data),
};

let categoriesPromise = null;
let trendingPromise = null;

export const productAPI = {
  getAll: (params) => API.get('/products', { params }),
  getById: (id) => API.get(`/products/${id}`),
  getCategories: () => {
    if (categoriesPromise) return categoriesPromise;
    categoriesPromise = API.get('/products/categories').catch((err) => {
      categoriesPromise = null;
      throw err;
    });
    return categoriesPromise;
  },
  submitReview: (productId, reviewData) => API.post(`/products/${productId}/reviews`, reviewData),
  getSuggestions: (q) => API.get('/products/search/suggest', { params: { q } }),
  getTrending: () => {
    if (trendingPromise) return trendingPromise;
    trendingPromise = API.get('/products/search/trending').catch((err) => {
      trendingPromise = null;
      throw err;
    });
    return trendingPromise;
  },
};

export const cartAPI = {
  get: () => API.get('/cart'),
  add: (productId, quantity = 1) => API.post('/cart', { productId, quantity }),
  updateQuantity: (productId, quantity) => API.put('/cart', { productId, quantity }),
  remove: (productId) => API.delete(`/cart/${productId}`),
  clear: () => API.delete('/cart'),
};

export const wishlistAPI = {
  get: () => API.get('/wishlist'),
  toggle: (productId) => API.post('/wishlist', { productId }),
};

export const orderAPI = {
  create: (orderData) => API.post('/orders', orderData),
  getById: (id) => API.get(`/orders/${id}`),
  getMyOrders: () => API.get('/orders/myorders'),
  getPaymentSettings: () => API.get('/orders/payment-settings'),
  cancel: (id, cancellationReason) => API.put(`/orders/${id}/cancel`, { cancellationReason }),
  uploadScreenshot: (formData) => API.post('/upload/payment-screenshot', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitPayment: (id, paymentData) => API.put(`/orders/${id}/submit-payment`, paymentData),
};

export const customRequestAPI = {
  create: (requestData) => API.post('/custom-requests', requestData),
  getMyRequests: () => API.get('/custom-requests/myrequests'),
};

export const adminAPI = {
  getAnalytics: () => API.get('/admin/analytics'),
  getLogs: () => API.get('/admin/logs'),
  addProduct: (productData) => API.post('/admin/products', productData),
  updateProduct: (id, productData) => API.put(`/admin/products/${id}`, productData),
  deleteProduct: (id) => API.delete(`/admin/products/${id}`),
  getAllOrders: () => API.get('/admin/orders'),
  updateOrderStatus: (id, status, note) => API.put(`/admin/orders/${id}/status`, { status, note }),
  assignDeliveryPartner: (id, deliveryPartnerId) => API.put(`/admin/orders/${id}/assign`, { deliveryPartnerId }),
  getAllUsers: () => API.get('/admin/users'),
  getDeliveryPartners: () => API.get('/admin/delivery-partners'),
  addDeliveryPartner: (partnerData) => API.post('/admin/delivery-partners', partnerData),
  updateDeliveryPartner: (id, partnerData) => API.put(`/admin/delivery-partners/${id}`, partnerData),
  deleteDeliveryPartner: (id) => API.delete(`/admin/delivery-partners/${id}`),
  getAllCustomRequests: () => API.get('/admin/custom-requests'),
  updateCustomRequestStatus: (id, status, adminFeedback) => API.put(`/admin/custom-requests/${id}`, { status, adminFeedback }),
  getPaymentSettings: () => API.get('/admin/payment-settings'),
  updatePaymentSettings: (settings) => API.put('/admin/payment-settings', settings),
  uploadImage: (formData) => API.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateOrderPaymentStatus: (id, paymentStatus) => API.put(`/admin/orders/${id}/payment`, { paymentStatus }),
  exportProducts: () => API.get('/admin/excel/export-products', { responseType: 'blob' }),
  exportOrders: () => API.get('/admin/excel/export-orders', { responseType: 'blob' }),
  exportCustomers: () => API.get('/admin/excel/export-customers', { responseType: 'blob' }),
  exportRevenue: () => API.get('/admin/excel/export-revenue', { responseType: 'blob' }),
  importProducts: (formData) => API.post('/admin/excel/import-products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  bulkInventoryUpdate: (formData) => API.post('/admin/excel/bulk-inventory', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export const deliveryAPI = {
  getAssignedOrders: () => API.get('/delivery/orders'),
  updateStatus: (id, status, note, otp) => API.put(`/delivery/orders/${id}/status`, { status, note, otp }),
  getHistory: () => API.get('/delivery/history'),
};

export const notificationAPI = {
  getAll: () => API.get('/notifications'),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
};

export const paymentAPI = {};

export const couponAPI = {
  validate: (code, orderAmount) => API.post('/coupons/validate', { code, orderAmount }),
  getActive: () => API.get('/coupons'),
  adminGetAll: () => API.get('/coupons/admin'),
  adminCreate: (couponData) => API.post('/coupons/admin', couponData),
  adminUpdate: (id, couponData) => API.put(`/coupons/admin/${id}`, couponData),
  adminDelete: (id) => API.delete(`/coupons/admin/${id}`),
};

export const walletAPI = {
  getDetails: () => API.get('/wallet'),
};

let recommendationPromise = null;
let recommendationCacheTime = 0;
let recommendationCacheToken = null;

export const recommendationAPI = {
  get: () => {
    const token = localStorage.getItem('token');
    const now = Date.now();
    if (
      recommendationPromise &&
      recommendationCacheToken === token &&
      (now - recommendationCacheTime < 60 * 1000)
    ) {
      return recommendationPromise;
    }
    recommendationCacheToken = token;
    recommendationCacheTime = now;
    recommendationPromise = API.get('/recommendations').catch((err) => {
      recommendationPromise = null;
      recommendationCacheTime = 0;
      throw err;
    });
    return recommendationPromise;
  },
};

export const ticketAPI = {
  create: (ticketData) => API.post('/tickets', ticketData),
  getAll: (params) => API.get('/tickets', { params }),
  getById: (id) => API.get(`/tickets/${id}`),
  addMessage: (id, content, isInternalNote = false) => API.post(`/tickets/${id}/messages`, { content, isInternalNote }),
  close: (id) => API.put(`/tickets/${id}/close`),
  rate: (id, rating, feedback) => API.put(`/tickets/${id}/rate`, { rating, feedback }),
  adminGetAll: (params) => API.get('/tickets/admin', { params }),
  adminGetAnalytics: () => API.get('/tickets/admin/analytics'),
  adminUpdate: (id, data) => API.put(`/tickets/admin/${id}`, data),
};

export default API;
