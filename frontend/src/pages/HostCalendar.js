import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  manual: { label: 'Blocked', color: '#EF4444', bg: 'bg-red-100', text: 'text-red-700' },
  booking: { label: 'Booked', color: '#10B981', bg: 'bg-green-100', text: 'text-green-700' },
  external: { label: 'External', color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700' },
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
  const { user, logout } = useAuth();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
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

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchUnifiedView();
      fetchAllManualBlocks();
      fetchExternalCalendars();
    }
  }, [selectedPropertyId, month, year]);

  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.getHostProperties();
      const list = res.data.properties || [];
      setProperties(list);
      if (list.length && !selectedPropertyId) {
        setSelectedPropertyId(list[0].property_id);
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
    setSubmitting(true);
    setError('');
    try {
      await calendarAPI.addExternalCalendar(selectedPropertyId, {
        name: extName,
        ical_url: extUrl,
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
    <div className="min-h-screen bg-sand-50">
      <header className="header-glass px-6 py-4" data-testid="host-calendar-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-terracotta" />
            <h1 className="text-xl font-bold text-charcoal">Golden-X-Host - Calendar</h1>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-4xl font-extrabold text-charcoal" data-testid="calendar-title">
              Property Calendar
            </h2>
            <p className="text-charcoal-light mt-1">
              Manage availability, block dates, and sync external calendars.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-white"
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
            <button
              onClick={handleExportICal}
              disabled={!selectedPropertyId}
              className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
              data-testid="export-ical-btn"
            >
              <Download className="w-4 h-4" />
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
            <div className="lg:col-span-2 dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-lg hover:bg-sand-100"
                  data-testid="cal-prev-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold text-charcoal" data-testid="cal-month-label">
                  {MONTH_NAMES[month - 1]} {year}
                </h3>
                <button
                  onClick={goNext}
                  className="p-2 rounded-lg hover:bg-sand-100"
                  data-testid="cal-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-charcoal-light mb-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {loading ? (
                <div className="py-12 text-center text-charcoal-light">Loading…</div>
              ) : (
                <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
                  {cells.map((d, idx) => {
                    if (!d) return <div key={idx} className="h-20" />;
                    const dayEvents = eventsForDay(d);
                    const isToday = toISO(d) === toISO(new Date());
                    return (
                      <div
                        key={idx}
                        className={`h-20 border rounded-md p-1 text-left flex flex-col ${
                          isToday ? 'border-terracotta border-2' : 'border-sand-200'
                        }`}
                        data-testid={`day-${toISO(d)}`}
                      >
                        <div className="text-xs font-bold text-charcoal">{d.getDate()}</div>
                        <div className="flex-1 overflow-hidden mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div
                              key={ev.event_id + toISO(d)}
                              className="text-[10px] px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: ev.color + '33', color: ev.color }}
                              title={`${SOURCE_LABELS[ev.source]?.label}: ${ev.start_date} → ${ev.end_date}`}
                            >
                              {SOURCE_LABELS[ev.source]?.label || ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-charcoal-light">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-charcoal-light">
                <span className="flex items-center"><span className="w-3 h-3 rounded mr-1.5 bg-green-500" />Booked</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded mr-1.5 bg-red-500" />Manually Blocked</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded mr-1.5 bg-amber-500" />External Calendar</span>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Block Dates */}
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-charcoal">Block Dates</h3>
                  <button
                    onClick={() => setShowBlockForm((v) => !v)}
                    className="btn-primary text-sm flex items-center space-x-1"
                    data-testid="toggle-block-form-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showBlockForm ? 'Cancel' : 'New'}</span>
                  </button>
                </div>

                {showBlockForm && (
                  <form onSubmit={handleBlockDates} className="space-y-3" data-testid="block-form">
                    <div>
                      <label className="text-xs text-charcoal-light">Start Date</label>
                      <input
                        type="date"
                        value={blockStart}
                        onChange={(e) => setBlockStart(e.target.value)}
                        min={minDateStr}
                        required
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        data-testid="block-start-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-charcoal-light">End Date</label>
                      <input
                        type="date"
                        value={blockEnd}
                        onChange={(e) => setBlockEnd(e.target.value)}
                        min={blockStart || minDateStr}
                        required
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        data-testid="block-end-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-charcoal-light">Reason (optional)</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Maintenance, personal use, etc."
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        data-testid="block-reason-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full disabled:opacity-50"
                      data-testid="submit-block-btn"
                    >
                      {submitting ? 'Blocking…' : 'Block Dates'}
                    </button>
                  </form>
                )}

                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto" data-testid="blocked-dates-list">
                  {allManualBlocks.length === 0 && (
                    <p className="text-sm text-charcoal-light">No manual blocks yet.</p>
                  )}
                  {allManualBlocks.map((blk) => (
                    <div
                      key={blk.blocked_date_id}
                      className="flex items-center justify-between border border-sand-200 rounded-lg p-2"
                      data-testid={`blocked-${blk.blocked_date_id}`}
                    >
                      <button
                        type="button"
                        className="text-sm text-left flex-1"
                        onClick={() => {
                          const [yr, mo] = blk.start_date.split('-').map((n) => parseInt(n, 10));
                          setMonth(mo);
                          setYear(yr);
                        }}
                        title="Jump to this month"
                      >
                        <div className="font-semibold text-charcoal">
                          {blk.start_date} → {blk.end_date}
                        </div>
                        {blk.reason && (
                          <div className="text-xs text-charcoal-light">{blk.reason}</div>
                        )}
                      </button>
                      <button
                        onClick={() => handleUnblock({ source: 'manual', blocked_date_id: blk.blocked_date_id })}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Unblock"
                        data-testid={`unblock-${blk.blocked_date_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* External Calendars */}
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-charcoal">External Calendars (iCal)</h3>
                  <button
                    onClick={() => setShowExternalForm((v) => !v)}
                    className="btn-secondary text-sm flex items-center space-x-1"
                    data-testid="toggle-external-form-btn"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>{showExternalForm ? 'Cancel' : 'Add'}</span>
                  </button>
                </div>

                {showExternalForm && (
                  <form onSubmit={handleAddExternal} className="space-y-3" data-testid="external-form">
                    <input
                      type="text"
                      value={extName}
                      onChange={(e) => setExtName(e.target.value)}
                      placeholder="Source name (e.g. Airbnb)"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      data-testid="ext-name-input"
                    />
                    <input
                      type="url"
                      value={extUrl}
                      onChange={(e) => setExtUrl(e.target.value)}
                      placeholder="https://… .ics URL"
                      required
                      className="w-full border rounded-lg px-3 py-2"
                      data-testid="ext-url-input"
                    />
                    <input
                      type="color"
                      value={extColor}
                      onChange={(e) => setExtColor(e.target.value)}
                      className="w-full h-10 border rounded-lg cursor-pointer"
                      data-testid="ext-color-input"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full disabled:opacity-50"
                      data-testid="submit-external-btn"
                    >
                      {submitting ? 'Adding…' : 'Add Calendar'}
                    </button>
                  </form>
                )}

                <div className="mt-4 space-y-2" data-testid="external-list">
                  {externalCalendars.length === 0 && (
                    <p className="text-sm text-charcoal-light">No external calendars added.</p>
                  )}
                  {externalCalendars.map((c) => (
                    <div
                      key={c.calendar_id}
                      className="border border-sand-200 rounded-lg p-2"
                      data-testid={`ext-cal-${c.calendar_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-sm font-semibold text-charcoal">{c.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleSyncExternal(c.calendar_id)}
                            className="p-1 text-charcoal-light hover:bg-sand-100 rounded"
                            title="Sync now"
                            data-testid={`sync-${c.calendar_id}`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveExternal(c.calendar_id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                            data-testid={`remove-${c.calendar_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            c.sync_status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : c.sync_status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {c.sync_status}
                        </span>
                        {c.last_synced_at && (
                          <span className="text-charcoal-light">
                            {new Date(c.last_synced_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {c.sync_error && (
                        <div className="text-xs text-red-600 mt-1 truncate" title={c.sync_error}>
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
