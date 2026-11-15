import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Photo slider layer for property cards: the photo, prev/next arrows (on hover, always on touch screens)
 * and a dot indicator. Render it inside a `relative` photo wrapper whose card has the `group` class.
 */
const PropertyPhotoSlider = ({ images = [], alt = '', fallback = '', imageClassName = '' }) => {
  const list = images.filter(Boolean).length ? images.filter(Boolean) : [fallback];
  const [active, setActive] = useState(0);
  const index = Math.min(active, list.length - 1);
  const multiple = list.length > 1;

  const change = (event, direction) => {
    event.preventDefault();
    event.stopPropagation();
    setActive((current) => (current + direction + list.length) % list.length);
  };

  const dotStart = Math.max(0, Math.min(index - 2, list.length - 5));
  const dots = list.slice(dotStart, dotStart + 5).map((_, i) => dotStart + i);
  const arrowClass =
    'absolute top-1/2 z-20 -mt-5 grid h-10 w-10 !transform-none place-items-center rounded-full bg-white/90 text-charcoal shadow-md transition opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100';

  return (
    <>
      <img
        src={list[index] || fallback}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.onerror = null;
          if (fallback) event.currentTarget.src = fallback;
        }}
        className={`h-full w-full object-cover ${imageClassName}`}
      />
      {multiple && (
        <>
          <button type="button" onClick={(event) => change(event, -1)} className={`${arrowClass} left-3`} aria-label="Previous photo">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={(event) => change(event, 1)} className={`${arrowClass} right-3`} aria-label="Next photo">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center" aria-label={`Photo ${index + 1} of ${list.length}`}>
            <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
              {dots.map((dot) => (
                <span
                  key={dot}
                  className={`block h-1.5 rounded-full transition-all duration-300 ${dot === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default PropertyPhotoSlider;
