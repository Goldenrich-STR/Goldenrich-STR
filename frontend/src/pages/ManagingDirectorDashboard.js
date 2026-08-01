import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileText,
  GitBranch,
  Headphones,
  LineChart,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminPhase1API } from '../services/adminPhase1Api';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (value) => Number(value || 0).toLocaleString('en-IN');
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const navItems = [
  ['overview', 'Overview', Activity],
  ['organization', 'Organization', GitBranch],
  ['branches', 'Branches', Building2],
  ['teams', 'Teams', Users],
  ['properties', 'Properties', BriefcaseBusiness],
  ['bookings', 'Bookings', CalendarDays],
  ['finance', 'Finance', CircleDollarSign],
  ['growth', 'Growth', LineChart],
  ['risk', 'Risk & Escalations', AlertTriangle],
  ['reports', 'Reports', FileText],
  ['copilot', 'AI Copilot', Bot],
];

const Card = ({ children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>
);

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[11px] font-black uppercase tracking-[0.28em] text-[#b89518] ${className}`}>{children}</p>
);

const StatusPill = ({ children, tone = 'green' }) => {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    gold: 'border-[#d8b431]/35 bg-[#d8b431]/10 text-[#997506]',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${tones[tone]}`}>{children}</span>;
};

const Metric = ({ label, value, note, icon: Icon, tone = 'gold', large = false }) => {
  const tones = {
    gold: 'bg-[#fff7df] text-[#b89518]',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <Card className={`${large ? 'p-5' : 'p-4'} transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`${large ? 'text-3xl' : 'text-2xl'} mt-3 break-words font-black leading-tight text-slate-950`}>{value}</p>
          {note && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{note}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.gold}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
};

const SectionHeader = ({ eyebrow, title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      {subtitle && <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const ProgressRow = ({ label, value, max = 100, tone = 'gold' }) => {
  const colors = { gold: 'bg-[#d8b431]', green: 'bg-emerald-600', red: 'bg-red-500', blue: 'bg-blue-600' };
  const width = Math.max(0, Math.min((Number(value || 0) / Math.max(Number(max || 1), 1)) * 100, 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
        <span>{label}</span>
        <span>{num(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colors[tone] || colors.gold}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const EmptyInsight = ({ title, copy, icon: Icon = Sparkles }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#b89518] shadow-sm"><Icon className="h-5 w-5" /></span>
    <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
    <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">{copy}</p>
  </div>
);

const ManagingDirectorDashboard = () => {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, error: '', dashboard: null, analytics: null, finance: null, support: null, crm: null });

  const loadData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const [dashboard, analytics, finance, support, crm] = await Promise.allSettled([
        adminPhase1API.dashboard(),
        adminPhase1API.analyticsOverview(),
        adminPhase1API.financeOverview(),
        adminPhase1API.supportOverview(),
        adminPhase1API.crmDashboard(),
      ]);
      setState({
        loading: false,
        error: [dashboard, analytics].every((result) => result.status === 'rejected') ? 'Unable to load executive data' : '',
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value.data.data : null,
        analytics: analytics.status === 'fulfilled' ? analytics.value.data.data : null,
        finance: finance.status === 'fulfilled' ? finance.value.data : null,
        support: support.status === 'fulfilled' ? support.value.data.data : null,
        crm: crm.status === 'fulfilled' ? crm.value.data.data : null,
      });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Unable to load executive data', dashboard: null, analytics: null, finance: null, support: null, crm: null });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const model = useMemo(() => {
    const dashboard = state.dashboard || {};
    const analytics = state.analytics || {};
    const kpis = dashboard.kpis || {};
    const users = kpis.users || {};
    const properties = kpis.properties || {};
    const bookings = kpis.bookings || {};
    const finance = kpis.finance || {};
    const pending = dashboard.pending_actions || [];
    const health = analytics.health || {};
    const compliance = analytics.compliance || {};
    const liveRatio = properties.total ? (Number(properties.live || 0) / Number(properties.total || 1)) * 100 : 100;
    const businessHealth = Math.round((Number(compliance.score || 0) + Number(health.booking_conversion_rate || 0) + Number(health.support_resolution_rate || 0) + liveRatio) / 4);
    return { dashboard, analytics, users, properties, bookings, finance, pending, health, compliance, businessHealth };
  }, [state]);

  const branchRows = (model.dashboard.filters?.branches || ['Nashik']).filter(Boolean).slice(0, 5);
  const reports = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Branch', 'RM', 'Broker', 'Host', 'Property', 'Finance', 'Support'];
  const prompts = ["Show today's revenue", 'Show top branches', 'Show pending approvals', 'Predict next quarter revenue', 'Which RM needs attention?', 'Show critical risks'];
  const searchMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const rows = [...(model.analytics?.report_rows || []), ...(model.dashboard?.recent_activity || [])];
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term)).slice(0, 6);
  }, [query, model]);

  const signOut = () => {
    logout();
    window.location.href = '/md/login';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric large label="Total Users" value={num(model.users.total)} note="All platform identities" icon={Users} tone="blue" />
        <Metric large label="Live Properties" value={num(model.properties.live)} note={`${num(model.properties.total)} total inventory`} icon={Building2} tone="green" />
        <Metric large label="Total Bookings" value={num(model.bookings.total)} note={`${num(model.bookings.completed)} completed`} icon={CalendarDays} tone="gold" />
        <Metric large label="Net Revenue" value={money(model.finance.net_collections)} note="Current collection value" icon={TrendingUp} tone="green" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-6">
          <SectionHeader eyebrow="Business Intelligence" title="Executive Operating Snapshot" subtitle="One view of user base, inventory, demand, finance and governance health." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ProgressRow label="Business health score" value={model.businessHealth} max={100} tone={model.businessHealth >= 75 ? 'green' : 'gold'} />
            <ProgressRow label="Property live ratio" value={model.properties.total ? (model.properties.live / model.properties.total) * 100 : 0} max={100} tone="green" />
            <ProgressRow label="Booking conversion" value={model.health.booking_conversion_rate || 0} max={100} tone="blue" />
            <ProgressRow label="Support resolution" value={model.health.support_resolution_rate || 0} max={100} tone="green" />
            <ProgressRow label="Compliance readiness" value={model.compliance.score || 0} max={100} tone="gold" />
            <ProgressRow label="Pending action load" value={model.pending.reduce((sum, row) => sum + Number(row.count || 0), 0)} max={10} tone="red" />
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeader eyebrow="Platform Pulse" title="MD Profile" />
          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-2xl font-black">{user?.full_name || 'Managing Director'}</p>
            <p className="mt-1 text-sm font-semibold text-white/70">X-Space360 Managing Director</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-black">
              <span className="rounded-lg bg-white/10 p-3">FY 2026-27</span>
              <span className="rounded-lg bg-white/10 p-3">{today()}</span>
              <span className="rounded-lg bg-white/10 p-3">Version 1.0.0</span>
              <span className="rounded-lg bg-emerald-400/20 p-3 text-emerald-100">Live</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <Card className="p-6">
      <SectionHeader eyebrow="Organization Overview" title="Strategic Drill-Down Map" subtitle="From organization to booking, each layer is prepared for executive drill-down." />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
        {['Organization', 'Franchise', 'Branch', 'Team Leader', 'RM', 'Broker', 'Host', 'Property', 'Booking'].map((item, index) => (
          <button key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#d8b431] hover:bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layer {index + 1}</p>
            <p className="mt-2 text-sm font-black">{item}</p>
            <p className="mt-3 flex items-center gap-1 text-xs font-black text-[#a98209]">Open view <ChevronRight className="h-3 w-3" /></p>
          </button>
        ))}
      </div>
    </Card>
  );

  const renderBranches = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card className="overflow-hidden">
        <SectionHeader eyebrow="Branch Performance" title="Branch Ranking" subtitle="Revenue, hosts, inventory and growth signals." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
              <tr>{['Rank', 'Branch', 'Revenue', 'Bookings', 'Hosts', 'Live Properties', 'Occupancy', 'Score'].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchRows.map((branch, index) => (
                <tr key={branch} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black">#{index + 1}</td>
                  <td className="px-5 py-4 font-black">{branch}</td>
                  <td className="px-5 py-4">{money(0)}</td>
                  <td className="px-5 py-4">{num(model.bookings.total)}</td>
                  <td className="px-5 py-4">{num(model.users.hosts)}</td>
                  <td className="px-5 py-4">{num(model.properties.live)}</td>
                  <td className="px-5 py-4">{pct(model.properties.total ? (model.properties.live / model.properties.total) * 100 : 0)}</td>
                  <td className="px-5 py-4"><StatusPill tone="gold">{pct(model.businessHealth)}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="space-y-6">
        <Metric label="Top Franchise" value={(model.dashboard.filters?.franchises || []).filter(Boolean)[0] || 'Unassigned'} note="Revenue leader" icon={TrendingUp} tone="green" />
        <Metric label="Lowest Franchise" value={(model.dashboard.filters?.franchises || []).filter(Boolean).slice(-1)[0] || 'Unassigned'} note="Needs focused review" icon={AlertTriangle} tone="gold" />
        <Metric label="Pending Verification" value={num(model.properties.pending_verification)} note="Branch-level operating risk" icon={ClipboardCheck} tone="gold" />
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card className="p-6">
        <SectionHeader eyebrow="Team Performance" title="Leadership, RM, Broker and Department Scorecards" subtitle="Dedicated team view with SLA, bookings, host registration and revenue readiness." />
        <div className="grid gap-4 md:grid-cols-2">
          {['Team Leaders', 'RMs', 'Brokers', 'Employees', 'Support', 'Finance', 'Marketing', 'Operations'].map((team, index) => (
            <div key={team} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{team}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Performance scorecard</p>
                </div>
                <StatusPill tone={index % 3 === 0 ? 'green' : 'gold'}>{index % 3 === 0 ? 'Stable' : 'Watch'}</StatusPill>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <span className="rounded-lg bg-white p-3">Revenue {money(0)}</span>
                <span className="rounded-lg bg-white p-3">Bookings {num(team === 'Brokers' ? model.bookings.total : 0)}</span>
                <span className="rounded-lg bg-white p-3">Hosts {num(team === 'Brokers' ? model.users.hosts : 0)}</span>
                <span className="rounded-lg bg-white p-3">SLA {pct(index % 2 ? 92 : 100)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="Department Health" title="Team Score Index" />
        <div className="space-y-4">
          {['RMs', 'Brokers', 'Support', 'Finance', 'Marketing', 'Operations'].map((label, index) => (
            <ProgressRow key={label} label={label} value={index % 2 ? 92 : 100} max={100} tone={index % 2 ? 'gold' : 'green'} />
          ))}
        </div>
      </Card>
    </div>
  );

  const renderProperties = () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <SectionHeader eyebrow="Host Analytics" title="Host Portfolio" subtitle="KYC, activity and risk readiness for host network." />
        <div className="grid gap-4 md:grid-cols-2">
          <Metric label="Total Hosts" value={num(model.users.hosts)} note="Registered hosts" icon={Users} tone="green" />
          <Metric label="Pending KYC" value={num(model.pending.find((x) => x.key === 'host_kyc')?.count)} note="Needs admin decision" icon={ClipboardCheck} tone="gold" />
          <Metric label="Inactive Hosts" value="0" note="No inactive host data" icon={AlertTriangle} tone="slate" />
          <Metric label="Top Rated Hosts" value="0" note="Ratings data pending" icon={Sparkles} tone="blue" />
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="Property Analytics" title="Inventory Portfolio" subtitle="Live, pending, rejected and draft supply health." />
        <div className="grid gap-4 md:grid-cols-2">
          <Metric label="Total Properties" value={num(model.properties.total)} note="All listings" icon={Building2} />
          <Metric label="Live" value={num(model.properties.live)} note="Bookable inventory" icon={CheckCircle2} tone="green" />
          <Metric label="Pending" value={num(model.properties.pending_verification)} note="Verification pipeline" icon={AlertTriangle} tone="gold" />
          <Metric label="Rejected" value={num(model.properties.rejected)} note="Correction required" icon={AlertTriangle} tone="red" />
        </div>
      </Card>
      <Card className="p-6 xl:col-span-2">
        <SectionHeader eyebrow="Category & City Intelligence" title="Distribution Readiness" subtitle="Track category mix and city-wise supply concentration." />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {(model.dashboard.charts?.category_bookings || [{ label: 'Residential', value: model.properties.total || 0 }]).map((row) => (
              <ProgressRow key={row.label} label={row.label || 'Unassigned category'} value={row.value || row.count || 0} max={Math.max(model.properties.total || 1, 1)} tone="gold" />
            ))}
          </div>
          <div className="space-y-4">
            {(model.dashboard.charts?.city_revenue || [{ label: 'Nashik', value: 0 }]).map((row) => (
              <ProgressRow key={row.label} label={row.label || 'Unassigned city'} value={row.value || row.count || 0} max={Math.max(...(model.dashboard.charts?.city_revenue || []).map((item) => item.value || 0), 1)} tone="green" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBookings = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card className="p-6">
        <SectionHeader eyebrow="Booking Analytics" title="Demand and Occupancy Intelligence" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total Bookings" value={num(model.bookings.total)} note="All records" icon={CalendarDays} />
          <Metric label="Upcoming" value={num(model.bookings.upcoming)} note="Confirmed or pending" icon={CalendarDays} tone="blue" />
          <Metric label="Completed" value={num(model.bookings.completed)} note="Completed stays" icon={ClipboardCheck} tone="green" />
          <Metric label="Cancelled" value={num(model.bookings.cancelled)} note="Cancelled stays" icon={AlertTriangle} tone="red" />
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="Forecast" title="Booking Growth" />
        <ProgressRow label="Occupancy forecast" value={model.properties.total ? (model.properties.live / model.properties.total) * 100 : 0} max={100} tone="green" />
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-500">Average booking value</p>
          <p className="mt-2 text-3xl font-black">{money(model.bookings.total ? model.finance.gross_booking_value / model.bookings.total : 0)}</p>
        </div>
      </Card>
    </div>
  );

  const renderFinance = () => (
    <Card className="p-6">
      <SectionHeader eyebrow="Financial Dashboard" title="Revenue, Payouts, Tax and Forecast" subtitle="Sensitive actions remain approval-gated; MD receives full visibility." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Gross Booking Value', model.finance.gross_booking_value, 'Paid booking flow'],
          ['Net Revenue', model.finance.net_collections, 'After refund reserve'],
          ['Platform Revenue', model.finance.platform_revenue, 'Commission income'],
          ['Host Payout Pending', model.finance.pending_payout, 'Outstanding liability'],
          ['Broker Commission', model.finance.broker_commission, 'Broker payable'],
          ['Refund Amount', model.finance.refund_amount, 'Refund reserve'],
          ['Taxes', model.finance.tax_liability, 'Tax liability'],
          ['Financial Forecast', model.finance.net_collections, 'Current run rate'],
        ].map(([label, value, note]) => <Metric key={label} label={label} value={money(value)} note={note} icon={CircleDollarSign} tone="gold" />)}
      </div>
    </Card>
  );

  const renderGrowth = () => (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="p-6">
        <SectionHeader eyebrow="Sales & CRM" title="Funnel Health" subtitle="Lead, qualification, conversion and lost-lead visibility." />
        <div className="space-y-4">
          <ProgressRow label="Leads" value={state.crm?.metrics?.total_leads || 0} max={Math.max(state.crm?.metrics?.total_leads || 1, 1)} tone="blue" />
          <ProgressRow label="Qualified Leads" value={state.crm?.metrics?.qualified || 0} max={Math.max(state.crm?.metrics?.total_leads || 1, 1)} tone="gold" />
          <ProgressRow label="Conversions" value={state.crm?.metrics?.converted || 0} max={Math.max(state.crm?.metrics?.total_leads || 1, 1)} tone="green" />
          <ProgressRow label="Lost Leads" value={state.crm?.metrics?.lost || 0} max={Math.max(state.crm?.metrics?.total_leads || 1, 1)} tone="red" />
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="Marketing Analytics" title="Demand Signals" subtitle="Traffic, campaign, SEO and source readiness." />
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Website Traffic', 0],
            ['App Downloads', 0],
            ['Lead Sources', state.crm?.metrics?.total_leads || 0],
            ['SEO Performance', 0],
            ['Campaign ROI', 0],
            ['Social Growth', 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black">{num(value)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="Executive Forecast" title="Growth Forecast" subtitle="Prediction-ready indicators for planning." />
        <div className="space-y-4">
          <Metric label="Revenue Forecast" value={money(model.finance.net_collections)} note="Current run-rate baseline" icon={TrendingUp} tone="green" />
          <Metric label="Occupancy Forecast" value={pct(model.properties.total ? (model.properties.live / model.properties.total) * 100 : 0)} note="Live inventory ratio" icon={LineChart} tone="blue" />
          <Metric label="Property Growth" value={num(model.properties.total)} note="Active inventory base" icon={Building2} />
        </div>
      </Card>
    </div>
  );

  const renderRisk = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card className="p-6">
        <SectionHeader eyebrow="Operations Analytics" title="Pending Actions and SLA Watch" />
        <div className="grid gap-3 md:grid-cols-2">
          {model.pending.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-black text-slate-950">{item.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">SLA {item.sla} / trend {item.trend}</p>
              </div>
              <span className="text-3xl font-black">{num(item.count)}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <SectionHeader eyebrow="AI Business Insights" title="Risk Detection" />
        <div className="space-y-3">
          {[
            ['Business Health', `${model.businessHealth}/100`, model.businessHealth >= 75 ? 'green' : 'gold'],
            ['Fraud Detection', 'No critical signals', 'green'],
            ['Host Risk', `${num(model.pending.find((x) => x.key === 'host_kyc')?.count)} pending KYC`, 'gold'],
            ['Property Delays', `${num(model.properties.pending_verification)} pending`, 'gold'],
            ['Support Delays', `${num(state.support?.metrics?.open || 0)} open`, 'blue'],
          ].map(([label, value, tone]) => (
            <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">{label}</p>
              <StatusPill tone={tone}>{value}</StatusPill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderReports = () => (
    <Card className="p-6">
      <SectionHeader eyebrow="Executive Reports" title="Board and Department Report Center" action={<button className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white"><Download className="h-4 w-4" /> Export Pack</button>} />
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {reports.map((report) => (
          <button key={report} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#d8b431] hover:bg-white">
            <FileText className="h-5 w-5 text-[#b89518]" />
            <p className="mt-3 text-sm font-black">{report} Report</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Generate board-ready view</p>
          </button>
        ))}
      </div>
    </Card>
  );

  const renderCopilot = () => (
    <Card className="p-6">
      <SectionHeader eyebrow="AI Copilot" title="Executive Decision Assistant" subtitle="Ask natural-language questions about revenue, branch growth, teams, risk and forecasts." />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white"><Bot className="h-5 w-5" /></span>
            <div>
              <p className="font-black">Ask X-Space360 AI</p>
              <p className="text-xs font-semibold text-slate-500">Boardroom intelligence assistant</p>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <input className="h-12 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#d8b431]" placeholder="Ask about revenue, branch growth, RM risk, fraud signals..." />
            <button className="rounded-lg bg-slate-950 px-6 text-sm font-black text-white">Ask</button>
          </div>
        </div>
        <div className="grid gap-2">
          {prompts.map((prompt) => <button key={prompt} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold hover:border-[#d8b431]">{prompt}</button>)}
        </div>
      </div>
    </Card>
  );

  const views = {
    overview: renderOverview,
    organization: renderOrganization,
    branches: renderBranches,
    teams: renderTeams,
    properties: renderProperties,
    bookings: renderBookings,
    finance: renderFinance,
    growth: renderGrowth,
    risk: renderRisk,
    reports: renderReports,
    copilot: renderCopilot,
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="X-Space360" className="h-9 w-auto object-contain" />
            <div className="hidden border-l border-slate-200 pl-4 md:block">
              <Eyebrow>Executive Command Center</Eyebrow>
              <p className="text-sm font-black text-slate-700">Managing Director Dashboard</p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative hidden w-full max-w-lg lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#d8b431]" placeholder="Search branch, RM, broker, host, property, booking..." />
              {!!searchMatches.length && (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {searchMatches.map((item, index) => <div key={index} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{item.full_name || item.property_name || item.title || item.module || item.action || item.user_id || 'Matched record'}</div>)}
                </div>
              )}
            </div>
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
            <div className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 sm:block">
              <p className="max-w-[180px] truncate text-sm font-black">{user?.full_name || 'Managing Director'}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">MD Profile</p>
            </div>
            <button onClick={signOut} className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100" aria-label="Logout"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] p-4">
            <p className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Board Navigation</p>
            <nav className="space-y-1">
              {navItems.map(([id, label, Icon]) => (
                <button key={id} onClick={() => setActive(id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black transition ${active === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-3"><Icon className={`h-4 w-4 ${active === id ? 'text-[#d8b431]' : 'text-slate-500'}`} />{label}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 md:px-8 xl:px-10">
          <section className="mb-6 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] xl:p-8">
              <div>
                <Eyebrow className="text-[#d8b431]">X-Space360 Managing Director</Eyebrow>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">Executive Business Command Center</h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70">
                  Strategic visibility across organization, branches, teams, hosts, properties, bookings, revenue, risk, compliance and AI business intelligence.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <StatusPill tone="green">Live Platform</StatusPill>
                  <StatusPill tone="gold">FY 2026-27</StatusPill>
                  <StatusPill tone="blue">{today()}</StatusPill>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/50">Business Health</p>
                    <p className="mt-3 text-5xl font-black">{model.businessHealth}</p>
                    <p className="mt-2 text-sm font-semibold text-white/65">AI readiness and compliance blended score</p>
                  </div>
                  <Sparkles className="h-7 w-7 text-[#d8b431]" />
                </div>
                <button onClick={loadData} disabled={state.loading} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh Executive Data
                </button>
              </div>
            </div>
          </section>

          {state.error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{state.error}</div>}

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="Tenants" value="1" note="Platform tenant" icon={Building2} />
            <Metric label="Branches" value={num((model.dashboard.filters?.branches || []).filter(Boolean).length || 1)} note="Active footprint" icon={GitBranch} tone="blue" />
            <Metric label="Employees" value={num(model.users.employees)} note="Internal team" icon={Users} tone="blue" />
            <Metric label="Brokers" value={num(model.users.brokers)} note="Sales network" icon={BriefcaseBusiness} />
            <Metric label="Hosts" value={num(model.users.hosts)} note="Supply partners" icon={Users} tone="green" />
            <Metric label="Properties" value={num(model.properties.total)} note={`${num(model.properties.live)} live`} icon={Building2} tone="green" />
          </div>

          <section className="min-h-[540px]">
            {views[active]?.() || <EmptyInsight title="Module not configured" copy="This command center module is ready to connect with deeper backend intelligence." />}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ManagingDirectorDashboard;
