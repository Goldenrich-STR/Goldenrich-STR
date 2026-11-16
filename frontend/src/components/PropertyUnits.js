import React from 'react';
import { BedDouble, Briefcase, PartyPopper } from 'lucide-react';

/**
 * Helpers + UI for properties that are split into bookable units
 * (for example the rooms of a hotel or the offices of a building).
 */

export const getUnitPrice = (unit) =>
  Math.round(Number(unit?.display_price_per_night ?? unit?.price_per_night ?? 0));

export const getPropertyUnits = (property) =>
  property?.has_units && Array.isArray(property.units)
    ? property.units.filter((unit) => unit && unit.name)
    : [];

const formatPrice = (value) => `₹${value.toLocaleString('en-IN')}`;

/** Compact capsules for property cards: "Room 101 · ₹3,500". */
export const UnitChips = ({ property, max = 3, className = '' }) => {
  const units = getPropertyUnits(property);
  if (!units.length) return null;
  const visible = units.slice(0, max);
  const extra = units.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Available units">
      {visible.map((unit) => {
        const price = getUnitPrice(unit);
        return (
          <span
            key={unit.unit_id || unit.name}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal"
          >
            <span className="truncate">{unit.name}</span>
            {price > 0 && <span className="font-bold text-charcoal">{formatPrice(price)}</span>}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-muted">
          +{extra} more
        </span>
      )}
    </div>
  );
};

/** Full-width unit list for the property detail page. */
export const UnitCards = ({ property, priceSuffix = '/ night', sizeLabel, selectedUnitId, onSelect, attention = false }) => {
  const units = getPropertyUnits(property);
  if (!units.length) return null;
  const UnitIcon = property.category === 'commercial' ? Briefcase : property.category === 'event_venue' ? PartyPopper : BedDouble;

  return (
    <section id="property-units" data-testid="property-units" className="scroll-mt-28">
      <h2 className="mb-4 font-serif-hero text-[26px] font-semibold text-charcoal">Available units</h2>
      {onSelect && (
        <p className="-mt-2 mb-3 text-xs font-medium text-charcoal-muted">Select a unit to see its availability and book it.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {units.map((unit) => {
          const price = getUnitPrice(unit);
          const isSelected = Boolean(selectedUnitId) && unit.unit_id === selectedUnitId;
          const details = [
            unit.area_sqft ? `${unit.area_sqft} sq.ft` : null,
            unit.max_guests ? `Up to ${unit.max_guests} ${property.category === 'commercial' ? 'staff' : 'guests'}` : null,
            sizeLabel ? sizeLabel(unit.bhk_type) : null,
          ].filter(Boolean);

          return (
            <button
              type="button"
              key={unit.unit_id || unit.name}
              onClick={() => onSelect && onSelect(unit)}
              aria-pressed={isSelected}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-[#fff0e6] via-[#fcf8f5] to-[#e4effb] px-4 py-4 text-left transition ${
                isSelected
                  ? 'border-charcoal ring-2 ring-charcoal/10'
                  : 'border-gray-300 hover:border-charcoal'
              } ${onSelect ? 'cursor-pointer' : 'cursor-default'} ${attention && !isSelected ? 'unit-attention' : ''}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-white/80 text-charcoal ${isSelected ? 'border-charcoal' : 'border-gray-300'}`}>
                <UnitIcon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-start gap-2 text-[15px] font-semibold leading-snug text-charcoal">
                  {isSelected && (
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-charcoal text-white" aria-label="Selected">
                      <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </span>
                  )}
                  <span className="min-w-0 break-words">{unit.name}</span>
                </p>
                {details.length > 0 && (
                  <p className="mt-1 text-xs font-medium text-charcoal-muted">{details.join(' · ')}</p>
                )}
              </div>
              {price > 0 && (
                <div className="shrink-0 text-right">
                  <span className="text-[18px] font-bold text-charcoal">{formatPrice(price)}</span>
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-muted">{priceSuffix}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
