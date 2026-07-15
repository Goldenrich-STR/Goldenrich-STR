import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, getImageUrl, aiCallAPI } from '../services/api';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Search,
  Filter,
  Users,
  Utensils,
  Wallet,
  Calendar,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Building,
  Volume2
} from 'lucide-react';

const STATUS_BADGE = {
  confirmed: { label: 'Confirmed', cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 },
  soft_lock: { label: 'Pending payment', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
  completed: { label: 'Completed', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', Icon: CheckCircle2 },
};

const bookingSortTime = (booking) => {
  const candidates = [
    booking.confirmed_at,
    booking.updated_at,
    booking.created_at,
    booking.check_in_date,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  return 0;
};

const HostBookings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedProperties, setExpandedProperties] = useState({});
  const [aiCalls, setAiCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    fetchBookings();
    fetchAiCalls();
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

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingAPI.getHostBookings();
      setBookings(res.data.bookings || []);
      
      // Expand all by default
      const defaultExpanded = {};
      (res.data.bookings || []).forEach(b => {
        if (b.property_id) {
          defaultExpanded[b.property_id] = true;
        }
      });
      setExpandedProperties(defaultExpanded);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (propertyId) => {
    setExpandedProperties(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }));
  };

  // Group and Filter Bookings
  const groupedData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    
    // 1. Group all bookings by property first (to get unfiltered total counts and stats)
    const groups = {};
    bookings.forEach(b => {
      const propId = b.property_id || 'unknown';
      if (!groups[propId]) {
        groups[propId] = {
          property: b.property || { title: 'Unknown Property', city: 'Unknown', state: '' },
          property_id: propId,
          allBookings: [],
          filteredBookings: [],
          stats: {
            total: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0,
            completed: 0,
            revenue: 0
          }
        };
      }
      
      groups[propId].allBookings.push(b);
      
      let statusKey = b.booking_status;
      if (b.booking_status === 'confirmed' && b.check_out_date < today) {
        statusKey = 'completed';
      }

      groups[propId].stats.total += 1;
      if (statusKey === 'confirmed') {
        groups[propId].stats.confirmed += 1;
        groups[propId].stats.revenue += b.total_amount || 0;
      } else if (statusKey === 'soft_lock' || statusKey === 'pending') {
        groups[propId].stats.pending += 1;
      } else if (statusKey === 'cancelled') {
        groups[propId].stats.cancelled += 1;
      } else if (statusKey === 'completed') {
        groups[propId].stats.completed += 1;
        groups[propId].stats.revenue += b.total_amount || 0;
      }
    });

    // 2. Filter bookings within each property group and order latest activity first
    return Object.values(groups).map(group => {
      const filtered = group.allBookings.filter(b => {
        const property = b.property || {};
        const titleMatch = (property.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const cityMatch = (property.city || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = titleMatch || cityMatch || b.booking_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        let statusKey = b.booking_status;
        if (b.booking_status === 'confirmed' && b.check_out_date < today) {
          statusKey = 'completed';
        }
        
        const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      const sortedBookings = [...filtered].sort((a, b) => bookingSortTime(b) - bookingSortTime(a));
      const latestActivityAt = Math.max(...group.allBookings.map(bookingSortTime));

      return {
        ...group,
        filteredBookings: sortedBookings,
        latestActivityAt
      };
    })
      .filter(group => group.filteredBookings.length > 0)
      .sort((a, b) => b.latestActivityAt - a.latestActivityAt);
  }, [bookings, searchTerm, statusFilter]);

  // Overall Statistics for Host
  const summaryStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalReservations = 0;
    let confirmedStays = 0;
    let pendingPayment = 0;
    let totalRevenue = 0;
    const uniqueProperties = new Set();

    bookings.forEach(b => {
      let statusKey = b.booking_status;
      if (b.booking_status === 'confirmed' && b.check_out_date < today) {
        statusKey = 'completed';
      }

      totalReservations += 1;
      if (b.property_id) uniqueProperties.add(b.property_id);

      if (statusKey === 'confirmed') {
        confirmedStays += 1;
        totalRevenue += b.total_amount || 0;
      } else if (statusKey === 'completed') {
        confirmedStays += 1;
        totalRevenue += b.total_amount || 0;
      } else if (statusKey === 'soft_lock') {
        pendingPayment += 1;
      }
    });

    return {
      propertiesCount: uniqueProperties.size,
      totalReservations,
      confirmedStays,
      pendingPayment,
      totalRevenue
    };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-stone">
      {/* Header matching HostDashboard.js */}
      <header className="header-glass sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="w-full flex justify-between items-center gap-2">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden md:flex items-center space-x-6">
               {[
                 { label: 'DASHBOARD', path: '/host/dashboard' },
                 { label: 'CALENDAR', path: '/host/calendar' },
                 { label: 'PAYOUTS', path: '/host/payouts' },
                 { label: 'BOOKINGS', path: '/host/bookings' }
               ].map((item) => (
                 <button
                   key={item.label}
                   onClick={() => navigate(item.path)}
                   className={`text-[10px] font-bold tracking-tight tracking-[0.2em] transition-colors ${
                     item.path === '/host/bookings' 
                       ? 'text-terracotta border-b border-terracotta pb-0.5' 
                       : 'text-charcoal-muted hover:text-terracotta'
                   }`}
                 >
                   {item.label}
                 </button>
               ))}
            </nav>
            <div className="h-6 w-px bg-sand-200 hidden md:block"></div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs font-bold text-charcoal-muted hidden sm:inline">
                Welcome, {user?.full_name?.split(' ')[0]}
              </span>
              <button 
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    logout();
                  }, 50);
                }} 
                className="text-xs font-bold tracking-tight text-terracotta hover:underline tracking-widest uppercase cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full px-4 md:px-8 lg:px-12 py-12 mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-charcoal tracking-tight" data-testid="page-title">
              Bookings Manager
            </h2>
            <p className="text-charcoal-muted text-sm font-medium mt-1">Track reservations, view guests and monitor earnings per property.</p>
          </div>
          <button
            onClick={() => navigate('/host/dashboard')}
            className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-sm text-charcoal hover:text-terracotta hover:border-terracotta flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 text-terracotta" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Loading and Error States */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-terracotta border-gray-100 mb-4"></div>
            <span className="text-sm font-bold uppercase tracking-wider">Loading bookings data…</span>
          </div>
        ) : (
          <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              <div className="dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-light">Active Properties</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-bold tracking-tight text-charcoal">{summaryStats.propertiesCount}</span>
                  <div className="p-2 rounded-xl bg-terracotta/5 text-terracotta">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-light">Total Bookings</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-bold tracking-tight text-charcoal">{summaryStats.totalReservations}</span>
                  <div className="p-2 rounded-xl bg-indigo-500/5 text-indigo-500">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-light">Confirmed Stays</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-bold tracking-tight text-charcoal">{summaryStats.confirmedStays}</span>
                  <div className="p-2 rounded-xl bg-emerald-500/5 text-emerald-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-light">Pending Payments</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-bold tracking-tight text-charcoal">{summaryStats.pendingPayment}</span>
                  <div className="p-2 rounded-xl bg-amber-500/5 text-amber-500">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-light">Gross Booking Value</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
                    ₹{Math.round(summaryStats.totalRevenue).toLocaleString('en-IN')}
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Section */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100/80 shadow-sm mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-charcoal-light absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by property title, city or Booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-100 rounded-2xl text-sm font-semibold text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all bg-stone/30"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0 justify-end">
                <div className="flex items-center space-x-2 text-xs font-bold tracking-tight uppercase tracking-wider text-charcoal-muted">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Status:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none border border-gray-100 rounded-xl px-4 py-2.5 pr-10 bg-white font-bold text-xs text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">ALL RESERVATIONS</option>
                  <option value="confirmed">CONFIRMED</option>
                  <option value="soft_lock">PENDING PAYMENT</option>
                  <option value="cancelled">CANCELLED</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Property list with grouped Bookings */}
            {groupedData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-8 h-8 text-charcoal-muted" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-charcoal mb-2 uppercase tracking-wide">No Bookings Match Criteria</h3>
                <p className="text-charcoal-muted text-sm font-semibold max-w-sm mx-auto">
                  Adjust your search or filter status to view other properties or bookings.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedData.map((group) => {
                  const property = group.property;
                  const isExpanded = !!expandedProperties[group.property_id];
                  const image = property.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=600';
                  
                  return (
                    <div 
                      key={group.property_id}
                      className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-premium"
                    >
                      {/* Property header row */}
                      <div 
                        className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone/40 border-b border-gray-100 cursor-pointer select-none"
                        onClick={() => toggleExpand(group.property_id)}
                      >
                        <div className="flex items-center space-x-4">
                          <img 
                            src={getImageUrl(image)} 
                            alt={property.title} 
                            className="w-16 h-16 rounded-2xl object-cover border border-gray-100/80 shadow-sm"
                          />
                          <div>
                            <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-terracotta block">
                              {property.city}, {property.state}
                            </span>
                            <h3 className="text-lg font-bold tracking-tight text-charcoal leading-tight mt-0.5 hover:text-terracotta transition-colors">
                              {property.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-xs font-bold text-charcoal-muted mt-2 flex-wrap gap-y-1.5">
                              <span className="bg-charcoal/5 px-2 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase tracking-wider">
                                {group.stats.total} Total Reservation{group.stats.total === 1 ? '' : 's'}
                              </span>
                              {group.stats.confirmed > 0 && (
                                <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {group.stats.confirmed} Confirmed
                                </span>
                              )}
                              {group.stats.pending > 0 && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {group.stats.pending} Pending
                                </span>
                              )}
                              {group.stats.completed > 0 && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {group.stats.completed} Completed
                                </span>
                              )}
                              {group.stats.cancelled > 0 && (
                                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {group.stats.cancelled} Cancelled
                                </span>
                              )}
                              {statusFilter !== 'all' && (
                                <span className="bg-terracotta/5 text-terracotta border border-terracotta/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Showing {group.filteredBookings.length} matching
                                </span>
                              )}
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">
                                Total Earned: ₹{Math.round(group.stats.revenue).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 self-end sm:self-center">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-charcoal-light" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-charcoal-light" />
                          )}
                        </div>
                      </div>

                      {/* Bookings inside property */}
                      {isExpanded && (
                        <div className="p-6 bg-white divide-y divide-sand-150">
                          {group.filteredBookings.map((b, bIdx) => {
                            const todayStr = new Date().toISOString().slice(0, 10);
                            let statusKey = b.booking_status;
                            if (b.booking_status === 'confirmed' && b.check_out_date < todayStr) {
                              statusKey = 'completed';
                            }
                            
                            const badge = STATUS_BADGE[statusKey] || STATUS_BADGE.confirmed;
                            const BadgeIcon = badge.Icon;
                            const numNights = Math.max(1, Math.round((new Date(b.check_out_date) - new Date(b.check_in_date)) / (1000 * 60 * 60 * 24)));
                            
                            return (
                              <div key={b.booking_id} className={`py-6 ${bIdx === 0 ? 'pt-0' : ''} ${bIdx === group.filteredBookings.length - 1 ? 'pb-0' : ''}`}>
                                <div className="flex flex-col lg:flex-row justify-between gap-6">
                                  {/* Guest & Stay Details */}
                                  <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between lg:justify-start gap-4">
                                      <span className="text-xs font-mono font-bold tracking-tight uppercase text-charcoal-muted bg-gray-50 px-2 py-1 rounded">
                                        ID: {b.booking_id}
                                      </span>
                                      
                                      <span className={`text-[10px] font-bold tracking-tight uppercase tracking-widest flex items-center space-x-1 px-3 py-1 border rounded-full ${badge.cls}`}>
                                        <BadgeIcon className="w-3.5 h-3.5" />
                                        <span>{badge.label}</span>
                                      </span>

                                      {(() => {
                                        const matchingCall = aiCalls.find(c => c.booking_id === b.booking_id);
                                        if (matchingCall) {
                                          return (
                                            <button
                                              onClick={() => setSelectedCall(matchingCall)}
                                              className="inline-flex items-center text-[10px] font-bold tracking-tight uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-sm ml-2"
                                            >
                                              <Phone className="w-3 h-3 mr-1 text-emerald-600 animate-pulse" /> AI Call Log 📞
                                            </button>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>

                                    {/* Stay Schedule */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                      <div className="flex items-center space-x-3 bg-stone/50 p-3 rounded-2xl border border-sand-150">
                                        <Calendar className="w-5 h-5 text-terracotta/70 shrink-0" />
                                        <div>
                                          <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block">Duration</span>
                                          <span className="text-xs font-bold text-charcoal">
                                            {b.check_in_date} to {b.check_out_date}
                                          </span>
                                          <span className="text-[10px] text-charcoal-muted block">({numNights} night{numNights === 1 ? '' : 's'})</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-3 bg-stone/50 p-3 rounded-2xl border border-sand-150">
                                        <Users className="w-5 h-5 text-terracotta/70 shrink-0" />
                                        <div>
                                          <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block">Guests</span>
                                          <span className="text-xs font-bold text-charcoal">
                                            {b.number_of_guests} Guest{b.number_of_guests === 1 ? '' : 's'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Food Preference & Slot (Event Venues) */}
                                      {(b.food_preference || b.selected_slot) && (
                                        <div className="flex items-center space-x-3 bg-stone/50 p-3 rounded-2xl border border-sand-150">
                                          <Utensils className="w-5 h-5 text-terracotta/70 shrink-0" />
                                          <div>
                                            <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block">Preferences</span>
                                            <span className="text-xs font-bold text-charcoal capitalize">
                                              {b.selected_slot && `Slot: ${b.selected_slot}`}
                                              {b.selected_slot && b.food_preference && ` | `}
                                              {b.food_preference && `Food: ${b.food_preference.replace('_', ' ')}`}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Guest Profile Section (from backend enrich) */}
                                    <div className="p-4 bg-stone/30 rounded-2xl border border-sand-150/70">
                                      <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block mb-2">Guest Profile</span>
                                      {b.guest ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                                          <div className="font-bold text-charcoal text-sm">{b.guest.full_name}</div>
                                          <div className="flex items-center text-charcoal-muted gap-1">
                                            <Mail className="w-3.5 h-3.5 text-charcoal-light" />
                                            <span>{b.guest.email}</span>
                                          </div>
                                          <div className="flex items-center text-charcoal-muted gap-1">
                                            <Phone className="w-3.5 h-3.5 text-charcoal-light" />
                                            <span>{b.guest.phone || 'No phone number'}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs font-semibold text-charcoal-muted italic">Guest details loading or unavailable</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pricing details and revenue */}
                                  <div className="w-full lg:w-64 bg-stone/30 rounded-2xl p-4 border border-sand-150/80 flex flex-col justify-between">
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between font-semibold text-charcoal-muted">
                                        <span>Base Price:</span>
                                        <span>₹{Math.round(b.base_amount || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-charcoal-light">
                                        <span>Service Fee (10%):</span>
                                        <span>₹{Math.round(b.service_fee || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between text-charcoal-light">
                                        <span>Taxes & GST (18%):</span>
                                        <span>₹{Math.round(b.taxes || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                      {b.discount_amount > 0 && (
                                        <div className="flex justify-between text-red-600 font-bold">
                                          <span>Coupon Discount:</span>
                                          <span>-₹{Math.round(b.discount_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                      )}
                                      <div className="border-t border-gray-100 pt-2 flex justify-between font-bold tracking-tight text-charcoal text-sm">
                                        <span>Total Amount:</span>
                                        <span>₹{Math.round(b.total_amount || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-100/60 flex items-center justify-between">
                                      <div>
                                        <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block">Payment Type</span>
                                        <span className="text-xs font-bold text-charcoal capitalize">{b.payment_type || 'Full'}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[9px] font-bold tracking-tight text-charcoal-light uppercase tracking-wider block">Paid Amount</span>
                                        <span className="text-sm font-bold tracking-tight text-emerald-600">₹{Math.round(b.paid_amount || 0).toLocaleString('en-IN')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
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
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-elevated border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-charcoal to-neutral-805 p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-terracotta">Voice AI Concierge</span>
            <h3 className="text-xl font-bold tracking-tight tracking-tight">{call.agent_name}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        {/* Call Info details */}
        <div className="p-6 bg-stone/50 border-b border-gray-100 text-xs font-semibold text-charcoal-muted grid grid-cols-2 gap-4">
          <div>
            <span className="block text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light">Recipient</span>
            <span className="text-charcoal text-sm font-bold">{call.recipient_name} ({call.role})</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light">Phone number</span>
            <span className="text-charcoal text-sm font-bold">{call.phone}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light">Duration</span>
            <span className="text-charcoal text-sm font-bold">{call.duration_seconds} seconds</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light">Status</span>
            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase mt-1">
              ● Connected
            </span>
          </div>
        </div>

        {/* Audio Visualizer & Player */}
        <div className="p-6 border-b border-sand-100 flex flex-col items-center justify-center bg-stone/30">
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
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-2.5 rounded-xl font-bold tracking-tight text-xs uppercase tracking-widest transition-all cursor-pointer shadow-subtle flex items-center gap-2 ${
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
          <h4 className="text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-muted mb-3 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5" /> Call Transcription Script
          </h4>
          <div className="bg-stone p-4 rounded-2xl border border-gray-100 text-sm font-medium text-charcoal leading-relaxed relative">
            <div className="absolute top-3 left-4 text-xs text-terracotta font-bold tracking-tight uppercase tracking-wider text-[9px] mb-1">
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

export default HostBookings;
