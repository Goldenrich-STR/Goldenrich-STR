import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// weeks start on Monday
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// public holidays and big festival days, shown in blue so guests can plan long weekends
export const HOLIDAYS = {
  '2026-01-26': 'Republic Day',
  '2026-03-04': 'Holi',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Maharashtra Day',
  '2026-08-15': 'Independence Day',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-08': 'Diwali',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas',
  '2027-01-01': "New Year's Day",
  '2027-01-26': 'Republic Day',
};

const toISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildMonthGrid = (visibleMonth) => {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
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

  const todayISO = toISO(new Date());
  const goMonth = (delta) => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1));

  const desktopStyle = desktopPosition && !isMobile
    ? {
        position: 'fixed',
        top: `${desktopPosition.top}px`,
        left: `${desktopPosition.left}px`,
        right: 'auto',
        width: `${desktopPosition.width}px`,
      }
    : undefined;

  const applyDate = (iso) => {
    if (singleDate) {
      onChange({ checkIn: iso, checkOut: iso });
      onClose?.();
      return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: '' });
    } else if (iso > checkIn) {
      onChange({ checkIn, checkOut: iso });
      onClose?.();
    } else if (iso === checkIn) {
      // same date clicked again -> single day selection (checkOut = checkIn)
      onChange({ checkIn, checkOut: iso });
      onClose?.();
    } else {
      onChange({ checkIn: iso, checkOut: '' });
    }
  };

  const arrowClass = 'grid h-8 w-8 shrink-0 place-items-center rounded-full !transform-none text-charcoal transition hover:bg-gray-100';

  const DateGrid = ({ monthDate, monthCells, first }) => (
    <div className="min-w-0">
      {/* month title with the arrows on the outer edges */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        {first ? (
          <button type="button" onClick={() => goMonth(-1)} className={arrowClass} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        ) : <span className="h-8 w-8 md:block hidden" />}
        <h4 className="text-[16px] font-semibold tracking-tight text-charcoal">
          {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
        </h4>
        {first ? (
          <button type="button" onClick={() => goMonth(1)} className={`${arrowClass} md:invisible`} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        ) : (
          <button type="button" onClick={() => goMonth(1)} className={arrowClass} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[13px] font-medium">
        {WEEKDAYS.map((day, i) => (
          <div key={`${monthDate.getMonth()}-${day}`} className={`py-1.5 ${i >= 5 ? 'text-[#e5484d]' : 'text-charcoal'}`}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthCells.map((day, index) => {
          if (!day) return <div key={`empty-${monthDate.getMonth()}-${index}`} className="h-[46px]" />;

          const iso = toISO(day);
          const isBlocked = isDateBlocked(iso);
          const isPast = iso < minDate;
          const isDisabled = isPast || isBlocked;
          const price = nightlyPrices[iso];
          const nightlyPrice = price?.final_price ?? defaultNightlyPrice;
          const isHigherRate = Boolean(price?.is_higher);
          const isLowerRate = Boolean(price?.is_lower);
          const hasDynamicRate = Boolean(price?.is_dynamic);
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
          const isHoliday = Boolean(HOLIDAYS[iso]);
          const selected = isStart || isEnd;

          return (
            <div
              key={iso}
              className={[
                'flex h-[46px] items-center justify-center',
                inRange ? 'bg-[#f3efe4]' : '',
                isStart && checkOut && checkOut !== checkIn ? 'rounded-l-full bg-gradient-to-r from-transparent to-[#f3efe4]' : '',
                isEnd && checkIn && checkOut !== checkIn ? 'rounded-r-full bg-gradient-to-l from-transparent to-[#f3efe4]' : '',
              ].join(' ')}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => applyDate(iso)}
                className={[
                  'relative flex h-[42px] w-[42px] flex-col items-center justify-center rounded-full !transform-none text-[15px] leading-none transition',
                  selected
                    ? 'bg-[#1d2528] font-semibold text-white'
                    : isDisabled
                    ? `cursor-not-allowed ${isBlocked ? 'text-gray-300 line-through' : 'text-gray-400'}`
                    : isHoliday
                    ? 'font-medium text-[#3b9cf5] hover:bg-gray-100'
                    : 'font-medium text-charcoal hover:bg-gray-100',
                  iso === todayISO && !selected ? 'underline decoration-2 underline-offset-[6px]' : '',
                ].join(' ')}
                title={hasDynamicRate ? `${price.rule_label || 'Dynamic'} rate: ${formatNightlyPrice(price.final_price)} per night` : (HOLIDAYS[iso] || undefined)}
              >
                <span>{day.getDate()}</span>
                {!isDisabled && Number(nightlyPrice) > 0 && (
                  <span className={[
                    'mt-0.5 text-[8.5px] font-medium tracking-tight',
                    selected ? 'text-white/80' : isHigherRate ? 'text-[#a46f00]' : isLowerRate ? 'text-[#087f5b]' : 'text-gray-500',
                  ].join(' ')}>
                    {formatNightlyPrice(nightlyPrice)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // holidays inside the months on screen
  const shownKeys = isMobile ? [monthKey(visibleMonth)] : [monthKey(visibleMonth), monthKey(nextVisibleMonth)];
  const shownHolidays = Object.entries(HOLIDAYS)
    .filter(([iso]) => shownKeys.includes(iso.slice(0, 7)))
    .sort(([a], [b]) => a.localeCompare(b));

  const pickerContent = (
    <div
      style={desktopStyle}
      className={`fixed inset-x-3 top-1/2 -translate-y-1/2 bottom-auto max-h-[90vh] z-[90] overflow-y-auto rounded-[24px] border border-gray-100 bg-white p-4 sm:p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] ${
        desktopPosition
          ? 'md:fixed md:translate-y-0 md:bottom-auto md:h-auto md:z-[90] md:overflow-visible md:rounded-[24px] md:p-5'
          : 'md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:mt-2.5 md:bottom-auto md:w-[760px] md:overflow-visible md:rounded-[24px] md:p-5'
      }`}
    >
      {/* phones get a small header with the chosen dates and a close button */}
      <div className="mb-3 flex items-center justify-between md:hidden">
        <p className="text-[15px] font-semibold text-charcoal">
          {singleDate ? 'Select a date' : checkIn && checkOut ? `${formatDate(checkIn)} — ${formatDate(checkOut)}` : 'Select stay dates'}
        </p>
        <button type="button" onClick={() => onClose?.()} className="p-1 text-gray-400 hover:text-charcoal" aria-label="Close calendar">✕</button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-9">
        <DateGrid monthDate={visibleMonth} monthCells={cells} first />
        <div className="hidden md:block">
          <DateGrid monthDate={nextVisibleMonth} monthCells={nextMonthCells} />
        </div>
      </div>

      {shownHolidays.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shownHolidays.map(([iso, name]) => {
            const d = new Date(`${iso}T00:00:00`);
            return (
              <div key={iso} className="min-w-[116px] rounded-md bg-[#eaf4ff] px-3 py-2">
                <p className="text-[12px] font-semibold text-[#3b9cf5]">Holiday</p>
                <p className="mt-0.5 text-[12px] font-semibold text-charcoal">{d.getDate()} {SHORT_MONTHS[d.getMonth()]}</p>
                <p className="text-[11px] text-gray-600">{name}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <p className="hidden text-[12px] text-gray-500 md:block">
          {singleDate
            ? 'Choose one date for your booking.'
            : checkIn && checkOut
            ? `${formatDate(checkIn)} — ${formatDate(checkOut)}`
            : 'Choose check-in first, then check-out.'}
        </p>
        <div className="flex w-full gap-2.5 md:w-auto">
          <button
            type="button"
            onClick={() => onChange({ checkIn: '', checkOut: '' })}
            className="w-full rounded-full border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-charcoal !transform-none transition hover:bg-gray-50 md:w-auto"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="w-full rounded-full bg-[#1d2528] px-6 py-2 text-[13px] font-semibold text-white !transform-none transition hover:bg-black md:w-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile || desktopPosition) {
    return createPortal(pickerContent, document.body);
  }

  return pickerContent;
}
