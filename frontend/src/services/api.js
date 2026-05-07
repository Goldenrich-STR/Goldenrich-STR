import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };

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

// Subscription API
export const subscriptionAPI = {
  getPlans: (planType) =>
    apiClient.get('/subscriptions/plans', { params: planType ? { plan_type: planType } : {} }),

  createRegistrationFeeOrder: () =>
    apiClient.post('/subscriptions/registration-fee'),

  confirmRegistrationFee: (data) =>
    apiClient.post('/subscriptions/confirm-registration-fee', data),

  mockPayRegistrationFee: (orderId) =>
    apiClient.post('/subscriptions/registration-fee/mock-pay', null, {
      params: { razorpay_order_id: orderId },
    }),
};

// Upload API
export const uploadAPI = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Convert relative /api/uploads/... to absolute URL using BACKEND_URL
    return {
      ...res.data,
      url: res.data.url.startsWith('http') ? res.data.url : `${BACKEND_URL}${res.data.url}`,
    };
  },
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

// Verification Workflow API — Phase 14
// Centralized so every dashboard sends JSON bodies (never query strings).
// State machine:
//   draft -> pending_verification (host submitForVerification)
//   pending_verification -> under_review (broker submitVisit)
//   under_review (rm_approved=true) -> live (admin approve)
//   under_review -> rejected (admin reject) | draft (rm reject -> resubmit)
export const verificationAPI = {
  // Broker
  listBrokerTasks: (status_filter) =>
    apiClient.get('/broker/verifications', {
      params: status_filter ? { status_filter } : {},
    }),

  submitVisit: (propertyId, payload) =>
    apiClient.post(`/broker/verifications/${propertyId}/submit`, payload),

  // Employee (RM)
  listPendingReviews: () => apiClient.get('/employee/verifications/pending'),

  getVerificationDetails: (verificationId) =>
    apiClient.get(`/employee/verifications/${verificationId}`),

  rmApprove: (verificationId, remarks = '') =>
    apiClient.post(`/employee/verifications/${verificationId}/approve`, { remarks }),

  rmReject: (verificationId, reason) =>
    apiClient.post(`/employee/verifications/${verificationId}/reject`, { reason }),

  // Admin (final approval)
  listAwaitingFinalApproval: () =>
    apiClient.get('/admin/properties/awaiting-final-approval'),

  listPendingForAdmin: () => apiClient.get('/admin/properties/pending-verification'),

  adminApprove: (propertyId) =>
    apiClient.post(`/admin/properties/${propertyId}/approve`),

  adminReject: (propertyId, reason) =>
    apiClient.post(`/admin/properties/${propertyId}/reject`, { reason }),
};

// Account / Ledger / Payouts / Refunds — Phase 15
export const accountAPI = {
  // Admin
  overview: () => apiClient.get('/admin/account/overview'),
  mrrChart: (months = 6) =>
    apiClient.get('/admin/account/mrr-chart', { params: { months } }),
  topHosts: (limit = 10) =>
    apiClient.get('/admin/account/top-hosts', { params: { limit } }),
  listTransactions: (params = {}) =>
    apiClient.get('/admin/account/transactions', { params }),
  exportTransactionsCsvUrl: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${BACKEND_URL}/api/admin/account/transactions/export-csv${qs ? `?${qs}` : ''}`;
  },
  downloadTransactionsCsv: async (params = {}) => {
    const res = await apiClient.get('/admin/account/transactions/export-csv', {
      params,
      responseType: 'blob',
    });
    return res;
  },
  listPayouts: (params = {}) =>
    apiClient.get('/admin/account/payouts', { params }),
  processPayout: (payoutId) =>
    apiClient.post(`/admin/account/payouts/${payoutId}/process`, {}),
  processAllEligible: () =>
    apiClient.post('/admin/account/payouts/process-eligible'),
  sweepEligibility: () =>
    apiClient.post('/admin/account/payouts/sweep-eligibility'),
  listRefunds: (params = {}) =>
    apiClient.get('/admin/account/refunds', { params }),
  initiateRefund: (bookingId, payload) =>
    apiClient.post(`/admin/account/refunds/${bookingId}`, payload),
  refundPolicyPreview: (checkInDate, totalAmount) =>
    apiClient.get('/admin/account/refunds/policy-preview', {
      params: { check_in_date: checkInDate, total_amount: totalAmount },
    }),

  // Host
  getHostPayoutPreference: () => apiClient.get('/host/payout-preference'),
  updateHostPayoutPreference: (payload) =>
    apiClient.put('/host/payout-preference', payload),
  listMyPayouts: (payoutStatus) =>
    apiClient.get('/host/payouts', {
      params: payoutStatus ? { payout_status: payoutStatus } : {},
    }),
};

// Reviews & Ratings — Phase 18
export const reviewAPI = {
  listForProperty: (propertyId, params = {}) =>
    apiClient.get(`/properties/${propertyId}/reviews`, { params }),
  eligibility: (bookingId) =>
    apiClient.get(`/bookings/${bookingId}/review-eligibility`),
  submit: (bookingId, payload) =>
    apiClient.post(`/bookings/${bookingId}/review`, payload),
  hostRespond: (reviewId, response) =>
    apiClient.post(`/reviews/${reviewId}/host-response`, { response }),
  listHostReviews: () => apiClient.get('/host/reviews'),
  listMyReviews: () => apiClient.get('/guest/my-reviews'),
};

export default apiClient;
