import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState } from './shared';

const statusColors = ['#2563EB', '#F59E0B', '#16A34A', '#EF4444', '#94A3B8'];

const formatCurrencyINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));

const formatCompactINR = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 100000) return `Rs. ${(amount / 100000).toFixed(amount % 100000 ? 2 : 0)}L`;
  if (Math.abs(amount) >= 1000) return `Rs. ${(amount / 1000).toFixed(amount % 1000 ? 1 : 0)}K`;
  return formatCurrencyINR(amount);
};

const asNumber = (value) => Number(value || 0);

const periodLabels = {
  today: 'Today',
  this_week: 'This Week',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
};

const emptyDashboard = {
  metrics: [],
  bookingTrend: [],
  bookingStatuses: [],
  alerts: [],
  topProperties: [],
  revenueTrend: [],
  subscriptions: { active: 0, activeTrend: 0, expiringSoon: 0, expiringTrend: 0, expired: 0, cancelled: 0, mrr: 0 },
  businessMetrics: [],
};

const toneClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-orange-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
};

const buildDashboardModel = (apiData) => {
  const kpis = apiData?.kpis || {};
  const charts = apiData?.charts || {};
  const finance = kpis.finance || {};
  const users = kpis.users || {};
  const properties = kpis.properties || {};
  const bookings = kpis.bookings || {};
  const subscription = kpis.subscriptions || {};

  const totalRevenue = asNumber(finance.platform_revenue || finance.total_revenue);
  const totalBookings = asNumber(bookings.total);
  const grossBookingValue = asNumber(finance.gross_booking_value);
  const bookingStatuses = [
    { label: 'Confirmed', value: asNumber(bookings.active_stays) },
    { label: 'Pending', value: asNumber(bookings.upcoming) },
    { label: 'Completed', value: asNumber(bookings.completed) },
    { label: 'Cancelled', value: asNumber(bookings.cancelled) },
  ].map((item) => ({
    ...item,
    percent: totalBookings ? Number(((item.value / totalBookings) * 100).toFixed(1)) : 0,
  }));
  const pendingActions = Array.isArray(apiData?.pending_actions) ? apiData.pending_actions : [];

  return {
    ...emptyDashboard,
    metrics: [
      { title: 'Gross Booking Value', value: grossBookingValue, trend: 0, comparisonLabel: 'Live data from bookings', icon: TrendingUp, tone: 'blue', path: '/admin/bookings' },
      { title: 'Total Bookings', value: totalBookings, trend: 0, comparisonLabel: 'Live booking records', icon: CalendarDays, tone: 'green', path: '/admin/bookings' },
      { title: 'Active Properties', value: asNumber(properties.live || properties.active), trend: 0, comparisonLabel: 'Live property inventory', icon: Building2, tone: 'purple', path: '/admin/properties?status=live' },
      { title: 'Active Subscriptions', value: asNumber(subscription.active), trend: 0, comparisonLabel: 'Current active subscriptions', icon: Bookmark, tone: 'orange', path: '/admin/subscriptions?status=active' },
      { title: 'Total Revenue', value: totalRevenue, trend: 0, comparisonLabel: 'Live revenue records', icon: WalletCards, tone: 'cyan', path: '/admin/finance' },
    ],
    bookingTrend: (charts.booking_trend || []).map((item) => ({
      label: item.label || item.date || item.month || 'Day',
      value: asNumber(item.value || item.total || item.amount),
    })),
    bookingStatuses,
    revenueTrend: (charts.revenue_trend || []).map((item) => ({
      label: item.label || item.date || item.month || 'Day',
      value: asNumber(item.value || item.total || item.amount),
    })),
    topProperties: (apiData?.top_properties || []).map((item) => ({
      name: item.name || item.title || item.property_name || 'Unnamed Property',
      city: item.city || '-',
      bookings: asNumber(item.bookings || item.total_bookings),
      revenue: asNumber(item.revenue || item.total_revenue),
      occupancy: asNumber(item.occupancy || item.occupancy_rate),
    })),
    alerts: pendingActions
      .filter((item) => asNumber(item.count) > 0)
      .slice(0, 4)
      .map((item) => ({
        title: `${asNumber(item.count)} ${item.label}`,
        description: `SLA ${item.sla || '-'} / Trend ${item.trend || 'stable'}`,
        time: 'Live',
        type: item.trend === 'up' ? 'warning' : item.trend === 'down' ? 'danger' : 'info',
        path: item.path || '/admin/dashboard',
      })),
    businessMetrics: [
      { label: 'Total Hosts', value: asNumber(users.hosts), trend: 0, icon: Users, path: '/admin/hosts' },
      { label: 'Total Properties', value: asNumber(properties.total), trend: 0, icon: Building2, path: '/admin/properties' },
      { label: 'Total Guests', value: asNumber(users.guests), trend: 0, icon: Users, path: '/admin/users' },
      { label: 'Avg. Booking Value', value: totalBookings ? Math.round(grossBookingValue / totalBookings) : 0, trend: 0, icon: IndianRupee, currency: true, path: '/admin/bookings' },
      { label: 'Pending Actions', value: pendingActions.reduce((sum, item) => sum + asNumber(item.count), 0), trend: 0, icon: AlertTriangle, path: '/admin/escalation-matrix' },
      { label: 'Platform Uptime', value: 'Live', status: 'API Connected', icon: ShieldCheck, path: '/admin/settings' },
    ],
    subscriptions: {
      active: asNumber(subscription.active),
      activeTrend: 0,
      expiringSoon: asNumber(subscription.expiring_soon || subscription.expiringSoon),
      expiringTrend: 0,
      expired: asNumber(subscription.expired),
      cancelled: asNumber(subscription.cancelled),
      mrr: asNumber(subscription.mrr || subscription.monthly_recurring_revenue),
    },
  };
};

const DashboardSkeleton = () => (
  <div className="space-y-5" role="status" aria-live="polite">
    <div className="h-24 animate-pulse rounded-3xl bg-white" />
    <div className="grid gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr_1.1fr]">
      {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-3xl bg-white" />)}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <section className={`rounded-[18px] border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.055)] ${className}`}>
    {children}
  </section>
);

const MetricCard = ({ title, value, trend, comparisonLabel, icon: Icon, tone = 'blue', path, onNavigate }) => {
  const isMoney = title.toLowerCase().includes('value') || title.toLowerCase().includes('revenue');
  return (
    <button
      type="button"
      onClick={() => path && onNavigate(path)}
      className="group min-h-[126px] rounded-[18px] border border-slate-200/80 bg-white p-5 text-left shadow-[0_12px_34px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <p className="text-2xl font-black tracking-[-0.04em] text-slate-950">{isMoney ? formatCurrencyINR(value) : Number(value || 0).toLocaleString('en-IN')}</p>
            {asNumber(trend) !== 0 && <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" /> {trend}%</span>}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-400">{comparisonLabel}</p>
        </div>
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${toneClasses[tone] || toneClasses.blue}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </button>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-lg">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-slate-950">{formatCompactINR(payload[0].value)}</p>
    </div>
  );
};

const BookingTrendChart = ({ data }) => (
  <Card className="p-5 xl:col-span-2">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Booking Trend</h2>
      <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" defaultValue="This Week" aria-label="Booking trend period">
        {['Today', 'This Week', 'This Month', 'Last 30 Days', 'Custom'].map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
    <div className="h-[250px]">
      {data.length ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bookingTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
          <YAxis tickFormatter={formatCompactINR} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={54} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" stroke="#2563EB" fill="url(#bookingTrendFill)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#2563EB' }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 text-sm font-bold text-slate-400">No booking trend data yet</div>}
    </div>
  </Card>
);

const BookingStatusChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + asNumber(item.value), 0);
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-black tracking-[-0.03em] text-slate-950">Bookings by Status</h2>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[190px_1fr]">
        <div className="relative h-48">
          {total ? <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={2}>
                {data.map((_, index) => <Cell key={index} fill={statusColors[index % statusColors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-full border border-dashed border-slate-200 text-center text-sm font-bold text-slate-400">No bookings</div>}
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black text-slate-950">{total}</p>
              <p className="text-xs font-bold text-slate-400">Total</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 self-center">
          {data.map((item, index) => (
            <button key={item.label} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50" type="button">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColors[index % statusColors.length] }} />{item.label}</span>
              <span className="text-sm font-black text-slate-700">{item.value} <span className="font-semibold text-slate-400">({item.percent}%)</span></span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

const AlertItem = ({ alert, onNavigate }) => {
  const Icon = alert.type === 'danger' ? AlertTriangle : alert.type === 'warning' ? AlertTriangle : alert.type === 'success' ? CheckCircle2 : CalendarDays;
  return (
    <button type="button" onClick={() => alert.path && onNavigate(alert.path)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneClasses[alert.type] || toneClasses.info}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{alert.title}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{alert.description}</span>
      </span>
      <span className="text-xs font-semibold text-slate-400">{alert.time}</span>
    </button>
  );
};

const AlertsPanel = ({ alerts, onNavigate }) => (
  <Card className="p-5">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Alerts & Notifications</h2>
      <button type="button" onClick={() => onNavigate('/admin/communication')} className="text-xs font-black text-blue-600">View All</button>
    </div>
    <div className="divide-y divide-slate-100">
      {alerts.length ? alerts.map((alert) => <AlertItem key={`${alert.title}-${alert.time}`} alert={alert} onNavigate={onNavigate} />) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-bold text-slate-400">No active alerts right now</div>
      )}
    </div>
  </Card>
);

const TopPropertiesTable = ({ rows, onNavigate }) => (
  <Card className="overflow-hidden">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Top Performing Properties</h2>
      <button type="button" onClick={() => onNavigate('/admin/properties')} className="text-xs font-black text-blue-600">View All</button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-[620px] w-full text-left">
        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
          <tr><th className="px-5 py-3">Property</th><th className="px-5 py-3">Bookings</th><th className="px-5 py-3">Revenue</th><th className="px-5 py-3">Occupancy</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row, index) => (
            <tr key={`${row.name}-${index}`} onClick={() => onNavigate('/admin/properties')} className="cursor-pointer transition hover:bg-slate-50">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 via-blue-100 to-amber-100" />
                  <div><p className="text-sm font-black text-slate-950">{row.name}</p><p className="text-xs font-semibold text-slate-500">{row.city}</p></div>
                </div>
              </td>
              <td className="px-5 py-3 text-sm font-black text-slate-700">{row.bookings}</td>
              <td className="px-5 py-3 text-sm font-black text-slate-700">{formatCurrencyINR(row.revenue)}</td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3"><span className="text-sm font-black text-emerald-600">{row.occupancy}%</span><span className="h-1.5 w-20 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, row.occupancy)}%` }} /></span></div>
              </td>
            </tr>
          )) : (
            <tr><td className="px-5 py-8 text-center text-sm font-bold text-slate-400" colSpan={4}>No property performance data yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);

const RevenueOverviewChart = ({ data, totalRevenue, onNavigate }) => (
  <Card className="p-5">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Revenue Overview</h2>
      <button type="button" onClick={() => onNavigate('/admin/finance')} className="text-xs font-black text-blue-600">View Report</button>
    </div>
    <div className="mb-4 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">Total Revenue</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrencyINR(totalRevenue)}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">Live finance data</p>
    </div>
    <div className="h-44">
      {data.length ? <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
          <YAxis tickFormatter={formatCompactINR} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={45} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill="#93B5FD" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 text-sm font-bold text-slate-400">No revenue trend data yet</div>}
    </div>
  </Card>
);

const SubscriptionOverview = ({ data, onNavigate }) => {
  const rows = [
    ['Active Subscriptions', data.active, data.activeTrend, 'success', Bookmark],
    ['Expiring Soon (7 days)', data.expiringSoon, data.expiringTrend, 'warning', Clock3],
    ['Expired', data.expired, null, 'danger', AlertTriangle],
    ['Cancelled', data.cancelled, null, 'info', Bookmark],
  ];
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Subscription Overview</h2>
        <button type="button" onClick={() => onNavigate('/admin/subscriptions')} className="text-xs font-black text-blue-600">View All</button>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {rows.map(([label, value, trend, tone, Icon]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClasses[tone]}`}><Icon className="h-4 w-4" /></span><span className="text-sm font-bold text-slate-700">{label}</span></span>
            <span className="text-sm font-black text-slate-950">{value} {asNumber(trend) !== 0 && <span className="ml-2 text-xs text-emerald-600">+ {trend}%</span>}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
        <span className="text-sm font-black text-emerald-700">Monthly Recurring Revenue</span>
        <span className="text-xl font-black text-emerald-700">{formatCurrencyINR(data.mrr)}</span>
      </div>
    </Card>
  );
};

const BusinessKpiStrip = ({ rows, onNavigate }) => (
  <Card className="p-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {rows.map((item, index) => {
        const Icon = item.icon;
        const value = item.currency ? formatCurrencyINR(item.value) : typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value;
        return (
          <button key={item.label} type="button" onClick={() => item.path && onNavigate(item.path)} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${index ? 'lg:border-l lg:border-slate-100' : ''}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
            <span><span className="block text-xs font-semibold text-slate-500">{item.label}</span><span className="mt-1 block text-xl font-black text-slate-950">{value}</span>{(item.status || asNumber(item.trend) !== 0) && <span className="mt-0.5 block text-xs font-black text-emerald-600">{item.status || `+ ${item.trend}%`}</span>}</span>
          </button>
        );
      })}
    </div>
  </Card>
);

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [period, setPeriod] = useState('this_week');

  const params = useMemo(() => ({ date_range: period }), [period]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: '' }));
      const res = await adminPhase1API.dashboard(params);
      setState({ loading: false, error: '', data: res.data?.data || {} });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load dashboard', data: null });
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const model = useMemo(() => buildDashboardModel(state.data), [state.data]);

  const exportReport = () => {
    const filename = `X-Space360-Executive-Dashboard-${period}.pdf`;
    console.info(`TODO: connect export API for ${filename}`);
  };

  if (state.loading && !state.data) return <DashboardSkeleton />;

  return (
    <div className="min-h-full bg-[#F7F9FC] text-[#0F172A]">
      {state.error && (
        <div className="mb-5">
          <ErrorState
            message={state.error}
            action={<button type="button" onClick={load} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
          />
        </div>
      )}

      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">Welcome back, Admin!</p>
          <h1 className="mt-1 text-[34px] font-black text-slate-950">Executive Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">Real-time overview of your business performance and key operations.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              aria-label="Dashboard date range"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-12 min-w-[260px] appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-black text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="this_week">{periodLabels.this_week}</option>
              <option value="today">Today</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </label>
          <button type="button" onClick={exportReport} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-[0_16px_32px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Download className="h-4 w-4" /> Export Report
          </button>
          <button type="button" onClick={load} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500">
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {model.metrics.map((metric) => <MetricCard key={metric.title} {...metric} onNavigate={navigate} />)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr_1.08fr]">
        <BookingTrendChart data={model.bookingTrend} />
        <BookingStatusChart data={model.bookingStatuses} />
        <AlertsPanel alerts={model.alerts} onNavigate={navigate} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.95fr_0.9fr]">
        <TopPropertiesTable rows={model.topProperties} onNavigate={navigate} />
        <RevenueOverviewChart data={model.revenueTrend} totalRevenue={model.metrics[4]?.value || 0} onNavigate={navigate} />
        <SubscriptionOverview data={model.subscriptions} onNavigate={navigate} />
      </section>

      <section className="mt-5">
        <BusinessKpiStrip rows={model.businessMetrics} onNavigate={navigate} />
      </section>

      <div className="sr-only" aria-live="polite">
        {state.loading ? 'Refreshing executive dashboard data' : 'Executive dashboard ready'}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
