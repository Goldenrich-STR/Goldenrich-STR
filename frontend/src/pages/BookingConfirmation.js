import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import { CheckCircle2, Building2, Clock, AlertCircle } from 'lucide-react';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!bookingId) {
      setError('No booking specified');
      setLoading(false);
      return;
    }
    fetchBooking();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await bookingAPI.getBookingDetails(bookingId);
      setBooking(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const lockExpiresAt = booking?.soft_lock_expires_at
    ? new Date(booking.soft_lock_expires_at).getTime()
    : null;
  const remainingMs = lockExpiresAt ? lockExpiresAt - now : 0;
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
  const remainingSec = Math.max(0, Math.floor((remainingMs / 1000) % 60));
  const isConfirmed = booking?.booking_status === 'confirmed';

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <p className="text-charcoal-light">Loading booking…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-charcoal mb-4">{error || 'Booking not found'}</p>
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
            <span className="text-xl font-bold text-charcoal">PropNest</span>
          </div>
          <button onClick={() => navigate('/guest/browse')} className="text-charcoal-light hover:text-terracotta">
            Browse more
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="dashboard-card text-center mb-6" data-testid="booking-success-card">
          <CheckCircle2 className="w-16 h-16 text-sage-dark mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-charcoal mb-1" data-testid="booking-title">
            {isConfirmed ? 'Booking confirmed!' : 'Reservation held'}
          </h1>
          <p className="text-charcoal-light text-sm">
            Booking ID: <span className="font-mono" data-testid="booking-id">{booking.booking_id}</span>
          </p>
        </div>

        {!isConfirmed && lockExpiresAt && (
          <div className="dashboard-card mb-6 border-l-4 border-terracotta" data-testid="soft-lock-card">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-terracotta flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-bold text-charcoal mb-1">Soft hold active</h2>
                <p className="text-sm text-charcoal-light mb-2">
                  Your dates are locked for{' '}
                  <span className="font-bold text-terracotta" data-testid="lock-countdown">
                    {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
                  </span>{' '}
                  while we redirect you to Razorpay checkout. Complete payment to confirm.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  <strong>Payment integration is in mock mode.</strong> Razorpay live checkout will be wired in the
                  next phase. For now your soft-lock will simply expire after 10 minutes if not paid.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-card space-y-3" data-testid="booking-summary">
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
              <span data-testid="confirmation-total">₹{Math.round(booking.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/guest/browse')}
            className="btn-secondary flex-1"
            data-testid="back-to-search-btn"
          >
            Back to search
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
