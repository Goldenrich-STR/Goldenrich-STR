import React from 'react';
import { getImageUrl } from '../services/api';

/**
 * Units of a property, for the people who verify listings (broker, RM, branch manager, admin).
 * Read-only. It shows exactly what the host entered, and flags a unit that is missing a name,
 * price or guest count, so the reviewer can reject or send it back before it goes live.
 */
const TIER_STYLES = {
  standard: 'bg-slate-100 text-slate-700',
  deluxe: 'bg-sky-100 text-sky-800',
  premium: 'bg-amber-100 text-amber-800',
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export const getUnitIssues = (unit) => {
  const issues = [];
  if (!String(unit?.name || '').trim()) issues.push('name');
  if (!(Number(unit?.price_per_night ?? unit?.price) > 0)) issues.push('price');
  if (!(Number(unit?.max_guests) > 0)) issues.push('guests');
  return issues;
};

const PropertyUnitsReview = ({ property, className = '' }) => {
  const units = Array.isArray(property?.units) ? property.units : [];
  const hasUnits = Boolean(property?.has_units) && units.length > 0;
  const enabledButEmpty = Boolean(property?.has_units) && units.length === 0;
  const problemCount = units.filter((unit) => getUnitIssues(unit).length > 0).length;
  const prices = units.map((unit) => Number(unit.price_per_night ?? unit.price) || 0).filter((p) => p > 0);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`} data-testid="units-review">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6df6]">Units</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {hasUnits ? `${units.length} unit${units.length === 1 ? '' : 's'} listed` : 'Units & Pricing'}
          </h3>
        </div>
        {hasUnits && prices.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))} - ${money(Math.max(...prices))}`} / night
          </span>
        )}
      </div>

      {!hasUnits && !enabledButEmpty && (
        <p className="text-sm font-semibold text-slate-500">Single property. The host did not split it into units.</p>
      )}
      {enabledButEmpty && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Units are switched on but no unit is listed. Ask the host to add the units or turn them off.</p>
      )}

      {hasUnits && (
        <>
          {problemCount > 0 && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              {problemCount} unit{problemCount === 1 ? ' is' : 's are'} incomplete (name, price or guest count missing). Do not approve until the host fixes it.
            </p>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {units.map((unit, index) => {
              const issues = getUnitIssues(unit);
              const tier = String(unit.tier || 'standard').toLowerCase();
              return (
                <div key={unit.unit_id || index} className={`rounded-xl border p-3 ${issues.length ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-slate-950">{unit.name || `Unit ${index + 1}`}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${TIER_STYLES[tier] || TIER_STYLES.standard}`}>{tier}</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                    <div><dt className="font-bold uppercase text-slate-400">Price</dt><dd className="font-black text-slate-900">{Number(unit.price_per_night ?? unit.price) > 0 ? `${money(unit.price_per_night ?? unit.price)} / night` : 'Missing'}</dd></div>
                    <div><dt className="font-bold uppercase text-slate-400">Max guests</dt><dd className="font-black text-slate-900">{Number(unit.max_guests) > 0 ? unit.max_guests : 'Missing'}</dd></div>
                    <div><dt className="font-bold uppercase text-slate-400">Configuration</dt><dd className="font-black text-slate-900">{unit.bhk_type ? String(unit.bhk_type).replace(/_/g, ' ') : '-'}</dd></div>
                    <div><dt className="font-bold uppercase text-slate-400">Area</dt><dd className="font-black text-slate-900">{Number(unit.area_sqft) > 0 ? `${unit.area_sqft} sq ft` : '-'}</dd></div>
                  </dl>
                  {/* this unit's own photos: the reviewer checks the unit against them */}
                  {Array.isArray(unit.images) && unit.images.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Unit photos ({unit.images.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.images.slice(0, 8).map((src, photoIndex) => {
                          const url = getImageUrl(String(src).split('#')[0]);
                          return (
                            <a key={`${src}-${photoIndex}`} href={url} target="_blank" rel="noreferrer" className="block h-14 w-[74px] overflow-hidden rounded-md border border-slate-200 bg-slate-50" title={`${unit.name} photo ${photoIndex + 1}`}>
                              <img src={url} alt={`${unit.name} photo ${photoIndex + 1}`} className="h-full w-full object-cover" loading="lazy" />
                            </a>
                          );
                        })}
                        {unit.images.length > 8 && <span className="grid h-14 w-[74px] place-items-center rounded-md bg-slate-100 text-[11px] font-black text-slate-600">+{unit.images.length - 8}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">No separate photos for this unit.</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Prices are what the host entered. Weekend, festival and season rules are applied on top, for every unit.
          </p>
        </>
      )}
    </section>
  );
};

export default PropertyUnitsReview;
