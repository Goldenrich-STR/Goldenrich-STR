const RECENTLY_VISITED_KEY = 'recently_visited_properties';
const MAX_RECENTLY_VISITED = 10;

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getRecentlyVisitedProperties = () => {
  if (!storageAvailable()) return [];
  try {
    const items = JSON.parse(window.localStorage.getItem(RECENTLY_VISITED_KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
};

export const saveRecentlyVisitedProperty = (property) => {
  if (!storageAvailable() || !property?.property_id) return [];

  const item = {
    property_id: property.property_id,
    title: property.title,
    city: property.city,
    state: property.state,
    images: property.images || [],
    img: property.img,
    rating: property.rating,
    max_guests: property.max_guests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    rooms: property.rooms,
    baths: property.baths,
    category: property.category,
    property_type: property.property_type,
    pricing_cycle: property.pricing_cycle,
    price_per_night: property.price_per_night,
    price: property.price,
    visited_at: new Date().toISOString(),
  };

  const next = [
    item,
    ...getRecentlyVisitedProperties().filter((existing) => existing.property_id !== item.property_id),
  ].slice(0, MAX_RECENTLY_VISITED);

  window.localStorage.setItem(RECENTLY_VISITED_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('recently-visited-properties-updated'));
  return next;
};

export const RECENTLY_VISITED_PROPERTIES_EVENT = 'recently-visited-properties-updated';
