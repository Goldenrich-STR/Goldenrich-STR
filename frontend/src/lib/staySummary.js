/**
 * "Explore Your Stay": a plain-language summary of a property, written from the
 * details the host entered (nothing is invented). Used under the FAQs on the
 * property page; the Flutter app builds the same sections from the same fields.
 * Returns { intro, sections: [{ title, lines: [] }] }.
 */
const clean = (value) => String(value ?? '').trim();

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const timeLabel = (value) => {
  const raw = clean(value);
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  let hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${match[2]} ${suffix}`;
};

export const buildStaySummary = (property, { amenityLabel = (a) => a, typeLabel = '' } = {}) => {
  if (!property) return { intro: '', sections: [] };
  const title = clean(property.title || property.name) || 'This property';
  const city = clean(property.city);
  const state = clean(property.state);
  const place = [city, state].filter(Boolean).join(', ');
  const guests = Number(property.max_guests || property.maxGuests || 0);
  const isCommercial = property.category === 'commercial';
  const isEvent = property.category === 'event_venue';
  const who = isCommercial ? 'staff' : 'guests';
  const rooms = Number(property.bedrooms || property.rooms || 0);
  const baths = Number(property.bathrooms || property.baths || 0);
  const area = Number(property.area_sqft || 0);
  const amenities = (property.amenities || []).map((a) => amenityLabel(a)).filter(Boolean);

  const introParts = [`${title} is ${typeLabel ? `a ${typeLabel.toLowerCase()}` : 'a property'}${place ? ` in ${place}` : ''}`];
  if (guests > 0) introParts.push(`hosting up to ${guests} ${who}`);
  if (area > 0) introParts.push(`across ${area} sq.ft`);
  const intro = `${introParts.join(', ')}.`;

  const sections = [];

  const space = [];
  if (rooms > 0) space.push(`${plural(rooms, 'room', 'rooms')}${clean(property.bhk_type) ? ` (${clean(property.bhk_type)})` : ''}.`);
  if (baths > 0) space.push(`${plural(baths, 'bathroom', 'bathrooms')}.`);
  if (guests > 0) space.push(`Comfortably sleeps up to ${guests} ${who}.`);
  if (area > 0) space.push(`Built-up area of ${area} sq.ft.`);
  if (space.length) sections.push({ title: isEvent ? 'The venue' : 'The space', lines: space });

  if (amenities.length) sections.push({ title: 'Amenities and facilities', lines: amenities });

  const food = [];
  if (property.has_cook) food.push(`A personal cook is available for home-cooked meals${Number(property.cook_price) > 0 ? ` (₹${Number(property.cook_price).toLocaleString('en-IN')} per day)` : ''}.`);
  if (property.has_self_cook) food.push('Guests can use the kitchen to prepare their own meals, free of charge.');
  if (Number(property.veg_price) > 0) food.push(`Veg plates from ₹${Number(property.veg_price).toLocaleString('en-IN')} per plate.`);
  if (Number(property.non_veg_price) > 0) food.push(`Non-veg plates from ₹${Number(property.non_veg_price).toLocaleString('en-IN')} per plate.`);
  if (food.length) sections.push({ title: 'Food', lines: food });

  const stay = [];
  const checkIn = timeLabel(property.check_in_time);
  const checkOut = timeLabel(property.check_out_time);
  if (checkIn) stay.push(`Check-in from ${checkIn}.`);
  if (checkOut) stay.push(`Check-out by ${checkOut}.`);
  const minStay = Number(property.minimum_stay_days || property.min_stay_days || 0);
  if (minStay > 1) stay.push(`Minimum stay: ${minStay} nights.`);
  stay.push(property.pet_friendly ? 'Pets are welcome.' : 'This is not a pet-friendly property.');
  stay.push(property.instant_booking
    ? 'Instant booking: your stay is confirmed as soon as you pay.'
    : "Booking needs the host's approval; you pay only after they accept.");
  sections.push({ title: 'Stay details', lines: stay });

  const rawRules = clean(property.house_rules);
  if (!isEvent && rawRules && !rawRules.startsWith('{')) {
    const lines = rawRules.split('\n').map((l) => l.replace(/^[-•\s]+/, '').trim()).filter(Boolean);
    if (lines.length) sections.push({ title: 'House rules', lines });
  }

  sections.push({
    title: 'Cancellation and refunds',
    lines: [
      '100% refund if you cancel 7 or more days before check-in.',
      '50% refund if you cancel 3 to 6 days before check-in.',
      'No refund if you cancel within 3 days of check-in.',
    ],
  });

  const nearby = (property.nearby_places || []).map(clean).filter(Boolean);
  if (nearby.length) sections.push({ title: 'Nearby', lines: nearby });

  return { intro, sections };
};
