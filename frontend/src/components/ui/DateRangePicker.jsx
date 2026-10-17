import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildMonthGrid = (visibleMonth) => {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = first.getDay();
  const totalDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const formatDate = (value) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const monthKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const formatNightlyPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  if (amount >= 100000) return `₹${Math.round(amount / 1000)}k`;
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `₹${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `₹${Math.round(amount)}`;
};

export default function DateRangePicker({
  open,
  anchor = 'checkIn',
  checkIn,
  checkOut,
  minDate,
  blockedDates = [],
  nightlyPrices = {},
  defaultNightlyPrice = 0,
  singleDate = false,
  onChange,
  onClose,
  desktopPosition = null,
  onVisibleMonthsChange,
}) {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.innerWidth < 768
  ));

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDateBlocked = (iso) => {
    if (!blockedDates || !blockedDates.length) return false;
    return blockedDates.some((b) => {
      const start = b.start_date ? b.start_date.split('T')[0] : '';
      const end = b.end_date ? b.end_date.split('T')[0] : '';
      return iso >= start && iso <= end;
    });
  };

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const seed = checkIn ? new Date(`${checkIn}T00:00:00`) : new Date();
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const seed = checkIn ? new Date(`${checkIn}T00:00:00`) : new Date();
    setVisibleMonth(new Date(seed.getFullYear(), seed.getMonth(), 1));
  }, [open, checkIn]);

  const nextVisibleMonth = useMemo(
    () => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
    [visibleMonth]
  );
  const cells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const nextMonthCells = useMemo(() => buildMonthGrid(nextVisibleMonth), [nextVisibleMonth]);

  useEffect(() => {
    if (open) onVisibleMonthsChange?.([monthKey(visibleMonth), monthKey(nextVisibleMonth)]);
  }, [open, visibleMonth, nextVisibleMonth, onVisibleMonthsChange]);

  if (!open) return null;

  const desktopStyle = desktopPosition && !isMobile
    ? {
        position: 'fixed',
        top: `${desktopPosition.top}px`,
        left: `${desktopPosition.left}px`,
        right: 'auto',
        width: `${desktopPosition.width}px`,
      }
    : undefined;

  const DateGrid = ({ monthDate, monthCells }) => (
    <div className="min-w-0">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
        {WEEKDAYS.map((day) => <div key={`${monthDate.getMonth()}-${day}`}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {monthCells.map((day, index) => {
          if (!day) return <div key={`empty-${monthDate.getMonth()}-${index}`} className="aspect-square" />;

          const iso = toISO(day);
          const isBlocked = isDateBlocked(iso);
          const isDisabled = iso < minDate || isBlocked;
          const price = nightlyPrices[iso];
          const nightlyPrice = price?.final_price ?? defaultNightlyPrice;
          const hasDynamicRate = Boolean(price?.is_dynamic);
          const isHigherRate = Boolean(price?.is_higher);
          const isLowerRate = Boolean(price?.is_lower);
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;

          return (
            <button
              key={iso}
              type="button"
              disabled={isDisabled}
              onClick={() => applyDate(iso)}
              className={[
                'min-h-[48px] sm:min-h-[54px] w-full rounded-xl border text-xs sm:text-sm font-bold transition-all relative flex flex-col items-center justify-center leading-none',
                isDisabled
                  ? (isBlocked ? 'cursor-not-allowed border-gray-100 text-gray-300 bg-gray-100/60 line-through' : 'cursor-not-allowed border-transparent text-gray-300 bg-stone/30')
                  : hasDynamicRate
                  ? (isHigherRate ? 'border-[#d4af37]/50 bg-[#fff7df] text-charcoal hover:bg-[#fff0bf] active:scale-95' : 'border-[#087f5b]/25 bg-[#f0faf6] text-charcoal hover:bg-[#e0f5ec] active:scale-95')
                  : 'border-transparent text-charcoal hover:border-[#d4af37]/35 hover:bg-[#fffaf0] active:scale-95',
                inRange ? 'border-[#d4af37]/25 bg-[#fff2ce] text-charcoal rounded-none font-bold' : '',
                isStart || isEnd ? 'border-[#087f5b] bg-[#087f5b] text-white shadow-md rounded-xl z-10 font-extrabold' : '',
              ].join(' ')}
              title={hasDynamicRate ? `${price.rule_label || 'Dynamic'} rate: ${formatNightlyPrice(price.final_price)} per night` : undefined}
            >
              <span>{day.getDate()}</span>
              {!isDisabled && Number(nightlyPrice) > 0 && (
                <span className={[
                  'mt-1 text-[8px] sm:text-[9px] font-bold tracking-tight',
                  isStart || isEnd ? 'text-white/85' : isHigherRate ? 'text-[#a46f00]' : isLowerRate ? 'text-[#087f5b]' : 'text-charcoal-muted',
                ].join(' ')}>
                  {formatNightlyPrice(nightlyPrice)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const applyDate = (iso) => {
    if (singleDate) {
      onChange({ checkIn: iso, checkOut: iso });
      onClose?.();
      return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: '' });
    } else {
      if (iso > checkIn) {
        onChange({ checkIn, checkOut: iso });
        onClose?.();
      } else if (iso === checkIn) {
        // Same date clicked again -> single day selection (checkOut = checkIn)
        onChange({ checkIn, checkOut: iso });
        onClose?.();
      } else {
        onChange({ checkIn: iso, checkOut: '' });
      }
    }
  };

  const pickerContent = (
    <div
      style={desktopStyle}
      className={`fixed inset-x-3 top-1/2 -translate-y-1/2 bottom-auto max-h-[90vh] z-[90] overflow-y-auto rounded-[24px] border border-[#d4af37]/25 bg-[#fffdfa] p-4 sm:p-5 shadow-[0_20px_50px_rgba(54,43,17,0.18)] ${
        desktopPosition
          ? 'md:fixed md:translate-y-0 md:bottom-auto md:h-auto md:z-[90] md:overflow-visible md:rounded-[28px] md:p-5 md:py-4'
          : 'md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:mt-2.5 md:bottom-auto md:w-[580px] lg:w-[610px] md:overflow-visible md:rounded-[28px] md:p-5 md:py-4'
      }`}
    >
      <div className="mb-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-charcoal">
            {checkIn && checkOut ? `${formatDate(checkIn)} — ${formatDate(checkOut)}` : 'Select stay dates'}
          </h3>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="text-gray-400 hover:text-charcoal md:hidden p-1"
          >
            ✕
          </button>
        </div>
        <p className="text-xs font-semibold text-charcoal-muted">
          {singleDate
            ? 'Choose one date for your hourly booking.'
            : checkIn && checkOut
            ? 'Review your check-in and check-out dates.'
            : 'Choose check-in date first, then select check-out date.'}
        </p>
      </div>

      {/* Navigation Header for Joined Dual-Month Calendar */}
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-[#d4af37]/25">
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4af37]/35 bg-white text-[#087f5b] transition hover:bg-[#fff4d8] active:scale-95 shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 text-center px-3">
          <h4 className="text-base md:text-lg font-bold tracking-tight text-charcoal">
            {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </h4>
          <h4 className="hidden md:block text-base md:text-lg font-bold tracking-tight text-charcoal">
            {MONTHS[nextVisibleMonth.getMonth()]} {nextVisibleMonth.getFullYear()}
          </h4>
        </div>

        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4af37]/35 bg-white text-[#087f5b] transition hover:bg-[#fff4d8] active:scale-95 shrink-0"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dual Joined Month Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
        <DateGrid monthDate={visibleMonth} monthCells={cells} />
        <div className="hidden md:block">
          <DateGrid monthDate={nextVisibleMonth} monthCells={nextMonthCells} isSecondMonth />
        </div>
      </div>

      {/* Calendar Legend / Key */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#d4af37]/20 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-gray-300 bg-white" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#087f5b]" />
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />
          <span>Higher rate</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-gray-300 bg-gray-100" />
          <span>Unavailable</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-stone/70 px-3.5 py-2 text-xs font-semibold text-charcoal md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500">Check-in</p>
            <p className="mt-0.5">{formatDate(checkIn)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500">Check-out</p>
            <p className="mt-0.5">{formatDate(checkOut)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 md:justify-end">
        <button
          type="button"
          onClick={() => onChange({ checkIn: '', checkOut: '' })}
          className="w-full rounded-lg border border-[#d4af37]/35 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-charcoal transition hover:bg-[#fff4d8] md:w-auto md:min-w-[120px]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="w-full rounded-lg bg-[#087f5b] px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-[#066548] md:w-auto md:min-w-[120px] flex items-center justify-center"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (isMobile || desktopPosition) {
    return createPortal(pickerContent, document.body);
  }

  return pickerContent;
}
