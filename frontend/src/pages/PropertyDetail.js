import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, calendarAPI, bookingAPI, reviewAPI } from '../services/api';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Star,
  Wifi,
  Wind,
  Car,
  Utensils,
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
  Zap,
  Users,
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
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(d) {
  return d.toISOString().slice(0, 10);
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

const PropertyDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  const [blockedDates, setBlockedDates] = useState([]);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ rating_avg: 0, rating_count: 0, sub_avgs: {} });

  useEffect(() => {
    fetchProperty();
    fetchBlockedDates();
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    try {
      const res = await propertyAPI.getProperty(id);
      setProperty(res.data);
    } catch (e) {
      setError(e.response?.status === 404 ? 'Property not found' : 'Failed to load property');
    } finally {
      setLoading(false);
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
    blockedDates.some((b) => dateInRange(iso, b.start_date, b.end_date));

  const cells = useMemo(() => buildMonthMatrix(calYear, calMonth), [calYear, calMonth]);
  const todayISO = toISO(new Date());

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const baseAmount = (property?.price_per_night || 0) * nights;
  const serviceFee = baseAmount * 0.1;
  const taxes = baseAmount * 0.18;
  const total = baseAmount + serviceFee + taxes;

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

  const handleDayClick = (d) => {
    if (!d) return;
    const iso = toISO(d);
    if (iso < todayISO) return;
    if (isBlocked(iso)) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut('');
    } else if (iso <= checkIn) {
      setCheckIn(iso);
    } else {
      // Verify no blocked dates in between
      let cursor = new Date(checkIn);
      cursor.setDate(cursor.getDate() + 1);
      while (toISO(cursor) <= iso) {
        if (isBlocked(toISO(cursor))) {
          setBookingError('Selected range crosses unavailable dates');
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

  const handleBookNow = async () => {
    if (!user) {
      navigate('/login');
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
      setBookingError(`Minimum stay is ${property?.minimum_stay_days} night(s)`);
      return;
    }

    setBooking(true);
    setBookingError('');
    try {
      const res = await bookingAPI.createBooking({
        property_id: id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        number_of_guests: Number(guests),
      });
      // Soft lock created — show confirmation; payment integration is mocked
      navigate(`/guest/booking-confirmation?booking_id=${res.data.booking_id}`);
    } catch (e) {
      setBookingError(e.response?.data?.detail || 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <p className="text-charcoal-light">Loading property…</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal mb-4">{error || 'Property not found'}</p>
          <button onClick={() => navigate('/guest/browse')} className="btn-primary">
            Back to search
          </button>
        </div>
      </div>
    );
  }

  const images = property.images?.length
    ? property.images
    : ['https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200'];

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <span className="text-xl font-bold text-charcoal">Golden-X-Host</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="text-charcoal-light hover:text-terracotta flex items-center space-x-1"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {user && (
              <button onClick={logout} className="text-terracotta hover:underline">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-charcoal mb-2" data-testid="property-title">
          {property.title}
        </h1>
        <div className="flex items-center text-charcoal-light mb-6 flex-wrap gap-3">
          <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{property.address}, {property.city}, {property.state}</span>
          <span className="flex items-center"><Star className="w-4 h-4 mr-1 text-amber-500" /> 4.8 (preview)</span>
          {property.instant_booking && (
            <span className="flex items-center text-amber-600">
              <Zap className="w-4 h-4 mr-1" /> Instant booking
            </span>
          )}
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-sage/20 text-sage-dark">
            {property.category?.replace('_', ' ')}
          </span>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 rounded-2xl overflow-hidden mb-8" data-testid="gallery">
          <div className="lg:col-span-2 lg:row-span-2 relative">
            <img
              src={images[imgIdx]}
              alt={property.title}
              className="w-full h-72 lg:h-[28rem] object-cover"
              data-testid="gallery-main-image"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 hover:bg-white shadow"
                  data-testid="gallery-prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 hover:bg-white shadow"
                  data-testid="gallery-next"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {images.slice(1, 5).map((src, i) => (
            <button
              key={src + i}
              onClick={() => setImgIdx(i + 1)}
              className="hidden lg:block"
            >
              <img src={src} alt="" className="w-full h-[13.7rem] object-cover hover:opacity-90 transition" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host strip */}
            {property.host && (
              <div className="dashboard-card flex items-center justify-between" data-testid="host-strip">
                <div className="flex items-center space-x-3">
                  <img
                    src={
                      property.host.profile_image ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(property.host.full_name || 'Host')}`
                    }
                    alt={property.host.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-charcoal font-semibold flex items-center gap-2">
                      Hosted by {property.host.full_name}
                      {property.host.kyc_status === 'approved' && (
                        <span className="text-xs flex items-center text-sage-dark">
                          <Shield className="w-3 h-3 mr-0.5" /> KYC verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-charcoal-light">
                      {property.host.city ? `${property.host.city} · ` : ''}
                      Joined {property.host.created_at ? new Date(property.host.created_at).getFullYear() : '—'}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-charcoal-light">
                  <div>{property.bhk_type?.toUpperCase()}</div>
                  <div>{property.area_sqft} sq.ft</div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-charcoal mb-3">About this place</h2>
              <p className="text-charcoal-light whitespace-pre-line" data-testid="property-description">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-bold text-charcoal mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="amenities-grid">
                {(property.amenities || []).map((a) => {
                  const Icon = AMENITY_ICONS[a] || CheckCircle2;
                  return (
                    <div
                      key={a}
                      className="flex items-center space-x-2 p-3 border border-sand-200 rounded-lg"
                      data-testid={`amenity-${a}`}
                    >
                      <Icon className="w-5 h-5 text-sage-dark" />
                      <span className="text-sm text-charcoal capitalize">{a.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* House rules */}
            {property.house_rules && (
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-3">House rules</h2>
                <p className="text-charcoal-light whitespace-pre-line">{property.house_rules}</p>
              </div>
            )}

            {/* Reviews */}
            <div data-testid="reviews-block">
              <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-charcoal flex items-center">
                  <Star className="w-5 h-5 mr-2 fill-terracotta text-terracotta" />
                  {reviewSummary.rating_count > 0
                    ? `${reviewSummary.rating_avg} · ${reviewSummary.rating_count} review${reviewSummary.rating_count === 1 ? '' : 's'}`
                    : 'No reviews yet'}
                </h2>
              </div>

              {reviewSummary.rating_count > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" data-testid="review-sub-avgs">
                  {Object.entries(reviewSummary.sub_avgs || {}).map(([k, v]) =>
                    v == null ? null : (
                      <div key={k} className="flex items-center justify-between text-sm border border-sand-200 rounded-lg px-3 py-2">
                        <span className="text-charcoal-muted capitalize">{k.replace('_', ' ')}</span>
                        <span className="font-bold text-charcoal flex items-center">
                          <Star className="w-3 h-3 mr-1 fill-terracotta text-terracotta" />
                          {Number(v).toFixed(1)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-charcoal-light text-sm" data-testid="reviews-empty">
                  Be the first to leave a review after your stay.
                </p>
              ) : (
                <div className="space-y-3" data-testid="reviews-list">
                  {reviews.map((r) => (
                    <div key={r.review_id} className="dashboard-card" data-testid={`review-${r.review_id}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-bold">
                            {(r.guest_display_name || 'G')[0]}
                          </div>
                          <span className="font-semibold text-charcoal">{r.guest_display_name || 'Guest'}</span>
                          {r.is_verified_stay && (
                            <span
                              className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-sage/15 text-sage-dark"
                              data-testid={`verified-stay-${r.review_id}`}
                              title="The reviewer's booking was confirmed and paid through Golden-X-Host"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verified stay
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-4 h-4 ${n <= r.overall_rating ? 'fill-terracotta text-terracotta' : 'text-charcoal-light'}`}
                            />
                          ))}
                          <span className="ml-2 text-xs text-charcoal-light">
                            {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-charcoal mt-2 whitespace-pre-line">{r.comment}</p>
                      )}
                      {r.photo_url && (
                        <a
                          href={r.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2"
                          data-testid={`review-photo-${r.review_id}`}
                        >
                          <img
                            src={r.photo_url}
                            alt="Review"
                            className="w-32 h-32 object-cover rounded-lg border border-sand-200 hover:opacity-90 transition"
                          />
                        </a>
                      )}
                      {r.host_response && (
                        <div className="mt-3 pl-3 border-l-2 border-sage" data-testid={`host-response-${r.review_id}`}>
                          <p className="text-xs font-semibold text-sage-dark mb-1">Host's response</p>
                          <p className="text-sm text-charcoal-muted whitespace-pre-line">{r.host_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Availability calendar */}
            <div>
              <h2 className="text-xl font-bold text-charcoal mb-3 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Availability
              </h2>
              <div className="dashboard-card" data-testid="availability-calendar">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={goPrev}
                    className="p-2 rounded-lg hover:bg-sand-100"
                    data-testid="cal-prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-charcoal" data-testid="cal-label">
                    {MONTH_NAMES[calMonth - 1]} {calYear}
                  </span>
                  <button
                    onClick={goNext}
                    className="p-2 rounded-lg hover:bg-sand-100"
                    data-testid="cal-next"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-semibold text-charcoal-light mb-1">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, idx) => {
                    if (!d) return <div key={idx} className="h-10" />;
                    const iso = toISO(d);
                    const past = iso < todayISO;
                    const blocked = isBlocked(iso);
                    const isStart = iso === checkIn;
                    const isEnd = iso === checkOut;
                    const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
                    const disabled = past || blocked;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDayClick(d)}
                        className={`h-10 rounded text-sm font-medium transition ${
                          disabled
                            ? 'text-charcoal-light/40 line-through cursor-not-allowed bg-sand-100'
                            : isStart || isEnd
                            ? 'bg-terracotta text-white'
                            : inRange
                            ? 'bg-terracotta/20 text-charcoal'
                            : 'hover:bg-sand-100 text-charcoal'
                        }`}
                        data-testid={`cal-day-${iso}`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-charcoal-light mt-3 flex flex-wrap gap-3">
                  <span><span className="line-through">12</span> Unavailable</span>
                  <span><span className="px-1.5 py-0.5 bg-terracotta text-white rounded">12</span> Selected</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-bold text-charcoal mb-3">Location</h2>
              <p className="text-charcoal-light flex items-center" data-testid="location-text">
                <MapPin className="w-4 h-4 mr-2" />
                {property.address}, {property.city}, {property.state} {property.pin_code}
              </p>
            </div>
          </div>

          {/* Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="dashboard-card sticky top-24" data-testid="booking-card">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <span className="text-3xl font-extrabold text-terracotta" data-testid="price-per-night">
                    ₹{property.price_per_night?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-charcoal-light"> /night</span>
                </div>
                {property.minimum_stay_days > 1 && (
                  <span className="text-xs text-charcoal-light">
                    Min {property.minimum_stay_days} nights
                  </span>
                )}
              </div>

              <div className="border border-sand-200 rounded-lg overflow-hidden mb-4">
                <div className="grid grid-cols-2 divide-x divide-sand-200">
                  <div className="p-3">
                    <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      min={todayISO}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full text-sm font-semibold focus:outline-none bg-transparent"
                      data-testid="booking-checkin-input"
                    />
                  </div>
                  <div className="p-3">
                    <label className="text-[10px] uppercase tracking-wide text-charcoal-light">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn || todayISO}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full text-sm font-semibold focus:outline-none bg-transparent"
                      data-testid="booking-checkout-input"
                    />
                  </div>
                </div>
                <div className="p-3 border-t border-sand-200 flex items-center">
                  <Users className="w-4 h-4 text-charcoal-light mr-2" />
                  <label className="text-[10px] uppercase tracking-wide text-charcoal-light mr-2">Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="flex-1 text-sm font-semibold focus:outline-none bg-transparent"
                    data-testid="booking-guests-input"
                  />
                </div>
              </div>

              {bookingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2 mb-3" data-testid="booking-error">
                  {bookingError}
                </div>
              )}

              <button
                onClick={handleBookNow}
                disabled={booking || !checkIn || !checkOut || nights === 0}
                className="btn-primary w-full disabled:opacity-50"
                data-testid="book-now-btn"
              >
                {booking ? 'Reserving…' : property.instant_booking ? 'Reserve Now' : 'Request to Book'}
              </button>

              {nights > 0 && (
                <div className="mt-4 space-y-2 text-sm" data-testid="price-breakdown">
                  <div className="flex justify-between">
                    <span className="text-charcoal-light underline">
                      ₹{property.price_per_night?.toLocaleString('en-IN')} × {nights} nights
                    </span>
                    <span className="text-charcoal">₹{baseAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light underline">Service fee (10%)</span>
                    <span className="text-charcoal">₹{Math.round(serviceFee).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-light underline">GST (18%)</span>
                    <span className="text-charcoal">₹{Math.round(taxes).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-sand-200 pt-2 flex justify-between font-bold text-charcoal">
                    <span>Total</span>
                    <span data-testid="total-amount">₹{Math.round(total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-charcoal-light mt-3 text-center">
                You won't be charged yet · 10-min hold on confirm
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
