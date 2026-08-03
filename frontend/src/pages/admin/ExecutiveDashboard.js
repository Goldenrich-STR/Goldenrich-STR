import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpRight, Building2, CalendarCheck, CheckCircle2, IndianRupee, RefreshCw, TrendingUp, Users, Zap } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney } from './shared';

const chartColors = ['#2F6DF6', '#60A5FA', '#93C5FD', '#BFDBFE', '#2563EB', '#1D4ED8', '#0F172A'];
const defaultFilters = { date_range: '', business_division: '', branch: '', franchise: '', city: '', property_category: '', department: '', status: '' };

const toneClasses = {
  gold: 'bg-[#eef5ff] text-[#2f6df6]',
  green: 'bg-[#f3f7ff] text-[#4f7de8]',
  blue: 'bg-[#ecf3ff] text-[#2f6df6]',
};

const Kpi = ({ label, value, icon: Icon, tone = 'gold', path, onNavigate }) => (
  <Panel className={`p-5 transition duration-300 ${path ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_55px_rgba(37,99,235,0.08)]' : ''}`}>
    <button
      className="w-full text-left"
      disabled={!path}
      onClick={() => path && onNavigate(path)}
      type="button"
    >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-3 text-[34px] font-black leading-none tracking-[-0.04em] text-slate-950">{value}</p>
        {path && <p className="mt-3 text-xs font-semibold text-slate-400">Open full module insights</p>}
      </div>
      <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.gold}`}><Icon className="h-5 w-5" /></span>
    </div>
    {path && <p className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-[#2f6df6]">View Details <ArrowUpRight className="h-3.5 w-3.5" /></p>}
    </button>
  </Panel>
);

const ChartPanel = ({ title, type = 'bar', data }) => (
  <Panel className="p-5">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-base font-black tracking-[-0.03em] text-slate-950">{title}</h2>
      <button type="button" className="text-slate-300">•••</button>
    </div>
    <div className="h-64">
      <ResponsiveContainer>
        {type === 'area' ? (
          <AreaChart data={data}><CartesianGrid stroke="#e8edf5" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip /><Area dataKey="value" stroke="#2f6df6" fill="#2f6df6" fillOpacity={0.12} strokeWidth={3} /></AreaChart>
        ) : type === 'pie' ? (
          <PieChart><Tooltip /><Pie data={data} dataKey="value" nameKey="label" outerRadius={85} innerRadius={52}>{data.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie></PieChart>
        ) : (
          <BarChart data={data}><CartesianGrid stroke="#e8edf5" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip /><Bar dataKey="value" fill="#2f6df6" radius={[8, 8, 0, 0]} /></BarChart>
        )}
      </ResponsiveContainer>
    </div>
  </Panel>
);

const FilterSelect = ({ label, value, options, onChange }) => (
  <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">{label}</option>
    {options.filter(Boolean).map((option) => <option key={option} value={option}>{String(option).replace(/_/g, ' ')}</option>)}
  </select>
);

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.dashboard(params);
      setState({ loading: false, error: '', data: res.data.data });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load dashboard', data: null });
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  if (state.loading && !state.data) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} />;

  const { kpis, pending_actions: pending, charts, recent_activity: activity, quick_actions: quickActions, filters: filterOptions } = state.data;
  const userKpis = [
    ['Total Users', kpis.users.total, Users, '/admin/users'],
    ['Total Hosts', kpis.users.hosts, Users, '/admin/hosts'],
    ['Total Guests', kpis.users.guests, Users, '/admin/users'],
    ['Total Employees', kpis.users.employees, Users, '/admin/users'],
    ['Total Brokers', kpis.users.brokers, Users, '/admin/users'],
  ];
  const propertyKpis = [
    ['Total Properties', kpis.properties.total, Building2, '/admin/properties'],
    ['Live Properties', kpis.properties.live, Building2, '/admin/properties'],
    ['Pending Verification', kpis.properties.pending_verification, AlertTriangle, '/admin/properties'],
    ['Rejected Properties', kpis.properties.rejected, AlertTriangle, '/admin/properties'],
    ['Inactive Properties', kpis.properties.inactive, Building2, '/admin/properties'],
  ];
  const bookingKpis = [
    ['Total Bookings', kpis.bookings.total, CalendarCheck, '/admin/bookings'],
    ['Upcoming Bookings', kpis.bookings.upcoming, CalendarCheck, '/admin/bookings'],
    ['Active Stays', kpis.bookings.active_stays, CalendarCheck, '/admin/bookings'],
    ['Completed Bookings', kpis.bookings.completed, CheckCircle2, '/admin/bookings'],
    ['Cancelled Bookings', kpis.bookings.cancelled, AlertTriangle, '/admin/bookings'],
  ];
  const financeKpis = [
    ['Gross Booking Value', formatMoney(kpis.finance.gross_booking_value), IndianRupee, '/admin/finance'],
    ['Net Collections', formatMoney(kpis.finance.net_collections), IndianRupee, '/admin/finance'],
    ['Platform Revenue', formatMoney(kpis.finance.platform_revenue), TrendingUp, '/admin/finance'],
    ['Host Payable', formatMoney(kpis.finance.host_payable), IndianRupee, '/admin/finance'],
    ['Host Paid', formatMoney(kpis.finance.host_paid), CheckCircle2, '/admin/finance'],
    ['Pending Payout', formatMoney(kpis.finance.pending_payout), AlertTriangle, '/admin/finance'],
    ['Tax Liability', formatMoney(kpis.finance.tax_liability), IndianRupee, '/admin/finance'],
    ['Refund Amount', formatMoney(kpis.finance.refund_amount), IndianRupee, '/admin/finance'],
    ['Broker Commission', formatMoney(kpis.finance.broker_commission), IndianRupee, '/admin/finance'],
  ];

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        eyebrow="Performance Command Center"
        description="Monitor platform activity, approvals, bookings, property operations, revenue, settlements and team performance from one centralized dashboard."
        action={<button onClick={load} className="inline-flex items-center gap-2 rounded-full bg-[#2f6df6] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(47,109,246,0.24)] transition hover:bg-[#225fe8]"><RefreshCw className="h-4 w-4" /> Refresh</button>}
      />
      <Panel className="mb-6 p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
          <FilterSelect label="Date Range" value={filters.date_range} options={['today', 'last_7_days', 'last_30_days', 'this_month']} onChange={(value) => setFilter('date_range', value)} />
          <FilterSelect label="Business Division" value={filters.business_division} options={['Residential Stays', 'Commercial Workspaces', 'Event Venues']} onChange={(value) => setFilter('business_division', value)} />
          <FilterSelect label="Branch" value={filters.branch} options={filterOptions.branches || []} onChange={(value) => setFilter('branch', value)} />
          <FilterSelect label="Franchise" value={filters.franchise} options={filterOptions.franchises || []} onChange={(value) => setFilter('franchise', value)} />
          <FilterSelect label="City" value={filters.city} options={filterOptions.cities || []} onChange={(value) => setFilter('city', value)} />
          <FilterSelect label="Property Category" value={filters.property_category} options={filterOptions.property_categories || []} onChange={(value) => setFilter('property_category', value)} />
          <FilterSelect label="Department" value={filters.department} options={filterOptions.departments || []} onChange={(value) => setFilter('department', value)} />
          <FilterSelect label="Status" value={filters.status} options={['active', 'inactive', 'live', 'pending_verification', 'under_review', 'rejected']} onChange={(value) => setFilter('status', value)} />
        </div>
      </Panel>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Users</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{userKpis.map(([label, value, Icon, path]) => <Kpi key={label} label={label} value={value} icon={Icon} path={path} onNavigate={navigate} />)}</div>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Properties</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{propertyKpis.map(([label, value, Icon, path]) => <Kpi key={label} label={label} value={value} icon={Icon} tone="green" path={path} onNavigate={navigate} />)}</div>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Bookings</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{bookingKpis.map(([label, value, Icon, path]) => <Kpi key={label} label={label} value={value} icon={Icon} tone="blue" path={path} onNavigate={navigate} />)}</div>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Finance</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{financeKpis.map(([label, value, Icon, path]) => <Kpi key={label} label={label} value={value} icon={Icon} path={path} onNavigate={navigate} />)}</div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Pending Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pending.map((item) => (
            <Panel key={item.key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-black text-slate-900">{item.label}</p><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{item.count}</p><p className="mt-2 text-xs font-semibold text-slate-500">SLA warning: {item.sla}</p></div>
                <AlertTriangle className="h-5 w-5 text-[#2f6df6]" />
              </div>
              <div className="mt-4 flex items-center justify-between"><StatusBadge value={item.trend} /><button onClick={() => navigate(item.path)} className="text-sm font-bold text-[#2f6df6]">View Details</button></div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Booking Trend" type="area" data={charts.booking_trend} />
        <ChartPanel title="Revenue Trend" data={charts.revenue_trend} />
        <ChartPanel title="Property Growth" data={charts.property_growth} />
        <ChartPanel title="Host Registration Trend" data={charts.host_registration_trend} />
        <ChartPanel title="Category-wise Bookings" type="pie" data={charts.category_bookings} />
        <ChartPanel title="City-wise Revenue" data={charts.city_revenue} />
        <ChartPanel title="Property Approval Turnaround Time" data={charts.approval_turnaround} />
        <ChartPanel title="Payout Status Distribution" type="pie" data={charts.payout_status} />
        <ChartPanel title="Refund Trend" data={charts.refund_trend} />
        <ChartPanel title="Support Ticket Trend" data={charts.support_ticket_trend} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-5"><h2 className="text-base font-black tracking-[-0.03em]">Recent Activity</h2></div>
          <div className="divide-y divide-slate-100">{activity.length ? activity.map((item) => <div key={item.audit_id} className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#2f6df6]" /><span className="text-sm font-semibold capitalize">{item.action?.replace(/_/g, ' ')}</span></div><StatusBadge value={item.module} /></div>) : <p className="p-5 text-sm text-slate-500">No audit activity yet.</p>}</div>
        </Panel>
        <Panel className="p-5">
          <h2 className="mb-4 text-base font-black tracking-[-0.03em]">Quick Actions</h2>
          <div className="grid gap-3">{quickActions.map((action) => <button key={action.label} onClick={() => navigate(action.path)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold hover:bg-slate-50"><span className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#2f6df6]" /> {action.label}</span><span className="text-slate-400">Open</span></button>)}</div>
        </Panel>
      </section>
    </div>
  );
};

export default ExecutiveDashboard;
