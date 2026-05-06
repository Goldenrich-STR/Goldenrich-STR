import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI } from '../services/api';
import {
  Building2,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE = {
  confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  soft_lock: { label: 'Pending payment', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700', Icon: XCircle },
  completed: { label: 'Completed', cls: 'bg-sage/20 text-sage-dark', Icon: CheckCircle2 },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const GuestBookings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingAPI.getGuestBookings();
      setBookings(res.data.bookings || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`Cancel booking ${booking.booking_id}?`)) return;
    setCancelling(booking.booking_id);
    try {
      await bookingAPI.cancelBooking(booking.booking_id);
      await fetchBookings();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const today = todayISO();

  const groups = useMemo(() => {
    const upcoming = [];
    const past = [];
    const cancelled = [];
    bookings.forEach((b) => {
      if (b.booking_status === 'cancelled') {
        cancelled.push(b);
      } else if ((b.check_out_date || '') < today && b.booking_status === 'confirmed') {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });
    return { upcoming, past, cancelled };
  }, [bookings, today]);

  const visible = groups[tab] || [];

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">PropNest</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-charcoal-light hidden sm:inline">Welcome, {user?.full_name}</span>
            <button
              onClick={() => navigate('/guest/browse')}
              className="text-charcoal-light hover:text-terracotta"
              data-testid="browse-link"
            >
              Browse
            </button>
            <button onClick={logout} className="text-terracotta hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-4xl font-extrabold text-charcoal" data-testid="page-title">
              My Bookings
            </h2>
            <p className="text-charcoal-light mt-1">Manage your stays in one place.</p>
          </div>
          <button
            onClick={() => navigate('/guest/browse')}
            className="btn-secondary"
            data-testid="find-stay-btn"
          >
            Find a stay
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sand-200 mb-6" data-testid="tabs">
          {TABS.map((t) => {
            const count = groups[t.key].length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                  active
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-charcoal-light hover:text-charcoal'
                }`}
                data-testid={`tab-${t.key}`}
              >
                {t.label}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  active ? 'bg-terracotta text-white' : 'bg-sand-100 text-charcoal-light'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-start space-x-2" data-testid="bookings-error">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-charcoal-light">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 dashboard-card" data-testid="empty-state">
            <CalendarDays className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
            <p className="text-charcoal-light mb-4">
              {tab === 'upcoming'
                ? 'No upcoming reservations yet.'
                : tab === 'past'
                ? 'You have no past stays yet.'
                : 'No cancelled bookings.'}
            </p>
            <button onClick={() => navigate('/guest/browse')} className="btn-primary">
              Find your next stay
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="bookings-list">
            {visible.map((b, idx) => {
              const statusKey = b.booking_status === 'confirmed' && b.check_out_date < today
                ? 'completed'
                : b.booking_status;
              const badge = STATUS_BADGE[statusKey] || STATUS_BADGE.confirmed;
              const Icon = badge.Icon;
              const property = b.property || {};
              const image = property.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=600';
              const isSoftLock = b.booking_status === 'soft_lock';
              const isUpcoming = b.booking_status === 'confirmed' && b.check_in_date >= today;

              return (
                <div
                  key={`${b.booking_id}-${idx}`}
                  className="dashboard-card flex flex-col sm:flex-row gap-4"
                  data-testid={`booking-${b.booking_id}`}
                >
                  <img
                    src={image}
                    alt={property.title || 'Property'}
                    className="w-full sm:w-48 h-40 object-cover rounded-lg cursor-pointer"
                    onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3
                          className="text-lg font-bold text-charcoal cursor-pointer hover:text-terracotta"
                          onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                          data-testid={`booking-title-${b.booking_id}`}
                        >
                          {property.title || 'Property'}
                        </h3>
                        <span className={`text-xs flex items-center space-x-1 px-2 py-1 rounded-full ${badge.cls}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      {property.city && (
                        <div className="flex items-center text-charcoal-light text-sm mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {property.city}{property.state ? `, ${property.state}` : ''}
                        </div>
                      )}
                      <div className="flex items-center text-charcoal-light text-sm mt-2">
                        <CalendarDays className="w-4 h-4 mr-1" />
                        {b.check_in_date} → {b.check_out_date} · {b.number_of_guests} guest{b.number_of_guests === 1 ? '' : 's'}
                      </div>
                      <div className="text-xs text-charcoal-light mt-1 font-mono">
                        {b.booking_id}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-sand-200">
                      <div>
                        <span className="text-xs text-charcoal-light">Total paid </span>
                        <span className="text-lg font-bold text-terracotta">
                          ₹{Math.round(b.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSoftLock && (
                          <button
                            onClick={() => navigate(`/guest/booking-confirmation?booking_id=${b.booking_id}`)}
                            className="btn-primary text-sm flex items-center space-x-1"
                            data-testid={`pay-now-${b.booking_id}`}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Complete payment</span>
                          </button>
                        )}
                        {isUpcoming && (
                          <button
                            onClick={() => navigate(`/guest/booking-confirmation?booking_id=${b.booking_id}`)}
                            className="btn-secondary text-sm"
                            data-testid={`view-${b.booking_id}`}
                          >
                            View details
                          </button>
                        )}
                        {(isSoftLock || isUpcoming) && (
                          <button
                            onClick={() => handleCancel(b)}
                            disabled={cancelling === b.booking_id}
                            className="text-red-600 text-sm hover:underline disabled:opacity-50"
                            data-testid={`cancel-${b.booking_id}`}
                          >
                            {cancelling === b.booking_id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                        {tab === 'past' && (
                          <button
                            onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                            className="btn-secondary text-sm"
                            data-testid={`book-again-${b.booking_id}`}
                          >
                            Book again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestBookings;
