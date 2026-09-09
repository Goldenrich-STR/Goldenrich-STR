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
    const direct = [];
    const external = [];
    const limit = 500;
    let directSkip = 0;
    let externalSkip = 0;
    let directTotal = Number.POSITIVE_INFINITY;
    let externalTotal = Number.POSITIVE_INFINITY;

    while (directSkip < directTotal) {
      const response = await adminPhase1API.bookingOperations({ limit, skip: directSkip });
      const batch = unwrap(response).bookings || [];
      direct.push(...batch);
      directTotal = Number(response.data?.meta?.total ?? direct.length);
      if (!batch.length || batch.length < limit) break;
      directSkip += batch.length;
    }
    while (externalSkip < externalTotal) {
      const response = await calendarAPI.listExternalReservations({ limit, skip: externalSkip });
      const batch = response.data?.reservations || [];
      external.push(...batch);
      externalTotal = Number(response.data?.total ?? external.length);
      if (!batch.length || batch.length < limit) break;
      externalSkip += batch.length;
    }
    return [...external, ...direct];
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
    const integrations = [];
    const limit = 500;
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;
    while (skip < total) {
      const response = await calendarAPI.listAllExternalCalendars({ limit, skip });
      const batch = response.data?.calendars || [];
      integrations.push(...batch);
      total = Number(response.data?.total ?? integrations.length);
      if (!batch.length || batch.length < limit) break;
      skip += batch.length;
    }
    return integrations;
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

  async exportFeeds(propertyIds) {
    const response = await calendarAPI.getICalFeedUrls(propertyIds);
    return response.data || { feed_urls: {}, unavailable_property_ids: propertyIds };
  },
};
