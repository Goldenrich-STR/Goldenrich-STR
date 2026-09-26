import apiClient from '../../services/api';

export const priceEngineApi = {
  properties: () => apiClient.get('/v1/price-engine/properties').then((response) => response.data || []),
  rules: (propertyId) => apiClient.get('/v1/price-engine/rules', { params: propertyId ? { property_id: propertyId } : {} }).then((response) => response.data || []),
  history: () => apiClient.get('/v1/price-engine/history').then((response) => response.data || []),
  calendar: (propertyId, month) => apiClient.get(`/v1/price-engine/calendar/${propertyId}`, { params: { month } }).then((response) => response.data),
  createRule: (payload) => apiClient.post('/v1/price-engine/rules', payload),
  updateRule: (ruleId, payload) => apiClient.patch(`/v1/price-engine/rules/${ruleId}`, payload),
  deleteRule: (ruleId) => apiClient.delete(`/v1/price-engine/rules/${ruleId}`),
  bulkUpdate: (payload) => apiClient.post('/v1/price-engine/bulk-update', payload),
  reset: (propertyIds) => apiClient.post('/v1/price-engine/reset', propertyIds),
};
