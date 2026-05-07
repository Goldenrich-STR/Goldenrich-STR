import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, subscriptionAPI, uploadAPI, bookingAPI } from '../services/api';
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
} from 'lucide-react';

const PROPERTY_TYPES = [
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
  { value: 'studio', label: 'Studio' },
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'banquet', label: 'Banquet' },
];

const COMMON_AMENITIES = [
  'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
  'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
  'coffee', 'printer', 'restrooms', 'washer', 'heating', 'workspace',
];

const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'location', label: 'Location' },
  { key: 'pricing', label: 'Pricing & Rules' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'photos', label: 'Photos' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'review', label: 'Review & Pay' },
];

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
  area_sqft: '',
  price_per_night: '',
  minimum_stay_days: 1,
  amenities: [],
  images: [],
  house_rules: '',
  pet_friendly: false,
  smoking_allowed: false,
  instant_booking: false,
  subscription_plan_id: '',
};

const HostListProperty = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    bookingAPI.getPaymentConfig().then((r) => setPaymentConfig(r.data)).catch(() => {});
    subscriptionAPI.getPlans().then((r) => setPlans(r.data.plans || [])).catch(() => {});
    if (refreshUser) refreshUser();
  }, [refreshUser]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const matchingPlans = useMemo(() => {
    if (!plans.length) return [];
    // Suggest plans whose plan_type matches the BHK
    const map = { studio: 'studio', '1bhk': '1bhk', '2bhk': '2bhk', '3bhk': '3bhk', '4bhk': '4bhk' };
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
    }
    if (k === 'location') {
      if (!form.address) return 'Address is required';
      if (!form.city) return 'City is required';
      if (!form.state) return 'State is required';
      if (!form.pin_code || !/^\d{6}$/.test(form.pin_code)) return 'Pin code must be 6 digits';
    }
    if (k === 'pricing') {
      if (!form.price_per_night || Number(form.price_per_night) < 100) return 'Minimum price is ₹100/night';
      if (!form.minimum_stay_days || form.minimum_stay_days < 1) return 'Minimum stay must be at least 1 night';
    }
    if (k === 'amenities' && form.amenities.length === 0) {
      return 'Select at least one amenity';
    }
    if (k === 'photos' && form.images.length === 0) {
      return 'Add at least 1 photo';
    }
    if (k === 'subscription' && !form.subscription_plan_id) {
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
    setUploadingPhoto(true);
    setError('');
    try {
      const data = await uploadAPI.uploadImage(file);
      update({ images: [...form.images, data.url] });
    } catch (err) {
      setError(err.response?.data?.detail || 'Image upload failed');
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
    update({ images: [...form.images, url] });
  };

  const removeImage = (idx) => {
    update({ images: form.images.filter((_, i) => i !== idx) });
  };

  const buildPropertyPayload = () => ({
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
    area_sqft: Number(form.area_sqft),
    price_per_night: Number(form.price_per_night),
    minimum_stay_days: Number(form.minimum_stay_days),
    amenities: form.amenities,
    images: form.images,
    house_rules: form.house_rules || null,
    pet_friendly: form.pet_friendly,
    smoking_allowed: form.smoking_allowed,
    instant_booking: form.instant_booking,
    subscription_id: form.subscription_plan_id,
  });

  const submitListing = async () => {
    setSubmitting(true);
    setError('');
    try {
      // 1. Create the property as DRAFT
      let propertyId = createdPropertyId;
      if (!propertyId) {
        const propRes = await propertyAPI.createProperty(buildPropertyPayload());
        propertyId = propRes.data.property_id;
        setCreatedPropertyId(propertyId);
      }

      // 2. Pay the registration fee (if not already paid by user)
      if (!user?.registration_fee_paid) {
        setPaying(true);
        let order;
        try {
          const orderRes = await subscriptionAPI.createRegistrationFeeOrder();
          order = orderRes.data;
        } catch (orderErr) {
          // If backend says "already paid", treat as success and skip payment step
          const detail = orderErr.response?.data?.detail || '';
          if (orderErr.response?.status === 400 && /already paid/i.test(detail)) {
            order = null; // skip
          } else {
            throw orderErr;
          }
        }

        if (order) {
          if (order.is_mock) {
            await subscriptionAPI.mockPayRegistrationFee(order.razorpay_order_id);
          } else {
            await new Promise((resolve, reject) => {
              if (!window.Razorpay) return reject(new Error('Razorpay SDK not loaded'));
              const rzp = new window.Razorpay({
                key: order.razorpay_key_id,
                amount: order.amount,
                currency: order.currency,
                name: 'Golden-X-Host',
                description: order.description,
                order_id: order.razorpay_order_id,
                prefill: {
                  name: user?.full_name,
                  email: user?.email,
                  contact: user?.phone,
                },
                theme: { color: '#C05C4F' },
                handler: async (resp) => {
                  try {
                    await subscriptionAPI.confirmRegistrationFee({
                      razorpay_payment_id: resp.razorpay_payment_id,
                      razorpay_order_id: resp.razorpay_order_id,
                      razorpay_signature: resp.razorpay_signature,
                    });
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                },
                modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
              });
              rzp.open();
            });
          }
        }
        setPaying(false);
      }

      // 3. Submit property for verification
      await propertyAPI.submitForVerification(propertyId);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit listing');
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Category" testid="basics-category" value={form.category} onChange={(v) => update({ category: v })} options={[
                  { value: 'residential', label: 'Residential' },
                  { value: 'commercial', label: 'Commercial' },
                  { value: 'event_venue', label: 'Event Venue' },
                ]} />
                <Select label="Property type" testid="basics-property-type" value={form.property_type} onChange={(v) => update({ property_type: v })} options={PROPERTY_TYPES} />
                <Select label="BHK / Size" testid="basics-bhk-type" value={form.bhk_type} onChange={(v) => update({ bhk_type: v })} options={BHK_TYPES} />
              </div>
              <Input type="number" label="Area (sq.ft)" testid="basics-area" value={form.area_sqft} onChange={(v) => update({ area_sqft: v })} placeholder="950" />
            </div>
          )}

          {currentStep === 'location' && (
            <div className="space-y-4" data-testid="step-location-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Where is it?</h2>
              <Input label="Street address" testid="location-address" value={form.address} onChange={(v) => update({ address: v })} placeholder="123 Beach Road" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="City" testid="location-city" value={form.city} onChange={(v) => update({ city: v })} />
                <Input label="State" testid="location-state" value={form.state} onChange={(v) => update({ state: v })} />
                <Input label="Pin code" testid="location-pin" value={form.pin_code} onChange={(v) => update({ pin_code: v })} placeholder="403001" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="number" label="Latitude (optional)" testid="location-lat" value={form.latitude} onChange={(v) => update({ latitude: v })} placeholder="15.5736" />
                <Input type="number" label="Longitude (optional)" testid="location-lng" value={form.longitude} onChange={(v) => update({ longitude: v })} placeholder="73.7407" />
              </div>
              <p className="text-xs text-charcoal-light">
                Lat/lng helps your listing show up in map view. Look up coordinates on Google Maps if you're not sure.
              </p>
            </div>
          )}

          {currentStep === 'pricing' && (
            <div className="space-y-4" data-testid="step-pricing-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Pricing & house rules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input type="number" label="Price per night (₹)" testid="pricing-price" value={form.price_per_night} onChange={(v) => update({ price_per_night: v })} placeholder="3500" />
                <Input type="number" label="Minimum stay (nights)" testid="pricing-min-stay" value={form.minimum_stay_days} onChange={(v) => update({ minimum_stay_days: v })} />
              </div>
              <Textarea label="House rules (optional)" testid="pricing-rules" value={form.house_rules} onChange={(v) => update({ house_rules: v })} rows={3} placeholder="Quiet hours after 10 PM, no parties, etc." />
              <div className="flex flex-wrap gap-4 pt-2">
                <Toggle label="Instant booking" testid="pricing-instant" checked={form.instant_booking} onChange={(v) => update({ instant_booking: v })} />
                <Toggle label="Pet-friendly" testid="pricing-pet" checked={form.pet_friendly} onChange={(v) => update({ pet_friendly: v })} />
                <Toggle label="Smoking allowed" testid="pricing-smoking" checked={form.smoking_allowed} onChange={(v) => update({ smoking_allowed: v })} />
              </div>
            </div>
          )}

          {currentStep === 'amenities' && (
            <div className="space-y-4" data-testid="step-amenities-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">What amenities do you offer?</h2>
              <p className="text-sm text-charcoal-light">Pick all that apply. You can edit this later.</p>
              <div className="flex flex-wrap gap-2" data-testid="amenities-pills">
                {COMMON_AMENITIES.map((a) => {
                  const active = form.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`text-sm px-4 py-2 rounded-full border transition ${
                        active
                          ? 'bg-terracotta text-white border-terracotta'
                          : 'bg-white text-charcoal border-sand-300 hover:border-terracotta'
                      }`}
                      data-testid={`amenity-${a}`}
                    >
                      {a.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4" data-testid="photos-grid">
                {form.images.map((src, idx) => (
                  <div key={src + idx} className="relative group">
                    <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-terracotta text-white px-2 py-0.5 rounded font-bold">
                        COVER
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-white/90 text-red-600 rounded p-1 opacity-0 group-hover:opacity-100 transition"
                      data-testid={`remove-photo-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4" data-testid="step-review-content">
              <h2 className="text-xl font-bold text-charcoal mb-2">Review & pay registration fee</h2>
              <ReviewBlock label="Title" value={form.title} />
              <ReviewBlock label="Type" value={`${form.category} · ${form.property_type} · ${form.bhk_type}`} />
              <ReviewBlock label="Location" value={`${form.address}, ${form.city}, ${form.state} ${form.pin_code}`} />
              <ReviewBlock label="Price" value={`₹${form.price_per_night}/night · min ${form.minimum_stay_days} night(s)`} />
              <ReviewBlock label="Amenities" value={form.amenities.join(', ') || '—'} />
              <ReviewBlock label="Photos" value={`${form.images.length} uploaded`} />
              <ReviewBlock label="Plan" value={plans.find((p) => p.plan_id === form.subscription_plan_id)?.plan_name || '—'} />

              <div className="dashboard-card border-l-4 border-terracotta mt-6" data-testid="fee-card">
                <h3 className="font-bold text-charcoal mb-2 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-terracotta" />
                  One-time registration fee
                </h3>
                <p className="text-sm text-charcoal-light mb-3">
                  ₹500 · refundable if your listing isn't approved within 48 hrs.
                </p>
                {user?.registration_fee_paid && (
                  <p className="text-sm text-sage-dark flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Already paid · only listing submission needed
                  </p>
                )}
                {paymentConfig?.is_mock && !user?.registration_fee_paid && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2 mb-3">
                    <strong>Demo mode:</strong> clicking submit will simulate the ₹500 payment with a mock signature.
                  </div>
                )}
              </div>

              <button
                onClick={submitListing}
                disabled={submitting || paying}
                className="btn-primary w-full mt-4 flex items-center justify-center space-x-2 disabled:opacity-50"
                data-testid="submit-listing-btn"
              >
                {submitting || paying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : user?.registration_fee_paid ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                <span>
                  {paying ? 'Processing payment…' :
                   submitting ? 'Submitting…' :
                   user?.registration_fee_paid ? 'Submit listing' : 'Pay ₹500 & submit'}
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
    </div>
  );
};

const Header = ({ user, logout, navigate }) => (
  <header className="header-glass px-6 py-4">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Building2 className="w-6 h-6 text-terracotta" />
        <span className="text-xl font-bold text-charcoal">Golden-X-Host</span>
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
