import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, subscriptionAPI, uploadAPI, couponAPI, getImageUrl, loadRazorpaySdk } from '../services/api';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { getAmenityIcon, formatAmenityLabel, formatAddress } from '../lib/displayLabels';
import { listingWizardNavigation } from '../utils/listingWizardSteps';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  BadgePercent,
  Tag,
  Info,
  Home,
  LockKeyhole,
  Headphones,
  Loader2,
  Upload,
  Trash2,
  CreditCard,
  Copy,
  Sparkles,
  Plus,
  X,
  Pencil,
  Save,
  Wifi,
  Wind,
  Car,
  Utensils,
  Waves,
  Dumbbell,
  Tv,
  WashingMachine,
  Flame,
  Coffee,
  Printer,
  Bath,
  Monitor,
  Presentation,
  BatteryCharging,
  Mic2,
  Image as ImageIcon,
  MapPin,
  Sun,
  SunDim,
  Moon,
  Clock,
  Video,
  Play,
  QrCode,
  Smartphone,
  Expand,
} from 'lucide-react';
import HostSupportWidget from '../components/HostSupportWidget';
import HostWorkspaceShell from '../components/HostWorkspaceShell';

const SUBSCRIPTION_UPI = {
  id: 'goldenrich123@idfcbank',
  name: 'GOLDEN RICH FINANCIAL REAL ESTATE SOLUTIONS PVT LTD',
};

const formatSubscriptionAmount = (amount) => {
  const value = Number(amount) || 0;
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

const buildSubscriptionUpiUrl = ({ amount, note, subscriptionId }) => {
  const params = new URLSearchParams({
    pa: SUBSCRIPTION_UPI.id,
    pn: SUBSCRIPTION_UPI.name,
    am: Number(amount || 0).toFixed(2),
    cu: 'INR',
    tn: note || `X-Space360 subscription ${subscriptionId || ''}`.trim(),
  });
  return `upi://pay?${params.toString()}`;
};

const buildQrImageUrl = (upiUrl) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(upiUrl)}`;

const CATEGORY_DATA = {
  residential: {
    propertyTypes: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'villa', label: 'Villa' },
      { value: 'homestay', label: 'Homestay' },
      { value: 'bungalow', label: 'Bungalow' },
      { value: 'studio', label: 'Studio' },
      { value: 'independent_house', label: 'Private House' },
      { value: 'farmhouse', label: 'Farmhouse' },
    ],
    bhkTypes: [
      { value: 'studio', label: 'Studio' },
      { value: '1bhk', label: '1 BHK' },
      { value: '2bhk', label: '2 BHK' },
      { value: '3bhk', label: '3 BHK' },
      { value: '4bhk', label: '4 BHK' },
      { value: '5bhk', label: '5+ BHK' },
    ]
  },
  commercial: {
    propertyTypes: [
      { value: 'private_office', label: 'Private Office' },
      { value: 'co_working', label: 'Co-working' },
      { value: 'meeting_room', label: 'Meeting Room' },
      { value: 'conference_room', label: 'Conference Room' },
      { value: 'shop', label: 'Shop/Showroom' },
      { value: 'warehouse', label: 'Warehouse' },
    ],
    bhkTypes: [
      { value: 'small', label: 'Small (under 500 sqft)' },
      { value: 'medium', label: 'Medium (500-2000 sqft)' },
      { value: 'large', label: 'Large (2000-5000 sqft)' },
      { value: 'extra_large', label: 'Extra Large (5000+ sqft)' },
      { value: 'custom', label: 'Custom Size' },
    ]
  },
  event_venue: {
    propertyTypes: [
      { value: 'banquet_hall', label: 'Banquet' },
      { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
      { value: 'wedding_venue', label: 'Wedding Venue' },
    ],
    bhkTypes: [
      { value: 'small_event', label: 'Mini (up to 50 guests)' },
      { value: 'medium_event', label: 'Standard (50-200 guests)' },
      { value: 'large_event', label: 'Grand (200-500 guests)' },
      { value: 'mega_event', label: 'Mega (500+ guests)' },
    ]
  }
};

const PHOTO_CATEGORIES = [
  'Living area', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Exterior', 'Other'
];

const COMMON_AMENITIES = [
  'wifi', 'ac', 'parking', 'kitchen', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms', 'washer', 'heating', 'workspace',
  'live_music', 'food_court', 'birthday_celebration', 'indoor_games',
];

const CATEGORY_AMENITIES = {
  residential: [
    { value: 'wifi', label: 'WiFi' },
    { value: 'ac', label: 'Air Conditioning' },
    { value: 'parking', label: 'Parking Space' },
    { value: 'kitchen', label: 'Fully-Equipped Kitchen' },
    { value: 'gym', label: 'Fitness Center/Gym' },
    { value: 'tv', label: 'Smart TV' },
    { value: 'washer', label: 'Washing Machine' },
    { value: 'heating', label: 'Heating System' },
    { value: 'fireplace', label: 'Indoor Fireplace' },
    { value: 'live_music', label: 'Live Music' },
    { value: 'food_court', label: 'Food Court Available' },
    { value: 'birthday_celebration', label: 'Birthday Celebration' },
    { value: 'indoor_games', label: 'Indoor Games' },
  ],
  commercial: [
    { value: 'wifi', label: 'Enterprise High-speed WiFi' },
    { value: 'ac', label: 'Centralized AC / Air Conditioning' },
    { value: 'parking', label: 'Reserved Business Parking' },
    { value: 'printer', label: 'High-speed Printer & Scanner' },
    { value: 'coffee', label: 'Coffee & Tea Station' },
    { value: 'restrooms', label: 'Executive Restrooms' },
    { value: 'workspace', label: 'Dedicated Workstations' },
    { value: 'projector', label: 'HD Projector & Screen' },
    { value: 'whiteboard', label: 'Collaboration Whiteboards' },
    { value: 'power_backup', label: '24/7 Power Generator Backup' },
  ],
  event_venue: [
    { value: 'wifi', label: 'High-capacity Guest WiFi' },
    { value: 'ac', label: 'Banquet Hall AC' },
    { value: 'parking', label: 'Valet & Guest Parking' },
    { value: 'av_system', label: 'Professional Sound & AV System' },
    { value: 'stage', label: 'Performance Stage / Podium' },
    { value: 'catering', label: 'Catering Prep Kitchen' },
    { value: 'bar', label: 'Premium Bar Lounge Setup' },
    { value: 'rooftop', label: 'Scenic Rooftop Access' },
    { value: 'changing_rooms', label: 'VIP/Green Changing Rooms' },
    { value: 'security', label: 'Professional Event Security' },
  ]
};



const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'location', label: 'Location' },
  { key: 'pricing', label: 'Pricing & Rules' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'photos', label: 'Photos' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'review', label: 'Review & Pay' },
];

const HOST_MANAGE_EDITABLE_STEP_KEYS = ['pricing', 'amenities', 'photos'];
const HOST_MANAGE_EDITABLE_STATUSES = ['pending_verification', 'under_review', 'live'];

const PRICING_CYCLE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'day', label: 'Per day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const getTargetSubscriptionPlanType = (category, bhkType) => {
  if (category === 'commercial') return 'commercial';
  if (category === 'event_venue') return 'event_venue';
    const map = {
      studio: 'studio',
      '1bhk': '1bhk',
      '2bhk': '2bhk',
      '3bhk': '3bhk',
      '4bhk': '4bhk',
      '5bhk': '4bhk_plus',
    };
  return map[bhkType] || '1bhk';
};

const subscriptionSqftMatches = (rangeText, areaSqft) => {
  if (!rangeText || !areaSqft) return true;
  let text = String(rangeText).toLowerCase().replace(/sq\.?ft/g, '').replace(/,/g, '').replace(/\s/g, '');
  const aliases = {
    small: '<500',
    medium: '500-2000',
    large: '2000-5000',
    extra_large: '5000+',
    extralarge: '5000+',
  };
  text = aliases[text] || text;
  const area = Number(areaSqft);
  if (!Number.isFinite(area) || area <= 0) return true;
  if (text.startsWith('<=')) return area <= Number(text.slice(2));
  if (text.startsWith('>=')) return area >= Number(text.slice(2));
  if (text.startsWith('<')) return area < Number(text.slice(1));
  if (text.startsWith('>')) return area > Number(text.slice(1));
  if (text.endsWith('+')) return area >= Number(text.slice(0, -1));
  if (text.includes('-')) {
    const [start, end] = text.split('-').map(Number);
    return Number.isFinite(start) && Number.isFinite(end) ? area >= start && area <= end : true;
  }
  return true;
};

const VEG_ITEMS = [
  'Chaat Counter', 'Welcome Drinks', 'Soups', 'Veg Starter', 'Veg Main Courses', 
  'Salads', 'Raita', 'Dal', 'Rice/Biryani', 'Assorted Breads/Rotis', 'Desserts'
];

const NON_VEG_ITEMS = [
  'Chaat Counter', 'Welcome Drinks', 'Soups', 'Veg Starter', 'Non-Veg Starter', 
  'Veg Main Courses', 'Salads', 'Non-Veg Main Courses', 'Raita', 'Dal', 
  'Rice/Biryani', 'Assorted Breads/Rotis', 'Desserts'
];

const DEFAULT_VEG_ITEMS_OBJ = {
  'Chaat Counter': '0', 'Welcome Drinks': '0', 'Soups': '0', 'Veg Starter': '0', 'Veg Main Courses': '0', 
  'Salads': '0', 'Raita': '0', 'Dal': '0', 'Rice/Biryani': '0', 'Assorted Breads/Rotis': '0', 'Desserts': '0'
};

const DEFAULT_NON_VEG_ITEMS_OBJ = {
  'Chaat Counter': '0', 'Welcome Drinks': '0', 'Soups': '0', 'Veg Starter': '0', 'Non-Veg Starter': '0', 
  'Veg Main Courses': '0', 'Salads': '0', 'Non-Veg Main Courses': '0', 'Raita': '0', 'Dal': '0', 
  'Rice/Biryani': '0', 'Assorted Breads/Rotis': '0', 'Desserts': '0'
};

const mergePackagesWithDefaults = (loadedPackages) => {
  const pkgs = [...(loadedPackages || [])];
  
  // Veg
  let vegPkg = pkgs.find(p => p.type === 'veg');
  if (!vegPkg) {
    vegPkg = { type: 'veg', items: { ...DEFAULT_VEG_ITEMS_OBJ } };
    pkgs.push(vegPkg);
  } else {
    vegPkg.items = { ...DEFAULT_VEG_ITEMS_OBJ, ...vegPkg.items };
  }

  // Non Veg
  let nonVegPkg = pkgs.find(p => p.type === 'non_veg');
  if (!nonVegPkg) {
    nonVegPkg = { type: 'non_veg', items: { ...DEFAULT_NON_VEG_ITEMS_OBJ } };
    pkgs.push(nonVegPkg);
  } else {
    nonVegPkg.items = { ...DEFAULT_NON_VEG_ITEMS_OBJ, ...nonVegPkg.items };
  }

  return pkgs;
};

const EditableItemName = ({ initialName, onRename }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleBlur = () => {
    if (name.trim() && name !== initialName) {
      onRename(name);
    } else {
      setName(initialName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="text-sm font-medium text-charcoal-muted bg-transparent border-none hover:bg-gray-50/50 focus:bg-gray-50/80 focus:ring-0 focus:border-gray-200 rounded px-2 py-1 w-48 transition-colors outline-none"
    />
  );
};

/**
 * One clear dropdown for a time of day ("9:00 AM", "9:30 AM", ... every 30 minutes).
 * It replaces the three tiny hour / minute / AM-PM boxes that looked empty.
 * format12: value is "09:30 AM" (venue timings). Otherwise "09:30" in 24-hour form (check-in / check-out).
 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const h24 = Math.floor(index / 2);
  const minute = index % 2 ? 30 : 0;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  const mm = String(minute).padStart(2, '0');
  return { v24: `${String(h24).padStart(2, '0')}:${mm}`, v12: `${String(h12).padStart(2, '0')}:${mm} ${period}`, label: `${h12}:${mm} ${period}` };
});

const timeTo24 = (value) => {
  const text = String(value || '').trim();
  const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10) % 12;
    if (match12[3].toUpperCase() === 'PM') hours += 12;
    return `${String(hours).padStart(2, '0')}:${match12[2]}`;
  }
  const match24 = text.match(/^(\d{1,2}):(\d{2})/);
  return match24 ? `${String(parseInt(match24[1], 10)).padStart(2, '0')}:${match24[2]}` : '';
};

const TimeSelect = ({ value, onChange, format12 = true, placeholder = 'Select time', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const current = timeTo24(value);
  const options = current && !TIME_OPTIONS.some((option) => option.v24 === current)
    ? [...TIME_OPTIONS, { v24: current, v12: value, label: value }].sort((a, b) => a.v24.localeCompare(b.v24))
    : TIME_OPTIONS;
  const selected = options.find((option) => option.v24 === current);

  const openList = () => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    // a scroll inside the list itself must not close it; only the page scrolling or resizing does
    const close = (event) => { if (event?.target instanceof Node && listRef.current?.contains(event.target)) return; setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onPointer = (event) => {
      if (buttonRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    // bring the chosen time (or 9 AM) into view
    const target = listRef.current?.querySelector('[data-selected="true"]') || listRef.current?.querySelector('[data-default="true"]');
    if (target && listRef.current) listRef.current.scrollTop = target.offsetTop - (listRef.current.clientHeight - target.clientHeight) / 2;
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const pick = (option) => {
    onChange(option ? (format12 ? option.v12 : option.v24) : '');
    setOpen(false);
  };

  const listHeight = 240;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const openUp = rect && spaceBelow < listHeight + 12 && rect.top > spaceBelow;
  const panelStyle = rect ? {
    position: 'fixed',
    left: rect.left,
    width: Math.max(rect.width, 150),
    zIndex: 1000,
    ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
  } : null;

  return (
    <div className={className}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm outline-none transition ${open ? 'border-slate-700 ring-2 ring-slate-200' : 'border-gray-300 hover:border-slate-400 focus-visible:border-slate-700'}`}
      >
        <Clock className="h-4 w-4 flex-shrink-0 text-charcoal-light" />
        <span className={`flex-1 truncate text-sm ${selected ? 'font-semibold text-charcoal' : 'text-charcoal-light'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-charcoal-light transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && panelStyle && createPortal(
        <div ref={listRef} role="listbox" style={{ ...panelStyle, maxHeight: listHeight }} className="overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          <button type="button" onClick={() => pick(null)} className="block w-full px-4 py-2 text-left text-sm text-charcoal-light hover:bg-gray-50">Clear</button>
          {options.map((option) => {
            const isSelected = option.v24 === current;
            return (
              <button
                key={option.v24}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                data-default={option.v24 === '09:00'}
                onClick={() => pick(option)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition ${isSelected ? 'bg-slate-900 font-semibold text-white' : 'text-charcoal hover:bg-gray-100'}`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
};

const TimePicker12h = ({ value, onChange }) => <TimeSelect value={value} onChange={onChange} format12 />;

const MAX_UNIT_PHOTOS = 10;

/**
 * Class of a unit: Standard, Deluxe, Premium, every class you added before, and at the bottom
 * "+ Add your own class" (type Gold or Suite, press Add). The class is saved as plain text on the unit.
 */
const UnitClassSelect = ({ value, onChange, customClasses = [], className = '', testid }) => {
  const known = ['standard', 'deluxe', 'premium'];
  const cap = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const options = [...known, ...customClasses.filter((c) => !known.includes(c.toLowerCase()))];

  const close = () => { setOpen(false); setAdding(false); setDraft(''); };

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = (event) => {
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      close();
    };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    const onPointer = (event) => {
      if (buttonRef.current?.contains(event.target) || listRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const pick = (next) => { onChange(next); close(); };
  const addNew = () => {
    const text = draft.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!text) return;
    const lower = text.toLowerCase();
    if (known.includes(lower)) { pick(lower); return; }
    pick(customClasses.find((c) => c.toLowerCase() === lower) || text);
  };

  const panelHeight = 260;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const openUp = rect && spaceBelow < panelHeight + 12 && rect.top > spaceBelow;
  const panelStyle = rect ? {
    position: 'fixed',
    left: rect.left,
    width: Math.max(rect.width, 210),
    zIndex: 1000,
    ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
  } : null;

  return (
    <div className={className}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => {
          if (open) { close(); return; }
          if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
          setOpen(true);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={testid}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm font-semibold text-charcoal outline-none transition ${open ? 'border-slate-700 ring-2 ring-slate-200' : 'border-slate-300 hover:border-slate-400'}`}
      >
        <span className="truncate">{value ? cap(value) : 'Select class'}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-charcoal-light transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && panelStyle && createPortal(
        <div ref={listRef} role="listbox" style={{ ...panelStyle, maxHeight: panelHeight }} className="overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          {options.map((option) => {
            const selected = (value || '') === option;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(option)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition ${selected ? 'bg-slate-900 font-semibold text-white' : 'text-charcoal hover:bg-gray-100'}`}
              >
                <span>{cap(option)}</span>
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          <div className="mt-1 border-t border-gray-100 px-3 pb-2 pt-2">
            {adding ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draft}
                  maxLength={24}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }}
                  placeholder="e.g. Gold, Suite"
                  className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-charcoal outline-none focus:border-slate-600"
                  aria-label="New class name"
                />
                <button type="button" onClick={addNew} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Add</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm font-bold text-[#2563eb] hover:bg-blue-50">
                <Plus className="h-4 w-4" /> Add your own class
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export const UNIT_TIERS = [
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'premium', label: 'Premium' },
];
const makeUnitId = () => `unit_${Math.random().toString(36).slice(2, 10)}`;

const slugifyAmenity = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const initialForm = {
  title: '',
  description: '',
  property_type: 'apartment',
  category: 'residential',
  bhk_type: '2bhk',
  address: '',
  city: '',
  state: '',
  pin_code: '',
  latitude: '',
  longitude: '',
  google_maps_url: '',
  nearby_places: [],
  area_sqft: '',
  max_guests: 6,
  has_units: false,
  units: [],
  price_per_night: '',
  pricing_display_mode: 'per_night',
  per_person_price: '',
  extra_guest_price: '',
  pricing_cycle: 'day',
  minimum_stay_days: 1,
  amenities: [],
  images: [],
  watermark_confirmed: false,
  video_url: '',
  youtube_short_url: '',
  youtube_long_url: '',
  house_rules: '',
  check_in_time: '12:00',
  check_out_time: '11:00',
  pet_friendly: false,
  smoking_allowed: false,
  instant_booking: false,
  subscription_plan_id: '',
  has_cook: false,
  cook_price: '',
  has_self_cook: false,
  has_taxi: false,
  veg_price: '',
  non_veg_price: '',
  has_veg: true,
  has_non_veg: true,
  food_type: 'both',
  guest_size: '',
  packages: [
    { type: 'veg', items: { ...DEFAULT_VEG_ITEMS_OBJ } },
    { type: 'non_veg', items: { ...DEFAULT_NON_VEG_ITEMS_OBJ } }
  ],
};

// Helper to format error details (strings, arrays of validation errors, or objects) into a readable string
const formatError = (error, defaultMsg = 'An error occurred') => {
  if (error?.message === 'Network Error') {
    return 'Unable to reach the upload server. Please check your connection and try again.';
  }
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const field = err.loc ? err.loc[err.loc.length - 1] : 'field';
        return `${field}: ${err.msg}`;
      }).join('\n');
    }
    if (typeof detail === 'object') {
      return JSON.stringify(detail);
    }
  }
  return error.message || defaultMsg;
};

const canPreviewImageUrl = (url) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(true);
  image.onerror = () => resolve(false);
  image.referrerPolicy = 'no-referrer';
  image.src = url;
});

const HostListProperty = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editPropertyId = location.state?.editPropertyId || queryParams.get('edit');
  const draftStorageId = useMemo(
    () => (editPropertyId ? `edit_${editPropertyId}` : `new_${user?.user_id || 'anonymous'}`),
    [editPropertyId, user?.user_id]
  );
  const hostResumePathKey = useMemo(
    () => `host_resume_path_${user?.user_id || 'anonymous'}`,
    [user?.user_id]
  );
  const createdPropertyStorageKey = useMemo(
    () => `list_property_created_id_${draftStorageId}`,
    [draftStorageId]
  );

  const [step, setStep] = useState(() => {
    const editId = new URLSearchParams(window.location.search).get('edit') || window.history.state?.usr?.editPropertyId;
    const storedUser = JSON.parse(localStorage.getItem('propnest_user') || '{}');
    const storageId = editId ? `edit_${editId}` : `new_${storedUser?.user_id || 'anonymous'}`;
    const savedStep = localStorage.getItem(`list_property_step_${storageId}`);
    if (savedStep) return parseInt(savedStep, 10);
    return 0;
  });

  const [form, setForm] = useState(() => {
    const editId = new URLSearchParams(window.location.search).get('edit') || window.history.state?.usr?.editPropertyId;
    const storedUser = JSON.parse(localStorage.getItem('propnest_user') || '{}');
    const storageId = editId ? `edit_${editId}` : `new_${storedUser?.user_id || 'anonymous'}`;
    const savedForm = localStorage.getItem(`list_property_form_${storageId}`);
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        if (parsed.packages) {
          parsed.packages = mergePackagesWithDefaults(parsed.packages);
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing saved draft form from localStorage', e);
      }
    }
    return initialForm;
  });

  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState(() => {
    const editId = new URLSearchParams(window.location.search).get('edit') || window.history.state?.usr?.editPropertyId;
    if (editId) return editId;
    const storedUser = JSON.parse(localStorage.getItem('propnest_user') || '{}');
    const storageId = `new_${storedUser?.user_id || 'anonymous'}`;
    return localStorage.getItem(`list_property_created_id_${storageId}`);
  });
  const [upiPayment, setUpiPayment] = useState({ isOpen: false, utr: '', error: '', submitting: false });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [photoMode, setPhotoMode] = useState('property'); // 'property' | 'units'
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [listingExempt, setListingExempt] = useState(false);
  const [listingPolicy, setListingPolicy] = useState({ loading: true, enabled: true, error: '' });
  const subscriptionRequired = listingPolicy.enabled && !listingExempt;
  const wizardNavigation = listingWizardNavigation(STEPS, step, listingPolicy.loading || listingPolicy.enabled);
  const { visibleSteps, currentIndex: currentStepIndex, position: visibleStepIndex } = wizardNavigation;
  useEffect(() => {
    subscriptionAPI.getListingPolicy()
      .then((res) => setListingPolicy({ loading: false, enabled: res.data.enabled !== false, error: '' }))
      .catch(() => setListingPolicy({ loading: false, enabled: true, error: 'Could not load listing payment settings. Refresh and try again.' }));
  }, []);
  const [editingPropertyStatus, setEditingPropertyStatus] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [localities, setLocalities] = useState([]);
  const [pincodeError, setPincodeError] = useState('');
  
  const handlePincodeChange = async (v) => {
    update({ pin_code: v });
    setPincodeError('');
    setLocalities([]);
    
    // Validate 6-digit Indian Pincode
    if (/^\d{6}$/.test(v)) {
      setFetchingPincode(true);
      try {
        const res = await propertyAPI.fetchPincodeDetails(v);
        const { state, city, localities: locs } = res.data;
        
        update({
          state: state || '',
          city: city || ''
        });
        
        if (locs && locs.length > 0) {
          setLocalities(locs);
        } else {
          setPincodeError('No localities found for this pincode.');
        }
      } catch (err) {
        console.error("Error fetching pincode details", err);
        const errMsg = err.response?.data?.detail || 'Failed to fetch location details for this pincode.';
        setPincodeError(errMsg);
      } finally {
        setFetchingPincode(false);
      }
    }
  };

  const handleLocalitySelect = (locality) => {
    update({ address: locality });
  };
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [pricingSummaryPlan, setPricingSummaryPlan] = useState(null);
  const [subscriptionCoupons, setSubscriptionCoupons] = useState([]);
  const [subscriptionCouponCode, setSubscriptionCouponCode] = useState('');
  const [newHouseRule, setNewHouseRule] = useState('');
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [editingRuleValue, setEditingRuleValue] = useState('');
  const [newAmenityLabel, setNewAmenityLabel] = useState('');
  const subscriptionTargets = useMemo(() => {
    const buildTarget = (bhkType, area) => {
      const areaSqft = Number(area);
      return {
        plan_type: getTargetSubscriptionPlanType(form.category, bhkType),
        property_category: form.category,
        property_type: form.property_type,
        bhk_type: bhkType,
        ...(Number.isFinite(areaSqft) && areaSqft > 0 ? { area_sqft: areaSqft } : {}),
      };
    };
    const hasUnitsMode = form.category !== 'event_venue' && !!form.has_units;
    if (hasUnitsMode && (form.units || []).length) {
      const seen = new Set();
      const targets = [];
      (form.units || []).forEach((u) => {
        const target = buildTarget(u.bhk_type || form.bhk_type, u.area_sqft);
        const key = JSON.stringify(target);
        if (!seen.has(key)) {
          seen.add(key);
          targets.push(target);
        }
      });
      return targets;
    }
    return [buildTarget(form.bhk_type, form.area_sqft)];
  }, [form.category, form.property_type, form.bhk_type, form.area_sqft, form.has_units, form.units]);
  const subscriptionTargetsKey = JSON.stringify(subscriptionTargets);

  useEffect(() => {
    localStorage.setItem(`list_property_step_${draftStorageId}`, String(step));
  }, [step, draftStorageId]);

  useEffect(() => {
    if (form !== initialForm) {
      localStorage.setItem(`list_property_form_${draftStorageId}`, JSON.stringify(form));
    }
  }, [form, draftStorageId]);

  useEffect(() => {
    const hasMeaningfulDraft =
      Boolean(form.title?.trim()) ||
      Boolean(form.description?.trim()) ||
      Boolean(form.address?.trim()) ||
      Boolean(form.city?.trim()) ||
      Boolean(form.images?.length);

    if (hasMeaningfulDraft || editPropertyId) {
      const resumePath = editPropertyId
        ? `/host/list-property?edit=${encodeURIComponent(editPropertyId)}`
        : '/host/list-property';
      localStorage.setItem(hostResumePathKey, resumePath);
    }
  }, [form, editPropertyId, hostResumePathKey]);

  useEffect(() => {
    if (!editPropertyId && !createdPropertyId) {
      setHasActiveSubscription(false);
    }
  }, [editPropertyId, createdPropertyId]);

  useEffect(() => {
    if (editPropertyId || !createdPropertyId) return;

    // A property is created before Checkout opens. Keep its identity across a
    // refresh/payment callback failure so retrying Submit updates the same row
    // instead of creating a duplicate property and a second payment order.
    localStorage.setItem(createdPropertyStorageKey, createdPropertyId);
    propertyAPI.getProperty(createdPropertyId)
      .then((res) => {
        const property = res.data || {};
        const subscriptionStatus = String(property.subscription_status || '').toLowerCase();
        const propertyStatus = String(property.status || '').toLowerCase();
        setHasActiveSubscription(subscriptionStatus === 'active');
        setListingExempt(property.subscription_listing_exempt === true);
        if (['pending_verification', 'live'].includes(propertyStatus) && subscriptionStatus === 'active') {
          localStorage.removeItem(`list_property_form_${draftStorageId}`);
          localStorage.removeItem(`list_property_step_${draftStorageId}`);
          localStorage.removeItem(createdPropertyStorageKey);
          localStorage.removeItem(hostResumePathKey);
          setSuccess(true);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          localStorage.removeItem(createdPropertyStorageKey);
          setCreatedPropertyId(null);
        }
      });
  }, [createdPropertyId, createdPropertyStorageKey, draftStorageId, editPropertyId, hostResumePathKey]);

  useEffect(() => {
    if (editPropertyId) {
      setCreatedPropertyId(editPropertyId);
      propertyAPI.getProperty(editPropertyId)
        .then((res) => {
          const p = res.data;
          const status = String(p.status || '').toLowerCase();
          setEditingPropertyStatus(status);
          if (HOST_MANAGE_EDITABLE_STATUSES.includes(status)) {
            setStep((current) => (
              HOST_MANAGE_EDITABLE_STEP_KEYS.includes(STEPS[current]?.key) ? current : 2
            ));
          }
          const subscriptionStatus = String(p.subscription_status || '').toLowerCase();
          setHasActiveSubscription(subscriptionStatus === 'active' || !!(p.subscription_id && subscriptionStatus === 'active'));
          setListingExempt(p.subscription_listing_exempt === true);
          const backendForm = {
            title: p.title || '',
            description: p.description || '',
            property_type: p.property_type || 'apartment',
            category: p.category || 'residential',
            bhk_type: p.bhk_type || '2bhk',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            pin_code: p.pin_code || '',
            latitude: p.latitude !== null && p.latitude !== undefined ? String(p.latitude) : '',
            longitude: p.longitude !== null && p.longitude !== undefined ? String(p.longitude) : '',
            google_maps_url: p.google_maps_url || '',
            nearby_places: p.nearby_places || [],
            area_sqft: p.area_sqft !== null && p.area_sqft !== undefined ? String(p.area_sqft) : '',
            max_guests: p.max_guests !== null && p.max_guests !== undefined ? String(p.max_guests) : 6,
            has_units: !!p.has_units,
            units: (p.units || []).map((u) => ({
              unit_id: u.unit_id || makeUnitId(),
              name: u.name || '',
              area_sqft: u.area_sqft !== null && u.area_sqft !== undefined ? String(u.area_sqft) : '',
              max_guests: u.max_guests !== null && u.max_guests !== undefined ? String(u.max_guests) : '2',
              bhk_type: u.bhk_type || '',
              tier: u.tier || '',
              images: Array.isArray(u.images) ? u.images : [],
              price_per_night: u.price_per_night !== null && u.price_per_night !== undefined ? String(u.price_per_night) : '',
            })),
            price_per_night: p.price_per_night !== null && p.price_per_night !== undefined ? String(p.price_per_night) : '',
            pricing_display_mode: p.pricing_display_mode || 'per_night',
            per_person_price: p.per_person_price !== null && p.per_person_price !== undefined ? String(p.per_person_price) : '',
            extra_guest_price: p.extra_guest_price !== null && p.extra_guest_price !== undefined ? String(p.extra_guest_price) : '',
            pricing_cycle: p.pricing_cycle || 'day',
            minimum_stay_days: p.minimum_stay_days || 1,
            amenities: p.amenities || [],
            images: p.images || [],
            watermark_confirmed: Boolean((p.images || []).length),
            video_url: p.video_url || '',
            youtube_short_url: p.youtube_short_url || '',
            youtube_long_url: p.youtube_long_url || '',
            house_rules: p.house_rules || '',
            pet_friendly: !!p.pet_friendly,
            smoking_allowed: !!p.smoking_allowed,
            instant_booking: !!p.instant_booking,
            subscription_plan_id: p.subscription_id || '',
            has_cook: !!p.has_cook,
            cook_price: p.cook_price !== null && p.cook_price !== undefined ? String(p.cook_price) : '',
            has_self_cook: !!p.has_self_cook,
            has_taxi: !!p.has_taxi,
            veg_price: p.veg_price !== null && p.veg_price !== undefined ? String(p.veg_price) : '',
            non_veg_price: p.non_veg_price !== null && p.non_veg_price !== undefined ? String(p.non_veg_price) : '',
            has_veg: p.veg_price !== null && p.veg_price !== undefined && p.veg_price !== '',
            has_non_veg: p.non_veg_price !== null && p.non_veg_price !== undefined && p.non_veg_price !== '',
            food_type: p.food_type || (p.veg_price && p.non_veg_price ? 'both' : p.non_veg_price ? 'non_veg' : 'veg'),
            guest_size: p.guest_size !== null && p.guest_size !== undefined ? String(p.guest_size) : '',
            packages: mergePackagesWithDefaults(p.packages || []),
            check_in_time: p.check_in_time || '12:00',
            check_out_time: p.check_out_time || '11:00',
          };
          
          // In edit/manage mode, always trust the latest backend data. A stale
          // browser draft can otherwise resend old photo URLs and hide new uploads.
          localStorage.removeItem(`list_property_form_${draftStorageId}`);
          localStorage.removeItem(`list_property_step_${draftStorageId}`);
          setForm(backendForm);
        })
        .catch((err) => {
          setError(formatError(err, 'Failed to load draft property details'));
        });
    }
  }, [editPropertyId, draftStorageId]);

  useEffect(() => {
    if (refreshUser) refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;
    const mergeById = (lists, idKey) => {
      const seen = new Set();
      return lists.flat().filter((item) => {
        const id = item?.[idKey];
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };
    Promise.all(subscriptionTargets.map((t) => subscriptionAPI.getPlans(t).then((r) => r.data.plans || []).catch(() => [])))
      .then((lists) => { if (!cancelled) setPlans(mergeById(lists, 'plan_id')); });
    Promise.all(subscriptionTargets.map((t) => couponAPI.getSubscriptionCoupons(t).then((r) => r.data.coupons || []).catch(() => [])))
      .then((lists) => { if (!cancelled) setSubscriptionCoupons(mergeById(lists, 'code')); });
    setSubscriptionCouponCode('');
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionTargetsKey]);

  // Auto-detect and remove duplicates with a popup
  useEffect(() => {
    const pureUrls = form.images.map(img => img.split('#')[0]);
    const seen = new Set();
    let duplicateIndex = -1;
    
    for (let i = 0; i < pureUrls.length; i++) {
      if (seen.has(pureUrls[i])) {
        duplicateIndex = i;
        break;
      }
      seen.add(pureUrls[i]);
    }

    if (duplicateIndex !== -1) {
      window.alert('Removed the duplicate image! Please use unique photos.');
      const newImages = [...form.images];
      newImages.splice(duplicateIndex, 1);
      update({ images: newImages });
    }
  }, [form.images]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isHostManageMode = !!editPropertyId && HOST_MANAGE_EDITABLE_STATUSES.includes(editingPropertyStatus) && user?.role !== 'admin';
  const firstManageStep = 0;
  const lastManageStep = STEPS.length - 1;
  const unitsActive = form.category !== 'event_venue' && !!form.has_units;
  const unitBhkOptions = (CATEGORY_DATA[form.category] || CATEGORY_DATA.residential).bhkTypes;

  const addUnit = () => {
    const next = {
      unit_id: makeUnitId(),
      name: '',
      area_sqft: '',
      max_guests: '2',
      bhk_type: unitBhkOptions[0]?.value || '',
      tier: 'standard',
      images: [...classPhotosOf('standard')],
      price_per_night: '',
    };
    update({ units: [...(form.units || []), next] });
  };

  const [newUnit, setNewUnit] = useState({ name: '', area_sqft: '', max_guests: '2', tier: 'standard', price_per_night: '' });
  const submitNewUnit = () => {
    if (!newUnit.name.trim()) { setError('Enter a name for the new unit'); return; }
    if (!Number(newUnit.price_per_night)) { setError('Enter a price for the new unit'); return; }
    update({ units: [...(form.units || []), { unit_id: makeUnitId(), bhk_type: unitBhkOptions[0]?.value || '', ...newUnit, images: [...classPhotosOf(newUnit.tier)], name: newUnit.name.trim() }] });
    setNewUnit({ name: '', area_sqft: '', max_guests: '2', tier: 'standard', price_per_night: '' });
    setError('');
  };

  const updateUnit = (unitId, patch) => {
    // moving a unit to another class gives it that class's photos
    const others = (form.units || []).filter((u) => u.unit_id !== unitId);
    const next = patch.tier !== undefined && !('images' in patch)
      ? { ...patch, images: [...classPhotosOf(patch.tier, others)] }
      : patch;
    update({ units: (form.units || []).map((u) => (u.unit_id === unitId ? { ...u, ...next } : u)) });
  };

  // classes the host typed on any unit (beyond Standard / Deluxe / Premium), so every unit can reuse them
  const customUnitClasses = useMemo(() => {
    const known = UNIT_TIERS.map((t) => t.value);
    return Array.from(new Set([...(form.units || []).map((u) => u.tier), newUnit.tier].filter((t) => t && !known.includes(t))));
  }, [form.units, newUnit.tier]);

  // Photos belong to a class (Deluxe, Premium...). Every unit of that class shows the same photos,
  // so the host uploads them once. They are stored on each unit, so guests and reviewers read them unchanged.
  const classKey = (tier) => tier || 'standard';
  const classPhotosOf = (tier, units = form.units || []) => {
    const holder = units.find((u) => classKey(u.tier) === classKey(tier) && Array.isArray(u.images) && u.images.length > 0);
    return holder ? holder.images : [];
  };
  const setClassPhotos = (tier, images) => {
    update({ units: (form.units || []).map((u) => (classKey(u.tier) === classKey(tier) ? { ...u, images } : u)) });
  };
  const unitClasses = useMemo(() => {
    const order = ['standard', 'deluxe', 'premium'];
    const keys = Array.from(new Set((form.units || []).map((u) => classKey(u.tier))));
    keys.sort((x, y) => {
      const ix = order.indexOf(x); const iy = order.indexOf(y);
      return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy) || x.localeCompare(y);
    });
    return keys.map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      units: (form.units || []).filter((u) => classKey(u.tier) === key),
    }));
  }, [form.units]);

  const [unitPhotoBusy, setUnitPhotoBusy] = useState('');
  const handleClassPhotos = async (tier, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const existing = classPhotosOf(tier);
    const room = Math.max(0, MAX_UNIT_PHOTOS - existing.length);
    if (room === 0) { setError(`Each class can have up to ${MAX_UNIT_PHOTOS} photos`); return; }
    setUnitPhotoBusy(classKey(tier));
    setError('');
    const added = [];
    try {
      for (const file of files.slice(0, room)) {
        const data = await uploadAPI.uploadImage(file);
        if (data?.url && !existing.includes(data.url) && !added.includes(data.url)) added.push(data.url);
      }
      if (added.length) setClassPhotos(tier, [...existing, ...added]);
      if (files.length > room) setError(`Only ${room} more photo(s) fit for this class (max ${MAX_UNIT_PHOTOS}).`);
    } catch (err) {
      setError(formatError(err, 'Photo upload failed'));
    } finally {
      setUnitPhotoBusy('');
    }
  };
  const removeClassPhoto = (tier, index) => {
    setClassPhotos(tier, classPhotosOf(tier).filter((_, i) => i !== index));
  };

  const removeUnit = (unitId) => {
    update({ units: (form.units || []).filter((u) => u.unit_id !== unitId) });
  };

  const applyFirstUnitPriceToAll = () => {
    const units = form.units || [];
    if (!units.length) return;
    const firstPrice = units[0].price_per_night;
    update({ units: units.map((u) => ({ ...u, price_per_night: firstPrice })) });
  };

  const canEditCurrentStep = !isHostManageMode || HOST_MANAGE_EDITABLE_STEP_KEYS.includes(STEPS[currentStepIndex]?.key);
  const isLastAllowedStep = currentStepIndex >= lastManageStep;

  const getPackageValue = (type, item) => {
    const typePkg = (form.packages || []).find((p) => p.type === type);
    return typePkg?.items?.[item] || '';
  };

  const handlePackageUpdate = (type, item, value) => {
    const pkgs = [...(form.packages || [])];
    let typePkgIndex = pkgs.findIndex((p) => p.type === type);
    if (typePkgIndex === -1) {
      pkgs.push({ type, items: { [item]: value } });
    } else {
      pkgs[typePkgIndex] = { 
        ...pkgs[typePkgIndex], 
        items: { ...pkgs[typePkgIndex].items, [item]: value } 
      };
    }
    update({ packages: pkgs });
  };

  const vegItemsList = useMemo(() => {
    const pkg = (form.packages || []).find(p => p.type === 'veg');
    return pkg && pkg.items ? Object.keys(pkg.items) : VEG_ITEMS;
  }, [form.packages]);

  const nonVegItemsList = useMemo(() => {
    const pkg = (form.packages || []).find(p => p.type === 'non_veg');
    return pkg && pkg.items ? Object.keys(pkg.items) : NON_VEG_ITEMS;
  }, [form.packages]);

  const handleRenameItem = (type, oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    const pkgs = [...(form.packages || [])];
    let typePkgIndex = pkgs.findIndex((p) => p.type === type);
    if (typePkgIndex === -1) {
      pkgs.push({ type, items: { [newName]: '0' } });
    } else {
      const oldItems = pkgs[typePkgIndex].items || {};
      const newItems = {};
      Object.keys(oldItems).forEach(key => {
        if (key === oldName) {
          newItems[newName] = oldItems[oldName];
        } else {
          newItems[key] = oldItems[key];
        }
      });
      pkgs[typePkgIndex] = { ...pkgs[typePkgIndex], items: newItems };
    }
    update({ packages: pkgs });
  };

  const getVenuePolicies = () => {
    try {
      if (form.house_rules && form.house_rules.startsWith('{')) {
        return JSON.parse(form.house_rules);
      }
    } catch (e) {}
    return {};
  };

  const handleVenuePolicyChange = (key, value) => {
    const policies = getVenuePolicies();
    policies[key] = value;
    update({ house_rules: JSON.stringify(policies) });
  };

  const fetchNearbyPlaces = async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const placesRes = await propertyAPI.getNearbyPlaces(Number(lat), Number(lng));
      if (placesRes.data && placesRes.data.places) {
        update({ nearby_places: placesRes.data.places });
      }
    } catch (err) {
      console.error("Failed to fetch nearby places:", err);
    }
  };

  const handleMapUrlChange = async (url) => {
    update({ google_maps_url: url });
    if (!url) return;
    
    let processUrl = url;
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const res = await propertyAPI.expandUrl(url);
        if (res.data && res.data.url) {
          processUrl = res.data.url;
        }
      } catch (err) {
        console.error("Failed to expand short URL", err);
      }
    }

    // Extract coordinates from URL. Prefer the place pin (!3d..!4d..) over the
    // map viewport centre (@lat,lng), then fall back to q=, ll= and /place/lat,lng.
    const coordPatterns = [
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&](?:q|ll|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    let match = null;
    for (const pattern of coordPatterns) {
      match = processUrl.match(pattern);
      if (match) break;
    }
    
    if (match) {
      const lat = match[1];
      const lng = match[2];

      let newAddress = form.address;
      let newCity = form.city;
      let newState = form.state;
      let newPin = form.pin_code;
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`);
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          newCity = addr.city || addr.town || addr.village || addr.county || newCity;
          newState = addr.state || newState;
          newPin = addr.postcode || newPin;

          const parts = [
            addr.road,
            addr.neighbourhood || addr.residential || addr.suburb || addr.city_district,
          ].filter(Boolean);
          if (parts.length > 0) {
            newAddress = parts.join(', ');
          } else if (data.display_name) {
            newAddress = data.display_name.split(',').slice(0, 2).join(',').trim();
          }
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }

      update({ latitude: lat, longitude: lng, address: newAddress, city: newCity, state: newState, pin_code: newPin });
      await fetchNearbyPlaces(lat, lng);
    }
  };

  const handleLatChange = async (val) => {
    update({ latitude: val });
    if (val && form.longitude) {
      await fetchNearbyPlaces(val, form.longitude);
    }
  };

  const handleLngChange = async (val) => {
    update({ longitude: val });
    if (form.latitude && val) {
      await fetchNearbyPlaces(form.latitude, val);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setFetchingLocation(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        let newAddress = form.address;
        let newCity = form.city;
        let newState = form.state;
        let newPin = form.pin_code;
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          if (data) {
            if (data.address) {
              newCity = data.address.city || data.address.town || data.address.village || data.address.county || newCity;
              newState = data.address.state || newState;
              newPin = data.address.postcode || newPin;
              
              const parts = [];
              if (data.address.road) parts.push(data.address.road);
              if (data.address.suburb) parts.push(data.address.suburb);
              if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
              if (parts.length > 0) {
                newAddress = parts.join(', ');
              } else if (data.display_name) {
                newAddress = data.display_name.split(',').slice(0, 2).join(',').trim();
              }
            }
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }
        
        update({
          latitude: String(lat),
          longitude: String(lng),
          address: newAddress,
          city: newCity,
          state: newState,
          pin_code: newPin,
          google_maps_url: `https://www.google.com/maps/place/${lat},${lng}`
        });
        
        await fetchNearbyPlaces(lat, lng);
        setFetchingLocation(false);
      },
      (err) => {
        console.error("Error getting geolocation", err);
        let errorMsg = "Failed to get current location. Please allow location access.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please enable location permissions in your browser.";
        }
        setError(errorMsg);
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const matchingPlans = useMemo(() => {
    if (!plans.length) return [];
    const fitsTarget = (p, bhkType, area) => {
      const target = getTargetSubscriptionPlanType(form.category, bhkType);
      if (p.plan_type !== target) return false;
      if (p.property_category && p.property_category !== form.category) return false;
      if (p.property_type && p.property_type !== form.property_type) return false;
      if (p.bhk_type && p.bhk_type !== bhkType) return false;
      if (!subscriptionSqftMatches(p.sqft_range, area)) return false;
      return true;
    };
    const hasUnitsMode = form.category !== 'event_venue' && !!form.has_units && (form.units || []).length > 0;
    if (hasUnitsMode) {
      // One subscription covers the whole property: offer every plan that fits at least one unit.
      return plans.filter((p) => (form.units || []).some((u) => fitsTarget(p, u.bhk_type || form.bhk_type, u.area_sqft)));
    }
    return plans.filter((p) => fitsTarget(p, form.bhk_type, form.area_sqft));
  }, [plans, form.category, form.property_type, form.bhk_type, form.area_sqft, form.has_units, form.units]);

  const getSubscriptionBreakdown = (plan = {}) => {
    const planFee = Number(plan.price_monthly) || 0;
    const platformFee = Number(plan.platform_fee) || 0;
    const taxPercent = Number(plan.tax_percent ?? 18);
    const couponCode = subscriptionCouponCode.trim().toUpperCase();
    const coupon = couponCode ? subscriptionCoupons.find((c) => c.code === couponCode) : null;
    const taxableAmount = planFee + platformFee;
    const rawDiscount = coupon
      ? coupon.discount_type === 'target_taxable'
        ? taxableAmount - Math.min(taxableAmount, Math.max(0, Number(coupon.discount_value) || 0))
        : coupon.discount_type === 'percentage'
          ? taxableAmount * ((Number(coupon.discount_value) || 0) / 100)
          : Number(coupon.discount_value) || 0
      : 0;
    const discount = Math.min(taxableAmount, Math.max(0, Number(rawDiscount.toFixed(2))));
    const discountedTaxableAmount = Number(Math.max(0, taxableAmount - discount).toFixed(2));
    const taxes = Number((discountedTaxableAmount * (taxPercent / 100)).toFixed(2));
    const subtotal = Number((taxableAmount + (taxableAmount * (taxPercent / 100))).toFixed(2));
    const total = Number((discountedTaxableAmount + taxes).toFixed(2));
    return {
      planFee,
      platformFee,
      taxPercent,
      taxableAmount,
      discountedTaxableAmount,
      taxes,
      subtotal,
      coupon,
      discount,
      discountedPlanFee: discountedTaxableAmount,
      total
    };
  };

  const validateStep = () => {
    setError('');
    const k = STEPS[currentStepIndex].key;
    if (isHostManageMode && !HOST_MANAGE_EDITABLE_STEP_KEYS.includes(k)) {
      return '';
    }
    if (k === 'basics') {
      if (!form.title || form.title.length < 8) return 'Title must be at least 8 characters';
      if (!form.description || form.description.length < 30) return 'Description must be at least 30 characters';
      if (unitsActive) {
        const units = form.units || [];
        if (units.length < 1) return 'Add at least one unit';
        for (let i = 0; i < units.length; i += 1) {
          const u = units[i];
          if (!String(u.name || '').trim()) return `Enter a name for unit ${i + 1}`;
          if (!u.area_sqft || Number(u.area_sqft) < 50) return `Area of "${u.name}" must be at least 50 sq.ft`;
          if (!u.max_guests || Number(u.max_guests) < 1) return `Maximum guests of "${u.name}" must be at least 1`;
          if (Number(u.max_guests) > 1000) return `Maximum guests of "${u.name}" cannot exceed 1000`;
        }
      } else {
        if (!form.area_sqft || Number(form.area_sqft) < 50) return 'Area must be at least 50 sq.ft';
        if (!form.max_guests || Number(form.max_guests) < 1) return 'Maximum guests must be at least 1';
        if (Number(form.max_guests) > 1000) return 'Maximum guests cannot exceed 1000';
      }
    }
    if (k === 'location') {
      if (!form.address) return 'Address is required';
      if (!form.city) return 'City is required';
      if (!form.state) return 'State is required';
      if (!form.pin_code || !/^\d{6}$/.test(form.pin_code)) return 'Pin code must be 6 digits';
    }
    if (k === 'pricing') {
      if (form.category === 'event_venue') {
        if (form.has_veg && (!form.veg_price || Number(form.veg_price) < 50)) {
          return 'Minimum Veg price is ₹50/plate when Veg package is selected';
        }
        if (form.has_non_veg && (!form.non_veg_price || Number(form.non_veg_price) < 50)) {
          return 'Minimum Non-Veg price is ₹50/plate when Non-Veg package is selected';
        }
        if (!form.price_per_night || Number(form.price_per_night) < 100) return 'Minimum Venue Price is ₹100/day';
      } else {
        const minPrice = form.pricing_cycle === 'hourly' ? 10 : 100;
        const rateUnit = form.pricing_cycle === 'hourly' ? 'hour' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day';
        if (unitsActive) {
          for (const u of (form.units || [])) {
            if (!u.price_per_night || Number(u.price_per_night) < minPrice) {
              return `Minimum price for "${u.name || 'unit'}" is ₹${minPrice}/${form.category === 'residential' ? 'night' : rateUnit}`;
            }
          }
        } else if (!form.price_per_night || Number(form.price_per_night) < minPrice) {
          return `Minimum price is ₹${minPrice}/${form.category === 'residential' ? 'night' : rateUnit}`;
        }
        if (!form.minimum_stay_days || form.minimum_stay_days < 1) {
          return `Minimum duration must be at least 1 ${form.category === 'residential' ? 'night' : rateUnit}`;
        }
        if (form.has_cook) {
          if (!form.cook_price || Number(form.cook_price) <= 0) {
            return 'Please specify a cook price per day';
          }
          if (form.has_veg && (!form.veg_price || Number(form.veg_price) < 50)) {
            return 'Minimum Veg price is ₹50/plate when Vegetarian Food option is selected';
          }
          if (form.has_non_veg && (!form.non_veg_price || Number(form.non_veg_price) < 50)) {
            return 'Minimum Non-Veg price is ₹50/plate when Non-Vegetarian Food option is selected';
          }
        }
      }
    }
    if (k === 'amenities' && form.amenities.length === 0) {
      return 'Select at least one amenity';
    }
    if (k === 'photos') {
      const notYouTube = (value) => value && !/(?:youtube\.com|youtu\.be)\//i.test(value);
      if (notYouTube(form.youtube_short_url)) return 'The YouTube Short link must be a youtube.com or youtu.be link';
      if (notYouTube(form.youtube_long_url)) return 'The YouTube video link must be a youtube.com or youtu.be link (a share.google or other short link will not play)';
      if (form.images.length < 3) return 'Add at least 3 photos';
      if (form.images.length > 15) return 'Maximum 15 photos allowed';
      const uncategorised = form.images.findIndex((img) => !String(img.split('#')[1] || '').trim());
      if (uncategorised !== -1) return `Choose a category for photo ${uncategorised + 1} (Exterior, Bedroom, Kitchen...). It is shown to guests in the Spaces section.`;
      
      const pureUrls = form.images.map(img => img.split('#')[0]);
      const hasDuplicates = pureUrls.some((url, idx) => pureUrls.indexOf(url) !== idx);
      
      if (hasDuplicates) {
        window.alert('Removed the duplicate image! Please ensure all photos are unique before proceeding.');
        return 'Duplicate images detected. Please remove them.';
      }
    }
    if (k === 'subscription' && user?.role !== 'admin' && (listingPolicy.loading || listingPolicy.error)) return listingPolicy.error || 'Loading subscription setting. Please wait.';
    if (k === 'subscription' && subscriptionRequired && !form.subscription_plan_id && !hasActiveSubscription && user?.role !== 'admin') {
      return 'Select a subscription plan';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setStep(wizardNavigation.nextIndex);
  };

  const prev = () => {
    setError('');
    setStep(wizardNavigation.previousIndex);
  };

  const toggleAmenity = (a) => {
    update({
      amenities: form.amenities.includes(a)
        ? form.amenities.filter((x) => x !== a)
        : [...form.amenities, a],
    });
  };

  const houseRuleItems = useMemo(() => {
    if (!form.house_rules || form.house_rules.trim().startsWith('{')) return [];
    return form.house_rules
      .split('\n')
      .map((rule) => rule.trim())
      .filter(Boolean);
  }, [form.house_rules]);

  const saveHouseRules = (rules) => {
    update({ house_rules: rules.map((rule) => rule.trim()).filter(Boolean).join('\n') });
  };

  const addHouseRule = () => {
    const rule = newHouseRule.trim();
    if (!rule) return;
    saveHouseRules([...houseRuleItems, rule]);
    setNewHouseRule('');
  };

  const removeHouseRule = (index) => {
    saveHouseRules(houseRuleItems.filter((_, i) => i !== index));
    if (editingRuleIndex === index) {
      setEditingRuleIndex(null);
      setEditingRuleValue('');
    }
  };

  const startEditHouseRule = (index) => {
    setEditingRuleIndex(index);
    setEditingRuleValue(houseRuleItems[index] || '');
  };

  const saveEditedHouseRule = () => {
    if (editingRuleIndex === null) return;
    const rules = [...houseRuleItems];
    const nextValue = editingRuleValue.trim();
    if (nextValue) {
      rules[editingRuleIndex] = nextValue;
    } else {
      rules.splice(editingRuleIndex, 1);
    }
    saveHouseRules(rules);
    setEditingRuleIndex(null);
    setEditingRuleValue('');
  };

  const availableAmenityOptions = useMemo(() => {
    const base = CATEGORY_AMENITIES[form.category] || CATEGORY_AMENITIES.residential;
    const options = [...base];
    form.amenities.forEach((value) => {
      if (!options.some((item) => item.value === value)) {
        options.push({
          value,
          label: value.replace(/^custom_/, '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
          custom: true,
        });
      }
    });
    return options;
  }, [form.category, form.amenities]);

  const addCustomAmenity = () => {
    const label = newAmenityLabel.trim();
    if (!label) return;
    const value = `custom_${slugifyAmenity(label) || Date.now()}`;
    const nextAmenities = form.amenities.includes(value) ? form.amenities : [...form.amenities, value];
    update({ amenities: nextAmenities });
    setNewAmenityLabel('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (form.images.length >= 15) {
      setError('Maximum 15 photos allowed');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    // Pre-upload check: Check if an image with the same filename already exists
    const isDuplicateFile = form.images.some(img => {
      const existingUrl = img.split('#')[0];
      const existingFilename = existingUrl.split('/').pop().split('?')[0]; // handle query params if any
      return existingFilename === file.name;
    });

    if (isDuplicateFile) {
      setError(`Image "${file.name}" is already uploaded. Duplicate ignored.`);
      setUploadingPhoto(false);
      e.target.value = '';
      return;
    }

    try {
      const data = await uploadAPI.uploadImage(file);
      const url = data.url;
      
      // Check for duplicates (ignoring hashes)
      const pureUrl = url.split('#')[0];
      if (form.images.some(img => img.split('#')[0] === pureUrl)) {
        setError('This image is already uploaded');
        return;
      }

      // Default category 'Other'
      update({ images: [...form.images, url], watermark_confirmed: true });
    } catch (err) {
      setError(formatError(err, 'Image upload failed'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = async () => {
    const url = imageUrlDraft.trim();
    if (!url) {
      setError('Please paste an image URL');
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      setError('URL must start with http:// or https://');
      return;
    }
    
    if (form.images.length >= 15) {
      setError('Maximum 15 photos allowed');
      return;
    }

    const pureUrl = url.split('#')[0];
    if (form.images.some(img => img.split('#')[0] === pureUrl)) {
      setError('This image is already uploaded');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    setIsImageUrlDialogOpen(false);

    try {
      const data = await uploadAPI.uploadImageFromUrl(url);
      const hostedUrl = data.url;
      const hostedPureUrl = hostedUrl.split('#')[0];
      if (form.images.some(img => img.split('#')[0] === hostedPureUrl)) {
        setError('This image is already uploaded');
        return;
      }
      update({ images: [...form.images, hostedUrl], watermark_confirmed: true });
      setImageUrlDraft('');
    } catch (err) {
      const canUseDirectUrl = await canPreviewImageUrl(url);
      if (canUseDirectUrl) {
        update({ images: [...form.images, url], watermark_confirmed: true });
        setImageUrlDraft('');
        setError('');
        return;
      }
      setError(formatError(err, 'Image URL upload failed'));
      setIsImageUrlDialogOpen(true);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeImage = (idx) => {
    update({ images: form.images.filter((_, i) => i !== idx), watermark_confirmed: true });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setError('');

    try {
      const data = await uploadAPI.uploadVideo(file);
      update({ video_url: data.url });
    } catch (err) {
      setError(formatError(err, 'Video upload failed'));
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handlePasteVideoUrl = () => {
    const url = window.prompt('Paste video URL:');
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      setError('URL must start with http:// or https://');
      return;
    }
    update({ video_url: url });
  };

  const removeVideo = () => {
    update({ video_url: '' });
  };

  const handleGenerateAIDescription = async () => {
    setGeneratingDescription(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        category: form.category,
        property_type: form.property_type,
        bhk_type: form.bhk_type,
        city: form.city,
        amenities: form.amenities,
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
        max_guests: form.max_guests ? Number(form.max_guests) : null,
      };

      const res = await propertyAPI.generateDescription(payload);
      update({ description: res.data.description });
    } catch (err) {
      setError(formatError(err, 'Failed to generate AI description'));
    } finally {
      setGeneratingDescription(false);
    }
  };

  /* Helper to build payload */
  const buildPropertyPayload = () => {
    const cleanUnits = unitsActive
      ? (form.units || []).map((u) => ({
          unit_id: u.unit_id,
          name: String(u.name || '').trim(),
          area_sqft: u.area_sqft ? Number(u.area_sqft) : null,
          max_guests: Number(u.max_guests) || 1,
          bhk_type: u.bhk_type || null,
          tier: u.tier || null,
          images: Array.isArray(u.images) && u.images.length ? u.images : classPhotosOf(u.tier),
          price_per_night: u.price_per_night ? Number(u.price_per_night) : null,
        }))
      : [];
    const unitPrices = cleanUnits.map((u) => u.price_per_night).filter((v) => v !== null && v > 0);
    return {
      has_units: unitsActive,
      units: cleanUnits,
      title: form.title,
      description: form.description,
      property_type: form.property_type,
      category: form.category,
      bhk_type: unitsActive ? (cleanUnits[0]?.bhk_type || form.bhk_type) : form.bhk_type,
      address: form.address,
      city: form.city,
      state: form.state,
      pin_code: form.pin_code,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      google_maps_url: form.google_maps_url || null,
      nearby_places: form.nearby_places || [],
      area_sqft: unitsActive ? Number(cleanUnits[0]?.area_sqft || 0) : Number(form.area_sqft),
      max_guests: unitsActive ? Math.max(...cleanUnits.map((u) => u.max_guests), 1) : Number(form.max_guests),
      price_per_night: unitsActive ? (unitPrices.length ? Math.min(...unitPrices) : 0) : Number(form.price_per_night),
      pricing_display_mode: 'per_night',
      per_person_price: form.category === 'event_venue' ? null : (form.per_person_price ? Number(form.per_person_price) : null),
      extra_guest_price: form.category === 'event_venue' ? null : (form.extra_guest_price ? Number(form.extra_guest_price) : null),
      pricing_cycle: form.pricing_cycle || 'day',
      minimum_stay_days: Number(form.minimum_stay_days),
      amenities: form.amenities,
      images: form.images,
      video_url: form.video_url || null,
      youtube_short_url: form.youtube_short_url || null,
      youtube_long_url: form.youtube_long_url || null,
      house_rules: form.house_rules || null,
      pet_friendly: form.pet_friendly,
      smoking_allowed: form.smoking_allowed,
      instant_booking: form.instant_booking,
      ...(subscriptionRequired ? { subscription_id: form.subscription_plan_id } : {}),
      has_cook: form.category === 'event_venue' ? false : form.has_cook,
      cook_price: form.category === 'event_venue' ? null : (form.cook_price ? Number(form.cook_price) : null),
      has_self_cook: form.category === 'event_venue' ? false : form.has_self_cook,
      has_taxi: form.has_taxi,
      veg_price: form.has_veg && form.veg_price ? Number(form.veg_price) : null,
      non_veg_price: form.has_non_veg && form.non_veg_price ? Number(form.non_veg_price) : null,
      food_type: form.category === 'event_venue' ? (form.food_type || 'both') : null,
      guest_size: form.guest_size ? Number(form.guest_size) : null,
      packages: (form.packages || []).filter(pkg => {
        if (pkg.type === 'veg') return !!form.has_veg;
        if (pkg.type === 'non_veg') return !!form.has_non_veg;
        return true;
      }),
      check_in_time: form.check_in_time || '12:00',
      check_out_time: form.check_out_time || '11:00',
    };
  };

  const buildHostManagePayload = () => {
    const fullPayload = buildPropertyPayload();
    return {
      has_units: fullPayload.has_units,
      units: fullPayload.units,
      price_per_night: fullPayload.price_per_night,
      pricing_display_mode: fullPayload.pricing_display_mode,
      per_person_price: fullPayload.per_person_price,
      extra_guest_price: fullPayload.extra_guest_price,
      pricing_cycle: fullPayload.pricing_cycle,
      minimum_stay_days: fullPayload.minimum_stay_days,
      house_rules: fullPayload.house_rules,
      pet_friendly: fullPayload.pet_friendly,
      smoking_allowed: fullPayload.smoking_allowed,
      instant_booking: fullPayload.instant_booking,
      has_cook: fullPayload.has_cook,
      cook_price: fullPayload.cook_price,
      has_self_cook: fullPayload.has_self_cook,
      has_taxi: fullPayload.has_taxi,
      veg_price: fullPayload.veg_price,
      non_veg_price: fullPayload.non_veg_price,
      food_type: fullPayload.food_type,
      guest_size: fullPayload.guest_size,
      packages: fullPayload.packages,
      check_in_time: fullPayload.check_in_time,
      check_out_time: fullPayload.check_out_time,
      amenities: fullPayload.amenities,
      images: fullPayload.images,
      video_url: fullPayload.video_url,
      youtube_short_url: fullPayload.youtube_short_url,
      youtube_long_url: fullPayload.youtube_long_url,
    };
  };

  const collectUpiPaymentConfirmation = ({ subOrder, plan }) => (
    new Promise((resolve, reject) => {
      const amount = Number(subOrder.payable_amount || ((subOrder.amount || 0) / 100));
      const upiUrl = buildSubscriptionUpiUrl({
        amount,
        subscriptionId: subOrder.subscription_id,
        note: `X-Space360 ${subOrder.plan_name || plan?.plan_name || 'Subscription'}`,
      });
      setUpiPayment({
        isOpen: true,
        utr: '',
        error: '',
        submitting: false,
        amount,
        planName: subOrder.plan_name || plan?.plan_name || 'Subscription Plan',
        subscriptionId: subOrder.subscription_id,
        razorpayOrderId: subOrder.razorpay_order_id,
        upiUrl,
        qrUrl: buildQrImageUrl(upiUrl),
        onConfirm: async (utr) => {
          const cleanUtr = String(utr || '').trim();
          if (cleanUtr.length < 6) {
            setUpiPayment((prev) => ({ ...prev, error: 'Please enter a valid UTR / transaction ID.' }));
            return;
          }
          try {
            setUpiPayment((prev) => ({ ...prev, submitting: true, error: '' }));
            await subscriptionAPI.confirmSubscriptionUpi({
              subscription_id: subOrder.subscription_id,
              razorpay_order_id: subOrder.razorpay_order_id,
              upi_transaction_id: cleanUtr,
            });
            setUpiPayment((prev) => ({ ...prev, isOpen: false, submitting: false }));
            resolve(cleanUtr);
          } catch (err) {
            setUpiPayment((prev) => ({
              ...prev,
              submitting: false,
              error: formatError(err, 'Unable to confirm this UPI transaction.'),
            }));
          }
        },
        onCancel: () => {
          setUpiPayment((prev) => ({ ...prev, isOpen: false, submitting: false }));
          reject(new Error('Payment cancelled'));
        },
      });
    })
  );

  const processSubscriptionPayment = async (planId, propertyId) => {
    if (paying) return null;
    const subRes = await subscriptionAPI.subscribe({
      plan_id: planId,
      property_id: propertyId,
      coupon_code: subscriptionCouponCode.trim().toUpperCase() || undefined
    });
    const subOrder = subRes.data;
    const plan = plans.find(p => p.plan_id === planId);

    if (subOrder.already_active) {
      return subOrder;
    }

    if (subOrder.is_mock || String(subOrder.razorpay_order_id || '').startsWith('order_mock_')) {
      await subscriptionAPI.mockPaySubscription(subOrder.subscription_id, subOrder.razorpay_order_id);
      return subOrder;
    }

    const sdkLoaded = await loadRazorpaySdk();
    if (!sdkLoaded || !window.Razorpay) {
      throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
    }

    await new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: subOrder.razorpay_key_id,
        amount: subOrder.amount,
        currency: subOrder.currency || 'INR',
        name: 'X-Space360',
        description: `Plan: ${subOrder.plan_name || plan?.plan_name || 'Subscription Plan'}`,
        order_id: subOrder.razorpay_order_id,
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#006437' },
        handler: async (response) => {
          try {
            await subscriptionAPI.confirmSubscription({
              subscription_id: subOrder.subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve(response);
          } catch (err) {
            reject(new Error(formatError(err, 'Payment completed but subscription verification failed.')));
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      });
      rzp.on('payment.failed', (resp) => {
        reject(new Error(resp?.error?.description || 'Payment failed. Please try again.'));
      });
      rzp.open();
    });

    return subOrder;
  };

  const proceedFromPricingSummary = async () => {
    if (!pricingSummaryPlan) return;
    if (subscriptionCouponCode.trim() && !getSubscriptionBreakdown(pricingSummaryPlan).coupon) {
      setError('This coupon is not available for subscriptions.');
      return;
    }

    setError('');
    update({ subscription_plan_id: pricingSummaryPlan.plan_id });
    setPricingSummaryPlan(null);
    setStep(wizardNavigation.nextIndex);
  };

  const submitListing = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (user?.role === 'admin') {
        const targetId = editPropertyId || createdPropertyId;
        if (targetId) {
          await propertyAPI.updateProperty(targetId, buildPropertyPayload());
        } else {
          await propertyAPI.createProperty(buildPropertyPayload());
        }
        localStorage.removeItem(`list_property_form_${draftStorageId}`);
        localStorage.removeItem(`list_property_step_${draftStorageId}`);
        localStorage.removeItem(createdPropertyStorageKey);
        localStorage.removeItem(hostResumePathKey);
        alert('Property details updated successfully.');
        navigate('/admin/properties');
        return;
      }

      if (isHostManageMode) {
        await propertyAPI.updateProperty(editPropertyId, buildHostManagePayload());
        localStorage.removeItem(`list_property_form_${draftStorageId}`);
        localStorage.removeItem(`list_property_step_${draftStorageId}`);
        localStorage.removeItem(createdPropertyStorageKey);
        localStorage.removeItem(hostResumePathKey);
        alert('Property manage details saved successfully.');
        navigate('/host/dashboard');
        return;
      }

      // Re-read policy before checkout so a stale browser cannot start payment
      // after management disables it. Server also enforces the current policy.
      const freshPolicy = await subscriptionAPI.getListingPolicy();
      const requiresPayment = freshPolicy.data.enabled !== false && !listingExempt;
      setListingPolicy({ loading: false, enabled: freshPolicy.data.enabled !== false, error: '' });
      if (requiresPayment && !hasActiveSubscription && !form.subscription_plan_id) {
        throw new Error('Subscription payments are enabled. Return to the Subscription step and select a plan.');
      }
      const listingPayload = buildPropertyPayload();
      if (!requiresPayment) delete listingPayload.subscription_id;
      // 1. Create or update the property as DRAFT
      let propertyId = createdPropertyId;
      if (!propertyId) {
        const propRes = await propertyAPI.createProperty(listingPayload);
        propertyId = propRes.data.property_id;
        setCreatedPropertyId(propertyId);
        localStorage.setItem(createdPropertyStorageKey, propertyId);
      } else {
        await propertyAPI.updateProperty(propertyId, listingPayload);
      }

      // 2. Pay the subscription fee (Registration fee skipped)
      if (requiresPayment && form.subscription_plan_id && !hasActiveSubscription) {
        setPaying(true);
        await processSubscriptionPayment(form.subscription_plan_id, propertyId);
        setHasActiveSubscription(true);
        setPaying(false);
      }

      // 4. Submit property for verification
      await propertyAPI.submitForVerification(propertyId);
      localStorage.removeItem(`list_property_form_${draftStorageId}`);
      localStorage.removeItem(`list_property_step_${draftStorageId}`);
      localStorage.removeItem(createdPropertyStorageKey);
      localStorage.removeItem(hostResumePathKey);
      setSuccess(true);
    } catch (err) {
      setError(formatError(err, 'Failed to submit listing'));
      setPaying(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <HostWorkspaceShell
        activePath="/host/dashboard"
        sidebarTitle="Listing Wizard"
        sidebarDescription="Your property has been submitted successfully and the verification flow has started."
        heroTitle="Listing submitted"
        heroDescription="Your host workspace stays synced while the admin team reviews your listing."
        sidebarSnapshot={[
          ['Host', user?.full_name || 'Host'],
          ['Property', form.title || 'New listing'],
          ['Status', 'Under review'],
          ['Window', '48 hrs'],
        ]}
      >
        <div className="mx-auto flex w-full max-w-4xl py-6">
          <div
            className="w-full rounded-[32px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_20px_48px_rgba(15,23,42,0.08)] md:px-12 md:py-14"
            data-testid="listing-success"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">
              Verification Queue Started
            </p>
            <h2 className="mb-3 text-3xl font-black tracking-[-0.05em] text-slate-950 md:text-4xl">
              Listing submitted!
            </h2>
            <p className="mx-auto mb-2 max-w-2xl text-base text-slate-600">
              Your property <strong className="font-bold text-slate-950">{form.title}</strong> is now in the verification queue.
            </p>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-6 text-slate-500">
              Our Relationship Manager will review the listing, validate the details and notify you once it goes live.
              Typical review time is within 48 hours.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/host/dashboard')}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-black"
                data-testid="back-to-dashboard"
              >
                Back to dashboard
              </button>
              <button
                onClick={() => {
                  setForm(initialForm);
                  setStep(0);
                  setSuccess(false);
                  setCreatedPropertyId(null);
                  localStorage.removeItem(createdPropertyStorageKey);
                  setHasActiveSubscription(false);
                  setSubscriptionCouponCode('');
                  setPricingSummaryPlan(null);
                  navigate('/host/list-property', { replace: true, state: null });
                }}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                data-testid="list-another"
              >
                List another
              </button>
            </div>
          </div>
        </div>
        <HostSupportWidget context="property_listing" />
      </HostWorkspaceShell>
    );
  }

  const currentStep = STEPS[currentStepIndex].key;

  return (
    <HostWorkspaceShell
      activePath="/host/dashboard"
      sidebarTitle="Listing Wizard"
      sidebarDescription="Create a new property with the same host workspace experience and keep the onboarding flow organized."
      heroTitle="List your property"
      heroDescription={`${visibleStepIndex + 1} of ${visibleSteps.length} steps`}
      sidebarSnapshot={[
        ['Host', user?.full_name || 'Host'],
        ['Category', form.category || 'residential'],
        ['Step', `${visibleStepIndex + 1}/${visibleSteps.length}`],
        ['Mode', isHostManageMode ? 'manage' : 'new'],
      ]}
    >
      <div className="w-full max-w-[1480px] py-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-charcoal mb-1" data-testid="form-title">
          List your property
        </h1>
        <p className="text-charcoal-light text-sm mb-6">
          {visibleStepIndex + 1} of {visibleSteps.length} · {STEPS[currentStepIndex].label}
        </p>

        {/* Progress bar */}
        <div className="mb-8 flex items-center overflow-x-auto rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)]" data-testid="step-indicator">
          {visibleSteps.map((s, idx) => {
            const done = idx < visibleStepIndex;
            const active = idx === visibleStepIndex;
            const lockedInManage = isHostManageMode && !HOST_MANAGE_EDITABLE_STEP_KEYS.includes(s.key);
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center flex-shrink-0 ${lockedInManage ? 'opacity-35 blur-[1px]' : ''}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done
                        ? 'bg-slate-900 text-white'
                        : active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                    data-testid={`step-${s.key}`}
                  >
                    {done ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`ml-2 text-xs hidden md:inline ${active ? 'text-slate-950 font-semibold' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < visibleSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-slate-900' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-start space-x-2" data-testid="form-error">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isHostManageMode && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Submitted/live property management is limited to pricing rules, amenities, and photos/media. Other listing fields are locked.
          </div>
        )}

        <div className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.04)] md:p-7 ${isHostManageMode && !canEditCurrentStep ? 'opacity-50 blur-[1px] pointer-events-none select-none' : ''}`}>
          {currentStep === 'basics' && (
            <div className="space-y-4" data-testid="step-basics-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Tell us about your place</h2>
              <Input label="Title" testid="basics-title" value={form.title} onChange={(v) => update({ title: v })} placeholder="" />
              <div className="-mt-2 mb-2 px-1">
                <p className="text-xs font-semibold text-slate-500">ex. Cozy 2BHK with a sunset view</p>
              </div>
              <div className={`grid grid-cols-1 ${form.category === 'event_venue' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                <Select
                  label="Category"
                  testid="basics-category"
                  value={form.category}
                  onChange={(v) => {
                    const firstType = CATEGORY_DATA[v].propertyTypes[0].value;
                    const firstBhk = CATEGORY_DATA[v].bhkTypes[0].value;
                    update({ category: v, property_type: firstType, bhk_type: firstBhk, units: [], has_units: v === 'event_venue' ? false : form.has_units });
                  }}
                  options={[
                    { value: 'residential', label: 'Residential' },
                    { value: 'commercial', label: 'Commercial' },
                    { value: 'event_venue', label: 'Event Venue' },
                  ]}
                />
                <Select
                  label="Property type"
                  testid="basics-property-type"
                  value={form.property_type}
                  onChange={(v) => update({ property_type: v })}
                  options={CATEGORY_DATA[form.category].propertyTypes}
                />
                {form.category !== 'event_venue' && (
                  <Select
                    label="Listing type"
                    testid="basics-listing-type"
                    value={form.has_units ? 'units' : 'single'}
                    onChange={(v) => {
                      const hasUnits = v === 'units';
                      const patch = { has_units: hasUnits };
                      if (hasUnits && !(form.units || []).length) {
                        patch.units = [{
                          unit_id: makeUnitId(),
                          name: '',
                          area_sqft: '',
                          max_guests: '2',
                          bhk_type: unitBhkOptions[0]?.value || '',
                          price_per_night: '',
                        }];
                      }
                      update(patch);
                    }}
                    options={[
                      { value: 'single', label: 'Single property (no units)' },
                      { value: 'units', label: 'Property with units' },
                    ]}
                  />
                )}
              </div>

              {unitsActive ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="basics-units">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-charcoal">Units</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Add each bookable unit of this property. Area, guests and size are set per unit.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(form.units || []).map((unit, index) => (
                      <div key={unit.unit_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={`basics-unit-${index}`}>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unit {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeUnit(unit.unit_id)}
                            disabled={(form.units || []).length <= 1}
                            className="text-xs font-bold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                            data-testid={`basics-unit-remove-${index}`}
                          >
                            Remove
                          </button>
                        </div>
                        <Input
                          label="Unit name"
                          testid={`basics-unit-name-${index}`}
                          value={unit.name}
                          onChange={(v) => updateUnit(unit.unit_id, { name: v })}
                          placeholder="e.g. Deluxe Room 101"
                        />
                        <div className="mt-3">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal">Class</span>
                          <UnitClassSelect
                            testid={`basics-unit-tier-${index}`}
                            value={unit.tier || 'standard'}
                            onChange={(v) => updateUnit(unit.unit_id, { tier: v })}
                            customClasses={customUnitClasses}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Input
                            type="number"
                            label="Area (sq.ft)"
                            testid={`basics-unit-area-${index}`}
                            value={unit.area_sqft}
                            onChange={(v) => updateUnit(unit.unit_id, { area_sqft: v })}
                            placeholder="450"
                          />
                          <Input
                            type="number"
                            label={form.category === 'commercial' ? 'Maximum staff' : 'Maximum guests'}
                            testid={`basics-unit-guests-${index}`}
                            value={unit.max_guests}
                            onChange={(v) => updateUnit(unit.unit_id, { max_guests: v })}
                            placeholder="2"
                          />
                          <Select
                            label="BHK / Size"
                            testid={`basics-unit-bhk-${index}`}
                            value={unit.bhk_type || unitBhkOptions[0]?.value || ''}
                            onChange={(v) => updateUnit(unit.unit_id, { bhk_type: v })}
                            options={unitBhkOptions}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addUnit}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black"
                    data-testid="basics-add-unit"
                  >
                    + Add unit
                  </button>
                </div>
              ) : (
                <>
                  {form.category !== 'event_venue' && (
                    <Select
                      label="BHK / Size"
                      testid="basics-bhk-type"
                      value={form.bhk_type}
                      onChange={(v) => update({ bhk_type: v })}
                      options={CATEGORY_DATA[form.category].bhkTypes}
                    />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="number" label="Area (sq.ft)" testid="basics-area" value={form.area_sqft} onChange={(v) => update({ area_sqft: v })} placeholder="950" />
                    <Input
                      type="number"
                      label={form.category === 'commercial' ? 'Maximum staff' : form.category === 'event_venue' ? 'Maximum guest capacity' : 'Maximum guests'}
                      testid="basics-max-guests"
                      value={form.max_guests}
                      onChange={(v) => update({ max_guests: v })}
                      placeholder={form.category === 'event_venue' ? '200' : '6'}
                    />
                  </div>
                </>
              )}
              <Textarea label="Description" testid="basics-description" value={form.description} onChange={(v) => update({ description: v })} placeholder="Describe your space, neighbourhood, what makes it special…" rows={5} />
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={handleGenerateAIDescription}
                  disabled={generatingDescription}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-50"
                  data-testid="generate-ai-description"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  <span>{generatingDescription ? "Generating Description..." : "Generate with AI"}</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'location' && (
            <div className="space-y-4" data-testid="step-location-content">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-charcoal">Where is it?</h2>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={fetchingLocation}
                  className="flex items-center space-x-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-[0.98] hover:bg-black disabled:opacity-50"
                >
                  {fetchingLocation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  <span>{fetchingLocation ? "Fetching Location..." : "Use Current Location"}</span>
                </button>
              </div>
              
              <Input 
                label="Google Maps URL" 
                testid="location-map-url" 
                value={form.google_maps_url || ''} 
                onChange={handleMapUrlChange} 
                placeholder="https://www.google.com/maps/place/..." 
              />
              
              <Input label="Street address" testid="location-address" value={form.address} onChange={(v) => update({ address: v })} placeholder="123 Beach Road" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Pin code" testid="location-pin" value={form.pin_code} onChange={handlePincodeChange} placeholder="403001" />
                <Input label="City" testid="location-city" value={form.city} onChange={(v) => update({ city: v })} />
                <Input label="State" testid="location-state" value={form.state} onChange={(v) => update({ state: v })} />
              </div>
              
              {fetchingPincode && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 px-1 animate-pulse">
                  <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  Fetching location details...
                </p>
              )}
              
              {pincodeError && (
                <p className="text-xs text-red-500 px-1 font-semibold">
                  ⚠️ {pincodeError}
                </p>
              )}
              
              {localities.length > 0 && (
                <div className="p-4 bg-stone/50 rounded-2xl border border-gray-100 space-y-2 animate-fade-in">
                  <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block">Select Area / Locality / Post Office</label>
                  <select
                    onChange={(e) => handleLocalitySelect(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all font-semibold text-charcoal cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select Locality --</option>
                    {localities.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="number" label="Latitude (If Applicable)" testid="location-lat" value={form.latitude} onChange={handleLatChange} placeholder="15.5736" />
                <Input type="number" label="Longitude (If Applicable)" testid="location-lng" value={form.longitude} onChange={handleLngChange} placeholder="73.7407" />
              </div>

              {form.nearby_places && form.nearby_places.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <h3 className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Nearby Famous Places
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {form.nearby_places.map((place, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white text-charcoal border border-charcoal/10 text-xs font-semibold rounded-full shadow-sm">
                        {place}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-charcoal-light">
                Lat/lng helps your listing show up in map view. Pasting a Google Maps URL extracts the coordinates and finds famous landmarks automatically!
              </p>
            </div>
          )}

          {currentStep === 'pricing' && (
            <div className="space-y-4" data-testid="step-pricing-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Pricing & rules</h2>
              
              {form.category === 'event_venue' ? (
                <>
                  <div className="mb-5 bg-stone/50 p-5 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-2">Food Option (Select exactly one)</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center space-x-2 text-sm font-bold cursor-pointer text-charcoal select-none">
                        <input
                          type="radio"
                          name="food_type"
                          value="veg"
                          checked={form.food_type === 'veg'}
                          onChange={() => update({ food_type: 'veg', has_veg: true, has_non_veg: false, non_veg_price: '' })}
                          className="h-4 w-4 cursor-pointer text-slate-900 focus:ring-slate-400"
                        />
                        <span>Veg Only</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm font-bold cursor-pointer text-charcoal select-none">
                        <input
                          type="radio"
                          name="food_type"
                          value="non_veg"
                          checked={form.food_type === 'non_veg'}
                          onChange={() => update({ food_type: 'non_veg', has_veg: false, has_non_veg: true, veg_price: '' })}
                          className="h-4 w-4 cursor-pointer text-slate-900 focus:ring-slate-400"
                        />
                        <span>Non-Veg Only</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm font-bold cursor-pointer text-charcoal select-none">
                        <input
                          type="radio"
                          name="food_type"
                          value="both"
                          checked={form.food_type === 'both'}
                          onChange={() => update({ food_type: 'both', has_veg: true, has_non_veg: true })}
                          className="h-4 w-4 cursor-pointer text-slate-900 focus:ring-slate-400"
                        />
                        <span>Both Veg & Non-Veg</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input 
                      type="number" 
                      label="Veg Price (per plate ₹)" 
                      testid="pricing-veg-price"
                      value={form.has_veg ? form.veg_price : ''} 
                      onChange={(v) => update({ veg_price: v })} 
                      placeholder={form.has_veg ? "1200" : "Disabled"} 
                      disabled={!form.has_veg}
                    />
                    <Input 
                      type="number" 
                      label="Non-Veg Price (per plate ₹)" 
                      testid="pricing-nonveg-price"
                      value={form.has_non_veg ? form.non_veg_price : ''} 
                      onChange={(v) => update({ non_veg_price: v })} 
                      placeholder={form.has_non_veg ? "1500" : "Disabled"} 
                      disabled={!form.has_non_veg}
                    />
                    <Input 
                      type="number" 
                      label="Venue Price per day (₹)" 
                      testid="pricing-venue-price"
                      value={form.price_per_night} 
                      onChange={(v) => update({ price_per_night: v })} 
                      placeholder="15000" 
                    />
                  </div>
                  {(form.has_veg || form.has_non_veg) && (
                    <div className="mt-6">
                      <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-3">
                        Package Details (Veg & Non-Veg Inclusions)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Veg Column */}
                        {form.has_veg && (
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="flex items-center px-4 py-3 bg-green-50 border-b border-green-200">
                              <div className="w-3 h-3 bg-green-500 rounded-sm mr-2 border border-green-700"></div>
                              <span className="font-bold text-green-900 text-sm tracking-wide">Vegetarian</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2 bg-stone/50 border-b border-gray-100">
                              <span className="text-xs font-bold tracking-tight text-charcoal">Food items</span>
                              <div className="text-right">
                                <span className="text-xs font-bold tracking-tight text-charcoal block">Package</span>
                                <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.veg_price || '1200'}/Plate</span>
                              </div>
                            </div>
                            <div className="divide-y divide-sand-100">
                              {vegItemsList.map((item) => (
                                <div key={`veg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone/30 transition-colors">
                                  <EditableItemName 
                                    initialName={item} 
                                    onRename={(newName) => handleRenameItem('veg', item, newName)} 
                                  />
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={getPackageValue('veg', item)}
                                    onChange={(e) => handlePackageUpdate('veg', item, e.target.value)}
                                    className="w-12 text-center bg-transparent border-none text-charcoal font-bold text-sm outline-none focus:ring-0 p-0"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Non-Veg Column */}
                        {form.has_non_veg && (
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="flex items-center px-4 py-3 bg-red-50 border-b border-red-200">
                              <div className="w-3 h-3 bg-red-500 rounded-full mr-2 border border-red-700"></div>
                              <span className="font-bold text-red-900 text-sm tracking-wide">Non Vegetarian</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2 bg-stone/50 border-b border-gray-100">
                              <span className="text-xs font-bold tracking-tight text-charcoal">Food items</span>
                              <div className="text-right">
                                <span className="text-xs font-bold tracking-tight text-charcoal block">Package</span>
                                <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.non_veg_price || '1500'}/Plate</span>
                              </div>
                            </div>
                            <div className="divide-y divide-sand-100">
                              {nonVegItemsList.map((item) => (
                                <div key={`nonveg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone/30 transition-colors">
                                  <EditableItemName 
                                    initialName={item} 
                                    onRename={(newName) => handleRenameItem('non_veg', item, newName)} 
                                  />
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={getPackageValue('non_veg', item)}
                                    onChange={(e) => handlePackageUpdate('non_veg', item, e.target.value)}
                                    className="w-12 text-center bg-transparent border-none text-charcoal font-bold text-sm outline-none focus:ring-0 p-0"
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`grid grid-cols-1 ${form.category === 'residential' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    {!unitsActive && (<Input 
                      type="number" 
                      label={
                        form.category === 'commercial' 
                          ? (form.pricing_cycle === 'hourly' ? 'Price per hour (₹)' : form.pricing_cycle === 'weekly' ? 'Price per week (₹)' : form.pricing_cycle === 'monthly' ? 'Price per month (₹)' : 'Price per day (₹)')
                          : 'Price per night (₹)'
                      } 
                      testid="pricing-price" 
                      value={form.price_per_night} 
                      onChange={(v) => update({ price_per_night: v })} 
                      placeholder={
                        form.pricing_cycle === 'hourly' ? '500' : form.pricing_cycle === 'weekly' ? '25000' : form.pricing_cycle === 'monthly' ? '90000' : (form.category === 'commercial' ? '5000' : '3500')
                      } 
                    />)}
                    {form.category === 'commercial' && (
                      <Select
                        label="Pricing unit"
                        testid="pricing-cycle"
                        value={form.pricing_cycle || 'day'}
                        onChange={(v) => update({ pricing_cycle: v })}
                        options={PRICING_CYCLE_OPTIONS}
                      />
                    )}
                    <Input 
                      type="number" 
                      label={
                        form.category === 'commercial'
                          ? `Minimum duration (${form.pricing_cycle === 'hourly' ? 'hours' : form.pricing_cycle === 'weekly' ? 'weeks' : form.pricing_cycle === 'monthly' ? 'months' : 'days'})`
                          : 'Minimum stay (nights)'
                      } 
                      testid="pricing-min-stay" 
                      value={form.minimum_stay_days} 
                      onChange={(v) => update({ minimum_stay_days: v })} 
                    />
                  </div>
                  {(form.category === 'residential' || form.category === 'commercial') && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="hidden">
                        <Input
                          type="number"
                          label={form.category === 'commercial' ? 'Per person/staff price (₹)' : 'Per person price (₹)'}
                          testid="pricing-per-person-price"
                          value={form.per_person_price}
                          onChange={(v) => update({ per_person_price: v })}
                          placeholder={form.pricing_display_mode === 'per_person' ? '1200' : '0'}
                        />
                        </div>
                        <Input
                          type="number"
                          label={form.category === 'commercial' ? 'Extra person/staff price (₹)' : 'Extra person price (₹)'}
                          testid="pricing-extra-guest-price"
                          value={form.extra_guest_price}
                          onChange={(v) => update({ extra_guest_price: v })}
                          placeholder="1000"
                        />
                      </div>
                    </div>
                  )}
                  {unitsActive && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="pricing-units">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-charcoal">
                            {form.category === 'commercial'
                              ? `Unit prices (per ${form.pricing_cycle === 'hourly' ? 'hour' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day'})`
                              : 'Unit prices (per night)'}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Minimum stay and extra person price above apply to every unit.</p>
                        </div>
                        {(form.units || []).length > 1 && (
                          <button
                            type="button"
                            onClick={applyFirstUnitPriceToAll}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-charcoal transition hover:bg-slate-100"
                            data-testid="pricing-apply-all"
                          >
                            Apply first unit's price to all
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {(form.units || []).map((unit, index) => (
                          <div key={unit.unit_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="min-w-0">
                              <input
                                type="text"
                                value={unit.name || ""}
                                onChange={(e) => updateUnit(unit.unit_id, { name: e.target.value })}
                                placeholder={`Unit ${index + 1} name`}
                                maxLength={60}
                                aria-label={`Name of unit ${index + 1}`}
                                data-testid={`pricing-unit-name-${index}`}
                                className="w-full max-w-[320px] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 -ml-1.5 text-sm font-bold text-charcoal outline-none transition hover:border-slate-300 focus:border-slate-500 focus:bg-white"
                              />
                              <p className="text-[11px] font-semibold text-slate-500">{unit.area_sqft ? `${unit.area_sqft} sq.ft · ` : ''}{unit.max_guests} guests</p>
                              <UnitClassSelect allowNone className="mt-1 !py-1 !text-[11px]" testid={`pricing-unit-tier-${index}`} value={unit.tier || ''} onChange={(v) => updateUnit(unit.unit_id, { tier: v })} customClasses={customUnitClasses} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-500">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={unit.price_per_night}
                                onChange={(e) => updateUnit(unit.unit_id, { price_per_night: e.target.value })}
                                placeholder="3500"
                                className="w-28 rounded-lg border px-3 py-2 text-sm font-bold text-charcoal"
                                data-testid={`pricing-unit-price-${index}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4" data-testid="pricing-add-unit">
                        <p className="mb-3 text-sm font-bold text-charcoal">Add a new unit</p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                          <input value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} placeholder="Unit name" className="col-span-2 rounded-lg border px-3 py-2 text-sm" data-testid="new-unit-name" />
                          <input type="number" min="0" value={newUnit.area_sqft} onChange={(e) => setNewUnit({ ...newUnit, area_sqft: e.target.value })} placeholder="Area sq.ft" className="rounded-lg border px-3 py-2 text-sm" />
                          <input type="number" min="1" value={newUnit.max_guests} onChange={(e) => setNewUnit({ ...newUnit, max_guests: e.target.value })} placeholder="Guests" className="rounded-lg border px-3 py-2 text-sm" />
                          <UnitClassSelect value={newUnit.tier} onChange={(v) => setNewUnit({ ...newUnit, tier: v })} customClasses={customUnitClasses} />
                          <input type="number" min="0" value={newUnit.price_per_night} onChange={(e) => setNewUnit({ ...newUnit, price_per_night: e.target.value })} placeholder="Price" className="rounded-lg border px-3 py-2 text-sm" data-testid="new-unit-price" />
                        </div>
                        <button type="button" onClick={submitNewUnit} className="mt-3 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white" data-testid="new-unit-add">Add unit</button>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-charcoal">House rules</h3>
                      <p className="text-xs text-charcoal-muted font-semibold mt-1">Add rules one by one. You can edit or remove them anytime.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newHouseRule}
                        onChange={(e) => setNewHouseRule(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHouseRule();
                          }
                        }}
                        className="flex-1 bg-stone border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta font-semibold text-charcoal"
                        placeholder="e.g. Quiet hours after 10 PM"
                        data-testid="pricing-rule-input"
                      />
                      <button
                        type="button"
                        onClick={addHouseRule}
                        className="inline-flex items-center justify-center gap-2 bg-charcoal text-white rounded-xl px-4 py-3 text-xs font-bold hover:bg-black transition"
                        data-testid="pricing-rule-add"
                      >
                        <Plus className="w-4 h-4" /> Add Rule
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {houseRuleItems.length === 0 ? (
                        <div className="text-xs font-semibold text-charcoal-light bg-stone rounded-xl px-4 py-3">No house rules added yet.</div>
                      ) : houseRuleItems.map((rule, index) => (
                        <div key={`${rule}-${index}`} className="flex items-center gap-2 bg-stone border border-gray-100 rounded-xl px-3 py-2">
                          {editingRuleIndex === index ? (
                            <input
                              type="text"
                              value={editingRuleValue}
                              onChange={(e) => setEditingRuleValue(e.target.value)}
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-terracotta"
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1 text-sm font-semibold text-charcoal">{rule}</span>
                          )}
                          {editingRuleIndex === index ? (
                            <button type="button" onClick={saveEditedHouseRule} className="p-2 rounded-lg text-green-700 hover:bg-green-50" aria-label="Save rule">
                              <Save className="w-4 h-4" />
                            </button>
                          ) : (
                            <button type="button" onClick={() => startEditHouseRule(index)} className="p-2 rounded-lg text-charcoal-muted hover:bg-white" aria-label="Edit rule">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => removeHouseRule(index)} className="p-2 rounded-lg text-red-500 hover:bg-red-50" aria-label="Delete rule">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Check-in / Check-out Time */}
                  <div className="bg-stone rounded-2xl border border-gray-100 p-4">
                    <h3 className="text-sm font-bold text-charcoal mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <span>⏰</span> Check-in &amp; Check-out Times
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-2">Check-in Time</label>
                        <TimeSelect format12={false} value={form.check_in_time || '12:00'} onChange={(val) => update({ check_in_time: val })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-2">Check-out Time</label>
                        <TimeSelect format12={false} value={form.check_out_time || '11:00'} onChange={(val) => update({ check_out_time: val })} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Toggle label="Instant booking" testid="pricing-instant" checked={form.instant_booking} onChange={(v) => update({ instant_booking: v })} />
                    <Toggle label="Pet-friendly" testid="pricing-pet" checked={form.pet_friendly} onChange={(v) => update({ pet_friendly: v })} />
                    <Toggle label="Smoking allowed" testid="pricing-smoking" checked={form.smoking_allowed} onChange={(v) => update({ smoking_allowed: v })} />
                  </div>
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Additional Services</h3>
                    <div className="bg-stone p-4 rounded-2xl border border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <Toggle 
                          label="Cook service available at property" 
                          testid="pricing-cook-available" 
                          checked={form.has_cook} 
                          onChange={(v) => update({ has_cook: v, cook_price: v ? form.cook_price : '', has_veg: v ? form.has_veg : false, has_non_veg: v ? form.has_non_veg : false })} 
                        />
                        {form.has_cook && (
                          <Input 
                            type="number" 
                            label="Cook Price per day (₹)" 
                            testid="pricing-cook-price" 
                            value={form.cook_price} 
                            onChange={(v) => update({ cook_price: v })} 
                            placeholder="500" 
                          />
                        )}
                      </div>
                      
                      {form.has_cook && (
                        <div className="border-t border-gray-150 pt-4 mt-4 space-y-4">
                          <h4 className="text-xs font-bold tracking-tight text-charcoal-light uppercase tracking-wider">Food / Catering Menu Options (Veg/Non-Veg Packages)</h4>
                          <div className="flex flex-wrap gap-6 bg-stone/50 p-4 rounded-2xl border border-gray-100">
                            <label className="flex items-center space-x-2.5 text-sm font-bold cursor-pointer text-charcoal select-none">
                              <input
                                type="checkbox"
                                checked={!!form.has_veg}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  update({ has_veg: checked, veg_price: checked ? form.veg_price : '' });
                                }}
                                className="h-4.5 w-4.5 cursor-pointer rounded border-gray-300 text-slate-900 focus:ring-slate-400"
                              />
                              <span>Vegetarian Food Available</span>
                            </label>
                            <label className="flex items-center space-x-2.5 text-sm font-bold cursor-pointer text-charcoal select-none">
                              <input
                                type="checkbox"
                                checked={!!form.has_non_veg}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  update({ has_non_veg: checked, non_veg_price: checked ? form.non_veg_price : '' });
                                }}
                                className="h-4.5 w-4.5 cursor-pointer rounded border-gray-300 text-slate-900 focus:ring-slate-400"
                              />
                              <span>Non-Vegetarian Food Available</span>
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {form.has_veg && (
                              <Input 
                                type="number" 
                                label="Veg Plate Price (₹)" 
                                testid="pricing-veg-price"
                                value={form.veg_price} 
                                onChange={(v) => update({ veg_price: v })} 
                                placeholder="1200" 
                              />
                            )}
                            {form.has_non_veg && (
                              <Input 
                                type="number" 
                                label="Non-Veg Plate Price (₹)" 
                                testid="pricing-nonveg-price"
                                value={form.non_veg_price} 
                                onChange={(v) => update({ non_veg_price: v })} 
                                placeholder="1500" 
                              />
                            )}
                          </div>

                          {(form.has_veg || form.has_non_veg) && (
                            <div className="mt-4">
                              <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-3">
                                Food Package / Menu Inclusions
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Veg Column */}
                                {form.has_veg && (
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="flex items-center px-4 py-3 bg-green-50 border-b border-green-200">
                                      <div className="w-3 h-3 bg-green-500 rounded-sm mr-2 border border-green-700"></div>
                                      <span className="font-bold text-green-900 text-sm tracking-wide">Vegetarian Menu</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-2 bg-stone/50 border-b border-gray-100">
                                      <span className="text-xs font-bold tracking-tight text-charcoal">Food items</span>
                                      <div className="text-right">
                                        <span className="text-xs font-bold tracking-tight text-charcoal block">Package</span>
                                        <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.veg_price || '1200'}/Plate</span>
                                      </div>
                                    </div>
                                    <div className="divide-y divide-sand-100">
                                      {vegItemsList.map((item) => (
                                        <div key={`veg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone/30 transition-colors">
                                          <EditableItemName 
                                            initialName={item} 
                                            onRename={(newName) => handleRenameItem('veg', item, newName)} 
                                          />
                                          <input 
                                            type="number" 
                                            min="0"
                                            value={getPackageValue('veg', item)}
                                            onChange={(e) => handlePackageUpdate('veg', item, e.target.value)}
                                            className="w-12 text-center bg-transparent border-none text-charcoal font-bold text-sm outline-none focus:ring-0 p-0"
                                            placeholder="0"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Non-Veg Column */}
                                {form.has_non_veg && (
                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="flex items-center px-4 py-3 bg-red-50 border-b border-red-200">
                                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2 border border-red-700"></div>
                                      <span className="font-bold text-red-900 text-sm tracking-wide">Non Vegetarian Menu</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-2 bg-stone/50 border-b border-gray-100">
                                      <span className="text-xs font-bold tracking-tight text-charcoal">Food items</span>
                                      <div className="text-right">
                                        <span className="text-xs font-bold tracking-tight text-charcoal block">Package</span>
                                        <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.non_veg_price || '1500'}/Plate</span>
                                      </div>
                                    </div>
                                    <div className="divide-y divide-sand-100">
                                      {nonVegItemsList.map((item) => (
                                        <div key={`nonveg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone/30 transition-colors">
                                          <EditableItemName 
                                            initialName={item} 
                                            onRename={(newName) => handleRenameItem('non_veg', item, newName)} 
                                          />
                                          <input 
                                            type="number" 
                                            min="0"
                                            value={getPackageValue('non_veg', item)}
                                            onChange={(e) => handlePackageUpdate('non_veg', item, e.target.value)}
                                            className="w-12 text-center bg-transparent border-none text-charcoal font-bold text-sm outline-none focus:ring-0 p-0"
                                            placeholder="0"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-100/60 pt-3">
                        <Toggle 
                          label="Self cooking option available (Guests can cook themselves)" 
                          testid="pricing-self-cook" 
                          checked={form.has_self_cook} 
                          onChange={(v) => update({ has_self_cook: v })} 
                        />
                      </div>
                      <div className="border-t border-sand-200/60 pt-3">
                        <Toggle 
                          label="Taxi service available at property" 
                          testid="pricing-taxi-available" 
                          checked={form.has_taxi} 
                          onChange={(v) => update({ has_taxi: v })} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 'amenities' && (
            <div className="space-y-4" data-testid="step-amenities-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">What amenities do you offer?</h2>
              <p className="text-sm text-charcoal-light">Pick all that apply. You can edit this later.</p>
              <div className="flex flex-wrap gap-2 mb-6" data-testid="amenities-pills">
                {availableAmenityOptions.map((a) => {
                  const active = form.amenities.includes(a.value);
                  const AmenityIcon = getAmenityIcon(a.value, a.label);
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => !a.custom && toggleAmenity(a.value)}
                      className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-gray-200 bg-white text-charcoal hover:border-slate-400'
                      }`}
                      data-testid={`amenity-${a.value}`}
                    >
                      <AmenityIcon className="w-4 h-4" />
                      <span>{a.label}</span>
                      {a.custom && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAmenity(a.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAmenity(a.value);
                            }
                          }}
                          className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                          aria-label={`Remove ${a.label}`}
                        >
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="bg-stone border border-gray-100 rounded-2xl p-4 mb-6">
                <h3 className="text-sm font-bold text-charcoal mb-3">Add custom amenity</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newAmenityLabel}
                    onChange={(e) => setNewAmenityLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAmenity();
                      }
                    }}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta font-semibold text-charcoal"
                    placeholder="e.g. Jacuzzi, Lake View, EV Charging"
                    data-testid="amenity-custom-input"
                  />
                  <button
                    type="button"
                    onClick={addCustomAmenity}
                    className="inline-flex items-center justify-center gap-2 bg-charcoal text-white rounded-xl px-4 py-3 text-xs font-bold hover:bg-black transition"
                    data-testid="amenity-custom-add"
                  >
                    <Plus className="w-4 h-4" /> Add Amenity
                  </button>
                </div>
              </div>

              {form.category === 'event_venue' && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h2 className="text-xl font-bold text-charcoal mb-6">Venue policies</h2>
                  
                  <div className="space-y-6">
                    {/* Timings */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-subtle">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                            <Sun className="w-4 h-4" />
                          </div>
                          <label className="text-xs font-bold uppercase tracking-wider text-charcoal">Morning Timing</label>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">Start Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_morning_start || ''} onChange={(val) => handleVenuePolicyChange('timings_morning_start', val)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">End Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_morning_end || ''} onChange={(val) => handleVenuePolicyChange('timings_morning_end', val)} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-subtle">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                            <SunDim className="w-4 h-4" />
                          </div>
                          <label className="text-xs font-bold uppercase tracking-wider text-charcoal">Afternoon Timing</label>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">Start Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_afternoon_start || ''} onChange={(val) => handleVenuePolicyChange('timings_afternoon_start', val)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">End Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_afternoon_end || ''} onChange={(val) => handleVenuePolicyChange('timings_afternoon_end', val)} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-subtle">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                            <Moon className="w-4 h-4" />
                          </div>
                          <label className="text-xs font-bold uppercase tracking-wider text-charcoal">Evening Timing</label>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">Start Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_evening_start || ''} onChange={(val) => handleVenuePolicyChange('timings_evening_start', val)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal-light font-bold">End Time</span>
                            <TimePicker12h value={getVenuePolicies().timings_evening_end || ''} onChange={(val) => handleVenuePolicyChange('timings_evening_end', val)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Taxes & Advance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-2">Taxes (%)</label>
                        <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="18.00" value={getVenuePolicies().taxes || ''} onChange={(e) => handleVenuePolicyChange('taxes', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-2">Advance Booking (%) (If Applicable)</label>
                        <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="20" value={getVenuePolicies().advance || ''} onChange={(e) => handleVenuePolicyChange('advance', e.target.value)} />
                      </div>
                    </div>

                    {/* Lodging & Rooms */}
                    <div>
                      <h3 className="text-sm font-bold text-charcoal mb-3">Lodging & Rooms</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="flex items-center">
                           <Toggle label="Rooms Available" checked={getVenuePolicies().rooms_available || false} onChange={(v) => handleVenuePolicyChange('rooms_available', v)} />
                         </div>
                         <input type="number" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="No. of rooms" value={getVenuePolicies().rooms_count || ''} onChange={(e) => handleVenuePolicyChange('rooms_count', e.target.value)} />
                         <input type="number" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="Avg price per room (₹)" value={getVenuePolicies().room_price || ''} onChange={(e) => handleVenuePolicyChange('room_price', e.target.value)} />
                      </div>
                    </div>

                    {/* Food & Alcohol */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <h3 className="text-sm font-bold text-charcoal mb-3">Food & Decor</h3>
                         <div className="space-y-3">
                           <Toggle label="Food provided by venue" checked={getVenuePolicies().food_venue || false} onChange={(v) => handleVenuePolicyChange('food_venue', v)} />
                           <Toggle label="No outside food allowed" checked={getVenuePolicies().food_outside || false} onChange={(v) => handleVenuePolicyChange('food_outside', v)} />
                           <Toggle label="Non-Veg allowed" checked={getVenuePolicies().food_nonveg || false} onChange={(v) => handleVenuePolicyChange('food_nonveg', v)} />
                           <Toggle label="Decor provided by venue" checked={getVenuePolicies().decor_venue || false} onChange={(v) => handleVenuePolicyChange('decor_venue', v)} />
                           <Toggle label="Outside decorators allowed" checked={getVenuePolicies().decor_outside || false} onChange={(v) => handleVenuePolicyChange('decor_outside', v)} />
                         </div>
                       </div>
                       <div>
                         <h3 className="text-sm font-bold text-charcoal mb-3">Alcohol & Parking</h3>
                         <div className="space-y-3">
                           <Toggle label="Alcohol allowed" checked={getVenuePolicies().alcohol_allowed || false} onChange={(v) => handleVenuePolicyChange('alcohol_allowed', v)} />
                           <Toggle label="Outside alcohol allowed" checked={getVenuePolicies().alcohol_outside || false} onChange={(v) => handleVenuePolicyChange('alcohol_outside', v)} />
                           <Toggle label="Valet parking provided" checked={getVenuePolicies().parking_valet || false} onChange={(v) => handleVenuePolicyChange('parking_valet', v)} />
                         </div>
                         <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm mt-4 outline-none focus:border-terracotta transition-all" placeholder="Parking space (e.g. 200 vehicles)" value={getVenuePolicies().parking_space || ''} onChange={(e) => handleVenuePolicyChange('parking_space', e.target.value)} />
                       </div>
                    </div>

                    {/* Other Policies */}
                    <div>
                      <h3 className="text-sm font-bold text-charcoal mb-3">Other Policies</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Toggle label="Changing Room A/C" checked={getVenuePolicies().changing_room_ac || false} onChange={(v) => handleVenuePolicyChange('changing_room_ac', v)} />
                        <Toggle label="Music allowed late" checked={getVenuePolicies().other_music || false} onChange={(v) => handleVenuePolicyChange('other_music', v)} />
                        <Toggle label="Halls are air conditioned" checked={getVenuePolicies().other_ac || false} onChange={(v) => handleVenuePolicyChange('other_ac', v)} />
                        <Toggle label="Baarat allowed" checked={getVenuePolicies().other_baarat || false} onChange={(v) => handleVenuePolicyChange('other_baarat', v)} />
                        <Toggle label="Fire crackers allowed" checked={getVenuePolicies().other_firecrackers || false} onChange={(v) => handleVenuePolicyChange('other_firecrackers', v)} />
                        <Toggle label="Hawan allowed" checked={getVenuePolicies().other_hawan || false} onChange={(v) => handleVenuePolicyChange('other_hawan', v)} />
                        <Toggle label="Overnight wedding allowed" checked={getVenuePolicies().other_overnight || false} onChange={(v) => handleVenuePolicyChange('other_overnight', v)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'photos' && (
            <div className="space-y-4" data-testid="step-photos-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Add photos</h2>
              {unitsActive && (form.units || []).length > 0 && (
                <div className="mb-1 flex flex-wrap gap-2" role="tablist" aria-label="Photo type">
                  {[
                    ['property', 'Property photos', 'Shared by the whole property'],
                    ['units', 'Room photos', 'One set of photos for each class (Deluxe, Premium...)'],
                  ].map(([key, label, hint]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={photoMode === key}
                      onClick={() => setPhotoMode(key)}
                      className={`rounded-2xl border px-4 py-2.5 text-left transition ${photoMode === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-charcoal hover:border-slate-400'}`}
                    >
                      <span className="block text-sm font-bold">{label}</span>
                      <span className={`block text-[11px] ${photoMode === key ? 'text-white/70' : 'text-charcoal-light'}`}>{hint}</span>
                    </button>
                  ))}
                </div>
              )}
              {unitsActive && photoMode === 'units' && (form.units || []).length > 0 ? (
                <div className="space-y-4" data-testid="unit-photos">
                  <p className="text-sm text-charcoal-light">
                    Add photos once for each class. Every room of that class shows the same photos, so Deluxe photos appear on all your Deluxe rooms. Up to {MAX_UNIT_PHOTOS} photos per class. Property photos stay in the other tab.
                  </p>
                  {unitClasses.map((group) => {
                    const photos = classPhotosOf(group.key);
                    const busy = unitPhotoBusy === group.key;
                    return (
                      <div key={group.key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-charcoal">{group.label}</p>
                            <p className="text-[11px] font-semibold text-charcoal-light">
                              {group.units.length} room{group.units.length === 1 ? '' : 's'}: {group.units.map((u) => u.name || 'Unnamed').join(', ')} · {photos.length} photo{photos.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span>{busy ? 'Uploading...' : `Add ${group.label} photos`}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              data-testid={`class-photo-input-${group.key}`}
                              onChange={(e) => { handleClassPhotos(group.key, e.target.files); e.target.value = ''; }}
                            />
                          </label>
                        </div>
                        {photos.length > 0 ? (
                          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                            {photos.map((src, photoIndex) => (
                              <div key={src + photoIndex} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                <img src={getImageUrl(String(src).split('#')[0])} alt={`${group.label} photo ${photoIndex + 1}`} className="h-full w-full object-cover" />
                                {photoIndex === 0 && <span className="absolute left-1 top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Cover</span>}
                                <button
                                  type="button"
                                  onClick={() => removeClassPhoto(group.key, photoIndex)}
                                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm hover:bg-red-50"
                                  aria-label={`Remove photo ${photoIndex + 1} of ${group.label}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-charcoal-light">No {group.label} photos yet. Guests will see the property photos for these rooms.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
              <>
              <p className="text-sm text-charcoal-light">
                Upload device photos or paste image URLs. The first photo is your cover. Device uploads are automatically watermarked before they appear here, while pasted URLs display as provided.
              </p>
              <div className="flex gap-2 flex-wrap">
                <label
                  className={`inline-flex cursor-pointer items-center space-x-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                  data-testid="upload-file-btn"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{uploadingPhoto ? 'Uploading…' : 'Upload from device'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    data-testid="upload-file-input"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setIsImageUrlDialogOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  data-testid="add-url-btn"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Paste URL</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6" data-testid="photos-grid">
                {form.images.map((src, idx) => {
                  const [url, category] = src.split('#');
                  return (
                    <div key={src + idx} className="relative group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm transition-all hover:shadow-premium">
                      <div className="relative h-48">
                        <img src={getImageUrl(url)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {idx === 0 && (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight tracking-widest text-white">
                              COVER
                            </span>
                          )}
                          <span className="text-[10px] bg-white/90 text-charcoal px-2 py-0.5 rounded-full font-bold tracking-tight uppercase tracking-widest shadow-sm">
                            Watermarked Preview
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url, index: idx })}
                          className="absolute bottom-2 right-2 bg-white/90 text-charcoal rounded-full p-2 opacity-100 transition shadow-sm hover:bg-white"
                          aria-label={`Preview photo ${idx + 1}`}
                          title="Preview full image"
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-2 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50"
                          data-testid={`remove-photo-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 bg-stone/50">
                        <label className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1 block">Photo Category <span className="text-red-600">*</span></label>
                        <select
                          value={category || ''}
                          data-testid={`photo-category-${idx}`}
                          onChange={(e) => {
                            const newImages = [...form.images];
                            newImages[idx] = `${url}#${e.target.value}`;
                            update({ images: newImages });
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-bold text-charcoal outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="" disabled>Select category</option>
                          {PHOTO_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {form.images.length === 0 && (
                  <div className="col-span-full border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-charcoal-light">
                    No photos yet
                  </div>
                )}
              </div>

              <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-black/95">
                  <DialogTitle className="sr-only">Photo preview</DialogTitle>
                  {previewImage && (
                    <div className="relative">
                      <img
                        src={getImageUrl(previewImage.url)}
                        alt={`Preview ${previewImage.index + 1}`}
                        className="w-full max-h-[85vh] object-contain bg-black"
                      />
                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-charcoal shadow-sm">
                        Full Preview
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog
                open={isImageUrlDialogOpen}
                onOpenChange={(open) => {
                  setIsImageUrlDialogOpen(open);
                  if (!open) setImageUrlDraft('');
                }}
              >
                <DialogContent className="max-w-xl border-none rounded-[28px] bg-white p-0 overflow-hidden shadow-2xl">
                  <DialogTitle className="sr-only">Paste image URL</DialogTitle>
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                          Add Photo By URL
                        </p>
                        <h3 className="mt-2 text-2xl font-black tracking-tight text-charcoal">
                          Paste image link
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-charcoal-light">
                          Add a public image URL and we will save a hosted copy with the same transparent watermark.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-charcoal-muted">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrlDraft}
                        onChange={(e) => setImageUrlDraft(e.target.value)}
                        placeholder="https://example.com/property-photo.jpg"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-charcoal outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        autoFocus
                      />
                    </div>
                    <div className="mt-6 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsImageUrlDialogOpen(false);
                          setImageUrlDraft('');
                        }}
                        className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={uploadingPhoto}
                        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-black disabled:opacity-60"
                      >
                        {uploadingPhoto ? 'Adding...' : 'Add URL'}
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Property Video & YouTube Links Section */}
              <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
                    <Video className="w-5 h-5 text-slate-700" />
                    Property Video
                  </h3>
                  <p className="text-xs text-charcoal-light mt-1">
                    Add a high-quality property walkthrough video. Supported formats: MP4, MOV, WebM (Max 50MB).
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <label
                    className={`inline-flex cursor-pointer items-center space-x-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black ${uploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}
                    data-testid="upload-video-btn"
                  >
                    {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploadingVideo ? 'Uploading Video…' : 'Upload video file'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteVideoUrl}
                    className="inline-flex items-center space-x-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    <Play className="w-4 h-4" />
                    <span>Paste Video URL</span>
                  </button>
                </div>

                {form.video_url && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Video className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">Uploaded Video</span>
                        <span className="text-sm font-semibold text-charcoal truncate block">{form.video_url}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="text-red-600 hover:text-red-800 p-2 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="border-t border-sand-150 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-light block mb-2">
                      YouTube Short Link
                    </label>
                    <input
                      type="url"
                      value={form.youtube_short_url || ''}
                      onChange={(e) => update({ youtube_short_url: e.target.value })}
                      placeholder="https://www.youtube.com/shorts/..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none shadow-sm transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                    {form.youtube_short_url && !/(?:youtube\.com|youtu\.be)\//i.test(form.youtube_short_url) && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">This is not a YouTube link, so the video will not play.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-light block mb-2">
                      YouTube Video Link (Long)
                    </label>
                    <input
                      type="url"
                      value={form.youtube_long_url || ''}
                      onChange={(e) => update({ youtube_long_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none shadow-sm transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                    {form.youtube_long_url && !/(?:youtube\.com|youtu\.be)\//i.test(form.youtube_long_url) && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">This is not a YouTube link, so the video will not play. Open the video on YouTube, tap Share, and paste that youtube.com or youtu.be link.</p>
                    )}
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {currentStep === 'subscription' && (
            <div className="space-y-4" data-testid="step-subscription-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Choose your subscription</h2>
              {listingPolicy.loading || listingPolicy.error ? (
                <p role="status">{listingPolicy.error || 'Loading subscription setting…'}</p>
              ) : !subscriptionRequired && !hasActiveSubscription ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="font-bold">No subscription payment required</h3>
                  <p className="mt-2 text-sm">Continue to review and submit your property for verification. Existing paid subscriptions remain unchanged.</p>
                </div>
              ) : hasActiveSubscription ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-slate-900" />
                  <h3 className="font-bold text-charcoal text-lg">Active Subscription Found</h3>
                  <p className="text-sm text-charcoal-light max-w-md mx-auto">
                    This property already has an active subscription. No further payment or plan selection is required. Click <strong>Next</strong> to review and submit your changes.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-charcoal-light">
                    A 90-day free trial starts today. You'll only be billed if you continue after the trial.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="plan-list-container">
                    {matchingPlans.map((p) => {
                      const active = form.subscription_plan_id === p.plan_id;
                      return (
                        <button
                          key={p.plan_id}
                          type="button"
                          onClick={() => setPricingSummaryPlan(p)}
                          className={`text-left p-4 rounded-lg border-2 transition ${
                            active ? 'border-slate-900 bg-slate-50' : 'border-gray-100 hover:border-slate-300'
                          }`}
                          data-testid={`plan-${p.plan_id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-charcoal">{p.plan_name}</h3>
                              <p className="text-xs text-charcoal-light mt-0.5">{p.description}</p>
                            </div>
                            {active && <Check className="w-5 h-5 text-slate-900" />}
                          </div>
                          <div className="mt-3">
                            <span className="text-xl font-bold text-slate-900">
                              ₹{p.price_monthly?.toLocaleString('en-IN') || '—'}
                            </span>
                            <span className="text-xs text-charcoal-light"> /month</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          
          {currentStep === 'review' && (
            <div className="space-y-4" data-testid="step-review-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Review & Submit</h2>
              <ReviewBlock label="Title" value={form.title} />
              <ReviewBlock 
                label="Type" 
                value={`${form.category === 'residential' ? 'Residential' : form.category === 'commercial' ? 'Commercial' : 'Event Venue'} · ${
                  CATEGORY_DATA[form.category]?.propertyTypes.find(p => p.value === form.property_type)?.label || form.property_type
                } · ${
                  CATEGORY_DATA[form.category]?.bhkTypes.find(b => b.value === form.bhk_type)?.label || form.bhk_type
                }`} 
              />
              {unitsActive && (
                <ReviewBlock
                  label="Units"
                  value={(form.units || []).map((u) => `${u.name || 'Unit'} (₹${u.price_per_night || 0})`).join(', ')}
                />
              )}
              <ReviewBlock label="Location" value={formatAddress(form.address, form.city, form.state, form.pin_code)} />
              <ReviewBlock 
                label={unitsActive ? 'Starting price' : 'Price'} 
                value={
                  unitsActive
                    ? `From ₹${Math.min(...(form.units || []).map((u) => Number(u.price_per_night) || 0).filter(Boolean), Infinity) === Infinity ? 0 : Math.min(...(form.units || []).map((u) => Number(u.price_per_night) || 0).filter(Boolean))}/${form.category === 'commercial' ? (form.pricing_cycle === 'hourly' ? 'hr' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day') : 'night'} · min ${form.minimum_stay_days}`
                    : form.category === 'commercial' || form.category === 'event_venue'
                    ? `₹${form.price_per_night}/${form.pricing_cycle === 'hourly' ? 'hr' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day'} · min ${form.minimum_stay_days} ${form.pricing_cycle === 'hourly' ? 'hour(s)' : form.pricing_cycle === 'weekly' ? 'week(s)' : form.pricing_cycle === 'monthly' ? 'month(s)' : 'day(s)'}`
                    : `₹${form.price_per_night}/night · min ${form.minimum_stay_days} night(s)`
                } 
              />
              <ReviewBlock 
                label="Amenities" 
                value={
                  form.amenities.map(val => {
                    const found = availableAmenityOptions.find(item => item.value === val);
                    return found ? found.label : val.replace(/^custom_/, '').replace(/_/g, ' ');
                  }).join(', ') || '—'
                } 
              />
              <ReviewBlock label="Photos" value={`${form.images.length} uploaded`} />
              {form.video_url && <ReviewBlock label="Walkthrough Video" value="Attached" />}
              {form.youtube_short_url && <ReviewBlock label="YouTube Short" value="Attached" />}
              {form.youtube_long_url && <ReviewBlock label="YouTube Video" value="Attached" />}
              {form.category !== 'event_venue' && (
                <>
                  <ReviewBlock label="Cook Available" value={form.has_cook ? `Yes (₹${form.cook_price || 0}/day)` : 'No'} />
                  <ReviewBlock label="Self Cooking Allowed" value={form.has_self_cook ? 'Yes' : 'No'} />
                </>
              )}
              <ReviewBlock label="Taxi Service Available" value={form.has_taxi ? 'Yes' : 'No'} />
              <ReviewBlock 
                label="Selected Plan" 
                value={
                  (() => {
                    if (!subscriptionRequired && !hasActiveSubscription) return 'No subscription payment required';
                    const selectedPlan = plans.find((p) => p.plan_id === form.subscription_plan_id);
                    if (selectedPlan) {
                      return `${selectedPlan.plan_name} (₹${selectedPlan.price_monthly || 0}/month)${hasActiveSubscription ? ' - Paid & Active' : ''}`;
                    }
                    return hasActiveSubscription ? 'Active Subscription' : '—';
                  })()
                } 
              />

              {form.category === 'event_venue' && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Catering & Packages</h3>
                  <div className="space-y-4">
                    {form.has_veg && (
                      <div className="bg-green-50/40 p-4 rounded-2xl border border-green-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-green-800">Vegetarian Option</span>
                          <span className="text-sm font-bold text-charcoal">₹{form.veg_price}/plate</span>
                        </div>
                        <div className="text-xs text-charcoal-light font-medium">
                          Inclusions:{' '}
                          {Object.entries((form.packages || []).find(p => p.type === 'veg')?.items || {})
                            .filter(([_, count]) => Number(count) > 0)
                            .map(([item, count]) => `${item} (x${count})`)
                            .join(', ') || 'None'}
                        </div>
                      </div>
                    )}
                    {form.has_non_veg && (
                      <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-red-800">Non-Vegetarian Option</span>
                          <span className="text-sm font-bold text-charcoal">₹{form.non_veg_price}/plate</span>
                        </div>
                        <div className="text-xs text-charcoal-light font-medium">
                          Inclusions:{' '}
                          {Object.entries((form.packages || []).find(p => p.type === 'non_veg')?.items || {})
                            .filter(([_, count]) => Number(count) > 0)
                            .map(([item, count]) => `${item} (x${count})`)
                            .join(', ') || 'None'}
                        </div>
                      </div>
                    )}
                    {!form.has_veg && !form.has_non_veg && (
                      <div className="text-sm text-charcoal-light italic">No catering option selected (Venue only).</div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={submitListing}
                disabled={submitting || paying}
                className="mt-8 flex w-full items-center justify-center space-x-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                data-testid="submit-listing-btn"
              >
                {submitting || paying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <span>
                  {paying ? 'Processing payment…' :
                   submitting ? (user?.role === 'admin' ? 'Saving…' : 'Submitting…') :
                   user?.role === 'admin' ? 'Save changes' : 'Submit listing'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
          <button
            onClick={prev}
            disabled={visibleStepIndex === 0}
            className="inline-flex min-h-[48px] items-center space-x-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            data-testid="prev-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <HostSupportWidget context="property_listing" inline />
            {isHostManageMode && (
              <button
                onClick={submitListing}
                disabled={submitting}
                className="flex items-center space-x-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                data-testid="save-manage-changes-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{submitting ? 'Saving...' : 'Save changes'}</span>
              </button>
            )}
            {visibleStepIndex < visibleSteps.length - 1 && (
              <button
                onClick={next}
                className="flex min-h-[48px] items-center space-x-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
                data-testid="next-btn"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {pricingSummaryPlan && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-lg max-h-[calc(100vh-32px)] overflow-hidden shadow-elevated animate-in zoom-in-95 duration-200 flex flex-col border border-white/80">
            <div className="flex-shrink-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 sm:flex">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-slate-500">Pricing Summary</p>
                    <h3 className="text-xl leading-tight font-bold text-charcoal">{pricingSummaryPlan.plan_name}</h3>
                    {pricingSummaryPlan.description && (
                      <p className="text-xs text-charcoal-light mt-1 leading-relaxed">{pricingSummaryPlan.description}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPricingSummaryPlan(null)}
                  className="w-9 h-9 rounded-full border border-gray-100 text-charcoal-light hover:text-charcoal hover:bg-stone transition flex items-center justify-center shrink-0"
                  aria-label="Close pricing summary"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3.5 bg-white">
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-3">
                <div className="flex items-center justify-between gap-4 px-3.5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-charcoal">Plan fee</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-charcoal whitespace-nowrap">
                    ₹{getSubscriptionBreakdown(pricingSummaryPlan).planFee.toLocaleString('en-IN')}/month
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 px-3.5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-charcoal">Premium Service Fee</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-charcoal whitespace-nowrap">
                    ₹{getSubscriptionBreakdown(pricingSummaryPlan).platformFee.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 px-3.5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <BadgePercent className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-charcoal underline decoration-sand-300 underline-offset-4">
                      Taxes & GST ({getSubscriptionBreakdown(pricingSummaryPlan).taxPercent}%)
                    </span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-charcoal whitespace-nowrap">
                    ₹{formatSubscriptionAmount(getSubscriptionBreakdown(pricingSummaryPlan).taxes)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 px-3.5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                      <Home className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-charcoal">Selected property type</span>
                  </div>
                  <span className="text-sm font-bold text-charcoal whitespace-nowrap">
                    {CATEGORY_DATA[form.category]?.bhkTypes.find((b) => b.value === form.bhk_type)?.label || form.bhk_type}
                  </span>
                </div>
                {getSubscriptionBreakdown(pricingSummaryPlan).discount > 0 && (
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-3.5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                        <Tag className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        Coupon Discount ({getSubscriptionBreakdown(pricingSummaryPlan).coupon?.code})
                      </span>
                    </div>
                    <span className="whitespace-nowrap text-sm font-bold text-slate-700 sm:text-base">
                      -₹{formatSubscriptionAmount(getSubscriptionBreakdown(pricingSummaryPlan).discount)}
                    </span>
                  </div>
                )}
                <div className="mx-2 my-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3.5 py-3">
                  <div>
                    <p className="text-sm font-bold text-charcoal">Total payable</p>
                    <p className="text-[10px] font-semibold text-charcoal-light mt-0.5">Inclusive of all taxes</p>
                  </div>
                  <span className="whitespace-nowrap text-xl font-bold text-slate-950">
                    ₹{formatSubscriptionAmount(getSubscriptionBreakdown(pricingSummaryPlan).total)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 mb-3">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-charcoal-light" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal-muted">Subscription Coupons</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getSubscriptionBreakdown(pricingSummaryPlan).coupon && (
                      <span className="text-[10px] font-bold text-slate-600">Applied</span>
                    )}
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                </div>
                {subscriptionCoupons.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {subscriptionCoupons.map((coupon) => (
                      <button
                        key={coupon.coupon_id || coupon.code}
                        type="button"
                        onClick={() => setSubscriptionCouponCode(coupon.code)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                          subscriptionCouponCode.trim().toUpperCase() === coupon.code
                            ? 'border-slate-900 bg-slate-100 text-slate-900'
                            : 'border-gray-200 bg-stone text-charcoal hover:border-slate-400'
                        }`}
                      >
                        {coupon.code} · {
                          coupon.discount_type === 'target_taxable'
                            ? `Taxable Rs ${coupon.discount_value}`
                            : coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}% OFF`
                              : `Rs ${coupon.discount_value} OFF`
                        }
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-charcoal-light mb-3">No active subscription coupons available right now.</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={subscriptionCouponCode}
                    onChange={(e) => setSubscriptionCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="min-h-[42px] flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold uppercase outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  {subscriptionCouponCode && (
                    <button
                      type="button"
                      onClick={() => setSubscriptionCouponCode('')}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-charcoal-light hover:text-charcoal"
                    >
                      Clear
                    </button>
                  )}
                </div>
                    {subscriptionCouponCode && !getSubscriptionBreakdown(pricingSummaryPlan).coupon && (
                  <p className="mt-2 text-xs font-semibold text-red-600">This coupon is not available for subscriptions.</p>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                <p className="text-xs font-semibold leading-relaxed text-slate-700">
                  Review this summary before proceeding. Payment will be completed when you submit the listing.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 bg-white px-6 py-3.5 md:px-7 border-t border-gray-100 shadow-[0_-12px_28px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setPricingSummaryPlan(null)}
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={proceedFromPricingSummary}
                  disabled={!!subscriptionCouponCode.trim() && !getSubscriptionBreakdown(pricingSummaryPlan).coupon}
                  className="flex min-h-[52px] flex-1 flex-col items-center justify-center rounded-xl bg-slate-950 font-bold leading-tight text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="pricing-summary-proceed"
                >
                  <span className="inline-flex items-center gap-2">
                    <LockKeyhole className="w-4 h-4" />
                    Proceed to Review
                  </span>
                  <span className="text-[10px] font-semibold text-white/80 mt-0.5">Payment on final submit</span>
                </button>
              </div>
              <div className="hidden sm:grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-charcoal" />
                  <div>
                    <p className="text-[10px] font-bold text-charcoal leading-none">Secure Payments</p>
                    <p className="text-[9px] text-charcoal-light mt-1">100% Protected</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <BadgePercent className="w-4 h-4 text-charcoal" />
                  <div>
                    <p className="text-[10px] font-bold text-charcoal leading-none">Best Price Guarantee</p>
                    <p className="text-[9px] text-charcoal-light mt-1">Always the best deal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Headphones className="w-4 h-4 text-charcoal" />
                  <div>
                    <p className="text-[10px] font-bold text-charcoal leading-none">24/7 Support</p>
                    <p className="text-[9px] text-charcoal-light mt-1">We're here to help</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {upiPayment.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-elevated animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
                    <QrCode className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">UPI Payment</p>
                    <h3 className="text-xl font-bold text-charcoal leading-tight">{upiPayment.planName}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={upiPayment.onCancel}
                  disabled={upiPayment.submitting}
                  className="w-9 h-9 rounded-full bg-stone hover:bg-gray-100 text-charcoal-light flex items-center justify-center disabled:opacity-50"
                  aria-label="Close UPI payment"
                >
                  ×
                </button>
              </div>

              <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center">
                  <img
                    src={upiPayment.qrUrl}
                    alt="Subscription UPI QR code"
                    className="w-full aspect-square object-contain"
                  />
                  <p className="text-xs text-charcoal-muted mt-3">Scan with any UPI app</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Amount payable</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">₹{formatSubscriptionAmount(upiPayment.amount)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      QR scan kelyavar UPI app madhe hi amount auto-fill hoil.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-charcoal-muted mb-2">UPI ID</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-stone px-3 py-2 text-sm font-bold text-charcoal break-all">
                        {SUBSCRIPTION_UPI.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(SUBSCRIPTION_UPI.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-charcoal transition hover:border-slate-400 hover:bg-slate-50"
                        aria-label="Copy UPI ID"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-charcoal-muted">UTR / Transaction ID</span>
                    <input
                      type="text"
                      value={upiPayment.utr}
                      onChange={(e) => setUpiPayment((prev) => ({ ...prev, utr: e.target.value.toUpperCase(), error: '' }))}
                      placeholder="Enter UTR after payment"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      disabled={upiPayment.submitting}
                    />
                  </label>

                  {upiPayment.error && (
                    <p className="text-xs font-semibold text-red-600">{upiPayment.error}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={upiPayment.upiUrl}
                  className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Smartphone className="w-4 h-4" />
                  Open UPI App
                </a>
                <button
                  type="button"
                  onClick={() => upiPayment.onConfirm?.(upiPayment.utr)}
                  disabled={upiPayment.submitting}
                  className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:bg-black disabled:opacity-50"
                >
                  {upiPayment.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {upiPayment.submitting ? 'Confirming...' : 'Payment Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </HostWorkspaceShell>
  );
};

const Input = ({ label, testid, type = 'text', value, onChange, placeholder, disabled }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-charcoal-light">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-charcoal-muted"
      data-testid={testid}
      disabled={disabled}
    />
  </div>
);

const Textarea = ({ label, testid, value, onChange, placeholder, rows = 3 }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-charcoal-light">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border rounded-lg px-3 py-2 mt-1"
      data-testid={testid}
    />
  </div>
);

const Select = ({ label, testid, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={rootRef} className="relative">
      <label className="text-xs uppercase tracking-wide text-charcoal-light">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`mt-1 flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left transition ${
          open ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-gray-300 hover:border-gray-400'
        }`}
        data-testid={testid}
      >
        <span className={`truncate ${selected ? 'text-charcoal' : 'text-charcoal-muted'}`}>
          {selected ? selected.label : 'Select'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        >
          {options.map((o) => {
            const isSelected = String(o.value) === String(value);
            return (
              <li key={o.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    isSelected ? 'bg-slate-100 font-semibold text-charcoal hover:bg-slate-900 hover:text-white' : 'text-charcoal hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const Toggle = ({ label, testid, checked, onChange }) => (
  <label className="flex items-center space-x-2 text-sm cursor-pointer" data-testid={testid}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);

const ReviewBlock = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-100 py-2">
    <span className="text-charcoal-light text-sm">{label}</span>
    <span className="text-charcoal text-sm font-semibold text-right max-w-[60%] truncate">{value || '—'}</span>
  </div>
);

export default HostListProperty;
