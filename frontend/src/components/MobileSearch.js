import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Building2, CalendarDays, Check, Clock, MapPin, Minus, Navigation, Plus, Search, SlidersHorizontal, ThumbsUp, Users, X } from 'lucide-react';
import { propertyAPI } from '../services/api';
import { useHolidays } from '../lib/holidays';

/**
 * Phone search, in the same steps people know from other booking apps:
 * a compact pill on the page -> "Search your Stay" screen -> location screen, full-screen calendar, guest sheet.
 * Phones only: render it inside a `lg:hidden` wrapper. The desktop search bars are not touched.
 */

const RECENT_KEY = 'xspace_mobile_recent_searches';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_CITIES = ['Nashik', 'Pune', 'Igatpuri', 'Lonavla', 'Alibaug', 'Karjat'];

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (iso) => new Date(`${iso}T00:00:00`);
const shortDate = (iso) => (iso ? `${fromISO(iso).getDate()} ${SHORT_MONTHS[fromISO(iso).getMonth()]}` : '');
const longDate = (iso) => {
  if (!iso) return '';
  const d = fromISO(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}, ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}`;
};
const nightsBetween = (a, b) => (a && b ? Math.max(0, Math.round((fromISO(b) - fromISO(a)) / 86400000)) : 0);

const buildMonth = (year, month) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(offset).fill(null);
  for (let d = 1; d <= days; d += 1) cells.push(new Date(year, month, d));
  return cells;
};

let placesCache = null;
const loadPlaces = async () => {
  if (placesCache) return placesCache;
  try {
    const res = await propertyAPI.searchProperties({ limit: 100 });
    const list = Array.isArray(res.data) ? res.data : res.data?.properties || [];
    placesCache = {
      cities: [...new Set(list.map((p) => String(p.city || '').trim()).filter(Boolean))],
      titles: [...new Set(list.map((p) => String(p.title || '').trim()).filter(Boolean))],
    };
  } catch (e) {
    placesCache = { cities: [], titles: [] };
  }
  return placesCache;
};

const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
};

const usePlaces = () => {
  const [places, setPlaces] = useState(placesCache || { cities: [], titles: [] });
  useEffect(() => {
    let alive = true;
    loadPlaces().then((value) => { if (alive) setPlaces(value); });
    return () => { alive = false; };
  }, []);
  return places;
};

/** Types "Search for a property in <city>" and cycles the cities, like the pill on other booking apps. */
const useTypedCity = (cities, active) => {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!active) { setTyped(''); return undefined; }
    const list = cities.length ? cities : DEFAULT_CITIES;
    let index = 0;
    let count = 0;
    let deleting = false;
    let id;
    const tick = () => {
      const target = list[index % list.length];
      if (!deleting) {
        count += 1;
        setTyped(target.slice(0, count));
        if (count >= target.length) { deleting = true; id = window.setTimeout(tick, 1500); return; }
        id = window.setTimeout(tick, 90);
      } else {
        count -= 1;
        setTyped(target.slice(0, count));
        if (count <= 0) { deleting = false; index += 1; id = window.setTimeout(tick, 300); return; }
        id = window.setTimeout(tick, 45);
      }
    };
    id = window.setTimeout(tick, 500);
    return () => window.clearTimeout(id);
  }, [cities, active]);
  return typed;
};

export const MobileSearchPill = ({ onOpen, value = {}, onFilters, className = '' }) => {
  const { cities } = usePlaces();
  const hasValue = Boolean(value.query);
  const typed = useTypedCity(cities, !hasValue);
  const summary = [value.checkIn && value.checkOut ? `${shortDate(value.checkIn)} - ${shortDate(value.checkOut)}` : '', value.guests ? `${value.guests} guest${value.guests > 1 ? 's' : ''}` : ''].filter(Boolean).join('  |  ');
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open search"
        data-testid="mobile-search-pill"
        className="min-w-0 flex-1 rounded-full bg-gradient-to-r from-[#4285F4] via-[#D96570] to-[#F4B400] p-[1.5px] !transform-none shadow-[0_8px_24px_rgba(20,20,20,0.18)]"
      >
        <span className="flex h-[52px] items-center gap-3 rounded-full bg-white pl-5 pr-4 text-left">
          <span className="min-w-0 flex-1 truncate text-[14px] text-[#5f6368]">
            {hasValue ? (
              <>
                <span className="font-semibold text-charcoal">{value.query}</span>
                {summary && <span className="ml-2 text-[12px] text-[#80868B]">{summary}</span>}
              </>
            ) : (
              <>Search for a property in <span className="font-semibold text-charcoal">{typed}</span><span className="ml-0.5 inline-block h-[15px] w-px translate-y-[2px] animate-pulse bg-[#9B72CB]" /></>
            )}
          </span>
          <Search className="h-5 w-5 shrink-0 text-charcoal" />
        </span>
      </button>
      {onFilters && (
        <button type="button" onClick={onFilters} aria-label="Filters" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-charcoal !transform-none shadow-[0_8px_24px_rgba(20,20,20,0.12)]">
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const Row = ({ icon: Icon, label, value, onClick, placeholder }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-[#f6f6f6] px-4 py-3.5 text-left !transform-none">
    <Icon className="h-5 w-5 shrink-0 text-charcoal" />
    <span className="min-w-0 flex-1">
      <span className="block text-[12px] text-[#6b7280]">{label}</span>
      <span className={`block truncate text-[15px] font-semibold ${value ? 'text-charcoal' : 'text-[#9aa0a6]'}`}>{value || placeholder}</span>
    </span>
  </button>
);

const Screen = ({ children, className = '' }) => (
  <div className={`fixed inset-0 z-[130] flex flex-col bg-white ${className}`}>{children}</div>
);

const TopBar = ({ title, onBack }) => (
  <div className="flex items-center gap-3 px-4 pb-3 pt-4">
    <button type="button" onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full !transform-none hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-charcoal" /></button>
    <h2 className="text-[17px] font-semibold text-charcoal">{title}</h2>
  </div>
);

export const MobileSearchSheet = ({ open, onClose, value = {}, onSearch, onNearMe, minDate }) => {
  const places = usePlaces();
  const today = minDate || toISO(new Date());
  const [view, setView] = useState('home');
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [draft, setDraft] = useState({ query: '', city: '', checkIn: '', checkOut: '', adults: 2, children: 0 });
  const [typing, setTyping] = useState('');
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    if (!open) return;
    setView('home');
    setGuestsOpen(false);
    setRecent(readRecent());
    setDraft({
      query: value.query || '',
      city: value.city || '',
      checkIn: value.checkIn || '',
      checkOut: value.checkOut || '',
      adults: value.adults || Math.max(1, (value.guests || 2) - (value.children || 0)),
      children: value.children || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const patch = (next) => setDraft((d) => ({ ...d, ...next }));

  const cityList = places.cities.length ? places.cities : DEFAULT_CITIES;
  const q = typing.trim().toLowerCase();
  const matchedCities = q ? cityList.filter((c) => c.toLowerCase().includes(q)) : cityList;
  const matchedTitles = q ? places.titles.filter((t) => t.toLowerCase().includes(q)).slice(0, 6) : [];

  const pickPlace = (text, city = '') => {
    patch({ query: text, city });
    setTyping('');
    setView('home');
  };

  const submit = () => {
    const text = (draft.query || '').trim();
    if (text) {
      const next = [text, ...readRecent().filter((r) => r !== text)].slice(0, 5);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (e) { /* storage may be blocked */ }
    }
    onSearch({ ...draft, query: text, guests: draft.adults + draft.children });
    onClose();
  };

  // ---------------------------------------------------------------- calendar state
  const months = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 12 }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
  }, []);
  const thisYear = new Date().getFullYear();
  const HOLIDAYS = useHolidays([thisYear, thisYear + 1]);
  const holidayChips = Object.entries(HOLIDAYS).filter(([iso]) => iso >= today).slice(0, 4);
  const pickDay = (iso) => {
    if (!draft.checkIn || (draft.checkIn && draft.checkOut)) patch({ checkIn: iso, checkOut: '' });
    else if (iso > draft.checkIn) patch({ checkOut: iso });
    else patch({ checkIn: iso, checkOut: '' });
  };
  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  const calendarRef = useRef(null);
  const goHomeFromCalendar = useCallback(() => setView('home'), []);

  if (!open) return null;

  let screen;
  if (view === 'location') {
    screen = (
      <Screen>
        <div className="flex items-center gap-3 px-4 pt-4">
          <button type="button" onClick={() => { setTyping(''); setView('home'); }} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-100 !transform-none"><ArrowLeft className="h-5 w-5 text-charcoal" /></button>
          <input
            autoFocus
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && typing.trim()) pickPlace(typing.trim(), matchedCities.find((c) => c.toLowerCase() === typing.trim().toLowerCase()) || ''); }}
            placeholder="Search Location/City/Villas"
            className="h-11 min-w-0 flex-1 rounded-full !border-0 bg-[#f1f3f4] px-4 text-[15px] text-charcoal !shadow-none !outline-none !ring-0 placeholder:text-[#80868B] focus:!ring-0"
          />
        </div>
        <div className="mt-2 flex-1 overflow-y-auto pb-6">
          {onNearMe && !q && (
            <button type="button" onClick={() => { onNearMe(); onClose(); }} className="flex w-full items-center gap-3 px-4 py-3 text-left !transform-none">
              <Navigation className="h-5 w-5 text-charcoal" />
              <span><span className="block text-[12px] text-[#6b7280]">Use current location</span><span className="block text-[15px] font-semibold text-charcoal">Near me</span></span>
            </button>
          )}
          {!q && recent.length > 0 && (
            <div className="px-4 pb-3">
              <p className="mb-2 text-[12px] font-medium text-[#6b7280]">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => pickPlace(r, cityList.find((c) => c.toLowerCase() === r.toLowerCase()) || '')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f3f4] px-3 py-1.5 text-[13px] text-charcoal !transform-none"><Clock className="h-3.5 w-3.5 text-[#80868B]" />{r}</button>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-gray-200">
            {q && !matchedCities.some((c) => c.toLowerCase() === q) && (
              <button type="button" onClick={() => pickPlace(typing.trim())} className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3.5 text-left !transform-none">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f3f4]"><Search className="h-4 w-4 text-[#80868B]" /></span>
                <span className="flex-1 text-[15px] text-charcoal">Search for "{typing.trim()}"</span>
              </button>
            )}
            {matchedCities.map((c) => (
              <button key={c} type="button" onClick={() => pickPlace(c, c)} className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3.5 text-left !transform-none">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f3f4]"><MapPin className="h-4 w-4 text-[#9aa0a6]" /></span>
                <span className="flex-1 text-[15px] text-charcoal">{c}</span>
                <span className="text-[13px] text-[#80868B]">City</span>
              </button>
            ))}
            {matchedTitles.map((t) => (
              <button key={t} type="button" onClick={() => pickPlace(t)} className="flex w-full items-center gap-3 border-b border-gray-200 px-4 py-3.5 text-left !transform-none">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f3f4]"><Building2 className="h-4 w-4 text-[#9aa0a6]" /></span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-charcoal">{t}</span>
                <span className="text-[13px] text-[#80868B]">Property</span>
              </button>
            ))}
            {q && !matchedCities.length && !matchedTitles.length && <p className="px-4 py-6 text-center text-[14px] text-[#80868B]">No matching place yet. Tap the first row to search for what you typed.</p>}
          </div>
        </div>
      </Screen>
    );
  } else if (view === 'dates') {
    screen = (
      <Screen>
        <TopBar title={draft.checkIn && !draft.checkOut ? 'Select Check-Out Date' : 'Select Check-In Date'} onBack={goHomeFromCalendar} />
        {holidayChips.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {holidayChips.map(([iso, name]) => (
              <div key={iso} className="min-w-[112px] shrink-0 rounded-md bg-[#eaf4ff] px-3 py-2">
                <p className="text-[12px] font-semibold text-[#3b9cf5]">Holiday</p>
                <p className="mt-0.5 text-[12px] font-semibold text-charcoal">{shortDate(iso)}</p>
                <p className="text-[11px] text-gray-600">{name}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-7 border-b border-gray-200 px-4 pb-2 text-center text-[13px] font-medium">
          {WEEKDAYS.map((d, i) => <span key={d} className={i >= 5 ? 'text-[#e5484d]' : 'text-charcoal'}>{d}</span>)}
        </div>
        <div ref={calendarRef} className="flex-1 overflow-y-auto px-4 pb-4">
          {months.map((m) => (
            <div key={`${m.getFullYear()}-${m.getMonth()}`} className="border-b border-gray-200 pb-3">
              <p className="py-4 text-[15px] font-semibold text-charcoal">{MONTHS[m.getMonth()]} {m.getFullYear()}</p>
              <div className="grid grid-cols-7">
                {buildMonth(m.getFullYear(), m.getMonth()).map((d, i) => {
                  if (!d) return <span key={`e${i}`} className="h-12" />;
                  const iso = toISO(d);
                  const past = iso < today;
                  const start = iso === draft.checkIn;
                  const end = iso === draft.checkOut;
                  const inRange = draft.checkIn && draft.checkOut && iso > draft.checkIn && iso < draft.checkOut;
                  const holiday = Boolean(HOLIDAYS[iso]);
                  return (
                    <div key={iso} className={`flex h-12 items-center justify-center ${inRange ? 'bg-[#e6f1fd]' : ''} ${start && draft.checkOut ? 'rounded-l-full bg-[#e6f1fd]' : ''} ${end ? 'rounded-r-full bg-[#e6f1fd]' : ''}`}>
                      <button
                        type="button"
                        disabled={past}
                        onClick={() => pickDay(iso)}
                        className={`grid h-10 w-10 place-items-center rounded-full text-[15px] !transform-none ${start || end ? 'bg-[#1d2528] font-semibold text-white' : past ? 'text-gray-400' : holiday ? 'font-medium text-[#3b9cf5]' : 'font-medium text-charcoal'} ${iso === today && !(start || end) ? 'underline decoration-2 underline-offset-[6px]' : ''}`}
                      >
                        {d.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 bg-[#f6f7f8] px-4 pb-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2"><p className="text-[11px] text-[#6b7280]">Check-In Date</p><p className="truncate text-[14px] font-semibold text-charcoal">{draft.checkIn ? longDate(draft.checkIn) : '-'}</p></div>
            <span className="shrink-0 rounded-full bg-[#e6f1fd] px-3 py-1.5 text-[11px] font-medium text-[#3b9cf5]">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
            <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2"><p className="text-[11px] text-[#6b7280]">Check-Out Date</p><p className="truncate text-[14px] font-semibold text-charcoal">{draft.checkOut ? longDate(draft.checkOut) : '-'}</p></div>
          </div>
          <button type="button" disabled={!draft.checkIn} onClick={() => setView('home')} className="mt-3 h-12 w-full rounded-xl bg-[#1d2528] text-[16px] font-semibold text-white !transform-none disabled:opacity-50">Next</button>
        </div>
      </Screen>
    );
  } else {
    const guests = draft.adults + draft.children;
    screen = (
      <Screen>
        <TopBar title="Search your Stay" onBack={onClose} />
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-1">
          <Row icon={MapPin} label="Location/Villas/Landmark" value={draft.query} placeholder="Select location" onClick={() => setView('location')} />
          <button type="button" onClick={() => setView('dates')} className="flex w-full items-center gap-3 rounded-2xl bg-[#f6f6f6] px-4 py-3.5 text-left !transform-none">
            <CalendarDays className="h-5 w-5 shrink-0 text-charcoal" />
            <span className="grid min-w-0 flex-1 grid-cols-2 gap-3">
              <span className="min-w-0"><span className="block text-[12px] text-[#6b7280]">Check-In Date</span><span className={`block truncate text-[15px] font-semibold ${draft.checkIn ? 'text-charcoal' : 'text-[#9aa0a6]'}`}>{draft.checkIn ? longDate(draft.checkIn) : 'Select date'}</span></span>
              <span className="min-w-0 border-l border-gray-300 pl-3"><span className="block text-[12px] text-[#6b7280]">Check-Out Date</span><span className={`block truncate text-[15px] font-semibold ${draft.checkOut ? 'text-charcoal' : 'text-[#9aa0a6]'}`}>{draft.checkOut ? longDate(draft.checkOut) : 'Select date'}</span></span>
            </span>
          </button>
          <Row icon={Users} label="Total Guests" value={`${guests} Guest${guests > 1 ? 's' : ''}`} onClick={() => setGuestsOpen(true)} />
        </div>
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <button type="button" onClick={submit} className="h-12 w-full rounded-xl bg-[#1d2528] text-[16px] font-semibold text-white !transform-none">Search Stays</button>
        </div>
        {guestsOpen && (
          <div className="absolute inset-0 z-10 flex items-end bg-black/50" onClick={() => setGuestsOpen(false)}>
            <div className="w-full rounded-t-3xl bg-white px-5 pb-5 pt-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="font-megafield text-[20px] text-charcoal">Total Guests</h3>
                <button type="button" onClick={() => setGuestsOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 !transform-none"><X className="h-4 w-4" /></button>
              </div>
              {[['adults', 'Adults', 'Age 13 years and more', 1], ['children', 'Children', 'Age 2-12 years', 0]].map(([key, label, hint, min]) => (
                <div key={key} className="flex items-center justify-between py-4">
                  <div><p className="text-[16px] font-semibold text-charcoal">{label}</p><p className="text-[12px] text-[#6b7280]">{hint}</p></div>
                  <div className="flex items-center gap-4">
                    <button type="button" disabled={draft[key] <= min} onClick={() => patch({ [key]: draft[key] - 1 })} className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 !transform-none disabled:opacity-40" aria-label={`Fewer ${label}`}><Minus className="h-4 w-4" /></button>
                    <span className="w-6 text-center text-[16px] font-medium">{String(draft[key]).padStart(2, '0')}</span>
                    <button type="button" onClick={() => patch({ [key]: draft[key] + 1 })} className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 !transform-none" aria-label={`More ${label}`}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setGuestsOpen(false)} className="mt-1 h-12 w-full rounded-xl bg-[#1d2528] text-[16px] font-semibold text-white !transform-none">Done</button>
            </div>
          </div>
        )}
      </Screen>
    );
  }

  return createPortal(screen, document.body);
};

/**
 * Phone filters as a full page: selected chips, sort cards, price range, type, size, amenities, instant and pet toggles.
 * Nothing changes on the results until "Apply Filter" is pressed.
 */
const SORT_CARDS = [
  { value: 'recommended', title: 'Popular', hint: 'Most Loved', icon: ThumbsUp },
  { value: 'price_asc', title: 'Price', hint: 'Low to High', icon: ArrowUp },
  { value: 'price_desc', title: 'Price', hint: 'High To Low', icon: ArrowDown },
  { value: 'newest', title: 'Newest', hint: 'Just Listed', icon: Clock },
];
const PRICE_QUICK = [
  { label: 'Under ₹5,000', min: '', max: '5000' },
  { label: '₹5,000 - ₹15,000', min: '5000', max: '15000' },
  { label: '₹15,000 - ₹30,000', min: '15000', max: '30000' },
  { label: '₹30,000+', min: '30000', max: '' },
];
const EMPTY_DRAFT = { property_type: '', bhk_type: '', min_price: '', max_price: '', amenities: [], instant_booking: false, pet_friendly: false, sort: 'recommended' };

const Section = ({ title, hint, children }) => (
  <section className="border-b border-gray-200 px-4 py-5">
    <h3 className="text-[17px] font-semibold text-charcoal">{title}</h3>
    {hint && <p className="mt-0.5 text-[12px] text-[#6b7280]">{hint}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium !transform-none transition ${active ? 'border-[#1d2528] bg-[#1d2528] text-white' : 'border-gray-300 bg-white text-charcoal'}`}
  >
    {active && <Check className="h-3.5 w-3.5" />}
    {children}
  </button>
);

const Switch = ({ on, onChange, title, hint }) => (
  <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-2 text-left !transform-none">
    <span><span className="block text-[15px] font-medium text-charcoal">{title}</span>{hint && <span className="block text-[12px] text-[#6b7280]">{hint}</span>}</span>
    <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-[#1d2528]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
);

export const MobileFiltersSheet = ({ open, onClose, filters, propertyTypes = [], bhkOptions = [], amenities = [], lockType = false, onApply }) => {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  useEffect(() => {
    if (!open) return;
    setDraft({
      property_type: filters.property_type || '',
      bhk_type: filters.bhk_type || '',
      min_price: filters.min_price || '',
      max_price: filters.max_price || '',
      amenities: filters.amenities || [],
      instant_booking: Boolean(filters.instant_booking),
      pet_friendly: Boolean(filters.pet_friendly),
      sort: filters.sort || 'recommended',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  const patch = (next) => setDraft((d) => ({ ...d, ...next }));
  const typeLabel = propertyTypes.find((o) => o.value === draft.property_type)?.label;
  const bhkLabel = bhkOptions.find((o) => o.value === draft.bhk_type)?.label;
  const amenityLabel = (value) => amenities.find((a) => a.value === value)?.label || value;
  const priceChip = draft.min_price || draft.max_price ? `₹${draft.min_price || 0} - ${draft.max_price ? `₹${draft.max_price}` : 'any'}` : '';
  const sortCard = SORT_CARDS.find((c) => c.value === draft.sort);

  const selected = [
    ...(draft.property_type && !lockType ? [{ key: 'type', label: typeLabel, clear: () => patch({ property_type: '' }) }] : []),
    ...(draft.bhk_type ? [{ key: 'bhk', label: bhkLabel, clear: () => patch({ bhk_type: '' }) }] : []),
    ...(priceChip ? [{ key: 'price', label: priceChip, clear: () => patch({ min_price: '', max_price: '' }) }] : []),
    ...draft.amenities.map((a) => ({ key: `a-${a}`, label: amenityLabel(a), clear: () => patch({ amenities: draft.amenities.filter((x) => x !== a) }) })),
    ...(draft.instant_booking ? [{ key: 'ib', label: 'Instant booking', clear: () => patch({ instant_booking: false }) }] : []),
    ...(draft.pet_friendly ? [{ key: 'pet', label: 'Pet friendly', clear: () => patch({ pet_friendly: false }) }] : []),
    ...(draft.sort !== 'recommended' && sortCard ? [{ key: 'sort', label: `${sortCard.title}: ${sortCard.hint}`, clear: () => patch({ sort: 'recommended' }) }] : []),
  ];

  const clearAll = () => setDraft((d) => ({ ...EMPTY_DRAFT, property_type: lockType ? d.property_type : '' }));
  const apply = () => { onApply(draft); onClose(); };

  return createPortal(
    <Screen>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-full !transform-none hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-charcoal" /></button>
          <h2 className="text-[17px] font-semibold text-charcoal">Filters</h2>
        </div>
        <button type="button" onClick={clearAll} className="text-[14px] font-semibold text-charcoal underline underline-offset-4 !transform-none">Clear</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Selected Filters">
          <div className="flex flex-wrap gap-2">
            {selected.length === 0 && <span className="rounded-md bg-[#f1f3f4] px-3 py-1.5 text-[13px] text-charcoal">All Results</span>}
            {selected.map((chip) => (
              <button key={chip.key} type="button" onClick={chip.clear} className="inline-flex items-center gap-1.5 rounded-md bg-[#f1f3f4] px-3 py-1.5 text-[13px] text-charcoal !transform-none">
                {chip.label}<X className="h-3.5 w-3.5 text-[#6b7280]" />
              </button>
            ))}
          </div>
        </Section>

        <Section title="Relevance" hint="Sort by">
          <div className="grid grid-cols-2 gap-3">
            {SORT_CARDS.map(({ value, title, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ sort: value })}
                className={`flex flex-col items-center gap-1 rounded-md border px-3 py-3 !transform-none ${draft.sort === value ? 'border-[#3b9cf5] bg-[#eaf4ff]' : 'border-gray-300 bg-white'}`}
              >
                <Icon className="h-6 w-6 text-charcoal" />
                <span className="text-[14px] font-semibold text-charcoal">{title}</span>
                <span className="text-[11px] text-[#6b7280]">{hint}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Price Range" hint="Per night, in rupees">
          <div className="flex flex-wrap gap-2">
            {PRICE_QUICK.map((q) => (
              <Chip key={q.label} active={draft.min_price === q.min && draft.max_price === q.max} onClick={() => patch({ min_price: q.min, max_price: q.max })}>{q.label}</Chip>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[['min_price', 'Min'], ['max_price', 'Max']].map(([key, label]) => (
              <label key={key} className="flex h-12 items-center gap-1 rounded-md border border-gray-300 bg-[#f6f6f6] px-3">
                <span className="text-[15px] text-charcoal">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                  placeholder={label}
                  aria-label={`${label} price`}
                  className="h-full w-full min-w-0 !border-0 bg-transparent text-[15px] text-charcoal !shadow-none !outline-none !ring-0 placeholder:text-[#9aa0a6] focus:!ring-0"
                />
              </label>
            ))}
          </div>
        </Section>

        {!lockType && propertyTypes.length > 0 && (
          <Section title="Property Type">
            <div className="flex flex-wrap gap-2">
              {propertyTypes.filter((o) => o.value).map((o) => <Chip key={o.value} active={draft.property_type === o.value} onClick={() => patch({ property_type: draft.property_type === o.value ? '' : o.value })}>{o.label}</Chip>)}
            </div>
          </Section>
        )}

        {bhkOptions.length > 0 && (
          <Section title="Size / Configuration">
            <div className="flex flex-wrap gap-2">
              {bhkOptions.filter((o) => o.value).map((o) => <Chip key={o.value} active={draft.bhk_type === o.value} onClick={() => patch({ bhk_type: draft.bhk_type === o.value ? '' : o.value })}>{o.label}</Chip>)}
            </div>
          </Section>
        )}

        {amenities.length > 0 && (
          <Section title="Amenities">
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <Chip key={a.value} active={draft.amenities.includes(a.value)} onClick={() => patch({ amenities: draft.amenities.includes(a.value) ? draft.amenities.filter((x) => x !== a.value) : [...draft.amenities, a.value] })}>{a.label}</Chip>
              ))}
            </div>
          </Section>
        )}

        <Section title="Booking">
          <Switch on={draft.instant_booking} onChange={(v) => patch({ instant_booking: v })} title="Instant Booking" hint="Book without waiting for host approval" />
          <Switch on={draft.pet_friendly} onChange={(v) => patch({ pet_friendly: v })} title="Pet Friendly" hint="Properties that welcome pets" />
        </Section>
      </div>

      <div className="flex items-center gap-4 border-t border-gray-100 bg-white px-4 pb-4 pt-3">
        <button type="button" onClick={clearAll} className="px-3 py-3 text-[13px] font-bold uppercase tracking-wide text-charcoal !transform-none">Clear All</button>
        <button type="button" onClick={apply} className="h-12 flex-1 rounded-md bg-black text-[14px] font-bold uppercase tracking-wide text-white !transform-none">Apply Filter</button>
      </div>
    </Screen>,
    document.body
  );
};
