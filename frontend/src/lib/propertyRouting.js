const PROPERTY_ID_PATTERN = /^prop_[a-z0-9]+$/i;

export const slugifyPropertySegment = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const getPropertySlug = (property) => {
  const explicitSlug = property?.slug || property?.property_slug;
  const propertyId = String(property?.property_id || '').trim();

  if (explicitSlug && !PROPERTY_ID_PATTERN.test(explicitSlug)) {
    return explicitSlug;
  }

  if (!propertyId) {
    return explicitSlug || '';
  }

  const title = slugifyPropertySegment(property?.title || property?.name);
  const city = slugifyPropertySegment(property?.city);
  const readablePrefix = [title, city].filter(Boolean).join('-');

  if (!readablePrefix) {
    return propertyId;
  }

  return `${readablePrefix}--${propertyId}`;
};

export const getPropertyPath = (property) => `/property/${getPropertySlug(property)}`;

export const getPropertyIdFromRouteParam = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (PROPERTY_ID_PATTERN.test(raw)) return raw;

  const suffixMatch = raw.match(/--(prop_[a-z0-9]+)$/i);
  if (suffixMatch) {
    return suffixMatch[1];
  }

  return '';
};
