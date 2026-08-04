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

  const DateGrid = ({ monthDate, monthCells }) => (
    <div className="min-w-0">
      <div className="mb-4 text-center">
        <h4 className="text-[1.7rem] font-bold tracking-tight text-charcoal">
          {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
        </h4>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {WEEKDAYS.map((day) => <div key={`${monthDate.getMonth()}-${day}`}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {monthCells.map((day, index) => {
          if (!day) return <div key={`empty-${monthDate.getMonth()}-${index}`} className="aspect-square" />;

          const iso = toISO(day);
          const isDisabled = iso < minDate;
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
                'aspect-square rounded-2xl text-sm font-bold transition',
                isDisabled ? 'cursor-not-allowed text-gray-300' : 'text-charcoal hover:bg-stone',
                inRange ? 'bg-slate-100 text-slate-700' : '',
                isStart || isEnd ? 'bg-[#1B1924] text-white shadow-sm' : '',
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
      className="fixed inset-x-3 top-24 bottom-6 z-[90] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_22px_50px_rgba(15,23,42,0.16)] md:absolute md:top-full md:right-0 md:mt-3 md:bottom-auto md:w-[min(92vw,440px)] md:overflow-visible md:rounded-[32px] md:p-8"
    >
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">
            {checkIn && checkOut ? `${formatDate(checkIn)} - ${formatDate(checkOut)}` : 'Select dates'}
          </h3>
          <p className="mt-1 text-sm font-semibold text-charcoal-muted">
            {checkIn && checkOut ? 'Review your stay dates before booking.' : 'Choose your check-in and check-out dates.'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <DateGrid monthDate={visibleMonth} monthCells={cells} />
      </div>

      <div className="mt-6 rounded-2xl bg-stone/70 px-4 py-3 text-xs font-semibold text-charcoal md:hidden">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Check-in</p>
            <p className="mt-1">{formatDate(checkIn)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Check-out</p>
            <p className="mt-1">{formatDate(checkOut)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 md:justify-end">
        <button
          type="button"
          onClick={() => onChange({ checkIn: '', checkOut: '' })}
          className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-charcoal transition hover:bg-stone md:w-auto md:min-w-[140px]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="hidden rounded-full bg-[#1B1924] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-black md:inline-flex md:min-w-[140px] md:items-center md:justify-center"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return createPortal(pickerContent, document.body);
  }

  return pickerContent;
}
