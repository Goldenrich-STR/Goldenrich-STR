/**
 * Mapping table of clean SEO-friendly property URLs to filter parameters.
 */
export const SEO_ROUTE_MAP = {
  '/property/villas': {
    category: 'residential',
    property_type: 'villa',
    title: 'Villas for Rent | X-Space360',
    description: 'Explore handpicked luxury villas for short and long-term stays.'
  },
  '/property/villas-in-nashik': {
    category: 'residential',
    property_type: 'villa',
    city: 'Nashik',
    title: 'Villas in Nashik | X-Space360',
    description: 'Find top-rated luxury villas and private stays in Nashik.'
  },
  '/property/villas-in-trimbakeshwar': {
    category: 'residential',
    property_type: 'villa',
    city: 'Trimbakeshwar',
    title: 'Villas in Trimbakeshwar | X-Space360',
    description: 'Serene villas and homestays near Trimbakeshwar temple.'
  },
  '/property/villas-in-igatpuri': {
    category: 'residential',
    property_type: 'villa',
    city: 'Igatpuri',
    title: 'Villas in Igatpuri | X-Space360',
    description: 'Scenic weekend villas amidst fog-capped mountains in Igatpuri.'
  },
  '/property/villas-in-bhnadardara': {
    category: 'residential',
    property_type: 'villa',
    city: 'Bhandardara',
    title: 'Villas in Bhandardara | X-Space360',
    description: 'Nature villas and lakeside stays in Bhandardara.'
  },
  '/property/laxury-villas-in-nashik': {
    category: 'residential',
    property_type: 'villa',
    city: 'Nashik',
    min_price: '50000',
    title: 'Luxury Villas in Nashik | X-Space360',
    description: 'Premium ultra-luxury villas and estates in Nashik.'
  },
  '/property/weekend-villas-in-igatpuri': {
    category: 'residential',
    property_type: 'villa',
    city: 'Igatpuri',
    title: 'Weekend Villas in Igatpuri | X-Space360',
    description: 'Perfect weekend escape villas in Igatpuri.'
  },
  '/property/scenic-villas-in-bhnadardara': {
    category: 'residential',
    property_type: 'villa',
    city: 'Bhandardara',
    title: 'Scenic Villas in Bhandardara | X-Space360',
    description: 'Breathtaking scenic villas in Bhandardara.'
  },
  '/property/residential': {
    category: 'residential',
    title: 'Residential Properties | X-Space360',
    description: 'Browse all residential homestays, apartments, and villas.'
  },
  '/property/residential/': {
    category: 'residential',
    title: 'Residential Properties | X-Space360',
    description: 'Browse all residential homestays, apartments, and villas.'
  },
  '/property/residential/homestay-in-nashik': {
    category: 'residential',
    city: 'Nashik',
    title: 'Homestays in Nashik | X-Space360',
    description: 'Comfortable homestays and family stays in Nashik.'
  },
  '/property/residential/apartment-in-nashik': {
    category: 'residential',
    property_type: 'apartment',
    city: 'Nashik',
    title: 'Apartments in Nashik | X-Space360',
    description: 'Furnished apartments for rent in Nashik.'
  },
  '/property/residential/farmhouse-in-nashik': {
    category: 'residential',
    property_type: 'farmhouse',
    city: 'Nashik',
    title: 'Farmhouses in Nashik | X-Space360',
    description: 'Spacious farmhouses with gardens and pools in Nashik.'
  },
  '/property/residential/holidayhomes-in-igatpuri': {
    category: 'residential',
    city: 'Igatpuri',
    title: 'Holiday Homes in Igatpuri | X-Space360',
    description: 'Unwind at top holiday homes and valley stays in Igatpuri.'
  },
  '/property/residential/homestay-in-igatpuri': {
    category: 'residential',
    city: 'Igatpuri',
    title: 'Homestays in Igatpuri | X-Space360',
    description: 'Local homestays in Igatpuri for family & friends.'
  },
  '/property/residential/familystay-in-trimbak': {
    category: 'residential',
    city: 'Trimbakeshwar',
    title: 'Family Stays in Trimbakeshwar | X-Space360',
    description: 'Peaceful family stays in Trimbakeshwar.'
  },
  '/property/residential/apartment-in-trimbak': {
    category: 'residential',
    property_type: 'apartment',
    city: 'Trimbakeshwar',
    title: 'Apartments in Trimbakeshwar | X-Space360',
    description: 'Modern apartments in Trimbakeshwar.'
  },
  '/property/residential/naturestay-in-bhandardara': {
    category: 'residential',
    city: 'Bhandardara',
    title: 'Nature Stays in Bhandardara | X-Space360',
    description: 'Immerse in nature stays around Bhandardara dam and lakes.'
  },
  '/property/residential/banglows': {
    category: 'residential',
    property_type: 'villa',
    title: 'Bungalows for Rent | X-Space360',
    description: 'Private independent bungalows and luxury holiday homes.'
  },
  '/property/residential/apartment': {
    category: 'residential',
    property_type: 'apartment',
    title: 'Apartments for Rent | X-Space360',
    description: 'Fully furnished service apartments.'
  },
  '/property/residential/studio': {
    category: 'residential',
    property_type: 'studio',
    title: 'Studio Apartments for Rent | X-Space360',
    description: 'Cozy studio spaces and private rooms.'
  },
  '/property/residential/privatehouse': {
    category: 'residential',
    property_type: 'independent_house',
    title: 'Private Independent Houses | X-Space360',
    description: 'Full independent homes for rent.'
  },
  '/property/residential/farmhouse': {
    category: 'residential',
    property_type: 'farmhouse',
    title: 'Farmhouses for Rent | X-Space360',
    description: 'Tranquil countryside farmhouses.'
  },
  '/property/event-venues': {
    category: 'event_venue',
    title: 'Event Venues & Banquet Halls | X-Space360',
    description: 'Book banquet halls, rooftops, and event venues across India.'
  },
  '/property/event-venues-in-nashik': {
    category: 'event_venue',
    city: 'Nashik',
    title: 'Event Venues in Nashik | X-Space360',
    description: 'Find banquet halls and event venues in Nashik.'
  },
  '/property/commercial-spaces': {
    category: 'commercial',
    title: 'Commercial Workspaces | X-Space360',
    description: 'Offices, co-working desks, and conference rooms for rent.'
  },
  '/property/commercial-spaces-in-nashik': {
    category: 'commercial',
    city: 'Nashik',
    title: 'Commercial Spaces in Nashik | X-Space360',
    description: 'Rent commercial offices and co-working desks in Nashik.'
  }
};

const CITY_NAME_MAP = {
  nashik: 'Nashik',
  mumbai: 'Mumbai',
  pune: 'Pune',
  lonavala: 'Lonavala',
  igatpuri: 'Igatpuri',
  trimbakeshwar: 'Trimbakeshwar',
  bhandardara: 'Bhandardara',
  bhnadardara: 'Bhandardara',
  trimbak: 'Trimbakeshwar',
  karjat: 'Karjat',
  mahabaleshwar: 'Mahabaleshwar',
  alibaug: 'Alibaug',
  goa: 'Goa',
  bangalore: 'Bangalore'
};

const capitalizeCity = (slug) => {
  if (!slug) return '';
  const lower = slug.toLowerCase();
  if (CITY_NAME_MAP[lower]) return CITY_NAME_MAP[lower];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Returns preset filter criteria if path matches a known clean SEO URL or dynamic SEO pattern.
 */
export const getSeoRoutePreset = (pathname) => {
  if (!pathname) return null;
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (SEO_ROUTE_MAP[pathname]) return SEO_ROUTE_MAP[pathname];
  if (SEO_ROUTE_MAP[normalized]) return SEO_ROUTE_MAP[normalized];

  // Dynamic pattern resolution
  if (normalized.startsWith('/property/')) {
    const slug = normalized.replace('/property/', '').toLowerCase();

    // Event Venues pattern: /property/event-venues-in-cityname
    const eventMatch = slug.match(/^event-venues-in-([a-z0-9-]+)$/i);
    if (eventMatch) {
      const city = capitalizeCity(eventMatch[1]);
      return {
        category: 'event_venue',
        city,
        title: `Event Venues in ${city} | X-Space360`,
        description: `Book banquet halls, rooftops, and event venues in ${city}.`
      };
    }

    // Commercial pattern: /property/commercial-spaces-in-cityname
    const commMatch = slug.match(/^commercial-spaces-in-([a-z0-9-]+)$/i);
    if (commMatch) {
      const city = capitalizeCity(commMatch[1]);
      return {
        category: 'commercial',
        city,
        title: `Commercial Spaces in ${city} | X-Space360`,
        description: `Rent offices, co-working desks, and conference rooms in ${city}.`
      };
    }

    // Villas pattern: /property/villas-in-cityname
    const villaMatch = slug.match(/^villas-in-([a-z0-9-]+)$/i);
    if (villaMatch) {
      const city = capitalizeCity(villaMatch[1]);
      return {
        category: 'residential',
        property_type: 'villa',
        city,
        title: `Villas in ${city} | X-Space360`,
        description: `Find top-rated luxury villas and private stays in ${city}.`
      };
    }

    // Homestay pattern: /property/residential/homestay-in-cityname
    const homestayMatch = slug.match(/^(?:residential\/)?([a-z0-9-]+)-in-([a-z0-9-]+)$/i);
    if (homestayMatch) {
      const typePart = homestayMatch[1];
      const city = capitalizeCity(homestayMatch[2]);
      let property_type = '';
      if (typePart.includes('apartment')) property_type = 'apartment';
      else if (typePart.includes('farmhouse')) property_type = 'farmhouse';
      else if (typePart.includes('villa')) property_type = 'villa';

      return {
        category: 'residential',
        property_type,
        city,
        search: city,
        title: `Stays in ${city} | X-Space360`,
        description: `Comfortable homestays and family stays near ${city}.`
      };
    }

    // Generic category in city pattern: /property/:cat-in-:city
    const genericMatch = slug.match(/^([a-z0-9-]+)-in-([a-z0-9-]+)$/i);
    if (genericMatch) {
      const catPart = genericMatch[1];
      const city = capitalizeCity(genericMatch[2]);
      let category = 'residential';
      let property_type = '';

      if (catPart.includes('event') || catPart.includes('venue') || catPart.includes('banquet')) {
        category = 'event_venue';
      } else if (catPart.includes('commercial') || catPart.includes('office') || catPart.includes('work')) {
        category = 'commercial';
      } else if (catPart.includes('apartment')) {
        category = 'residential';
        property_type = 'apartment';
      } else if (catPart.includes('farmhouse')) {
        category = 'residential';
        property_type = 'farmhouse';
      } else if (catPart.includes('villa')) {
        category = 'residential';
        property_type = 'villa';
      }

      return {
        category,
        property_type,
        city,
        search: city,
        title: `Spaces in ${city} | X-Space360`,
        description: `Explore curated spaces in ${city}.`
      };
    }
  }

  return null;
};

/**
 * Returns clean SEO URL for a given filter object.
 */
export const getSeoUrlForFilters = (filters = {}) => {
  const category = (filters.category || '').toLowerCase();
  const city = (filters.city || '').trim();
  const propType = (filters.property_type || '').toLowerCase();
  const minPrice = String(filters.min_price || '');

  // 1. Check exact map
  for (const [route, preset] of Object.entries(SEO_ROUTE_MAP)) {
    if (
      (preset.category || '') === category &&
      (preset.property_type || '') === propType &&
      (preset.city || '').toLowerCase() === city.toLowerCase() &&
      String(preset.min_price || '') === minPrice
    ) {
      return route;
    }
  }

  const citySlug = city ? city.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';

  // 2. Dynamic Clean URLs
  if (category === 'event_venue') {
    return citySlug ? `/property/event-venues-in-${citySlug}` : `/property/event-venues`;
  }

  if (category === 'commercial') {
    return citySlug ? `/property/commercial-spaces-in-${citySlug}` : `/property/commercial-spaces`;
  }

  if (category === 'residential') {
    if (propType === 'villa') return citySlug ? `/property/villas-in-${citySlug}` : `/property/villas`;
    if (propType === 'apartment') return citySlug ? `/property/residential/apartment-in-${citySlug}` : `/property/residential/apartment`;
    if (propType === 'farmhouse') return citySlug ? `/property/residential/farmhouse-in-${citySlug}` : `/property/residential/farmhouse`;
    if (citySlug) return `/property/residential/homestay-in-${citySlug}`;
    return `/property/residential`;
  }

  if (citySlug) {
    if (propType === 'villa') return `/property/villas-in-${citySlug}`;
    return `/property/residential/homestay-in-${citySlug}`;
  }

  return '/guest/browse';
};
