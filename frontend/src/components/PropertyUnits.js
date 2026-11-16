import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, BedDouble, Briefcase, PartyPopper, X } from 'lucide-react';

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

export const UNIT_TIER_LABELS = { standard: 'Standard', deluxe: 'Deluxe', premium: 'Premium' };
const TIER_RIBBON = {
  standard: { bar: 'from-[#9aa7b4] to-[#6b7a89]', fold: 'bg-[#3f4b57]' },
  deluxe: { bar: 'from-[#5aa9f5] to-[#2f6fd0]', fold: 'bg-[#1c4a94]' },
  premium: { bar: 'from-[#a78bfa] to-[#7c3aed]', fold: 'bg-[#4c1d95]' },
};

/** Tier ribbon in the same shape as the property-type ribbon, one colour per tier. */
export const TierBadge = ({ tier, price }) => {
  const look = TIER_RIBBON[tier];
  if (!look) return null;
  return (
    <div className="relative inline-block">
      <div className={`flex w-max items-center gap-1 rounded-r-full bg-gradient-to-b ${look.bar} py-[3px] pl-2 pr-2 text-[9px] font-bold leading-none text-white shadow-md`}>
        <BadgeCheck className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} />
        {UNIT_TIER_LABELS[tier]}{price > 0 ? ` · ${formatPrice(price)}` : ''}
      </div>
      <span className={`absolute left-0 top-[calc(100%-1px)] h-[4px] w-1 ${look.fold} [clip-path:polygon(0_0,100%_0,100%_100%)]`} aria-hidden="true" />
    </div>
  );
};

/** Tier ribbons inside the property card's text area, each with its lowest price. */
export const TierOverlay = ({ property, className = 'absolute left-3 top-12 z-30' }) => {
  const units = getPropertyUnits(property);
  const lowest = {};
  units.forEach((unit) => {
    if (!UNIT_TIER_LABELS[unit.tier]) return;
    const price = getUnitPrice(unit);
    if (!(unit.tier in lowest) || (price > 0 && price < lowest[unit.tier])) lowest[unit.tier] = price;
  });
  const tiers = Object.keys(UNIT_TIER_LABELS).filter((t) => t in lowest);
  if (!tiers.length) return null;
  return (
    <div className={`pointer-events-none flex flex-col items-start gap-1.5 ${className}`}>
      {tiers.map((tier) => <TierBadge key={tier} tier={tier} price={lowest[tier]} />)}
    </div>
  );
};


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

const UnitCard = ({ unit, property, UnitIcon, priceSuffix, sizeLabel, selected, onSelect, attention }) => {
  const price = getUnitPrice(unit);
  const details = [
    unit.area_sqft ? `${unit.area_sqft} sq.ft` : null,
    unit.max_guests ? `Up to ${unit.max_guests} ${property.category === 'commercial' ? 'staff' : 'guests'}` : null,
    sizeLabel ? sizeLabel(unit.bhk_type) : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(unit)}
      aria-pressed={selected}
      className={`relative flex w-full items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-[#fff0e6] via-[#fcf8f5] to-[#e4effb] px-4 py-4 text-left transition ${
        selected ? 'border-charcoal ring-2 ring-charcoal/10' : 'border-gray-300 hover:border-charcoal'
      } ${onSelect ? 'cursor-pointer' : 'cursor-default'} ${attention && !selected ? 'unit-attention' : ''}`}
    >
      {unit.tier && <span className="absolute -left-1.5 top-1 z-10"><TierBadge tier={unit.tier} /></span>}
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-white/80 text-charcoal ${selected ? 'border-charcoal' : 'border-gray-300'}`}>
        <UnitIcon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-2 text-[15px] font-semibold leading-snug text-charcoal">
          {selected && (
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-charcoal text-white" aria-label="Selected">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            </span>
          )}
          <span className="min-w-0 break-words">{unit.name}</span>
        </p>
        {details.length > 0 && <p className="mt-1 text-xs font-medium text-charcoal-muted">{details.join(' · ')}</p>}
      </div>
      {price > 0 && (
        <div className="shrink-0 text-right">
          <span className="text-[18px] font-bold text-charcoal">{formatPrice(price)}</span>
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-muted">{priceSuffix}</span>
        </div>
      )}
    </button>
  );
};

const PRICE_SORTS = [
  { value: 'low', label: 'Price: Low to High' },
  { value: 'high', label: 'Price: High to Low' },
];

/** Every unit of the property in one window, with a price filter. */
const UnitsModal = ({ units, property, UnitIcon, priceSuffix, sizeLabel, selectedUnitId, onSelect, onClose }) => {
  const prices = units.map(getUnitPrice).filter((n) => n > 0);
  const lowest = prices.length ? Math.min(...prices) : 0;
  const highest = prices.length ? Math.max(...prices) : 0;
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sort, setSort] = useState('low');

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  // price bands that fit this property's own prices
  const bands = useMemo(() => {
    if (!lowest || lowest === highest) return [];
    const step = Math.ceil((highest - lowest) / 3 / 500) * 500;
    const first = lowest + step;
    const second = lowest + step * 2;
    return [
      { label: `Up to ${formatPrice(first)}`, min: '', max: String(first) },
      { label: `${formatPrice(first)} - ${formatPrice(second)}`, min: String(first), max: String(second) },
      { label: `${formatPrice(second)} and above`, min: String(second), max: '' },
    ];
  }, [lowest, highest]);

  const visible = useMemo(() => {
    const list = units.filter((unit) => {
      const price = getUnitPrice(unit);
      if (min !== '' && price < Number(min)) return false;
      if (max !== '' && price > Number(max)) return false;
      return true;
    });
    return [...list].sort((a, b) => (sort === 'low' ? getUnitPrice(a) - getUnitPrice(b) : getUnitPrice(b) - getUnitPrice(a)));
  }, [units, min, max, sort]);

  const filtered = min !== '' || max !== '';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 sm:items-center sm:p-6" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="All units">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <h3 className="font-serif-hero text-[24px] font-semibold text-charcoal">All units</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-charcoal transition hover:bg-gray-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="border-y border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {bands.map((band) => {
              const active = min === band.min && max === band.max;
              return (
                <button key={band.label} type="button" onClick={() => { setMin(active ? '' : band.min); setMax(active ? '' : band.max); }} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${active ? 'border-charcoal bg-charcoal text-white' : 'border-gray-300 bg-white text-charcoal hover:border-charcoal'}`}>{band.label}</button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {[['Min', min, setMin], ['Max', max, setMax]].map(([label, value, setter]) => (
              <label key={label} className="flex h-10 w-[140px] items-center gap-1 rounded-md border border-gray-300 bg-[#f6f6f6] px-3">
                <span className="text-[14px] text-charcoal">₹</span>
                <input type="number" inputMode="numeric" min="0" value={value} onChange={(event) => setter(event.target.value)} placeholder={`${label}${label === 'Min' && lowest ? ` ${lowest}` : label === 'Max' && highest ? ` ${highest}` : ''}`} aria-label={`${label} price`} className="h-full w-full min-w-0 border-0 bg-transparent text-[14px] text-charcoal outline-none placeholder:text-[#9aa0a6] focus:ring-0" />
              </label>
            ))}
            <div className="ml-auto flex gap-2">
              {PRICE_SORTS.map((option) => (
                <button key={option.value} type="button" onClick={() => setSort(option.value)} className={`rounded-md border px-3 py-2 text-[12px] font-medium transition ${sort === option.value ? 'border-[#3b9cf5] bg-[#eaf4ff] text-[#2563eb]' : 'border-gray-300 bg-white text-charcoal'}`}>{option.label}</button>
              ))}
            </div>
            {filtered && <button type="button" onClick={() => { setMin(''); setMax(''); }} className="text-[13px] font-semibold text-charcoal underline underline-offset-4">Clear</button>}
          </div>
          <p className="mt-3 text-[12px] text-gray-500">Showing {visible.length} of {units.length} units</p>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-gray-500">No unit in this price range. Change the range or clear the filter.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visible.map((unit) => (
                <UnitCard
                  key={unit.unit_id || unit.name}
                  unit={unit}
                  property={property}
                  UnitIcon={UnitIcon}
                  priceSuffix={priceSuffix}
                  sizeLabel={sizeLabel}
                  selected={Boolean(selectedUnitId) && unit.unit_id === selectedUnitId}
                  onSelect={onSelect ? (picked) => { onSelect(picked); onClose(); } : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const INLINE_UNITS = 4;

/** Full-width unit list for the property detail page: the first four, the rest behind "more units". */
export const UnitCards = ({ property, priceSuffix = '/ night', sizeLabel, selectedUnitId, onSelect, attention = false }) => {
  const units = getPropertyUnits(property);
  const [showAll, setShowAll] = useState(false);
  if (!units.length) return null;
  const UnitIcon = property.category === 'commercial' ? Briefcase : property.category === 'event_venue' ? PartyPopper : BedDouble;

  // keep a selected unit that is hidden behind "more" visible in the short list
  const selectedIndex = units.findIndex((unit) => selectedUnitId && unit.unit_id === selectedUnitId);
  const shown = units.slice(0, INLINE_UNITS);
  if (selectedIndex >= INLINE_UNITS) shown[INLINE_UNITS - 1] = units[selectedIndex];
  const more = units.length - INLINE_UNITS;

  return (
    <section id="property-units" data-testid="property-units" className="scroll-mt-28">
      <h2 className="mb-4 font-serif-hero text-[26px] font-semibold text-charcoal">Available units</h2>
      {onSelect && (
        <p className="-mt-2 mb-3 text-xs font-medium text-charcoal-muted">Select a unit to see its availability and book it.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((unit) => (
          <UnitCard
            key={unit.unit_id || unit.name}
            unit={unit}
            property={property}
            UnitIcon={UnitIcon}
            priceSuffix={priceSuffix}
            sizeLabel={sizeLabel}
            selected={Boolean(selectedUnitId) && unit.unit_id === selectedUnitId}
            onSelect={onSelect}
            attention={attention}
          />
        ))}
      </div>
      {more > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 text-[14px] font-medium text-[#2563eb] !transform-none hover:underline">
          +{more} more {more === 1 ? 'unit' : 'units'}
        </button>
      )}
      {showAll && (
        <UnitsModal
          units={units}
          property={property}
          UnitIcon={UnitIcon}
          priceSuffix={priceSuffix}
          sizeLabel={sizeLabel}
          selectedUnitId={selectedUnitId}
          onSelect={onSelect}
          onClose={() => setShowAll(false)}
        />
      )}
    </section>
  );
};
