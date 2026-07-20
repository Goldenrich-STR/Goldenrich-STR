import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, getImageUrl } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';
import SEO from '../components/SEO';
import { formatCategoryLabel, formatPropertyTypeLabel } from '../lib/displayLabels';
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
  Heart,
  Share2,
  Menu,
  Calendar,
  User,
  Compass,
  Trees,
  Waves,
  Hotel,
  Sunset,
  Home,
  Briefcase,
  PartyPopper,
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
  { value: 'co_living', label: 'Co-living' },
  { value: 'private_office', label: 'Private Office' },
  { value: 'co_working', label: 'Co-working' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'resort', label: 'Resort' },
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
];

const COMMERCIAL_SIZE_TYPES = new Set(['private_office', 'co_working', 'meeting_room']);

const SIZE_TYPES = [
  { value: '', label: 'Any size' },
  { value: 'small', label: 'Small (under 500 sqft)' },
  { value: 'medium', label: 'Medium (500-2000 sqft)' },
  { value: 'large', label: 'Large (2000-5000 sqft)' },
  { value: 'extra_large', label: 'Extra Large (5000+ sqft)' },
  { value: 'custom', label: 'Custom Size' },
];

const AMENITY_OPTIONS = [
  'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms', 'live_music', 'food_court',
  'birthday_celebration', 'indoor_games',
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
      background:${active ? '#006437' : '#fff'};
      color:${active ? '#fff' : '#2C2C2C'};
      border:2px solid #006437;
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

const SUGGESTED_DESTINATIONS = [
  { city: "Pune", state: "Maharashtra", desc: "A hidden gem", icon: Hotel },
  { city: "Lonavala", state: "Maharashtra", desc: "For sights like Karla Caves", icon: Trees },
  { city: "Mumbai", state: "Maharashtra", desc: "For its top-notch dining", icon: Building2 },
  { city: "North Goa", state: "Goa", desc: "Popular beach destination", icon: Waves },
  { city: "Nashik", state: "Maharashtra", desc: "Near you", icon: Compass },
  { city: "Karjat", state: "Maharashtra", desc: "A hidden gem", icon: Home }
];

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

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [guestCounts, setGuestCounts] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const initialGuests = parseInt(params.get('guests')) || 2;
    return { adults: Math.max(1, initialGuests), children: 0, infants: 0 };
  });

  useEffect(() => {
    const total = guestCounts.adults + guestCounts.children;
    setFilters(prev => ({ ...prev, guests: String(total) }));
  }, [guestCounts]);

  const [properties, setProperties] = useState([]);
  const [seoData, setSeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [hoveredId, setHoveredId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_wishlist')) || [];
    } catch (e) {
      return [];
    }
  });
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  const handleWishlistToggle = (propertyId) => {
    setWishlist(prev => {
      let updated;
      if (prev.includes(propertyId)) {
        updated = prev.filter(id => id !== propertyId);
      } else {
        updated = [...prev, propertyId];
      }
      localStorage.setItem('guest_wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleShareWhatsApp = (property) => {
    const url = `${window.location.origin}/property/${property.property_id}`;
    const text = `Check out this amazing property *${property.title}* in *${property.city}* on X-Space360:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      city: params.get('city') || '',
      category: params.get('category') || 'residential',
      property_type: params.get('property_type') || '',
      bhk_type: '',
      min_price: '',
      max_price: '',
      guests: params.get('guests') || '',
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
    const propertyType = params.get('property_type');
    const checkIn = params.get('checkIn');
    const checkOut = params.get('checkOut');
    const guests = params.get('guests');
    const isWishlist = params.get('wishlist') === 'true';
    
    if (isWishlist) {
      setShowWishlistOnly(true);
    }
    
    if (city || category || propertyType || checkIn || checkOut || guests) {
      setFilters(prev => ({
        ...prev,
        city: city || prev.city,
        category: category || prev.category,
        property_type: propertyType || prev.property_type,
        check_in: checkIn || prev.check_in,
        check_out: checkOut || prev.check_out,
        guests: guests || prev.guests
      }));
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.sort,
    filters.city,
    filters.category,
    filters.property_type,
    filters.bhk_type,
    filters.min_price,
    filters.max_price,
    filters.guests,
    filters.instant_booking,
    filters.pet_friendly,
    filters.check_in,
    filters.check_out,
    filters.amenities,
  ]);

  const usesCommercialSizeFilter = COMMERCIAL_SIZE_TYPES.has(filters.property_type);
  const configurationOptions = usesCommercialSizeFilter ? SIZE_TYPES : BHK_TYPES;

  useEffect(() => {
    if (
      filters.bhk_type &&
      !configurationOptions.some(option => option.value === filters.bhk_type)
    ) {
      setFilters(prev => ({ ...prev, bhk_type: '' }));
    }
  }, [configurationOptions, filters.bhk_type]);

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
      setSeoData(res.data.seo || null);
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
      guests: '',
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

  const displayedProperties = useMemo(() => {
    if (showWishlistOnly) {
      return properties.filter(p => wishlist.includes(p.property_id));
    }
    return properties;
  }, [properties, wishlist, showWishlistOnly]);

  const propsWithCoords = useMemo(
    () => displayedProperties.filter((p) => p.latitude && p.longitude),
    [displayedProperties]
  );

  const seoBreadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Browse", url: "/guest/browse" }
  ];
  if (filters.category) {
    seoBreadcrumbs.push({
      name: filters.category === "residential" ? "Residential" : filters.category === "commercial" ? "Commercial" : "Event Venues",
      url: `/guest/browse?category=${filters.category}`
    });
  }
  if (filters.city) {
    seoBreadcrumbs.push({
      name: filters.city,
      url: `/guest/browse?city=${filters.city}`
    });
  }

  const indiaCenter = [20.5937, 78.9629];  return (
    <div className="min-h-screen bg-stone flex flex-col selection:bg-terracotta selection:text-white">
      <SEO
        title={filters.city ? `Properties in ${filters.city}` : "Browse Properties"}
        description="Browse luxury villas, premium offices, event spaces, and short-term rentals on X-Space360."
        type="listing"
        data={{ properties: displayedProperties }}
        breadcrumbs={seoBreadcrumbs}
        seo={seoData}
      />
      {/* Header */}
      <header className="relative z-40 glass px-4 md:px-8 py-4 border-b border-gray-100" data-testid="guest-header">
        <div className="w-full flex justify-between items-center gap-2">
          <div 
            className="flex items-center cursor-pointer shrink-0" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <div className="hidden md:flex items-center space-x-4 md:space-x-6">
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

            <button
              onClick={() => setShowWishlistOnly(prev => !prev)}
              className={`text-[10px] font-bold tracking-tight tracking-widest transition-colors uppercase flex items-center space-x-1 ${
                showWishlistOnly ? 'text-red-500' : 'text-charcoal-muted hover:text-terracotta'
              }`}
            >
              <Heart className={`w-3 h-3 ${showWishlistOnly ? 'fill-red-500 text-red-500' : ''}`} />
              <span>Wishlist</span>
            </button>

            <div className="h-4 w-[1px] bg-sand-300"></div>

            {user && (
              <div className="hidden sm:flex items-center space-x-3 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-sm font-bold text-charcoal">{t('hi')}, {user.full_name?.split(' ')[0]}</span>
              </div>
            )}
            {user ? (
              <>
                <button
                  onClick={() => navigate('/guest/bookings')}
                  className="text-[10px] font-bold tracking-tight text-charcoal-muted hover:text-terracotta tracking-widest transition-colors uppercase"
                >
                  {t('myBookings')}
                </button>
                <button
                  onClick={logout}
                  className="text-[10px] font-bold tracking-tight text-terracotta hover:underline tracking-widest uppercase"
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
          
          {/* Mobile Hamburger Icon */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-charcoal hover:text-terracotta transition p-2">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col pt-6 pb-10 px-6 overflow-y-auto animate-fade-in text-charcoal md:hidden">
          <div className="flex justify-between items-center mb-12">
            <div className="cursor-pointer" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
              <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-charcoal hover:text-terracotta transition p-2 bg-gray-50 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col space-y-6 flex-1">
            <button
              onClick={() => { setIsMobileMenuOpen(false); setShowWishlistOnly(prev => !prev); }}
              className="text-left text-2xl font-bold hover:text-terracotta transition flex items-center justify-between py-2 border-b border-gray-100"
            >
              <span>{showWishlistOnly ? 'Show All Spaces' : 'Wishlist'}</span>
              <Heart className={`w-6 h-6 ${showWishlistOnly ? 'text-red-500 fill-red-500' : 'text-charcoal-muted'}`} />
            </button>
            <div className="py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-2xl font-bold">Language</span>
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={(newLang) => {
                  setLang(newLang);
                  localStorage.setItem('preferredLanguage', newLang);
                }}
              />
            </div>

            {user ? (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/guest/bookings'); }}
                  className="text-left text-2xl font-bold text-terracotta py-2 border-b border-gray-100"
                >
                  {t('myBookings')}
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                  className="mt-8 bg-sand-200 hover:bg-sand-300 text-charcoal font-bold py-4 rounded-xl text-center transition"
                >
                  {t('signOut')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                  className="text-left text-2xl font-bold hover:text-terracotta transition py-2 border-b border-gray-100"
                >
                  {t('signIn')}
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
                  className="mt-8 bg-terracotta hover:bg-terracotta-hover text-white font-bold py-4 rounded-xl text-center shadow-premium transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Search Bar */}
      <div className="bg-white/80 backdrop-blur relative md:sticky md:top-0 z-30 px-4 md:px-8 py-4 border-b border-gray-100 shadow-sm">
        {/* Transparent overlay to close active dropdowns on clicking outside */}
        {activeDropdown && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
        )}

        <div className="w-full max-w-5xl mx-auto relative z-50">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row items-center bg-white rounded-2xl md:rounded-full w-full shadow-elevated border border-gray-100 relative z-50 animate-fade-in"
          >
              
              {/* Location */}
              <div className="relative flex-1 w-full">
                <div 
                  onClick={() => {
                    setActiveDropdown('location');
                    const el = document.getElementById('browse-destination');
                    if (el) el.focus();
                  }}
                  className="flex items-center px-4 md:px-6 py-4 w-full cursor-pointer group rounded-t-2xl md:rounded-l-full border-b border-gray-100 md:border-none hover:bg-gray-50 transition"
                >
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors" />
                  <div className="w-full text-left">
                    <p className="text-xs text-gray-400 font-semibold tracking-tight uppercase tracking-wider">Where</p>
                    <input
                      id="browse-destination"
                      name="destination"
                      type="text"
                      autoComplete="address-level2"
                      value={filters.city}
                      onFocus={() => setActiveDropdown('location')}
                      onChange={(e) => {
                        setFilters({ ...filters, city: e.target.value });
                        setActiveDropdown('location');
                      }}
                      placeholder="Location"
                      className="bg-transparent border-none outline-none text-charcoal w-full placeholder-gray-400 font-bold text-sm focus:ring-0 focus:outline-none p-0 mt-0.5"
                    />
                  </div>
                </div>

                {/* Airbnb-style Suggested Destinations Dropdown */}
                {activeDropdown === 'location' && (
                  <div className="absolute left-0 top-full mt-3 w-80 bg-white border border-gray-100 rounded-3xl shadow-elevated z-50 p-4 max-h-96 overflow-y-auto">
                    <p className="text-xs font-bold tracking-tight text-gray-400 uppercase tracking-wider mb-3 px-2">Suggested destinations</p>
                    <div className="space-y-1">
                      {SUGGESTED_DESTINATIONS.filter(dest => 
                        !filters.city || 
                        dest.city.toLowerCase().includes(filters.city.toLowerCase()) || 
                        dest.state.toLowerCase().includes(filters.city.toLowerCase())
                      ).map((dest, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFilters({ ...filters, city: dest.city });
                            setActiveDropdown(null);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-stone transition text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                            {dest.icon ? <dest.icon className="w-5 h-5 text-gray-500" /> : <MapPin className="w-5 h-5 text-gray-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-charcoal">{dest.city}, {dest.state}</p>
                            <p className="text-xs text-gray-400 font-semibold mt-0.5">{dest.desc}</p>
                          </div>
                        </button>
                      ))}
                      {SUGGESTED_DESTINATIONS.filter(dest => 
                        !filters.city || 
                        dest.city.toLowerCase().includes(filters.city.toLowerCase()) || 
                        dest.state.toLowerCase().includes(filters.city.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs font-semibold text-gray-400 p-2 italic text-center">No locations matched. Press enter to search anyway.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
              
              {/* Check-in */}
              <div className="relative flex items-center px-4 md:px-6 py-4 w-full md:w-auto border-b border-gray-100 md:border-none hover:bg-gray-50 transition group">
                <Calendar className="w-5 h-5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors z-0" />
                <div className="w-full text-left pointer-events-none z-0">
                  <p className="text-xs text-gray-400 font-semibold tracking-tight uppercase tracking-wider">When</p>
                  <p className={`font-bold text-sm mt-0.5 ${filters.check_in ? 'text-charcoal' : 'text-gray-400'}`}>
                    {filters.check_in || 'Check-in'}
                  </p>
                </div>
                <input
                  id="browse-check-in"
                  name="checkIn"
                  type="date"
                  min={todayISO}
                  value={filters.check_in}
                  onChange={(e) => setFilters({ ...filters, check_in: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="hidden md:block w-[1px] h-8 bg-gray-200" />
              
              {/* Check-out */}
              <div className="relative flex items-center px-4 md:px-6 py-4 w-full md:w-auto border-b border-gray-100 md:border-none hover:bg-gray-50 transition group">
                <Calendar className="w-5 h-5 text-gray-400 mr-3 group-hover:text-terracotta transition-colors z-0" />
                <div className="w-full text-left pointer-events-none z-0">
                  <p className="text-xs text-gray-400 font-semibold tracking-tight uppercase tracking-wider">When</p>
                  <p className={`font-bold text-sm mt-0.5 ${filters.check_out ? 'text-charcoal' : 'text-gray-400'}`}>
                    {filters.check_out || 'Check-out'}
                  </p>
                </div>
                <input
                  id="browse-check-out"
                  name="checkOut"
                  type="date"
                  min={filters.check_in || todayISO}
                  value={filters.check_out}
                  onChange={(e) => setFilters({ ...filters, check_out: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <div className="hidden md:block w-[1px] h-8 bg-gray-200" />


              
              {/* Guests Selector with Airbnb style +/- counter popover */}
              <div className="relative flex-1 w-full">
                <div 
                  onClick={() => setActiveDropdown(activeDropdown === 'guests' ? null : 'guests')}
                  className="flex items-center px-4 md:px-6 py-4 w-full cursor-pointer hover:bg-gray-50 transition rounded-b-2xl md:rounded-none"
                >
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400 font-semibold tracking-tight uppercase tracking-wider">Who</p>
                    <p className="text-charcoal font-bold text-sm mt-0.5 whitespace-nowrap">
                      {guestCounts.adults + guestCounts.children} Guest{(guestCounts.adults + guestCounts.children) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {activeDropdown === 'guests' && (
                  <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-gray-100 rounded-3xl shadow-elevated z-50 p-6 space-y-5">
                    {/* Adults Row */}
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-sm font-bold text-charcoal">Adults</p>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">Age 13 or above</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setGuestCounts({ ...guestCounts, adults: Math.max(1, guestCounts.adults - 1) })}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-bold text-charcoal">{guestCounts.adults}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts({ ...guestCounts, adults: guestCounts.adults + 1 })}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {/* Children Row */}
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-sm font-bold text-charcoal">Children</p>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">Ages 2–12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setGuestCounts({ ...guestCounts, children: Math.max(0, guestCounts.children - 1) })}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-bold text-charcoal">{guestCounts.children}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts({ ...guestCounts, children: guestCounts.children + 1 })}
                          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition text-charcoal font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Filter & Search Buttons */}
              <div className="p-2 w-full md:w-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`relative w-12 h-12 rounded-full border transition-all flex items-center justify-center ${
                    showFilters || filters.amenities.length > 0
                      ? 'border-terracotta bg-terracotta text-white'
                      : 'border-gray-200 hover:bg-gray-50 text-charcoal'
                  }`}
                  title={t('filters')}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  {filters.amenities.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {filters.amenities.length}
                    </span>
                  )}
                </button>

                <button
                  type="submit"
                  className="w-12 h-12 rounded-full bg-terracotta hover:bg-terracotta/90 text-white flex items-center justify-center transition-all duration-300 shadow-subtle cursor-pointer"
                  title={t('findSpaces')}
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>

          </form>
        </div>
      </div>
      {/* Advanced filters drawer */}
      {showFilters && (
        <div className="bg-stone border-b border-gray-100 px-4 md:px-8 py-8 animate-slide-up" data-testid="advanced-filters">
          <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('propertyType')}</label>
              <select
                value={filters.property_type}
                onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
                className="w-full bg-white border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
              >
                {PROPERTY_TYPES.map((tOpt) => (
                  <option key={tOpt.value} value={tOpt.value}>{tOpt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] ml-1">
                {usesCommercialSizeFilter ? 'Size' : t('bhkConfig')}
              </label>
              <select
                value={filters.bhk_type}
                onChange={(e) => setFilters({ ...filters, bhk_type: e.target.value })}
                className="w-full bg-white border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
              >
                {configurationOptions.map((tOpt) => (
                  <option key={tOpt.value} value={tOpt.value}>{tOpt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] ml-1">{t('priceRange')}</label>
              <div className="flex items-center space-x-3">
                 <input
                   type="number"
                   value={filters.min_price}
                   onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                   placeholder="Min"
                   className="w-full bg-white border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                 />
                 <span className="text-sand-400 font-bold">−</span>
                 <input
                   type="number"
                   value={filters.max_price}
                   onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                   placeholder="Max"
                   className="w-full bg-white border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                 />
              </div>
            </div>

            <div className="md:col-span-4 mt-4">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] ml-1 mb-3 block">{t('essentialAmenities')}</label>
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
                          : 'bg-white border-gray-100 text-charcoal-muted hover:border-sand-400'
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
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
                   className="text-sm font-bold tracking-tight text-terracotta uppercase tracking-widest hover:underline px-4"
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
      <div className="px-4 md:px-8 py-8 w-full flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-charcoal tracking-tight">
             {loading ? t('searching') : (
                <>
                   {displayedProperties.length} {displayedProperties.length === 1 ? t('spaceFound') : t('spacesFound')}
                </>
             )}
          </h2>
          <p className="text-charcoal-muted font-medium mt-1">
             {filters.city ? t('curatedResults').replace('{city}', filters.city) : t('discoverExclusive')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
             <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">{t('sortBy')}</span>
             <select
               value={filters.sort}
               onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
               className="bg-transparent border-none text-sm font-bold tracking-tight text-charcoal outline-none cursor-pointer hover:text-terracotta transition-colors"
             >
               {SORT_OPTIONS.map((s) => (
                 <option key={s.value} value={s.value}>{t(s.value)}</option>
               ))}
             </select>
          </div>

          <div className="h-6 w-[1px] bg-sand-200"></div>

          <div className="flex bg-gray-50 p-1 rounded-xl" data-testid="view-toggle">
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
      <div className="flex-1 px-4 md:px-8 pb-12 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <div className="w-12 h-12 border-4 border-gray-100 border-t-terracotta rounded-full animate-spin"></div>
             <p className="font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] text-xs">{t('curatingSpaces')}</p>
          </div>
        ) : displayedProperties.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-premium">
            <div className="w-20 h-20 bg-stone rounded-full flex items-center justify-center mx-auto mb-6">
               <Building2 className="w-10 h-10 text-sand-300" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-charcoal mb-2">{showWishlistOnly ? "No Wishlisted Properties" : t('noMatches')}</h3>
            <p className="text-charcoal-muted font-medium mb-8 max-w-sm mx-auto">
              {showWishlistOnly ? "You haven't added any spaces to your wishlist yet." : t('noMatchesSub')}
            </p>
            {showWishlistOnly ? (
              <button onClick={() => setShowWishlistOnly(false)} className="btn-premium px-10">Browse All</button>
            ) : (
              <button onClick={clearFilters} className="btn-premium px-10">{t('clearAll')}</button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === VIEW_MODES.SPLIT
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 h-auto lg:h-[calc(100vh-320px)]'
                : viewMode === VIEW_MODES.MAP
                ? 'h-[60vh] lg:h-[calc(100vh-320px)] animate-fade-in'
                : ''
            }
          >
            {/* Cards Grid */}
            {viewMode !== VIEW_MODES.MAP && (
              <div
                className={
                  viewMode === VIEW_MODES.SPLIT
                    ? 'overflow-y-auto pr-4 space-y-6 custom-scrollbar'
                    : 'flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar scroll-smooth sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6 animate-slide-up w-full'
                }
              >
                {displayedProperties.map((p, idx) => (
                  <PropertyCard
                    key={p.property_id}
                    property={p}
                    compact={viewMode === VIEW_MODES.SPLIT}
                    onHover={setHoveredId}
                    onClick={() => navigateToProperty(p.property_id)}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    t={t}
                    isWishlisted={wishlist.includes(p.property_id)}
                    onWishlistToggle={handleWishlistToggle}
                    onShare={handleShareWhatsApp}
                  />
                ))}
              </div>
            )}

            {/* Interactive Map */}
            {(viewMode === VIEW_MODES.SPLIT || viewMode === VIEW_MODES.MAP) && (
              <div className="rounded-3xl overflow-hidden border border-gray-100 h-full shadow-premium relative group">
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
                          <h4 className="font-bold tracking-tight text-charcoal leading-tight mb-1">{p.title}</h4>
                          <div className="flex items-center text-charcoal-muted text-[10px] font-bold uppercase tracking-widest mb-3">
                             <MapPin className="w-3 h-3 mr-1" /> {p.city}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-sand-100">
                            <div>
                              <span className="text-lg font-bold tracking-tight text-terracotta">₹{p.price_per_night}</span>
                              <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest ml-1">
                                {p.category === 'commercial' || p.category === 'event_venue'
                                  ? (p.pricing_cycle === 'hourly' ? `/ ${t('hour')}` : p.pricing_cycle === 'weekly' ? `/ ${t('week')}` : p.pricing_cycle === 'monthly' ? `/ ${t('month')}` : `/ ${t('day')}`)
                                  : `/ ${t('night')}`}
                              </span>
                            </div>
                            <button
                              onClick={() => navigateToProperty(p.property_id)}
                              className="px-3 py-1 bg-charcoal text-white text-[10px] font-bold tracking-tight uppercase tracking-widest rounded-md"
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
                   <p className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">Interactive Region</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PropertyCard = ({ property, compact, onHover, onClick, style, t, isWishlisted, onWishlistToggle, onShare }) => (
  <div
    className={`card-premium group cursor-pointer shrink-0 snap-start ${compact ? 'w-full sm:w-auto flex flex-col sm:flex-row min-h-[240px]' : 'w-[280px] sm:w-auto flex flex-col'} transition-all duration-500`}
    onClick={onClick}
    onMouseEnter={() => onHover && onHover(property.property_id)}
    onMouseLeave={() => onHover && onHover(null)}
    style={style}
  >
    <div className={`relative overflow-hidden ${compact ? 'w-full sm:w-1/3 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none h-48 sm:h-auto' : 'h-48 sm:h-72 rounded-t-2xl'}`}>
      <img
        src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800'}
        alt={property.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
      
      <div className="absolute top-4 left-4 flex gap-2">
         <div className="glass px-3 py-1 rounded-full shadow-sm">
            <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal">
               {formatCategoryLabel(property.category)}
            </span>
         </div>
      </div>
      
      {/* Share & Wishlist Buttons overlay */}
      <div className="absolute top-4 right-4 flex space-x-2 z-20">
         <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(property);
            }}
            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-subtle hover:bg-white hover:scale-[1.03] transition cursor-pointer"
            title="Share on WhatsApp"
         >
            <Share2 className="w-3.5 h-3.5 text-charcoal hover:text-green-600" />
         </button>
         <button
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle(property.property_id);
            }}
            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-subtle hover:bg-white hover:scale-[1.03] transition cursor-pointer"
            title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-charcoal hover:text-red-500'}`} />
         </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        {property.instant_booking && (
           <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-premium" title="Instant Booking">
              <Zap className="w-3.5 h-3.5 fill-current" />
           </div>
        )}
        {property.rating && property.rating > 0 ? (
          <div className="ml-auto flex items-center text-white space-x-1.5 drop-shadow-subtle">
             <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
             <span className="text-sm font-bold tracking-tight text-white">{Number(property.rating).toFixed(1)}</span>
             {property.review_count && property.review_count > 0 ? (
               <span className="text-[10px] text-white/80 font-bold ml-1">({property.review_count} Reviews)</span>
             ) : null}
          </div>
        ) : null}
      </div>
    </div>
    <div className={`p-5 flex flex-col justify-between ${compact ? 'w-full sm:w-2/3 rounded-b-2xl sm:rounded-r-2xl sm:rounded-bl-none' : 'flex-1 rounded-b-2xl'} bg-white`}>
      <div>
        <div className="flex items-center justify-between mb-2">
           <span className="text-[10px] font-bold tracking-tight text-sage-dark uppercase tracking-widest bg-sage/10 px-2 py-0.5 rounded">
              {formatPropertyTypeLabel(property.property_type) || 'Premium Stay'}
           </span>
        </div>
        <h3 className="text-lg font-bold tracking-tight text-charcoal mb-1 group-hover:text-terracotta transition-colors line-clamp-1">{property.title}</h3>
        <div className="flex items-center text-charcoal-muted mb-3">
          <MapPin className="w-3.5 h-3.5 mr-1.5 text-sage" />
          <span className="text-xs font-semibold">{property.city}, {property.state}</span>
        </div>
        
        {/* Additional Property Info */}
        <div className="flex flex-wrap gap-2 mb-4">
           {property.guests && (
             <div className="flex items-center space-x-1 bg-stone border border-sand-100 px-2 py-1 rounded-md text-[10px] font-bold text-charcoal-muted">
               <span>{property.guests} Guests</span>
             </div>
           )}
           {property.bhk_type && (
             <div className="flex items-center space-x-1 bg-stone border border-sand-100 px-2 py-1 rounded-md text-[10px] font-bold text-charcoal-muted uppercase">
               <span>{property.bhk_type}</span>
             </div>
           )}
           {property.size_sqft && (
             <div className="flex items-center space-x-1 bg-stone border border-sand-100 px-2 py-1 rounded-md text-[10px] font-bold text-charcoal-muted">
               <span>{property.size_sqft} sqft</span>
             </div>
           )}
           {property.has_cook && (
             <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md text-[10px] font-bold text-amber-800">
               <span>Cook: ₹{property.cook_price}/day</span>
             </div>
           )}
           {property.has_cook && property.veg_price && (
             <div className="flex items-center space-x-1 bg-green-50 border border-green-200 px-2 py-1 rounded-md text-[10px] font-bold text-green-700">
               <span>Veg: ₹{property.veg_price}</span>
             </div>
           )}
           {property.has_cook && property.non_veg_price && (
             <div className="flex items-center space-x-1 bg-red-50 border border-red-200 px-2 py-1 rounded-md text-[10px] font-bold text-red-700">
               <span>Non-Veg: ₹{property.non_veg_price}</span>
             </div>
           )}
           {property.amenities?.slice(0, 2).map((a, i) => (
             <div key={i} className="flex items-center space-x-1 bg-stone border border-sand-100 px-2 py-1 rounded-md text-[10px] font-bold text-charcoal-muted capitalize">
               <span>{a.replace('_', ' ')}</span>
             </div>
           ))}
        </div>
        {/* Check-in / Check-out time badges */}
        {(property.check_in_time || property.check_out_time) && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {property.check_in_time && (
              <div className="flex items-center gap-1 bg-sage/10 border border-sage/20 px-2 py-1 rounded-md">
                <span className="text-[9px] font-bold text-sage-dark uppercase tracking-wider">Check-in</span>
                <span className="text-[10px] font-bold text-charcoal">
                  {(() => {
                    const [h, m] = property.check_in_time.split(':');
                    const hour = parseInt(h);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    return `${hour % 12 || 12}:${m} ${ampm}`;
                  })()}
                </span>
              </div>
            )}
            {property.check_out_time && (
              <div className="flex items-center gap-1 bg-terracotta/10 border border-terracotta/20 px-2 py-1 rounded-md">
                <span className="text-[9px] font-bold text-terracotta uppercase tracking-wider">Check-out</span>
                <span className="text-[10px] font-bold text-charcoal">
                  {(() => {
                    const [h, m] = property.check_out_time.split(':');
                    const hour = parseInt(h);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    return `${hour % 12 || 12}:${m} ${ampm}`;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-sand-100">
        <div>
          <span className="text-2xl font-bold tracking-tight text-terracotta">
            ₹{property.price_per_night}
          </span>
          <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest ml-1">
            {property.category === 'commercial' || property.category === 'event_venue'
              ? (property.pricing_cycle === 'hourly' ? `/ ${t('hour')}` : property.pricing_cycle === 'weekly' ? `/ ${t('week')}` : property.pricing_cycle === 'monthly' ? `/ ${t('month')}` : `/ ${t('day')}`)
              : `/ ${t('night')}`}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-terracotta group-hover:border-terracotta transition-all duration-300">
           <Search className="w-4 h-4 text-charcoal group-hover:text-white" />
        </div>
      </div>
    </div>
  </div>
);

export default GuestBrowse;
