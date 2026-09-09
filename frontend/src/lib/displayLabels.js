import {
  Wifi,
  Wind,
  Car,
  Utensils,
  Waves,
  Dumbbell,
  Tv,
  WashingMachine,
  Flame,
  Coffee,
  Printer,
  Bath,
  Monitor,
  Presentation,
  BatteryCharging,
  Mic2,
  Building2,
  Home,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

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
  independent_house: 'Private House',
  private_office: 'Private Office',
  co_working: 'Co-working Desk',
  coworking_space: 'Coworking Space',
  retail_shop: 'Retail Shop',
  warehouse: 'Warehouse',
  banquet_hall: 'Banquet Hall',
  lawn: 'Lawn',
  rooftop: 'Rooftop',
  party_hall: 'Party Hall',
  conference_hall: 'Conference Hall',
  conference_room: 'Conference Room',
  wedding_venue: 'Wedding Venue',
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

export const AMENITY_DISPLAY_LABELS = {
  wifi: 'WiFi',
  ac: 'Air Conditioning',
  parking: 'Parking Space',
  kitchen: 'Fully-Equipped Kitchen',
  pool: 'Swimming Pool',
  gym: 'Fitness Center/Gym',
  tv: 'Smart TV',
  washer: 'Washing Machine',
  heating: 'Heating System',
  fireplace: 'Indoor Fireplace',
  printer: 'High-speed Printer & Scanner',
  coffee: 'Coffee & Tea Station',
  restrooms: 'Executive Restrooms',
  workspace: 'Dedicated Workstations',
  projector: 'HD Projector & Screen',
  whiteboard: 'Collaboration Whiteboards',
  power_backup: '24/7 Power Generator Backup',
  av_system: 'Sound & AV System',
  stage: 'Performance Stage / Podium',
  catering: 'Catering Prep Kitchen',
  bar: 'Premium Bar Lounge Setup',
  rooftop: 'Scenic Rooftop Access',
  changing_rooms: 'VIP/Green Changing Rooms',
  security: 'Professional Event Security',
  live_music: 'Live Music Setup',
  food_court: 'Food Court / Dining Area',
  birthday_celebration: 'Birthday & Event Setup',
  indoor_games: 'Indoor Games',
};

export const AMENITY_ICONS = {
  wifi: Wifi,
  ac: Wind,
  parking: Car,
  kitchen: Utensils,
  pool: Waves,
  gym: Dumbbell,
  tv: Tv,
  washer: WashingMachine,
  heating: Flame,
  fireplace: Flame,
  coffee: Coffee,
  printer: Printer,
  restrooms: Bath,
  workspace: Monitor,
  projector: Presentation,
  whiteboard: Presentation,
  power_backup: BatteryCharging,
  av_system: Mic2,
  stage: Mic2,
  catering: Utensils,
  bar: Coffee,
  rooftop: Building2,
  changing_rooms: Home,
  security: ShieldCheck,
  live_music: Mic2,
  food_court: Utensils,
  birthday_celebration: Sparkles,
  indoor_games: Sparkles,
};

const slugifyAmenity = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const getAmenityIcon = (value, label = '') => {
  const key = value || slugifyAmenity(label);
  if (AMENITY_ICONS[key]) return AMENITY_ICONS[key];
  const text = `${key} ${label}`.toLowerCase();
  if (text.includes('wifi') || text.includes('internet')) return Wifi;
  if (text.includes('park')) return Car;
  if (text.includes('kitchen') || text.includes('cook') || text.includes('cater') || text.includes('food')) return Utensils;
  if (text.includes('pool') || text.includes('swim')) return Waves;
  if (text.includes('gym') || text.includes('fitness')) return Dumbbell;
  if (text.includes('tv')) return Tv;
  if (text.includes('wash')) return WashingMachine;
  if (text.includes('coffee') || text.includes('tea') || text.includes('bar')) return Coffee;
  if (text.includes('print')) return Printer;
  if (text.includes('projector') || text.includes('board')) return Presentation;
  if (text.includes('power') || text.includes('backup') || text.includes('charge')) return BatteryCharging;
  if (text.includes('music') || text.includes('sound') || text.includes('av') || text.includes('stage') || text.includes('mic')) return Mic2;
  if (text.includes('roof')) return Building2;
  if (text.includes('secur')) return ShieldCheck;
  if (text.includes('bath') || text.includes('restroom')) return Bath;
  if (text.includes('work') || text.includes('desk')) return Monitor;
  if (text.includes('heat') || text.includes('fire')) return Flame;
  if (text.includes('ac') || text.includes('air')) return Wind;
  return CheckCircle2;
};

export const formatAmenityLabel = (value) => AMENITY_DISPLAY_LABELS[value] || titleCase(value);

export const formatPropertyDescription = (description, propertyOrLocation) => {
  let desc = String(description || '');
  let locationName = '';
  if (typeof propertyOrLocation === 'string') {
    locationName = propertyOrLocation;
  } else if (propertyOrLocation && typeof propertyOrLocation === 'object') {
    locationName = propertyOrLocation.city || propertyOrLocation.state || propertyOrLocation.address || '';
  }
  if (locationName) {
    desc = desc.replace(/\bour location\b/gi, locationName);
  }
  return formatReadableText(desc);
};

/**
 * Clean and format a customer-facing address display.
 * Removes double commas, extra spaces, trailing/leading commas, and avoids repeated city/state names.
 */
export const formatAddress = (addressOrProp, city = '', state = '', pinCode = '') => {
  let address = '';
  let c = city;
  let s = state;
  let pin = pinCode;

  if (addressOrProp && typeof addressOrProp === 'object') {
    address = addressOrProp.address || '';
    c = addressOrProp.city || city;
    s = addressOrProp.state || state;
    pin = addressOrProp.pin_code || addressOrProp.pinCode || pinCode;
  } else {
    address = addressOrProp || '';
  }

  const cleanSegment = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/[,;]+/g, ',')           // collapse consecutive commas/semicolons
      .replace(/\s*,\s*/g, ', ')        // normalize space around commas
      .replace(/\s+/g, ' ')             // collapse multiple spaces
      .replace(/^[\s,]+|[\s,]+$/g, ''); // trim leading & trailing commas/whitespace
  };

  let rawAddr = cleanSegment(String(address || ''));
  let rawCity = cleanSegment(String(c || ''));
  let rawState = cleanSegment(String(s || ''));
  let rawPin = cleanSegment(String(pin || ''));

  if (!rawAddr && !rawCity && !rawState && !rawPin) {
    return '';
  }

  // Split address into comma segments
  let parts = rawAddr ? rawAddr.split(',').map((p) => p.trim()).filter(Boolean) : [];

  // Add city if not already included in parts
  if (rawCity) {
    const hasCity = parts.some((p) => p.toLowerCase() === rawCity.toLowerCase());
    if (!hasCity) {
      parts.push(rawCity);
    }
  }

  // Add state if not already included in parts
  if (rawState) {
    const hasState = parts.some((p) => p.toLowerCase() === rawState.toLowerCase());
    if (!hasState) {
      parts.push(rawState);
    }
  }

  // Deduplicate consecutive identical parts
  const deduped = [];
  parts.forEach((p) => {
    const last = deduped[deduped.length - 1];
    if (!last || last.toLowerCase() !== p.toLowerCase()) {
      deduped.push(p);
    }
  });

  let formatted = deduped.join(', ');

  // Append pin code if provided and not already present
  if (rawPin && !formatted.includes(rawPin)) {
    formatted = `${formatted} ${rawPin}`;
  }

  return cleanSegment(formatted);
};


