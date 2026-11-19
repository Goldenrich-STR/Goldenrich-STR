const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export function getBookedUnitPriceRows(booking, category) {
  if (!booking.unit_id && !booking.unit_name) return [];

  const pricing = booking.pricing_breakdown || {};
  const amount = booking.charge_base_amount ?? pricing.charge_base_amount;
  const base = booking.base_amount ?? pricing.base_amount;
  const quantity = Number(booking.pricing_units ?? pricing.pricing_units ?? booking.duration_hours);
  const period = booking.duration_hours ? 'hour' : ['commercial', 'event_venue'].includes(category) ? 'day' : 'night';
  const unitSubtotal = amount ?? (category === 'event_venue' ? null : base);
  const subtotal = booking.subtotal_before_discount ?? pricing.subtotal_before_discount;
  const rows = [];

  if (unitSubtotal != null && quantity > 0) {
    rows.push(['Average unit rate', `${currency.format(unitSubtotal / quantity)} / ${period}`]);
    rows.push(['Billed duration', `${quantity} ${period}${quantity === 1 ? '' : 's'}`]);
  }
  if (unitSubtotal != null) rows.push(['Unit subtotal', currency.format(unitSubtotal)]);
  if (unitSubtotal != null && base != null && base > unitSubtotal) {
    rows.push(['Booking add-ons', currency.format(base - unitSubtotal)]);
  }
  let itemizedFees = 0;
  for (const charge of booking.charges ?? pricing.charges ?? []) {
    if (!charge.label || !(Number(charge.amount) > 0)) continue;
    rows.push([charge.label, currency.format(charge.amount)]);
    itemizedFees += Number(charge.amount);
  }
  const hostExtraGuestFee = Number(booking.host_extra_guest_fee ?? pricing.host_extra_guest_fee ?? 0);
  if (hostExtraGuestFee > 0) {
    rows.push(['Host extra guest fee', currency.format(hostExtraGuestFee)]);
    itemizedFees += hostExtraGuestFee;
  }
  if (subtotal != null && base != null && subtotal - base - itemizedFees >= 0.005) {
    rows.push(['Other booking fees', currency.format(subtotal - base - itemizedFees)]);
  }
  return rows;
}

export function getBookingTotalRows(booking) {
  const discount = booking.discount_amount;
  const paid = booking.paid_amount ?? booking.amount_paid;
  const balance = booking.payment_type === 'advance' && paid != null && booking.total_amount != null
    ? Math.max(0, booking.total_amount - paid)
    : null;
  return [
    ['Taxes', booking.taxes ?? booking.gst_amount],
    ['Discount', discount > 0 ? -discount : null],
    ['Booking total', booking.total_amount],
    ['Amount paid', paid],
    ['Balance due', balance > 0 ? balance : null],
  ].filter(([, value]) => value != null).map(([label, value]) => [label, currency.format(value)]);
}
