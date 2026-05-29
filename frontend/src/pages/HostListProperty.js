import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, subscriptionAPI, uploadAPI, bookingAPI, getImageUrl } from '../services/api';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  CreditCard,
  Sparkles,
  Image as ImageIcon,
  MapPin,
  Sun,
  SunDim,
  Moon,
  Clock,
} from 'lucide-react';

const CATEGORY_DATA = {
  residential: {
    propertyTypes: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'villa', label: 'Villa' },
      { value: 'studio', label: 'Studio' },
      { value: 'independent_house', label: 'Independent House' },
      { value: 'pg', label: 'PG' },
      { value: 'co_living', label: 'Co-living' },
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
      { value: 'banquet_hall', label: 'Banquet Hall' },
      { value: 'rooftop', label: 'Rooftop' },
      { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
      { value: 'garden', label: 'Garden/Lawn' },
      { value: 'party_plot', label: 'Party Plot' },
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
  'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms', 'washer', 'heating', 'workspace',
];

const CATEGORY_AMENITIES = {
  residential: [
    { value: 'wifi', label: 'WiFi' },
    { value: 'ac', label: 'Air Conditioning' },
    { value: 'parking', label: 'Parking Space' },
    { value: 'kitchen', label: 'Fully-Equipped Kitchen' },
    { value: 'pool', label: 'Swimming Pool' },
    { value: 'gym', label: 'Fitness Center/Gym' },
    { value: 'tv', label: 'Smart TV' },
    { value: 'washer', label: 'Washing Machine' },
    { value: 'heating', label: 'Heating System' },
    { value: 'fireplace', label: 'Indoor Fireplace' },
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

const PRICING_CYCLE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'day', label: 'Per day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

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
      className="text-sm font-medium text-charcoal-muted bg-transparent border-none hover:bg-sand-100/50 focus:bg-sand-100/80 focus:ring-0 focus:border-sand-300 rounded px-2 py-1 w-48 transition-colors outline-none"
    />
  );
};

const TimePicker12h = ({ value, onChange }) => {
  let hour = '';
  let minute = '';
  let period = '';

  if (value) {
    const match12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      hour = String(parseInt(match12[1], 10));
      minute = match12[2];
      period = match12[3].toUpperCase();
    } else {
      const match24 = value.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        let h24 = parseInt(match24[1], 10);
        let p = 'AM';
        if (h24 >= 12) {
          p = 'PM';
          if (h24 > 12) h24 -= 12;
        }
        if (h24 === 0) h24 = 12;
        hour = String(h24);
        minute = match24[2];
        period = p;
      }
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  const handleSelectChange = (h, m, p) => {
    if (!h || !m || !p) {
      onChange('');
    } else {
      const paddedHour = h.padStart(2, '0');
      onChange(`${paddedHour}:${m} ${p}`);
    }
  };

  return (
    <div className="inline-flex items-center bg-white border border-sand-300 rounded-xl px-2 py-1.5 shadow-sm hover:border-terracotta/50 focus-within:border-terracotta focus-within:ring-1 focus-within:ring-terracotta/20 transition-all duration-200">
      <Clock className="w-3.5 h-3.5 text-charcoal-light flex-shrink-0 mr-1" />
      <div className="flex items-center space-x-0.5">
        <select
          value={hour}
          onChange={(e) => handleSelectChange(e.target.value, minute || '00', period || 'AM')}
          className="appearance-none bg-none bg-transparent border-none text-xs text-charcoal font-bold p-0 focus:ring-0 cursor-pointer outline-none text-center"
          style={{ 
            backgroundImage: 'none', 
            paddingRight: 0, 
            paddingLeft: 0, 
            appearance: 'none', 
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            width: '32px'
          }}
        >
          <option value="">--</option>
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-charcoal-light font-bold text-xs select-none">:</span>
        <select
          value={minute}
          onChange={(e) => handleSelectChange(hour || '12', e.target.value, period || 'AM')}
          className="appearance-none bg-none bg-transparent border-none text-xs text-charcoal font-bold p-0 focus:ring-0 cursor-pointer outline-none text-center"
          style={{ 
            backgroundImage: 'none', 
            paddingRight: 0, 
            paddingLeft: 0, 
            appearance: 'none', 
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            width: '32px'
          }}
        >
          <option value="">--</option>
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={period}
          onChange={(e) => handleSelectChange(hour || '12', minute || '00', e.target.value)}
          className="appearance-none bg-none bg-transparent border-none text-xs text-charcoal font-black p-0 focus:ring-0 cursor-pointer outline-none text-center ml-0.5"
          style={{ 
            backgroundImage: 'none', 
            paddingRight: 0, 
            paddingLeft: 0, 
            appearance: 'none', 
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            width: '40px'
          }}
        >
          <option value="">--</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

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
  price_per_night: '',
  pricing_cycle: 'day',
  minimum_stay_days: 1,
  amenities: [],
  images: [],
  house_rules: '',
  pet_friendly: false,
  smoking_allowed: false,
  instant_booking: false,
  subscription_plan_id: '',
  veg_price: '',
  non_veg_price: '',
  guest_size: '',
  packages: [
    { type: 'veg', items: { ...DEFAULT_VEG_ITEMS_OBJ } },
    { type: 'non_veg', items: { ...DEFAULT_NON_VEG_ITEMS_OBJ } }
  ],
};

// Helper to format error details (strings, arrays of validation errors, or objects) into a readable string
const formatError = (error, defaultMsg = 'An error occurred') => {
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

const HostListProperty = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const editPropertyId = location.state?.editPropertyId || queryParams.get('edit');

  const [step, setStep] = useState(() => {
    const editId = new URLSearchParams(window.location.search).get('edit') || window.history.state?.usr?.editPropertyId;
    if (editId) {
      const savedStep = localStorage.getItem(`list_property_step_${editId}`);
      return savedStep ? parseInt(savedStep, 10) : 0;
    }
    return 0;
  });

  const [form, setForm] = useState(() => {
    const editId = new URLSearchParams(window.location.search).get('edit') || window.history.state?.usr?.editPropertyId;
    if (editId) {
      const savedForm = localStorage.getItem(`list_property_form_${editId}`);
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
    }
    return initialForm;
  });

  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState(null);
  const [mockPayment, setMockPayment] = useState({ isOpen: false, amount: 0, title: '', onConfirm: null });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (editPropertyId) {
      localStorage.setItem(`list_property_step_${editPropertyId}`, String(step));
    }
  }, [step, editPropertyId]);

  useEffect(() => {
    if (editPropertyId && form !== initialForm) {
      localStorage.setItem(`list_property_form_${editPropertyId}`, JSON.stringify(form));
    }
  }, [form, editPropertyId]);

  useEffect(() => {
    if (editPropertyId) {
      setCreatedPropertyId(editPropertyId);
      propertyAPI.getProperty(editPropertyId)
        .then((res) => {
          const p = res.data;
          if (p.status === 'live') {
            setError('Approved properties cannot be edited.');
            setTimeout(() => {
              navigate('/host/dashboard');
            }, 2000);
            return;
          }
          if (p.subscription_id && p.subscription_status === 'active') {
            setHasActiveSubscription(true);
          }
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
            price_per_night: p.price_per_night !== null && p.price_per_night !== undefined ? String(p.price_per_night) : '',
            pricing_cycle: p.pricing_cycle || 'day',
            minimum_stay_days: p.minimum_stay_days || 1,
            amenities: p.amenities || [],
            images: p.images || [],
            house_rules: p.house_rules || '',
            pet_friendly: !!p.pet_friendly,
            smoking_allowed: !!p.smoking_allowed,
            instant_booking: !!p.instant_booking,
            subscription_plan_id: p.subscription_id || '',
            veg_price: p.veg_price !== null && p.veg_price !== undefined ? String(p.veg_price) : '',
            non_veg_price: p.non_veg_price !== null && p.non_veg_price !== undefined ? String(p.non_veg_price) : '',
            guest_size: p.guest_size !== null && p.guest_size !== undefined ? String(p.guest_size) : '',
            packages: mergePackagesWithDefaults(p.packages || []),
          };
          
          // Only overwrite form with backend data if there was no local form in localStorage
          if (!localStorage.getItem(`list_property_form_${editPropertyId}`)) {
            setForm(backendForm);
          }
        })
        .catch((err) => {
          setError(formatError(err, 'Failed to load draft property details'));
        });
    }
  }, [editPropertyId]);

  useEffect(() => {
    bookingAPI.getPaymentConfig().then((r) => setPaymentConfig(r.data)).catch(() => {});
    subscriptionAPI.getPlans().then((r) => setPlans(r.data.plans || [])).catch(() => {});
    if (refreshUser) refreshUser();
  }, [refreshUser]);

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

    // Extract coordinates from URL
    // Pattern 1: @18.5245649,73.8055681
    let match = processUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) {
      // Pattern 2: q=18.5245649,73.8055681
      match = processUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    }
    if (!match) {
      // Pattern 3: !3d18.5245649!4d73.8055681
      match = processUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    }
    
    if (match) {
      const lat = match[1];
      const lng = match[2];

      let newCity = form.city;
      let newState = form.state;
      let newPin = form.pin_code;
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        if (data && data.address) {
          newCity = data.address.city || data.address.town || data.address.village || data.address.county || newCity;
          newState = data.address.state || newState;
          newPin = data.address.postcode || newPin;
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }

      update({ latitude: lat, longitude: lng, city: newCity, state: newState, pin_code: newPin });
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
    // Suggest plans whose plan_type matches the BHK / Sizing configuration
    const map = { 
      // Residential
      studio: 'studio', 
      '1bhk': '1bhk', 
      '2bhk': '2bhk', 
      '3bhk': '3bhk', 
      '4bhk': '4bhk_plus',
      '5bhk': '4bhk_plus',

      // Commercial
      small: 'commercial',
      medium: 'commercial',
      large: 'commercial',
      extra_large: 'commercial',
      custom: 'commercial',

      // Event venue
      small_event: 'banquet',
      medium_event: 'banquet',
      large_event: 'banquet',
      mega_event: 'banquet'
    };
    const target = map[form.bhk_type];
    if (target) {
      const filtered = plans.filter((p) => p.plan_type === target);
      if (filtered.length) return filtered;
    }
    return plans;
  }, [plans, form.bhk_type]);

  const validateStep = () => {
    setError('');
    const k = STEPS[step].key;
    if (k === 'basics') {
      if (!form.title || form.title.length < 8) return 'Title must be at least 8 characters';
      if (!form.description || form.description.length < 30) return 'Description must be at least 30 characters';
      if (!form.area_sqft || Number(form.area_sqft) < 50) return 'Area must be at least 50 sq.ft';
      if (!form.max_guests || Number(form.max_guests) < 1) return 'Maximum guests must be at least 1';
      if (Number(form.max_guests) > 1000) return 'Maximum guests cannot exceed 1000';
    }
    if (k === 'location') {
      if (!form.address) return 'Address is required';
      if (!form.city) return 'City is required';
      if (!form.state) return 'State is required';
      if (!form.pin_code || !/^\d{6}$/.test(form.pin_code)) return 'Pin code must be 6 digits';
    }
    if (k === 'pricing') {
      if (form.category === 'event_venue') {
        if (!form.veg_price || Number(form.veg_price) < 50) return 'Minimum Veg price is ₹50/plate';
        if (!form.non_veg_price || Number(form.non_veg_price) < 50) return 'Minimum Non-Veg price is ₹50/plate';
        if (!form.price_per_night || Number(form.price_per_night) < 100) return 'Minimum Venue Price is ₹100/day';
      } else {
        const minPrice = form.pricing_cycle === 'hourly' ? 10 : 100;
        const rateUnit = form.pricing_cycle === 'hourly' ? 'hour' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day';
        if (!form.price_per_night || Number(form.price_per_night) < minPrice) {
          return `Minimum price is ₹${minPrice}/${form.category === 'residential' ? 'night' : rateUnit}`;
        }
        if (!form.minimum_stay_days || form.minimum_stay_days < 1) {
          return `Minimum duration must be at least 1 ${form.category === 'residential' ? 'night' : rateUnit}`;
        }
      }
    }
    if (k === 'amenities' && form.amenities.length === 0) {
      return 'Select at least one amenity';
    }
    if (k === 'photos') {
      if (form.images.length < 3) return 'Add at least 3 photos';
      if (form.images.length > 15) return 'Maximum 15 photos allowed';
      
      const pureUrls = form.images.map(img => img.split('#')[0]);
      const hasDuplicates = pureUrls.some((url, idx) => pureUrls.indexOf(url) !== idx);
      
      if (hasDuplicates) {
        window.alert('Removed the duplicate image! Please ensure all photos are unique before proceeding.');
        return 'Duplicate images detected. Please remove them.';
      }
    }
    if (k === 'subscription' && !form.subscription_plan_id && !hasActiveSubscription) {
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
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleAmenity = (a) => {
    update({
      amenities: form.amenities.includes(a)
        ? form.amenities.filter((x) => x !== a)
        : [...form.amenities, a],
    });
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
      update({ images: [...form.images, `${url}#Other`] });
    } catch (err) {
      setError(formatError(err, 'Image upload failed'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = window.prompt('Paste image URL:');
    if (!url) return;
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

    update({ images: [...form.images, `${url}#Other`] });
  };

  const removeImage = (idx) => {
    update({ images: form.images.filter((_, i) => i !== idx) });
  };

  /* Helper to build payload */
  const buildPropertyPayload = () => {
    return {
      title: form.title,
      description: form.description,
      property_type: form.property_type,
      category: form.category,
      bhk_type: form.bhk_type,
      address: form.address,
      city: form.city,
      state: form.state,
      pin_code: form.pin_code,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      google_maps_url: form.google_maps_url || null,
      nearby_places: form.nearby_places || [],
      area_sqft: Number(form.area_sqft),
      max_guests: Number(form.max_guests),
      price_per_night: Number(form.price_per_night),
      pricing_cycle: form.pricing_cycle || 'day',
      minimum_stay_days: Number(form.minimum_stay_days),
      amenities: form.amenities,
      images: form.images,
      house_rules: form.house_rules || null,
      pet_friendly: form.pet_friendly,
      smoking_allowed: form.smoking_allowed,
      instant_booking: form.instant_booking,
      subscription_id: form.subscription_plan_id,
      veg_price: form.veg_price ? Number(form.veg_price) : null,
      non_veg_price: form.non_veg_price ? Number(form.non_veg_price) : null,
      guest_size: form.guest_size ? Number(form.guest_size) : null,
      packages: form.packages || [],
    };
  };

  const canUseRazorpayTestCheckout = () => (
    paymentConfig?.is_mock &&
    paymentConfig?.key_id?.startsWith('rzp_test_') &&
    paymentConfig.key_id !== 'rzp_test_demo_key' &&
    !!window.Razorpay
  );

  const submitListing = async () => {
    setSubmitting(true);
    setError('');
    try {
      // 1. Create or update the property as DRAFT
      let propertyId = createdPropertyId;
      if (!propertyId) {
        const propRes = await propertyAPI.createProperty(buildPropertyPayload());
        propertyId = propRes.data.property_id;
        setCreatedPropertyId(propertyId);
      } else {
        await propertyAPI.updateProperty(propertyId, buildPropertyPayload());
      }

      // 2. Pay the subscription fee (Registration fee skipped)
      if (form.subscription_plan_id && !hasActiveSubscription) {
        setPaying(true);
        const subRes = await subscriptionAPI.subscribe({
          plan_id: form.subscription_plan_id,
          property_id: propertyId
        });
        const subOrder = subRes.data;

        if (paymentConfig?.is_mock) {
          const plan = plans.find(p => p.plan_id === form.subscription_plan_id);
          if (canUseRazorpayTestCheckout()) {
            await new Promise((resolve, reject) => {
              const rzp = new window.Razorpay({
                key: paymentConfig.key_id,
                amount: subOrder.amount,
                currency: subOrder.currency,
                name: 'Golden Rich Stay',
                description: `Subscription: ${subOrder.plan_name || plan?.plan_name || 'Plan'}`,
                prefill: {
                  name: user?.full_name,
                  email: user?.email,
                  contact: user?.phone,
                },
                theme: { color: '#C05C4F' },
                handler: async () => {
                  try {
                    await subscriptionAPI.mockPaySubscription(subOrder.subscription_id, subOrder.razorpay_order_id);
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                },
                modal: { ondismiss: () => reject(new Error('Subscription payment cancelled')) },
              });
              rzp.on('payment.failed', (resp) => {
                reject(new Error(resp?.error?.description || 'Subscription payment failed'));
              });
              rzp.open();
            });
          } else {
            // Show internal mock modal when no Razorpay test key is configured.
            await new Promise((resolve, reject) => {
              setMockPayment({
                isOpen: true,
                amount: plan?.price_monthly || 0,
                title: `${plan?.plan_name || 'Subscription'} Plan`,
                onConfirm: async () => {
                  try {
                    await subscriptionAPI.mockPaySubscription(subOrder.subscription_id, subOrder.razorpay_order_id);
                    setMockPayment(prev => ({ ...prev, isOpen: false }));
                    resolve();
                  } catch (err) {
                    setMockPayment(prev => ({ ...prev, isOpen: false }));
                    reject(err);
                  }
                },
                onCancel: () => {
                  setMockPayment(prev => ({ ...prev, isOpen: false }));
                  reject(new Error('Payment cancelled'));
                }
              });
            });
          }
        } else {
          await new Promise((resolve, reject) => {
            if (!window.Razorpay) return reject(new Error('Razorpay SDK not loaded'));
            const rzp = new window.Razorpay({
              key: subOrder.razorpay_key_id,
              amount: subOrder.amount,
              currency: subOrder.currency,
              name: 'Golden Rich Stay',
              description: `Subscription: ${subOrder.plan_name}`,
              order_id: subOrder.razorpay_order_id,
              prefill: {
                name: user?.full_name,
                email: user?.email,
                contact: user?.phone,
              },
              theme: { color: '#C05C4F' },
              handler: async (resp) => {
                try {
                  await subscriptionAPI.confirmSubscription({
                    subscription_id: subOrder.subscription_id,
                    razorpay_payment_id: resp.razorpay_payment_id,
                    razorpay_order_id: resp.razorpay_order_id,
                    razorpay_signature: resp.razorpay_signature,
                  });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
              modal: { ondismiss: () => reject(new Error('Subscription payment cancelled')) },
            });
            rzp.open();
          });
        }
        setPaying(false);
      }

      // 4. Submit property for verification
      await propertyAPI.submitForVerification(propertyId);
      localStorage.removeItem(`list_property_form_${propertyId}`);
      localStorage.removeItem(`list_property_step_${propertyId}`);
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
      <div className="min-h-screen bg-sand-50">
        <Header user={user} logout={logout} navigate={navigate} />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="dashboard-card" data-testid="listing-success">
            <CheckCircle2 className="w-20 h-20 text-sage-dark mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold text-charcoal mb-2">Listing submitted!</h2>
            <p className="text-charcoal-light mb-2">
              Your property <strong>{form.title}</strong> is now in the verification queue.
            </p>
            <p className="text-charcoal-light text-sm mb-6">
              Our Relationship Manager will visit and review your listing. You'll get a notification
              when it goes live (typically within 48 hours).
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/host/dashboard')}
                className="btn-primary"
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
                }}
                className="btn-secondary"
                data-testid="list-another"
              >
                List another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step].key;

  return (
    <div className="min-h-screen bg-sand-50">
      <Header user={user} logout={logout} navigate={navigate} />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <h1 className="text-3xl font-extrabold text-charcoal mb-1" data-testid="form-title">
          List your property
        </h1>
        <p className="text-charcoal-light text-sm mb-6">
          {step + 1} of {STEPS.length} · {STEPS[step].label}
        </p>

        {/* Progress bar */}
        <div className="flex items-center mb-8 overflow-x-auto" data-testid="step-indicator">
          {STEPS.map((s, idx) => {
            const done = idx < step;
            const active = idx === step;
            return (
              <React.Fragment key={s.key}>
                <div className="flex items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done
                        ? 'bg-sage-dark text-white'
                        : active
                        ? 'bg-terracotta text-white'
                        : 'bg-sand-200 text-charcoal-light'
                    }`}
                    data-testid={`step-${s.key}`}
                  >
                    {done ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`ml-2 text-xs hidden md:inline ${active ? 'text-charcoal font-semibold' : 'text-charcoal-light'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-sage-dark' : 'bg-sand-200'}`} />
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

        <div className="dashboard-card">
          {currentStep === 'basics' && (
            <div className="space-y-4" data-testid="step-basics-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Tell us about your place</h2>
              <Input label="Title" testid="basics-title" value={form.title} onChange={(v) => update({ title: v })} placeholder="Cozy 2BHK with a sunset view" />
              <Textarea label="Description" testid="basics-description" value={form.description} onChange={(v) => update({ description: v })} placeholder="Describe your space, neighbourhood, what makes it special…" rows={5} />
              <div className={`grid grid-cols-1 ${form.category === 'event_venue' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                <Select 
                  label="Category" 
                  testid="basics-category" 
                  value={form.category} 
                  onChange={(v) => {
                    const firstType = CATEGORY_DATA[v].propertyTypes[0].value;
                    const firstBhk = CATEGORY_DATA[v].bhkTypes[0].value;
                    update({ category: v, property_type: firstType, bhk_type: firstBhk });
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
                    label="BHK / Size" 
                    testid="basics-bhk-type" 
                    value={form.bhk_type} 
                    onChange={(v) => update({ bhk_type: v })} 
                    options={CATEGORY_DATA[form.category].bhkTypes} 
                  />
                )}
              </div>
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-terracotta text-white hover:bg-terracotta-dark active:scale-[0.98] rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
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
                <Input label="City" testid="location-city" value={form.city} onChange={(v) => update({ city: v })} />
                <Input label="State" testid="location-state" value={form.state} onChange={(v) => update({ state: v })} />
                <Input label="Pin code" testid="location-pin" value={form.pin_code} onChange={(v) => update({ pin_code: v })} placeholder="403001" />
              </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input 
                      type="number" 
                      label="Veg Price (per plate ₹)" 
                      testid="pricing-veg-price"
                      value={form.veg_price} 
                      onChange={(v) => update({ veg_price: v })} 
                      placeholder="1200" 
                    />
                    <Input 
                      type="number" 
                      label="Non-Veg Price (per plate ₹)" 
                      testid="pricing-nonveg-price"
                      value={form.non_veg_price} 
                      onChange={(v) => update({ non_veg_price: v })} 
                      placeholder="1500" 
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
                  <div className="mt-6">
                    <label className="text-[10px] font-black uppercase tracking-wider text-charcoal-light block mb-3">
                      Package Details (Veg & Non-Veg Inclusions)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Veg Column */}
                      <div className="bg-white rounded-xl border border-sand-300 overflow-hidden shadow-sm">
                        <div className="flex items-center px-4 py-3 bg-green-50 border-b border-green-200">
                          <div className="w-3 h-3 bg-green-500 rounded-sm mr-2 border border-green-700"></div>
                          <span className="font-bold text-green-900 text-sm tracking-wide">Vegetarian</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2 bg-sand-50/50 border-b border-sand-200">
                          <span className="text-xs font-black text-charcoal">Food items</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-charcoal block">Package</span>
                            <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.veg_price || '1200'}/Plate</span>
                          </div>
                        </div>
                        <div className="divide-y divide-sand-100">
                          {vegItemsList.map((item) => (
                            <div key={`veg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-sand-50/30 transition-colors">
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

                      {/* Non-Veg Column */}
                      <div className="bg-white rounded-xl border border-sand-300 overflow-hidden shadow-sm">
                        <div className="flex items-center px-4 py-3 bg-red-50 border-b border-red-200">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2 border border-red-700"></div>
                          <span className="font-bold text-red-900 text-sm tracking-wide">Non Vegetarian</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2 bg-sand-50/50 border-b border-sand-200">
                          <span className="text-xs font-black text-charcoal">Food items</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-charcoal block">Package</span>
                            <span className="text-[10px] font-bold text-charcoal-muted line-through">₹{form.non_veg_price || '1500'}/Plate</span>
                          </div>
                        </div>
                        <div className="divide-y divide-sand-100">
                          {nonVegItemsList.map((item) => (
                            <div key={`nonveg-${item}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-sand-50/30 transition-colors">
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
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`grid grid-cols-1 ${form.category === 'residential' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    <Input 
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
                    />
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
                  <Textarea label="House rules (If Applicable)" testid="pricing-rules" value={form.house_rules} onChange={(v) => update({ house_rules: v })} rows={3} placeholder="Quiet hours after 10 PM, no parties, etc." />
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Toggle label="Instant booking" testid="pricing-instant" checked={form.instant_booking} onChange={(v) => update({ instant_booking: v })} />
                    <Toggle label="Pet-friendly" testid="pricing-pet" checked={form.pet_friendly} onChange={(v) => update({ pet_friendly: v })} />
                    <Toggle label="Smoking allowed" testid="pricing-smoking" checked={form.smoking_allowed} onChange={(v) => update({ smoking_allowed: v })} />
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
                {(CATEGORY_AMENITIES[form.category] || CATEGORY_AMENITIES.residential).map((a) => {
                  const active = form.amenities.includes(a.value);
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => toggleAmenity(a.value)}
                      className={`text-sm px-4 py-2 rounded-full border transition ${
                        active
                          ? 'bg-terracotta text-white border-terracotta'
                          : 'bg-white text-charcoal border-sand-300 hover:border-terracotta'
                      }`}
                      data-testid={`amenity-${a.value}`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>

              {form.category === 'event_venue' && (
                <div className="mt-8 border-t border-sand-200 pt-6">
                  <h2 className="text-xl font-bold text-charcoal mb-6">Venue policies</h2>
                  
                  <div className="space-y-6">
                    {/* Timings */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-sand-200 shadow-sm transition-all hover:shadow-md">
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
                      <div className="bg-white p-4 rounded-2xl border border-sand-200 shadow-sm transition-all hover:shadow-md">
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
                      <div className="bg-white p-4 rounded-2xl border border-sand-200 shadow-sm transition-all hover:shadow-md">
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
                        <label className="text-[10px] font-black uppercase tracking-wider text-charcoal-light block mb-2">Taxes (%)</label>
                        <input type="text" className="w-full bg-white border border-sand-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="18.00" value={getVenuePolicies().taxes || ''} onChange={(e) => handleVenuePolicyChange('taxes', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-charcoal-light block mb-2">Advance Booking (%) (If Applicable)</label>
                        <input type="text" className="w-full bg-white border border-sand-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="20" value={getVenuePolicies().advance || ''} onChange={(e) => handleVenuePolicyChange('advance', e.target.value)} />
                      </div>
                    </div>

                    {/* Lodging & Rooms */}
                    <div>
                      <h3 className="text-sm font-bold text-charcoal mb-3">Lodging & Rooms</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="flex items-center">
                           <Toggle label="Rooms Available" checked={getVenuePolicies().rooms_available || false} onChange={(v) => handleVenuePolicyChange('rooms_available', v)} />
                         </div>
                         <input type="number" className="w-full bg-white border border-sand-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="No. of rooms" value={getVenuePolicies().rooms_count || ''} onChange={(e) => handleVenuePolicyChange('rooms_count', e.target.value)} />
                         <input type="number" className="w-full bg-white border border-sand-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-terracotta transition-all" placeholder="Avg price per room (₹)" value={getVenuePolicies().room_price || ''} onChange={(e) => handleVenuePolicyChange('room_price', e.target.value)} />
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
                         <input type="text" className="w-full bg-white border border-sand-300 rounded-xl px-4 py-3 text-sm mt-4 outline-none focus:border-terracotta transition-all" placeholder="Parking space (e.g. 200 vehicles)" value={getVenuePolicies().parking_space || ''} onChange={(e) => handleVenuePolicyChange('parking_space', e.target.value)} />
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
              <p className="text-sm text-charcoal-light">Upload device photos or paste image URLs. The first photo is your cover.</p>
              <div className="flex gap-2 flex-wrap">
                <label
                  className={`btn-primary cursor-pointer flex items-center space-x-2 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
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
                <button type="button" onClick={handleAddImageUrl} className="btn-secondary flex items-center space-x-2" data-testid="add-url-btn">
                  <ImageIcon className="w-4 h-4" />
                  <span>Paste URL</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6" data-testid="photos-grid">
                {form.images.map((src, idx) => {
                  const [url, category] = src.split('#');
                  return (
                    <div key={src + idx} className="relative group bg-white rounded-2xl border border-sand-200 overflow-hidden shadow-sm transition-all hover:shadow-premium">
                      <div className="relative h-48">
                        <img src={getImageUrl(url)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 text-[10px] bg-terracotta text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                            COVER
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-2 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50"
                          data-testid={`remove-photo-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 bg-sand-50/50">
                        <label className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest mb-1 block">Photo Category</label>
                        <select
                          value={category || 'Other'}
                          onChange={(e) => {
                            const newImages = [...form.images];
                            newImages[idx] = `${url}#${e.target.value}`;
                            update({ images: newImages });
                          }}
                          className="w-full text-xs font-bold text-charcoal bg-white border border-sand-200 rounded-lg p-2 outline-none focus:border-terracotta transition-colors"
                        >
                          {PHOTO_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {form.images.length === 0 && (
                  <div className="col-span-full border-2 border-dashed border-sand-300 rounded-lg p-8 text-center text-charcoal-light">
                    No photos yet
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'subscription' && (
            <div className="space-y-4" data-testid="step-subscription-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Choose your subscription</h2>
              {hasActiveSubscription ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
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
                          onClick={() => update({ subscription_plan_id: p.plan_id })}
                          className={`text-left p-4 rounded-lg border-2 transition ${
                            active ? 'border-terracotta bg-terracotta/5' : 'border-sand-200 hover:border-terracotta/50'
                          }`}
                          data-testid={`plan-${p.plan_id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-charcoal">{p.plan_name}</h3>
                              <p className="text-xs text-charcoal-light mt-0.5">{p.description}</p>
                            </div>
                            {active && <Check className="w-5 h-5 text-terracotta" />}
                          </div>
                          <div className="mt-3">
                            <span className="text-xl font-bold text-terracotta">
                              ₹{p.price_monthly?.toLocaleString('en-IN') || '—'}
                            </span>
                            <span className="text-xs text-charcoal-light"> /month</span>
                            <span className="text-xs text-charcoal-light ml-2">
                              (₹{p.price_annual?.toLocaleString('en-IN') || '—'} annual)
                            </span>
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
              <ReviewBlock label="Location" value={`${form.address}, ${form.city}, ${form.state} ${form.pin_code}`} />
              <ReviewBlock 
                label="Price" 
                value={
                  form.category === 'commercial' || form.category === 'event_venue'
                    ? `₹${form.price_per_night}/${form.pricing_cycle === 'hourly' ? 'hr' : form.pricing_cycle === 'weekly' ? 'week' : form.pricing_cycle === 'monthly' ? 'month' : 'day'} · min ${form.minimum_stay_days} ${form.pricing_cycle === 'hourly' ? 'hour(s)' : form.pricing_cycle === 'weekly' ? 'week(s)' : form.pricing_cycle === 'monthly' ? 'month(s)' : 'day(s)'}`
                    : `₹${form.price_per_night}/night · min ${form.minimum_stay_days} night(s)`
                } 
              />
              <ReviewBlock 
                label="Amenities" 
                value={
                  form.amenities.map(val => {
                    const found = (CATEGORY_AMENITIES[form.category] || CATEGORY_AMENITIES.residential).find(item => item.value === val);
                    return found ? found.label : val;
                  }).join(', ') || '—'
                } 
              />
              <ReviewBlock label="Photos" value={`${form.images.length} uploaded`} />
              <ReviewBlock label="Plan" value={hasActiveSubscription ? 'Active Subscription' : (plans.find((p) => p.plan_id === form.subscription_plan_id)?.plan_name || '—')} />

              <button
                onClick={submitListing}
                disabled={submitting || paying}
                className="btn-primary w-full mt-8 flex items-center justify-center space-x-2 disabled:opacity-50"
                data-testid="submit-listing-btn"
              >
                {submitting || paying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <span>
                  {paying ? 'Processing payment…' :
                   submitting ? 'Submitting…' : 'Submit listing'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={step === 0}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
            data-testid="prev-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={next}
              className="btn-primary flex items-center space-x-2"
              data-testid="next-btn"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mock Payment Modal */}
      {mockPayment.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-10 h-10 text-terracotta" />
              </div>
              <h3 className="text-2xl font-bold text-charcoal mb-2">Demo Payment</h3>
              <p className="text-charcoal-light mb-8">
                This is a simulation for <strong>{mockPayment.title}</strong>.<br/>
                Amount: <span className="text-lg font-semibold text-charcoal">₹{mockPayment.amount}</span>
              </p>
              
              <button
                onClick={mockPayment.onConfirm}
                className="w-full py-4 bg-terracotta text-white rounded-2xl font-bold text-lg hover:bg-terracotta-dark active:scale-[0.98] transition-all shadow-lg shadow-terracotta/20 mb-4"
              >
                Confirm Demo Payment
              </button>
              <button
                onClick={mockPayment.onCancel}
                className="w-full py-3 text-charcoal-light font-semibold hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="bg-sand-50 p-4 text-center border-t border-sand-100">
              <p className="text-sm text-sand-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Secured Mock Transaction
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Header = ({ user, logout, navigate }) => (
  <header className="header-glass px-6 py-4">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Building2 className="w-6 h-6 text-terracotta" />
        <span className="text-xl font-bold text-charcoal">Golden Rich Stay</span>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/host/dashboard')} className="text-charcoal-light hover:text-terracotta">
          Dashboard
        </button>
        <span className="text-charcoal-light hidden sm:inline">{user?.full_name}</span>
        <button onClick={logout} className="text-terracotta hover:underline">Logout</button>
      </div>
    </div>
  </header>
);

const Input = ({ label, testid, type = 'text', value, onChange, placeholder }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-charcoal-light">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border rounded-lg px-3 py-2 mt-1"
      data-testid={testid}
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

const Select = ({ label, testid, value, onChange, options }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-charcoal-light">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 mt-1 bg-white"
      data-testid={testid}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

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
  <div className="flex justify-between border-b border-sand-200 py-2">
    <span className="text-charcoal-light text-sm">{label}</span>
    <span className="text-charcoal text-sm font-semibold text-right max-w-[60%] truncate">{value || '—'}</span>
  </div>
);

export default HostListProperty;
