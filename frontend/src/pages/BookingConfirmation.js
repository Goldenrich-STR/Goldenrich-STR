import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingAPI, propertyAPI, couponAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle2,
  Building2,
  Clock,
  AlertCircle,
  CreditCard,
  Sparkles,
  Loader2,
} from 'lucide-react';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');

  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking specified');
      setLoading(false);
      return;
    }
    loadAll();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadAll = async () => {
    try {
      const [bookingRes, configRes] = await Promise.all([
        bookingAPI.getBookingDetails(bookingId),
        bookingAPI.getPaymentConfig(),
      ]);
      setBooking(bookingRes.data);
      setPaymentConfig(configRes.data);
      // Optionally fetch property for nicer UI
      try {
        const propRes = await propertyAPI.getProperty(bookingRes.data.property_id);
        setProperty(propRes.data);
      } catch (e) {
        // non-fatal
      }
      // Fetch available coupons
      try {
        const couponRes = await couponAPI.getPropertyCoupons(bookingRes.data.property_id);
        setAvailableCoupons(couponRes.data.coupons || []);
      } catch (e) {
        // non-fatal
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  // Defensive parse: backend timestamps without an explicit offset are
  // treated as UTC. This covers older rows persisted before the timezone-aware
  // fix landed (Phase 17), where the server returned naive ISO strings that
  // browsers would otherwise interpret as local time.
  const parseUtc = (value) => {
    if (!value) return null;
    const s = String(value);
    const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
    return new Date(hasOffset ? s : `${s}Z`).getTime();
  };

  const lockExpiresAt = parseUtc(booking?.soft_lock_expires_at);
  const remainingMs = lockExpiresAt ? lockExpiresAt - now : 0;
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
  const remainingSec = Math.max(0, Math.floor((remainingMs / 1000) % 60));
  const isConfirmed = booking?.booking_status === 'confirmed';
  const isExpired = !isConfirmed && remainingMs <= 0 && lockExpiresAt;

  const handleRealRazorpay = () => {
    if (!window.Razorpay) {
      setError('Razorpay SDK failed to load. Please refresh and try again.');
      return;
    }
    setPaying(true);
    setError('');
    const options = {
      key: paymentConfig.key_id,
      amount: Math.round((booking.total_amount || 0) * 100),
      currency: paymentConfig.currency || 'INR',
      name: 'Golden-X-Host',
      description: property?.title || `Booking ${booking.booking_id}`,
      order_id: booking.razorpay_order_id,
      prefill: {
        name: user?.full_name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#C05C4F' },
      handler: async (response) => {
        // Razorpay returns: razorpay_payment_id, razorpay_order_id, razorpay_signature
        try {
          await bookingAPI.confirmPayment({
            booking_id: booking.booking_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          await loadAll();
        } catch (err) {
          setError(err.response?.data?.detail || 'Payment verification failed');
        } finally {
          setPaying(false);
        }
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
    };
    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed. Please try again.');
        setPaying(false);
      });
      rzp.open();
    } catch (e) {
      setError('Could not open payment window');
      setPaying(false);
    }
  };

  const handleApplyCoupon = async (codeToApply) => {
    const finalCode = (codeToApply || couponCode).trim().toUpperCase();
    if (!finalCode) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setApplyingCoupon(true);
    setCouponError('');
    try {
      await bookingAPI.applyCoupon(booking.booking_id, finalCode);
      await loadAll();
      setCouponCode('');
    } catch (e) {
      setCouponError(e.response?.data?.detail || 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleMockPay = async () => {
    setPaying(true);
    setError('');
    try {
      await bookingAPI.mockPay(booking.booking_id);
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.detail || 'Mock payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handlePay = () => {
    if (!paymentConfig) return;
    if (paymentConfig.is_mock) {
      handleMockPay();
    } else {
      handleRealRazorpay();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <p className="text-charcoal-light">Loading booking…</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-charcoal mb-4">{error}</p>
          <button onClick={() => navigate('/guest/browse')} className="btn-primary">
            Back to search
          </button>
        </div>
      </div>
    );
  }  return (
    <div className="min-h-screen bg-sand-50 selection:bg-terracotta selection:text-white">
      <header className="glass px-8 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
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
          <button 
            onClick={() => navigate('/guest/browse')} 
            className="text-xs font-black text-charcoal-muted hover:text-terracotta uppercase tracking-widest transition-colors"
          >
            Browse
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="bg-white rounded-3xl p-10 border border-sand-200 shadow-premium text-center mb-8 animate-slide-up" data-testid="booking-success-card">
          <div className="relative inline-block mb-6">
             <div className={`absolute inset-0 blur-2xl opacity-20 rounded-full ${isConfirmed ? 'bg-sage' : 'bg-terracotta'}`}></div>
             <CheckCircle2
               className={`relative w-20 h-20 mx-auto ${isConfirmed ? 'text-sage-dark' : 'text-terracotta'} animate-float`}
             />
          </div>
          <h1 className="text-3xl font-black text-charcoal tracking-tight mb-2" data-testid="booking-title">
            {isConfirmed
              ? 'Booking Confirmed'
              : isExpired
              ? 'Reservation Expired'
              : 'Reservation Held'}
          </h1>
          <p className="text-charcoal-muted font-bold text-xs uppercase tracking-[0.2em]">
            Booking ID: <span className="text-charcoal font-black" data-testid="booking-id">{booking.booking_id}</span>
          </p>
          {property && (
            <div className="mt-6 inline-flex items-center space-x-3 px-4 py-2 bg-sand-50 rounded-xl border border-sand-200">
               <Building2 className="w-4 h-4 text-terracotta" />
               <span className="text-sm font-black text-charcoal">{property.title}</span>
            </div>
          )}
        </div>

        {!isConfirmed && !isExpired && lockExpiresAt && (
          <div className="bg-white rounded-2xl p-6 border-l-4 border-terracotta shadow-premium mb-8 animate-fade-in" data-testid="soft-lock-card">
            <div className="flex items-center space-x-5">
              <div className="bg-terracotta/10 p-3 rounded-xl animate-pulse">
                 <Clock className="w-6 h-6 text-terracotta flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-charcoal text-sm uppercase tracking-widest mb-1">Temporary Hold Active</h2>
                <p className="text-sm font-medium text-charcoal-muted leading-relaxed">
                  We're holding your dates for{' '}
                  <span className="font-black text-terracotta tabular-nums" data-testid="lock-countdown">
                    {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                  </span>
                  . Please complete payment to finalize your stay.
                </p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-white rounded-2xl p-6 border-l-4 border-red-500 shadow-premium mb-8 animate-fade-in" data-testid="expired-card">
            <div className="flex items-center space-x-5">
              <div className="bg-red-50 p-3 rounded-xl">
                 <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              </div>
              <div>
                <h2 className="font-black text-charcoal text-sm uppercase tracking-widest mb-1">Reservation Expired</h2>
                <p className="text-sm font-medium text-charcoal-muted leading-relaxed">
                  Your soft-hold ran out before payment. Please start a new booking process.
                </p>
              </div>
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-white rounded-2xl p-6 border-l-4 border-sage shadow-premium mb-8 animate-fade-in" data-testid="confirmed-card">
            <div className="flex items-center space-x-5">
              <div className="bg-sage/10 p-3 rounded-xl">
                 <Sparkles className="w-6 h-6 text-sage-dark flex-shrink-0" />
              </div>
              <div>
                <h2 className="font-black text-charcoal text-sm uppercase tracking-widest mb-1">Payment Successful</h2>
                <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mb-1">
                  ID: {booking.razorpay_payment_id}
                </p>
                <p className="text-sm font-medium text-charcoal-muted leading-relaxed">
                  Your host has been notified. Get ready for an exceptional stay!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 border border-sand-200 shadow-premium mb-8 animate-slide-up" style={{ animationDelay: '200ms' }} data-testid="booking-summary">
          <h2 className="text-lg font-black text-charcoal tracking-tight mb-8 flex items-center">
             Itinerary Summary
             <div className="ml-4 h-[1px] flex-1 bg-sand-100"></div>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Check-in</p>
              <p className="text-sm font-black text-charcoal">{booking.check_in_date}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Check-out</p>
              <p className="text-sm font-black text-charcoal">{booking.check_out_date}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Total Guests</p>
              <p className="text-sm font-black text-charcoal">{booking.number_of_guests}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Booking Status</p>
              <p className="text-sm font-black text-terracotta uppercase">{booking.booking_status?.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div className="bg-sand-50/50 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Base Amount</span>
              <span className="text-sm font-black text-charcoal">₹{booking.base_amount?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Service Fee</span>
              <span className="text-sm font-black text-charcoal">₹{Math.round(booking.service_fee || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">Taxes & GST</span>
              <span className="text-sm font-black text-charcoal">₹{Math.round(booking.taxes || 0).toLocaleString('en-IN')}</span>
            </div>
            {booking.coupon_code && (
              <div className="flex justify-between items-center text-emerald-600 font-bold">
                <span className="text-xs uppercase tracking-widest">Coupon Applied ({booking.coupon_code})</span>
                <span className="text-sm font-black">-₹{Math.round(booking.discount_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t-2 border-white pt-4 flex justify-between items-center">
              <span className="text-base font-black text-charcoal tracking-tight uppercase">Total Paid</span>
              <span className="text-2xl font-black text-terracotta" data-testid="confirmation-total">
                ₹{Math.round(booking.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Coupon Code Section */}
        {!isConfirmed && !isExpired && (
          <div className="bg-white rounded-3xl p-8 border border-sand-200 shadow-premium mb-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-lg font-black text-charcoal tracking-tight mb-6 flex items-center">
              Available Coupons
              <div className="ml-4 h-[1px] flex-1 bg-sand-100"></div>
            </h2>
            
            {booking.coupon_code ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-black text-emerald-700">Coupon Applied: {booking.coupon_code}</p>
                <p className="text-xs text-charcoal-muted mt-1">You saved ₹{Math.round(booking.discount_amount || 0).toLocaleString('en-IN')} on this booking!</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableCoupons.length > 0 ? availableCoupons.map((c) => (
                    <div 
                      key={c.code}
                      onClick={() => handleApplyCoupon(c.code)}
                      className="group cursor-pointer bg-sand-50/50 hover:bg-white border-2 border-sand-200 hover:border-terracotta rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="inline-block bg-terracotta/10 text-terracotta text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg mb-3 group-hover:bg-terracotta group-hover:text-white transition-colors">
                          {c.code}
                        </div>
                        <p className="text-base font-black text-charcoal tracking-tight mb-1">
                          {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                        </p>
                        <p className="text-xs text-charcoal-muted leading-relaxed">
                          {c.discount_type === 'percentage' ? `Get ${c.discount_value}% off your total booking amount.` : `Flat ₹${c.discount_value} off on your booking.`}
                        </p>
                      </div>
                      <div className="mt-4 text-[10px] font-black text-terracotta uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center">
                        Apply Coupon →
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-charcoal-muted md:col-span-3 text-center py-4">
                      No active coupons available for this property right now.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-5 py-4 bg-sand-50 border-2 border-sand-200 rounded-2xl text-xs font-black tracking-wider uppercase focus:outline-none focus:border-charcoal transition-colors"
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    disabled={applyingCoupon}
                    className="px-8 py-4 bg-charcoal text-white hover:bg-terracotta rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {applyingCoupon ? 'Applying...' : 'Apply Coupon'}
                  </button>
                </div>
                
                {couponError && (
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Action Section */}
        {!isConfirmed && !isExpired && (
          <div className="bg-charcoal rounded-3xl p-8 shadow-elevated mb-8 animate-slide-up" style={{ animationDelay: '400ms' }} data-testid="payment-section">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl p-3 mb-6 animate-shake">
                {error}
              </div>
            )}

            {paymentConfig?.is_mock ? (
              <div className="space-y-6">
                <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="bg-amber-500/20 p-2 rounded-lg">
                     <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[10px] font-medium text-white/60 leading-relaxed">
                    <strong className="text-white block mb-1">Development Environment:</strong> 
                    Real payment gateway is disabled. Click below to simulate a successful charge using our secure mock protocol.
                  </p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-premium w-full bg-white text-charcoal hover:bg-sand-50 py-5"
                  data-testid="pay-now-btn"
                >
                  {paying ? (
                     <div className="flex items-center justify-center space-x-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-black uppercase tracking-widest">Authorizing...</span>
                     </div>
                  ) : (
                     <div className="flex items-center justify-center space-x-3">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-black uppercase tracking-widest">Execute Demo Payment</span>
                     </div>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-white/40" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Secure Checkout via Razorpay</span>
                   </div>
                   <div className="flex space-x-2">
                      <div className="w-8 h-5 bg-white/10 rounded"></div>
                      <div className="w-8 h-5 bg-white/10 rounded"></div>
                      <div className="w-8 h-5 bg-white/10 rounded"></div>
                   </div>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-premium w-full bg-white text-charcoal hover:bg-sand-50 py-5"
                  data-testid="pay-now-btn"
                >
                  {paying ? (
                     <div className="flex items-center justify-center space-x-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-black uppercase tracking-widest">Connecting...</span>
                     </div>
                  ) : (
                     <div className="flex items-center justify-center space-x-3">
                        <CreditCard className="w-5 h-5" />
                        <span className="font-black uppercase tracking-widest">Pay ₹{Math.round(booking.total_amount || 0).toLocaleString('en-IN')}</span>
                     </div>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <button
            onClick={() => navigate('/guest/browse')}
            className="flex-1 px-6 py-4 rounded-2xl border-2 border-sand-200 text-sm font-black text-charcoal uppercase tracking-widest hover:border-sand-400 transition-all text-center"
            data-testid="back-to-search-btn"
          >
            Back to Search
          </button>
          {isConfirmed && (
            <button
              onClick={() => navigate('/guest/bookings')}
              className="flex-1 px-6 py-4 rounded-2xl bg-charcoal text-white text-sm font-black uppercase tracking-widest hover:bg-terracotta transition-all shadow-premium text-center"
              data-testid="view-bookings-btn"
            >
              My Bookings
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
