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
  
  mockPay: (bookingId) =>
    apiClient.post(`/bookings/${bookingId}/mock-pay`),

  getPaymentConfig: () =>
    apiClient.get('/bookings/payment/config'),

  getGuestBookings: () =>
    apiClient.get('/bookings/guest/my-bookings'),
  
  getHostBookings: () =>
    apiClient.get('/bookings/host/my-bookings'),
  
  getBookingDetails: (bookingId) =>
    apiClient.get(`/bookings/${bookingId}`),

  cancelBooking: (bookingId) =>
    apiClient.post(`/bookings/${bookingId}/cancel`),
};

// Calendar API
export const calendarAPI = {
  getBlockedDates: (propertyId, params = {}) =>
    apiClient.get(`/calendar/properties/${propertyId}/blocked-dates`, { params }),

  blockDates: (propertyId, payload) =>
    apiClient.post(`/calendar/properties/${propertyId}/block-dates`, payload),

  unblockDates: (blockedDateId) =>
    apiClient.delete(`/calendar/blocked-dates/${blockedDateId}`),

  getUnifiedView: (propertyId, month, year) =>
    apiClient.get(`/calendar/properties/${propertyId}/unified-view`, {
      params: { month, year },
    }),

  listExternalCalendars: (propertyId) =>
    apiClient.get(`/calendar/properties/${propertyId}/external-calendars`),

  addExternalCalendar: (propertyId, payload) =>
    apiClient.post(`/calendar/properties/${propertyId}/external-calendars`, payload),

  syncExternalCalendar: (calendarId) =>
    apiClient.post(`/calendar/external-calendars/${calendarId}/sync`),

  removeExternalCalendar: (calendarId) =>
    apiClient.delete(`/calendar/external-calendars/${calendarId}`),

  getICalExportUrl: (propertyId) => {
    const token = localStorage.getItem('propnest_token');
    return {
      url: `${BACKEND_URL}/api/calendar/properties/${propertyId}/ical-export`,
      token,
    };
  },

  downloadICal: async (propertyId) => {
    const response = await apiClient.get(
      `/calendar/properties/${propertyId}/ical-export`,
      { responseType: 'blob' }
    );
    return response;
  },
};

export default apiClient;
