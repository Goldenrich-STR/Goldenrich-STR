import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, calendarAPI, bookingAPI, reviewAPI, getImageUrl, apiClient, couponAPI } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';
import SEO from '../components/SEO';
import LegalLinks from '../components/LegalLinks';
import { formatCategoryLabel, formatPropertyTypeLabel, formatReadableText } from '../lib/displayLabels';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Star,
  Wifi,
  Wind,
  Car,
  Utensils,
  ChefHat,
  Waves,
  Dumbbell,
  Tv,
  Flame,
  Coffee,
  Printer,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Users,
  Grid,
  X,
  Camera,
  Sparkles,
  Tag,
  Lock,
  Minus,
  Plus,
  Share2,
  Heart,
  Music,
  Pizza,
  PartyPopper,
  Gamepad
} from 'lucide-react';

const AMENITY_ICONS = {
  wifi: Wifi,
  ac: Wind,
  parking: Car,
  kitchen: Utensils,
  pool: Waves,
  gym: Dumbbell,
  tv: Tv,
  fireplace: Flame,
  coffee: Coffee,
  printer: Printer,
  rooftop: Building2,
  av_system: Tv,
  stage: Building2,
  catering: Utensils,
  bar: Coffee,
  changing_rooms: Shield,
  security: ShieldCheck,
  projector: Tv,
  whiteboard: CheckCircle2,
  power_backup: Flame,
  live_music: Music,
  food_court: Pizza,
  birthday_celebration: PartyPopper,
  indoor_games: Gamepad,
};

const AMENITY_LABELS = {
  wifi: 'WiFi',
  ac: 'Air Conditioning',
  parking: 'Parking Space',
  kitchen: 'Fully-Equipped Kitchen',
  pool: 'Swimming Pool',
  gym: 'Fitness Center/Gym',
  tv: 'Smart TV',
  washer: 'Washing Machine',
  heating: 'Heating System',
  fireplace: 'Indoor Fireplace',
  printer: 'High-speed Printer & Scanner',
  coffee: 'Coffee & Tea Station',
  restrooms: 'Executive Restrooms',
  workspace: 'Dedicated Workstations',
  projector: 'HD Projector & Screen',
  whiteboard: 'Collaboration Whiteboards',
  power_backup: '24/7 Power Generator Backup',
  av_system: 'Sound & AV System',
  stage: 'Performance Stage / Podium',
  catering: 'Catering Prep Kitchen',
  bar: 'Premium Bar Lounge Setup',
  rooftop: 'Scenic Rooftop Access',
  changing_rooms: 'VIP/Green Changing Rooms',
  security: 'Professional Event Security',
  live_music: 'Live Music',
  food_court: 'Food Court Available',
  birthday_celebration: 'Birthday Celebration',
  indoor_games: 'Indoor Games',
};

const getBhkTypeLabel = (category, bhkType, maxGuests) => {
  if (!bhkType) return 'N/A';
  if (category === 'commercial') {
    switch (bhkType.toLowerCase()) {
      case 'small': return 'Small (under 500 sqft)';
      case 'medium': return 'Medium (500-2000 sqft)';
      case 'large': return 'Large (2000-5000 sqft)';
      case 'extra_large': return 'Extra Large (5000+ sqft)';
      case 'custom': return 'Custom Size';
      default: return bhkType.toUpperCase();
    }
  }
  if (category === 'event_venue') {
    const configuredGuests = Number(maxGuests);
    const guestsText = configuredGuests > 0 ? `up to ${configuredGuests} guests` : null;
    switch (bhkType.toLowerCase()) {
      case 'small_event': return `Mini (${guestsText || 'up to 50 guests'})`;
      case 'medium_event': return `Standard (${guestsText || '50-200 guests'})`;
      case 'large_event': return `Grand (${guestsText || '200-500 guests'})`;
      case 'mega_event': return `Mega (${guestsText || '500+ guests'})`;
      default: return bhkType.toUpperCase();
    }
  }
  return bhkType.toUpperCase();
};

const MONTH_NAMES_LOCALIZED = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  hi: [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ],
  mr: [
    'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
    'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
  ]
};

const WEEKDAYS_LOCALIZED = {
  en: ['SUN','MON','TUE','WED','THU','FRI','SAT'],
  hi: ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'],
  mr: ['रवि','सोम','मंगळ','बुध','गुरु','शुक्र','शनि']
};

const formatVenuePolicyValue = (key, val) => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val === null || val === undefined) return '';

  const value = String(val).trim();
  if (!value) return '';

  if (['taxes', 'advance'].includes(key)) {
    return value.endsWith('%') ? value : `${value}%`;
  }

  return val;
};

const readPercent = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const parsed = Number(String(value).replace('%', '').trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return parsed;
};


const TRANSLATIONS = {
  en: {
    back: 'Back',
    signOut: 'Sign Out',
    loadingProperty: 'Loading property…',
    propertyNotFound: 'Property not found',
    instant: 'Instant',
    reviewsCount: 'Reviews',
    photos: 'Photos',
    showAllPhotos: 'Show all photos',
    hostedBy: 'Hosted by {name}',
    superhost: 'Superhost',
    joined: 'Joined {year}',
    contactHost: 'Contact Host',
    type: 'Type',
    area: 'Area',
    config: 'Config',
    status: 'Status',
    verified: 'Verified',
    aboutThisSpace: 'About this space',
    essentialAmenities: 'Essential Amenities',
    availability: 'Availability',
    available: 'Available',
    unavailable: 'Unavailable',
    selected: 'Selected',
    reviews: 'Guest Reviews',
    similarProperties: 'Similar Properties in {city}',
    overallRating: 'Overall Rating',
    noReviews: 'No reviews yet. Be the first to share your stay.',
    verifiedGuest: 'Verified Guest',
    hour: 'hr',
    week: 'week',
    month: 'month',
    day: 'day',
    night: 'night',
    rapidBook: 'Rapid Book',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    totalGuests: 'Total Guests',
    maxGuests: 'Max {count}',
    holdingSpot: 'HOLDING SPOT...',
    reserveNow: 'BOOK NOW',
    requestBooking: 'REQUEST BOOKING',
    totalAmount: 'TOTAL AMOUNT',
    securedByProtection: 'Secured by Golden-X Protection. You won\'t be charged until the host accepts your request.',
    photoTour: 'Photo Tour',
    inLabel: 'In',
    outLabel: 'Out',
    cleanliness: 'Cleanliness',
    communication: 'Communication',
    value: 'Value',
    accuracy: 'Accuracy',
    premiumServiceFee: 'Premium Service Fee',
    taxesGST: 'Taxes & GST (18%)',
  },
  hi: {
    back: 'वापस',
    signOut: 'साइन आउट',
    loadingProperty: 'संपत्ति लोड हो रही है…',
    propertyNotFound: 'संपत्ति नहीं मिली',
    instant: 'त्वरित',
    reviewsCount: 'समीक्षाएं',
    photos: 'तस्वीरें',
    showAllPhotos: 'सभी तस्वीरें दिखाएं',
    hostedBy: '{name} द्वारा होस्ट किया गया',
    superhost: 'सुपरहोस्ट',
    joined: 'जुड़े {year}',
    contactHost: 'होस्ट से संपर्क करें',
    type: 'प्रकार',
    area: 'क्षेत्रफल',
    config: 'कॉन्फ़िगरेशन',
    status: 'स्थिति',
    verified: 'सत्यापित',
    aboutThisSpace: 'इस स्थान के बारे में',
    essentialAmenities: 'आवश्यक सुविधाएं',
    availability: 'उपलब्धता',
    available: 'उपलब्ध',
    unavailable: 'अनुपलब्ध',
    selected: 'चयनित',
    reviews: 'अतिथि समीक्षाएं',
    similarProperties: '{city} में समान संपत्तियां',
    overallRating: 'कुल रेटिंग',
    noReviews: 'अभी तक कोई समीक्षा नहीं है। रहने का अनुभव साझा करने वाले पहले व्यक्ति बनें।',
    verifiedGuest: 'सत्यापित अतिथि',
    hour: 'घंटा',
    week: 'सप्ताह',
    month: 'महीना',
    day: 'दिन',
    night: 'रात',
    rapidBook: 'त्वरित बुक',
    checkIn: 'चेक-इन',
    checkOut: 'चेक-out',
    totalGuests: 'कुल अतिथि',
    maxGuests: 'अधिकतम {count}',
    holdingSpot: 'स्थान आरक्षित किया जा रहा है...',
    reserveNow: 'अभी बुक करें',
    requestBooking: 'बुकिंग का अनुरोध करें',
    totalAmount: 'कुल राशि',
    securedByProtection: 'गोल्डन-एक्स सुरक्षा द्वारा सुरक्षित। होस्ट द्वारा आपका अनुरोध स्वीकार करने तक आपसे कोई शुल्क नहीं लिया जाएगा।',
    photoTour: 'फोटो टूर',
    inLabel: 'चेक इन',
    outLabel: 'चेक आउट',
    cleanliness: 'स्वच्छता',
    communication: 'संवाद',
    value: 'मूल्य',
    accuracy: 'अचूकता',
    premiumServiceFee: 'प्रीमियम सेवा शुल्क',
    taxesGST: 'कर और जीएसटी (18%)',
  },
  mr: {
    back: 'मागे',
    signOut: 'साइन आउट',
    loadingProperty: 'जागा लोड होत आहे…',
    propertyNotFound: 'जागा सापडली नाही',
    instant: 'झटपट',
    reviewsCount: 'पुनरावलोकने',
    photos: 'फोटो',
    showAllPhotos: 'सर्व फोटो दाखवा',
    hostedBy: '{name} द्वारे होस्ट केलेले',
    superhost: 'सुपरहोस्ट',
    joined: 'नोंदणी {year}',
    contactHost: 'होस्टशी संपर्क साधा',
    type: 'प्रकार',
    area: 'क्षेत्रफळ',
    config: 'कॉन्फिग्रेशन',
    status: 'स्थिती',
    verified: 'व्हेरिफाईड',
    aboutThisSpace: 'या जागेबद्दल',
    essentialAmenities: 'आवश्यक सोयी-सुविधा',
    availability: 'उपलब्धता',
    available: 'उपलब्ध',
    unavailable: 'अनुपलब्ध',
    selected: 'निवडलेले',
    reviews: 'अतिथी पुनरावलोकने',
    similarProperties: '{city} मधील तत्सम जागा',
    overallRating: 'एकूण रेटिंग',
    noReviews: 'अद्याप पुनरावलोकने नाहीत. पुनरावलोकन लिहिणारे पहिले व्हा.',
    verifiedGuest: 'व्हेरिफाईड अतिथी',
    hour: 'तास',
    week: 'आठवडा',
    month: 'महिना',
    day: 'दिवस',
    night: 'रात्र',
    rapidBook: 'झटपट बुक',
    checkIn: 'चेक-इन',
    checkOut: 'चेक-out',
    totalGuests: 'एकूण अतिथी',
    maxGuests: 'कमाल {count}',
    holdingSpot: 'आरक्षित होत आहे...',
    reserveNow: 'आताच बुक करा',
    requestBooking: 'बुकिंगसाठी विनंती करा',
    totalAmount: 'एकूण रक्कम',
    securedByProtection: 'गोल्डन-एक्स संरक्षणाद्वारे सुरक्षित. होस्टने तुमची विनंती स्वीकारेपर्यंत तुमच्याकडून कोणतेही शुल्क आकारले जाणार नाही.',
    photoTour: 'फोटो टूर',
    inLabel: 'चेक इन',
    outLabel: 'चेक आउट',
    cleanliness: 'स्वच्छता',
    communication: 'संपर्क',
    value: 'किंमत',
    accuracy: 'अचूकता',
    premiumServiceFee: 'प्रीमियम सेवा शुल्क',
    taxesGST: 'कर आणि जीएसटी (18%)',
  }
};

function toISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMonthMatrix(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateInRange(iso, startISO, endISO) {
  return iso >= startISO && iso <= endISO;
}

const ReviewForm = ({ user, propertyId, t, setProperty, onSuccess }) => {
  const [subRatings, setSubRatings] = useState({
    cleanliness: 0,
    communication: 0,
    check_in: 0,
    accuracy: 0,
    location: 0,
    value: 0
  });
  const [reviewComment, setReviewComment] = useState('');

  const submitReview = async () => {
    if (!user) return alert('Please login to submit a review');
    try {
      const vals = Object.values(subRatings);
      const avgRating = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avgRating === 0) return alert('Please select a rating before submitting');
      const res = await apiClient.post(`/properties/${propertyId}/reviews`, { rating: avgRating, comment: reviewComment });
      setProperty(prev => ({...prev, rating: res.data.new_rating, review_count: res.data.review_count}));
      alert('Review submitted successfully!');
      setReviewComment('');
      if (onSuccess) onSuccess();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to submit review');
    }
  };

  if (!user || user.role !== 'guest') return null;

  return (
    <div className="mb-12 bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-premium animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <h3 className="text-2xl font-bold tracking-tight text-charcoal mb-8 tracking-tight relative z-10">Leave a Review</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10 relative z-10">
        {Object.entries(subRatings).map(([key, val]) => (
          <div key={key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-stone/80 p-4 sm:p-5 rounded-2xl border border-sand-100 hover:border-terracotta/30 transition-all duration-300 hover:shadow-sm gap-2 sm:gap-0">
            <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">{t(key) || key.replace('_', ' ')}</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star 
                  key={n} 
                  onClick={() => setSubRatings(prev => ({ ...prev, [key]: n }))}
                  className={`w-5 h-5 cursor-pointer transform hover:scale-[1.03] active:scale-95 transition-transform ${n <= val ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-sand-200 hover:text-sand-300'}`} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <textarea 
        value={reviewComment}
        onChange={(e) => setReviewComment(e.target.value)}
        placeholder="Share details of your own experience at this property..."
        className="w-full p-6 bg-stone/80 border border-gray-100 rounded-3xl mb-8 text-sm font-medium text-charcoal focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all shadow-sm relative z-10 placeholder:text-sand-400"
        rows={4}
      />
      <div className="flex justify-end relative z-10">
        <button onClick={submitReview} className="btn-primary py-4 px-10 text-sm font-bold tracking-tight tracking-widest shadow-premium hover:shadow-premium hover:-translate-y-1 transition-all duration-300">
          Submit Review
        </button>
      </div>
    </div>
  );
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  let match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  match = url.match(/v=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  return '';
};

const PropertyDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('preferredLanguage') || 'en');
  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guest_wishlist')) || [];
    } catch (e) {
      return [];
    }
  });

  const handleWishlistToggle = () => {
    setWishlist(prev => {
      let updated;
      if (prev.includes(id)) {
        updated = prev.filter(pId => pId !== id);
      } else {
        updated = [...prev, id];
      }
      localStorage.setItem('guest_wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleShareWhatsApp = () => {
    if (!property) return;
    const url = window.location.href;
    const text = `Check out this amazing property *${property.title}* in *${property.city}* on X-Space360:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isSaved = wishlist.includes(id);

  const [blockedDates, setBlockedDates] = useState([]);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const checkInParam = params.get('checkIn');
    if (checkInParam) {
      const parts = checkInParam.split('-');
      if (parts.length === 3) {
        return Number(parts[1]);
      }
    }
    return today.getMonth() + 1;
  });
  const [calYear, setCalYear] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const checkInParam = params.get('checkIn');
    if (checkInParam) {
      const parts = checkInParam.split('-');
      if (parts.length === 3) {
        return Number(parts[0]);
      }
    }
    return today.getFullYear();
  });

  const [checkIn, setCheckIn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('checkIn') || '';
  });
  const [checkOut, setCheckOut] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('checkOut') || '';
  });
  const [guests, setGuests] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get('guests')) || 1;
  });
  const [childrenGuests, setChildrenGuests] = useState(0);
  const [infantGuests, setInfantGuests] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [foodPreference, setFoodPreference] = useState('veg');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingPaymentType, setBookingPaymentType] = useState('full');
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationPaymentType, setQuotationPaymentType] = useState('full');

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ rating_avg: 0, rating_count: 0, sub_avgs: {} });
  const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);
  const [showMobileBookingDrawer, setShowMobileBookingDrawer] = useState(false);

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [isSameCityRecommendation, setIsSameCityRecommendation] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState({
    platform_fee_percent: 10,
    platform_fee_label: 'Premium Service Fee',
  });

  const fetchRecommendations = async (city, currentId, category) => {
    try {
      // 1. Try to search in the same city with the same category
      let res = await propertyAPI.searchProperties({ city, category, limit: 10 });
      let filtered = [];
      if (res.data && res.data.properties) {
        filtered = res.data.properties.filter(p => p.property_id !== currentId);
      }
      
      if (filtered.length > 0) {
        setRecommended(filtered.slice(0, 3));
        setIsSameCityRecommendation(true);
      } else {
        // 2. Fallback: Search across all cities for the same category
        res = await propertyAPI.searchProperties({ category, limit: 10 });
        if (res.data && res.data.properties) {
          filtered = res.data.properties.filter(p => p.property_id !== currentId);
        }
        setRecommended(filtered.slice(0, 3));
        setIsSameCityRecommendation(false);
      }
    } catch (err) {
      console.error('Failed to load recommended properties', err);
    }
  };

  useEffect(() => {
    setImgIdx(0);
    setChildrenGuests(0);
    setInfantGuests(0);
    setBookingError('');
    setSelectedSlot('');
    setFoodPreference('veg');
    setShowGuestDropdown(false);

    fetchProperty();
    fetchBlockedDates();
    fetchReviews();
    fetchCoupons();
    bookingAPI.getPaymentConfig()
      .then((res) => setPaymentConfig({
        platform_fee_percent: res.data.platform_fee_percent ?? 10,
        platform_fee_label: res.data.platform_fee_label || 'Premium Service Fee',
      }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const checkBookingStatus = async () => {
      if (user && user.role === 'guest') {
        try {
          const res = await bookingAPI.getGuestBookings();
          const guestBookings = res.data.bookings || [];
          const hasBookedThisProperty = guestBookings.some((b) => {
            if (b.property_id !== id || b.booking_status !== 'confirmed') {
              return false;
            }
            const todayStr = new Date().toISOString().split('T')[0];
            return b.check_out_date <= todayStr;
          });
          setHasConfirmedBooking(hasBookedThisProperty);
        } catch (err) {
          console.error('Failed to load guest bookings:', err);
        }
      } else {
        setHasConfirmedBooking(false);
      }
    };
    checkBookingStatus();
  }, [user, id]);

  const images = useMemo(() => {
    const raw = property?.images?.length
      ? property.images
      : ['https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200#Other'];
    
    // Deduplicate by pure URL
    const seen = new Set();
    const unique = [];
    raw.forEach(img => {
      const pureUrl = img.split('#')[0];
      if (!seen.has(pureUrl)) {
        seen.add(pureUrl);
        unique.push(img);
      }
    });
    return unique;
  }, [property?.images]);

  const groupedImages = useMemo(() => {
    const groups = {};
    images.forEach(img => {
      const [url, cat] = img.split('#');
      const category = cat || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(url);
    });
    return groups;
  }, [images]);

  const allCategories = Object.keys(groupedImages);
  const maxGuests = Math.max(1, Number(property?.max_guests) || 6);
  const adultGuests = Number(guests) || 1;
  const chargeableGuests = Math.max(1, adultGuests + childrenGuests);
  const canAddChargeableGuest = chargeableGuests < maxGuests;

  const updateAdultGuests = (delta) => {
    setGuests((current) => {
      const currentAdults = Math.max(1, Number(current) || 1);
      if (delta > 0 && currentAdults + childrenGuests >= maxGuests) return currentAdults;
      return Math.max(1, Math.min(maxGuests, currentAdults + delta));
    });
  };

  const updateChildrenGuests = (delta) => {
    setChildrenGuests((current) => {
      const next = Math.max(0, current + delta);
      if (delta > 0 && adultGuests + current >= maxGuests) return current;
      return Math.min(maxGuests - adultGuests, next);
    });
  };

  const updateInfantGuests = (delta) => {
    setInfantGuests((current) => Math.max(0, Math.min(5, current + delta)));
  };

  const fetchReviews = async () => {
    try {
      const res = await reviewAPI.listForProperty(id, { limit: 12 });
      setReviews(res.data.reviews || []);
      setReviewSummary(res.data.summary || { rating_avg: 0, rating_count: 0, sub_avgs: {} });
    } catch {
      // non-blocking
    }
  };

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const res = await propertyAPI.getProperty(id);
      setProperty(res.data);
      if (res.data) {
        if (res.data.veg_price && res.data.veg_price > 0) {
          setFoodPreference('veg');
        } else if (res.data.non_veg_price && res.data.non_veg_price > 0) {
          setFoodPreference('non_veg');
        } else {
          setFoodPreference('');
        }
      }
      if (res.data && res.data.city) {
        fetchRecommendations(res.data.city, res.data.property_id, res.data.category);
      }
    } catch (e) {
      setError(e.response?.status === 404 ? 'Property not found' : 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await couponAPI.getPropertyCoupons(id);
      setAvailableCoupons(res.data.coupons || []);
    } catch (e) {
      // non-blocking
    }
  };

  const fetchBlockedDates = async () => {
    try {
      // Fetch a wide window so calendar widget shows blocks for any nav month
      const start = toISO(new Date());
      const end = `${new Date().getFullYear() + 2}-12-31`;
      const res = await calendarAPI.getBlockedDates(id, { start_date: start, end_date: end });
      setBlockedDates(res.data.blocked_dates || []);
    } catch (e) {
      console.error('blocked dates load failed', e);
    }
  };

  const isBlocked = (iso) =>
    blockedDates.some((b) => {
      if (property?.category === 'event_venue' && b.source === 'booking') {
        return false;
      }
      return dateInRange(iso, b.start_date, b.end_date);
    });

  const getCalendarDateStatus = (iso) => {
    const matches = blockedDates.filter((b) => dateInRange(iso, b.start_date, b.end_date));
    if (matches.some((b) => b.source === 'booking')) return 'booked';
    if (matches.length > 0) return 'blocked';
    return 'available';
  };

  const parsedPolicies = useMemo(() => {
    try {
      if (property?.category === 'event_venue' && property.house_rules) {
        return JSON.parse(property.house_rules);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [property]);

  const availableSlots = useMemo(() => {
    const slots = [];
    if (parsedPolicies) {
      if (parsedPolicies.timings_morning_start && parsedPolicies.timings_morning_end) {
        slots.push({ key: 'morning', label: `Morning Slot (${parsedPolicies.timings_morning_start} to ${parsedPolicies.timings_morning_end})` });
      }
      if (parsedPolicies.timings_afternoon_start && parsedPolicies.timings_afternoon_end) {
        slots.push({ key: 'afternoon', label: `Afternoon Slot (${parsedPolicies.timings_afternoon_start} to ${parsedPolicies.timings_afternoon_end})` });
      }
      if (parsedPolicies.timings_evening_start && parsedPolicies.timings_evening_end) {
        slots.push({ key: 'evening', label: `Evening Slot (${parsedPolicies.timings_evening_start} to ${parsedPolicies.timings_evening_end})` });
      }
    }
    if (slots.length === 0) {
      slots.push({ key: 'morning', label: 'Morning Slot (07:00 AM to 02:00 PM)' });
      slots.push({ key: 'afternoon', label: 'Afternoon Slot (03:00 PM to 10:00 PM)' });
      slots.push({ key: 'evening', label: 'Evening Slot (06:00 PM to midnight)' });
    }
    return slots;
  }, [parsedPolicies]);

  useEffect(() => {
    if (availableSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(availableSlots[0].key);
    }
  }, [availableSlots, selectedSlot]);

  const cells = useMemo(() => buildMonthMatrix(calYear, calMonth), [calYear, calMonth]);
  const todayISO = toISO(new Date());

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    
    if (property?.category === 'event_venue') {
      // For event venues, check-in and check-out are inclusive (1 day means checkIn == checkOut)
      return Math.max(1, diff + 1);
    }
    
    return Math.max(0, diff);
  }, [checkIn, checkOut, property?.category]);

  const baseAmount = useMemo(() => {
    let amt = (property?.price_per_night || 0) * nights;
    if (property?.category === 'event_venue') {
      const platePrice = foodPreference === 'non_veg' 
        ? (property?.non_veg_price || 0) 
        : foodPreference === 'veg' 
        ? (property?.veg_price || 0) 
        : 0;
      let g = Number(guests);
      if (![100, 200, 300, 400, 500, 600].includes(g)) g = 100;
      amt += g * platePrice * nights;
    } else if (property?.category === 'residential' && property?.has_cook) {
      amt += (property?.cook_price || 0) * nights;
      if (foodPreference) {
        const platePrice = foodPreference === 'non_veg'
          ? (property?.non_veg_price || 0)
          : foodPreference === 'veg'
          ? (property?.veg_price || 0)
          : 0;
        const g = Number(guests) || 1;
        amt += g * platePrice * nights;
      }
    }
    return amt;
  }, [property, nights, guests, foodPreference]);

  const taxPercent = property?.category === 'event_venue'
    ? readPercent(parsedPolicies?.taxes, 18)
    : 18;
  const advancePercent = property?.category === 'event_venue'
    ? readPercent(parsedPolicies?.advance, 50)
    : 50;
  const platformFeePercent = Number(paymentConfig.platform_fee_percent ?? 10);
  const platformFeeLabel = paymentConfig.platform_fee_label || t('premiumServiceFee');
  const serviceFee = baseAmount * (platformFeePercent / 100);
  const taxes = baseAmount * (taxPercent / 100);
  const total = baseAmount + serviceFee + taxes;
  const advanceAmount = Math.round(total * (advancePercent / 100));
  const amountDueNow = (property?.category === 'event_venue' && bookingPaymentType === 'advance') ? advanceAmount : Math.round(total);
  const canShowBookingAmount = Boolean(checkIn && checkOut && nights > 0 && amountDueNow > 0);

  const goPrev = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const goNext = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  useEffect(() => {
    if (checkIn && isBlocked(checkIn)) {
      const msg = lang === 'mr' 
        ? 'ही तारीख आधीपासूनच बुक केलेली आहे. कृपया दुसरी तारीख निवडा.' 
        : lang === 'hi'
        ? 'यह तारीख पहले से ही बुक है। कृपया दूसरी तारीख चुनें।'
        : 'This date is already booked. Please select another date.';
      setBookingError(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, blockedDates, lang]);

  const handleDayClick = (d) => {
    if (!d) return;
    const iso = toISO(d);
    if (iso < todayISO) return;

    if (isBlocked(iso)) {
      const msg = lang === 'mr' 
        ? 'ही तारीख आधीपासूनच बुक केलेली आहे. कृपया दुसरी तारीख निवडा.' 
        : lang === 'hi'
        ? 'यह तारीख पहले से ही बुक है। कृपया दूसरी तारीख चुनें।'
        : 'This date is already booked. Please select another date.';
      alert(msg);
      setBookingError(msg);
      return;
    }

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut('');
    } else if (iso < checkIn) {
      setCheckIn(iso);
    } else if (iso === checkIn) {
      // Allow confirming single day by clicking again if not auto-set
      if (property?.category === 'event_venue') {
        setCheckOut(iso);
      }
    } else {
      // Verify no blocked dates in between
      let cursor = new Date(checkIn);
      cursor.setDate(cursor.getDate() + 1);
      while (toISO(cursor) <= iso) {
        if (isBlocked(toISO(cursor))) {
          const msg = lang === 'mr' 
            ? 'निवडलेल्या तारखांमध्ये बुक केलेल्या तारखा येत आहेत. कृपया दुसरी तारीख निवडा.' 
            : lang === 'hi'
            ? 'चयनित सीमा में पहले से बुक की गई तिथियां शामिल हैं। कृपया दूसरी तिथि चुनें।'
            : 'Selected range crosses unavailable dates. Please select another range.';
          alert(msg);
          setBookingError(msg);
          setCheckIn(iso);
          setCheckOut('');
          return;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      setCheckOut(iso);
      setBookingError('');
    }
  };

  const handleBookNow = async (e, paymentType = 'full') => {
    if (!user) {
      const pendingBooking = {
        propertyId: id,
        checkIn,
        checkOut,
        guests,
        childrenGuests,
        infantGuests,
        selectedSlot,
        foodPreference,
        paymentType,
      };
      localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));
      navigate(`/login?next=/property/${id}`);
      return;
    }
    if (user.role !== 'guest') {
      setBookingError('Only guests can make bookings. Please log in with a guest account.');
      return;
    }
    if (!checkIn || !checkOut) {
      setBookingError('Please select check-in and check-out dates');
      return;
    }
    if (nights < (property?.minimum_stay_days || 1)) {
      setBookingError(
        property?.category === 'commercial' || property?.category === 'event_venue'
          ? `Minimum booking duration is ${property?.minimum_stay_days} day(s)`
          : `Minimum stay is ${property?.minimum_stay_days} night(s)`
      );
      return;
    }
    if (property?.category !== 'event_venue' && chargeableGuests > maxGuests) {
      setBookingError(
        property?.category === 'commercial'
          ? `Maximum staff allowed is ${maxGuests}`
          : `Maximum guests allowed is ${maxGuests}`
      );
      return;
    }

    setBooking(true);
    setBookingError('');
    try {
      const res = await bookingAPI.createBooking({
        property_id: id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        number_of_guests: property?.category === 'event_venue' ? Number(guests) : chargeableGuests,
        selected_slot: property?.category === 'event_venue' ? selectedSlot : undefined,
        food_preference: property?.category === 'event_venue' ? foodPreference : undefined,
        payment_type: property?.category === 'event_venue' ? paymentType : 'full',
      });
      // Soft lock created — show confirmation; payment integration is mocked
      navigate(`/guest/booking-confirmation?booking_id=${res.data.booking_id}`);
    } catch (e) {
      setBookingError(e.response?.data?.detail || 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  useEffect(() => {
    if (property && user && user.role === 'guest') {
      const saved = localStorage.getItem('pendingBooking');
      if (saved) {
        try {
          const pending = JSON.parse(saved);
          if (pending.propertyId === id) {
            setCheckIn(pending.checkIn || '');
            setCheckOut(pending.checkOut || '');
            setGuests(pending.guests || 1);
            setChildrenGuests(pending.childrenGuests || 0);
            setInfantGuests(pending.infantGuests || 0);
            if (pending.selectedSlot) setSelectedSlot(pending.selectedSlot);
            if (pending.foodPreference) setFoodPreference(pending.foodPreference);
            if (pending.paymentType) setBookingPaymentType(pending.paymentType);
            
            // Clear from storage
            localStorage.removeItem('pendingBooking');
            
            // Trigger booking automatically after restoring the states
            setTimeout(() => {
              handleBookNow(null, pending.paymentType || 'full');
            }, 300);
          }
        } catch (e) {
          console.error('Failed to restore pending booking', e);
        }
      }
    }
  }, [property, user, id]);

  const handleBookNowWithQuotation = () => {
    handleBookNow(null, quotationPaymentType);
  };

  const handleDownloadQuotation = () => {
    const qtnNo = `QTN-${Math.floor(100000 + Math.random() * 900000)}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Quotation - X-Space360</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1c1c1c; margin: 40px; background: #ffffff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .title { font-size: 26px; font-weight: 900; color: #7f1d1d; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-top: 5px; }
          .details-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px; margin-top: 30px; }
          .details-title { font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
          .details-value { font-weight: 800; font-size: 14px; color: #111827; }
          .details-sub { font-size: 12px; color: #4b5563; margin-top: 2px; }
          .meta-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; margin-top: 20px; }
          .meta-card { background-color: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; }
          .table { width: 100%; border-collapse: collapse; margin-top: 30px; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
          .table th { background-color: #f3f4f6; text-align: left; padding: 12px 20px; font-size: 10px; font-weight: 800; color: #4b5563; text-transform: uppercase; }
          .table td { padding: 15px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #1f2937; }
          .table tr:last-child td { border-bottom: none; }
          .total-row { background-color: #f9fafb; font-weight: 900; }
          .total-price { color: #b45309; font-size: 18px; }
          .footer-note { text-align: center; margin-top: 50px; font-size: 11px; color: #6b7280; font-weight: bold; text-transform: uppercase; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <div class="header">
            <div>
              <div class="title">X-SPACE360</div>
              <div class="subtitle">Premium Venue Booking & Hospitality</div>
            </div>
            <div style="text-align: right;">
              <div class="subtitle">Quotation No: ${qtnNo}</div>
              <div class="subtitle">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>
          
          <div class="details-grid">
            <div>
              <div class="details-title">Venue Details</div>
              <div class="details-value">${property.title}</div>
              <div class="details-sub">${property.address}, ${property.city}</div>
            </div>
            <div style="text-align: right;">
              <div class="details-title">Guest Details</div>
              <div class="details-value">${user?.full_name || 'Valued Guest'}</div>
              <div class="details-sub">${user?.email || 'N/A'}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="details-title">Duration</div>
              <div class="details-value" style="font-size: 13px;">${nights} Day${nights > 1 ? 's' : ''}</div>
            </div>
            <div class="meta-card">
              <div class="details-title">Dates</div>
              <div class="details-value" style="font-size: 13px;">${checkIn} to ${checkOut}</div>
            </div>
            <div class="meta-card">
              <div class="details-title">Selected Slot</div>
              <div class="details-value" style="font-size: 13px; text-transform: capitalize;">${selectedSlot || 'N/A'}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th colspan="2">Item Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2">Venue Rent (₹${property.price_per_night?.toLocaleString('en-IN')} × ${nights} days)</td>
                <td style="text-align: right; font-weight: 800;">₹${((property.price_per_night || 0) * nights).toLocaleString('en-IN')}</td>
              </tr>
              ${property.category === 'event_venue' && foodPreference && (foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price) > 0 ? `
              <tr>
                <td colspan="2">Catering (₹${(foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price)?.toLocaleString('en-IN')} × ${guests} Guests × ${nights} days - ${foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'})</td>
                <td style="text-align: right; font-weight: 800;">₹${((foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price) * guests * nights).toLocaleString('en-IN')}</td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="2">${platformFeeLabel} (${platformFeePercent}%)</td>
                <td style="text-align: right; font-weight: 800;">₹${Math.round(serviceFee).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td colspan="2">Taxes & GST (${taxPercent}%)</td>
                <td style="text-align: right; font-weight: 800;">₹${Math.round(taxes).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="font-size: 13px; text-transform: uppercase;">Total Estimated Cost</td>
                <td style="text-align: right;" class="total-price">₹${Math.round(total).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-note">
            Thank you for choosing X-Space360. Generated dynamically on booking request.
          </div>
          
          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 30px; background-color: #b45309; color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Print / Save PDF</button>
          </div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `XSpace360_Quotation_${qtnNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone flex items-center justify-center">
        <p className="text-charcoal-light">{t('loadingProperty')}</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-stone flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal mb-4">{error || t('propertyNotFound')}</p>
          <button onClick={() => navigate('/guest/browse')} className="btn-primary">
            {t('back')}
          </button>
        </div>
      </div>
    );
  }


  const seoData = {
    ...property,
    reviews: reviews
  };
  const seoBreadcrumbs = [
    { name: "Home", url: "/" },
    { name: property.category === "residential" ? "Residential" : property.category === "commercial" ? "Commercial" : "Event Venues", url: `/guest/browse?category=${property.category}` },
    { name: property.city, url: `/guest/browse?city=${property.city}` },
    { name: property.title, url: `/property/${property.property_id}` }
  ];

  return (
    <div className="min-h-screen bg-stone selection:bg-terracotta selection:text-white">
      <SEO
        title={property.title}
        description={property.description}
        type="property"
        data={seoData}
        breadcrumbs={seoBreadcrumbs}
        seo={property?.seo}
      />
      <header className="glass px-4 md:px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full gap-2">
          <div 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-2 md:space-x-6">
            <LanguageSelector
              currentLang={lang}
              onLanguageChange={(newLang) => {
                setLang(newLang);
                localStorage.setItem('preferredLanguage', newLang);
              }}
            />
            <button
              onClick={() => navigate(-1)}
              className="text-xs md:text-sm font-bold tracking-tight text-charcoal-muted hover:text-terracotta uppercase tracking-widest transition-colors flex items-center space-x-1 md:space-x-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('back')}</span>
            </button>
            {user && (
              <button 
                onClick={logout} 
                className="px-2 py-1 md:px-4 md:py-2 bg-charcoal hover:bg-terracotta text-white text-[10px] md:text-xs font-bold tracking-tight uppercase tracking-widest rounded-lg transition-all"
              >
                {t('signOut')}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 pb-24 lg:pb-8">
        <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-stone-200 pb-6">
           <div>
              <div className="flex items-center space-x-2 mb-3">
                 <span className="px-3 py-1 bg-terracotta/10 text-terracotta text-[10px] font-bold tracking-tight uppercase tracking-[0.2em] rounded-full">
                   {formatCategoryLabel(property.category)}
                 </span>
                 {property.instant_booking && (
                   <span className="flex items-center text-amber-500 text-[10px] font-bold tracking-tight uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                     <Zap className="w-3 h-3 mr-1 fill-current" /> {t('instant')}
                   </span>
                 )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight text-charcoal tracking-tight leading-tight mb-4" data-testid="property-title">
                {property.title}
              </h1>
              <div className="flex items-center text-charcoal-muted font-bold text-sm flex-wrap gap-6">
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-terracotta" />{property.address}, {property.city}</span>
                <div className="flex items-center space-x-1">
                   <Star className="w-4 h-4 text-amber-500 fill-current" />
                   <span className="text-charcoal font-bold tracking-tight">{property.rating ? property.rating.toFixed(1) : 'New'}</span>
                   <span className="text-charcoal-muted ml-1 underline cursor-pointer">{property.review_count || 0} Reviews</span>
                </div>
              </div>
           </div>
           
           {/* Save and Share Buttons */}
           <div className="flex items-center space-x-3 select-none shrink-0 mb-1">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center space-x-2 px-4 py-2 border border-stone-200 rounded-full hover:bg-stone hover:scale-[1.02] active:scale-95 transition-all text-xs font-bold uppercase tracking-wider text-charcoal shadow-subtle cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-charcoal hover:text-green-600 transition-colors" />
                <span>Share</span>
              </button>
              <button
                onClick={handleWishlistToggle}
                className="flex items-center space-x-2 px-4 py-2 border border-stone-200 rounded-full hover:bg-stone hover:scale-[1.02] active:scale-95 transition-all text-xs font-bold uppercase tracking-wider text-charcoal shadow-subtle cursor-pointer"
              >
                <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-charcoal hover:text-terracotta'}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
           </div>
        </div>

        {/* Premium Gallery */}
        <div className="relative group mb-12 animate-slide-up" data-testid="gallery">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-3xl overflow-hidden shadow-elevated bg-white p-2">
            <div className="lg:col-span-2 lg:row-span-2 relative overflow-hidden group/main">
              <img
                src={getImageUrl(images[imgIdx].split('#')[0])}
                alt={property.title}
                className="w-full h-80 lg:h-[32rem] object-cover transition-transform duration-1000 group-hover/main:scale-105"
                data-testid="gallery-main-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/main:opacity-100 transition-opacity duration-500"></div>
              
              {images.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover/main:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                    className="w-12 h-12 glass flex items-center justify-center rounded-full hover:bg-white transition-all shadow-premium"
                    data-testid="gallery-prev"
                  >
                    <ChevronLeft className="w-6 h-6 text-charcoal" />
                  </button>
                  <button
                    onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                    className="w-12 h-12 glass flex items-center justify-center rounded-full hover:bg-white transition-all shadow-premium"
                    data-testid="gallery-next"
                  >
                    <ChevronRight className="w-6 h-6 text-charcoal" />
                  </button>
                </div>
              )}
              
              <div className="absolute bottom-6 right-6 glass px-4 py-2 rounded-full border border-white/30 shadow-premium">
                 <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">
                    {imgIdx + 1} / {images.length} {t('photos')}
                 </span>
              </div>
            </div>
            {images.slice(1, 5).map((src, i) => (
              <button
                key={src + i}
                onClick={() => setImgIdx(i + 1)}
                className="hidden lg:block relative overflow-hidden group/thumb"
              >
                <img src={getImageUrl(src.split('#')[0])} alt="" className="w-full h-[15.7rem] object-cover transition-transform duration-700 group-hover/thumb:scale-110" />
                <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity"></div>
              </button>
            ))}
            <button 
              onClick={() => setShowGallery(true)}
              className="absolute bottom-6 right-6 glass px-6 py-3 rounded-2xl border border-white/40 shadow-premium flex items-center space-x-2 hover:bg-white transition-all group/btn"
            >
               <Grid className="w-4 h-4 text-terracotta group-hover/btn:rotate-90 transition-transform" />
               <span className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">{t('showAllPhotos')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
            {/* Host Profile */}
            {property.host && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 group">
                <div className="flex items-center space-x-5">
                  <div className="relative">
                    <img
                      src={
                        property.host.profile_image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(property.host.full_name || 'Host')}`
                      }
                      alt={property.host.full_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-terracotta/20 group-hover:border-terracotta transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-sage text-white p-1 rounded-full shadow-sm">
                       <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-charcoal leading-tight">{t('hostedBy').replace('{name}', property.host.full_name)}</h3>
                    <div className="flex items-center mt-1 space-x-3">
                       <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">{t('superhost')}</span>
                       <span className="w-1 h-1 rounded-full bg-sand-300"></span>
                       <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">
                          {t('joined').replace('{year}', property.host.created_at ? new Date(property.host.created_at).getFullYear() : '2024')}
                       </span>
                    </div>
                  </div>
                </div>
                {property.host.phone ? (
                  <a
                    href={`tel:${property.host.phone}`}
                    className="px-5 py-2 border-2 border-charcoal rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all flex items-center gap-1.5 cursor-pointer decoration-none"
                    style={{ textDecoration: 'none' }}
                  >
                    {property.host.phone}
                  </a>
                ) : (
                  <button
                    disabled
                    className="px-5 py-2 border-2 border-gray-200 text-charcoal-muted rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest flex items-center gap-1.5 cursor-not-allowed bg-gray-50/80"
                    title="Host contact details will be unlocked after booking confirmation"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {t('contactHost')}
                  </button>
                )}
              </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { label: t('type'), value: `${formatCategoryLabel(property.category || 'residential')} · ${formatPropertyTypeLabel(property.property_type)}` },
                 { label: t('area'), value: `${property.area_sqft} SQFT` },
                 { label: t('config'), value: getBhkTypeLabel(property.category, property.bhk_type, property.max_guests) },
                 { label: t('status'), value: t('verified').toUpperCase() }
               ].map((stat) => (
                 <div key={stat.label} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <p className="text-sm font-bold tracking-tight text-charcoal">{stat.value}</p>
                 </div>
               ))}
            </div>

            {/* Description */}
            <div className="prose prose-sand max-w-none">
              <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-4 flex items-center">
                 {t('aboutThisSpace')}
                 <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
              </h2>
              <p className="text-charcoal-muted font-medium text-lg leading-relaxed whitespace-pre-line">
                {formatReadableText(property.description)}
              </p>
            </div>

            {/* Videos & Virtual Tours Section */}
            {(property.video_url || property.youtube_short_url || property.youtube_long_url) && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-4 flex items-center">
                   Videos & Virtual Tours
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {property.video_url && (
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-premium space-y-3">
                      <h3 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Walkthrough Video</h3>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                        <video
                          src={getImageUrl(property.video_url)}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {property.youtube_long_url && (
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-premium space-y-3">
                      <h3 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Full YouTube Tour</h3>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                        <iframe
                          src={getYouTubeEmbedUrl(property.youtube_long_url)}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {property.youtube_short_url && (
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-premium space-y-3 md:col-span-2 max-w-sm mx-auto w-full">
                      <h3 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest text-center">YouTube Short Tour</h3>
                      <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black max-h-[500px]">
                        <iframe
                          src={getYouTubeEmbedUrl(property.youtube_short_url)}
                          title="YouTube Shorts player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event / Food Details */}
            {(property.category === 'event_venue' || (property.category === 'residential' && property.has_cook && (Number(property.veg_price) > 0 || Number(property.non_veg_price) > 0))) && (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-6 flex items-center">
                   {property.category === 'event_venue' ? 'Event Venue Details' : 'Catering & Food Packages'}
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {property.veg_price && Number(property.veg_price) > 0 ? (
                    <div className="bg-stone rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] mb-1">Veg Price</p>
                     <p className="text-xl font-bold tracking-tight text-terracotta">₹{property.veg_price || 0} <span className="text-xs text-charcoal-light">/ plate</span></p>
                    </div>
                  ) : null}
                  {property.non_veg_price && Number(property.non_veg_price) > 0 ? (
                    <div className="bg-stone rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] mb-1">Non-Veg Price</p>
                     <p className="text-xl font-bold tracking-tight text-terracotta">₹{property.non_veg_price || 0} <span className="text-xs text-charcoal-light">/ plate</span></p>
                    </div>
                  ) : null}
                  <div className="bg-stone rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                     <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-[0.2em] mb-1">
                       {property.category === 'event_venue' ? 'Venue Rent' : 'Property Rent'}
                     </p>
                     <p className="text-xl font-bold tracking-tight text-charcoal">₹{property.price_per_night || 0} <span className="text-xs text-charcoal-light">/ {property.category === 'event_venue' ? 'day' : 'night'}</span></p>
                  </div>
                </div>
                {property.packages && property.packages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {property.packages.map((pkg, idx) => {
                      const isVeg = pkg.type === 'veg';
                      if (isVeg && (!property.veg_price || Number(property.veg_price) <= 0)) return null;
                      if (!isVeg && (!property.non_veg_price || Number(property.non_veg_price) <= 0)) return null;
                      const entries = Object.entries(pkg.items || {}).filter(([k, v]) => Number(v) > 0);
                      if (entries.length === 0) return null;
                      
                      return (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                          <div className={`flex items-center px-5 py-4 ${isVeg ? 'bg-green-50/50' : 'bg-red-50/50'} border-b ${isVeg ? 'border-green-100' : 'border-red-100'}`}>
                            <div className={`w-3 h-3 ${isVeg ? 'bg-green-500' : 'bg-red-500'} ${isVeg ? 'rounded-sm' : 'rounded-full'} mr-3 border ${isVeg ? 'border-green-700' : 'border-red-700'}`}></div>
                            <h3 className={`text-sm font-bold tracking-tight uppercase tracking-widest ${isVeg ? 'text-green-900' : 'text-red-900'}`}>
                              {isVeg ? 'Vegetarian Package' : 'Non-Vegetarian Package'}
                            </h3>
                          </div>
                          <div className="p-5">
                            <ul className="space-y-3">
                              {entries.map(([item, count]) => (
                                <li key={item} className="flex justify-between items-center">
                                  <span className="text-charcoal-muted font-medium text-sm flex items-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                                    {item}
                                  </span>
                                  <span className="text-xs font-bold tracking-tight bg-gray-50 text-charcoal px-2 py-0.5 rounded-full">
                                    x{count}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Venue Policies Section */}
            {property.category === 'event_venue' && property.house_rules && property.house_rules.startsWith('{') && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-6 flex items-center">
                   Venue Policies
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(() => {
                    try {
                      const policies = JSON.parse(property.house_rules);
                      const groupedPolicies = [];
                      const processedKeys = new Set();

                      if (policies.timings_morning_start && policies.timings_morning_end) {
                        groupedPolicies.push(['Morning Slot', `${policies.timings_morning_start} to ${policies.timings_morning_end}`]);
                        processedKeys.add('timings_morning_start');
                        processedKeys.add('timings_morning_end');
                      }
                      if (policies.timings_afternoon_start && policies.timings_afternoon_end) {
                        groupedPolicies.push(['Afternoon Slot', `${policies.timings_afternoon_start} to ${policies.timings_afternoon_end}`]);
                        processedKeys.add('timings_afternoon_start');
                        processedKeys.add('timings_afternoon_end');
                      }
                      if (policies.timings_evening_start && policies.timings_evening_end) {
                        groupedPolicies.push(['Evening Slot', `${policies.timings_evening_start} to ${policies.timings_evening_end}`]);
                        processedKeys.add('timings_evening_start');
                        processedKeys.add('timings_evening_end');
                      }

                      Object.entries(policies).forEach(([key, val]) => {
                        if (!processedKeys.has(key)) {
                          groupedPolicies.push([key, val]);
                        }
                      });

                      return groupedPolicies.map(([key, val]) => {
                        if (!val) return null;
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const displayVal = formatVenuePolicyValue(key, val);
                        if (!displayVal) return null;
                        return (
                          <div key={key} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-charcoal-muted truncate mr-2">{label}</span>
                            <span className="text-sm font-bold tracking-tight text-charcoal">{displayVal}</span>
                          </div>
                        );
                      });
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Non-Event House Rules Section */}
            {property.category !== 'event_venue' && property.house_rules && !property.house_rules.startsWith('{') && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-4 flex items-center">
                   House Rules
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <p className="text-charcoal-muted font-medium text-sm leading-relaxed whitespace-pre-line bg-white p-6 rounded-2xl border border-gray-100">
                  {property.house_rules}
                </p>
              </div>
            )}

            {/* Check-in / Check-out Time Section */}
            {(property.check_in_time || property.check_out_time) && (
              <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-charcoal mb-4 flex items-center">
                  Check-in &amp; Check-out
                  <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.check_in_time && (
                    <div className="bg-sage/5 border border-sage/20 rounded-2xl p-5 flex items-center gap-4">
                      <div className="bg-sage/15 p-3 rounded-xl text-sage-dark">
                        <span className="text-2xl">🔑</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-sage-dark uppercase tracking-widest mb-0.5">Check-in Time</p>
                        <p className="text-xl font-bold tracking-tight text-charcoal">
                          {(() => {
                            const [h, m] = property.check_in_time.split(':');
                            const hour = parseInt(h);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            return `${hour % 12 || 12}:${m} ${ampm}`;
                          })()}
                        </p>
                        <p className="text-xs text-charcoal-muted font-medium mt-0.5">You may check-in from this time</p>
                      </div>
                    </div>
                  )}
                  {property.check_out_time && (
                    <div className="bg-terracotta/5 border border-terracotta/20 rounded-2xl p-5 flex items-center gap-4">
                      <div className="bg-terracotta/15 p-3 rounded-xl text-terracotta">
                        <span className="text-2xl">🚪</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-terracotta uppercase tracking-widest mb-0.5">Check-out Time</p>
                        <p className="text-xl font-bold tracking-tight text-charcoal">
                          {(() => {
                            const [h, m] = property.check_out_time.split(':');
                            const hour = parseInt(h);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            return `${hour % 12 || 12}:${m} ${ampm}`;
                          })()}
                        </p>
                        <p className="text-xs text-charcoal-muted font-medium mt-0.5">Please vacate by this time</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cook & Taxi Services Section */}
            {(property.has_cook || property.has_self_cook || property.has_taxi) && (
              <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-charcoal mb-4 flex items-center">
                   {lang === 'mr' ? 'सेवा आणि स्वयंपाक पर्याय' : lang === 'hi' ? 'सेवाएं और रसोई विकल्प' : 'Services & Kitchen'}
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <div className="space-y-4">
                  {property.has_cook && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-6">
                      <div className="bg-terracotta/10 p-4 rounded-full text-terracotta">
                        <Utensils className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-charcoal mb-1">
                          {lang === 'mr' ? 'स्वयंपाकी उपलब्ध आहे' : lang === 'hi' ? 'रसोइया उपलब्ध है' : 'Cook Available'}
                        </h3>
                        <p className="text-charcoal-muted font-medium text-sm">
                          {lang === 'mr' ? `घरगुती जेवणासाठी स्वयंपाकी सेवा उपलब्ध आहे. दर: ₹${property.cook_price}/दिवस` : 
                           lang === 'hi' ? `घर के बने खाने के लिए रसोइया उपलब्ध है। दर: ₹${property.cook_price}/दिन` : 
                           `Personal cook service available for home-cooked meals. Rate: ₹${property.cook_price}/day`}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.has_self_cook && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-6">
                      <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-600">
                        <ChefHat className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-charcoal mb-1">
                          {lang === 'mr' ? 'स्वतः स्वयंपाक करण्याची परवानगी आहे' : lang === 'hi' ? 'स्वयं खाना पकाने की अनुमति है' : 'Self Cooking Allowed'}
                        </h3>
                        <p className="text-charcoal-muted font-medium text-sm">
                          {lang === 'mr' ? 'अतिथी त्यांच्या स्वतःच्या जेवणासाठी स्वयंपाकघराचा वापर करू शकतात (मोफत/समाविष्ट).' : 
                           lang === 'hi' ? 'अतिथि अपने भोजन के लिए रसोईघर का उपयोग कर सकते हैं (मुफ़्त/शामिल)।' : 
                           'Guests can use the kitchen facility to prepare their own meals (Free/Included).'}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.has_taxi && (
                    <div className="bg-white rounded-3xl p-6 border border-sand-200 shadow-premium flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-6">
                      <div className="bg-amber-500/10 p-4 rounded-full text-amber-600">
                        <Car className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-charcoal mb-1">
                          {lang === 'mr' ? 'टॅक्सी सेवा उपलब्ध' : lang === 'hi' ? 'टैक्सी सेवा उपलब्ध' : 'Taxi Service Available'}
                        </h3>
                        <p className="text-charcoal-muted font-medium text-sm">
                          {lang === 'mr' ? 'या मालमत्तेवर टॅक्सी किंवा वाहतूक सेवा उपलब्ध आहे (शुल्क लागू असू शकते).' : 
                           lang === 'hi' ? 'इस संपत्ति पर टैक्सी या परिवहन सेवा उपलब्ध है (शुल्क लागू हो सकते हैं)।' : 
                           'Taxi or transportation assistance service is available at this property (charges may apply).'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities Section */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-6 flex items-center">
                 {t('essentialAmenities')}
                 <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(property.amenities || []).map((a) => {
                  const Icon = AMENITY_ICONS[a] || CheckCircle2;
                  return (
                    <div
                      key={a}
                      className="flex items-center space-x-4 p-4 bg-white border border-gray-100 rounded-2xl group hover:border-terracotta transition-colors"
                    >
                      <div className="bg-stone p-2.5 rounded-xl group-hover:bg-terracotta/5 transition-colors">
                         <Icon className="w-5 h-5 text-terracotta" />
                      </div>
                      <span className="text-sm font-bold text-charcoal tracking-tight">
                         {AMENITY_LABELS[a] || a.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nearby Famous Places Section */}
            {property.nearby_places && property.nearby_places.length > 0 && (
              <div className="animate-slide-up">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-6 flex items-center">
                   Nearby Attractions
                   <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
                </h2>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-terracotta animate-pulse" />
                    <span className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Famous places near this property</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.nearby_places.map((place, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-3 bg-stone rounded-2xl border border-sand-100 hover:border-terracotta/30 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta font-bold tracking-tight text-xs">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-bold text-charcoal">{place}</span>
                      </div>
                    ))}
                  </div>
                  {property.google_maps_url && (
                    <div className="mt-6 border-t border-sand-100 pt-4 flex justify-end">
                      <a
                        href={property.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-xs font-bold tracking-tight text-terracotta hover:text-charcoal uppercase tracking-widest transition-colors"
                      >
                        <span>View on Google Maps</span>
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interactive Availability Calendar */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-6 flex items-center">
                 {t('availability')}
                 <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
              </h2>
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium" data-testid="availability-calendar">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={goPrev}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stone transition-colors border border-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xl font-bold tracking-tight text-charcoal tracking-tight">
                    {(MONTH_NAMES_LOCALIZED[lang] || MONTH_NAMES_LOCALIZED['en'])[calMonth - 1]} {calYear}
                  </span>
                  <button
                    onClick={goNext}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stone transition-colors border border-gray-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-7 text-center mb-4">
                  {(WEEKDAYS_LOCALIZED[lang] || WEEKDAYS_LOCALIZED['en']).map((d) => (
                    <div key={d} className="text-[10px] font-bold tracking-tight text-charcoal-muted tracking-[0.2em]">{d}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {cells.map((d, idx) => {
                    if (!d) return <div key={idx} className="h-14" />;
                    const iso = toISO(d);
                    const past = iso < todayISO;
                    const blocked = isBlocked(iso);
                    const dateStatus = getCalendarDateStatus(iso);
                    const booked = dateStatus === 'booked';
                    const manuallyBlocked = dateStatus === 'blocked';
                    const isStart = iso === checkIn;
                    const isEnd = iso === checkOut;
                    const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
                    const disabled = past;
                    
                    return (
                      <button
                        key={idx}
                        disabled={disabled}
                        onClick={() => handleDayClick(d)}
                        className={`h-14 rounded-2xl text-sm font-bold tracking-tight transition-all relative overflow-hidden group ${
                          past
                            ? 'text-charcoal-muted/30 bg-stone cursor-not-allowed'
                            : booked
                            ? 'text-red-600 bg-red-50/80 hover:bg-red-50 border border-dashed border-red-200 cursor-pointer'
                            : manuallyBlocked
                            ? 'text-gray-600 bg-gray-100/80 hover:bg-gray-100 border border-dashed border-gray-300 cursor-pointer'
                            : isStart || isEnd
                            ? 'bg-charcoal text-white shadow-elevated scale-105 z-10'
                            : inRange
                            ? 'bg-terracotta/10 text-terracotta'
                            : 'hover:bg-gray-50 text-charcoal'
                        }`}
                      >
                        {d.getDate()}
                        {booked && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500"></div>}
                        {manuallyBlocked && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-500"></div>}
                        {isStart && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold tracking-tight opacity-50">{t('inLabel')}</div>}
                        {isEnd && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase font-bold tracking-tight opacity-50">{t('outLabel')}</div>}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-8 flex flex-wrap gap-6 border-t border-sand-100 pt-6">
                   <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full border border-gray-200"></div>
                      <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">{t('available')}</span>
                   </div>
                   <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400"></div>
                      <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Blocked</span>
                   </div>
                   <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Booked</span>
                   </div>
                   <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-charcoal"></div>
                      <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">{t('selected')}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div>
               <h2 className="text-2xl font-bold tracking-tight text-charcoal mb-8 flex items-center">
                 {t('reviews')}
                 <div className="ml-4 h-[2px] flex-1 bg-sand-200"></div>
               </h2>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="bg-charcoal text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                     <span className="text-5xl font-bold tracking-tight mb-2">{property.rating ? property.rating.toFixed(1) : '0.0'}</span>
                     <div className="flex space-x-1 mb-2">
                        {[1,2,3,4,5].map(n => <Star key={n} className={`w-4 h-4 ${n <= (property.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />)}
                     </div>
                     <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{t('overallRating')}</span>
                  </div>
                  
                  <div className="md:col-span-2 grid grid-cols-2 gap-x-8 gap-y-4">
                     {Object.entries(reviewSummary.sub_avgs || { cleanliness: 4.9, communication: 4.8, value: 4.7, accuracy: 4.8 }).map(([k, v]) => (
                        <div key={k} className="space-y-1">
                           <div className="flex justify-between items-center text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">
                              <span>{t(k)}</span>
                              <span>{Number(v).toFixed(1)}</span>
                           </div>
                           <div className="h-1.5 w-full bg-sand-200 rounded-full overflow-hidden">
                              <div className="h-full bg-terracotta rounded-full" style={{ width: `${(v/5)*100}%` }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Add Review Form */}
               {hasConfirmedBooking && (
                 <ReviewForm user={user} propertyId={id} t={t} setProperty={setProperty} onSuccess={fetchReviews} />
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.length === 0 ? (
                    <div className="col-span-2 py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                       <p className="font-bold tracking-tight text-charcoal-muted uppercase tracking-widest text-sm">{t('noReviews')}</p>
                    </div>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.review_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-premium transition-all group">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center text-white font-bold tracking-tight">
                                  {(r.guest_display_name || 'G')[0]}
                               </div>
                               <div>
                                  <h4 className="font-bold text-charcoal leading-none">{r.guest_display_name || 'Verified Guest'}</h4>
                                  <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">
                                     {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                  </span>
                               </div>
                            </div>
                            <div className="flex">
                               {[1,2,3,4,5].map(n => (
                                  <Star key={n} className={`w-3 h-3 ${n <= r.overall_rating ? 'fill-amber-400 text-amber-400' : 'text-sand-200'}`} />
                               ))}
                            </div>
                         </div>
                         <p className="text-charcoal-muted text-sm font-medium leading-relaxed italic line-clamp-4">
                           "{r.comment || 'An exceptional experience at this wonderful property.'}"
                         </p>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* Sticky Booking Widget */}
          <div className="lg:col-span-1">
            <div className="card-premium sticky top-20 lg:top-28 p-4 md:p-8 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-baseline justify-between mb-8">
                <div>
                  {property.category === 'event_venue' ? (
                    <>
                      <span className="text-3xl font-bold tracking-tight text-charcoal tracking-tight">
                        ₹{property.price_per_night?.toLocaleString('en-IN') || 0}
                      </span>
                      <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest ml-1">
                        / day venue rent
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-tight text-charcoal tracking-tight">
                        ₹{property.price_per_night?.toLocaleString('en-IN') || 0}
                      </span>
                      <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest ml-1">
                        {property.category === 'commercial' 
                          ? (property.pricing_cycle === 'hourly' ? ` / ${t('hour')}` : property.pricing_cycle === 'weekly' ? ` / ${t('week')}` : property.pricing_cycle === 'monthly' ? ` / ${t('month')}` : ` / ${t('day')}`)
                          : ` / ${t('night')}`}
                      </span>
                    </>
                  )}
                </div>
                {property.instant_booking && (
                   <div className="flex items-center space-x-1 text-amber-500">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest">{t('rapidBook')}</span>
                   </div>
                )}
              </div>

              <div className="bg-stone/80 rounded-2xl border border-gray-100 mb-6">
                <div className="grid grid-cols-2 divide-x divide-sand-200">
                  <button 
                    onClick={() => document.getElementById('cal-trigger')?.focus()}
                    className="p-4 text-left hover:bg-white transition-colors group rounded-tl-2xl"
                  >
                    <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1 block group-hover:text-terracotta transition-colors">{t('checkIn')}</label>
                    <input
                      type="date"
                      id="cal-trigger"
                      value={checkIn}
                      min={todayISO}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none cursor-pointer"
                    />
                  </button>
                  <button 
                    onClick={() => document.getElementById('cal-trigger-out')?.focus()}
                    className="p-4 text-left hover:bg-white transition-colors group rounded-tr-2xl"
                  >
                    <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1 block group-hover:text-terracotta transition-colors">{t('checkOut')}</label>
                    <input
                      type="date"
                      id="cal-trigger-out"
                      value={checkOut}
                      min={checkIn || todayISO}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none cursor-pointer"
                    />
                  </button>
                </div>
                <div className="p-4 border-t border-gray-100 flex flex-col hover:bg-white transition-colors group gap-4 rounded-b-2xl">
                  <div className="flex items-center w-full justify-between">
                    <div className="flex items-center w-full">
                      <Users className="w-4 h-4 text-charcoal-muted mr-3" />
                      <div className="w-full">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                            {property.category === 'commercial' ? 'Total Staff' : t('totalGuests')}
                          </label>
                          {property.category !== 'event_venue' && property.category !== 'commercial' && (
                            <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest shrink-0">
                              {t('maxGuests').replace('{count}', maxGuests)}
                            </span>
                          )}
                        </div>
                        {property.category === 'event_venue' ? (
                          <div className="relative w-full">
                            <button
                              onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                              className="w-full text-left text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none cursor-pointer flex justify-between items-center"
                            >
                              <span>
                                {Number(guests) === 100 ? 'Less than 100' :
                                 Number(guests) === 200 ? '100-200' :
                                 Number(guests) === 300 ? '200-300' :
                                 Number(guests) === 400 ? '300-400' :
                                 Number(guests) === 500 ? '400-500' :
                                 Number(guests) === 600 ? 'Greater than 500' :
                                 'Less than 100'}
                              </span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${showGuestDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showGuestDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setShowGuestDropdown(false)}
                                ></div>
                                <div className="absolute top-full left-0 mt-2 w-full min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-premium z-50 overflow-hidden py-1 animate-fade-in">
                                  {[
                                    { v: 100, l: 'Less than 100' },
                                    { v: 200, l: '100-200' },
                                    { v: 300, l: '200-300' },
                                    { v: 400, l: '300-400' },
                                    { v: 500, l: '400-500' },
                                    { v: 600, l: 'Greater than 500' }
                                  ].map(opt => (
                                    <div
                                      key={opt.v}
                                      onClick={() => { setGuests(opt.v); setShowGuestDropdown(false); }}
                                      className={`px-4 py-2.5 text-xs font-bold cursor-pointer hover:bg-stone transition-colors ${Number(guests) === opt.v ? 'text-terracotta bg-terracotta/5' : 'text-charcoal'}`}
                                    >
                                      {opt.l}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ) : property.category === 'commercial' ? (
                          <input
                            type="number"
                            min="1"
                            max={maxGuests}
                            value={guests}
                            onChange={(e) => {
                              const nextGuests = Math.max(1, Math.min(maxGuests, Number(e.target.value) || 1));
                              setGuests(nextGuests);
                            }}
                            className="w-16 text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none"
                          />
                        ) : (
                          <div className="mt-3 space-y-4">
                            {[
                              {
                                key: 'adults',
                                title: 'Adults',
                                subtitle: 'Age 13+',
                                value: adultGuests,
                                minusDisabled: adultGuests <= 1,
                                plusDisabled: !canAddChargeableGuest,
                                onMinus: () => updateAdultGuests(-1),
                                onPlus: () => updateAdultGuests(1),
                              },
                              {
                                key: 'children',
                                title: 'Children',
                                subtitle: 'Ages 2-12',
                                value: childrenGuests,
                                minusDisabled: childrenGuests <= 0,
                                plusDisabled: !canAddChargeableGuest,
                                onMinus: () => updateChildrenGuests(-1),
                                onPlus: () => updateChildrenGuests(1),
                              },
                              {
                                key: 'infants',
                                title: 'Infants',
                                subtitle: 'Under 2',
                                value: infantGuests,
                                minusDisabled: infantGuests <= 0,
                                plusDisabled: infantGuests >= 5,
                                onMinus: () => updateInfantGuests(-1),
                                onPlus: () => updateInfantGuests(1),
                              },
                            ].map((item) => (
                              <div key={item.key} className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold tracking-tight text-charcoal leading-tight">{item.title}</div>
                                  <div className="text-xs font-medium text-charcoal-muted mt-0.5">{item.subtitle}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={item.onMinus}
                                    disabled={item.minusDisabled}
                                    className="w-8 h-8 rounded-full bg-gray-50 text-charcoal-muted flex items-center justify-center transition-colors hover:bg-sand-200 disabled:opacity-40 disabled:hover:bg-gray-50"
                                    aria-label={`Decrease ${item.title}`}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold text-charcoal">{item.value}</span>
                                  <button
                                    type="button"
                                    onClick={item.onPlus}
                                    disabled={item.plusDisabled}
                                    className="w-8 h-8 rounded-full bg-gray-50 text-charcoal flex items-center justify-center transition-colors hover:bg-sand-200 disabled:opacity-40 disabled:hover:bg-gray-50"
                                    aria-label={`Increase ${item.title}`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {property.category === 'commercial' && (
                      <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest shrink-0 ml-4">
                        {`MAX ${maxGuests} STAFF`}
                      </span>
                    )}
                  </div>

                  {(property.category === 'event_venue' || (property.category === 'residential' && property.has_cook)) && (Number(property.veg_price) > 0 || Number(property.non_veg_price) > 0) && (
                    <div className="w-full mt-2 pt-3 border-t border-sand-100 flex flex-col space-y-3">
                      <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">Food Preference (Catering / Cook)</label>
                      <div className="flex flex-col space-y-3">
                        {property.veg_price && Number(property.veg_price) > 0 ? (
                          <div 
                          onClick={() => setFoodPreference('veg')}
                          className="flex items-center justify-between cursor-pointer group hover:bg-stone p-2 -mx-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${foodPreference === 'veg' ? 'border-green-500' : 'border-gray-200'}`}>
                              {foodPreference === 'veg' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                            </div>
                            <span className="text-sm font-semibold text-charcoal">Vegetarian</span>
                          </div>
                          <div className="text-right flex items-center space-x-2">
                            <span className="text-lg font-bold tracking-tight text-charcoal relative">
                              ₹{property.veg_price || 0}
                              {/* Strike-through effect line requested in image */}
                              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-charcoal transform -translate-y-1/2 rotate-[-10deg]"></div>
                            </span>
                            <span className="text-xs text-charcoal-light">/Plate</span>
                          </div>
                          </div>
                        ) : null}
                        {property.non_veg_price && Number(property.non_veg_price) > 0 ? (
                          <div 
                          onClick={() => setFoodPreference('non_veg')}
                          className="flex items-center justify-between cursor-pointer group hover:bg-stone p-2 -mx-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${foodPreference === 'non_veg' ? 'border-red-500' : 'border-gray-200'}`}>
                              {foodPreference === 'non_veg' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                            </div>
                            <span className="text-sm font-semibold text-charcoal">Non Vegetarian</span>
                          </div>
                          <div className="text-right flex items-center space-x-2">
                            <span className="text-lg font-bold tracking-tight text-charcoal relative">
                              ₹{property.non_veg_price || 0}
                              {/* Strike-through effect line requested in image */}
                              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-charcoal transform -translate-y-1/2 rotate-[-10deg]"></div>
                            </span>
                            <span className="text-xs text-charcoal-light">/Plate</span>
                          </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {property.category === 'event_venue' && (
                    <div className="w-full mt-2 pt-3 border-t border-sand-100 flex flex-col space-y-3">
                      <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">Select Timing Slot</label>
                      <div className="flex flex-col space-y-2">
                        {availableSlots.map(slot => (
                          <div 
                            key={slot.key}
                            onClick={() => setSelectedSlot(slot.key)}
                            className={`flex items-center justify-between cursor-pointer hover:bg-stone/50 px-3 py-2.5 rounded-xl border-2 transition-all ${selectedSlot === slot.key ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 bg-white'}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedSlot === slot.key ? 'border-terracotta' : 'border-gray-200'}`}>
                                {selectedSlot === slot.key && <div className="w-2 h-2 rounded-full bg-terracotta" />}
                              </div>
                              <span className="text-xs font-bold text-charcoal">{slot.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {bookingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold tracking-tight uppercase tracking-widest rounded-xl p-3 mb-4 animate-shake">
                  {bookingError}
                </div>
              )}

              {nights > 0 && (
                <div className="mt-6 mb-6 space-y-4 animate-fade-in" data-testid="price-breakdown">
                  {property.category === 'event_venue' || (property.category === 'residential' && property.has_cook) ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">
                          ₹{property.price_per_night?.toLocaleString('en-IN')} × {nights} {property.category === 'event_venue' ? (property.pricing_cycle === 'hourly' ? t('hour') : property.pricing_cycle === 'weekly' ? t('week') : property.pricing_cycle === 'monthly' ? t('month') : t('day')) : t('night')} ({property.category === 'event_venue' ? 'Venue' : 'Property Rent'})
                        </span>
                        <span className="text-sm font-bold tracking-tight text-charcoal">₹{((property.price_per_night || 0) * nights).toLocaleString('en-IN')}</span>
                      </div>
                      {property.category === 'residential' && property.has_cook && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">
                            ₹{property.cook_price?.toLocaleString('en-IN')} × {nights} Nights (Cook Fee)
                          </span>
                          <span className="text-sm font-bold tracking-tight text-charcoal">₹{((property.cook_price || 0) * nights).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {foodPreference && (foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price) > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">
                            ₹{(foodPreference === 'non_veg' ? (property.non_veg_price || 0) : (property.veg_price || 0)).toLocaleString('en-IN')} × {
                              property.category === 'event_venue'
                                ? ([100, 200, 300, 400, 500, 600].includes(Number(guests)) ? guests : '100')
                                : guests
                            } Guests × {nights} {property.pricing_cycle === 'hourly' ? t('hour') : property.pricing_cycle === 'weekly' ? t('week') : property.pricing_cycle === 'monthly' ? t('month') : t('day')}{nights !== 1 ? 's' : ''} (Food)
                          </span>
                          <span className="text-sm font-bold tracking-tight text-charcoal">
                            ₹{(
                              (foodPreference === 'non_veg' ? (property.non_veg_price || 0) : (property.veg_price || 0)) * 
                              (property.category === 'event_venue' ? ([100, 200, 300, 400, 500, 600].includes(Number(guests)) ? Number(guests) : 100) : Number(guests) || 1) * nights
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">
                        ₹{property.price_per_night?.toLocaleString('en-IN')} × {nights} {
                          property.category === 'commercial' 
                            ? (property.pricing_cycle === 'hourly' ? t('hour') : property.pricing_cycle === 'weekly' ? t('week') : property.pricing_cycle === 'monthly' ? t('month') : t('day'))
                            : t('night')
                        }
                      </span>
                      <span className="text-sm font-bold tracking-tight text-charcoal">₹{baseAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">{platformFeeLabel} ({platformFeePercent}%)</span>
                    <span className="text-sm font-bold tracking-tight text-charcoal">₹{Math.round(serviceFee).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-charcoal-muted underline decoration-sand-300 underline-offset-4">Taxes & GST ({taxPercent}%)</span>
                    <span className="text-sm font-bold tracking-tight text-charcoal">₹{Math.round(taxes).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t-2 border-sand-100 pt-4 flex justify-between items-center">
                    <span className="text-base font-bold tracking-tight text-charcoal uppercase tracking-tighter">{t('totalAmount')}</span>
                    <span className="text-2xl font-bold tracking-tight text-terracotta" data-testid="total-amount">₹{Math.round(total).toLocaleString('en-IN')}</span>
                  </div>
                  {property.category === 'event_venue' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingPaymentType('advance')}
                        className={`text-left p-3 rounded-2xl border-2 transition-all ${bookingPaymentType === 'advance' ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        <span className="block text-[9px] font-bold tracking-tight uppercase tracking-widest text-charcoal-muted">Pay {advancePercent}% Advance</span>
                        <span className="block text-lg font-bold tracking-tight text-terracotta mt-1">Rs.{advanceAmount.toLocaleString('en-IN')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingPaymentType('full')}
                        className={`text-left p-3 rounded-2xl border-2 transition-all ${bookingPaymentType === 'full' ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        <span className="block text-[9px] font-bold tracking-tight uppercase tracking-widest text-charcoal-muted">Pay Full Amount</span>
                        <span className="block text-lg font-bold tracking-tight text-charcoal mt-1">Rs.{Math.round(total).toLocaleString('en-IN')}</span>
                      </button>
                    </div>
                  )}
                  <div className="bg-stone border border-gray-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Pay Now</span>
                    <span className="text-xl font-bold tracking-tight text-terracotta">Rs.{amountDueNow.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {availableCoupons.length > 0 && (
                    <div className="mt-2 bg-sage/10 p-3 rounded-xl border border-sage/20">
                      <p className="text-xs font-bold text-sage-dark uppercase tracking-widest mb-1 flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        Available Coupons
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableCoupons.map(coupon => (
                          <span key={coupon.coupon_id} className="inline-flex items-center px-2 py-1 bg-white border border-sage/30 rounded-md text-xs font-bold tracking-tight text-charcoal tracking-wide">
                            {coupon.code}
                            <span className="text-terracotta ml-1">
                              ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => handleBookNow(null, bookingPaymentType)}
                disabled={booking || !checkIn || !checkOut || nights === 0}
                className="btn-premium w-full py-4 text-sm shadow-premium disabled:opacity-50 disabled:translate-y-0 transition-all"
              >
                {booking ? (
                   <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('holdingSpot')}</span>
                   </div>
                ) : (
                   canShowBookingAmount
                     ? `${property.instant_booking ? t('reserveNow') : t('requestBooking')} - Rs.${amountDueNow.toLocaleString('en-IN')}`
                     : `${property.instant_booking ? t('reserveNow') : t('requestBooking')}`
                )}
              </button>

              <p className="mt-3 text-[11px] text-charcoal-muted font-semibold leading-relaxed text-center">
                By continuing, you agree to the <LegalLinks className="inline" context="booking" />.
              </p>

              {property.category === 'event_venue' && (
                <button
                  onClick={() => setShowQuotationModal(true)}
                  disabled={!checkIn || !checkOut || nights === 0}
                  className="w-full mt-3 py-3 border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white font-bold tracking-tight text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
                >
                  Get Quotation
                </button>
              )}

              <div className="mt-6 p-4 bg-charcoal/5 rounded-2xl flex items-center space-x-3">
                 <Shield className="w-5 h-5 text-charcoal shrink-0" />
                 <p className="text-[9px] font-bold text-charcoal-muted uppercase leading-relaxed tracking-wider">
                    {t('securedByProtection')}
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Properties */}
        {recommended.length > 0 && (
          <div className="mt-16 pt-16 border-t border-gray-100 animate-slide-up">
            <h2 className="text-3xl font-bold tracking-tight text-charcoal tracking-tight mb-8">
              {isSameCityRecommendation 
                ? t('similarProperties').replace('{city}', property.city)
                : lang === 'mr' ? 'तत्सम जागा' : lang === 'hi' ? 'समान संपत्तियां' : 'Similar Properties'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {recommended.map((prop) => {
                const propImg = prop.images?.length 
                  ? getImageUrl(prop.images[0].split('#')[0]) 
                  : 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=600';
                return (
                  <div 
                    key={prop.property_id} 
                    onClick={() => {
                      navigate(`/property/${prop.property_id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img 
                        src={propImg} 
                        alt={prop.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-bold tracking-tight uppercase tracking-widest text-charcoal shadow-sm">
                        {formatCategoryLabel(prop.category)}
                      </div>
                      {prop.instant_booking && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-white p-1.5 rounded-full shadow-subtle">
                          <Zap className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold tracking-tight text-charcoal text-base tracking-tight leading-snug line-clamp-1 group-hover:text-terracotta transition-colors">
                            {prop.title}
                          </h3>
                        </div>
                        <p className="text-xs font-bold text-charcoal-muted mb-4 flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-terracotta" />
                          {prop.address}, {prop.city}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-sand-100 flex justify-between items-center mt-auto">
                        <div>
                          <span className="text-lg font-bold tracking-tight text-charcoal">₹{prop.price_per_night?.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider ml-1">
                            {prop.category === 'event_venue' ? '/ day' : prop.category === 'commercial' ? '/ day' : '/ night'}
                          </span>
                        </div>
                        {prop.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                            <span className="text-xs font-bold tracking-tight text-charcoal">{prop.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full Photo Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-sand-100 flex justify-between items-center z-10">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowGallery(false)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-sand-200 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold tracking-tight text-charcoal tracking-tight">{t('photoTour')}</h2>
            </div>
            <div className="flex items-center space-x-4">
               <button className="p-3 rounded-full hover:bg-gray-50 transition-colors"><Star className="w-5 h-5" /></button>
               <button onClick={() => setShowGallery(false)} className="p-3 rounded-full hover:bg-gray-50 transition-colors"><X className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-8 py-12">
            {/* Category Filter Pills */}
            <div className="flex space-x-3 mb-16 overflow-x-auto pb-4 scrollbar-hide">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="flex flex-col items-center space-y-3 min-w-[100px] group"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-terracotta transition-all shadow-sm">
                    <img src={getImageUrl(groupedImages[cat][0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest group-hover:text-charcoal">{cat}</span>
                </button>
              ))}
            </div>

            {/* Categorized Sections */}
            {allCategories.map(cat => (
              <div key={cat} id={`cat-${cat}`} className="mb-20 animate-slide-up">
                <div className="flex items-center space-x-4 mb-8">
                   <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta">
                      <Camera className="w-5 h-5" />
                   </div>
                   <h3 className="text-3xl font-bold tracking-tight text-charcoal tracking-tight">{cat}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {groupedImages[cat].map((url, idx) => (
                    <div key={url + idx} className="rounded-3xl overflow-hidden shadow-premium group/img">
                      <img 
                        src={getImageUrl(url)} 
                        alt="" 
                        className="w-full h-[30rem] object-cover transition-transform duration-1000 group-hover/img:scale-105" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showQuotationModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden border border-gray-100 shadow-elevated animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-sand-100 flex justify-between items-center bg-stone/50">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-terracotta" />
                <h3 className="text-xl font-bold tracking-tight text-charcoal tracking-tight">Booking Quotation</h3>
              </div>
              <button 
                onClick={() => setShowQuotationModal(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-sand-200 transition-colors"
              >
                <X className="w-5 h-5 text-charcoal" />
              </button>
            </div>
            
            {/* Content (Printable Area) */}
            <div className="p-8 space-y-6">
              {/* Branding Header */}
              <div className="flex justify-between items-start border-b border-sand-100 pb-6">
                <div>
                  <h4 className="text-xl font-bold tracking-tight text-charcoal tracking-tight">X-SPACE360</h4>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Premium Venue Booking & Hospitality</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-charcoal-muted uppercase tracking-wider">Quotation No: QTN-{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p className="text-xs font-bold text-charcoal-muted uppercase tracking-wider">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              
              {/* Event details */}
              <div className="grid grid-cols-2 gap-6 bg-stone/80 p-5 rounded-2xl border border-sand-100 text-sm">
                <div>
                  <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Venue Details</p>
                  <p className="font-bold tracking-tight text-charcoal">{property.title}</p>
                  <p className="text-xs text-charcoal-muted font-semibold mt-0.5">{property.address}, {property.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Guest Details</p>
                  <p className="font-bold tracking-tight text-charcoal">{user?.full_name || 'Valued Guest'}</p>
                  <p className="text-xs text-charcoal-muted font-semibold mt-0.5">{user?.email || 'N/A'}</p>
                </div>
              </div>

              {/* Slot & Dates */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-stone/50 p-4 rounded-xl border border-sand-100">
                  <p className="text-[8px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Duration</p>
                  <p className="font-bold tracking-tight text-charcoal">{nights} Day{nights > 1 ? 's' : ''}</p>
                </div>
                <div className="bg-stone/50 p-4 rounded-xl border border-sand-100">
                  <p className="text-[8px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Dates</p>
                  <p className="font-bold tracking-tight text-charcoal">{checkIn} to {checkOut}</p>
                </div>
                <div className="bg-stone/50 p-4 rounded-xl border border-sand-100">
                  <p className="text-[8px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Selected Slot</p>
                  <p className="font-bold tracking-tight text-charcoal capitalize">{selectedSlot || 'N/A'}</p>
                </div>
              </div>

              {/* Pricing Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden text-sm">
                <div className="bg-stone px-5 py-3 border-b border-gray-100 grid grid-cols-3 font-bold tracking-tight text-[9px] text-charcoal-muted uppercase tracking-widest">
                  <span className="col-span-2">Item Description</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="divide-y divide-sand-100 px-5 font-semibold text-charcoal">
                  <div className="py-3 grid grid-cols-3">
                    <span className="col-span-2">Venue Rent (₹{property.price_per_night?.toLocaleString('en-IN')} × {nights} days)</span>
                    <span className="text-right font-bold tracking-tight">₹{((property.price_per_night || 0) * nights).toLocaleString('en-IN')}</span>
                  </div>
                  {property.category === 'event_venue' && foodPreference && (foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price) > 0 && (
                    <div className="py-3 grid grid-cols-3">
                      <span className="col-span-2">Catering (₹{(foodPreference === 'non_veg' ? (property.non_veg_price || 0) : (property.veg_price || 0)).toLocaleString('en-IN')} × {guests} Guests × {nights} days - {foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'})</span>
                      <span className="text-right font-bold tracking-tight">₹{(
                        (foodPreference === 'non_veg' ? (property.non_veg_price || 0) : (property.veg_price || 0)) * 
                        guests * nights
                      ).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="py-3 grid grid-cols-3">
                    <span className="col-span-2">{platformFeeLabel} ({platformFeePercent}%)</span>
                    <span className="text-right font-bold tracking-tight">₹{Math.round(serviceFee).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="py-3 grid grid-cols-3">
                    <span className="col-span-2">Taxes & GST ({taxPercent}%)</span>
                    <span className="text-right font-bold tracking-tight">₹{Math.round(taxes).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="bg-stone/80 px-5 py-4 border-t border-gray-100 grid grid-cols-3 font-bold tracking-tight">
                  <span className="col-span-2 text-charcoal uppercase tracking-wider text-xs">Total Estimated Cost</span>
                  <span className="text-right text-terracotta text-lg">₹{Math.round(total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="bg-stone/40 p-5 rounded-2xl border border-gray-100 space-y-3">
                <p className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">Select Payment Mode</p>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setQuotationPaymentType('advance')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${quotationPaymentType === 'advance' ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 hover:bg-stone/50 bg-white'}`}
                  >
                    <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Pay {advancePercent}% Advance</span>
                    <span className="text-xl font-bold tracking-tight text-terracotta mt-2">Rs.{advanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div 
                    onClick={() => setQuotationPaymentType('full')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${quotationPaymentType === 'full' ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 hover:bg-stone/50 bg-white'}`}
                  >
                    <span className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Pay Full Amount</span>
                    <span className="text-xl font-bold tracking-tight text-charcoal mt-2">₹{Math.round(total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-8 py-6 border-t border-sand-100 bg-stone/50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleDownloadQuotation}
                className="flex-1 py-4 bg-white border-2 border-charcoal text-charcoal font-bold tracking-tight text-xs uppercase tracking-widest rounded-2xl hover:bg-charcoal hover:text-white transition-all flex items-center justify-center space-x-2"
              >
                <span>Download Quotation</span>
              </button>
              <button 
                onClick={() => {
                  setShowQuotationModal(false);
                  handleBookNowWithQuotation();
                }}
                className="flex-1 py-4 bg-terracotta text-white font-bold tracking-tight text-xs uppercase tracking-widest rounded-2xl hover:bg-terracotta-dark shadow-premium hover:shadow-premium transition-all"
              >
                Confirm & Pay ({quotationPaymentType === 'advance' ? `${advancePercent}% Advance` : 'Full'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-6 py-4 flex items-center justify-between z-50 lg:hidden shadow-lg select-none">
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-black text-charcoal">₹{property.price_per_night?.toLocaleString('en-IN') || 0}</span>
            <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">
              {property.category === 'event_venue' ? '/ day' : `/ ${t('night')}`}
            </span>
          </div>
          {checkIn && checkOut && (
            <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider mt-0.5">
              {new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowMobileBookingDrawer(true)}
          className="btn-premium px-6 py-3 text-xs uppercase tracking-widest font-black shadow-premium rounded-xl"
        >
          {checkIn && checkOut ? 'Reserve' : 'Select Dates'}
        </button>
      </div>

      {/* Mobile Booking Drawer (Bottom Sheet) */}
      {showMobileBookingDrawer && (
        <div className="fixed inset-0 z-[1001] lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setShowMobileBookingDrawer(false)}
          ></div>
          
          {/* Sheet Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl border-t border-gray-100 p-6 max-h-[85vh] overflow-y-auto flex flex-col animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6 flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-charcoal">Check details & Reserve</h3>
                <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-0.5">
                  ₹{property.price_per_night?.toLocaleString('en-IN')} / {property.category === 'event_venue' ? 'day' : t('night')}
                </p>
              </div>
              <button
                onClick={() => setShowMobileBookingDrawer(false)}
                className="w-8 h-8 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-6 flex-1">
              
              {/* Date Inputs */}
              <div className="bg-stone/80 rounded-2xl border border-gray-100">
                <div className="grid grid-cols-2 divide-x divide-sand-200">
                  <div className="p-4 text-left">
                    <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1 block">{t('checkIn')}</label>
                    <input
                      type="date"
                      value={checkIn}
                      min={todayISO}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none"
                    />
                  </div>
                  <div className="p-4 text-left">
                    <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1 block">{t('checkOut')}</label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn || todayISO}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full text-xs font-bold tracking-tight text-charcoal bg-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Guest Selector */}
              <div className="p-4 bg-stone/80 rounded-2xl border border-gray-100">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                    {property.category === 'commercial' ? 'Total Staff' : t('totalGuests')}
                  </label>
                  {property.category !== 'event_venue' && property.category !== 'commercial' && (
                    <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest shrink-0">
                      {t('maxGuests').replace('{count}', maxGuests)}
                    </span>
                  )}
                </div>
                
                {property.category === 'event_venue' ? (
                  <div className="relative w-full">
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full p-2 text-xs font-bold tracking-tight text-charcoal bg-white border border-gray-200 rounded-xl outline-none"
                    >
                      <option value={100}>Less than 100</option>
                      <option value={200}>100-200</option>
                      <option value={300}>200-300</option>
                      <option value={400}>300-400</option>
                      <option value={500}>400-500</option>
                      <option value={600}>Greater than 500</option>
                    </select>
                  </div>
                ) : property.category === 'commercial' ? (
                  <input
                    type="number"
                    min="1"
                    max={maxGuests}
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Math.min(maxGuests, Number(e.target.value) || 1)))}
                    className="w-full p-2 text-xs font-bold tracking-tight text-charcoal bg-white border border-gray-200 rounded-xl outline-none"
                  />
                ) : (
                  <div className="space-y-4 mt-2">
                    {[
                      { key: 'adults_m', title: 'Adults', subtitle: 'Age 13+', value: adultGuests, minusDisabled: adultGuests <= 1, plusDisabled: !canAddChargeableGuest, onMinus: () => updateAdultGuests(-1), onPlus: () => updateAdultGuests(1) },
                      { key: 'children_m', title: 'Children', subtitle: 'Ages 2-12', value: childrenGuests, minusDisabled: childrenGuests <= 0, plusDisabled: !canAddChargeableGuest, onMinus: () => updateChildrenGuests(-1), onPlus: () => updateChildrenGuests(1) },
                      { key: 'infants_m', title: 'Infants', subtitle: 'Under 2', value: infantGuests, minusDisabled: infantGuests <= 0, plusDisabled: infantGuests >= 5, onMinus: () => updateInfantGuests(-1), onPlus: () => updateInfantGuests(1) }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between bg-white p-3 rounded-xl">
                        <div>
                          <div className="text-xs font-bold text-charcoal">{item.title}</div>
                          <div className="text-[10px] text-charcoal-muted mt-0.5">{item.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={item.onMinus}
                            disabled={item.minusDisabled}
                            className="w-7 h-7 rounded-full bg-gray-50 text-charcoal-muted flex items-center justify-center hover:bg-sand-200 disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-charcoal w-4 text-center">{item.value}</span>
                          <button
                            type="button"
                            onClick={item.onPlus}
                            disabled={item.plusDisabled}
                            className="w-7 h-7 rounded-full bg-gray-50 text-charcoal flex items-center justify-center hover:bg-sand-200 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Food Preference & Timings */}
              {(property.category === 'event_venue' || (property.category === 'residential' && property.has_cook)) && (Number(property.veg_price) > 0 || Number(property.non_veg_price) > 0) && (
                <div className="p-4 bg-stone/80 rounded-2xl border border-gray-100 space-y-3">
                  <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">Food Preference</label>
                  <div className="flex flex-col space-y-2">
                    {property.veg_price && Number(property.veg_price) > 0 && (
                      <div 
                        onClick={() => setFoodPreference('veg')}
                        className="flex items-center justify-between cursor-pointer p-2 bg-white rounded-xl"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${foodPreference === 'veg' ? 'border-green-500' : 'border-gray-200'}`}>
                            {foodPreference === 'veg' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                          </div>
                          <span className="text-xs font-bold text-charcoal">Vegetarian</span>
                        </div>
                        <span className="text-xs font-bold text-charcoal">₹{property.veg_price}/Plate</span>
                      </div>
                    )}
                    {property.non_veg_price && Number(property.non_veg_price) > 0 && (
                      <div 
                        onClick={() => setFoodPreference('non_veg')}
                        className="flex items-center justify-between cursor-pointer p-2 bg-white rounded-xl"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${foodPreference === 'non_veg' ? 'border-red-500' : 'border-gray-200'}`}>
                            {foodPreference === 'non_veg' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                          </div>
                          <span className="text-xs font-bold text-charcoal">Non Vegetarian</span>
                        </div>
                        <span className="text-xs font-bold text-charcoal">₹{property.non_veg_price}/Plate</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timing Slots */}
              {property.category === 'event_venue' && (
                <div className="p-4 bg-stone/80 rounded-2xl border border-gray-100 space-y-3">
                  <label className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">Select Timing Slot</label>
                  <div className="flex flex-col space-y-2">
                    {availableSlots.map(slot => (
                      <div 
                        key={slot.key}
                        onClick={() => setSelectedSlot(slot.key)}
                        className={`flex items-center justify-between cursor-pointer p-3 rounded-xl border-2 ${selectedSlot === slot.key ? 'border-terracotta bg-terracotta/5' : 'border-gray-100 bg-white'}`}
                      >
                        <span className="text-xs font-bold text-charcoal">{slot.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown inside Drawer */}
              {nights > 0 && (
                <div className="p-4 bg-stone/50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">Rent ({nights} {property.category === 'event_venue' ? 'day' : 'night'}{nights > 1 ? 's' : ''})</span>
                    <span className="font-bold text-charcoal">₹{((property.price_per_night || 0) * nights).toLocaleString('en-IN')}</span>
                  </div>
                  {property.category === 'residential' && property.has_cook && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-charcoal-muted">Cook Fee ({nights} nights)</span>
                      <span className="font-bold text-charcoal">₹{((property.cook_price || 0) * nights).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {foodPreference && (foodPreference === 'non_veg' ? property.non_veg_price : property.veg_price) > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-charcoal-muted">Catering ({guests} Guests)</span>
                      <span className="font-bold text-charcoal">
                        ₹{(
                          (foodPreference === 'non_veg' ? (property.non_veg_price || 0) : (property.veg_price || 0)) * 
                          (property.category === 'event_venue' ? ([100, 200, 300, 400, 500, 600].includes(Number(guests)) ? Number(guests) : 100) : Number(guests) || 1) * nights
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">Service Fee</span>
                    <span className="font-bold text-charcoal">₹{Math.round(serviceFee).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-muted">Taxes & GST</span>
                    <span className="font-bold text-charcoal">₹{Math.round(taxes).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm font-black">
                    <span className="text-charcoal">Total Amount</span>
                    <span className="text-terracotta text-lg">₹{Math.round(total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={() => handleBookNow(null, bookingPaymentType)}
                disabled={booking || !checkIn || !checkOut || nights === 0}
                className="btn-premium w-full py-4 text-xs font-black uppercase tracking-widest shadow-premium"
              >
                {booking ? 'Reserving...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
