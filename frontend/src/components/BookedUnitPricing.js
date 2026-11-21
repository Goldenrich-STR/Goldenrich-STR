import React from 'react';
import { getBookedUnitPriceRows, getBookingTotalRows } from '../utils/bookedUnitPricing';

export default function BookedUnitPricing({ booking, category, showTotals = false }) {
  const rows = getBookedUnitPriceRows(booking, category);
  if (!rows.length && (!showTotals || (!booking.unit_name && !booking.unit_id))) return null;

  return (
    <dl className="space-y-2 rounded-xl border border-gray-100 bg-white p-4 text-sm">
      {(showTotals ? [...rows, ...getBookingTotalRows(booking)] : rows).map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-charcoal-muted">{label}</dt>
          <dd className="text-right font-semibold text-charcoal">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
