import React from 'react';
import { BadgeCheck, Crown, Star } from 'lucide-react';
import { formatPropertyTypeLabel } from '../lib/displayLabels';

/**
 * Shared card badges: category ribbon, X-Space Series ribbon, rating pill and Best Rated tag.
 * Used by the landing page, the discover/browse cards and the property page so they stay consistent.
 * Ribbons overhang the card edge, so render them OUTSIDE the card's overflow-hidden photo wrapper.
 */

const PILL_BASE = 'inline-flex items-center gap-1 rounded-full bg-[#3a3a3a]/80 px-2 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm';

export const RatingPill = ({ rating }) => (
  <span className={PILL_BASE}>
    {Number(rating).toFixed(1)}
    <Star className="h-3 w-3 fill-[#f5b301] text-[#f5b301]" />
  </span>
);

/** Rating shown on the photo's bottom-left corner. */
export const RatingCorner = ({ rating }) => (
  Number(rating) > 0 ? (
    <div className="absolute bottom-3 left-3 z-20">
      <RatingPill rating={rating} />
    </div>
  ) : null
);

/** Gold ribbon that overhangs the card edge, with a folded corner (verified-style badge). */
export const TypeRibbon = ({ type }) => {
  const label = formatPropertyTypeLabel(type);
  if (!label) return null;
  return (
    <div className="relative">
      <div className="flex w-max items-center gap-1 rounded-r-full bg-gradient-to-b from-[#e9c16a] to-[#d29a35] py-1 pl-2.5 pr-2.5 text-[10px] font-bold leading-none text-white shadow-md">
        <BadgeCheck className="h-3 w-3 shrink-0" strokeWidth={2.25} />
        {label}
      </div>
      <span className="absolute left-0 top-[calc(100%-1px)] h-[5px] w-1.5 bg-[#8a5f17] [clip-path:polygon(0_0,100%_0,100%_100%)]" aria-hidden="true" />
    </div>
  );
};

/** X-Space Series ribbon: same gold ribbon as the category badge, with a crown. */
export const SeriesRibbon = ({ label = 'X-Space Series', className = 'absolute -left-1.5 top-3 z-30' }) => (
  <div className={`pointer-events-none ${className}`}>
    <div className="relative">
      <div className="flex w-max items-center gap-1 rounded-r-full border-y border-r border-[#D4AF37]/80 bg-gradient-to-b from-[#2b2b2b] via-[#161616] to-[#070707] py-1 pl-2.5 pr-2.5 text-[10px] font-bold leading-none text-[#E8C766] shadow-md">
        <Crown className="h-3 w-3 shrink-0 fill-[#D4AF37]/35 text-[#D4AF37]" strokeWidth={2.25} />
        {label}
      </div>
      <span className="absolute left-0 top-[calc(100%-1px)] h-[5px] w-1.5 bg-[#8a5f17] [clip-path:polygon(0_0,100%_0,100%_100%)]" aria-hidden="true" />
    </div>
  </div>
);

/** Top-left ribbon, rendered outside the card's clipped area so it can overhang the edge. */
export const CardBadges = ({ type, className = 'absolute -left-1.5 top-3 z-30' }) => (
  <div className={`pointer-events-none ${className}`}>
    <TypeRibbon type={type} />
  </div>
);

/** Overlay that matches the photo area; the tag overhangs the card's right edge with a folded corner. */
export const BestRatedTag = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-30 aspect-[16/10]">
    <div className="absolute -right-1.5 bottom-3">
      <div className="flex w-max items-center gap-1.5 rounded-l-md bg-[#1e1e1e] py-1.5 pl-2 pr-3 text-[11px] font-semibold leading-none text-white shadow-md">
        <Star className="h-3 w-3 fill-[#fbd5a0] text-[#fbd5a0]" strokeLinejoin="round" />
        Best Rated
      </div>
      <span className="absolute right-0 top-[calc(100%-1px)] h-[7px] w-1.5 bg-black [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
    </div>
  </div>
);
