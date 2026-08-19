import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, Plus, Trash } from 'lucide-react';
import { propertyAPI } from '../../services/api';

const TABS = [
  { key: 'basics', label: 'Basic Info' },
  { key: 'location', label: 'Location' },
  { key: 'pricing', label: 'Pricing & Status' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'media', label: 'Media & Rules' },
  { key: 'food', label: 'Food & Extra' }
];

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'independent_house', label: 'Independent House' },
  { value: 'co_living', label: 'Co-Living' },
  { value: 'private_office', label: 'Private Office' },
  { value: 'co_working', label: 'Co-Working' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
  { value: 'resort', label: 'Resort' }
];

const CATEGORIES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'event_venue', label: 'Event Venue' }
];

const BHK_TYPES = [
  { value: 'studio', label: 'Studio' },
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
  { value: '5bhk', label: '5 BHK' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'banquet', label: 'Banquet' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
  { value: 'custom', label: 'Custom' },
  { value: 'small_event', label: 'Small Event' },
  { value: 'medium_event', label: 'Medium Event' },
  { value: 'large_event', label: 'Large Event' },
  { value: 'mega_event', label: 'Mega Event' }
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'live', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'blocked', label: 'Blocked' }
];

const POPULAR_AMENITIES = [
  'Wifi', 'AC', 'Parking', 'Kitchen', 'Gym', 'TV', 
  'Washing Machine', 'Heater', 'Elevator', 'Geyser', 'Security', 'Backup Generator'
];

export default function AdminPropertyEditModal({ property, onClose, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
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
    pricing_display_mode: 'per_night',
    minimum_stay_days: 1,
    check_in_time: '12:00',
    check_out_time: '11:00',
    amenities: [],
    images: [],
    video_url: '',
    youtube_short_url: '',
    youtube_long_url: '',
    house_rules: '',
    pet_friendly: false,
    smoking_allowed: false,
    instant_booking: false,
    has_cook: false,
    cook_price: '',
    has_self_cook: false,
    has_taxi: false,
    veg_price: '',
    non_veg_price: '',
    guest_size: '',
    status: 'draft'
  });

  const [newNearbyPlace, setNewNearbyPlace] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    if (property) {
      setForm({
        title: property.title || '',
        description: property.description || '',
        property_type: property.property_type || 'apartment',
        category: property.category || 'residential',
        bhk_type: property.bhk_type || '2bhk',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        pin_code: property.pin_code || '',
        latitude: property.latitude !== null && property.latitude !== undefined ? String(property.latitude) : '',
        longitude: property.longitude !== null && property.longitude !== undefined ? String(property.longitude) : '',
        google_maps_url: property.google_maps_url || '',
        nearby_places: property.nearby_places || [],
        area_sqft: property.area_sqft !== null && property.area_sqft !== undefined ? String(property.area_sqft) : '',
        max_guests: property.max_guests !== null && property.max_guests !== undefined ? property.max_guests : 6,
        price_per_night: property.price_per_night !== null && property.price_per_night !== undefined ? String(property.price_per_night) : '',
        pricing_cycle: property.pricing_cycle || 'day',
        pricing_display_mode: property.pricing_display_mode || 'per_night',
        minimum_stay_days: property.minimum_stay_days || 1,
        check_in_time: property.check_in_time || '12:00',
        check_out_time: property.check_out_time || '11:00',
        amenities: property.amenities || [],
        images: property.images || [],
        video_url: property.video_url || '',
        youtube_short_url: property.youtube_short_url || '',
        youtube_long_url: property.youtube_long_url || '',
        house_rules: property.house_rules || '',
        pet_friendly: !!property.pet_friendly,
        smoking_allowed: !!property.smoking_allowed,
        instant_booking: !!property.instant_booking,
        has_cook: !!property.has_cook,
        cook_price: property.cook_price !== null && property.cook_price !== undefined ? String(property.cook_price) : '',
        has_self_cook: !!property.has_self_cook,
        has_taxi: !!property.has_taxi,
        veg_price: property.veg_price !== null && property.veg_price !== undefined ? String(property.veg_price) : '',
        non_veg_price: property.non_veg_price !== null && property.non_veg_price !== undefined ? String(property.non_veg_price) : '',
        guest_size: property.guest_size !== null && property.guest_size !== undefined ? String(property.guest_size) : '',
        status: property.status || 'draft'
      });
    }
  }, [property]);

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleCheckboxChange = (key, checked) => {
    setForm(prev => ({ ...prev, [key]: checked }));
  };

  const toggleAmenity = (name) => {
    const current = [...form.amenities];
    const index = current.indexOf(name);
    if (index === -1) {
      current.push(name);
    } else {
      current.splice(index, 1);
    }
    handleChange('amenities', current);
  };

  const addCustomAmenity = () => {
    if (newAmenity.trim() && !form.amenities.includes(newAmenity.trim())) {
      handleChange('amenities', [...form.amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const addNearbyPlace = () => {
    if (newNearbyPlace.trim() && !form.nearby_places.includes(newNearbyPlace.trim())) {
      handleChange('nearby_places', [...form.nearby_places, newNearbyPlace.trim()]);
      setNewNearbyPlace('');
    }
  };

  const removeNearbyPlace = (index) => {
    const list = [...form.nearby_places];
    list.splice(index, 1);
    handleChange('nearby_places', list);
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && !form.images.includes(newImageUrl.trim())) {
      handleChange('images', [...form.images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index) => {
    const list = [...form.images];
    list.splice(index, 1);
    handleChange('images', list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        ...form,
        area_sqft: form.area_sqft ? parseInt(form.area_sqft, 10) : null,
        max_guests: form.max_guests ? parseInt(form.max_guests, 10) : 6,
        price_per_night: form.price_per_night ? parseFloat(form.price_per_night) : null,
        minimum_stay_days: form.minimum_stay_days ? parseInt(form.minimum_stay_days, 10) : 1,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        cook_price: form.cook_price ? parseFloat(form.cook_price) : null,
        veg_price: form.veg_price ? parseFloat(form.veg_price) : null,
        non_veg_price: form.non_veg_price ? parseFloat(form.non_veg_price) : null,
        guest_size: form.guest_size ? parseInt(form.guest_size, 10) : null,
      };

      await propertyAPI.updateProperty(property.property_id, payload);
      setSuccessMsg('Property updated successfully.');
      setTimeout(() => {
        onSaveSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update property details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-4xl max-h-[calc(100vh-40px)] overflow-hidden shadow-[0_24px_60px_rgba(15,23,42,0.18)] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6df6]">Admin Property Editor</span>
            <h3 className="text-xl font-black text-slate-900 mt-0.5 max-w-2xl truncate">{form.title || 'Edit Property'}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center justify-center shrink-0 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-100 bg-white shrink-0 overflow-x-auto px-4 gap-2 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition ${
                activeTab === tab.key 
                  ? 'border-slate-950 text-slate-950' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <span className="text-green-600 shrink-0 text-xl font-bold">✓</span>
              <p className="text-sm font-semibold text-green-700">{successMsg}</p>
            </div>
          )}

          {/* TAB 1: BASICS */}
          {activeTab === 'basics' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Property Type</label>
                <select
                  value={form.property_type}
                  onChange={e => handleChange('property_type', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  {PROPERTY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">BHK Type / Unit Size</label>
                <select
                  value={form.bhk_type}
                  onChange={e => handleChange('bhk_type', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  {BHK_TYPES.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Area (sqft)</label>
                  <input
                    type="number"
                    required
                    value={form.area_sqft}
                    onChange={e => handleChange('area_sqft', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Max Guests</label>
                  <input
                    type="number"
                    required
                    value={form.max_guests}
                    onChange={e => handleChange('max_guests', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOCATION */}
          {activeTab === 'location' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">City</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={e => handleChange('city', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">State</label>
                <input
                  type="text"
                  required
                  value={form.state}
                  onChange={e => handleChange('state', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Pin Code</label>
                <input
                  type="text"
                  required
                  value={form.pin_code}
                  onChange={e => handleChange('pin_code', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Google Maps URL</label>
                <input
                  type="url"
                  value={form.google_maps_url}
                  onChange={e => handleChange('google_maps_url', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={e => handleChange('latitude', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={e => handleChange('longitude', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Nearby Places</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newNearbyPlace}
                    onChange={e => setNewNearbyPlace(e.target.value)}
                    placeholder="Add e.g. Airport 5km"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={addNearbyPlace}
                    className="px-4 rounded-xl bg-slate-900 text-white text-sm font-bold transition hover:bg-black"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.nearby_places.map((place, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      {place}
                      <button type="button" onClick={() => removeNearbyPlace(idx)} className="text-slate-400 hover:text-red-600 font-bold">×</button>
                    </span>
                  ))}
                  {form.nearby_places.length === 0 && (
                    <p className="text-xs italic text-slate-400">No nearby places specified.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & STATUS */}
          {activeTab === 'pricing' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Price per Night (₹)</label>
                <input
                  type="number"
                  value={form.price_per_night}
                  onChange={e => handleChange('price_per_night', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Pricing Cycle</label>
                <select
                  value={form.pricing_cycle}
                  onChange={e => handleChange('pricing_cycle', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  <option value="day">Day</option>
                  <option value="hour">Hour</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Pricing Display Mode</label>
                <select
                  value={form.pricing_display_mode}
                  onChange={e => handleChange('pricing_display_mode', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white outline-none focus:border-slate-400"
                >
                  <option value="per_night">Per Night / Per Unit</option>
                  <option value="per_person">Per Person</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Min Stay (days)</label>
                  <input
                    type="number"
                    value={form.minimum_stay_days}
                    onChange={e => handleChange('minimum_stay_days', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Property Status</label>
                  <select
                    value={form.status}
                    onChange={e => handleChange('status', e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/20 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Check-in Time</label>
                <input
                  type="text"
                  placeholder="e.g. 12:00"
                  value={form.check_in_time}
                  onChange={e => handleChange('check_in_time', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Check-out Time</label>
                <input
                  type="text"
                  placeholder="e.g. 11:00"
                  value={form.check_out_time}
                  onChange={e => handleChange('check_out_time', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB 4: AMENITIES */}
          {activeTab === 'amenities' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Select Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {POPULAR_AMENITIES.map(amenity => {
                    const isSelected = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                          isSelected
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <span>{amenity}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Add Custom Amenity</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAmenity}
                    onChange={e => setNewAmenity(e.target.value)}
                    placeholder="Enter custom amenity name"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomAmenity}
                    className="px-4 rounded-xl bg-slate-900 text-white text-sm font-bold transition hover:bg-black"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Currently Selected Amenities</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.amenities.map((amenity, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      {amenity}
                      <button type="button" onClick={() => toggleAmenity(amenity)} className="text-slate-400 hover:text-red-600 font-bold">×</button>
                    </span>
                  ))}
                  {form.amenities.length === 0 && (
                    <p className="text-xs italic text-slate-400">No amenities selected.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEDIA & RULES */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Media URLs */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Add Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="Enter photo link/URL"
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 rounded-xl bg-slate-900 text-white text-sm font-bold transition hover:bg-black"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Photo Preview List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-sm">
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 hover:scale-105 transition"
                          title="Remove Image"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Image #{idx + 1}
                        </span>
                      </div>
                    ))}
                    {form.images.length === 0 && (
                      <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center justify-center text-slate-400">
                        <p className="text-sm font-bold">No images uploaded.</p>
                        <p className="text-xs mt-1">Please add image URLs to display property photos.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Video URL</label>
                  <input
                    type="url"
                    value={form.video_url}
                    onChange={e => handleChange('video_url', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">YouTube Short URL</label>
                  <input
                    type="url"
                    value={form.youtube_short_url}
                    onChange={e => handleChange('youtube_short_url', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Policies */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-black text-slate-900">Policies & Flags</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.pet_friendly}
                      onChange={e => handleCheckboxChange('pet_friendly', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Pet Friendly</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Pets allowed in property</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.smoking_allowed}
                      onChange={e => handleCheckboxChange('smoking_allowed', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Smoking Allowed</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Smoking permitted in area</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.instant_booking}
                      onChange={e => handleCheckboxChange('instant_booking', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Instant Booking</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Auto-approves book requests</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">House Rules Description</label>
                  <textarea
                    rows={3}
                    value={form.house_rules}
                    onChange={e => handleChange('house_rules', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FOOD & EXTRA */}
          {activeTab === 'food' && (
            <div className="space-y-6">
              {/* Event Venue pricing */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-3">Event Venue Packages (Catering)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Veg Meal Price (₹/plate)</label>
                    <input
                      type="number"
                      value={form.veg_price}
                      onChange={e => handleChange('veg_price', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Non-Veg Meal Price (₹/plate)</label>
                    <input
                      type="number"
                      value={form.non_veg_price}
                      onChange={e => handleChange('non_veg_price', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Event Guest Capacity</label>
                    <input
                      type="number"
                      value={form.guest_size}
                      onChange={e => handleChange('guest_size', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Cook details */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-900 mb-3">Cook, Kitchen & Local Taxi Options</h4>
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.has_cook}
                      onChange={e => handleCheckboxChange('has_cook', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Has Cook Available</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Cook is on property</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.has_self_cook}
                      onChange={e => handleCheckboxChange('has_self_cook', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Self Cook Allowed</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Guests can use kitchen</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="checkbox"
                      checked={form.has_taxi}
                      onChange={e => handleCheckboxChange('has_taxi', e.target.checked)}
                      className="rounded text-slate-950 focus:ring-slate-950 w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Taxi Assistance</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Taxi booking support</span>
                    </div>
                  </label>
                </div>

                {form.has_cook && (
                  <div className="max-w-xs animate-in slide-in-from-top-2 duration-150">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Cook Price (₹/day)</label>
                    <input
                      type="number"
                      value={form.cook_price}
                      onChange={e => handleChange('cook_price', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold hover:bg-black transition flex items-center gap-2 shadow-[0_12px_24px_rgba(15,23,42,0.14)] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
