import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('propnest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  sendOTP: (phone, purpose = 'registration') =>
    apiClient.post('/auth/send-otp', { phone, purpose }),
  
  verifyOTP: (phone, otp, purpose = 'registration') =>
    apiClient.post('/auth/verify-otp', { phone, otp, purpose }),
  
  register: (userData) =>
    apiClient.post('/auth/register', userData),
  
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
};

// Property API
export const propertyAPI = {
  searchProperties: (params) =>
    apiClient.get('/properties/search', { params }),
  
  getProperty: (propertyId) =>
    apiClient.get(`/properties/${propertyId}`),
  
  createProperty: (propertyData) =>
    apiClient.post('/properties/', propertyData),
  
  updateProperty: (propertyId, updates) =>
    apiClient.patch(`/properties/${propertyId}`, updates),
  
  getHostProperties: () =>
    apiClient.get('/properties/host/my-properties'),
  
  submitForVerification: (propertyId) =>
    apiClient.post(`/properties/${propertyId}/submit-verification`),
};

// Booking API
export const bookingAPI = {
  createBooking: (bookingData) =>
    apiClient.post('/bookings/', bookingData),
  
  confirmPayment: (data) =>
    apiClient.post('/bookings/confirm-payment', data),
  
  getGuestBookings: () =>
    apiClient.get('/bookings/guest/my-bookings'),
  
  getHostBookings: () =>
    apiClient.get('/bookings/host/my-bookings'),
  
  getBookingDetails: (bookingId) =>
    apiClient.get(`/bookings/${bookingId}`),
};

export default apiClient;
