// Preview dates follow checkout: event-venue end dates are inclusive.
export const previewQuoteDates = (checkIn, checkOut, category) => {
  if (category === 'event_venue') {
    return { checkIn: checkIn || null, checkOut: checkOut || checkIn || null };
  }
  if (checkIn && (!checkOut || checkOut <= checkIn)) {
    const next = new Date(`${checkIn}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { checkIn, checkOut: next.toISOString().slice(0, 10) };
  }
  return { checkIn: checkIn || null, checkOut: checkOut || null };
};

// final_nightly_price includes event food; it is not the venue-only headline.
export const eventVenuePricePerUnit = (quote, fallback, bookingDays = 1) => {
  if (!quote || quote.charge_base_amount === undefined || quote.charge_base_amount === null) return Number(fallback) || 0;
  const units = Math.max(1, Number(quote.pricing_units || bookingDays) || 1);
  const venueBase = Number(quote.charge_base_amount);
  if (!Number.isFinite(venueBase)) return Number(fallback) || 0;
  const charges = Array.isArray(quote.charges) ? quote.charges : null;
  if (!charges) return Number(fallback) || 0;
  const fees = charges.reduce((sum, charge) => {
    if (charge?.enabled === false) return sum;
    const value = Number(charge?.amount ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  return (venueBase + fees) / units;
};
