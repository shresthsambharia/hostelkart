import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token in the header of each request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Endpoints definitions
export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  getProfile: () => API.get('/auth/profile'),
  updateProfile: (profileData) => API.put('/auth/profile', profileData),
};

export const productAPI = {
  getAll: (params) => API.get('/products', { params }),
  getById: (id) => API.get(`/products/${id}`),
  getCategories: () => API.get('/products/categories'),
  submitReview: (productId, reviewData) => API.post(`/products/${productId}/reviews`, reviewData),
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
};

export const customRequestAPI = {
  create: (requestData) => API.post('/custom-requests', requestData),
  getMyRequests: () => API.get('/custom-requests/myrequests'),
};

export const adminAPI = {
  getAnalytics: () => API.get('/admin/analytics'),
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

export const paymentAPI = {
  createOrder: (amount) => API.post('/create-order', { amount }),
  verifyPayment: (payload) => API.post('/verify-payment', payload),
  refund: (orderId, refundReason) => API.post('/payments/refund', { orderId, refundReason }),
};

export default API;
