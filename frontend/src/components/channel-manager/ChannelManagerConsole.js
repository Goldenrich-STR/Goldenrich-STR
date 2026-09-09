import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CalendarRange, Link2, RefreshCw, Wifi } from 'lucide-react';
import AvailabilityTab from './AvailabilityTab';
import CalendarTab from './CalendarTab';
import HowItWorksGuide from './HowItWorksGuide';
import OtaLinkManager from './OtaLinkManager';
import ReservationsTab from './ReservationsTab';
import { channelManagerApi } from './channelManagerApi';

const tabs = [
  ['reservations', 'Reservations', CalendarRange],
  ['calendar', 'Calendar', CalendarDays],
  ['availability', 'Availability', Wifi],
  ['integrations', 'OTA Integrations', Link2],
  ['guide', 'How It Works', BookOpen],
];

export default function ChannelManagerConsole() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProperties, nextReservations] = await Promise.all([
        channelManagerApi.properties(),
        channelManagerApi.reservations(),
      ]);
      setProperties(nextProperties);
      setReservations(nextReservations);
      setPropertyId((current) => nextProperties.some((property) => property.id === current) ? current : (nextProperties[0]?.id || ''));
    } catch (error) {
      notify(error?.response?.data?.detail || 'Channel Manager data could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    properties: properties.length,
    reservations: reservations.filter((booking) => ['confirmed', 'soft_lock', 'pending'].includes(String(booking.booking_status || '').toLowerCase())).length,
    ota: reservations.filter((booking) => !['direct', 'website', 'web', 'mobile', 'x-space360', 'xspace360'].includes(String(booking.booking_source || booking.source || 'direct').toLowerCase())).length,
  }), [properties, reservations]);

  return <div className="min-w-0 space-y-5">
    {notice && <div className={`fixed right-5 top-20 z-[10000] max-w-sm rounded-md border px-4 py-3 text-sm font-bold shadow-lg ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">{notice.message}</div>}
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-blue-700">Channel Manager</p><h1 className="mt-1 text-3xl font-black text-slate-950">Property Channel Console</h1><p className="mt-1 text-sm text-slate-600">Manage direct and OTA reservations, occupancy, and 2-way calendar links for standalone properties.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50 disabled:opacity-50" disabled={loading} onClick={load} type="button"><RefreshCw className={loading ? 'animate-spin' : ''} size={17} />Refresh All</button></header>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Properties / Listings</p><p className="mt-2 text-3xl font-black">{metrics.properties}</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Active Reservations</p><p className="mt-2 text-3xl font-black">{metrics.reservations}</p></div><div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">OTA Reservations</p><p className="mt-2 text-3xl font-black">{metrics.ota}</p></div></section>

    <nav className="flex min-w-0 gap-1 overflow-x-auto border-b border-slate-300" aria-label="Channel Manager sections">{tabs.map(([key, label, Icon]) => <button className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold ${activeTab === key ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-950'}`} key={key} onClick={() => setActiveTab(key)} type="button"><Icon size={16} />{label}</button>)}</nav>

    {loading && !properties.length ? <div className="rounded-md border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">Loading properties and reservations...</div> : !properties.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">No properties are registered in the main property database.</div> : <>
      {activeTab === 'reservations' && <ReservationsTab properties={properties} reservations={reservations} reload={load} propertyId={propertyId} setPropertyId={setPropertyId} notify={notify} />}
      {activeTab === 'calendar' && <CalendarTab properties={properties} propertyId={propertyId} setPropertyId={setPropertyId} notify={notify} />}
      {activeTab === 'availability' && <AvailabilityTab properties={properties} propertyId={propertyId} setPropertyId={setPropertyId} notify={notify} />}
      {activeTab === 'integrations' && <OtaLinkManager properties={properties} propertyId={propertyId} setPropertyId={setPropertyId} notify={notify} />}
      {activeTab === 'guide' && <HowItWorksGuide />}
    </>}
  </div>;
}
