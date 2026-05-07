import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingAPI, propertyAPI } from '../services/api';
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
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <span className="text-xl font-bold text-charcoal">Golden-X-Host</span>
          </div>
          <button onClick={() => navigate('/guest/browse')} className="text-charcoal-light hover:text-terracotta">
            Browse more
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="dashboard-card text-center mb-6" data-testid="booking-success-card">
          <CheckCircle2
            className={`w-16 h-16 mx-auto mb-3 ${isConfirmed ? 'text-sage-dark' : 'text-terracotta'}`}
          />
          <h1 className="text-2xl font-extrabold text-charcoal mb-1" data-testid="booking-title">
            {isConfirmed
              ? 'Booking confirmed!'
              : isExpired
              ? 'Reservation expired'
              : 'Reservation held'}
          </h1>
          <p className="text-charcoal-light text-sm">
            Booking ID: <span className="font-mono" data-testid="booking-id">{booking.booking_id}</span>
          </p>
          {property && (
            <p className="text-charcoal mt-2 font-medium">
              {property.title} · {property.city}
            </p>
          )}
        </div>

        {!isConfirmed && !isExpired && lockExpiresAt && (
          <div className="dashboard-card mb-6 border-l-4 border-terracotta" data-testid="soft-lock-card">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-terracotta flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-bold text-charcoal mb-1">Soft hold active</h2>
                <p className="text-sm text-charcoal-light">
                  Your dates are locked for{' '}
                  <span className="font-bold text-terracotta" data-testid="lock-countdown">
                    {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                  </span>
                  . Complete payment below to confirm your booking.
                </p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="dashboard-card mb-6 border-l-4 border-red-500" data-testid="expired-card">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h2 className="font-bold text-charcoal mb-1">Reservation expired</h2>
                <p className="text-sm text-charcoal-light">
                  Your soft-hold ran out before payment. Please start a new booking.
                </p>
              </div>
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className="dashboard-card mb-6 border-l-4 border-sage-dark" data-testid="confirmed-card">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-sage-dark flex-shrink-0" />
              <div>
                <h2 className="font-bold text-charcoal mb-1">Payment received</h2>
                <p className="text-sm text-charcoal-light">
                  Payment ID: <span className="font-mono">{booking.razorpay_payment_id}</span>
                </p>
                <p className="text-sm text-charcoal-light mt-1">
                  We've notified the host. Get ready for your stay!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-card space-y-3 mb-6" data-testid="booking-summary">
          <h2 className="font-bold text-charcoal mb-2">Trip details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-charcoal-light">Check-in</p>
              <p className="font-semibold text-charcoal">{booking.check_in_date}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-light">Check-out</p>
              <p className="font-semibold text-charcoal">{booking.check_out_date}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-light">Guests</p>
              <p className="font-semibold text-charcoal">{booking.number_of_guests}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-light">Status</p>
              <p className="font-semibold text-charcoal capitalize">{booking.booking_status?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="border-t border-sand-200 pt-3 mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal-light">Base amount</span>
              <span>₹{booking.base_amount?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">Service fee</span>
              <span>₹{Math.round(booking.service_fee || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-light">GST</span>
              <span>₹{Math.round(booking.taxes || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-bold text-charcoal pt-2 border-t border-sand-200">
              <span>Total</span>
              <span data-testid="confirmation-total">
                ₹{Math.round(booking.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Action Section */}
        {!isConfirmed && !isExpired && (
          <div className="dashboard-card mb-6" data-testid="payment-section">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-2 mb-3" data-testid="payment-error">
                {error}
              </div>
            )}

            {paymentConfig?.is_mock ? (
              <>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 mb-3">
                  <strong>Demo mode:</strong> Razorpay live keys not configured. Clicking
                  &ldquo;Complete demo payment&rdquo; will simulate a successful charge using a
                  deterministic mock signature.
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                  data-testid="pay-now-btn"
                >
                  {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  <span>{paying ? 'Processing…' : 'Complete demo payment'}</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-charcoal-light mb-3">
                  Pay securely with Razorpay (UPI, cards, net banking, wallets).
                </p>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                  data-testid="pay-now-btn"
                >
                  {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  <span>{paying ? 'Opening Razorpay…' : `Pay ₹${Math.round(booking.total_amount || 0).toLocaleString('en-IN')}`}</span>
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/guest/browse')}
            className="btn-secondary flex-1"
            data-testid="back-to-search-btn"
          >
            Back to search
          </button>
          {isConfirmed && (
            <button
              onClick={() => navigate('/guest/bookings')}
              className="btn-primary flex-1"
              data-testid="view-bookings-btn"
            >
              View my bookings
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
