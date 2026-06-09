import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, reviewAPI, aiCallAPI } from '../services/api';
import ReviewModal from '../components/ReviewModal';
import {
  Building2,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Phone,
  Volume2,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  const latestBookingId = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    let latest = bookings[0];
    for (let i = 1; i < bookings.length; i++) {
      if (new Date(bookings[i].created_at) > new Date(latest.created_at)) {
        latest = bookings[i];
      }
    }
    return latest?.booking_id;
  }, [bookings]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [successNotification, setSuccessNotification] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [aiCalls, setAiCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    fetchBookings();
    fetchMyReviews();
    fetchAiCalls();

    const intervalId = setInterval(() => {
      fetchBookings();
      fetchAiCalls();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchAiCalls = async () => {
    try {
      const res = await aiCallAPI.getMyCalls();
      if (res.data && res.data.calls) {
        setAiCalls(res.data.calls);
      }
    } catch (e) {
      console.error('Failed to fetch AI calls', e);
    }
  };

  // Auto-open the review modal when arriving via the deep-link from a
  // review-request notification (e.g. /guest/bookings?review=BK123…).
  useEffect(() => {
    const reviewId = searchParams.get('review');
    if (!reviewId || bookings.length === 0) return;
    if (reviewedIds.has(reviewId)) {
      // Already reviewed — clear the param so we don't show a stale modal hint.
      const next = new URLSearchParams(searchParams);
      next.delete('review');
      setSearchParams(next, { replace: true });
      return;
    }
    const target = bookings.find((b) => b.booking_id === reviewId);
    if (target) {
      setTab('past');
      setReviewBooking(target);
      const next = new URLSearchParams(searchParams);
      next.delete('review');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, reviewedIds, searchParams]);

  const fetchMyReviews = async () => {
    try {
      const res = await reviewAPI.listMyReviews();
      setReviewedIds(new Set((res.data.reviews || []).map((r) => r.booking_id)));
    } catch (e) {
      // non-blocking — empty set just hides the "Reviewed" tag
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingAPI.getGuestBookings();
      const fetchedBookings = res.data.bookings || [];
      // Sort bookings so that the latest created booking (by created_at) is at the top
      fetchedBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setBookings(fetchedBookings);
      return fetchedBookings;
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load bookings');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (booking) => {
    setCancellingBooking(booking);
  };

  const confirmCancel = async () => {
    if (!cancellingBooking) return;
    const bookingId = cancellingBooking.booking_id;
    setCancellingBooking(null);
    setCancelling(bookingId);
    try {
      await bookingAPI.cancelBooking(bookingId);
      const list = await fetchBookings();
      const cancelledB = list.find(b => b.booking_id === bookingId);
      if (cancelledB && cancelledB.booking_status === 'cancelled') {
        const refundAmt = cancelledB.refund?.refund_amount 
          ? Math.round(cancelledB.refund.refund_amount / 100) 
          : 0;
        setSuccessNotification({
          title: "Refund Received",
          message: `Your booking was cancelled successfully. A refund of ₹${refundAmt.toLocaleString('en-IN')} has been processed successfully.`,
          refundAmount: refundAmt,
          policy: cancelledB.refund?.policy_tier
        });
      }
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
  const itemsPerPage = 5;
  const totalPages = Math.ceil(visible.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visible.slice(start, start + itemsPerPage);
  }, [visible, currentPage]);

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-4 border-b border-sand-200" data-testid="guest-header">
        <div className="max-w-5xl mx-auto flex justify-between items-center w-full gap-2">
          <div 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="brand-logo-full w-8 h-8 md:w-9 md:h-9 object-contain transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-xs font-bold text-charcoal-muted hidden sm:inline">
              Welcome, {user?.full_name?.split(' ')[0]}
            </span>
            <button
              onClick={() => navigate('/guest/browse')}
              className="text-xs font-black text-charcoal-light hover:text-terracotta tracking-widest transition-colors uppercase cursor-pointer"
              data-testid="browse-link"
            >
              Browse
            </button>
            <button 
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }} 
              className="text-xs font-black text-terracotta hover:underline tracking-widest uppercase cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-black text-charcoal tracking-tight" data-testid="page-title">
              My Bookings
            </h2>
            <p className="text-charcoal-muted text-sm font-medium mt-1">Manage your stays in one place.</p>
          </div>
          <button
            onClick={() => navigate('/guest/browse')}
            className="px-6 py-3 rounded-xl border border-sand-300 text-xs font-black text-charcoal uppercase tracking-widest hover:border-sand-500 hover:bg-sand-50 transition-all shadow-sm cursor-pointer"
            data-testid="find-stay-btn"
          >
            Find a stay
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 border-b border-sand-200 mb-8" data-testid="tabs">
          {TABS.map((t) => {
            const count = groups[t.key].length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative pb-4 text-sm font-black uppercase tracking-widest transition-all cursor-pointer ${
                  active
                    ? 'text-charcoal border-b-2 border-charcoal'
                    : 'text-charcoal-muted hover:text-charcoal border-b-2 border-transparent'
                }`}
                data-testid={`tab-${t.key}`}
              >
                <span className="flex items-center gap-2">
                  {t.label}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    active ? 'bg-charcoal text-white' : 'bg-sand-100 text-charcoal-muted'
                  }`}>
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-start space-x-3" data-testid="bookings-error">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-terracotta border-sand-200 mb-4"></div>
            <span className="text-sm font-bold uppercase tracking-wider">Loading bookings…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-sand-200 shadow-sm px-6" data-testid="empty-state">
            <div className="w-16 h-16 bg-sand-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDays className="w-8 h-8 text-charcoal-muted" />
            </div>
            <h3 className="text-lg font-black text-charcoal mb-2 uppercase tracking-wide">No Bookings Found</h3>
            <p className="text-charcoal-muted text-sm font-semibold mb-8 max-w-sm mx-auto">
              {tab === 'upcoming'
                ? "You don't have any upcoming reservations. Time to plan your next getaway!"
                : tab === 'past'
                ? "You haven't completed any stays yet. Explore new destinations!"
                : "You don't have any cancelled bookings."}
            </p>
            <button 
              onClick={() => navigate('/guest/browse')} 
              className="px-6 py-3 bg-charcoal text-white hover:bg-neutral-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-premium cursor-pointer"
            >
              Find your next stay
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6" data-testid="bookings-list">
              {paginatedBookings.map((b, idx) => {
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
                    className="bg-white rounded-3xl border border-sand-200 overflow-hidden shadow-premium hover:shadow-premium-hover hover:scale-[1.01] transition-all duration-300 flex flex-col md:flex-row gap-6 p-6"
                    data-testid={`booking-${b.booking_id}`}
                  >
                    <div className="w-full md:w-56 h-48 md:h-40 rounded-2xl overflow-hidden shadow-sm relative group flex-shrink-0">
                      <img
                        src={image}
                        alt={property.title || 'Property'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                        onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-terracotta block mb-1">
                              {property.city ? `${property.city}` : 'STAY'}{property.state ? `, ${property.state}` : ''}
                            </span>
                            <h3
                              className="text-xl font-extrabold text-charcoal cursor-pointer hover:text-terracotta transition-colors leading-tight"
                              onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                              data-testid={`booking-title-${b.booking_id}`}
                            >
                              {property.title || 'Property'}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 px-3 py-1 border rounded-full ${
                            statusKey === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                            statusKey === 'soft_lock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            statusKey === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-sand-100 text-charcoal-light border-sand-200'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center text-charcoal-muted text-xs font-semibold mt-3.5 gap-1.5 flex-wrap">
                          <CalendarDays className="w-4 h-4 text-terracotta/80" />
                          <span>{b.check_in_date}</span>
                          <span className="text-sand-400 font-bold">→</span>
                          <span>{b.check_out_date}</span>
                          <span className="text-sand-300">|</span>
                          <span>{b.number_of_guests} Guest{b.number_of_guests === 1 ? '' : 's'}</span>
                        </div>
                        
                        <div className="text-[10px] text-charcoal-muted mt-2 font-mono uppercase tracking-widest">
                          Booking ID: {b.booking_id}
                        </div>
                        
                        {b.booking_id === latestBookingId && b.created_at && (
                          <div className="inline-flex items-center bg-terracotta/5 border border-terracotta/20 text-terracotta text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-3 w-fit">
                            <Clock className="w-3.5 h-3.5 mr-1 text-terracotta animate-pulse" />
                            Booked on: {new Date(b.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        )}

                        {(() => {
                          const matchingCall = aiCalls.find(c => c.booking_id === b.booking_id);
                          if (matchingCall) {
                            return (
                              <div className="mt-3">
                                <button
                                  onClick={() => setSelectedCall(matchingCall)}
                                  className="inline-flex items-center text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
                                >
                                  <Phone className="w-3 h-3 mr-1.5 text-emerald-600" /> AI Voice Call Log 📞
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Premium Refund Status Details */}
                        {b.booking_status === 'cancelled' && (
                          <div className="mt-4 bg-sand-50 border border-sand-200/60 rounded-2xl p-4 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-charcoal-muted uppercase tracking-wider text-[10px]">Refund Status</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                b.refund?.status === 'processed' ? 'bg-green-50 text-green-700 border-green-200' :
                                b.refund?.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                b.refund?.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-sand-100 text-charcoal-light border-sand-200'
                              }`}>
                                {b.refund?.status || 'No Refund'}
                              </span>
                            </div>
                            
                            {b.refund ? (
                              <div className="space-y-1 text-charcoal-light font-medium">
                                <div className="flex justify-between">
                                  <span>Policy applied:</span>
                                  <span className="font-semibold text-charcoal capitalize">
                                    {b.refund.policy_tier?.replaceAll('_', ' ')} ({b.refund.refund_percent}%)
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Refund amount:</span>
                                  <span className="font-bold text-charcoal text-sm">
                                    ₹{Math.round(b.refund.refund_amount / 100).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                {b.refund.razorpay_refund_id && (
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span>Refund ID:</span>
                                    <span>{b.refund.razorpay_refund_id}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-charcoal-muted font-medium">
                                {b.payment_status === 'paid' 
                                  ? 'Refund is being evaluated by administration.' 
                                  : 'No payment was made, so no refund is applicable.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-sand-100 my-4"></div>
                      
                      <div className="flex items-center justify-between pt-1 gap-4 flex-wrap">
                        <div>
                          <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest block">Total paid</span>
                          <span className="text-xl font-black text-charcoal">
                            ₹{Math.round(b.total_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {isSoftLock && (
                            <button
                              onClick={() => navigate(`/guest/booking-confirmation?booking_id=${b.booking_id}`)}
                              className="px-5 py-2.5 bg-terracotta hover:bg-terracotta-dark text-white font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center space-x-1.5 shadow-premium cursor-pointer"
                              data-testid={`pay-now-${b.booking_id}`}
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Complete payment</span>
                            </button>
                          )}
                          {isUpcoming && (
                            <button
                              onClick={() => navigate(`/guest/booking-confirmation?booking_id=${b.booking_id}`)}
                              className="px-4 py-2.5 bg-sand-100 hover:bg-sand-200 text-charcoal font-black text-xs uppercase tracking-widest rounded-xl transition border border-sand-300/50 shadow-sm cursor-pointer"
                              data-testid={`view-${b.booking_id}`}
                            >
                              View details
                            </button>
                          )}
                          {(isSoftLock || isUpcoming) && (
                            <button
                              onClick={() => handleCancel(b)}
                              disabled={cancelling === b.booking_id}
                              className="text-red-500 hover:text-red-700 font-black text-xs uppercase tracking-widest hover:underline disabled:opacity-50 transition px-2 cursor-pointer"
                              data-testid={`cancel-${b.booking_id}`}
                            >
                              {cancelling === b.booking_id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                          {tab === 'past' && (
                            <>
                              {reviewedIds.has(b.booking_id) ? (
                                <span
                                  className="text-[10px] font-black uppercase tracking-widest flex items-center px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200"
                                  data-testid={`reviewed-tag-${b.booking_id}`}
                                >
                                  <Star className="w-3.5 h-3.5 mr-1 fill-green-700 text-green-700" /> Reviewed
                                </span>
                              ) : (
                                <button
                                  onClick={() => setReviewBooking(b)}
                                  className="px-4 py-2.5 bg-charcoal text-white hover:bg-neutral-800 font-black text-xs uppercase tracking-widest rounded-xl transition shadow-premium cursor-pointer"
                                  data-testid={`review-btn-${b.booking_id}`}
                                >
                                  Leave a review
                                </button>
                              )}
                              <button
                                onClick={() => property.property_id && navigate(`/property/${property.property_id}`)}
                                className="px-4 py-2.5 bg-sand-100 hover:bg-sand-200 text-charcoal font-black text-xs uppercase tracking-widest rounded-xl transition border border-sand-300/50 shadow-sm cursor-pointer"
                                data-testid={`book-again-${b.booking_id}`}
                              >
                                Book again
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {visible.length > 0 && (
              <div className="flex items-center justify-between border-t border-sand-200 pt-6 mt-8">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="relative inline-flex items-center rounded-xl border border-sand-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-charcoal hover:bg-sand-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-sand-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-charcoal hover:bg-sand-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-charcoal-muted font-bold uppercase tracking-wider">
                      Showing <span className="font-black text-charcoal">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-black text-charcoal">{Math.min(currentPage * itemsPerPage, visible.length)}</span> of{' '}
                      <span className="font-black text-charcoal">{visible.length}</span> bookings
                    </p>
                  </div>
                  <div>
                    <nav className="inline-flex items-center gap-1.5" aria-label="Pagination">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-sand-300 bg-white text-charcoal-light hover:bg-sand-100 hover:text-charcoal disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                        const isCurrent = pageNumber === currentPage;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-black transition cursor-pointer border ${
                              isCurrent
                                ? 'bg-charcoal border-charcoal text-white shadow-premium'
                                : 'bg-white border-sand-300 text-charcoal hover:bg-sand-100'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-sand-300 bg-white text-charcoal-light hover:bg-sand-100 hover:text-charcoal disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewedIds((s) => new Set([...s, reviewBooking.booking_id]));
            setReviewBooking(null);
          }}
        />
      )}

      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm" data-testid="cancel-confirm-modal">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-premium border border-sand-200">
            <h3 className="text-lg font-black text-charcoal text-center mb-6 uppercase tracking-wide leading-tight">
              Are you sure you want to cancel?
            </h3>
            
            <div className="flex gap-3 mb-6">
              <button
                onClick={confirmCancel}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-sm cursor-pointer"
                data-testid="confirm-cancel-yes"
              >
                Yes
              </button>
              <button
                onClick={() => setCancellingBooking(null)}
                className="flex-1 py-3 bg-sand-100 hover:bg-sand-200 text-charcoal font-black text-xs uppercase tracking-widest rounded-xl transition border border-sand-300/50 shadow-sm cursor-pointer"
                data-testid="confirm-cancel-no"
              >
                No
              </button>
            </div>
            
            <p className="text-[11px] text-charcoal-muted font-bold text-center uppercase tracking-wider bg-sand-50 py-2.5 rounded-xl border border-sand-200/50">
              Note: The Price & Date may change
            </p>
          </div>
        </div>
      )}
      {successNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm" data-testid="refund-success-modal">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-premium border border-sand-200 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              💸
            </div>
            <h3 className="text-xl font-black text-charcoal mb-2 uppercase tracking-wide leading-tight">
              {successNotification.title}
            </h3>
            <p className="text-sm text-charcoal-light mb-6 leading-relaxed">
              {successNotification.message}
            </p>
            {successNotification.policy && (
              <div className="mb-6 py-2 px-4 bg-sand-50 rounded-xl border border-sand-200 inline-block">
                <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Policy applied: {successNotification.policy.replace('_', ' ')}
                </span>
              </div>
            )}
            <button
              onClick={() => setSuccessNotification(null)}
              className="w-full py-3 bg-charcoal hover:bg-charcoal-dark text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md cursor-pointer"
              data-testid="refund-success-close"
            >
              Great
            </button>
          </div>
        </div>
      )}
      {selectedCall && (
        <AICallModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
};
const AICallModal = ({ call, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const getOptimalVoice = (lang, voiceType) => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetLang = lang.toLowerCase().replace('_', '-');
    const langFamily = targetLang.split('-')[0];

    // Filter strictly by language or language family first to prevent language mismatch crash
    let matchingLang = voices.filter(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang.includes(targetLang) || targetLang.includes(vLang) || vLang.startsWith(langFamily + '-');
    });

    // Hindi/Marathi Devanagari fallback cross-matching if one language family is missing
    if (matchingLang.length === 0 && (langFamily === 'mr' || langFamily === 'hi')) {
      const siblingFamily = langFamily === 'mr' ? 'hi' : 'mr';
      matchingLang = voices.filter(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang.includes(siblingFamily + '-') || vLang.startsWith(siblingFamily + '-');
      });
    }

    if (matchingLang.length === 0) {
      return null;
    }

    const isFemale = (voiceType || '').toLowerCase() === 'female';
    const isMale = (voiceType || '').toLowerCase() === 'male';

    const femaleKeywords = ['zira', 'kalpana', 'samantha', 'hazel', 'susan', 'female', 'aria', 'haruka', 'heera', 'shruti', 'sangeeta', 'ekta', 'madhur'];
    const maleKeywords = ['david', 'hemant', 'mark', 'george', 'male', 'guy', 'ravi', 'stefan', 'dilip', 'ravi', 'hari'];

    let genderFiltered = matchingLang.filter(v => {
      const nameLower = v.name.toLowerCase();
      if (isFemale) {
        return femaleKeywords.some(kw => nameLower.includes(kw)) && !maleKeywords.some(kw => nameLower.includes(kw));
      }
      if (isMale) {
        return maleKeywords.some(kw => nameLower.includes(kw)) && !femaleKeywords.some(kw => nameLower.includes(kw));
      }
      return true;
    });

    if (genderFiltered.length === 0) {
      genderFiltered = matchingLang;
    }

    const qualityKeywords = ['natural', 'online', 'neural', 'google', 'premium', 'high'];
    genderFiltered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore = qualityKeywords.reduce((score, kw) => score + (aName.includes(kw) ? 1 : 0), 0);
      const bScore = qualityKeywords.reduce((score, kw) => score + (bName.includes(kw) ? 1 : 0), 0);
      return bScore - aScore;
    });

    return genderFiltered[0] || null;
  };

  const handlePlayPause = () => {
    if (!('speechSynthesis' in window)) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
        
        // Micro-timeout to clear speech queue in Chromium engine
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(call.script);
          
          // Auto-detect language from script text
          const text = (call.script || '').toLowerCase();
          let lang = 'en-IN';
          if (text.includes('bolat aahe') || text.includes('sathi') || text.includes('tumche') || text.includes('tumcha') || text.includes('jhali')) {
            lang = 'mr-IN';
          } else if (text.includes('bol raha') || text.includes('aapki') || text.includes('aapka') || text.includes('liye confirm') || text.includes('bol rahi')) {
            lang = 'hi-IN';
          }
          utterance.lang = lang;
          
          // Match voice by language and agent gender
          let selectedVoice = null;
          if (call.external_voice_name) {
            const voices = window.speechSynthesis.getVoices();
            selectedVoice = voices.find(v => v.name === call.external_voice_name);
          }
          
          if (!selectedVoice) {
            const voiceGender = call.voice_type || ((call.agent_name || '').toLowerCase().includes('sneha') ? 'Female' : 'Male');
            selectedVoice = getOptimalVoice(lang, voiceGender);
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          }

          utterance.onend = () => {
            setIsPlaying(false);
            setProgress(0);
          };

          utterance.onerror = (e) => {
            console.error('Speech Synthesis Error:', e);
            setIsPlaying(false);
            setProgress(0);
          };

          // Cache the utterance reference globally and on React ref to prevent garbage collection silent failure
          utteranceRef.current = utterance;
          window._currentUtterance = utterance;

          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= call.duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, call.duration_seconds]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-sand-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-charcoal to-neutral-805 p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-terracotta">Voice AI Concierge</span>
            <h3 className="text-xl font-black tracking-tight">{call.agent_name}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        {/* Call Info details */}
        <div className="p-6 bg-sand-50/50 border-b border-sand-200 text-xs font-semibold text-charcoal-muted grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Recipient</span>
            <span className="text-charcoal text-sm font-bold">{call.recipient_name} ({call.role})</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Phone number</span>
            <span className="text-charcoal text-sm font-bold">{call.phone}</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Duration</span>
            <span className="text-charcoal text-sm font-bold">{call.duration_seconds} seconds</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-charcoal-light">Status</span>
            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase mt-1">
              ● Connected
            </span>
          </div>
        </div>

        {/* Audio Visualizer & Player */}
        <div className="p-6 border-b border-sand-100 flex flex-col items-center justify-center bg-sand-50/30">
          {/* Wave visualizer */}
          <div className="flex items-end justify-center gap-1.5 h-16 mb-6 w-full px-12">
            {Array.from({ length: 28 }).map((_, i) => {
              const height = isPlaying 
                ? `${15 + Math.sin(progress * 1.5 + i) * 35 + Math.random() * 20}%`
                : '10%';
              return (
                <div 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-terracotta' : 'bg-sand-300'
                  }`}
                  style={{ height, minHeight: '4px' }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between w-full gap-4">
            <span className="text-xs font-bold font-mono text-charcoal-muted">{formatTime(progress)}</span>
            <button
              onClick={handlePlayPause}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                isPlaying 
                  ? 'bg-charcoal hover:bg-neutral-800 text-white' 
                  : 'bg-terracotta hover:bg-terracotta-dark text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                  Pause Simulation
                </>
              ) : (
                <>
                  ▶ Play voice call
                </>
              )}
            </button>
            <span className="text-xs font-bold font-mono text-charcoal-muted">{formatTime(call.duration_seconds)}</span>
          </div>
        </div>

        {/* Transcription bubble */}
        <div className="p-6 overflow-y-auto flex-1 bg-white min-h-[160px] max-h-[300px]">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-3 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5" /> Call Transcription Script
          </h4>
          <div className="bg-sand-50 p-4 rounded-2xl border border-sand-200/50 text-sm font-medium text-charcoal leading-relaxed relative">
            <div className="absolute top-3 left-4 text-xs text-terracotta font-black uppercase tracking-wider text-[9px] mb-1">
              Mayur Voice AI
            </div>
            <p className="mt-4 italic">
              "{call.script}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestBookings;
