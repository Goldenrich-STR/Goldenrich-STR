import axios from 'axios';

const configuredBackendUrl = (process.env.REACT_APP_BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');
const isBrowser = typeof window !== 'undefined';
const isLocalPage = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const pointsToLocalBackend = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBackendUrl);
const productionBackendUrl = isBrowser && /(^|\.)x-space360\.in$/i.test(window.location.hostname)
  ? 'https://api.x-space360.in'
  : '';
const defaultBackendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : productionBackendUrl;
const BACKEND_URL = configuredBackendUrl && !(isBrowser && !isLocalPage && pointsToLocalBackend)
  ? configuredBackendUrl
  : defaultBackendUrl;

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };

export const loadRazorpaySdk = () => {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      const isUploadUrl = parsed.pathname.startsWith('/api/uploads/');
      if (isUploadUrl) {
        return BACKEND_URL
          ? `${BACKEND_URL}${parsed.pathname}${parsed.search}`
          : `${parsed.pathname}${parsed.search}`;
      }
    } catch (e) {
      return url;
    }
    return url;
  }
  if (url.startsWith('/api/')) return `${BACKEND_URL}${url}`;
  if (url.startsWith('api/uploads/')) return `${BACKEND_URL}/${url}`;
  if (url.startsWith('uploads/')) return `${BACKEND_URL}/api/${url}`;
  if (/^[^/?#]+\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(url)) {
    return `${BACKEND_URL}/api/uploads/${url}`;
  }
  return url;
};

const compressImageForUpload = (file) => {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') {
    return Promise.resolve(file);
  }

  const maxBytes = 2 * 1024 * 1024;
  const maxDimension = 1800;
  if (file.size <= maxBytes) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(file);
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const safeName = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve(new File([blob], safeName, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          0.82
        );
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};


// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/') && !config.url.startsWith('/api/')) {
    config.url = `/api${config.url}`;
  }

  const token = localStorage.getItem('propnest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration (401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthAttempt = error.config?.url?.startsWith('/api/auth/');
    const isSilentAuth = error.config?._silentAuth;
    if (error.response && error.response.status === 401 && isSilentAuth) {
      localStorage.removeItem('propnest_token');
      localStorage.removeItem('propnest_user');
    } else if (error.response && error.response.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('propnest_token');
      localStorage.removeItem('propnest_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendOTP: (phone, purpose = 'registration') =>
    apiClient.post('/api/auth/send-otp', { phone, purpose }),
  
  verifyOTP: (phone, otp, purpose = 'registration') =>
    apiClient.post('/api/auth/verify-otp', { phone, otp, purpose }),
  
  register: (userData) =>
    apiClient.post('/api/auth/register', userData),
  
  login: (email, password) =>
    apiClient.post('/api/auth/login', { email, password }),

  adminLogin: (email, password) =>
    apiClient.post('/api/auth/admin-login', { email, password }),

  forgotPassword: (email) =>
    apiClient.post('/api/auth/forgot-password', { email }),

  resetPassword: (token, password) =>
    apiClient.post('/api/auth/reset-password', { token, password }),
};

// Property API
export const propertyAPI = {
  searchProperties: (params) =>
    apiClient.get('/properties/search', { params }),
  
  getProperty: (propertyId) =>
    apiClient.get(`/properties/${propertyId}`),

  generateDescription: (data) =>
    apiClient.post('/properties/generate-description', data),
  
  generateTitle: (data) =>
    apiClient.post('/properties/generate-title', data),
  
  createProperty: (propertyData) =>
    apiClient.post('/properties/', propertyData),
  
  updateProperty: (propertyId, updates) =>
    apiClient.patch(`/properties/${propertyId}`, updates),

  deleteProperty: (propertyId, reason) =>
    apiClient.post(`/properties/${propertyId}/delete`, { reason }),
  
  getHostProperties: () =>
    apiClient.get('/properties/host/my-properties'),
  
  submitForVerification: (propertyId) =>
    apiClient.post(`/properties/${propertyId}/submit-verification`),

  getNearbyPlaces: (lat, lng) =>
    apiClient.get('/properties/nearby-places', { params: { latitude: lat, longitude: lng } }),

  expandUrl: (url) =>
    apiClient.get('/properties/expand-url', { params: { url } }),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: (params = {}) =>
    apiClient.get('/subscriptions/plans', { params: typeof params === 'string' ? { plan_type: params } : params }),

  createRegistrationFeeOrder: () =>
    apiClient.post('/subscriptions/registration-fee'),

  confirmRegistrationFee: (data) =>
    apiClient.post('/subscriptions/confirm-registration-fee', data),

  mockPayRegistrationFee: (orderId) =>
    apiClient.post('/subscriptions/registration-fee/mock-pay', null, {
      params: { razorpay_order_id: orderId },
    }),

  subscribe: (data) =>
    apiClient.post('/subscriptions/subscribe', data),

  confirmSubscription: (data) =>
    apiClient.post('/subscriptions/confirm-subscription', null, { params: data }),

  confirmSubscriptionUpi: (data) =>
    apiClient.post('/subscriptions/confirm-subscription-upi', data),

  mockPaySubscription: (subscriptionId, orderId) =>
    apiClient.post('/subscriptions/subscribe/mock-pay', null, {
      params: { subscription_id: subscriptionId, razorpay_order_id: orderId },
    }),

  getUserSubscriptions: () =>
    apiClient.get('/subscriptions/my-subscriptions'),

  getPaymentConfig: () =>
    apiClient.get('/bookings/payment/config'),

  updatePaymentConfig: (data) =>
    apiClient.put('/bookings/admin/payment/config', data),

  // Admin
  createPlan: (planData) =>
    apiClient.post('/subscriptions/admin/plans', null, { params: planData }),

  updatePlan: (planId, planData) =>
    apiClient.put(`/subscriptions/admin/plans/${planId}`, null, { params: planData }),

  deletePlan: (planId) =>
    apiClient.delete(`/subscriptions/admin/plans/${planId}`),

  getAdminPlans: () =>
    apiClient.get('/subscriptions/admin/plans'),

  togglePlanStatus: (planId) =>
    apiClient.patch(`/subscriptions/admin/plans/${planId}/toggle`),
};

// Upload API
export const uploadAPI = {
  uploadImage: async (file) => {
    const uploadFile = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await apiClient.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...res.data,
      url: getImageUrl(res.data.url),
    };
  },
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...res.data,
      url: getImageUrl(res.data.url),
    };
  },
  uploadVideo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...res.data,
      url: getImageUrl(res.data.url),
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

  applyCoupon: (bookingId, couponCode) =>
    apiClient.post(`/bookings/${bookingId}/apply-coupon`, { coupon_code: couponCode }),

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

  adminGetBookings: (params = {}) =>
    apiClient.get('/admin/bookings', { params }),
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

  getICalFeedUrl: (propertyId) =>
    apiClient.get(`/calendar/properties/${propertyId}/ical-feed-url`),

  rotateICalFeedUrl: (propertyId) =>
    apiClient.post(`/calendar/properties/${propertyId}/ical-feed-url/rotate`),

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

  listReviewHistory: () => apiClient.get('/employee/verifications/history'),

  getVerificationDetails: (verificationId) =>
    apiClient.get(`/employee/verifications/${verificationId}`),

  rmApprove: (verificationId, remarks = '') =>
    apiClient.post(`/employee/verifications/${verificationId}/approve`, { remarks }),

  rmReject: (verificationId, reason) =>
    apiClient.post(`/employee/verifications/${verificationId}/reject`, { reason }),

  exportVerificationReport: (verificationId) =>
    apiClient.get(`/employee/verifications/${verificationId}/export-report`, {
      responseType: 'blob'
    }),

  // Admin (final approval)
  listAwaitingFinalApproval: () =>
    apiClient.get('/admin/properties/awaiting-final-approval'),

  listPendingForAdmin: () => apiClient.get('/admin/properties/pending-verification'),

  adminApprove: (propertyId, payload) =>
    apiClient.post(`/admin/properties/${propertyId}/approve`, payload),

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
  shareInvoice: (transactionId, channel) =>
    apiClient.post(`/admin/account/transactions/${transactionId}/share-invoice`, { channel }),
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
  submitHostVerification: (payload) =>
    apiClient.post('/host/submit-verification', payload),
  saveDraftDocument: (payload) =>
    apiClient.patch('/host/kyc/documents/draft', payload),
  deleteRejectedDraftDocument: (documentType) =>
    apiClient.delete(`/host/kyc/documents/draft/${documentType}`),
  saveDraftAgreement: (payload) =>
    apiClient.patch('/host/kyc/agreement/draft', payload),
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

// CMS API
export const cmsAPI = {
  getLandingPage: () => apiClient.get('/cms/landing-page'),
  getSupportPage: () => apiClient.get('/cms/support-page'),
  submitContactForm: (payload) => apiClient.post('/cms/contact', payload),
  getAdminContent: (page) => apiClient.get('/cms/admin/content', { params: page ? { page } : {} }),
  updateContent: (contentId, payload) => apiClient.patch(`/cms/admin/content/${contentId}`, payload),
  createContent: (payload) => apiClient.post('/cms/admin/content', payload?.content_data || {}, {
    params: {
      page: payload?.page,
      section: payload?.section,
      content_type: payload?.content_type,
    },
  }),
  deleteContent: (contentId) => apiClient.delete(`/cms/admin/content/${contentId}`),
  getContactMessages: (params) => apiClient.get('/cms/admin/contact-messages', { params }),
  updateContactMessage: (id, payload) => apiClient.patch(`/cms/admin/contact-messages/${id}`, payload),
};

// Coupon API
export const couponAPI = {
  createCoupon: (data) => apiClient.post('/coupons/', data),
  listCoupons: () => apiClient.get('/coupons/'),
  getPropertyCoupons: (propertyId) => apiClient.get(`/coupons/property/${propertyId}`),
  getSubscriptionCoupons: (params = {}) => apiClient.get('/coupons/subscription', { params }),
  toggleCouponStatus: (couponId) => apiClient.patch(`/coupons/admin/${couponId}/toggle`),
  deleteCoupon: (couponId) => apiClient.delete(`/coupons/admin/${couponId}`),
};

// Admin API
export const adminAPI = {
  getSearchLogs: (params) => apiClient.get('/admin/search-logs', { params }),
  getDeletedProperties: (params = {}) =>
    apiClient.get('/admin/properties/deleted', { params }),
  permanentlyDeleteProperty: (propertyId, confirmation) =>
    apiClient.post(`/admin/properties/deleted/${propertyId}/permanent-delete`, { confirmation }),
  downloadUsersCsv: async (params = {}) => {
    const res = await apiClient.get('/admin/users/export-csv', {
      params,
      responseType: 'blob',
    });
    return res;
  },
};

// AI Voice Calling Agent API
export const aiCallAPI = {
  getMyCalls: () => apiClient.get('/ai-calls/my-calls'),
  getAllCalls: () => apiClient.get('/ai-calls/all-calls'),
  getAgents: () => apiClient.get('/ai-calls/agents'),
  createAgent: (data) => apiClient.post('/ai-calls/agents', data),
  activateAgent: (agentId) => apiClient.patch(`/ai-calls/agents/${agentId}/active`),
  deleteAgent: (agentId) => apiClient.delete(`/ai-calls/agents/${agentId}`),
};

export default apiClient;
