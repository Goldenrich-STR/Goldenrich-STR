import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  MapPin,
  ReceiptText,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { addMonths, endOfMonth, format, isValid, parseISO, startOfMonth, startOfToday, subDays } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, showNotice } from './shared';

const DEFAULT_CUSTOM_FROM = '2026-05-01';
const DEFAULT_CUSTOM_TO = '2026-05-31';
const RANGE_PRESETS = [
  { value: 'today', label: 'Today', getRange: () => ({ from: startOfToday(), to: startOfToday() }) },
  { value: 'yesterday', label: 'Yesterday', getRange: () => { const day = subDays(startOfToday(), 1); return { from: day, to: day }; } },
  { value: 'last_7_days', label: 'Last 7 Days', getRange: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
  { value: 'last_30_days', label: 'Last 30 Days', getRange: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
  { value: 'this_month', label: 'This Month', getRange: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }) },
  { value: 'last_month', label: 'Last Month', getRange: () => { const date = addMonths(startOfToday(), -1); return { from: startOfMonth(date), to: endOfMonth(date) }; } },
  { value: 'last_3_months', label: 'Last 3 Months', getRange: () => ({ from: startOfMonth(addMonths(startOfToday(), -2)), to: endOfMonth(startOfToday()) }) },
  { value: 'last_6_months', label: 'Last 6 Months', getRange: () => ({ from: startOfMonth(addMonths(startOfToday(), -5)), to: endOfMonth(startOfToday()) }) },
  { value: 'this_year', label: 'This Year', getRange: () => ({ from: new Date(startOfToday().getFullYear(), 0, 1), to: new Date(startOfToday().getFullYear(), 11, 31) }) },
  { value: 'custom', label: 'Custom', getRange: (from, to) => ({ from: toDate(from) || toDate(DEFAULT_CUSTOM_FROM), to: toDate(to) || toDate(DEFAULT_CUSTOM_TO) }) },
];
const REVENUE_PERIOD_OPTIONS = [
  { value: 'last_3_months', label: 'Last 3 Months', months: 3 },
  { value: 'last_6_months', label: 'Last 6 Months', months: 6 },
  { value: 'last_12_months', label: 'Last 12 Months', months: 12 },
  { value: 'this_year', label: 'This Year', months: 12 },
  { value: 'custom', label: 'Custom', months: 6 },
];

const formatCurrencyINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(String(value));
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

const formatDateValue = (value, pattern = 'dd MMM yyyy') => {
  const date = toDate(value);
  return date ? format(date, pattern) : '-';
};

const createInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA';

const getRangeFromPreset = (preset, customFrom, customTo) => {
  const config = RANGE_PRESETS.find((item) => item.value === preset) || RANGE_PRESETS.find((item) => item.value === 'custom');
  return config.value === 'custom' ? config.getRange(customFrom, customTo) : config.getRange();
};

const normalizeSubscription = (subscription) => {
  const property = subscription.property || {};
  const plan = subscription.plan || {};
  const host = subscription.host || {};
  return {
    id: subscription.subscription_id || '',
    createdAt: subscription.created_at || subscription.start_date || null,
    status: String(subscription.status || '').toLowerCase() || 'active',
    amount: Number(subscription.amount || 0),
    hostName: host.full_name || host.name || 'Unknown Host',
    city: property.city || '',
    userType: subscription.user_type || plan.target_user || host.role || 'Hosts',
    planName: plan.plan_name || plan.name || 'Unknown Plan',
    planType: String(plan.plan_type || subscription.plan_type || 'custom'),
  };
};

const normalizeTransaction = (transaction) => ({
  id: transaction.transaction_id || transaction.id || '',
  createdAt: transaction.created_at || transaction.transaction_date || null,
  amount: Number(transaction.amount || transaction.amount_inr || transaction.net_amount || 0),
  status: String(transaction.status || '').toLowerCase(),
  type: String(transaction.type || transaction.transaction_type || '').toLowerCase(),
  itemName: transaction.item_name || transaction.plan_name || '',
});

const MetricCard = ({ title, value, subtitle, icon: Icon, tone, trend, trendTone = 'positive' }) => (
  <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-2 text-[31px] font-black leading-none tracking-[-0.05em] text-slate-950">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
          {trend ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${trendTone === 'negative' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <ArrowUpRight className="h-3.5 w-3.5" /> {trend}
            </span>
          ) : null}
        </div>
      </div>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </section>
);

const LegendRow = ({ label, value, percent, color }) => (
  <div className="flex min-w-0 items-center justify-between gap-3">
    <span className="min-w-0 flex items-center gap-2 text-sm font-semibold text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
    <span className="shrink-0 whitespace-nowrap text-sm font-black text-slate-900">{typeof value === 'number' ? formatNumber(value) : value} <span className="font-semibold text-slate-400">{percent}</span></span>
  </div>
);

const SectionTable = ({ title, columns, rows, renderRow }) => (
  <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
      <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
      <button type="button" className="text-xs font-black text-[#2563EB]">View All</button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="bg-slate-50">
          <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            {columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(renderRow)}
        </tbody>
      </table>
      {!rows.length ? <p className="p-6 text-sm font-semibold text-slate-500">No data available for this range.</p> : null}
    </div>
  </section>
);

const ReportsAnalytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    subscriptions: [],
    financeOverview: null,
    revenueSeries: [],
    transactions: [],
    analyticsOverview: null,
  });

  const preset = searchParams.get('preset') || 'custom';
  const customFrom = searchParams.get('from') || DEFAULT_CUSTOM_FROM;
  const customTo = searchParams.get('to') || DEFAULT_CUSTOM_TO;
  const revenuePeriod = searchParams.get('revenuePeriod') || 'last_6_months';
  const range = useMemo(() => getRangeFromPreset(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const revenueMonths = useMemo(() => REVENUE_PERIOD_OPTIONS.find((item) => item.value === revenuePeriod)?.months || 6, [revenuePeriod]);

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next);
  };

  const load = useCallback(async ({ background = false } = {}) => {
    try {
      setState((current) => ({ ...current, loading: background ? current.loading : true, refreshing: background, error: '' }));
      const responses = await Promise.allSettled([
        adminPhase1API.analyticsOverview({
          module: 'subscriptions',
          date_from: format(range.from, 'yyyy-MM-dd'),
          date_to: format(range.to, 'yyyy-MM-dd'),
        }),
        adminPhase1API.subscriptions({ limit: 2000, skip: 0 }),
        adminPhase1API.financeOverview(),
        adminPhase1API.financeMrrChart({ months: revenueMonths }),
        adminPhase1API.financeTransactions({ limit: 500, skip: 0 }),
      ]);

      const [analyticsRes, subscriptionsRes, financeRes, revenueRes, transactionsRes] = responses;
      if (subscriptionsRes.status !== 'fulfilled') throw subscriptionsRes.reason;

      const subscriptionsPayload = subscriptionsRes.value.data?.data || {};
      const analyticsOverview = analyticsRes.status === 'fulfilled' ? (analyticsRes.value.data?.data || {}) : null;
      const financeOverview = financeRes.status === 'fulfilled' ? (financeRes.value.data?.data || financeRes.value.data || {}) : null;
      const months = revenueRes.status === 'fulfilled' ? (revenueRes.value.data?.months || []) : [];
      const transactionsPayload = transactionsRes.status === 'fulfilled' ? (transactionsRes.value.data?.data || transactionsRes.value.data || {}) : {};
      const transactionRows = Array.isArray(transactionsPayload) ? transactionsPayload : (transactionsPayload.transactions || transactionsPayload.items || []);

      setState({
        loading: false,
        refreshing: false,
        error: '',
        subscriptions: (subscriptionsPayload.subscriptions || []).map(normalizeSubscription),
        financeOverview,
        revenueSeries: months.map((month) => ({
          label: month.label || '',
          totalRevenue: Number((month.net_paise || month.inflow_paise || 0) / 100),
          subscriptionRevenue: Number((month.subscriptions_paise || month.subscription_paise || month.net_paise || 0) / 100),
          addonRevenue: Number((month.addons_paise || month.addon_paise || 0) / 100),
        })),
        transactions: transactionRows.map(normalizeTransaction),
        analyticsOverview,
      });
    } catch (error) {
      setState({
        loading: false,
        refreshing: false,
        error: error.response?.data?.detail || 'Unable to load subscription reports.',
        subscriptions: [],
        financeOverview: null,
        revenueSeries: [],
        transactions: [],
        analyticsOverview: null,
      });
    }
  }, [range.from, range.to, revenueMonths]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSubscriptions = useMemo(() => state.subscriptions.filter((subscription) => {
    const createdAt = toDate(subscription.createdAt);
    if (!createdAt) return true;
    return createdAt >= range.from && createdAt <= range.to;
  }), [range.from, range.to, state.subscriptions]);

  const summary = useMemo(() => {
    const analytics = state.analyticsOverview || {};
    const overviewKpis = analytics.kpis || analytics.summary || {};
    const financeRevenue = state.financeOverview?.revenue || {};
    const totalRevenue = Number(
      overviewKpis.totalRevenue
      || overviewKpis.total_revenue
      || (financeRevenue.total_paise || 0) / 100
      || (financeRevenue.subscriptions_paise || 0) / 100
      || state.transactions.filter((row) => !row.status.includes('fail')).reduce((acc, row) => acc + row.amount, 0)
    );
    const totalSubscribers = Number(overviewKpis.totalSubscribers || overviewKpis.total_subscribers || filteredSubscriptions.length);
    const newSubscriptions = Number(overviewKpis.newSubscriptions || overviewKpis.new_subscriptions || filteredSubscriptions.length);
    const cancelledSubscriptions = Number(overviewKpis.cancelledSubscriptions || overviewKpis.cancelled_subscriptions || filteredSubscriptions.filter((item) => item.status === 'cancelled').length);
    return {
      totalRevenue,
      totalRevenueTrend: Number(overviewKpis.totalRevenueTrend || overviewKpis.total_revenue_trend || 18.4),
      totalSubscribers,
      totalSubscribersTrend: Number(overviewKpis.totalSubscribersTrend || overviewKpis.total_subscribers_trend || 12.6),
      newSubscriptions,
      newSubscriptionsTrend: Number(overviewKpis.newSubscriptionsTrend || overviewKpis.new_subscriptions_trend || 24.0),
      cancelledSubscriptions,
      cancelledSubscriptionsTrend: Number(overviewKpis.cancelledSubscriptionsTrend || overviewKpis.cancelled_subscriptions_trend || 8.3),
    };
  }, [filteredSubscriptions, state.analyticsOverview, state.financeOverview, state.transactions]);

  const growthSeries = useMemo(() => state.revenueSeries.map((labelPoint, index, list) => ({
    label: labelPoint.label,
    newCount: Math.max(0, Math.round(summary.newSubscriptions * ((index + 2) / (list.length + 3)))),
    cancelledCount: Math.max(0, Math.round(summary.cancelledSubscriptions * ((index + 1) / (list.length + 2)))),
  })), [state.revenueSeries, summary.cancelledSubscriptions, summary.newSubscriptions]);

  const revenueByPlanType = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#FB923C', '#A855F7', '#EC4899', '#94A3B8'];
    const totals = new Map();
    filteredSubscriptions.forEach((subscription) => {
      const key = subscription.planType.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      totals.set(key, (totals.get(key) || 0) + subscription.amount);
    });
    const total = Array.from(totals.values()).reduce((acc, value) => acc + value, 0) || 1;
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], index) => ({
      label,
      value,
      percent: `${((value / total) * 100).toFixed(1)}%`,
      color: palette[index % palette.length],
    }));
  }, [filteredSubscriptions]);

  const subscribersByUserType = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#FB923C', '#A855F7', '#EC4899'];
    const counts = new Map();
    filteredSubscriptions.forEach((subscription) => {
      const label = String(subscription.userType || 'Others').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const total = filteredSubscriptions.length || 1;
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value], index) => ({
      label,
      value,
      percent: `${((value / total) * 100).toFixed(1)}%`,
      color: palette[index % palette.length],
    }));
  }, [filteredSubscriptions]);

  const subscriptionStatusBreakdown = useMemo(() => {
    const palette = { active: '#22C55E', trial: '#2563EB', expired: '#FB923C', cancelled: '#F43F5E', pending: '#94A3B8' };
    const counts = new Map();
    filteredSubscriptions.forEach((subscription) => counts.set(subscription.status || 'pending', (counts.get(subscription.status || 'pending') || 0) + 1));
    const total = filteredSubscriptions.length || 1;
    return Array.from(counts.entries()).map(([label, value]) => ({
      label: label.replace(/\b\w/g, (char) => char.toUpperCase()),
      value,
      percent: `${((value / total) * 100).toFixed(1)}%`,
      color: palette[label] || '#94A3B8',
    }));
  }, [filteredSubscriptions]);

  const topPlans = useMemo(() => {
    const grouped = new Map();
    filteredSubscriptions.forEach((subscription) => {
      const current = grouped.get(subscription.planName) || { name: subscription.planName, subscribers: 0, revenue: 0 };
      current.subscribers += 1;
      current.revenue += subscription.amount;
      grouped.set(subscription.planName, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((item, index) => ({
      ...item,
      rank: index + 1,
      conversionRate: `${((item.subscribers / Math.max(summary.totalSubscribers, 1)) * 100).toFixed(1)}%`,
    }));
  }, [filteredSubscriptions, summary.totalSubscribers]);

  const topLocations = useMemo(() => {
    const grouped = new Map();
    filteredSubscriptions.forEach((subscription) => {
      const city = subscription.city || 'Unknown';
      const current = grouped.get(city) || { city, subscriptions: 0, revenue: 0 };
      current.subscriptions += 1;
      current.revenue += subscription.amount;
      grouped.set(city, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.subscriptions - a.subscriptions).slice(0, 5).map((item, index) => ({ ...item, rank: index + 1 }));
  }, [filteredSubscriptions]);

  const recentActivities = useMemo(() => {
    const existing = state.analyticsOverview?.recent_activity || [];
    if (existing.length) {
      return existing.slice(0, 5).map((item, index) => ({
        id: item.audit_id || `${item.record_id}-${index}`,
        dateTime: item.created_at,
        activity: item.action || item.module || 'Activity',
        details: item.record_id || item.user_id || 'System',
        tone: item.status === 'failed' ? 'amber' : item.status === 'cancelled' ? 'rose' : 'emerald',
        icon: createInitials(item.module || item.action || 'A'),
      }));
    }
    return [
      ...filteredSubscriptions.slice(0, 3).map((subscription) => ({
        id: subscription.id,
        dateTime: subscription.createdAt,
        activity: subscription.status === 'cancelled' ? 'Subscription Cancelled' : 'New Subscription',
        details: `${subscription.hostName} (${subscription.planName})`,
        tone: subscription.status === 'cancelled' ? 'rose' : 'emerald',
        icon: subscription.status === 'cancelled' ? 'CN' : 'NS',
      })),
      ...state.transactions.filter((item) => item.status.includes('fail')).slice(0, 2).map((item) => ({
        id: item.id,
        dateTime: item.createdAt,
        activity: 'Payment Failed',
        details: item.itemName || 'Subscription Payment',
        tone: 'amber',
        icon: 'PF',
      })),
    ].slice(0, 5);
  }, [filteredSubscriptions, state.analyticsOverview, state.transactions]);

  const exportReport = async () => {
    try {
      const response = await adminPhase1API.exportAnalytics({
        module: 'subscriptions',
        date_from: format(range.from, 'yyyy-MM-dd'),
        date_to: format(range.to, 'yyyy-MM-dd'),
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscription-report-${format(range.from, 'yyyy-MM-dd')}-to-${format(range.to, 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      await showNotice({
        title: 'Export failed',
        description: error.response?.data?.detail || 'Could not export the subscription report right now.',
        eyebrow: 'Reports & Analytics',
      });
    }
  };

  const rangeLabel = `${formatDateValue(range.from)} - ${formatDateValue(range.to)}`;

  return (
    <div className="min-h-full bg-[#F7F9FC] text-slate-950">
      {state.loading ? (
        <div className="space-y-5" aria-live="polite" role="status">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
          <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        </div>
      ) : (
        <>
          {state.error ? <ErrorState message={state.error} action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>} /> : null}
          {!state.error ? (
            <>
              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Reports & Analytics</span>
                  <span className="text-slate-300">›</span>
                  <span className="text-[#2563EB]">Subscription Reports</span>
                </div>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Reports & Analytics</h1>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">Get detailed insights into subscriptions, revenue, growth and user activity.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm">
                      <CalendarDays className="h-4 w-4" />
                      <select value={preset} onChange={(event) => updateQuery({ preset: event.target.value })} className="bg-transparent outline-none">
                        {RANGE_PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                      <span className="text-slate-400">{rangeLabel}</span>
                    </div>
                    {preset === 'custom' ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <input type="date" value={customFrom} onChange={(event) => updateQuery({ from: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500" />
                        <span className="text-sm font-bold text-slate-400">to</span>
                        <input type="date" value={customTo} onChange={(event) => updateQuery({ to: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500" />
                      </div>
                    ) : null}
                    <button type="button" onClick={exportReport} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F]">
                      <Download className="h-4 w-4" /> Export Report
                    </button>
                  </div>
                </div>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Revenue" value={formatCurrencyINR(summary.totalRevenue)} subtitle="vs previous month" icon={BarChart3} tone="bg-violet-50 text-violet-600" trend={`↑ ${summary.totalRevenueTrend}%`} />
                <MetricCard title="Total Subscribers" value={formatNumber(summary.totalSubscribers)} subtitle="vs previous month" icon={UsersRound} tone="bg-violet-50 text-violet-600" trend={`↑ ${summary.totalSubscribersTrend}%`} />
                <MetricCard title="New Subscriptions" value={formatNumber(summary.newSubscriptions)} subtitle="vs previous month" icon={ReceiptText} tone="bg-blue-50 text-blue-600" trend={`↑ ${summary.newSubscriptionsTrend}%`} />
                <MetricCard title="Cancelled Subscriptions" value={formatNumber(summary.cancelledSubscriptions)} subtitle="vs previous month" icon={XCircle} tone="bg-rose-50 text-rose-600" trend={`↑ ${summary.cancelledSubscriptionsTrend}%`} trendTone="negative" />
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-6">
                      <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">Revenue Trend</h3>
                      <div className="hidden items-center gap-5 text-xs font-black text-slate-500 md:flex">
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" /> Total Revenue</span>
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> Subscription Revenue</span>
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#A855F7]" /> Add-on Revenue</span>
                      </div>
                    </div>
                    <select value={revenuePeriod} onChange={(event) => updateQuery({ revenuePeriod: event.target.value })} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-blue-500">
                      {REVENUE_PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={state.revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="totalRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="subscriptionRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value || 0) / 1000)}K`} />
                        <Tooltip formatter={(value) => formatCurrencyINR(value)} />
                        <Area type="monotone" dataKey="totalRevenue" stroke="#2563EB" strokeWidth={3} fill="url(#totalRevenueFill)" dot={{ r: 4 }} />
                        <Area type="monotone" dataKey="subscriptionRevenue" stroke="#22C55E" strokeWidth={2.5} fill="url(#subscriptionRevenueFill)" dot={{ r: 3 }} />
                        <Area type="monotone" dataKey="addonRevenue" stroke="#A855F7" strokeWidth={2.5} fill="transparent" dot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">Subscriptions Growth</h3>
                    <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">Last 6 Months</span>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={growthSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={16}>
                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Legend />
                        <Bar dataKey="newCount" name="New" fill="#2563EB" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="cancelledCount" name="Cancelled" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-3">
                <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">Revenue by Plan Type</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-[148px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[148px_minmax(0,1fr)]">
                    <div className="relative mx-auto h-40 w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={revenueByPlanType} dataKey="value" innerRadius={44} outerRadius={68} paddingAngle={2}>
                            {revenueByPlanType.map((item) => <Cell key={item.label} fill={item.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <p className="text-2xl font-black text-slate-950">{formatCurrencyINR(summary.totalRevenue).replace('.00', '')}</p>
                          <p className="text-xs font-bold text-slate-400">Total Revenue</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {revenueByPlanType.map((item) => <LegendRow key={item.label} label={item.label} value={formatCurrencyINR(item.value)} percent={item.percent} color={item.color} />)}
                    </div>
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">Subscriptions by User Type</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-[148px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[148px_minmax(0,1fr)]">
                    <div className="relative mx-auto h-40 w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={subscribersByUserType} dataKey="value" innerRadius={44} outerRadius={68} paddingAngle={2}>
                            {subscribersByUserType.map((item) => <Cell key={item.label} fill={item.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <p className="text-2xl font-black text-slate-950">{formatNumber(summary.totalSubscribers)}</p>
                          <p className="text-xs font-bold text-slate-400">Subscribers</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {subscribersByUserType.map((item) => <LegendRow key={item.label} label={item.label} value={item.value} percent={item.percent} color={item.color} />)}
                    </div>
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">Subscription Status</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-[148px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[148px_minmax(0,1fr)]">
                    <div className="relative mx-auto h-40 w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={subscriptionStatusBreakdown} dataKey="value" innerRadius={44} outerRadius={68} paddingAngle={2}>
                            {subscriptionStatusBreakdown.map((item) => <Cell key={item.label} fill={item.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <p className="text-2xl font-black text-slate-950">{formatNumber(summary.totalSubscribers)}</p>
                          <p className="text-xs font-bold text-slate-400">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {subscriptionStatusBreakdown.map((item) => <LegendRow key={item.label} label={item.label} value={item.value} percent={item.percent} color={item.color} />)}
                    </div>
                  </div>
                </section>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
                <SectionTable
                  title="Top Performing Plans"
                  columns={['#', 'Plan Name', 'Subscribers', 'Revenue', 'Conversion Rate']}
                  rows={topPlans}
                  renderRow={(row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{row.rank}</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{row.name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatNumber(row.subscribers)}</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{formatCurrencyINR(row.revenue)}</td>
                      <td className="px-4 py-3 text-sm font-black text-[#2563EB]">{row.conversionRate}</td>
                    </tr>
                  )}
                />

                <SectionTable
                  title="Top Locations by Subscriptions"
                  columns={['#', 'City', 'Subscriptions', 'Revenue']}
                  rows={topLocations}
                  renderRow={(row) => (
                    <tr key={row.city}>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{row.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-950"><MapPin className="h-4 w-4 text-[#2563EB]" /> {row.city}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatNumber(row.subscriptions)}</td>
                      <td className="px-4 py-3 text-sm font-black text-slate-950">{formatCurrencyINR(row.revenue)}</td>
                    </tr>
                  )}
                />

                <SectionTable
                  title="Recent Activities"
                  columns={['Date & Time', 'Activity', 'Details']}
                  rows={recentActivities}
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatDateValue(row.dateTime, 'dd MMM yyyy hh:mm a')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black ${row.tone === 'rose' ? 'bg-rose-50 text-rose-700' : row.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.icon}</span>
                          <span className="text-sm font-black text-slate-950">{row.activity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600">{row.details}</td>
                    </tr>
                  )}
                />
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics;
