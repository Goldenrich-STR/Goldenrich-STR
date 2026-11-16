import { useEffect, useMemo, useState } from 'react';
import { holidayAPI } from '../services/api';

/**
 * Indian holidays and festivals for the date pickers. The dates come from the backend (worked out for
 * every year), so the calendar follows the year. If the backend cannot be reached, this short list is used.
 */
const FALLBACK = {
  '2026-01-26': 'Republic Day',
  '2026-03-04': 'Holi',
  '2026-04-03': 'Good Friday',
  '2026-08-15': 'Independence Day',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-08': 'Diwali',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas',
  '2027-01-26': 'Republic Day',
  '2027-12-25': 'Christmas',
};

const cache = new Map(); // year -> { 'YYYY-MM-DD': name }
const pending = new Map(); // year -> promise

export const loadHolidays = (year) => {
  if (cache.has(year)) return Promise.resolve(cache.get(year));
  if (!pending.has(year)) {
    pending.set(
      year,
      holidayAPI
        .get(year)
        .then((res) => {
          const data = res?.data?.holidays || {};
          cache.set(year, data);
          return data;
        })
        .catch(() => {
          const fallback = Object.fromEntries(Object.entries(FALLBACK).filter(([iso]) => iso.startsWith(`${year}-`)));
          return fallback; // not cached, so the next open tries the server again
        })
        .finally(() => pending.delete(year))
    );
  }
  return pending.get(year);
};

/** { 'YYYY-MM-DD': 'Name' } for the given years. */
export const useHolidays = (years) => {
  const key = [...new Set(years)].sort().join(',');
  const [map, setMap] = useState(() => {
    const start = {};
    key.split(',').forEach((y) => { Object.assign(start, cache.get(Number(y)) || Object.fromEntries(Object.entries(FALLBACK).filter(([iso]) => iso.startsWith(`${y}-`)))); });
    return start;
  });

  useEffect(() => {
    let alive = true;
    Promise.all(key.split(',').map((y) => loadHolidays(Number(y)))).then((list) => {
      if (alive) setMap(Object.assign({}, ...list));
    });
    return () => { alive = false; };
  }, [key]);

  return useMemo(() => map, [map]);
};

export const shortDayMonth = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
};
