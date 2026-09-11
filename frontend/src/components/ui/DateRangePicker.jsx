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

export default function DateRangePicker({
  open,
  anchor = 'checkIn',
  checkIn,
  checkOut,
  minDate,
  blockedDates = [],
  onChange,
  onClose,
  desktopPosition = null,
}) {
  const [isMobile, setIsMobile] = useState(false);

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
  if (!open) return null;

  const desktopStyle = desktopPosition
    ? {
        position: 'fixed',
        top: `${desktopPosition.top}px`,
        left: `${desktopPosition.left}px`,
        right: 'auto',
        width: `${desktopPosition.width}px`,
      }
    : undefined;

  const DateGrid = ({ monthDate, monthCells, isSecondMonth = false }) => (
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
                'aspect-square w-full rounded-2xl text-xs sm:text-sm font-bold transition-all relative flex items-center justify-center',
                isDisabled
                  ? (isBlocked ? 'cursor-not-allowed text-gray-300 bg-gray-100/60 line-through' : 'cursor-not-allowed text-gray-300 bg-stone/30')
                  : 'text-charcoal hover:bg-sand-100 active:scale-95',
                inRange ? 'bg-sand-200/90 text-charcoal rounded-none font-bold' : '',
                isStart || isEnd ? 'bg-[#1A1A1A] text-white shadow-md rounded-2xl z-10 font-extrabold' : '',
              ].join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  const applyDate = (iso) => {
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: '' });
    } else {
      if (iso > checkIn) {
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
      className={`fixed inset-x-3 top-16 sm:top-20 bottom-auto max-h-[90vh] z-[90] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] ${
        desktopPosition
          ? 'md:fixed md:bottom-auto md:h-auto md:z-[90] md:overflow-visible md:rounded-[28px] md:p-5 md:py-4'
          : 'md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 md:mt-2.5 md:bottom-auto md:w-[580px] lg:w-[610px] md:overflow-visible md:rounded-[28px] md:p-5 md:py-4'
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
          {checkIn && checkOut ? 'Review your check-in and check-out dates.' : 'Choose check-in date first, then select check-out date.'}
        </p>
      </div>

      {/* Navigation Header for Joined Dual-Month Calendar */}
      <div className="mb-4 flex items-center justify-between pb-2.5 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone active:scale-95 shrink-0"
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
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone active:scale-95 shrink-0"
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-gray-300 bg-white" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1A1A1A]" />
          <span>Selected</span>
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
          className="w-full rounded-full border border-gray-200 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-charcoal transition hover:bg-stone md:w-auto md:min-w-[120px]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="w-full rounded-full bg-[#1A1A1A] px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-black md:w-auto md:min-w-[120px] flex items-center justify-center"
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

