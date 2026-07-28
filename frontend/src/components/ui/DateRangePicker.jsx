import React, { useEffect, useMemo, useState } from 'react';
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
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const seed = checkIn ? new Date(`${checkIn}T00:00:00`) : new Date();
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const seed = checkIn ? new Date(`${checkIn}T00:00:00`) : new Date();
    setVisibleMonth(new Date(seed.getFullYear(), seed.getMonth(), 1));
  }, [open, checkIn]);

  const cells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  if (!open) return null;

  const applyDate = (iso) => {
    if (!checkIn || anchor === 'checkIn' || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: '' });
      return;
    }

    if (iso < checkIn) {
      onChange({ checkIn: iso, checkOut: '' });
      return;
    }

    onChange({ checkIn, checkOut: iso });
    onClose?.();
  };

  return (
    <div className="fixed inset-x-3 top-24 bottom-6 z-[90] overflow-y-auto rounded-[28px] border border-[#E8E1D6] bg-white p-4 shadow-[0_22px_50px_rgba(15,23,42,0.16)] md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-4 md:w-[min(92vw,360px)] md:overflow-visible">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#A18C63]">Select Dates</p>
          <h4 className="mt-1 text-base font-bold text-charcoal">
            {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-charcoal transition hover:bg-stone"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
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
                inRange ? 'bg-[#F8EFD9] text-[#9E6A07]' : '',
                isStart || isEnd ? 'bg-[#1B1924] text-white shadow-sm' : '',
              ].join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-stone/70 px-4 py-3 text-xs font-semibold text-charcoal">
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

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => onChange({ checkIn: '', checkOut: '' })}
          className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-charcoal transition hover:bg-stone"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full bg-[#1B1924] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#2A2636]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
