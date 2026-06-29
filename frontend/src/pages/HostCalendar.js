import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, calendarAPI } from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
  ArrowLeft,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SOURCE_LABELS = {
  manual: { label: 'Blocked', color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-700' },
  booking: { label: 'Booked', color: '#EF4444', bg: 'bg-red-100', text: 'text-red-700' },
  external: { label: 'Blocked', color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-700' },
};

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function buildMonthMatrix(year, month) {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekDay = firstDay.getDay(); // 0 Sun..6 Sat
  const daysInMonth = lastDay.getDate();
  const cells = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month - 1, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateInRange(d, startISO, endISO) {
  const iso = toISO(d);
  return iso >= startISO && iso <= endISO;
}

const HostCalendar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [properties, setProperties] = useState([]);
  const searchParams = new URLSearchParams(location.search);
  const initialPropertyId = searchParams.get('property');
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId || '');
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [events, setEvents] = useState([]);
  const [allManualBlocks, setAllManualBlocks] = useState([]);
  const [externalCalendars, setExternalCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showExternalForm, setShowExternalForm] = useState(false);
  const [extName, setExtName] = useState('');
  const [extUrl, setExtUrl] = useState('');
  const [extColor, setExtColor] = useState('#3B82F6');
  const [icalFeedUrl, setIcalFeedUrl] = useState('');
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchUnifiedView();
      fetchAllManualBlocks();
      fetchExternalCalendars();
      fetchICalFeedUrl();
    }
  }, [selectedPropertyId, month, year]);

  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.getHostProperties();
      const list = res.data.properties || [];
      setProperties(list);
      if (list.length) {
        if (initialPropertyId && list.some(p => p.property_id === initialPropertyId)) {
          setSelectedPropertyId(initialPropertyId);
        } else if (!selectedPropertyId) {
          setSelectedPropertyId(list[0].property_id);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load properties');
    }
  };

  const fetchUnifiedView = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await calendarAPI.getUnifiedView(selectedPropertyId, month, year);
      setEvents(res.data.events || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const fetchExternalCalendars = async () => {
    try {
      const res = await calendarAPI.listExternalCalendars(selectedPropertyId);
      setExternalCalendars(res.data.calendars || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllManualBlocks = async () => {
    try {
      // Fetch a wide future window so the side list shows all upcoming manual blocks
      const todayISO = toISO(new Date());
      const farFuture = `${new Date().getFullYear() + 5}-12-31`;
      const res = await calendarAPI.getBlockedDates(selectedPropertyId, {
        start_date: todayISO,
        end_date: farFuture,
      });
      const list = (res.data.blocked_dates || []).filter((b) => b.source === 'manual');
      list.sort((a, b) => a.start_date.localeCompare(b.start_date));
      setAllManualBlocks(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchICalFeedUrl = async () => {
    try {
      const res = await calendarAPI.getICalFeedUrl(selectedPropertyId);
      setIcalFeedUrl(res.data.feed_url || '');
      setCopiedFeedUrl(false);
    } catch (e) {
      console.error(e);
    }
  };

  const copyICalFeedUrl = async () => {
    if (!icalFeedUrl) return;
    try {
      await navigator.clipboard.writeText(icalFeedUrl);
      setCopiedFeedUrl(true);
      setTimeout(() => setCopiedFeedUrl(false), 1800);
    } catch (e) {
      setError('Unable to copy iCal link. Please select and copy it manually.');
    }
  };

  const rotateICalFeedUrl = async () => {
    if (!window.confirm('Generate a new iCal link? Old links pasted on other platforms will stop working.')) return;
    try {
      const res = await calendarAPI.rotateICalFeedUrl(selectedPropertyId);
      setIcalFeedUrl(res.data.feed_url || '');
      setCopiedFeedUrl(false);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to refresh iCal link');
    }
  };

  const handleBlockDates = async (e) => {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    setSubmitting(true);
    setError('');
    try {
      await calendarAPI.blockDates(selectedPropertyId, {
        start_date: blockStart,
        end_date: blockEnd,
        reason: blockReason || null,
      });
      // Jump calendar to the month of the new block so user sees it immediately
      const [yr, mo] = blockStart.split('-').map((n) => parseInt(n, 10));
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      setShowBlockForm(false);
      setMonth(mo);
      setYear(yr);
      await fetchAllManualBlocks();
      // fetchUnifiedView will run via useEffect on month/year change
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to block dates');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (event) => {
    if (event.source !== 'manual') return;
    if (!window.confirm('Unblock these dates?')) return;
    try {
      await calendarAPI.unblockDates(event.event_id || event.blocked_date_id);
      await fetchUnifiedView();
      await fetchAllManualBlocks();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to unblock');
    }
  };

  const handleAddExternal = async (e) => {
    e.preventDefault();
    if (!extName || !extUrl) return;
    let url = extUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setSubmitting(true);
    setError('');
    try {
      await calendarAPI.addExternalCalendar(selectedPropertyId, {
        name: extName,
        ical_url: url,
        color: extColor,
      });
      setExtName('');
      setExtUrl('');
      setShowExternalForm(false);
      await fetchExternalCalendars();
      await fetchUnifiedView();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add external calendar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncExternal = async (calendarId) => {
    try {
      await calendarAPI.syncExternalCalendar(calendarId);
      await fetchExternalCalendars();
      await fetchUnifiedView();
    } catch (e) {
      setError(e.response?.data?.detail || 'Sync failed');
    }
  };

  const handleRemoveExternal = async (calendarId) => {
    if (!window.confirm('Remove this external calendar?')) return;
    try {
      await calendarAPI.removeExternalCalendar(calendarId);
      await fetchExternalCalendars();
      await fetchUnifiedView();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to remove');
    }
  };

  const handleExportICal = async () => {
    try {
      const res = await calendarAPI.downloadICal(selectedPropertyId);
      const blob = new Blob([res.data], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedPropertyId}_calendar.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to export iCal');
    }
  };

  const goPrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells = useMemo(() => buildMonthMatrix(year, month), [year, month]);

  const eventsForDay = (d) => {
    if (!d) return [];
    return events.filter((ev) => dateInRange(d, ev.start_date, ev.end_date));
  };

  const minDateStr = toISO(new Date());

  return (
    <div className="min-h-screen bg-stone">
      <header className="header-glass px-6 py-4" data-testid="host-calendar-header">
        <div className="w-full flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/host/dashboard')}
              className="text-charcoal-light hover:text-terracotta flex items-center space-x-1"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <span className="text-charcoal-light">Welcome, {user?.full_name}</span>
            <button onClick={logout} className="text-terracotta hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-8 mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-charcoal" data-testid="calendar-title">
              Property Calendar
            </h2>
            <p className="text-charcoal-light mt-1">
              Manage availability, block dates, and sync external calendars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="appearance-none border border-gray-100 rounded-xl px-4 py-2.5 pr-10 bg-white font-bold text-sm text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition-all shadow-sm cursor-pointer"
                data-testid="property-selector"
              >
                {properties.length === 0 && (
                  <option value="">No properties</option>
                )}
                {properties.map((p) => (
                  <option key={p.property_id} value={p.property_id}>
                    {p.title} - {p.city}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal-light">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
            <button
              onClick={handleExportICal}
              disabled={!selectedPropertyId}
              className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-sm text-charcoal hover:text-terracotta hover:border-terracotta flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
              data-testid="export-ical-btn"
            >
              <Download className="w-4 h-4 text-terracotta" />
              <span>Export iCal</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-start space-x-2" data-testid="calendar-error">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!selectedPropertyId ? (
          <div className="dashboard-card text-center py-16">
            <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
            <p className="text-charcoal-light mb-4">
              You don't have any properties yet. List one to manage its calendar.
            </p>
            <button
              onClick={() => navigate('/host/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2 dashboard-card p-6 bg-white rounded-3xl border border-gray-100/80 shadow-sm">
              <div className="flex items-center justify-between mb-6 bg-stone/50 p-2 rounded-2xl border border-sand-100">
                <button
                  onClick={goPrev}
                  className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-charcoal hover:text-terracotta active:scale-95"
                  data-testid="cal-prev-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold tracking-tight text-charcoal tracking-wide flex items-center gap-2" data-testid="cal-month-label">
                  <CalendarIcon className="w-5 h-5 text-terracotta/70" />
                  {MONTH_NAMES[month - 1]} {year}
                </h3>
                <button
                  onClick={goNext}
                  className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all text-charcoal hover:text-terracotta active:scale-95"
                  data-testid="cal-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold tracking-tight uppercase tracking-wider text-charcoal-light mb-3">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {loading ? (
                <div className="py-24 text-center text-charcoal-light flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-terracotta animate-spin" />
                  <span className="font-bold text-sm">Loading availability details…</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2.5" data-testid="calendar-grid">
                  {cells.map((d, idx) => {
                    if (!d) return (
                      <div key={idx} className="h-24 bg-gray-50/30 border border-sand-100/50 rounded-xl relative overflow-hidden" />
                    );
                    const dayEvents = eventsForDay(d);
                    const isToday = toISO(d) === toISO(new Date());
                    const hasBooking = dayEvents.some((ev) => ev.source === 'booking');
                    const hasBlocked = dayEvents.some((ev) => ev.source !== 'booking');
                    return (
                      <div
                        key={idx}
                        className={`h-24 border rounded-xl p-2 text-left flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-subtle ${
                          hasBooking
                            ? 'bg-red-50/70 border-red-200'
                            : hasBlocked
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-100/85 hover:border-terracotta/40'
                        } ${
                          isToday 
                            ? 'border-terracotta ring-2 ring-terracotta/20 shadow-sm shadow-terracotta/10' 
                            : ''
                        }`}
                        data-testid={`day-${toISO(d)}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold tracking-tight ${
                            isToday 
                              ? 'bg-terracotta text-white w-6 h-6 rounded-full flex items-center justify-center font-semibold tracking-tight shadow-sm shadow-terracotta/20' 
                              : 'text-charcoal'
                          }`}>
                            {d.getDate()}
                          </span>
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-ping" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden mt-1.5 space-y-1">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div
                              key={ev.event_id + toISO(d)}
                              className="text-[9px] font-bold tracking-tight uppercase tracking-wider px-2 py-0.5 rounded-lg truncate transition-all duration-200 hover:brightness-95 flex items-center gap-1 shadow-sm"
                              style={{ 
                                backgroundColor: (SOURCE_LABELS[ev.source]?.color || ev.color) + '22', 
                                color: SOURCE_LABELS[ev.source]?.color || ev.color, 
                                borderLeft: `3px solid ${SOURCE_LABELS[ev.source]?.color || ev.color}`
                              }}
                              title={`${SOURCE_LABELS[ev.source]?.label}: ${ev.start_date} → ${ev.end_date}`}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: SOURCE_LABELS[ev.source]?.color || ev.color }} />
                              {SOURCE_LABELS[ev.source]?.label || ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] font-bold text-terracotta/80 pl-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-6 p-4 bg-stone/50 rounded-xl border border-sand-100/50 text-xs text-charcoal-light">
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-md border border-gray-200 bg-white" />Available</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-md bg-gray-300 shadow-sm shadow-gray-300/20" />Blocked</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-md bg-red-500 shadow-sm shadow-red-500/20" />Booked</span>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Block Dates */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-charcoal">Block Dates</h3>
                    <p className="text-xs text-charcoal-light">Prevent bookings on specific days</p>
                  </div>
                  <button
                    onClick={() => setShowBlockForm((v) => !v)}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                      showBlockForm 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                        : 'bg-terracotta/10 text-terracotta hover:bg-terracotta/20'
                    }`}
                    data-testid="toggle-block-form-btn"
                    title={showBlockForm ? 'Cancel' : 'Block new dates'}
                  >
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${showBlockForm ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {showBlockForm && (
                  <form onSubmit={handleBlockDates} className="space-y-4 p-4 bg-stone/50 rounded-2xl border border-sand-100 mb-4 animate-in slide-in-from-top-4 duration-200" data-testid="block-form">
                    <div>
                      <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={blockStart}
                        onChange={(e) => setBlockStart(e.target.value)}
                        min={minDateStr}
                        required
                        className="w-full border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all"
                        data-testid="block-start-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-1">End Date</label>
                      <input
                        type="date"
                        value={blockEnd}
                        onChange={(e) => setBlockEnd(e.target.value)}
                        min={blockStart || minDateStr}
                        required
                        className="w-full border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all"
                        data-testid="block-end-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-1">Reason (If Applicable)</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Maintenance, personal use, etc."
                        className="w-full border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all"
                        data-testid="block-reason-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-terracotta text-white rounded-xl font-bold text-sm hover:bg-terracotta-dark active:scale-[0.98] transition-all shadow-subtle shadow-terracotta/15 disabled:opacity-50"
                      data-testid="submit-block-btn"
                    >
                      {submitting ? 'Blocking…' : 'Block Dates'}
                    </button>
                  </form>
                )}

                <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1" data-testid="blocked-dates-list">
                  {allManualBlocks.length === 0 && (
                    <div className="text-center py-6 bg-stone/50 rounded-2xl border border-dashed border-gray-100">
                      <p className="text-xs text-charcoal-light">No manual blocks yet.</p>
                    </div>
                  )}
                  {allManualBlocks.map((blk) => (
                    <div
                      key={blk.blocked_date_id}
                      className="flex items-center justify-between border border-sand-100 rounded-2xl p-3 bg-stone/30 hover:bg-stone transition-colors group"
                      data-testid={`blocked-${blk.blocked_date_id}`}
                    >
                      <button
                        type="button"
                        className="text-left flex-1"
                        onClick={() => {
                          const [yr, mo] = blk.start_date.split('-').map((n) => parseInt(n, 10));
                          setMonth(mo);
                          setYear(yr);
                        }}
                        title="Jump to this month"
                      >
                        <div className="font-bold text-sm text-charcoal group-hover:text-terracotta transition-colors">
                          {blk.start_date} → {blk.end_date}
                        </div>
                        {blk.reason && (
                          <div className="text-xs text-charcoal-light mt-0.5">{blk.reason}</div>
                        )}
                      </button>
                      <button
                        onClick={() => handleUnblock({ source: 'manual', blocked_date_id: blk.blocked_date_id })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Unblock"
                        data-testid={`unblock-${blk.blocked_date_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* X-Space360 iCal Feed */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-charcoal">X-Space360 iCal Link</h3>
                    <p className="text-xs text-charcoal-light">Paste this link on Airbnb, Vrbo, etc.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-green-50 text-green-700">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-100 bg-stone/50 p-3">
                    <input
                      type="text"
                      value={icalFeedUrl}
                      readOnly
                      className="w-full bg-transparent text-xs text-charcoal font-semibold outline-none truncate"
                      data-testid="ical-feed-url-input"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={copyICalFeedUrl}
                      disabled={!icalFeedUrl}
                      className="py-3 bg-terracotta text-white rounded-xl font-bold text-sm hover:bg-terracotta-dark active:scale-[0.98] transition-all shadow-subtle shadow-terracotta/15 disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="copy-ical-feed-btn"
                    >
                      {copiedFeedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedFeedUrl ? 'Copied' : 'Copy Link'}
                    </button>
                    <button
                      type="button"
                      onClick={rotateICalFeedUrl}
                      disabled={!icalFeedUrl}
                      className="py-3 bg-white border border-gray-100 text-charcoal rounded-xl font-bold text-sm hover:text-terracotta hover:border-terracotta active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="rotate-ical-feed-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                      New Link
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-charcoal-light">
                    This feed includes confirmed X-Space360 bookings and manual blocks. External calendar blocks are not re-exported to avoid sync loops.
                  </p>
                </div>
              </div>

              {/* External Calendars */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-charcoal">External Calendars (iCal)</h3>
                    <p className="text-xs text-charcoal-light">Sync with Airbnb, Vrbo, etc.</p>
                  </div>
                  <button
                    onClick={() => setShowExternalForm((v) => !v)}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                      showExternalForm 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                        : 'bg-gray-50 text-charcoal hover:bg-sand-200'
                    }`}
                    data-testid="toggle-external-form-btn"
                    title={showExternalForm ? 'Cancel' : 'Add Calendar'}
                  >
                    <LinkIcon className={`w-5 h-5 transition-transform duration-300 ${showExternalForm ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {showExternalForm && (
                  <form onSubmit={handleAddExternal} className="space-y-4 p-4 bg-stone/50 rounded-2xl border border-sand-100 mb-4 animate-in slide-in-from-top-4 duration-200" data-testid="external-form">
                    <input
                      type="text"
                      value={extName}
                      onChange={(e) => setExtName(e.target.value)}
                      placeholder="Source name (e.g. Airbnb)"
                      required
                      className="w-full border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all"
                      data-testid="ext-name-input"
                    />
                    <input
                      type="text"
                      value={extUrl}
                      onChange={(e) => setExtUrl(e.target.value)}
                      placeholder="https://… .ics URL"
                      required
                      className="w-full border border-gray-100 rounded-xl px-3.5 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all"
                      data-testid="ext-url-input"
                    />
                    <div>
                      <label className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-light block mb-1">Calendar Color</label>
                      <input
                        type="color"
                        value={extColor}
                        onChange={(e) => setExtColor(e.target.value)}
                        className="w-full h-10 border border-gray-100 rounded-xl cursor-pointer bg-white"
                        data-testid="ext-color-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-terracotta text-white rounded-xl font-bold text-sm hover:bg-terracotta-dark active:scale-[0.98] transition-all shadow-subtle shadow-terracotta/15 disabled:opacity-50"
                      data-testid="submit-external-btn"
                    >
                      {submitting ? 'Adding…' : 'Add Calendar'}
                    </button>
                  </form>
                )}

                <div className="mt-4 space-y-3" data-testid="external-list">
                  {externalCalendars.length === 0 && (
                    <div className="text-center py-6 bg-stone/50 rounded-2xl border border-dashed border-gray-100">
                      <p className="text-xs text-charcoal-light">No external calendars added.</p>
                    </div>
                  )}
                  {externalCalendars.map((c) => (
                    <div
                      key={c.calendar_id}
                      className="border border-sand-150 rounded-2xl p-4 bg-stone/30 hover:bg-stone transition-colors group"
                      data-testid={`ext-cal-${c.calendar_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-md shadow-sm"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-sm font-bold text-charcoal">{c.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleSyncExternal(c.calendar_id)}
                            className="p-1.5 text-charcoal-light hover:text-terracotta hover:bg-white rounded-lg shadow-sm transition-colors active:scale-95"
                            title="Sync now"
                            data-testid={`sync-${c.calendar_id}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveExternal(c.calendar_id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                            title="Remove"
                            data-testid={`remove-${c.calendar_id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] font-bold tracking-tight uppercase tracking-wider flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full ${
                            c.sync_status === 'success'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : c.sync_status === 'failed'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          }`}
                        >
                          {c.sync_status}
                        </span>
                        {c.last_synced_at && (
                          <span className="text-charcoal-light font-medium normal-case tracking-normal">
                            Synced {new Date(c.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {c.sync_error && (
                        <div className="text-[10px] text-red-600 mt-1.5 bg-red-50/50 p-1.5 rounded-lg truncate border border-red-50" title={c.sync_error}>
                          {c.sync_error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostCalendar;
