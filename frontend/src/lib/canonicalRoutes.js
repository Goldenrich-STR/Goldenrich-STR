// Approved canonical paths from the SEO team spreadsheet (58 pages).
// Keep the trailing slash only where it was explicitly approved.
export const APPROVED_CANONICAL_PATHS = [
  '/',
  '/guest/browse',
  '/list-your-property',
  '/property/residential-stay',
  '/property/villas',
  '/property/residential-bungalows',
  '/property/residential/apartment',
  '/property/residential/studio',
  '/property/residential/private-house',
  '/property/residential/farmhouse',
  '/property/workspaces',
  '/property/private-offices',
  '/property/coworking-desk',
  '/property/meeting-rooms',
  '/property/conference-rooms',
  '/property/event-venues',
  '/property/banquet-halls',
  '/property/hotel-ballrooms',
  '/property/wedding-venues',
  '/property/villas-in-nashik',
  '/property/luxury-villas-in-nashik',
  '/property/residential/homestay-in-nashik',
  '/property/residential/apartment-in-nashik',
  '/property/residential/farmhouse-in-nashik',
  '/event-venues/wedding-venues-in-nashik',
  '/event-venues/banquet-halls-in-nashik',
  '/event-venues/event-lawns-in-nashik',
  '/event-venues/corporate-event-venues-in-nashik',
  '/property/workspaces-in-nashik',
  '/property/private-offices-in-nashik',
  '/property/team-spaces-in-nashik',
  '/property/premium-offices-in-nashik',
  '/property/meeting-rooms-in-nashik',
  '/property/villas-in-trimbakeshwar',
  '/property/pool-villas-in-trimbakeshwar',
  '/property/residential/family-stay-in-trimbak',
  '/property/residential/apartment-in-trimbak',
  '/event-venues/resorts-and-lawns-in-trimbakeshwar',
  '/property/office-suites-in-trimbakeshwar',
  '/property/villas-in-igatpuri',
  '/property/weekend-villas-in-igatpuri',
  '/property/residential/homestay-in-igatpuri',
  '/property/residential/holiday-homes-in-igatpuri',
  '/event-venues/celebration-venues-in-igatpuri',
  '/event-venues/wedding-venues-in-igatpuri',
  '/property/corporate-space-in-igatpuri',
  '/property/villas-in-bhandardara',
  '/property/scenic-villas-in-bhandardara',
  '/property/residential/nature-stay-in-bhandardara',
  '/event-venues/resorts-in-bhandardara',
  '/places/sula-vineyards/',
  '/places/trimbakeshwar-temple/',
  '/places/pandav-leni/',
  '/places/gangapur-dam/',
  '/places/anjaneri/',
  '/places/harihar-fort/',
  '/places/bhandardara/',
  '/places/igatpuri/',
];

const normalizePath = (value) => {
  const pathname = String(value || '/').replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0] || '/';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
};

const CANONICAL_BY_NORMALIZED_PATH = new Map(
  APPROVED_CANONICAL_PATHS.map((path) => [normalizePath(path), path])
);

const LEGACY_PATHS = {
  '/property/residential/bungalows': '/property/residential-bungalows',
  '/property/hotel-ball-rooms': '/property/hotel-ballrooms',
};

export const getApprovedCanonicalPath = (path) => {
  const normalizedPath = normalizePath(path);
  return LEGACY_PATHS[normalizedPath] || CANONICAL_BY_NORMALIZED_PATH.get(normalizedPath) || null;
};
