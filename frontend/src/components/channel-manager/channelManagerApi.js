import { adminPhase1API } from '../../services/adminPhase1Api';
import { calendarAPI } from '../../services/api';

const unwrap = (response) => response?.data?.data || response?.data || {};

export const normalizeProperty = (property) => ({
  ...property,
  id: property.property_id || property.id,
  name: property.title || property.property_name || property.name || 'Untitled property',
  location: [property.city, property.state].filter(Boolean).join(', ') || property.location || '',
});

export const channelManagerApi = {
  async properties() {
    const properties = [];
    const limit = 500;
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;

    while (skip < total) {
      const response = await adminPhase1API.propertyOperations({ tab: 'all', limit, skip });
      const data = unwrap(response);
      const batch = data.properties || [];
      properties.push(...batch);
      const reportedTotal = Number(response.data?.meta?.total);
      total = Number.isFinite(reportedTotal)
        ? reportedTotal
        : (batch.length < limit ? properties.length : Number.POSITIVE_INFINITY);
      if (!batch.length || batch.length < limit) break;
      skip += batch.length;
    }

    return properties.map(normalizeProperty).filter((property) => property.id);
  },

  async reservations() {
    const response = await adminPhase1API.bookingOperations({ limit: 500 });
    return unwrap(response).bookings || [];
  },

  updateReservation(bookingId, bookingStatus) {
    return adminPhase1API.updateBookingOperationStatus(bookingId, {
      booking_status: bookingStatus,
      reason: `Channel Manager: ${bookingStatus}`,
    });
  },

  async blocks(propertyId, startDate, endDate) {
    const response = await calendarAPI.getBlockedDates(propertyId, {
      start_date: startDate,
      end_date: endDate,
    });
    return response.data?.blocked_dates || [];
  },

  block(propertyId, payload) {
    return calendarAPI.blockDates(propertyId, payload);
  },

  unblock(blockId) {
    return calendarAPI.unblockDates(blockId);
  },

  async integrations(propertyId) {
    const response = await calendarAPI.listExternalCalendars(propertyId);
    return response.data?.calendars || [];
  },

  async allIntegrations() {
    const response = await calendarAPI.listAllExternalCalendars();
    return response.data?.calendars || [];
  },

  addIntegration(propertyId, payload) {
    return calendarAPI.addExternalCalendar(propertyId, payload);
  },

  syncIntegration(calendarId) {
    return calendarAPI.syncExternalCalendar(calendarId);
  },

  removeIntegration(calendarId) {
    return calendarAPI.removeExternalCalendar(calendarId);
  },

  async exportFeed(propertyId) {
    const response = await calendarAPI.getICalFeedUrl(propertyId);
    return response.data?.feed_url || '';
  },
};
