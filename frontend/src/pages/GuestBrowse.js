import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, getImageUrl } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';
import {
  Building2,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Map as MapIcon,
  Columns,
  ZapOff,
  Zap,
  Star,
} from 'lucide-react';

// Fix Leaflet default marker icon for webpack/CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PROPERTY_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'independent_house', label: 'Independent House' },
  { value: 'pg', label: 'PG' },
  { value: 'co_living', label: 'Co-living' },
  { value: 'private_office', label: 'Private Office' },
  { value: 'co_working', label: 'Co-working' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
];

const BHK_TYPES = [
  { value: '', label: 'Any size' },
  { value: 'studio', label: 'Studio' },
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'banquet', label: 'Banquet' },
];

const AMENITY_OPTIONS = [
  'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms',
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const VIEW_MODES = {
  GRID: 'grid',
  SPLIT: 'split',
  MAP: 'map',
};

// Custom price-pin icon factory
function priceIcon(price, active) {
  const html = `
    <div style="
      background:${active ? '#C05C4F' : '#fff'};
      color:${active ? '#fff' : '#2C2C2C'};
      border:2px solid #C05C4F;
      padding:4px 10px;
      border-radius:999px;
      font-weight:700;
      font-size:12px;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
      font-family:'Manrope',sans-serif;
    ">₹${price}</div>
  `;
  return L.divIcon({
    html,
    className: 'price-pin',
    iconSize: [60, 28],
    iconAnchor: [30, 14],
  });
}

// Centers the map on bounds of properties
function FitBounds({ properties }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = properties.filter((p) => p.latitude && p.longitude);
    if (!withCoords.length) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 11);
      return;
    }
    const bounds = L.latLngBounds(withCoords.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [properties, map]);
  return null;
}

const TRANSLATIONS = {
  en: {
    destination: 'Destination',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    type: 'Type',
    anyCategory: 'Any Category',
    residential: 'Residential',
    commercial: 'Commercial',
    eventVenue: 'Event Venue',
    filters: 'Filters',
    findSpaces: 'Find Spaces',
    propertyType: 'Property Type',
    bhkConfig: 'BHK / Configuration',
    priceRange: 'Price Range (₹/Night)',
    essentialAmenities: 'Essential Amenities',
    instantBooking: 'Instant Booking',
    petFriendly: 'Pet Friendly',
    clearAll: 'Clear All',
    applyFilters: 'Apply Filters',
    searching: 'Searching...',
    spaceFound: 'Space found',
    spacesFound: 'Spaces found',
    curatedResults: 'Curated results for {city}',
    discoverExclusive: 'Discover the most exclusive properties in India',
    sortBy: 'Sort by:',
    recommended: 'Recommended',
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
    newest: 'Newest',
    curatingSpaces: 'Curating Spaces...',
    noMatches: 'No Matches Found',
    noMatchesSub: "We couldn't find any properties matching your current criteria. Try adjusting your filters or search area.",
    myBookings: 'My Bookings',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    details: 'Details',
    hour: 'hr',
    day: 'day',
    week: 'week',
    month: 'month',
    night: 'night',
    hi: 'Hi',
  },
  hi: {
    destination: 'गंतव्य',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    type: 'प्रकार',
    anyCategory: 'सभी श्रेणियां',
    residential: 'आवासीय',
    commercial: 'व्यावसायिक',
    eventVenue: 'आयोजन स्थल',
    filters: 'फ़िल्टर',
    findSpaces: 'स्थान खोजें',
    propertyType: 'संपत्ति का प्रकार',
    bhkConfig: 'बीएचके / कॉन्फ़िगरेशन',
    priceRange: 'मूल्य सीमा (₹/रात)',
    essentialAmenities: 'आवश्यक सुविधाएं',
    instantBooking: 'त्वरित बुकिंग',
    petFriendly: 'पालतू जानवरों के अनुकूल',
    clearAll: 'सभी साफ करें',
    applyFilters: 'फ़िल्टर लागू करें',
    searching: 'खोज रहे हैं...',
    spaceFound: 'संपत्ति मिली',
    spacesFound: 'संपत्तियां मिलीं',
    curatedResults: '{city} के लिए चुनिंदा परिणाम',
    discoverExclusive: 'भारत में सबसे विशिष्ट संपत्तियों की खोज करें',
    sortBy: 'इसके अनुसार क्रमबद्ध करें:',
    recommended: 'अनुशंसित',
    price_asc: 'कीमत: कम से अधिक',
    price_desc: 'कीमत: अधिक से कम',
    newest: 'नवीनतम',
    curatingSpaces: 'संपत्तियां खोजी जा रही हैं...',
    noMatches: 'कोई परिणाम नहीं मिला',
    noMatchesSub: 'हमें आपकी वर्तमान मानदंडों से मेल खाने वाली कोई भी संपत्ति नहीं मिली। फ़िल्टर या खोज क्षेत्र बदलने का प्रयास करें।',
    myBookings: 'मेरी बुकिंग',
    signOut: 'साइन आउट',
    signIn: 'लॉगिन करें',
    details: 'विवरण',
    hour: 'घंटा',
    day: 'दिन',
    week: 'सप्ताह',
    month: 'महीना',
    night: 'रात',
    hi: 'नमस्ते',
  },
  mr: {
    destination: 'ठिकाण',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    type: 'प्रकार',
    anyCategory: 'सर्व कॅटेगरी',
    residential: 'निवासी',
    commercial: 'व्यावसायिक',
    eventVenue: 'इव्हेंट वेन्यू',
    filters: 'फिल्टर्स',
    findSpaces: 'जागा शोधा',
    propertyType: 'प्रॉपर्टीचा प्रकार',
    bhkConfig: 'BHK / कॉन्फिग्रेशन',
    priceRange: 'किंमत श्रेणी (₹/रात्र)',
    essentialAmenities: 'अत्यावश्यक सोयी-सुविधा',
    instantBooking: 'झटपट बुकिंग',
    petFriendly: 'प्राण्यांसाठी अनुकूल',
    clearAll: 'सर्व साफ करा',
    applyFilters: 'फिल्टर्स लागू करा',
    searching: 'शोधत आहे...',
    spaceFound: 'जागा सापडली',
    spacesFound: 'जागा सापडल्या',
    curatedResults: '{city} साठी निवडक परिणाम',
    discoverExclusive: 'भारतातील सर्वात अनन्य मालमत्ता शोधा',
    sortBy: 'क्रमवारी लावा:',
    recommended: 'शिफारस केलेले',
    price_asc: 'किंमत: कमी ते जास्त',
    price_desc: 'किंमत: जास्त ते कमी',
    newest: 'नवीनतम',
    curatingSpaces: 'जागा शोधत आहे...',
    noMatches: 'काहीही सापडले नाही',
    noMatchesSub: 'तुमच्या निकषांशी जुळणारी कोणतीही जागा आम्हाला सापडली नाही. कृपया तुमचे फिल्टर किंवा शोध क्षेत्र बदला.',
    myBookings: 'माझ्या बुकिंग्ज',
    signOut: 'साइन आउट',
    signIn: 'लॉगिन करा',
    details: 'तपशील',
    hour: 'तास',
    day: 'दिवस',
    week: 'आठवडा',
    month: 'महिना',
    night: 'रात्र',
    hi: 'नमस्कार',
  }
};

const GuestBrowse = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const todayISO = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [hoveredId, setHoveredId] = useState(null);

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      city: params.get('city') || '',
      category: params.get('category') || '',
      property_type: '',
      bhk_type: '',
      min_price: '',
      max_price: '',
      instant_booking: false,
      pet_friendly: false,
      check_in: params.get('checkIn') || '',
      check_out: params.get('checkOut') || '',
      sort: 'recommended',
      amenities: [],
    };
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const city = params.get('city');
    const category = params.get('category');
    const checkIn = params.get('checkIn');
    const checkOut = params.get('checkOut');
    
    if (city || category || checkIn || checkOut) {
      setFilters(prev => ({
        ...prev,
        city: city || prev.city,
        category: category || prev.category,
        check_in: checkIn || prev.check_in,
        check_out: checkOut || prev.check_out
      }));
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sort, filters.city, filters.category, filters.check_in, filters.check_out]);

  const buildParams = () => {
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.category) params.category = filters.category;
    if (filters.property_type) params.property_type = filters.property_type;
    if (filters.bhk_type) params.bhk_type = filters.bhk_type;
    if (filters.min_price) params.min_price = Number(filters.min_price);
    if (filters.max_price) params.max_price = Number(filters.max_price);
    if (filters.instant_booking) params.instant_booking = true;
    if (filters.pet_friendly) params.pet_friendly = true;
    if (filters.check_in) params.check_in = filters.check_in;
    if (filters.check_out) params.check_out = filters.check_out;
    if (filters.amenities.length) params.amenities = filters.amenities.join(',');
    if (filters.sort) params.sort = filters.sort;
    return params;
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyAPI.searchProperties(buildParams());
      setProperties(res.data.properties || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (a) => {
    setFilters((f) => {
      const has = f.amenities.includes(a);
      return { ...f, amenities: has ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] };
    });
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      category: '',
      property_type: '',
      bhk_type: '',
      min_price: '',
      max_price: '',
      instant_booking: false,
      pet_friendly: false,
      check_in: '',
      check_out: '',
      sort: 'recommended',
      amenities: [],
    });
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchProperties();
  };

  const navigateToProperty = (propertyId) => {
    const params = new URLSearchParams(window.location.search);
    const urlGuests = params.get('guests') || '1';
    navigate(`/property/${propertyId}?checkIn=${filters.check_in || ''}&checkOut=${filters.check_out || ''}&guests=${urlGuests}`);
  };

  const propsWithCoords = useMemo(
    () => properties.filter((p) => p.latitude && p.longitude),
    [properties]
  );

  const indiaCenter = [20.5937, 78.9629];  return (
    <div className="min-h-screen bg-sand-50 flex flex-col selection:bg-terracotta selection:text-white">
      {/* Header */}
      <header className="glass px-8 py-4 border-b border-sand-200" data-testid="guest-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group md:mx-0" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <h1 className="text-xl font-black text-charcoal tracking-tighter">
              GOLDEN<span className="text-terracotta">-X-</span>HOST
            </h1>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Language Selector */}
            <div className="relative flex items-center">
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={(newLang) => {
                  setLang(newLang);
                  localStorage.setItem('preferredLanguage', newLang);
                }}
              />
            </div>

            <div className="h-4 w-[1px] bg-sand-300"></div>

            {user && (
              <div className="hidden sm:flex items-center space-x-3 px-4 py-1.5 bg-sand-100 rounded-full border border-sand-200">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-sm font-bold text-charcoal">{t('hi')}, {user.full_name?.split(' ')[0]}</span>
              </div>
            )}
            {user ? (
              <>
                <button
                  onClick={() => navigate('/guest/bookings')}
                  className="text-[10px] font-black text-charcoal-muted hover:text-terracotta tracking-widest transition-colors uppercase"
                >
                  {t('myBookings')}
                </button>
                <button
                  onClick={logout}
                  className="text-[10px] font-black text-terracotta hover:underline tracking-widest uppercase"
                >
                  {t('signOut')}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn-premium px-6 py-2 text-xs"
              >
                {t('signIn')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Top Search Bar */}
      <div className="bg-white/80 backdrop-blur sticky top-0 z-30 px-8 py-4 border-b border-sand-200 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end"
          >
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('destination')}</label>
                <div className="relative">
                   <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terracotta" />
                   <input
                     type="text"
                     value={filters.city}
                     onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                     placeholder={t('destination') + "..."}
                     className="w-full bg-sand-50/50 border-sand-300 rounded-xl pl-9 pr-4 py-3 text-sm font-medium focus:bg-white transition-all outline-none"
                   />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('checkIn')}</label>
                <input
                   type="date"
                   min={todayISO}
                   value={filters.check_in}
                   onChange={(e) => setFilters({ ...filters, check_in: e.target.value })}
                   className="w-full bg-sand-50/50 border-sand-300 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('checkOut')}</label>
                <input
                   type="date"
                   value={filters.check_out}
                   onChange={(e) => setFilters({ ...filters, check_out: e.target.value })}
                   min={filters.check_in || todayISO}
                   className="w-full bg-sand-50/50 border-sand-300 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('type')}</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full bg-sand-50/50 border-sand-300 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white transition-all outline-none cursor-pointer"
                >
                  <option value="">{t('anyCategory')}</option>
                  <option value="residential">{t('residential')}</option>
                  <option value="commercial">{t('commercial')}</option>
                  <option value="event_venue">{t('eventVenue')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`px-5 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center space-x-2 ${
                   showFilters || filters.amenities.length > 0 
                   ? 'border-terracotta bg-terracotta/5 text-terracotta' 
                   : 'border-sand-200 text-charcoal-light hover:border-sand-400'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('filters')}</span>
                {filters.amenities.length > 0 && (
                   <span className="bg-terracotta text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                     {filters.amenities.length}
                   </span>
                )}
              </button>
              <button
                type="submit"
                className="btn-premium px-8 flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>{t('findSpaces')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Advanced filters drawer */}
      {showFilters && (
        <div className="bg-sand-50 border-b border-sand-200 px-8 py-8 animate-slide-up" data-testid="advanced-filters">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('propertyType')}</label>
              <select
                value={filters.property_type}
                onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
                className="w-full bg-white border-sand-300 rounded-xl px-4 py-3 text-sm font-medium outline-none"
              >
                {PROPERTY_TYPES.map((tOpt) => (
                  <option key={tOpt.value} value={tOpt.value}>{tOpt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('bhkConfig')}</label>
              <select
                value={filters.bhk_type}
                onChange={(e) => setFilters({ ...filters, bhk_type: e.target.value })}
                className="w-full bg-white border-sand-300 rounded-xl px-4 py-3 text-sm font-medium outline-none"
              >
                {BHK_TYPES.map((tOpt) => (
                  <option key={tOpt.value} value={tOpt.value}>{tOpt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('priceRange')}</label>
              <div className="flex items-center space-x-3">
                 <input
                   type="number"
                   value={filters.min_price}
                   onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                   placeholder="Min"
                   className="w-full bg-white border-sand-300 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                 />
                 <span className="text-sand-400 font-bold">−</span>
                 <input
                   type="number"
                   value={filters.max_price}
                   onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                   placeholder="Max"
                   className="w-full bg-white border-sand-300 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                 />
              </div>
            </div>

            <div className="md:col-span-4 mt-4">
              <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em] ml-1 mb-3 block">{t('essentialAmenities')}</label>
              <div className="flex flex-wrap gap-2.5">
                {AMENITY_OPTIONS.map((a) => {
                  const active = filters.amenities.includes(a);
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={`text-xs font-bold px-4 py-2 rounded-full border-2 transition-all duration-300 ${
                        active
                          ? 'bg-terracotta border-terracotta text-white shadow-premium scale-105'
                          : 'bg-white border-sand-200 text-charcoal-muted hover:border-sand-400'
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4 pt-6 border-t border-sand-200 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                 <label className="flex items-center space-x-3 group cursor-pointer">
                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${filters.instant_booking ? 'bg-terracotta' : 'bg-sand-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${filters.instant_booking ? 'translate-x-4' : 'translate-x-0'}`}></div>
                   </div>
                   <input
                     type="checkbox"
                     className="hidden"
                     checked={filters.instant_booking}
                     onChange={(e) => setFilters({ ...filters, instant_booking: e.target.checked })}
                   />
                   <div className="flex items-center space-x-2">
                      <Zap className={`w-4 h-4 ${filters.instant_booking ? 'text-amber-500' : 'text-charcoal-muted'}`} />
                      <span className="text-sm font-bold text-charcoal tracking-tight">{t('instantBooking')}</span>
                   </div>
                 </label>

                 <label className="flex items-center space-x-3 group cursor-pointer">
                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${filters.pet_friendly ? 'bg-sage' : 'bg-sand-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${filters.pet_friendly ? 'translate-x-4' : 'translate-x-0'}`}></div>
                   </div>
                   <input
                     type="checkbox"
                     className="hidden"
                     checked={filters.pet_friendly}
                     onChange={(e) => setFilters({ ...filters, pet_friendly: e.target.checked })}
                   />
                   <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-charcoal tracking-tight">{t('petFriendly')}</span>
                   </div>
                 </label>
              </div>

              <div className="flex items-center space-x-4">
                 <button
                   type="button"
                   onClick={clearFilters}
                   className="text-sm font-black text-terracotta uppercase tracking-widest hover:underline px-4"
                 >
                   {t('clearAll')}
                 </button>
                 <button
                   type="button"
                   onClick={() => { handleSearch(); setShowFilters(false); }}
                   className="btn-premium px-10"
                 >
                   {t('applyFilters')}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="px-8 py-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-charcoal tracking-tight">
             {loading ? t('searching') : (
                <>
                   {properties.length} {properties.length === 1 ? t('spaceFound') : t('spacesFound')}
                </>
             )}
          </h2>
          <p className="text-charcoal-muted font-medium mt-1">
             {filters.city ? t('curatedResults').replace('{city}', filters.city) : t('discoverExclusive')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
             <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">{t('sortBy')}</span>
             <select
               value={filters.sort}
               onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
               className="bg-transparent border-none text-sm font-black text-charcoal outline-none cursor-pointer hover:text-terracotta transition-colors"
             >
               {SORT_OPTIONS.map((s) => (
                 <option key={s.value} value={s.value}>{t(s.value)}</option>
               ))}
             </select>
          </div>

          <div className="h-6 w-[1px] bg-sand-200"></div>

          <div className="flex bg-sand-100 p-1 rounded-xl" data-testid="view-toggle">
            {[
               { id: VIEW_MODES.GRID, icon: LayoutGrid },
               { id: VIEW_MODES.SPLIT, icon: Columns },
               { id: VIEW_MODES.MAP, icon: MapIcon }
            ].map((v) => (
               <button
                 key={v.id}
                 type="button"
                 onClick={() => setViewMode(v.id)}
                 className={`p-2 rounded-lg transition-all ${
                   viewMode === v.id ? 'bg-white text-terracotta shadow-sm' : 'text-charcoal-muted hover:text-charcoal'
                 }`}
               >
                 <v.icon className="w-4 h-4" />
               </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results body */}
      <div className="flex-1 px-8 pb-12 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <div className="w-12 h-12 border-4 border-sand-200 border-t-terracotta rounded-full animate-spin"></div>
             <p className="font-black text-charcoal-muted uppercase tracking-[0.2em] text-xs">{t('curatingSpaces')}</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-sand-200 shadow-premium">
            <div className="w-20 h-20 bg-sand-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Building2 className="w-10 h-10 text-sand-300" />
            </div>
            <h3 className="text-2xl font-black text-charcoal mb-2">{t('noMatches')}</h3>
            <p className="text-charcoal-muted font-medium mb-8 max-w-sm mx-auto">{t('noMatchesSub')}</p>
            <button onClick={clearFilters} className="btn-premium px-10">{t('clearAll')}</button>
          </div>
        ) : (
          <div
            className={
              viewMode === VIEW_MODES.SPLIT
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-320px)]'
                : viewMode === VIEW_MODES.MAP
                ? 'h-[calc(100vh-320px)] animate-fade-in'
                : ''
            }
          >
            {/* Cards Grid */}
            {viewMode !== VIEW_MODES.MAP && (
              <div
                className={
                  viewMode === VIEW_MODES.SPLIT
                    ? 'overflow-y-auto pr-4 space-y-6 custom-scrollbar'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up'
                }
              >
                {properties.map((p, idx) => (
                  <PropertyCard
                    key={p.property_id}
                    property={p}
                    compact={viewMode === VIEW_MODES.SPLIT}
                    onHover={setHoveredId}
                    onClick={() => navigateToProperty(p.property_id)}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Interactive Map */}
            {(viewMode === VIEW_MODES.SPLIT || viewMode === VIEW_MODES.MAP) && (
              <div className="rounded-3xl overflow-hidden border border-sand-200 h-full shadow-premium relative group">
                <MapContainer
                  center={indiaCenter}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  />
                  <FitBounds properties={propsWithCoords} />
                  {propsWithCoords.map((p) => (
                    <Marker
                      key={p.property_id}
                      position={[p.latitude, p.longitude]}
                      icon={priceIcon(p.price_per_night, hoveredId === p.property_id)}
                      eventHandlers={{
                        click: () => navigateToProperty(p.property_id),
                        mouseover: () => setHoveredId(p.property_id),
                        mouseout: () => setHoveredId(null),
                      }}
                    >
                      <Popup className="premium-popup">
                        <div className="p-2" style={{ minWidth: 200 }}>
                          <img 
                            src={getImageUrl(p.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800'} 
                            className="w-full h-24 object-cover rounded-lg mb-3 shadow-sm"
                            alt=""
                          />
                          <h4 className="font-black text-charcoal leading-tight mb-1">{p.title}</h4>
                          <div className="flex items-center text-charcoal-muted text-[10px] font-bold uppercase tracking-widest mb-3">
                             <MapPin className="w-3 h-3 mr-1" /> {p.city}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-sand-100">
                            <div>
                              <span className="text-lg font-black text-terracotta">₹{p.price_per_night}</span>
                              <span className="text-[9px] font-black text-charcoal-muted uppercase tracking-widest ml-1">
                                {p.category === 'commercial' || p.category === 'event_venue'
                                  ? (p.pricing_cycle === 'hourly' ? `/ ${t('hour')}` : p.pricing_cycle === 'weekly' ? `/ ${t('week')}` : p.pricing_cycle === 'monthly' ? `/ ${t('month')}` : `/ ${t('day')}`)
                                  : `/ ${t('night')}`}
                              </span>
                            </div>
                            <button
                              onClick={() => navigateToProperty(p.property_id)}
                              className="px-3 py-1 bg-charcoal text-white text-[10px] font-black uppercase tracking-widest rounded-md"
                            >
                              {t('details')}
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
                {/* Map Control Floating Card */}
                <div className="absolute top-4 right-4 z-[1000] glass px-4 py-2 rounded-xl border border-white/50 shadow-premium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-[10px] font-black text-charcoal uppercase tracking-widest">Interactive Region</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PropertyCard = ({ property, compact, onHover, onClick, style, t }) => (
  <div
    className={`card-premium group cursor-pointer ${compact ? 'flex h-48' : 'flex flex-col'} transition-all duration-500`}
    onClick={onClick}
    onMouseEnter={() => onHover && onHover(property.property_id)}
    onMouseLeave={() => onHover && onHover(null)}
    style={style}
  >
    <div className={`relative overflow-hidden ${compact ? 'w-1/3' : 'h-64'}`}>
      <img
        src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800'}
        alt={property.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute top-4 left-4 flex gap-2">
         <div className="glass px-3 py-1 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-charcoal">
               {property.category?.replace('_', ' ')}
            </span>
         </div>
      </div>
      {property.instant_booking && (
         <div className="absolute bottom-4 left-4 bg-amber-500 text-white p-1.5 rounded-lg shadow-lg">
            <Zap className="w-3 h-3 fill-current" />
         </div>
      )}
    </div>
    <div className={`p-6 flex flex-col justify-between ${compact ? 'w-2/3' : 'flex-1'}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
           <span className="text-[10px] font-black text-sage-dark uppercase tracking-widest">
              {property.property_type || 'Premium Stay'}
           </span>
           <div className="flex items-center text-amber-500">
              <Star className="w-3 h-3 fill-current mr-1" />
              <span className="text-xs font-black text-charcoal">4.8</span>
           </div>
        </div>
        <h3 className="text-lg font-bold text-charcoal mb-1 group-hover:text-terracotta transition-colors line-clamp-1">{property.title}</h3>
        <div className="flex items-center text-charcoal-muted mb-4">
          <MapPin className="w-3.5 h-3.5 mr-1.5 text-sage" />
          <span className="text-xs font-semibold">{property.city}, {property.state}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-sand-100">
        <div>
          <span className="text-2xl font-black text-terracotta">
            ₹{property.price_per_night}
          </span>
          <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest ml-1">
            {property.category === 'commercial' || property.category === 'event_venue'
              ? (property.pricing_cycle === 'hourly' ? `/ ${t('hour')}` : property.pricing_cycle === 'weekly' ? `/ ${t('week')}` : property.pricing_cycle === 'monthly' ? `/ ${t('month')}` : `/ ${t('day')}`)
              : `/ ${t('night')}`}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center group-hover:bg-terracotta group-hover:border-terracotta transition-all duration-300">
           <Search className="w-4 h-4 text-charcoal group-hover:text-white" />
        </div>
      </div>
    </div>
  </div>
);

export default GuestBrowse;
