import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Download, Eye, Filter, MoreVertical, RefreshCcw, Search, UserRoundCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, Pagination, Panel, StatusBadge } from './shared';

const readData = (response) => response?.data?.data || response?.data || {};

const tabConfig = [
  { id: 'all', label: 'All Requests' },
  { id: 'admin', label: 'Admin Actions' },
  { id: 'escalation', label: 'Escalations' },
  { id: 'host', label: 'Host Reviews' },
  { id: 'property', label: 'Property Reviews' },
  { id: 'other', label: 'Other' },
];

const moduleTone = (module) => {
  const key = String(module || '').toLowerCase();
  if (key.includes('escalation')) return 'bg-red-50 text-red-600';
  if (key.includes('host')) return 'bg-violet-50 text-violet-600';
  if (key.includes('property')) return 'bg-orange-50 text-orange-600';
  return 'bg-[#eef4ff] text-[#2563eb]';
};

const formatDateTime = (value) => {
  if (!value) return '04 Sep 2026\n10:15 AM';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${datePart}\n${timePart}`;
};

const toCsv = (rows) => {
  const headers = ['#', 'Module', 'Request', 'Property / Details', 'Owner', 'Status', 'Created At', 'Route'];
  const escape = (value) => {
    const text = value === undefined || value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
};

const ApprovalCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ module: 'all', status: 'all', owner: 'all', dateRange: 'all' });
  const [data, setData] = useState({
    pendingActions: [],
    escalations: [],
    hosts: [],
    properties: [],
    bookings: [],
  });

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboard, escalations, hosts, properties, bookings] = await Promise.allSettled([
        adminPhase1API.dashboard(),
        adminPhase1API.activeEscalations(),
        adminPhase1API.hosts({ status: 'pending', limit: 20 }),
        adminPhase1API.propertyOperations({ limit: 20 }),
        adminPhase1API.bookingOperations({ limit: 20 }),
      ]);

      const dashboardData = dashboard.status === 'fulfilled' ? readData(dashboard.value) : {};
      const escalationData = escalations.status === 'fulfilled' ? readData(escalations.value) : {};
      const hostData = hosts.status === 'fulfilled' ? readData(hosts.value) : {};
      const propertyData = properties.status === 'fulfilled' ? readData(properties.value) : {};
      const bookingData = bookings.status === 'fulfilled' ? readData(bookings.value) : {};

      if ([dashboard, escalations, hosts, properties, bookings].every((result) => result.status === 'rejected')) {
        setError('Failed to load Approval Center');
      }

      setData({
        pendingActions: dashboardData.pending_actions || dashboardData.pendingActions || [],
        escalations: escalationData.instances || escalationData.escalations || [],
        hosts: hostData.hosts || [],
        properties: propertyData.properties || [],
        bookings: bookingData.bookings || [],
      });
    } catch (loadError) {
      setError('Failed to load Approval Center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const baseRows = useMemo(() => {
    const adminRows = (data.pendingActions || []).map((action, index) => ({
      id: action.id || `admin-${index}`,
      kind: 'admin',
      module: 'Admin Action',
      request: action.title || action.label || action.name || 'Pending admin action',
      propertyName: action.property_name || action.entity_name || action.reference_name || 'Central review task',
      propertyMeta: action.location || action.reference_id || action.module || 'X-Space360',
      owner: action.owner || action.assignee || 'Admin Team',
      ownerInitials: 'AD',
      status: action.status || 'pending',
      createdAt: action.created_at || action.updated_at || '2026-09-04T10:15:00',
      route: action.path || '/admin/dashboard',
    }));

    const escalationRows = (data.escalations || []).map((item, index) => ({
      id: item.instance_id || item.id || item._id || `escalation-${index}`,
      kind: 'escalation',
      module: 'Escalation',
      request: item.title || item.subject || item.reason || 'Escalation review required',
      propertyName: item.record_name || item.property_name || item.record_id || 'Escalated record',
      propertyMeta: item.process_name || item.module || 'Escalation workflow',
      owner: item.assigned_to_name || item.assignee || 'Escalation Owner',
      ownerInitials: 'EO',
      status: item.status || 'critical',
      createdAt: item.created_at || item.started_at || '2026-09-02T09:30:00',
      route: '/admin/escalation-matrix',
    }));

    const hostRows = (data.hosts || []).map((host, index) => ({
      id: host.host_id || host.user_id || `host-${index}`,
      kind: 'host',
      module: 'Host Review',
      request: host.kyc_status === 'pending' ? 'Host KYC Pending' : 'Host Verification Pending',
      propertyName: host.full_name || host.name || 'Host Review',
      propertyMeta: host.email || host.phone || host.host_code || 'KYC verification',
      owner: 'Admin Team',
      ownerInitials: 'AD',
      status: host.status || host.kyc_status || 'pending',
      createdAt: host.created_at || host.updated_at || '2026-09-03T06:18:00',
      route: '/admin/hosts',
    }));

    const propertyRows = (data.properties || [])
      .filter((property) => ['pending_review', 'rm_verification', 'branch_manager_review', 'admin_review'].includes(String(property.status || property.verification_status || '').toLowerCase()))
      .map((property, index) => ({
        id: property.property_id || `property-${index}`,
        kind: 'property',
        module: 'Property Review',
        request: property.review_label || 'Property Verification Pending',
        propertyName: property.title || property.property_name || 'Property Review',
        propertyMeta: property.city && property.state ? `${property.city}, ${property.state}` : property.location || property.property_id || '',
        owner: 'Admin Team',
        ownerInitials: 'AD',
        status: property.status || property.verification_status || 'pending',
        createdAt: property.created_at || property.updated_at || '2026-09-02T08:15:00',
        route: '/admin/properties',
        thumbnail: property.images?.[0] || property.primary_image || property.image || '',
      }));

    const bookingRows = (data.bookings || [])
      .filter((booking) => ['pending', 'pending_approval', 'refund_requested', 'payment_pending'].includes(String(booking.status || booking.payment_status || '').toLowerCase()))
      .map((booking, index) => ({
        id: booking.booking_id || `booking-${index}`,
        kind: 'other',
        module: booking.payment_status === 'failed' ? 'Failed Transaction' : booking.status === 'refund_requested' ? 'Refund Request' : 'Booking Review',
        request: booking.status === 'refund_requested' ? 'Refund Requests Pending' : booking.payment_status === 'failed' ? 'Failed Transactions' : 'Booking Approval Pending',
        propertyName: booking.property_name || booking.property?.title || booking.booking_id || 'Booking review',
        propertyMeta: booking.property?.city && booking.property?.state ? `${booking.property.city}, ${booking.property.state}` : booking.guest_name || booking.user?.full_name || booking.booking_id,
        owner: 'Admin Team',
        ownerInitials: 'AD',
        status: booking.status || booking.payment_status || 'pending',
        createdAt: booking.created_at || booking.updated_at || '2026-09-03T04:10:00',
        route: '/admin/bookings',
        thumbnail: booking.property?.images?.[0] || booking.property?.primary_image || '',
      }));

    return [...adminRows, ...escalationRows, ...hostRows, ...propertyRows, ...bookingRows];
  }, [data.bookings, data.escalations, data.hosts, data.pendingActions, data.properties]);

  const counts = useMemo(() => ({
    all: baseRows.length,
    admin: baseRows.filter((row) => row.kind === 'admin').length,
    escalation: baseRows.filter((row) => row.kind === 'escalation').length,
    host: baseRows.filter((row) => row.kind === 'host').length,
    property: baseRows.filter((row) => row.kind === 'property').length,
    other: baseRows.filter((row) => row.kind === 'other').length,
  }), [baseRows]);

  const kpis = useMemo(() => ([
    { id: 'admin', label: 'Pending Actions', count: counts.admin, subtitle: 'Awaiting review', icon: Clock3, iconTone: 'bg-blue-50 text-[#2563eb]' },
    { id: 'escalation', label: 'Active Escalations', count: counts.escalation, subtitle: 'Critical', icon: AlertTriangle, iconTone: 'bg-red-50 text-red-500', badge: 'critical' },
    { id: 'host', label: 'Host Reviews', count: counts.host, subtitle: 'Pending verification', icon: UserRoundCheck, iconTone: 'bg-violet-50 text-violet-600' },
    { id: 'property', label: 'Property Reviews', count: counts.property, subtitle: 'Pending approval', icon: FileIcon, iconTone: 'bg-orange-50 text-orange-500' },
  ]), [counts.admin, counts.escalation, counts.host, counts.property]);

  const filterOptions = useMemo(() => ({
    modules: ['all', ...new Set(baseRows.map((row) => row.module))],
    statuses: ['all', ...new Set(baseRows.map((row) => row.status))],
    owners: ['all', ...new Set(baseRows.map((row) => row.owner))],
  }), [baseRows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return baseRows
      .filter((row) => activeTab === 'all' || row.kind === activeTab)
      .filter((row) => filters.module === 'all' || row.module === filters.module)
      .filter((row) => filters.status === 'all' || String(row.status || '').toLowerCase() === String(filters.status || '').toLowerCase())
      .filter((row) => filters.owner === 'all' || row.owner === filters.owner)
      .filter((row) => {
        if (filters.dateRange === 'all') return true;
        const date = new Date(row.createdAt);
        if (Number.isNaN(date.getTime())) return true;
        const now = new Date('2026-09-04T23:59:59');
        const diffDays = (now - date) / (1000 * 60 * 60 * 24);
        if (filters.dateRange === 'today') return diffDays <= 1;
        if (filters.dateRange === 'week') return diffDays <= 7;
        if (filters.dateRange === 'month') return diffDays <= 30;
        return true;
      })
      .filter((row) => {
        if (!normalizedQuery) return true;
        return [row.module, row.request, row.propertyName, row.propertyMeta, row.owner, row.id]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [activeTab, baseRows, filters.dateRange, filters.module, filters.owner, filters.status, query]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, query]);

  const pagedRows = filteredRows.slice((page - 1) * 10, page * 10);

  const exportQueue = () => {
    const csv = toCsv(filteredRows.map((row, index) => [
      index + 1,
      row.module,
      row.request,
      `${row.propertyName} ${row.propertyMeta}`.trim(),
      row.owner,
      row.status,
      row.createdAt,
      row.route,
    ]));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setQuery('');
    setFilters({ module: 'all', status: 'all', owner: 'all', dateRange: 'all' });
    setActiveTab('all');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <span>System Administration</span>
            <span className="text-slate-300">›</span>
            <span className="text-[#2563eb]">Approval Center</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Approval Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Central queue for pending admin reviews, escalations and operational approvals across X-Space360.</p>
          </div>
        </div>
        <button onClick={exportQueue} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-[#142d7b] shadow-sm hover:bg-slate-50">
          <Download className="h-4 w-4" /> Export Queue
        </button>
      </div>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className="text-left"
            >
              <Panel className={`p-5 transition hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${activeTab === item.id ? 'ring-2 ring-[#dbeafe]' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${item.iconTone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xl text-slate-400">›</span>
                </div>
                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-[38px] font-black leading-none text-slate-950">{item.count}</p>
                <div className="mt-3">
                  {item.badge ? <StatusBadge value={item.badge} /> : <p className="text-sm font-medium text-slate-600">{item.subtitle}</p>}
                </div>
              </Panel>
            </button>
          );
        })}
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pt-4">
          <div className="flex flex-wrap gap-6">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 pb-4 text-sm font-black transition ${
                  activeTab === tab.id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.id ? 'bg-[#e8f0ff] text-[#2563eb]' : 'bg-slate-100 text-slate-500'}`}>
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="mb-3 inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_130px_130px_130px_150px_100px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by property name, request, owner, or module..."
                className="h-6 w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>
            <FilterSelect value={filters.module} onChange={(value) => setFilters((current) => ({ ...current, module: value }))} options={filterOptions.modules} labelMap={{ all: 'All Modules' }} />
            <FilterSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={filterOptions.statuses} labelMap={{ all: 'All Status' }} />
            <FilterSelect value={filters.owner} onChange={(value) => setFilters((current) => ({ ...current, owner: value }))} options={filterOptions.owners} labelMap={{ all: 'All Owners' }} />
            <FilterSelect value={filters.dateRange} onChange={(value) => setFilters((current) => ({ ...current, dateRange: value }))} options={['all', 'today', 'week', 'month']} labelMap={{ all: 'Date Range', today: 'Today', week: 'Last 7 Days', month: 'Last 30 Days' }} />
            <button type="button" onClick={resetFilters} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4" /> Reset
            </button>
          </div>

          {filtersOpen ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Queue filters are active across the central approval list. Use tabs for category routing and dropdowns for narrower operational filtering.
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                {['#', 'Module', 'Request', 'Property / Details', 'Owner', 'Status', 'Created At', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-4">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 font-semibold text-slate-700">{(page - 1) * 10 + index + 1}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-black ${moduleTone(row.module)}`}>
                      {row.module}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-800">{row.request}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Thumbnail title={row.propertyName} image={row.thumbnail} />
                      <div>
                        <p className="font-black text-slate-900">{row.propertyName}</p>
                        <p className="text-sm text-slate-500">{row.propertyMeta}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-black text-[#2563eb]">
                        {row.ownerInitials}
                      </div>
                      <span className="font-medium text-slate-700">{row.owner}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge value={row.status} /></td>
                  <td className="px-4 py-4 whitespace-pre-line font-medium text-slate-700">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(row.route)}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#142d7b] hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" /> Open
                      </button>
                      <button type="button" onClick={() => navigate(row.route)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pagedRows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">No approval items found for the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-4">
          <Pagination currentPage={page} totalItems={filteredRows.length} itemsPerPage={10} onPageChange={setPage} />
        </div>
      </Panel>
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, labelMap = {} }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none"
  >
    {options.map((option) => (
      <option key={option} value={option}>
        {labelMap[option] || option}
      </option>
    ))}
  </select>
);

const Thumbnail = ({ image, title }) => {
  if (image) {
    return <img src={image} alt={title} className="h-12 w-12 rounded-xl object-cover" />;
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
      <FileIcon className="h-5 w-5" />
    </div>
  );
};

const FileIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

export default ApprovalCenter;
