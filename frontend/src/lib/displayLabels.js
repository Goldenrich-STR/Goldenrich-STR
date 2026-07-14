export const CATEGORY_LABELS = {
  residential: 'Residential',
  commercial: 'Commercial Property',
  commercial_property: 'Commercial Property',
  event_venue: 'Event Venue',
  short_term_rental: 'Short-Term Rental',
};

export const PROPERTY_TYPE_LABELS = {
  apartment: 'Apartment',
  villa: 'Villa',
  bungalow: 'Bungalow',
  farmhouse: 'Farmhouse',
  resort: 'Resort',
  studio: 'Studio',
  private_office: 'Private Office',
  coworking_space: 'Coworking Space',
  retail_shop: 'Retail Shop',
  warehouse: 'Warehouse',
  banquet_hall: 'Banquet Hall',
  lawn: 'Lawn',
  rooftop: 'Rooftop',
  party_hall: 'Party Hall',
  conference_hall: 'Conference Hall',
  short_term_rental: 'Short-Term Rental',
};

const titleCase = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

export const formatCategoryLabel = (value) => CATEGORY_LABELS[value] || titleCase(value);

export const formatPropertyTypeLabel = (value) => PROPERTY_TYPE_LABELS[value] || titleCase(value);

export const formatDisplayLabel = (value) => (
  CATEGORY_LABELS[value] || PROPERTY_TYPE_LABELS[value] || titleCase(value)
);

export const formatReadableText = (value) => (
  String(value || '').replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (match) =>
    formatDisplayLabel(match).toLowerCase()
  )
);
