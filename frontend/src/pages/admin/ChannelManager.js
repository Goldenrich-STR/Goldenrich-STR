import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  GitBranch,
  Radio,
  RefreshCw,
  Search,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney } from './shared';

const tabs = [
  ['overview', 'Overview'],
  ['architecture', 'Architecture'],
  ['propertiesUnits', 'Properties & Units'],
  ['calendar', 'Unified Calendar'],
  ['channels', 'Channels'],
  ['connections', 'Connections'],
  ['mapping', 'Property Mapping'],
  ['rates', 'Rate Plans'],
  ['availability', 'Availability'],
  ['reservations', 'Reservation Flow'],
  ['sync', 'Sync Activity'],
  ['failed', 'Failed Syncs'],
  ['dlq', 'Dead Letter Queue'],
  ['reconciliation', 'Reconciliation'],
  ['certification', 'Certification'],
  ['audit', 'Audit Trail'],
  ['health', 'Integration Health'],
  ['apiContracts', 'API Contracts'],
  ['settings', 'Settings'],
];

const channelRows = [
  { code: 'XSPACE360_WEB', name: 'XSpace360 Direct Website', type: 'direct', status: 'connected', adapter: 'native_direct', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: true, listingImport: true, iCalImport: false, iCalExport: true },
  { code: 'XSPACE360_MOBILE', name: 'XSpace360 Mobile Application', type: 'direct', status: 'ready', adapter: 'native_mobile', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: true, listingImport: true, iCalImport: false, iCalExport: true },
  { code: 'AIRBNB', name: 'Airbnb', type: 'ota', status: 'mapping_pending', adapter: 'airbnb_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: true, iCalExport: true },
  { code: 'BOOKING_COM', name: 'Booking.com', type: 'ota', status: 'mapping_pending', adapter: 'booking_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'ICAL', name: 'Generic iCal Import/Export', type: 'calendar', status: 'ready', adapter: 'ical_adapter', reservations: true, availabilityPush: false, ratesPush: false, restrictionsPush: false, webhooks: false, contentPush: false, listingImport: false, iCalImport: true, iCalExport: true },
  { code: 'AGODA', name: 'Agoda', type: 'future_ota', status: 'not_connected', adapter: 'agoda_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'EXPEDIA', name: 'Expedia', type: 'future_ota', status: 'not_connected', adapter: 'expedia_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'MAKEMYTRIP', name: 'MakeMyTrip', type: 'future_ota', status: 'not_connected', adapter: 'makemytrip_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: false, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'GOIBIBO', name: 'Goibibo', type: 'future_ota', status: 'not_connected', adapter: 'goibibo_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: false, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'TRIP_COM', name: 'Trip.com', type: 'future_ota', status: 'not_connected', adapter: 'trip_com_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: false, iCalExport: false },
  { code: 'VRBO', name: 'Vrbo', type: 'future_ota', status: 'not_connected', adapter: 'vrbo_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: true, webhooks: true, contentPush: false, listingImport: true, iCalImport: true, iCalExport: true },
  { code: 'GOOGLE_VACATION_RENTALS', name: 'Google Vacation Rentals', type: 'future_ota', status: 'not_connected', adapter: 'google_vacation_rentals_adapter', reservations: true, availabilityPush: true, ratesPush: true, restrictionsPush: false, webhooks: true, contentPush: true, listingImport: true, iCalImport: false, iCalExport: false },
];

const domainEntities = [
  'properties', 'units', 'rate_plans', 'rate_overrides', 'restrictions', 'reservations',
  'calendar_event_store', 'availability_projections', 'channels', 'channel_connections',
  'channel_credentials', 'channel_mappings', 'channel_sync_jobs', 'channel_sync_attempts',
  'channel_sync_logs', 'channel_certification_ledger', 'external_reservations',
  'webhook_events', 'owner_blocks', 'maintenance_blocks', 'audit_logs',
  'integration_health_logs', 'dead_letter_jobs',
];

const eventTypes = [
  'BookingRequested', 'BookingHeld', 'PaymentConfirmed', 'BookingConfirmed', 'BookingCancelled',
  'OwnerBlockAdded', 'OwnerBlockRemoved', 'MaintenanceBlockAdded', 'MaintenanceReleased',
  'ExternalReservationReceived', 'ExternalReservationModified', 'ExternalReservationCancelled',
  'RateUpdated', 'RestrictionUpdated', 'ChannelConnected', 'ChannelDisconnected',
  'ListingMapped', 'ListingUnmapped',
];

const conflictPriority = ['Confirmed reservation', 'Website soft hold', 'Owner stay', 'Maintenance interrupt', 'OTA sync event'];
const retrySchedule = ['5 seconds', '30 seconds', '2 minutes', '10 minutes', '30 minutes'];
const syncTypes = ['Availability', 'Rate', 'Restriction', 'Reservation', 'Cancellation', 'Content', 'Mapping', 'Full Sync'];
const syncStatuses = ['Pending', 'Processing', 'Success', 'Failed', 'Retrying', 'Dead Letter', 'Cancelled'];
const certificationStages = ['Created', 'Configured', 'Credential Verified', 'Sandbox Certified', 'Production Certified', 'Active'];
const calendarStates = ['Available', 'Held', 'Reserved', 'Owner Block', 'Maintenance', 'External Block', 'Unavailable'];
const rateControls = ['Base Rate', 'Weekend Rate', 'Date Specific Rate', 'Seasonal Rate', 'Holiday Rate', 'Minimum Stay', 'Maximum Stay', 'Closed To Arrival', 'Closed To Departure', 'Occupancy Rules', 'Extra Guest Charge', 'Cleaning Fee', 'Taxes', 'Discounts'];
const apiContracts = [
  ['GET', '/api/v1/channels', 'List central channel registry'],
  ['POST', '/api/v1/channel-connections', 'Create host/property channel connection'],
  ['GET', '/api/v1/channel-connections/:id', 'Inspect credential, health and certification state'],
  ['POST', '/api/v1/channel-mappings', 'Map internal property/unit/rate plan to external listing'],
  ['POST', '/api/v1/channels/:channelCode/webhook', 'Receive OTA webhook payloads'],
  ['POST', '/api/v1/sync-jobs/:id/retry', 'Retry failed outbound/inbound sync job'],
  ['POST', '/api/v1/reconciliation/run', 'Run manual channel reconciliation'],
  ['GET', '/api/v1/channel-certifications', 'Review sandbox and production certification ledger'],
];
const roleCapabilities = [
  ['Super Admin', 'Global registry, connection, certification, reconciliation and settings access'],
  ['Operations Admin', 'Mapping, sync activity, failed jobs and reservation recovery'],
  ['Finance Admin', 'Rate plan, tax, commission and payout-impacting channel controls'],
  ['Host', 'View own connected channels and mapping status only'],
  ['Broker / RM', 'View assigned host/property channel readiness and verification status'],
];
const phaseRoadmap = [
  ['Phase 1', 'Admin console, registry view, readiness and audit surface'],
  ['Phase 2', 'Unified Calendar event store and availability projections'],
  ['Phase 3', 'Direct website/mobile reservation sync with soft holds'],
  ['Phase 4', 'iCal import/export and reconciliation'],
  ['Phase 5', 'OTA adapters, certification, retry engine and DLQ'],
];

const safeText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.title) return String(value.title);
    if (value.label) return String(value.label);
    if (value.code) return String(value.code);
    return JSON.stringify(value);
  }
  return String(value);
};

const normalizeStatus = (value) => safeText(value, 'unknown').toLowerCase().replace(/\s+/g, '_');

const StatCard = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-[#eef4ff] text-[#2563eb]',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-50 text-slate-600',
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
        </div>
        <span className={`rounded-2xl p-3 ${tones[tone] || tones.blue}`}><Icon className="h-5 w-5" /></span>
      </div>
    </Panel>
  );
};

const SectionTitle = ({ eyebrow, title, description }) => (
  <div className="border-b border-slate-100 px-4 py-4">
    {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d9b12f]">{eyebrow}</p>}
    <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">{title}</h2>
    {description && <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>}
  </div>
);

const DataTable = ({ columns, rows, empty }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row, index) => (
          <tr key={row.id || row.property_id || row.booking_id || row.audit_id || index} className="align-top hover:bg-slate-50/70">
            {columns.map((column) => (
              <td key={column.key} className="px-4 py-3 font-semibold text-slate-700">
                {column.render ? column.render(row) : safeText(row[column.key])}
              </td>
            ))}
          </tr>
        )) : (
          <tr><td className="px-4 py-8 text-center font-semibold text-slate-400" colSpan={columns.length}>{empty || 'No records available'}</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const ChannelManager = () => {
  const [active, setActive] = useState('overview');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', dashboard: null, properties: [], bookings: [], audits: [] });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: '' }));
      const [dashboardRes, propertiesRes, bookingsRes, auditRes] = await Promise.allSettled([
        adminPhase1API.dashboard(),
        adminPhase1API.propertyOperations({ tab: 'all' }),
        adminPhase1API.bookingOperations({}),
        adminPhase1API.auditLogs({ module: 'channel_manager' }),
      ]);

      const dashboard = dashboardRes.status === 'fulfilled' ? dashboardRes.value.data?.data : null;
      const properties = propertiesRes.status === 'fulfilled' ? (propertiesRes.value.data?.data?.properties || []) : [];
      const bookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data?.data?.bookings || bookingsRes.value.data?.bookings || []) : [];
      const audits = auditRes.status === 'fulfilled' ? (auditRes.value.data?.data?.logs || auditRes.value.data?.logs || []) : [];

      setState({ loading: false, error: '', dashboard, properties, bookings, audits });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load Channel Manager', dashboard: null, properties: [], bookings: [], audits: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.properties.filter((property) => {
      if (!term) return true;
      return [
        property.title,
        property.property_id,
        property.city,
        property.host_name,
        property.broker_name,
        property.rm_name,
        property.category,
        property.property_type,
      ].some((value) => safeText(value, '').toLowerCase().includes(term));
    });
  }, [search, state.properties]);

  const filteredBookings = useMemo(() => {
    const propertyIds = new Set(filteredProperties.map((property) => property.property_id));
    const term = search.trim().toLowerCase();
    return state.bookings.filter((booking) => {
      const matchesSearch = !term || [booking.booking_id, booking.property_id, booking.guest_name, booking.host_name, booking.booking_status, booking.payment_status].some((value) => safeText(value, '').toLowerCase().includes(term));
      return matchesSearch && (!propertyIds.size || propertyIds.has(booking.property_id) || !search.trim());
    });
  }, [filteredProperties, search, state.bookings]);

  const metrics = useMemo(() => {
    const liveProperties = state.properties.filter((property) => normalizeStatus(property.status) === 'live').length;
    const mappedProperties = state.properties.filter((property) => property.broker_code || property.rm_code || property.branch_manager_code || property.assigned_broker || property.assigned_rm).length;
    const confirmedBookings = state.bookings.filter((booking) => ['confirmed', 'completed'].includes(normalizeStatus(booking.booking_status))).length;
    const failedAudits = state.audits.filter((audit) => normalizeStatus(audit.status).includes('fail') || normalizeStatus(audit.action).includes('fail')).length;
    return {
      connectedChannels: channelRows.filter((channel) => ['connected', 'ready'].includes(channel.status)).length,
      readyAdapters: channelRows.filter((channel) => channel.status !== 'mapping_pending').length,
      pendingMappings: Math.max(state.properties.length - mappedProperties, 0),
      syncConflicts: failedAudits,
      calendarSources: liveProperties + confirmedBookings,
    };
  }, [state.audits, state.bookings, state.properties]);

  if (state.loading && !state.dashboard) return <LoadingState message="Loading Channel Manager..." />;
  if (state.error) return <ErrorState message={state.error} action={<button onClick={load} type="button" className="rounded-lg bg-red-100 px-3 py-2 font-black">Retry</button>} />;

  const readinessRows = [
    ['Soft Hold TTL', '10 minutes', 'Website checkout holds inventory before payment confirmation.'],
    ['Distributed Lock', 'unit + date range', 'Concurrency key prevents conflicting holds and reservations.'],
    ['Optimistic Version', 'event stream version', 'Final transaction validates calendar version before commit.'],
    ['Idempotency', 'channel + external id', 'Duplicate OTA events are ignored instead of creating duplicate bookings.'],
    ['Async OTA Sync', 'queued after commit', 'Internal booking confirmation does not wait for OTA API completion.'],
    ['Secret Storage', 'encrypted reference', 'Production channel credentials are never shown in plain text.'],
  ];

  const renderPillGrid = (items, tone = 'blue') => {
    const classes = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700';
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-black capitalize ${classes}`}>{item}</span>)}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel>
        <SectionTitle eyebrow="Channel Manager" title="Unified Calendar Engine" description="X-Space360 remains the central source of truth for availability, pricing and reservation state." />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Inventory Authority', `${state.properties.length} properties`, Database, 'green'],
            ['Live Inventory', `${state.properties.filter((property) => normalizeStatus(property.status) === 'live').length} live`, CheckCircle2, 'green'],
            ['Reservations Synced', filteredBookings.length, CalendarDays, 'blue'],
            ['Mapping Queue', metrics.pendingMappings, GitBranch, metrics.pendingMappings ? 'amber' : 'green'],
            ['Conflict Watch', metrics.syncConflicts, AlertTriangle, metrics.syncConflicts ? 'red' : 'green'],
            ['Webhook Intake', 'Ready', Server, 'slate'],
          ].map(([label, value, Icon, tone]) => <StatCard key={label} label={label} value={value} icon={Icon} tone={tone} />)}
        </div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Readiness" title="Adapter Health" description="Initial rollout channels and future-ready connector boundaries." />
        <div className="space-y-3 p-4">
          {channelRows.map((channel) => (
            <div key={channel.name} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="font-black text-slate-950">{channel.name}</p>
                <p className="font-mono text-xs font-semibold text-slate-500">{channel.adapter}</p>
              </div>
              <StatusBadge value={channel.status} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderArchitecture = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Panel>
        <SectionTitle eyebrow="Target Architecture" title="Multi-Channel Distribution Platform" description="The admin module is structured around the same bounded contexts from the master prompt." />
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {[
            ['Calendar Engine', 'Central source of truth for unit/date availability and immutable inventory events.'],
            ['Projection Service', 'Materializes fast search and calendar views from event-store changes.'],
            ['Adapter Layer', 'Keeps Airbnb, Booking.com, iCal and future OTA logic outside core booking code.'],
            ['Sync Orchestrator', 'Creates outbound/inbound jobs, retries transient failures and protects idempotency.'],
            ['Webhook Intake', 'Validates signatures, stores raw payloads and processes events asynchronously.'],
            ['Reconciliation', 'Detects channel drift and queues safe correction or manual review.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Delivery Roadmap" title="Incremental Build Plan" description="Backend work should be migrated safely behind this admin navigation." />
        <div className="space-y-2 p-4">
          {phaseRoadmap.map(([phase, scope]) => (
            <div key={phase} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d9b12f]">{phase}</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{scope}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderPropertiesUnits = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel>
        <SectionTitle eyebrow="Properties & Units" title="Unit-Level Inventory Model" description="Prompt requirement: every independently bookable space must have a unique unit ID. Current properties are shown as unit candidates until dedicated unit records are migrated." />
        <DataTable
          columns={[
            { key: 'title', label: 'Property / Unit', render: (row) => <><p className="font-black text-slate-950">{safeText(row.title)}</p><p className="font-mono text-xs text-slate-500">{safeText(row.property_id)}</p></> },
            { key: 'unit_id', label: 'Unit ID', render: (row) => <span className="font-mono text-xs">{safeText(row.unit_id || row.property_id)}</span> },
            { key: 'property_type', label: 'Bookable Type', render: (row) => safeText(row.property_type || row.bhk_type || row.category) },
            { key: 'city', label: 'City' },
            { key: 'status', label: 'State', render: (row) => <StatusBadge value={row.status} /> },
          ]}
          rows={filteredProperties}
          empty="No properties available for unit mapping."
        />
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Data Model" title="Required Collections / Tables" description="These are the target Channel Manager domains from the implementation prompt." />
        <div className="p-4">{renderPillGrid(domainEntities)}</div>
      </Panel>
    </div>
  );

  const renderCalendar = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <SectionTitle eyebrow="Unified Calendar" title="Calendar States" description="Availability is derived from immutable calendar events, not manually edited as the source of truth." />
        <div className="p-4">{renderPillGrid(calendarStates, 'green')}</div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Event Store" title="Immutable Inventory Events" description="Every inventory-affecting change should append an event and then update projections." />
        <div className="p-4">{renderPillGrid(eventTypes)}</div>
      </Panel>
      <Panel className="xl:col-span-2">
        <SectionTitle eyebrow="CQRS Projection" title="Command To Query Flow" description="Write operations append calendar events; read/search screens use optimized projections." />
        <div className="grid gap-3 p-4 md:grid-cols-5">
          {['Command', 'Business Validation', 'Calendar Event Store', 'Projection Engine', 'Query View'].map((item, index) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
              <p className="mt-2 font-black text-slate-950">{item}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderAvailability = () => (
    <Panel>
      <SectionTitle eyebrow="Availability" title="Inventory Mapping Queue" description="Property inventory that will feed OTA calendars, direct website and mobile app availability." />
      <DataTable
        columns={[
          { key: 'title', label: 'Property', render: (row) => <><p className="font-black text-slate-950">{safeText(row.title)}</p><p className="font-mono text-xs text-slate-500">{safeText(row.property_id)}</p></> },
          { key: 'city', label: 'City' },
          { key: 'property_type', label: 'Type', render: (row) => safeText(row.property_type || row.bhk_type || row.category) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'price_per_night', label: 'Base Rate', render: (row) => formatMoney(row.price_per_night || row.base_price || 0) },
          { key: 'subscription_status', label: 'Subscription', render: (row) => <StatusBadge value={row.subscription_status || 'not linked'} /> },
        ]}
        rows={filteredProperties}
        empty="No inventory records matched the current search."
      />
    </Panel>
  );

  const renderChannels = () => (
    <Panel>
      <SectionTitle eyebrow="Connectors" title="Channel Adapter Registry" description="Adapter architecture for direct channels, OTA partners, webhook partners and iCal-compatible platforms." />
      <DataTable
        columns={[
          { key: 'code', label: 'Channel Code', render: (row) => <span className="font-mono text-xs">{row.code}</span> },
          { key: 'name', label: 'Channel' },
          { key: 'type', label: 'Type', render: (row) => <StatusBadge value={row.type} /> },
          { key: 'adapter', label: 'Adapter', render: (row) => <span className="font-mono text-xs">{row.adapter}</span> },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          { key: 'capabilities', label: 'Capabilities', render: (row) => `${['reservations', 'availabilityPush', 'ratesPush', 'restrictionsPush', 'webhooks', 'iCalImport', 'iCalExport'].filter((key) => row[key]).length} enabled` },
        ]}
        rows={channelRows}
      />
    </Panel>
  );

  const renderConnections = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel>
        <SectionTitle eyebrow="Channel Connections" title="Host / Property Channel Accounts" description="One host or property can connect multiple OTA accounts using credential references and certification status." />
        <DataTable
          columns={[
            { key: 'title', label: 'Property', render: (row) => safeText(row.title) },
            { key: 'host_name', label: 'Host' },
            { key: 'connection_status', label: 'Connection', render: () => <StatusBadge value="pending setup" /> },
            { key: 'certification_status', label: 'Certification', render: () => <StatusBadge value="created" /> },
            { key: 'last_successful_sync', label: 'Last Sync', render: () => '-' },
          ]}
          rows={filteredProperties}
          empty="No channel connections configured yet."
        />
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Security" title="Credential Handling" description="Production secrets must be stored as encrypted references or in a secrets manager." />
        <div className="p-4">{renderPillGrid(['credential_reference', 'signature validation', 'correlation id', 'encrypted storage', 'certified before active'], 'amber')}</div>
      </Panel>
    </div>
  );

  const renderMapping = () => (
    <Panel>
      <SectionTitle eyebrow="Mapping Engine" title="Property, Unit and Rate Plan Mapping" description="Internal property/unit/rate plan records can map to multiple external channel listings." />
      <DataTable
        columns={[
          { key: 'property_id', label: 'XSpace360 Property', render: (row) => <><p className="font-black">{safeText(row.title)}</p><p className="font-mono text-xs text-slate-500">{safeText(row.property_id)}</p></> },
          { key: 'unit_id', label: 'Unit', render: (row) => <span className="font-mono text-xs">{safeText(row.unit_id || row.property_id)}</span> },
          { key: 'airbnb', label: 'Airbnb', render: () => <StatusBadge value="not mapped" /> },
          { key: 'booking', label: 'Booking.com', render: () => <StatusBadge value="not mapped" /> },
          { key: 'ical', label: 'iCal', render: (row) => <StatusBadge value={normalizeStatus(row.status) === 'live' ? 'active' : 'waiting'} /> },
          { key: 'sync', label: 'Sync Flags', render: () => 'Inventory / Rates / Reservations' },
        ]}
        rows={filteredProperties}
        empty="No properties available for channel mapping."
      />
    </Panel>
  );

  const renderRates = () => (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel>
        <SectionTitle eyebrow="Rate Engine" title="Supported Rate Controls" description="Central pricing rules must be inspected before pushing rates to channels." />
        <div className="p-4">{renderPillGrid(rateControls, 'amber')}</div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Rate Plans" title="Property Rate Snapshot" description="Current property pricing shown as the base rate plan source until unit-level rate plans are migrated." />
        <DataTable
          columns={[
            { key: 'title', label: 'Property' },
            { key: 'rate_plan_id', label: 'Rate Plan ID', render: (row) => <span className="font-mono text-xs">rate_{safeText(row.property_id).slice(-8)}</span> },
            { key: 'base_rate', label: 'Base Rate', render: (row) => formatMoney(row.price_per_night || row.base_price || 0) },
            { key: 'minimum_stay', label: 'Min Stay', render: (row) => `${row.minimum_stay || row.min_stay || 1} night(s)` },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
          ]}
          rows={filteredProperties}
        />
      </Panel>
    </div>
  );

  const renderReservations = () => (
    <Panel>
      <SectionTitle eyebrow="Reservation Flow" title="Booking State Synchronization" description="Reservation events that should lock inventory and reconcile across all connected channels." />
      <DataTable
        columns={[
          { key: 'booking_id', label: 'Booking', render: (row) => <><p className="font-mono text-xs">{safeText(row.booking_id)}</p><p className="text-xs text-slate-500">{safeText(row.property_id)}</p></> },
          { key: 'guest_name', label: 'Guest' },
          { key: 'check_in_date', label: 'Check In' },
          { key: 'check_out_date', label: 'Check Out' },
          { key: 'booking_status', label: 'Booking Status', render: (row) => <StatusBadge value={row.booking_status} /> },
          { key: 'payment_status', label: 'Payment', render: (row) => <StatusBadge value={row.payment_status} /> },
          { key: 'total_amount', label: 'Amount', render: (row) => formatMoney(row.total_amount || 0) },
        ]}
        rows={filteredBookings.slice(0, 80)}
        empty="No reservation records available for sync review."
      />
    </Panel>
  );

  const renderSync = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel>
        <SectionTitle eyebrow="Sync Operations" title="Operational Sync Queue" description="Internal events create asynchronous sync jobs for every mapped channel." />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {syncTypes.map((type) => (
            <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{type}</p>
              <p className="mt-3 text-xl font-black text-slate-950">0 jobs</p>
              <div className="mt-3"><StatusBadge value="ready" /></div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Retry Policy" title="Exponential Backoff" description="Transient OTA failures should retry; permanent errors must stop and be categorized." />
        <div className="space-y-2 p-4">
          {retrySchedule.map((delay, index) => (
            <div key={delay} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black">
              <span>Attempt {index + 1}</span>
              <span className="text-slate-500">{delay}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderFailed = () => (
    <Panel>
      <SectionTitle eyebrow="Failed Syncs" title="Failure Classification" description="Failures are grouped by transient, authentication, rate limit, validation, mapping, permanent and unknown causes." />
      <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-7">
        {['Transient', 'Authentication', 'Rate Limit', 'Validation', 'Mapping', 'Permanent', 'Unknown'].map((type) => <StatCard key={type} label={type} value="0" icon={AlertTriangle} tone="green" />)}
      </div>
    </Panel>
  );

  const renderDlq = () => (
    <Panel>
      <SectionTitle eyebrow="Dead Letter Queue" title="Manual Recovery Workspace" description="After max retries, failed jobs move here for payload review, mapping correction, manual retry or escalation." />
      <DataTable
        columns={[
          { key: 'job', label: 'Job' },
          { key: 'sync_type', label: 'Sync Type' },
          { key: 'channel', label: 'Channel' },
          { key: 'error', label: 'Last Error' },
          { key: 'status', label: 'Status', render: () => <StatusBadge value="empty" /> },
        ]}
        rows={[]}
        empty="No dead-letter jobs. Queue is clear."
      />
    </Panel>
  );

  const renderReconciliation = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <SectionTitle eyebrow="Reconciliation" title="Mismatch Detection" description="Periodic jobs compare XSpace360 master state with external channel state." />
        <div className="p-4">{renderPillGrid(['Inventory mismatch', 'Rate mismatch', 'Reservation missing', 'Reservation duplicated', 'Mapping mismatch', 'Calendar mismatch', 'Double-booking risk'], 'amber')}</div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Conflict Priority" title="Deterministic Resolution Order" description="Conflict logic belongs in the central policy layer, not inside individual adapters." />
        <div className="space-y-2 p-4">
          {conflictPriority.map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
              <p className="font-black text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderCertification = () => (
    <Panel>
      <SectionTitle eyebrow="Certification" title="Channel Certification Lifecycle" description="Uncertified integrations cannot receive production booking traffic." />
      <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        {certificationStages.map((stage, index) => (
          <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Stage {index + 1}</p>
            <p className="mt-2 font-black text-slate-950">{stage}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 p-4">{renderPillGrid(['Authentication', 'Availability Update', 'Reservation Import', 'Cancellation', 'Rate Update', 'Restriction Update', 'Duplicate Event Handling', 'HTTP 429', 'HTTP 500', 'Malformed Payload', 'Webhook Validation', 'Mapping Failure', 'Network Failure', 'Retry', 'Idempotency', 'Concurrency'])}</div>
    </Panel>
  );

  const renderHealth = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel>
        <SectionTitle eyebrow="Integration Health" title="Channel Health Matrix" description="Health combines adapter readiness, certification status, sync freshness and failure count." />
        <DataTable
          columns={[
            { key: 'name', label: 'Channel' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'latency', label: 'Avg Latency', render: () => '0 ms' },
            { key: 'last_successful_sync', label: 'Last Successful Sync', render: () => '-' },
            { key: 'failure_count', label: 'Failures', render: () => '0' },
          ]}
          rows={channelRows}
        />
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Webhook Engine" title="Inbound Event Controls" description="Webhook and polling fallback support reliable inbound reservation intake." />
        <div className="p-4">{renderPillGrid(['signature validation', 'raw payload store', 'duplicate check', 'async processing', 'polling fallback', 'hybrid sync', 'manual refresh'], 'green')}</div>
      </Panel>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <SectionTitle eyebrow="Settings" title="Operational Policies" description="Central settings for soft holds, polling frequency, retry attempts, idempotency and safe sync behavior." />
        <DataTable
          columns={[
            { key: 'name', label: 'Policy' },
            { key: 'value', label: 'Value' },
            { key: 'note', label: 'Notes' },
          ]}
          rows={readinessRows.map(([name, value, note]) => ({ name, value, note }))}
        />
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Lifecycle" title="Sync Job Statuses" description="Allowed lifecycle states for channel sync jobs." />
        <div className="p-4">{renderPillGrid(syncStatuses)}</div>
      </Panel>
    </div>
  );

  const renderApiContracts = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel>
        <SectionTitle eyebrow="API Contracts" title="Channel Manager Endpoint Map" description="Target contracts from the prompt, ready to be implemented incrementally with migrations and tests." />
        <DataTable
          columns={[
            { key: 'method', label: 'Method', render: (row) => <StatusBadge value={row.method} /> },
            { key: 'path', label: 'Endpoint', render: (row) => <span className="font-mono text-xs">{row.path}</span> },
            { key: 'purpose', label: 'Purpose' },
          ]}
          rows={apiContracts.map(([method, path, purpose]) => ({ method, path, purpose }))}
        />
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Access Control" title="Role Capability Model" description="Channel Manager access must follow the same enterprise permission model as the admin panel." />
        <div className="space-y-2 p-4">
          {roleCapabilities.map(([role, scope]) => (
            <div key={role} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-black text-slate-950">{role}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{scope}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderAudit = () => (
    <Panel>
      <SectionTitle eyebrow="Audit Trail" title="Channel Manager Activity" description="Sync actions, admin decisions and integration changes will be tracked here." />
      <DataTable
        columns={[
          { key: 'created_at', label: 'Time' },
          { key: 'module', label: 'Module' },
          { key: 'action', label: 'Action' },
          { key: 'actor_name', label: 'Actor', render: (row) => safeText(row.actor_name || row.user_id || row.actor_id) },
          { key: 'record_id', label: 'Record' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'recorded'} /> },
        ]}
        rows={state.audits}
        empty="No Channel Manager audit events have been recorded yet."
      />
    </Panel>
  );

  const renderMetrics = () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <SectionTitle eyebrow="Core Metrics" title="Engine Health" description="Operational indicators for inventory sync readiness." />
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <StatCard label="Properties In Scope" value={state.properties.length} icon={Database} tone="blue" />
          <StatCard label="Bookings In Scope" value={state.bookings.length} icon={CalendarDays} tone="green" />
          <StatCard label="Pending Mappings" value={metrics.pendingMappings} icon={GitBranch} tone={metrics.pendingMappings ? 'amber' : 'green'} />
          <StatCard label="Sync Conflicts" value={metrics.syncConflicts} icon={AlertTriangle} tone={metrics.syncConflicts ? 'red' : 'green'} />
        </div>
      </Panel>
      <Panel>
        <SectionTitle eyebrow="Architecture" title="Phase 1 Boundaries" description="Admin console is integrated now; OTA connector workers can be added behind these sections without changing navigation." />
        <div className="space-y-3 p-4 text-sm font-semibold text-slate-600">
          {['Unified Calendar Engine remains master inventory source.', 'Adapter registry separates Airbnb, Booking.com, iCal and future channels.', 'Reservation flow must lock inventory before external sync.', 'Every sync, mapping and override must create an audit event.'].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const views = {
    overview: renderOverview,
    architecture: renderArchitecture,
    propertiesUnits: renderPropertiesUnits,
    calendar: renderCalendar,
    channels: renderChannels,
    connections: renderConnections,
    mapping: renderMapping,
    rates: renderRates,
    availability: renderAvailability,
    reservations: renderReservations,
    sync: renderSync,
    failed: renderFailed,
    dlq: renderDlq,
    reconciliation: renderReconciliation,
    certification: renderCertification,
    audit: renderAudit,
    health: renderHealth,
    apiContracts: renderApiContracts,
    settings: renderSettings,
  };

  return (
    <div>
      <PageHeader
        title="Channel Manager"
        description="Manage availability sync readiness, channel adapters, reservation state flow and core channel metrics from the central admin panel."
        action={(
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800" type="button">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        )}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <StatCard label="Connected Channels" value={metrics.connectedChannels} icon={Radio} tone="blue" />
        <StatCard label="Ready Adapters" value={metrics.readyAdapters} icon={Server} tone="green" />
        <StatCard label="Pending Mappings" value={metrics.pendingMappings} icon={GitBranch} tone={metrics.pendingMappings ? 'amber' : 'green'} />
        <StatCard label="Sync Conflicts" value={metrics.syncConflicts} icon={AlertTriangle} tone={metrics.syncConflicts ? 'red' : 'green'} />
        <StatCard label="Calendar Sources" value={metrics.calendarSources} icon={Database} tone="slate" />
      </div>

      <Panel className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${active === key ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block min-w-0 xl:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#2f6df6] focus:ring-2 focus:ring-blue-100"
              placeholder="Search property, host, booking, city or channel"
            />
          </label>
        </div>
      </Panel>

      <div className="space-y-4">{views[active]()}</div>
    </div>
  );
};

export default ChannelManager;
