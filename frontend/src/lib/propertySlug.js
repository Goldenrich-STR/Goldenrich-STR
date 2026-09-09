/**
 * Utility functions for human-readable property URL slugs.
 * Ensures readable property URLs while retaining full compatibility
 * with raw property IDs and database records.
 */

/**
 * Creates a clean, safe, human-readable slug for a property.
 * Example: "Pune Rooftop Lounge Venue" + "prop_demo_30_1784762653"
 * -> "pune-rooftop-lounge-venue-prop_demo_30_1784762653"
 */
export const getPropertySlug = (property) => {
  if (!property) return '';
  if (typeof property === 'string') return property;
  
  const propId = property.property_id || property.id || '';
  const title = property.title || property.name || property.property_title || '';
  
  if (!title) return propId;

  const titleSlug = String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!titleSlug) return propId;
  if (!propId) return titleSlug;
  
  if (titleSlug.endsWith(propId.toLowerCase())) {
    return titleSlug;
  }

  return `${titleSlug}-${propId}`;
};

/**
 * Extracts the authoritative property ID from a URL parameter/slug or raw ID.
 * Examples:
 * - "prop_demo_30_1784762653" -> "prop_demo_30_1784762653"
 * - "pune-rooftop-lounge-venue-prop_demo_30_1784762653" -> "prop_demo_30_1784762653"
 * - "luxury-villa-12345" -> "12345"
 */
export const extractPropertyId = (param) => {
  if (!param || typeof param !== 'string') return '';
  let clean = param;
  try {
    clean = decodeURIComponent(param).trim();
  } catch (e) {
    clean = param.trim();
  }
  if (!clean) return '';

  const propMatch = clean.match(/(prop_[a-zA-Z0-9_]+)$/i) || clean.match(/(prop_[a-zA-Z0-9_]+)/i);
  if (propMatch) {
    return propMatch[1];
  }

  const parts = clean.split('-');
  const lastPart = parts[parts.length - 1];
  if (parts.length > 1 && lastPart && /^[a-zA-Z0-9_]+$/.test(lastPart)) {
    return lastPart;
  }

  return clean;
};

/**
 * Constructs a readable property URL path.
 * Examples:
 * - getPropertyUrl(property) -> "/property/pune-rooftop-lounge-venue-prop_demo_30_1784762653"
 * - getPropertyUrl(property, "?checkIn=2026-10-01") -> "/property/pune-rooftop-lounge-venue-prop_demo_30_1784762653?checkIn=2026-10-01"
 */
export const getPropertyUrl = (property, searchParams = '') => {
  const slug = getPropertySlug(property);
  if (!slug) return '/guest/browse';
  
  let queryString = '';
  if (typeof searchParams === 'string' && searchParams.trim()) {
    queryString = searchParams.startsWith('?') ? searchParams : `?${searchParams}`;
  } else if (searchParams && typeof searchParams === 'object') {
    const params = new URLSearchParams(searchParams);
    const str = params.toString();
    if (str) queryString = `?${str}`;
  }

  return `/property/${slug}${queryString}`;
};
