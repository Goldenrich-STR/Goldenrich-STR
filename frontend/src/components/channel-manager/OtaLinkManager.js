import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import PropertySelect from './PropertySelect';
import { channelManagerApi } from './channelManagerApi';

const PLATFORMS = ['Airbnb', 'Booking.com', 'MakeMyTrip', 'Agoda', 'Vrbo', 'Custom iCal'];
const FREQUENCIES = ['Every 15 minutes', 'Every 30 minutes', 'Hourly', 'Every 6 hours', 'Daily'];
const MODAL_PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 50;
const PLATFORM_META = {
  Airbnb: { mark: 'A', tone: 'bg-rose-50 text-rose-600 border-rose-200' },
  'Booking.com': { mark: 'B.', tone: 'bg-blue-950 text-white border-blue-950' },
  MakeMyTrip: { mark: 'my', tone: 'bg-red-600 text-white border-red-600' },
  Agoda: { mark: 'ag', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  Vrbo: { mark: 'V', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  'Custom iCal': { mark: 'iC', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const emptyForm = (propertyId = '') => ({
  provider: 'Airbnb',
  propertyId,
  name: 'Airbnb',
  icalUrl: '',
  frequency: 'Every 30 minutes',
});

export default function OtaLinkManager({ properties, propertyId, setPropertyId, notify }) {
  const [links, setLinks] = useState([]);
  const [allIntegrations, setAllIntegrations] = useState([]);
  const [feedUrls, setFeedUrls] = useState({});
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [retryingFeedId, setRetryingFeedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(propertyId));
  const [copiedPropertyId, setCopiedPropertyId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [propertySearch, setPropertySearch] = useState('');
  const [exportPage, setExportPage] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [modalPropertySearch, setModalPropertySearch] = useState('');
  const [modalCategory, setModalCategory] = useState('all');
  const [modalPropertyType, setModalPropertyType] = useState('all');
  const [modalCity, setModalCity] = useState('all');
  const [modalStatus, setModalStatus] = useState('all');
  const [modalPage, setModalPage] = useState(0);
  const [historyOta, setHistoryOta] = useState('all');
  const [historyProperty, setHistoryProperty] = useState('');
  const [historyCategory, setHistoryCategory] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  const cleanLabel = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const categories = useMemo(() => Array.from(new Set(properties.map((property) => property.category).filter(Boolean))).sort(), [properties]);
  const propertyTypes = useMemo(() => Array.from(new Set(properties.map((property) => property.property_type || property.bhk_type).filter(Boolean))).sort(), [properties]);
  const cities = useMemo(() => Array.from(new Set(properties.map((property) => property.city).filter(Boolean))).sort(), [properties]);
  const propertyStatuses = useMemo(() => Array.from(new Set(properties.map((property) => property.status).filter(Boolean))).sort(), [properties]);
  const filteredExportProperties = useMemo(() => properties.filter((property) => {
    if (categoryFilter !== 'all' && property.category !== categoryFilter) return false;
    if (typeFilter !== 'all' && (property.property_type || property.bhk_type) !== typeFilter) return false;
    const haystack = `${property.name} ${property.location} ${property.id} ${property.category || ''} ${property.property_type || property.bhk_type || ''}`.toLowerCase();
    return !propertySearch.trim() || haystack.includes(propertySearch.trim().toLowerCase());
  }), [categoryFilter, properties, propertySearch, typeFilter]);
  const exportPageCount = Math.max(Math.ceil(filteredExportProperties.length / EXPORT_PAGE_SIZE), 1);
  const visibleExportProperties = useMemo(
    () => filteredExportProperties.slice(exportPage * EXPORT_PAGE_SIZE, (exportPage + 1) * EXPORT_PAGE_SIZE),
    [exportPage, filteredExportProperties]
  );
  const hasLocalExportFeed = visibleExportProperties.some((property) => (
    /https?:\/\/(localhost|127\.0\.0\.1)(?::|\/)/i.test(feedUrls[property.id] || '')
  ));
  const filteredLinks = useMemo(() => links.filter((link) => (
    selectedPlatform === 'all'
    || String(link.provider || 'Custom iCal').toLowerCase() === selectedPlatform.toLowerCase()
  )), [links, selectedPlatform]);
  const modalFilteredProperties = useMemo(() => properties.filter((property) => {
    if (modalCategory !== 'all' && property.category !== modalCategory) return false;
    if (modalPropertyType !== 'all' && (property.property_type || property.bhk_type) !== modalPropertyType) return false;
    if (modalCity !== 'all' && property.city !== modalCity) return false;
    if (modalStatus !== 'all' && property.status !== modalStatus) return false;
    const haystack = `${property.name} ${property.location} ${property.id} ${property.category || ''} ${property.property_type || property.bhk_type || ''}`.toLowerCase();
    return !modalPropertySearch.trim() || haystack.includes(modalPropertySearch.trim().toLowerCase());
  }), [modalCategory, modalCity, modalPropertySearch, modalPropertyType, modalStatus, properties]);
  const modalPageCount = Math.max(Math.ceil(modalFilteredProperties.length / MODAL_PAGE_SIZE), 1);
  const modalPageProperties = modalFilteredProperties.slice(modalPage * MODAL_PAGE_SIZE, (modalPage + 1) * MODAL_PAGE_SIZE);
  const selectedModalProperty = properties.find((property) => property.id === form.propertyId);
  const modalSelectProperties = selectedModalProperty && !modalPageProperties.some((property) => property.id === selectedModalProperty.id)
    ? [selectedModalProperty, ...modalPageProperties]
    : modalPageProperties;
  const propertyById = useMemo(() => Object.fromEntries(properties.map((property) => [property.id, property])), [properties]);
  const filteredIntegrationHistory = useMemo(() => allIntegrations.filter((integration) => {
    const integrationProperty = propertyById[integration.property_id] || {};
    const provider = integration.provider || 'Custom iCal';
    if (historyOta !== 'all' && provider !== historyOta) return false;
    const propertyHaystack = `${integrationProperty.name || ''} ${integrationProperty.location || ''} ${integration.property_id || ''}`.toLowerCase();
    if (historyProperty.trim() && !propertyHaystack.includes(historyProperty.trim().toLowerCase())) return false;
    if (historyCategory !== 'all' && integrationProperty.category !== historyCategory) return false;
    const haystack = `${integration.name || ''} ${provider} ${integration.property_id || ''} ${integrationProperty.name || ''} ${integrationProperty.location || ''} ${integrationProperty.category || ''} ${integrationProperty.property_type || ''}`.toLowerCase();
    return !historySearch.trim() || haystack.includes(historySearch.trim().toLowerCase());
  }), [allIntegrations, historyCategory, historyOta, historyProperty, historySearch, propertyById]);

  const load = useCallback(async () => {
    if (!propertyId) {
      setLinks([]);
      return;
    }
    setBusy(true);
    try {
      setLinks(await channelManagerApi.integrations(propertyId));
    } catch (error) {
      notify(error?.response?.data?.detail || 'OTA integrations could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  }, [notify, propertyId]);

  useEffect(() => { load(); }, [load]);

  const loadPlatformSummary = useCallback(async () => {
    try {
      setAllIntegrations(await channelManagerApi.allIntegrations());
    } catch (error) {
      notify(error?.response?.data?.detail || 'OTA channel summary could not be loaded.', 'error');
    }
  }, [notify]);

  useEffect(() => { loadPlatformSummary(); }, [loadPlatformSummary]);

  useEffect(() => {
    setModalPage(0);
  }, [modalCategory, modalCity, modalPropertySearch, modalPropertyType, modalStatus]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!modalFilteredProperties.length) {
      setForm((current) => ({ ...current, propertyId: '' }));
      return;
    }
    if (!modalFilteredProperties.some((property) => property.id === form.propertyId)) {
      setForm((current) => ({ ...current, propertyId: modalFilteredProperties[0].id }));
    }
  }, [form.propertyId, modalFilteredProperties, modalOpen]);

  const loadPropertyFeeds = useCallback(async () => {
    if (!visibleExportProperties.length) {
      setFeedsLoading(false);
      return;
    }
    setFeedsLoading(true);
    try {
      const result = await channelManagerApi.exportFeeds(visibleExportProperties.map((property) => property.id));
      setFeedUrls((current) => ({ ...current, ...(result.feed_urls || {}) }));
      if (result.unavailable_property_ids?.length) notify('Some property export links could not be loaded.', 'error');
    } catch (error) {
      notify(error?.response?.data?.detail || 'Property export links could not be loaded.', 'error');
    } finally {
      setFeedsLoading(false);
    }
  }, [notify, visibleExportProperties]);

  useEffect(() => { loadPropertyFeeds(); }, [loadPropertyFeeds]);

  useEffect(() => {
    setExportPage(0);
  }, [categoryFilter, propertySearch, typeFilter]);

  const openModal = () => {
    setModalPropertySearch('');
    setModalCategory('all');
    setModalPropertyType('all');
    setModalCity('all');
    setModalStatus('all');
    setModalPage(0);
    setForm(emptyForm(propertyId || properties[0]?.id || ''));
    setModalOpen(true);
  };

  const updateProvider = (provider) => setForm((current) => ({
    ...current,
    provider,
    name: current.name === current.provider ? provider : current.name,
  }));

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await channelManagerApi.addIntegration(form.propertyId, {
        name: form.name.trim(),
        ical_url: form.icalUrl.trim(),
        provider: form.provider,
        sync_frequency: form.frequency,
        color: '#2563EB',
      });
      setModalOpen(false);
      setPropertyId(form.propertyId);
      notify(`${form.name} integration added and initial sync started.`, 'success');
      if (form.propertyId === propertyId) await load();
      await loadPlatformSummary();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Integration could not be added.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sync = async (calendarId) => {
    setBusy(true);
    try {
      await channelManagerApi.syncIntegration(calendarId);
      notify('Calendar sync completed.', 'success');
      await load();
      await loadPlatformSummary();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Calendar sync failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (calendarId) => {
    if (!window.confirm('Remove this OTA integration and its imported calendar blocks?')) return;
    setBusy(true);
    try {
      await channelManagerApi.removeIntegration(calendarId);
      notify('OTA integration removed.', 'success');
      await load();
      await loadPlatformSummary();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Integration could not be removed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyFeed = async (targetPropertyId) => {
    const feedUrl = feedUrls[targetPropertyId];
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopiedPropertyId(targetPropertyId);
    window.setTimeout(() => setCopiedPropertyId(''), 1500);
  };

  const retryFeed = async (targetPropertyId) => {
    setRetryingFeedId(targetPropertyId);
    try {
      const feedUrl = await channelManagerApi.exportFeed(targetPropertyId);
      setFeedUrls((current) => ({ ...current, [targetPropertyId]: feedUrl }));
    } catch (error) {
      notify(error?.response?.data?.detail || 'Export link could not be loaded.', 'error');
    } finally {
      setRetryingFeedId('');
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-xl"><PropertySelect properties={properties} value={propertyId} onChange={setPropertyId} /></div>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800" onClick={openModal} type="button"><Plus size={17} />Add New OTA Integration</button>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-black text-slate-950">OTA Channels</h2><p className="mt-1 text-xs text-slate-500">Actual integrations currently added across your properties.</p></div>
          <button className={`h-9 rounded-md border px-3 text-xs font-bold ${selectedPlatform === 'all' ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`} onClick={() => { setSelectedPlatform('all'); setHistoryOta('all'); }} type="button">Show all channels</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PLATFORMS.map((platform) => {
            const platformLinks = allIntegrations.filter((integration) => String(integration.provider || 'Custom iCal').toLowerCase() === platform.toLowerCase());
            const propertyCount = new Set(platformLinks.map((integration) => integration.property_id)).size;
            const connectedHere = links.some((integration) => String(integration.provider || 'Custom iCal').toLowerCase() === platform.toLowerCase());
            const meta = PLATFORM_META[platform];
            return <button className={`min-h-32 rounded-md border bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm ${selectedPlatform === platform ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'}`} key={platform} onClick={() => { setSelectedPlatform(platform); setHistoryOta(platform); }} type="button"><span className={`grid h-9 w-9 place-items-center rounded-md border text-xs font-black ${meta.tone}`}>{meta.mark}</span><strong className="mt-3 block text-sm text-slate-950">{platform}</strong><span className="mt-1 block text-xs text-slate-500">{platformLinks.length} integration{platformLinks.length === 1 ? '' : 's'} / {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'}</span><span className={`mt-2 inline-block text-[10px] font-bold uppercase ${connectedHere ? 'text-emerald-700' : 'text-slate-400'}`}>{connectedHere ? 'Connected to selected property' : 'Not connected here'}</span></button>;
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4"><h2 className="text-base font-black text-slate-950">Connected OTA Integration History</h2><p className="mt-1 text-xs text-slate-500">Track which OTA was added for each property and why it was labelled that way.</p></div>
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">OTA Platform</span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold" onChange={(event) => setHistoryOta(event.target.value)} value={historyOta}><option value="all">All OTAs</option>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Property Name / ID</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-600" onChange={(event) => setHistoryProperty(event.target.value)} placeholder="Filter by property" value={historyProperty} /></span></label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Category</span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold" onChange={(event) => setHistoryCategory(event.target.value)} value={historyCategory}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{cleanLabel(category)}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Integration Label / Purpose</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-600" onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search label or OTA" value={historySearch} /></span></label>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Property</th><th className="px-4 py-3">Category / Type</th><th className="px-4 py-3">OTA</th><th className="px-4 py-3">Integration Label / Purpose</th><th className="px-4 py-3">Added</th><th className="px-4 py-3">Last Sync</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredIntegrationHistory.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan="8">No connected OTA integrations match these filters.</td></tr>}
              {filteredIntegrationHistory.map((integration) => {
                const integrationProperty = propertyById[integration.property_id] || {};
                return <tr key={integration.calendar_id}><td className="px-4 py-3"><p className="max-w-56 truncate font-bold text-slate-900">{integrationProperty.name || integration.property_id}</p><p className="text-xs text-slate-500">{integrationProperty.location || integration.property_id}</p></td><td className="px-4 py-3"><p className="text-xs font-bold">{cleanLabel(integrationProperty.category || 'Uncategorized')}</p><p className="text-xs text-slate-500">{cleanLabel(integrationProperty.property_type || integrationProperty.bhk_type || 'Other')}</p></td><td className="whitespace-nowrap px-4 py-3 font-bold">{integration.provider || 'Custom iCal'}</td><td className="px-4 py-3"><p className="max-w-48 truncate font-semibold" title={integration.name}>{integration.name}</p><p className="text-xs text-slate-500">{integration.sync_frequency || 'Every 30 minutes'}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs">{integration.created_at ? new Date(integration.created_at).toLocaleDateString('en-IN') : '-'}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString('en-IN') : 'Not synced'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${integration.sync_status === 'failed' ? 'bg-red-100 text-red-700' : integration.sync_status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{integration.sync_status || 'pending'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button aria-label="Sync integration" className="grid h-9 w-9 place-items-center rounded-md text-blue-700 hover:bg-blue-50" disabled={busy} onClick={() => sync(integration.calendar_id)} title="Sync now" type="button"><RefreshCw size={16} /></button><button aria-label="Remove integration" className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50" disabled={busy} onClick={() => remove(integration.calendar_id)} title="Remove integration" type="button"><Trash2 size={16} /></button></div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-black text-slate-950">Property-wise Export iCal Links</h2>
          <p className="mt-1 text-xs text-slate-500">Every property has its own unique link. Paste a property's link only into the matching OTA listing.</p>
        </div>
        {hasLocalExportFeed && <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={16} /><span>Localhost links are for local testing only and cannot be reached by an OTA. Copy links from the deployed admin where PUBLIC_BACKEND_URL uses the public HTTPS API domain.</span></div>}
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Category</span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{cleanLabel(category)}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Property Type</span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">All property types</option>{propertyTypes.map((type) => <option key={type} value={type}>{cleanLabel(type)}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Search Property</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-600" onChange={(event) => setPropertySearch(event.target.value)} placeholder="Name, city or property ID" value={propertySearch} /></span></label>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Property / Listing</th><th className="px-4 py-3">Unique Export iCal Link</th><th className="px-4 py-3 text-right">Copy</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredExportProperties.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan="3">No properties match these filters.</td></tr>}
              {visibleExportProperties.map((property) => {
                const propertyFeed = feedUrls[property.id] || '';
                return <tr className={property.id === propertyId ? 'bg-blue-50/50' : ''} key={property.id}><td className="px-4 py-3"><p className="font-bold text-slate-900">{property.name}</p><p className="text-xs text-slate-500">{property.location || property.id}</p><div className="mt-1.5 flex flex-wrap gap-1"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{cleanLabel(property.category || 'Uncategorized')}</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{cleanLabel(property.property_type || property.bhk_type || 'Other')}</span></div></td><td className="min-w-72 px-4 py-3"><input className="h-9 w-full min-w-72 rounded-md border border-slate-300 bg-white px-3 text-xs" placeholder={feedsLoading ? 'Generating property link...' : 'Link unavailable - retry'} readOnly value={propertyFeed} /></td><td className="px-4 py-3 text-right"><button aria-label={`${propertyFeed ? 'Copy' : 'Retry'} export link for ${property.name}`} className="inline-grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40" disabled={feedsLoading || retryingFeedId === property.id} onClick={() => propertyFeed ? copyFeed(property.id) : retryFeed(property.id)} title={propertyFeed ? `Copy ${property.name} export link` : `Retry ${property.name} export link` } type="button">{retryingFeedId === property.id ? <RefreshCw className="animate-spin" size={17} /> : copiedPropertyId === property.id ? <Check size={17} className="text-emerald-600" /> : propertyFeed ? <Copy size={17} /> : <RefreshCw size={17} />}</button></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-500">{filteredExportProperties.length.toLocaleString('en-IN')} properties, showing {visibleExportProperties.length} on this page</p><div className="flex items-center gap-2"><button aria-label="Previous export links page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white disabled:opacity-35" disabled={exportPage === 0} onClick={() => setExportPage((page) => Math.max(page - 1, 0))} title="Previous properties" type="button"><ChevronLeft size={15} /></button><span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {exportPage + 1} of {exportPageCount}</span><button aria-label="Next export links page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white disabled:opacity-35" disabled={exportPage >= exportPageCount - 1} onClick={() => setExportPage((page) => Math.min(page + 1, exportPageCount - 1))} title="Next properties" type="button"><ChevronRight size={15} /></button></div></div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-black text-slate-950">OTA Imports for Selected Property</h2>
          <p className="mt-1 text-xs text-slate-500">These OTA calendar links import reservations into the property selected above.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-[11px] font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Integration</th><th className="px-4 py-3">Import link from OTA</th><th className="px-4 py-3">Frequency</th><th className="px-4 py-3">Last sync</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredLinks.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan="6">No {selectedPlatform === 'all' ? 'OTA' : selectedPlatform} integrations connected for this property.</td></tr>}
              {filteredLinks.map((link) => <tr key={link.calendar_id}><td className="px-4 py-3"><p className="font-bold text-slate-900">{link.name}</p><p className="text-xs text-slate-500">{link.provider || 'Custom iCal'}</p></td><td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600" title={link.ical_url}>{link.ical_url}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{link.sync_frequency || 'Every 30 minutes'}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{link.last_synced_at ? new Date(link.last_synced_at).toLocaleString('en-IN') : 'Not synced'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${link.sync_status === 'success' ? 'bg-emerald-100 text-emerald-700' : link.sync_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{link.sync_status || 'pending'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button aria-label="Sync now" className="grid h-9 w-9 place-items-center rounded-md text-blue-700 hover:bg-blue-50" disabled={busy} onClick={() => sync(link.calendar_id)} title="Sync now" type="button"><RefreshCw className={busy ? 'animate-spin' : ''} size={16} /></button><button aria-label="Remove integration" className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => remove(link.calendar_id)} title="Remove integration" type="button"><Trash2 size={16} /></button></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
        <form className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white shadow-2xl" onSubmit={add}>
          <div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 className="text-xl font-black">Add New OTA Integration</h2><p className="mt-1 text-sm text-slate-500">Connect one property listing using its iCal feed.</p></div><button aria-label="Close" className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100" onClick={() => setModalOpen(false)} type="button"><X size={19} /></button></div>
          <div className="space-y-4 p-5">
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">OTA Platform</span><select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold" onChange={(event) => updateProvider(event.target.value)} value={form.provider}>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
            <fieldset className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <legend className="px-1 text-xs font-bold uppercase text-slate-500">Find Property / Listing</legend>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Search</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-600" onChange={(event) => setModalPropertySearch(event.target.value)} placeholder="Property name, city or ID" value={modalPropertySearch} /></span></label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Category</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" onChange={(event) => setModalCategory(event.target.value)} value={modalCategory}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{cleanLabel(category)}</option>)}</select></label>
                <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Property Type</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" onChange={(event) => setModalPropertyType(event.target.value)} value={modalPropertyType}><option value="all">All types</option>{propertyTypes.map((type) => <option key={type} value={type}>{cleanLabel(type)}</option>)}</select></label>
                <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">City</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" onChange={(event) => setModalCity(event.target.value)} value={modalCity}><option value="all">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Status</span><select className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" onChange={(event) => setModalStatus(event.target.value)} value={modalStatus}><option value="all">All statuses</option>{propertyStatuses.map((status) => <option key={status} value={status}>{cleanLabel(status)}</option>)}</select></label>
              </div>
              <label className="mt-3 block"><span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-slate-600"><span>Property / Listing</span><span className="font-semibold text-slate-500">{modalFilteredProperties.length.toLocaleString('en-IN')} matches</span></span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold" disabled={!modalSelectProperties.length} onChange={(event) => setForm((current) => ({ ...current, propertyId: event.target.value }))} value={form.propertyId}>{!modalSelectProperties.length && <option value="">No matching properties</option>}{modalSelectProperties.map((property) => <option key={property.id} value={property.id}>{property.name}{property.location ? ` - ${property.location}` : ''}</option>)}</select></label>
              <div className="mt-2 flex items-center justify-between"><p className="text-[11px] text-slate-500">Showing up to {MODAL_PAGE_SIZE} properties per page.</p><div className="flex items-center gap-2"><button aria-label="Previous property page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white disabled:opacity-35" disabled={modalPage === 0} onClick={() => setModalPage((page) => Math.max(page - 1, 0))} title="Previous results" type="button"><ChevronLeft size={15} /></button><span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {modalPage + 1} of {modalPageCount}</span><button aria-label="Next property page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white disabled:opacity-35" disabled={modalPage >= modalPageCount - 1} onClick={() => setModalPage((page) => Math.min(page + 1, modalPageCount - 1))} title="Next results" type="button"><ChevronRight size={15} /></button></div></div>
            </fieldset>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Custom Integration Name / Label</span><input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Import iCal Link from OTA</span><input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, icalUrl: event.target.value }))} placeholder="https://.../calendar.ics" required type="url" value={form.icalUrl} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Auto-Sync Frequency</span><select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold" onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))} value={form.frequency}>{FREQUENCIES.map((frequency) => <option key={frequency}>{frequency}</option>)}</select></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4"><button className="h-10 rounded-md px-4 text-sm font-bold text-slate-600 hover:bg-white" onClick={() => setModalOpen(false)} type="button">Cancel</button><button className="h-10 rounded-md bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !form.propertyId} type="submit">Connect & Sync</button></div>
        </form>
      </div>}
    </div>
  );
}
