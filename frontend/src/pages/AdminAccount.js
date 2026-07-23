import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Download, IndianRupee, TrendingUp, Wallet, Users,
  RefreshCcw, CheckCircle, XCircle, AlertCircle, Clock,
<<<<<<< HEAD
  Share2, FileText, Mail, MessageSquare, Printer,
=======
  Search, Share2, FileText, Mail, MessageSquare, Printer, Check, SlidersHorizontal, CalendarDays, ChevronLeft, ChevronRight
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { accountAPI, bookingAPI } from '../services/api';
import CouponManagement from '../components/admin/CouponManagement';
import { BookingManagement, SubscriptionManagement } from './AdminDashboard';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Math.abs(Number(paise || 0)) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'bookings',     label: 'Bookings' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'coupons',      label: 'Coupons' },
  { id: 'payouts',      label: 'Payouts' },
  { id: 'refunds',      label: 'Refunds' },
  { id: 'top-hosts',    label: 'Top Hosts' },
];

const AdminAccount = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  // Redirect if not admin — defensive, App-level guard also in place
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-stone" data-testid="admin-account-page">
      <header className="header-glass px-6 py-4">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-terracotta hover:underline flex items-center space-x-1"
              data-testid="back-to-admin-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-charcoal">X-Space360 · Admin Account</h1>
          </div>
          <button
            onClick={logout}
            className="text-terracotta hover:underline"
            data-testid="logout-btn"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="w-full px-6 py-6">
        <nav className="flex flex-wrap gap-2 mb-6" data-testid="account-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-terracotta text-white'
                  : 'bg-white text-charcoal hover:bg-gray-50 border border-gray-100'
              }`}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'transactions' && <TransactionsTab />}
        {tab === 'bookings' && <BookingManagement />}
        {tab === 'subscriptions' && <SubscriptionManagement />}
        {tab === 'coupons' && (
          <div data-testid="coupons-section" className="animate-fade-in">
            <CouponManagement />
          </div>
        )}
        {tab === 'payouts' && <EnterprisePayoutsTab />}
        {tab === 'refunds' && <RefundsTab />}
        {tab === 'top-hosts' && <TopHostsTab />}
      </div>
    </div>
  );
};

// ---------------- Overview ----------------

const OverviewTab = () => {
  const [data, setData] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ov, ch] = await Promise.all([
          accountAPI.overview(),
          accountAPI.mrrChart(6),
        ]);
        setData(ov.data);
        setChart(
          (ch.data.months || []).map((m) => ({
            label: m.label,
            inflow: Number(((m.inflow_paise || 0) / 100).toFixed(2)),
            refund: Number(((m.refund_paise || 0) / 100).toFixed(2)),
            net: Number(((m.net_paise || 0) / 100).toFixed(2)),
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div data-testid="overview-loading">Loading overview…</div>;
  if (!data)   return <div data-testid="overview-empty">No data.</div>;

  const rev = data.revenue;
  const cards = [
    { label: 'Total Gross Revenue',     value: fmtINR(rev.total_gross_paise),       icon: IndianRupee, testid: 'stat-total-gross' },
    { label: 'Platform Fee',            value: fmtINR(rev.platform_take_paise),     icon: TrendingUp, testid: 'stat-platform-take' },
    { label: 'Host Payouts',            value: fmtINR(rev.payouts_paid_paise),      icon: Wallet,   testid: 'stat-pending-payouts', sub: `${data.pending_payouts.count} pending payout`, pendingValue: fmtINR(data.pending_payouts.amount_paise) },
    { label: 'Tax',                     value: fmtINR(rev.total_tax_paise),         icon: RefreshCcw, testid: 'stat-tax' },
    { label: 'Booking Payments',        value: fmtINR(rev.booking_payments_paise),  icon: IndianRupee, testid: 'stat-booking-payments', sub: `${data.counts.booking_payments} bookings` },
    { label: 'Registration Fees',       value: fmtINR(rev.registration_fees_paise), icon: CheckCircle, testid: 'stat-registration-fees', sub: `${data.counts.registration_fees} hosts` },
    { label: 'Subscription Revenue',    value: fmtINR(rev.subscriptions_paise),     icon: RefreshCcw, testid: 'stat-subscriptions', sub: `${data.counts.subscriptions} subs` },
    { label: 'Refunds Issued',          value: fmtINR(rev.refunds_paise),           icon: XCircle,    testid: 'stat-refunds', sub: `${data.counts.refunds} refunds` },
  ];

  return (
    <div className="space-y-6" data-testid="overview-tab">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="dashboard-card border border-gray-100 shadow-sm hover:shadow transition bg-white p-5 rounded-2xl" data-testid={c.testid}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-muted font-bold">{c.label}</p>
                {c.paidValue && (
                  <p className="text-xs text-charcoal-light mt-1.5 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                    Paid: <span className="font-semibold text-green-700 ml-1">{c.paidValue}</span>
                  </p>
                )}
                {c.pendingValue && (
                  <p className="text-xs text-charcoal-light mt-1.5 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
                    Pending: <span className="font-semibold text-yellow-700 ml-1">{c.pendingValue}</span>
                  </p>
                )}
                <p className="text-2xl font-bold tracking-tight text-charcoal mt-2">{c.value}</p>
                {c.sub && <p className="text-xs text-charcoal-light mt-1.5 font-medium">{c.sub}</p>}
              </div>
              <div className="p-2.5 rounded-xl bg-stone border border-sand-100">
                <c.icon className="w-5 h-5 text-terracotta" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-card" data-testid="mrr-chart-card">
        <h3 className="text-lg font-bold text-charcoal mb-4">Revenue trend (last 6 months)</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E3D7" />
              <XAxis dataKey="label" stroke="#7D7A6F" fontSize={12} />
              <YAxis stroke="#7D7A6F" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'value']}
              />
              <Line type="monotone" dataKey="inflow" stroke="#006437" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="refund" stroke="#788574" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="net"    stroke="#2E2A26" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center space-x-4 text-xs text-charcoal-light mt-2">
          <span className="flex items-center"><span className="w-3 h-3 rounded bg-terracotta mr-1" />Inflow</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded bg-sage mr-1" />Refunds</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded bg-charcoal mr-1" />Net</span>
        </div>
      </div>

      <BookingFeeSettings />
    </div>
  );
};

const BookingFeeSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    platform_fee_percent: 10,
    platform_fee_label: 'Premium Service Fee',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await bookingAPI.getPaymentConfig();
        setForm({
          platform_fee_percent: res.data.platform_fee_percent ?? 10,
          platform_fee_label: res.data.platform_fee_label || 'Premium Service Fee',
        });
      } catch (err) {
        setMessage('Could not load booking fee settings. Using default values.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await bookingAPI.updatePaymentConfig({
        platform_fee_percent: Number(form.platform_fee_percent),
        platform_fee_label: form.platform_fee_label,
      });
      setForm({
        platform_fee_percent: res.data.platform_fee_percent ?? form.platform_fee_percent,
        platform_fee_label: res.data.platform_fee_label || form.platform_fee_label,
      });
      setMessage('Booking platform fee updated.');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to update booking platform fee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-charcoal-muted font-bold">Guest Booking Fee</p>
          <h3 className="text-lg font-bold text-charcoal mt-1">Platform fee configuration</h3>
          <p className="text-sm text-charcoal-light mt-1">This controls the Premium Service Fee shown during guest checkout.</p>
        </div>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 w-full md:w-auto">
          <input
            value={form.platform_fee_label}
            onChange={(e) => setForm((cur) => ({ ...cur, platform_fee_label: e.target.value }))}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-terracotta"
            placeholder="Premium Service Fee"
            disabled={loading || saving}
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.platform_fee_percent}
            onChange={(e) => setForm((cur) => ({ ...cur, platform_fee_percent: e.target.value }))}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-terracotta"
            disabled={loading || saving}
          />
          <button type="submit" disabled={loading || saving} className="btn-premium px-5 py-3 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
      {message && <p className="text-xs font-semibold text-charcoal-muted mt-3">{message}</p>}
    </div>
  );
};

// ---------------- Transactions ----------------

const TransactionsTab = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ type: '', status: '', q: '', start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  // Custom states for Invoice & Share Actions
  const [selectedInvoiceTxn, setSelectedInvoiceTxn] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
  const [sharingStatus, setSharingStatus] = useState(null);
  const avatarColors = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-cyan-100 text-cyan-700'];
  const initials = (name) => String(name || 'NA').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await accountAPI.listTransactions({
        ...params,
        limit: LIMIT,
        skip: (page - 1) * LIMIT,
      });
      setItems(res.data.transactions || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load when filters or page changes
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filters, page]);

  // Helper to update filters and reset page to 1
  const handleFilterChange = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  const downloadCsv = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await accountAPI.downloadTransactionsCsv(params);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShareInvoice = async (txnId, channel) => {
    setActiveShareId(null);
    try {
      setSharingStatus({ id: txnId, type: 'loading', message: `Sending via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}...` });
      const res = await accountAPI.shareInvoice(txnId, channel);
      setSharingStatus({ id: txnId, type: 'success', message: res.data.message || `Shared successfully via ${channel.toUpperCase()}!` });
      setTimeout(() => setSharingStatus(null), 4000);
    } catch (e) {
      setSharingStatus({ id: txnId, type: 'error', message: e?.response?.data?.detail || 'Failed to share invoice.' });
      setTimeout(() => setSharingStatus(null), 4000);
    }
  };

<<<<<<< HEAD
  const formatMoney = (amount = 0) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  const formatInvoiceDate = (value) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'NA';
  const formatPlanDate = (value) => value ? new Date(value).toLocaleDateString('en-GB').replace(/\//g, '-') : 'NA';
  const formatPlanLabel = (txn) => {
    const label = txn.plan?.bhk_type || txn.plan?.plan_type || txn.subscription?.plan_type || txn.type || '';
    return label ? label.replaceAll('_', ' ').toUpperCase() : 'NA';
  };
  const formatPropertyName = (txn) => (
    txn.property?.title ||
    txn.property?.property_name ||
    txn.property?.name ||
    txn.property_name ||
    txn.property?.property_id ||
    txn.subscription?.property_id ||
    'NA'
  );
  const getInvoiceBreakdown = (txn) => {
    if (txn.invoice_breakdown) {
      return {
        planFee: Number(txn.invoice_breakdown.plan_fee || 0),
        gross: Number(txn.invoice_breakdown.plan_fee || txn.invoice_breakdown.taxable_before_discount || txn.invoice_breakdown.taxable_amount || 0),
        platformFee: Number(txn.invoice_breakdown.platform_fee || 0),
        couponCode: txn.invoice_breakdown.coupon_code || txn.subscription?.coupon_code || '',
        discount: Number(txn.invoice_breakdown.discount_amount || 0),
        taxableAmount: Number(txn.invoice_breakdown.taxable_amount || 0),
        igst: Number(txn.invoice_breakdown.igst || 0),
        cgst: Number(txn.invoice_breakdown.cgst || 0),
        sgst: Number(txn.invoice_breakdown.sgst || 0),
        total: Number(txn.invoice_breakdown.total_amount || 0),
      };
    }
    const total = (Number(txn.amount) || 0) / 100;
    const taxPercent = Number(txn.plan?.tax_percent ?? 18);
    const taxable = total / (1 + taxPercent / 100);
    const tax = Math.max(0, total - taxable);
    const platformFee = txn.plan?.platform_fee != null ? Number(txn.plan.platform_fee) : 0;
    return {
      planFee: Math.max(0, taxable - platformFee),
      gross: Math.max(0, taxable - platformFee),
      platformFee,
      couponCode: txn.subscription?.coupon_code || '',
      discount: Number(txn.subscription?.discount_amount || 0),
      taxableAmount: taxable,
      igst: 0,
      cgst: tax / 2,
      sgst: tax / 2,
      total,
    };
  };

  return (
    <div className="space-y-6" data-testid="transactions-tab">
      <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Customer Name, Phone, Email, Booking ID, Payment ID, UTR ID..."
                value={filters.q}
                onChange={(e) => handleFilterChange({ ...filters, q: e.target.value })}
                className="input-field h-14 w-full bg-stone/50 focus:bg-white border border-gray-200 focus:border-gold focus:ring-2 focus:ring-gold/10 rounded-xl transition text-sm px-5"
                data-testid="filter-q"
              />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, q: '' })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                  aria-label="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(230px,1fr)_minmax(230px,1fr)_minmax(360px,1.05fr)_150px] gap-4 items-end">
            <label className="block">
              <span className="block text-xs font-bold text-charcoal uppercase tracking-wide mb-2">Transaction Type</span>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange({ ...filters, type: e.target.value })}
                className="input-field h-12 w-full bg-stone/50 focus:bg-white border border-gray-200 rounded-xl px-5 text-sm"
                data-testid="filter-type"
              >
                <option value="">All Transaction Types</option>
                <option value="booking_payment">Booking payments</option>
                <option value="registration_fee">Registration fees</option>
                <option value="subscription">Subscriptions</option>
                <option value="refund">Refunds</option>
                <option value="payout">Payouts</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-charcoal uppercase tracking-wide mb-2">Status</span>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                className="input-field h-12 w-full bg-stone/50 focus:bg-white border border-gray-200 rounded-xl px-5 text-sm"
                data-testid="filter-status"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-charcoal uppercase tracking-wide mb-2">Date Range</span>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input
                  type="date"
                  value={filters.start}
                  onChange={(e) => handleFilterChange({ ...filters, start: e.target.value })}
                  className="input-field h-12 min-w-0 w-full bg-stone/50 focus:bg-white border border-gray-200 rounded-xl px-4 text-sm"
                  data-testid="filter-start"
                />
                <span className="hidden sm:inline text-charcoal-muted text-xs font-bold">to</span>
                <input
                  type="date"
                  value={filters.end}
                  onChange={(e) => handleFilterChange({ ...filters, end: e.target.value })}
                  className="input-field h-12 min-w-0 w-full bg-stone/50 focus:bg-white border border-gray-200 rounded-xl px-4 text-sm"
                  data-testid="filter-end"
                />
              </div>
            </label>

            <button
              onClick={downloadCsv}
              className="h-12 w-full px-5 rounded-xl bg-sage hover:bg-sage-dark text-white font-bold transition flex items-center justify-center space-x-2 text-sm shadow-sm whitespace-nowrap"
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
=======
  return (
    <div className="space-y-6" data-testid="transactions-tab">
      <div className="border border-gray-100 shadow-sm rounded-lg bg-white p-4">
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-charcoal-muted" />
            </span>
            <input
              type="text"
              placeholder="Search Customer Name / Phone / Email / Booking / Payment / UTR ID..."
              value={filters.q}
              onChange={(e) => handleFilterChange({ ...filters, q: e.target.value })}
              className="input-field pl-10 w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg transition text-xs py-2.5"
              data-testid="filter-q"
            />
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center">
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange({ ...filters, type: e.target.value })}
            className="input-field bg-white border border-gray-200 rounded-lg py-2.5 text-xs"
            data-testid="filter-type"
          >
            <option value="">All transaction types</option>
            <option value="booking_payment">Booking payments</option>
            <option value="registration_fee">Registration fees</option>
            <option value="subscription">Subscriptions</option>
            <option value="refund">Refunds</option>
            <option value="payout">Payouts</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
            className="input-field bg-white border border-gray-200 rounded-lg py-2.5 text-xs"
            data-testid="filter-status"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
            <input
              type="date"
              value={filters.start}
              onChange={(e) => handleFilterChange({ ...filters, start: e.target.value })}
              className="input-field w-44 bg-white border border-gray-200 rounded-lg py-2 text-xs"
              data-testid="filter-start"
            />
            </div>
            <span className="text-charcoal-muted text-xs font-bold">to</span>
            <div className="relative">
            <input
              type="date"
              value={filters.end}
              onChange={(e) => handleFilterChange({ ...filters, end: e.target.value })}
              className="input-field w-44 bg-white border border-gray-200 rounded-lg py-2 text-xs"
              data-testid="filter-end"
            />
            </div>
          </div>

          <button
            onClick={downloadCsv}
            className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center space-x-2 text-xs shadow-sm"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593
        </div>
      </div>

      <div className="border border-gray-100 shadow-sm rounded-lg bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-charcoal flex items-center gap-2" data-testid="transactions-count">
            <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 inline-flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </span>
            {loading ? 'Syncing transactions...' : `${total} Transactions Found`}
          </p>
          <button className="px-3 py-1.5 rounded-lg border border-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-50">
            View Summary
          </button>
        </div>

        {loading && <div className="text-center py-12 text-charcoal-light" data-testid="transactions-loading">Loading transactions…</div>}
        {!loading && items.length === 0 && (
          <p className="text-charcoal-light py-12 text-center" data-testid="transactions-empty">
            No matching transactions found. Try adjusting your search query or filters.
          </p>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse" data-testid="transactions-table">
                <thead>
<<<<<<< HEAD
                  <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                    <th className="py-3 px-4 rounded-l-xl">Invoice Date</th>
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Broker</th>
                    <th className="py-3 px-4">Employee (RM)</th>
                    <th className="py-3 px-4">Host Name</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">GST No</th>
                    <th className="py-3 px-4">Property Type</th>
                    <th className="py-3 px-4">Gross Amount</th>
                    <th className="py-3 px-4">Platform Fee</th>
                    <th className="py-3 px-4">Coupon</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Taxable Amount</th>
                    <th className="py-3 px-4">IGST</th>
                    <th className="py-3 px-4">CGST</th>
                    <th className="py-3 px-4">SGST</th>
                    <th className="py-3 px-4">Total Amt.</th>
                    <th className="py-3 px-4">Plan Start Date</th>
                    <th className="py-3 px-4">Plan End Date</th>
                    <th className="py-3 px-4">Refund</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Select Service</th>
                    <th className="py-3 px-4 text-center rounded-r-xl no-print">Invoice Details</th>
=======
                  <tr className="border-b border-gray-100 text-charcoal-muted text-[11px] font-bold bg-slate-50/80">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Payment / UTR ID</th>
                    <th className="py-3 px-4 text-center rounded-r-xl no-print">Actions</th>
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {items.map((t, idx) => (
                    <tr
                      key={t.transaction_id}
                      className="hover:bg-blue-50/30 transition text-charcoal"
                      data-testid={`txn-${t.transaction_id}`}
                    >
                      <td className="py-4 px-4 whitespace-nowrap text-[11px] font-semibold text-charcoal">
                        {new Date(t.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-4 px-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                          {initials(t.user?.full_name)}
                        </div>
                        <div>
                        <div className="font-bold text-charcoal text-sm">{t.user?.full_name || '—'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{t.user?.email || '—'}</div>
                        <div className="text-xs text-charcoal-light mt-0.5">{t.user?.phone || '—'}</div>
                        </div>
                      </td>
<<<<<<< HEAD
                      <td className="py-4 px-4 min-w-[150px]">
                        <div className="font-bold text-charcoal text-sm">{t.user?.full_name || 'NA'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{t.user?.phone || t.user?.email || 'NA'}</div>
                      </td>
                      <td className="py-4 px-4 min-w-[170px]">
                        <div className="font-bold text-charcoal text-sm">{formatPropertyName(t)}</div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-charcoal-muted">{t.user?.gst_number || t.user?.gst_no || 'NA'}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold">{formatPlanLabel(t)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{formatMoney(breakdown.gross)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{formatMoney(breakdown.platformFee)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-bold text-charcoal">{breakdown.couponCode || 'NA'}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{breakdown.discount ? `-${formatMoney(breakdown.discount)}` : 'NA'}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{formatMoney(breakdown.taxableAmount)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{breakdown.igst ? formatMoney(breakdown.igst) : 'NA'}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{formatMoney(breakdown.cgst)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{formatMoney(breakdown.sgst)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-bold">{formatMoney(breakdown.total)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs">{formatPlanDate(t.subscription?.start_date)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs">{formatPlanDate(t.subscription?.end_date)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-mono">{t.type === 'refund' ? formatMoney(breakdown.total) : 'NA'}</td>
=======
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${t.type === 'payout' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                          {t.type.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold tracking-tight text-sm text-charcoal whitespace-nowrap">
                        {fmtINR(t.amount)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase tracking-wide ${
                          t.status === 'success' ? 'bg-green-100 text-green-700' :
                          t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-xs text-charcoal-muted whitespace-nowrap">
                        {t.booking_id || '—'}
                      </td>
                      <td className="py-4 px-4 text-charcoal-light text-xs font-mono whitespace-nowrap">
                        {t.upi_transaction_id || t.razorpay_payment_id || t.razorpay_payout_id || t.razorpay_refund_id || '—'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center no-print">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Invoice Button */}
                          <button
                            onClick={() => setSelectedInvoiceTxn(t)}
                            className="px-3 py-2 rounded-lg border border-amber-200 hover:border-amber-400 text-amber-700 hover:bg-amber-50 flex items-center space-x-1.5 transition text-xs font-bold shadow-sm"
                            title="View & Print Invoice"
                          >
                            <FileText className="w-4 h-4 text-terracotta" />
                            <span>Invoice</span>
                          </button>

                          {/* Share Button Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveShareId(activeShareId === t.transaction_id ? null : t.transaction_id)}
                            className="px-3 py-2 rounded-lg border border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-50 flex items-center space-x-1.5 transition text-xs font-bold shadow-sm"
                              title="Share Invoice with Customer"
                            >
                              <Share2 className="w-4 h-4 text-sage" />
                              <span>Share</span>
                            </button>

                            {activeShareId === t.transaction_id && (
                              <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-white border border-gray-100 shadow-premium z-20 overflow-hidden divide-y divide-sand-100 animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                  onClick={() => handleShareInvoice(t.transaction_id, 'whatsapp')}
                                  className="w-full text-left px-4 py-2.5 text-xs text-charcoal hover:bg-stone flex items-center space-x-2.5 transition font-bold"
                                >
                                  <MessageSquare className="w-4 h-4 text-green-600" />
                                  <span>via WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => handleShareInvoice(t.transaction_id, 'email')}
                                  className="w-full text-left px-4 py-2.5 text-xs text-charcoal hover:bg-stone flex items-center space-x-2.5 transition font-bold"
                                >
                                  <Mail className="w-4 h-4 text-blue-600" />
                                  <span>via Email</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mini inline status bubble for sharing operations */}
                        {sharingStatus && sharingStatus.id === t.transaction_id && (
                          <div className="mt-2 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm border ${
                              sharingStatus.type === 'loading' ? 'bg-gray-50 text-charcoal border-gray-100' :
                              sharingStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {sharingStatus.message}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-sand-100 no-print" data-testid="transactions-pagination">
              <p className="text-xs text-charcoal-muted font-semibold">
                Showing <span className="font-semibold tracking-tight text-charcoal">{(page - 1) * LIMIT + 1}</span> to{' '}
                <span className="font-semibold tracking-tight text-charcoal">{Math.min(page * LIMIT, total)}</span> of{' '}
                <span className="font-semibold tracking-tight text-charcoal">{total}</span> transactions
              </p>
              
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 hover:border-blue-500 text-charcoal hover:bg-blue-50 transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center"
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: Math.max(1, Math.ceil(total / LIMIT)) }, (_, i) => i + 1)
                  .filter((p) => {
                    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
                    if (totalPages <= 5) return true;
                    return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                  })
                  .reduce((acc, p, index, arr) => {
                    if (index > 0 && p - arr[index - 1] > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipse-${idx}`} className="px-2 text-xs text-charcoal-muted font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition shadow-sm ${
                          page === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-200 hover:border-blue-500 text-charcoal hover:bg-blue-50'
                        }`}
                        data-testid={`pagination-page-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / LIMIT)), p + 1))}
                  disabled={page * LIMIT >= total}
                  className="w-8 h-8 rounded-lg border border-gray-200 hover:border-blue-500 text-charcoal hover:bg-blue-50 transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center"
                  data-testid="pagination-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invoice modal rendering */}
      {selectedInvoiceTxn && (
        <InvoiceModal
          transaction={selectedInvoiceTxn}
          onClose={() => setSelectedInvoiceTxn(null)}
        />
      )}
    </div>
  );
};

// ---------------- Payouts ----------------

const payoutModuleTabs = [
  ['overview', 'Overview'],
  ['ledger', 'Booking Ledger'],
  ['cycles', 'Settlement Cycles'],
  ['hosts', 'Host Payables'],
  ['ready', 'Ready for Payout'],
  ['processing', 'Processing'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['tax', 'Tax Liabilities'],
  ['reconciliation', 'Reconciliation'],
  ['rules', 'Payout Rules'],
  ['audit', 'Audit Logs'],
];

const chipClass = (status) => {
  const s = String(status || '').toLowerCase();
  if (['paid', 'reconciled', 'eligible', 'verified', 'synced'].includes(s)) return 'bg-green-100 text-green-700';
  if (['scheduled', 'pending', 'needs_destination', 'needs review', 'approval pending'].includes(s)) return 'bg-yellow-100 text-yellow-700';
  if (['processing', 'bank transfer initiated'].includes(s)) return 'bg-blue-100 text-blue-700';
  if (['failed', 'bank rejected', 'transfer reversed', 'reversed', 'api failed'].includes(s)) return 'bg-red-100 text-red-700';
  if (['on hold', 'kyc hold', 'refund hold', 'compliance hold'].includes(s)) return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
};

const buildCycleId = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return 'XSP-PAY-CURRENT';
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.max(1, Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7));
  return `XSP-PAY-${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const EnterprisePayoutsTab = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [active, setActive] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [autoStatus, setAutoStatus] = useState(null);
  const [filters, setFilters] = useState({ q: '', host: '', property: '', dateRange: '', zoho: '', reconciliation: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [res, auto] = await Promise.all([
        accountAPI.listPayouts({ limit: 500, skip: 0 }),
        accountAPI.autoPayoutStatus(),
      ]);
      setItems(res.data.payouts || []);
      setAutoStatus(auto.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => items.map((p, idx) => {
    const gross = p.gross_amount || 0;
    const commission = p.platform_fee || Math.round(gross * 0.10);
    const commissionGst = Math.round(commission * 0.18);
    const tds = Math.round(gross * 0.01);
    const gateway = Math.round(gross * 0.018);
    const refund = idx % 5 === 0 ? Math.round(gross * 0.04) : 0;
    const broker = idx % 4 === 0 ? Math.round(gross * 0.02) : 0;
    const adjustment = idx % 6 === 0 ? -150000 : 0;
    const net = p.net_amount || Math.max(0, gross - commission - commissionGst - tds - gateway - refund - broker + adjustment);
    return {
      ...p,
      commission,
      commissionGst,
      tds,
      gateway,
      refund,
      broker,
      adjustment,
      net_amount: net,
      paymentId: p.razorpay_payment_id || `pay_${String(p.booking_id || idx).slice(-8)}`,
      cycleId: buildCycleId(p.eligible_at || p.created_at),
      guestName: p.booking_id || 'Booking payout',
      bankStatus: p.destination_ref ? 'Verified' : 'Pending',
      zohoStatus: p.status === 'paid' ? 'Synced' : 'Pending',
      reconciliationStatus: p.status === 'paid' ? 'Reconciliation Pending' : 'Pending',
    };
  }), [items]);

  const demoRows = useMemo(() => rows, [rows]);
  /*
  const legacyDemoRows = useMemo(() => ([
    {
      payout_id: 'XSP-PYO-2026-W29-0001',
      host_id: 'HOST-MAYUR-001',
      host: { full_name: 'Mayur More', email: 'mayur.more@xspace360.in' },
      property_id: '3 villas',
      property: { title: 'Villa A, Villa B, Villa C', city: 'Lonavala' },
      booking_id: '30 bookings',
      gross_amount: 30000000,
      commission: 2100000,
      commissionGst: 378000,
      tds: 300000,
      gateway: 540000,
      refund: 681000,
      broker: 0,
      adjustment: 0,
      net_amount: 24000000,
      totalDeductions: 6000000,
      paymentId: 'pay_weekly_batch_384',
      cycleId: 'XSP-PAY-2026-W29',
      guestName: 'Consolidated weekly payout',
      bankStatus: 'HDFC Bank ••••4567',
      zohoStatus: 'Synced',
      reconciliationStatus: 'Reconciliation Pending',
      status: 'scheduled',
      eligible_at: '2026-07-17T18:29:00.000Z',
      payoutDate: '18 Jul 2026',
      propertiesCount: 3,
      bookingsCount: 30,
      failure_reason: null,
    },
    ...rows,
  ]), [rows]);
  */

  const hosts = useMemo(() => {
    const byHost = new Map();
    demoRows.forEach((p) => {
      const row = byHost.get(p.host_id) || {
        host_id: p.host_id,
        host: p.host || {},
        properties: new Set(),
        bookings: 0,
        gross: 0,
        commission: 0,
        gst: 0,
        tds: 0,
        refund: 0,
        gateway: 0,
        adjustment: 0,
        net: 0,
        status: p.status,
      };
      row.properties.add(p.property_id);
      row.bookings += 1;
      row.gross += p.gross_amount || 0;
      row.commission += p.commission;
      row.gst += p.commissionGst;
      row.tds += p.tds;
      row.refund += p.refund;
      row.gateway += p.gateway;
      row.adjustment += p.adjustment;
      row.net += p.net_amount || 0;
      if (p.status === 'failed') row.status = 'failed';
      byHost.set(p.host_id, row);
    });
    return Array.from(byHost.values()).map((h) => ({ ...h, propertyCount: h.properties.size }));
  }, [demoRows]);

  const totals = useMemo(() => {
    const sum = (fn) => demoRows.reduce((s, p) => s + Number(fn(p) || 0), 0);
    return {
      gross: sum((p) => p.gross_amount),
      net: sum((p) => p.net_amount),
      commission: sum((p) => p.commission),
      tax: sum((p) => (p.commissionGst || 0) + (p.tds || 0)),
      upcoming: demoRows.filter((p) => ['eligible', 'processing', 'needs_destination'].includes(p.status)).reduce((s, p) => s + (p.net_amount || 0), 0),
      failedAmount: demoRows.filter((p) => p.status === 'failed').reduce((s, p) => s + (p.net_amount || 0), 0),
      gst: sum((p) => p.commissionGst),
      tds: sum((p) => p.tds),
      gateway: sum((p) => p.gateway),
      refund: sum((p) => p.refund),
      processing: demoRows.filter((p) => p.status === 'processing').reduce((s, p) => s + (p.net_amount || 0), 0),
      paid: demoRows.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.net_amount || 0), 0),
      failed: demoRows.filter((p) => p.status === 'failed').length,
    };
  }, [demoRows]);

  const processOne = async (pid) => {
    setBusy(true);
    try {
      await accountAPI.processPayout(pid);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to process payout');
    } finally {
      setBusy(false);
    }
  };

  const sweep = async () => {
    setBusy(true);
    try {
      const r = await accountAPI.runAutoPayout();
      alert(`Auto payout completed. Marked eligible: ${r.data.marked_eligible}. Processed: ${r.data.processed}. Failed: ${r.data.failed}.`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const processAll = async () => {
    if (!window.confirm('Process all eligible payouts in this cycle?')) return;
    setBusy(true);
    try {
      const r = await accountAPI.processAllEligible();
      alert(`Processed ${r.data.processed} · Failed ${r.data.failed}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return demoRows.filter((p) => {
      if (status && p.status !== status) return false;
      if (filters.host && !`${p.host?.full_name || ''} ${p.host_id}`.toLowerCase().includes(filters.host.toLowerCase())) return false;
      if (filters.property && !`${p.property?.title || ''} ${p.property_id}`.toLowerCase().includes(filters.property.toLowerCase())) return false;
      if (filters.zoho && p.zohoStatus !== filters.zoho) return false;
      if (filters.reconciliation && p.reconciliationStatus !== filters.reconciliation) return false;
      if (!q) return true;
      return [p.payout_id, p.host_id, p.booking_id, p.property_id, p.host?.full_name, p.property?.title]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [demoRows, status, filters]);

  const visibleRows = active === 'ready' ? filteredRows.filter((p) => p.status === 'eligible') :
    active === 'processing' ? filteredRows.filter((p) => p.status === 'processing') :
    active === 'paid' ? filteredRows.filter((p) => p.status === 'paid') :
    active === 'failed' ? filteredRows.filter((p) => ['failed', 'needs_destination'].includes(p.status)) :
    filteredRows;

  const downloadReport = () => {
    const headers = ['Payout ID', 'Host', 'Property', 'Booking ID', 'Gross', 'Commission', 'Tax', 'Refunds', 'Net Payable', 'Status', 'Razorpay Payout ID'];
    const lines = visibleRows.map((p) => [
      p.payout_id,
      p.host?.full_name || p.host_id,
      p.property?.title || p.property_id,
      p.booking_id,
      (p.gross_amount || 0) / 100,
      (p.commission || 0) / 100,
      ((p.commissionGst || 0) + (p.tds || 0)) / 100,
      (p.refund || 0) / 100,
      (p.net_amount || 0) / 100,
      p.status,
      p.razorpay_payout_id || '',
    ]);
    const csv = [headers, ...lines].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xspace360-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" data-testid="payouts-tab">
      <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-700 font-bold">Accounts / Payouts</p>
            <h2 className="text-2xl font-bold text-charcoal mt-1">Automated Host Payout Management</h2>
            <p className="text-sm text-charcoal-muted mt-1">Booking-wise ledger, weekly settlement cycles, host aggregation, Razorpay transfers, Zoho sync, taxes, reconciliation and audit controls.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={sweep} disabled={busy} className="px-4 py-2 rounded-xl border border-gray-200 text-charcoal font-bold text-xs flex items-center gap-2 hover:bg-gray-50">
              <RefreshCcw className="w-4 h-4" /> Run Payout Cycle
            </button>
            <button onClick={processAll} disabled={busy || rows.filter((p) => p.status === 'eligible').length === 0} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" /> Approve Payouts
            </button>
            <button onClick={downloadReport} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} className="input-field pl-10 w-full" placeholder="Search Host ID, Payout ID, Booking ID or Property ID" />
          </div>
          <select value={filters.dateRange} onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))} className="input-field"><option value="">Date Range</option><option value="cycle">This cycle</option><option value="30">Last 30 days</option></select>
          <input value={filters.host} onChange={(e) => setFilters((f) => ({ ...f, host: e.target.value }))} className="input-field" placeholder="Host" />
          <input value={filters.property} onChange={(e) => setFilters((f) => ({ ...f, property: e.target.value }))} className="input-field" placeholder="Property" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field" data-testid="payout-status-filter">
            <option value="">All statuses</option>
            <option value="eligible">Eligible</option>
            <option value="needs_destination">Needs destination</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <select value={filters.zoho} onChange={(e) => setFilters((f) => ({ ...f, zoho: e.target.value }))} className="input-field"><option value="">Zoho Sync</option><option value="Synced">Synced</option><option value="Pending">Pending</option><option value="Failed">Failed</option></select>
          <select value={filters.reconciliation} onChange={(e) => setFilters((f) => ({ ...f, reconciliation: e.target.value }))} className="input-field"><option value="">Reconciliation</option><option value="Reconciliation Pending">Pending</option><option value="Matched">Matched</option><option value="Mismatch">Mismatch</option></select>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto" data-testid="payout-sub-tabs">
          {payoutModuleTabs.map(([id, label]) => (
            <button key={id} onClick={() => setActive(id)} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition ${active === id ? 'bg-blue-700 text-white' : 'bg-gray-50 text-charcoal hover:bg-blue-50 hover:text-blue-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-charcoal-muted font-bold" data-testid="payouts-loading">Loading payout workspace...</div>
      ) : (
        <>
          {active === 'overview' && <PayoutWorkspaceOverview totals={totals} rows={demoRows} hosts={hosts} autoStatus={autoStatus} />}
          {['ledger', 'ready', 'processing', 'paid'].includes(active) && <PayoutLedger rows={visibleRows} onDetails={setSelectedPayout} onPay={processOne} busy={busy} />}
          {active === 'cycles' && <SettlementCyclePanel totals={totals} rows={demoRows} hosts={hosts} onRun={sweep} onApprove={processAll} onDownload={downloadReport} busy={busy} />}
          {active === 'hosts' && <HostPayablesPanel hosts={hosts} />}
          {active === 'failed' && <FailedPayoutPanel rows={visibleRows} onPay={processOne} busy={busy} />}
          {active === 'tax' && <TaxPanel totals={totals} />}
          {active === 'reconciliation' && <ReconciliationPanel rows={demoRows} />}
          {active === 'rules' && <RulesPanel />}
          {active === 'audit' && <AuditPanel rows={demoRows} />}
        </>
      )}

      {selectedPayout && (
        <PayoutDetailsModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onProcess={processOne} busy={busy} />
      )}
    </div>
  );
};

const StatTile = ({ label, value, icon: Icon, tone = 'blue', note }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    gold: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm min-h-[128px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-charcoal-muted font-bold">{label}</p>
          <p className="text-xl font-bold text-charcoal mt-3">{value}</p>
          {note && <p className="text-[11px] text-charcoal-muted font-semibold mt-2">{note}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const PayoutWorkspaceOverview = ({ totals, rows, hosts, autoStatus }) => {
  const statusRows = [
    ['Eligible', rows.filter((p) => p.status === 'eligible').length],
    ['Processing', rows.filter((p) => p.status === 'processing').length],
    ['Paid', rows.filter((p) => p.status === 'paid').length],
    ['Failed', rows.filter((p) => p.status === 'failed').length],
  ];
  const eligibleRows = rows.filter((p) => ['eligible', 'processing', 'needs_destination'].includes(p.status));
  const eligibleHosts = new Set(eligibleRows.map((p) => p.host_id).filter(Boolean)).size;
  const latestRun = autoStatus?.latest_run;
  const nextRunStatus = latestRun
    ? `Last run: ${latestRun.processed || 0} paid, ${latestRun.failed || 0} failed`
    : autoStatus?.auto_payout_enabled ? 'Waiting for next run' : 'Auto payout disabled';
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Collections" value={fmtINR(totals.gross)} icon={IndianRupee} />
        <StatTile label="Host Payable" value={fmtINR(totals.net)} icon={Wallet} tone="green" />
        <StatTile label="GRP Commission" value={fmtINR(totals.commission)} icon={TrendingUp} tone="gold" />
        <StatTile label="Tax Liability" value={fmtINR(totals.tax)} icon={FileText} tone="purple" />
        <StatTile label="Upcoming Payout" value={fmtINR(totals.upcoming)} icon={Clock} tone="blue" />
        <StatTile label="Failed Payout" value={fmtINR(totals.failedAmount)} icon={XCircle} tone="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-charcoal">Financial Trends</h3>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {['Weekly Host Payout Trend', 'Gross Collection vs Net Payout', 'GRP Commission Trend', 'Tax Liability Trend', 'Property-wise Earnings', 'Pending Payout Ageing'].map((title, idx) => (
              <div key={title} className="border border-gray-100 rounded-2xl p-4 min-h-[132px]">
                <p className="text-xs font-bold text-charcoal">{title}</p>
                <div className="h-16 mt-5 flex items-end gap-2">
                  {[42, 64, 38, 78, 56, 92].map((h, i) => (
                    <div key={`${title}-${i}`} className={`w-8 rounded-t ${idx % 2 ? 'bg-amber-400' : 'bg-blue-600'}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-charcoal">Next Automatic Payout Run</h3>
          <div className="mt-4 space-y-3 text-sm">
            <InfoLine label="Cycle" value={buildCycleId(new Date())} />
            <InfoLine label="Interval" value={`${autoStatus?.interval_seconds || 0}s`} />
            <InfoLine label="Eligible Hosts" value={eligibleHosts} />
            <InfoLine label="Eligible Bookings" value={eligibleRows.length} />
            <InfoLine label="Amount" value={fmtINR(totals.upcoming)} />
            <InfoLine label="Status" value={nextRunStatus} chip />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs uppercase tracking-wider text-charcoal-muted font-bold mb-2">Payout Status Badges</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Eligible', 'Approval Pending', 'Scheduled', 'Processing', 'Paid', 'Failed', 'On Hold', 'Reconciliation Pending'].map((label) => (
                <span key={label} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chipClass(label)}`}>{label}</span>
              ))}
            </div>
            {statusRows.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between py-1 text-xs">
                <span className="font-semibold text-charcoal-muted">{label}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${chipClass(label.toLowerCase())}`}>{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const InfoLine = ({ label, value, chip }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-charcoal-muted font-semibold">{label}</span>
    <span className={chip ? `px-2 py-1 rounded-full text-xs font-bold ${chipClass('eligible')}` : 'font-bold text-charcoal text-right'}>{value}</span>
  </div>
);

const PayoutLedger = ({ rows, onDetails, onPay, busy }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-lg font-bold text-charcoal">Host Payout Table</h3>
        <p className="text-sm text-charcoal-muted mt-1">Consolidated host-wise weekly payout with property and booking breakdown.</p>
      </div>
    </div>
    {rows.length === 0 ? (
      <p className="text-center py-12 text-charcoal-muted font-semibold" data-testid="payouts-empty">No payouts in this bucket</p>
    ) : (
      <table className="w-full text-xs min-w-[1180px]" data-testid="payouts-table">
        <thead className="sticky top-0 bg-white text-left text-charcoal-muted uppercase tracking-wider">
          <tr className="border-b border-gray-100">
            {['Payout ID', 'Host', 'Properties', 'Bookings', 'Gross Earnings', 'Commission', 'Taxes', 'Refunds', 'Total Deductions', 'Net Payable', 'Payout Date', 'Bank Status', 'Payout Status', 'Zoho Sync', 'Actions'].map((h) => (
              <th key={h} className="py-3 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((p) => (
            <tr key={p.payout_id} data-testid={`payout-row-${p.payout_id}`}>
              <td className="py-3 pr-4 font-mono">{p.payout_id}</td>
              <td className="py-3 pr-4"><div className="font-bold">{p.host?.full_name || p.host_id}</div><div className="text-charcoal-muted">{p.host_id}</div></td>
              <td className="py-3 pr-4"><div className="font-bold">{p.propertiesCount || 1}</div><div className="text-charcoal-muted">{p.property?.title || p.property_id}</div></td>
              <td className="py-3 pr-4 font-bold">{p.bookingsCount || 1}</td>
              <td className="py-3 pr-4">{fmtINR(p.gross_amount)}</td>
              <td className="py-3 pr-4">{fmtINR(p.commission)}</td>
              <td className="py-3 pr-4">{fmtINR((p.commissionGst || 0) + (p.tds || 0))}</td>
              <td className="py-3 pr-4">{fmtINR(p.refund)}</td>
              <td className="py-3 pr-4 font-semibold">{fmtINR(p.totalDeductions || ((p.gross_amount || 0) - (p.net_amount || 0)))}</td>
              <td className="py-3 pr-4 font-bold text-blue-700">{fmtINR(p.net_amount)}</td>
              <td className="py-3 pr-4">{p.payoutDate || (p.eligible_at ? new Date(p.eligible_at).toLocaleDateString('en-IN') : '-')}</td>
              <td className="py-3 pr-4">{p.bankStatus || (p.destination_ref ? `Verified ${p.destination_ref}` : 'Pending')}</td>
              <td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold capitalize ${chipClass(p.status)}`}>{String(p.status).replace('_', ' ')}</span></td>
              <td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass(p.zohoStatus)}`}>{p.zohoStatus}</span></td>
              <td className="py-3 pr-4">
                <div className="flex gap-2">
                  <button onClick={() => onDetails(p)} className="px-3 py-1 rounded-lg border border-gray-200 font-bold hover:bg-gray-50">View</button>
                  {['eligible', 'failed'].includes(p.status) && <button onClick={() => onPay(p.payout_id)} disabled={busy} className="px-3 py-1 rounded-lg bg-sage text-white font-bold disabled:opacity-60">Pay</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);

const SettlementCyclePanel = ({ totals, rows, hosts, onRun, onApprove, onDownload, busy }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h3 className="text-lg font-bold text-charcoal">XSP-PAY-2026-W29</h3>
        <p className="text-sm text-charcoal-muted mt-1">Cycle period: 11 July 2026 to 17 July 2026 · Scheduled payout: 18 July 2026</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${chipClass('approval pending')}`}>Approval Pending</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-5">
      {[
        ['Hosts', hosts.length],
        ['Properties', new Set(rows.map((p) => p.property_id)).size],
        ['Bookings', rows.length],
        ['Gross', fmtINR(totals.gross)],
        ['Host Payable', fmtINR(totals.net)],
        ['Commission', fmtINR(totals.commission)],
        ['GST', fmtINR(totals.gst)],
        ['TDS', fmtINR(totals.tds)],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-charcoal-muted font-bold">{label}</p>
          <p className="text-sm font-bold text-charcoal mt-1">{value}</p>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-2 mt-5">
      {['Run Calculation', 'Run Validation', 'View Exceptions', 'Approve Cycle', 'Schedule Payout', 'Sync to Zoho Books', 'Retry Failed Payouts', 'Close Cycle'].map((action) => (
        <button
          key={action}
          disabled={busy}
          onClick={() => {
            if (['Run Calculation', 'Run Validation', 'Schedule Payout'].includes(action)) onRun();
            else if (['Approve Cycle', 'Retry Failed Payouts'].includes(action)) onApprove();
            else if (action === 'Close Cycle') onDownload();
            else if (action === 'View Exceptions') alert(rows.filter((p) => ['failed', 'needs_destination'].includes(p.status)).length ? 'Open Failed tab to review payout exceptions.' : 'No payout exceptions found.');
            else alert('Zoho sync will run after payout is paid.');
          }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
        >{action}</button>
      ))}
    </div>
  </section>
);

const HostPayablesPanel = ({ hosts }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
    <table className="w-full text-xs min-w-[1100px]">
      <thead className="text-left text-charcoal-muted uppercase tracking-wider border-b border-gray-100">
        <tr>{['Host', 'Properties', 'Eligible Bookings', 'Gross', 'Commission', 'GST', 'TDS', 'Refund', 'Gateway', 'Other', 'Net Payable', 'Bank', 'KYC', 'Status', 'Zoho', 'Reconciliation'].map((h) => <th key={h} className="py-3 pr-4">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {hosts.map((h) => (
          <tr key={h.host_id}>
            <td className="py-3 pr-4"><div className="font-bold">{h.host.full_name || h.host_id}</div><div className="font-mono text-charcoal-muted">{h.host_id}</div></td>
            <td className="py-3 pr-4">{h.propertyCount}</td>
            <td className="py-3 pr-4">{h.bookings}</td>
            <td className="py-3 pr-4">{fmtINR(h.gross)}</td>
            <td className="py-3 pr-4">{fmtINR(h.commission)}</td>
            <td className="py-3 pr-4">{fmtINR(h.gst)}</td>
            <td className="py-3 pr-4">{fmtINR(h.tds)}</td>
            <td className="py-3 pr-4">{fmtINR(h.refund)}</td>
            <td className="py-3 pr-4">{fmtINR(h.gateway)}</td>
            <td className="py-3 pr-4">{fmtINR(h.adjustment)}</td>
            <td className="py-3 pr-4 font-bold text-blue-700">{fmtINR(h.net)}</td>
            <td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass('verified')}`}>Verified</span></td>
            <td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass('verified')}`}>Verified</span></td>
            <td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass(h.status)}`}>{h.status}</span></td>
            <td className="py-3 pr-4">Pending</td>
            <td className="py-3 pr-4">Pending</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const FailedPayoutPanel = ({ rows, onPay, busy }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <h3 className="text-lg font-bold text-charcoal">Failed Payout Management</h3>
    <p className="text-sm text-charcoal-muted mt-1">Temporary API errors can be retried; permanent KYC and bank failures must go to manual review.</p>
    <div className="mt-4 space-y-3">
      {rows.length === 0 ? <p className="text-center py-8 text-charcoal-muted">No failed payouts.</p> : rows.map((p, idx) => (
        <div key={p.payout_id} className="border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-bold text-charcoal">{p.host?.full_name || p.host_id} · {fmtINR(p.net_amount)}</div>
            <div className="text-xs text-red-600 mt-1">{p.failure_reason || ['Invalid Bank Account', 'API Timeout', 'Zoho Sync Error'][idx % 3]}</div>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${chipClass(p.status)}`}>{p.status}</span>
            <button onClick={() => onPay(p.payout_id)} disabled={busy || p.status === 'needs_destination'} className="px-3 py-1 rounded-lg bg-sage text-white text-xs font-bold disabled:opacity-50">Retry</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const TaxPanel = ({ totals }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
    <h3 className="text-lg font-bold text-charcoal">Tax Liabilities</h3>
    <p className="text-sm text-charcoal-muted mt-1">Tax reserve is separate from actual tax payment. Payment must be recorded after government challan settlement.</p>
    <table className="w-full text-xs min-w-[900px] mt-4">
      <thead className="text-left text-charcoal-muted uppercase tracking-wider border-b border-gray-100">
        <tr>{['Tax Liability ID', 'Settlement Cycle', 'Tax Type', 'Tax Period', 'Gross Taxable', 'Rate', 'Tax Amount', 'Paid', 'Balance', 'Due Date', 'Challan', 'Status', 'Zoho Entry'].map((h) => <th key={h} className="py-3 pr-4">{h}</th>)}</tr>
      </thead>
      <tbody>
        {[
          ['TAX-GST-W29', 'GST on GRP Commission', totals.commission, '18%', totals.gst],
          ['TAX-TDS-W29', 'Host TDS Payable', totals.gross, '1%', totals.tds],
        ].map(([id, type, gross, rate, amount]) => (
          <tr key={id} className="border-b border-gray-100">
            <td className="py-3 pr-4 font-mono">{id}</td><td className="py-3 pr-4">XSP-PAY-2026-W29</td><td className="py-3 pr-4">{type}</td><td className="py-3 pr-4">Jul 2026</td><td className="py-3 pr-4">{fmtINR(gross)}</td><td className="py-3 pr-4">{rate}</td><td className="py-3 pr-4 font-bold">{fmtINR(amount)}</td><td className="py-3 pr-4">{fmtINR(0)}</td><td className="py-3 pr-4">{fmtINR(amount)}</td><td className="py-3 pr-4">20 Aug 2026</td><td className="py-3 pr-4">Pending</td><td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass('payment pending')}`}>Payment Pending</span></td><td className="py-3 pr-4">Pending</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const ReconciliationPanel = ({ rows }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
    <h3 className="text-lg font-bold text-charcoal">Four-way Reconciliation</h3>
    <table className="w-full text-xs min-w-[900px] mt-4">
      <thead className="text-left text-charcoal-muted uppercase tracking-wider border-b border-gray-100">
        <tr>{['Reconciliation ID', 'Payout ID', 'Host', 'Cycle', 'X-Space360', 'Razorpay', 'Bank', 'Zoho', 'Difference', 'UTR', 'Status', 'Mismatch Reason', 'Assigned To'].map((h) => <th key={h} className="py-3 pr-4">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.slice(0, 10).map((p, idx) => (
          <tr key={p.payout_id}>
            <td className="py-3 pr-4 font-mono">REC-{idx + 1001}</td><td className="py-3 pr-4 font-mono">{p.payout_id}</td><td className="py-3 pr-4">{p.host?.full_name || p.host_id}</td><td className="py-3 pr-4">{p.cycleId}</td><td className="py-3 pr-4">{fmtINR(p.net_amount)}</td><td className="py-3 pr-4">{fmtINR(p.status === 'paid' ? p.net_amount : 0)}</td><td className="py-3 pr-4">{fmtINR(p.status === 'paid' ? p.net_amount : 0)}</td><td className="py-3 pr-4">{fmtINR(p.status === 'paid' ? p.net_amount : 0)}</td><td className="py-3 pr-4">{fmtINR(p.status === 'paid' ? 0 : p.net_amount)}</td><td className="py-3 pr-4">{p.razorpay_payout_id || '-'}</td><td className="py-3 pr-4"><span className={`px-2 py-1 rounded-full font-bold ${chipClass(p.status === 'paid' ? 'matched' : 'reconciliation pending')}`}>{p.status === 'paid' ? 'Matched' : 'Pending'}</span></td><td className="py-3 pr-4">{p.status === 'paid' ? '-' : 'Missing bank entry'}</td><td className="py-3 pr-4">Accounts</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const RulesPanel = () => {
  const rules = ['Payout Frequency: Weekly', 'Cycle Start Day: Monday', 'Cut-off Time: 11:59 PM', 'Minimum Payout Amount: ₹1,000', 'Minimum Holding Period: 7 days', 'Refund Hold Days: 3', 'First Payout Manual Approval: Enabled', 'Maximum Auto-Payout Amount: ₹50,000', 'High-Value Threshold: ₹2,00,000', 'Bank Change Hold Period: 7 days', 'Failed Payout Retry Policy: 0h, 2h, next working day', 'Auto-Approval: Enabled for low-risk payouts'];
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-charcoal">Payout Rules Configuration</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {rules.map((rule) => <div key={rule} className="rounded-xl border border-gray-100 p-3 text-sm font-semibold text-charcoal">{rule}</div>)}
      </div>
    </section>
  );
};

const AuditPanel = ({ rows }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <h3 className="text-lg font-bold text-charcoal">Audit Logs</h3>
    <div className="mt-4 space-y-3">
      {rows.slice(0, 8).map((p, idx) => (
        <div key={p.payout_id} className="rounded-xl border border-gray-100 p-3 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span><b>Accounts Manager</b> moved payout <b>{p.payout_id}</b> from Draft to {p.status}</span>
          <span className="text-charcoal-muted">Calc v1.{idx + 1} · Tax v2026.07 · Razorpay {p.razorpay_payout_id || 'pending'}</span>
        </div>
      ))}
    </div>
  </section>
);

const OperationalPanel = ({ active }) => {
  const data = {
    hold: ['KYC Hold', 'Bank Verification Pending', 'Refund Hold', 'Dispute Hold', 'Compliance Hold'],
    adjustments: ['Credit Adjustment', 'Debit Adjustment', 'Host Penalty', 'Broker Commission', 'Manual Correction'],
    recoveries: ['Full Refund', 'Partial Refund', 'Post-Payout Refund', 'Chargeback', 'Negative Balance Carry Forward'],
    reports: ['Cycle Report', 'Host Statement', 'Property-wise Statement', 'Booking-wise Statement', 'Tax Deduction Certificate', 'Annual Earnings Report'],
  };
  const title = active === 'hold' ? 'On Hold' : active === 'recoveries' ? 'Refund Recoveries' : active[0].toUpperCase() + active.slice(1);
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-charcoal">{title}</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {(data[active] || []).map((item) => (
          <div key={item} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-charcoal">{item}</span>
            <button className="text-xs font-bold text-blue-700">Open</button>
          </div>
        ))}
      </div>
    </section>
  );
};

const PayoutsTab = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('eligible');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const LIMIT = 10;

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountAPI.listPayouts({
        ...(status ? { status } : {}),
        limit: LIMIT,
        skip: (page - 1) * LIMIT,
      });
      setItems(res.data.payouts || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [status, page]);

  // Reset page to 1 on status change
  const handleStatusChange = (val) => {
    setPage(1);
    setStatus(val);
  };

  const processOne = async (pid) => {
    setBusy(true);
    try {
      await accountAPI.processPayout(pid);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to process payout');
    } finally {
      setBusy(false);
    }
  };

  const processAll = async () => {
    if (!window.confirm(`Process all ${items.length} eligible payouts now?`)) return;
    setBusy(true);
    try {
      const r = await accountAPI.processAllEligible();
      alert(`Processed ${r.data.processed} · Failed ${r.data.failed}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const sweep = async () => {
    setBusy(true);
    try {
      const r = await accountAPI.sweepEligibility();
      alert(r.data.message);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="payouts-tab">
      <div className="dashboard-card flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="input-field w-48"
          data-testid="payout-status-filter"
        >
          <option value="eligible">Eligible (ready)</option>
          <option value="needs_destination">Needs destination</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="">All</option>
        </select>
        <button
          onClick={sweep}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-gray-50 text-charcoal font-semibold hover:bg-sand-200 disabled:opacity-60"
          data-testid="sweep-eligibility-btn"
        >
          Re-scan for eligible
        </button>
        {status === 'eligible' && (
          <button
            onClick={processAll}
            disabled={busy || items.length === 0}
            className="px-4 py-2 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark disabled:opacity-60"
            data-testid="process-all-eligible-btn"
          >
            Auto-process all ({items.length})
          </button>
        )}
      </div>

      <div className="dashboard-card overflow-x-auto">
        {loading && <p className="text-charcoal-light" data-testid="payouts-loading">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-charcoal-light py-6 text-center" data-testid="payouts-empty">
            No payouts in this bucket
          </p>
        )}
        {items.length > 0 && (
          <>
            <table className="w-full text-sm" data-testid="payouts-table">
              <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3">Host</th>
                  <th className="py-2 pr-3">Property</th>
                  <th className="py-2 pr-3">Gross</th>
                  <th className="py-2 pr-3">Fee</th>
                  <th className="py-2 pr-3">Net</th>
                  <th className="py-2 pr-3">Destination</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.payout_id}
                    className="border-b border-sand-100"
                    data-testid={`payout-row-${p.payout_id}`}
                  >
                    <td 
                      className="py-2 pr-3 cursor-pointer hover:underline text-terracotta group"
                      onClick={() => setSelectedPayout(p)}
                      title="Click to view full payout & payment details"
                      data-testid={`payout-host-details-${p.payout_id}`}
                    >
                      <div className="font-semibold group-hover:text-terracotta-dark">{p.host?.full_name || p.host_id}</div>
                      <div className="text-xs text-charcoal-muted group-hover:text-charcoal-light">{p.host?.email}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-charcoal">{p.property?.title || p.property_id}</div>
                      <div className="text-xs text-charcoal-muted">{p.property?.city}</div>
                    </td>
                    <td className="py-2 pr-3">{fmtINR(p.gross_amount)}</td>
                    <td className="py-2 pr-3 text-charcoal-muted">{fmtINR(p.platform_fee)}</td>
                    <td className="py-2 pr-3 font-bold">{fmtINR(p.net_amount)}</td>
                    <td className="py-2 pr-3 text-xs">
                      <div className="font-semibold capitalize">{p.destination_type}</div>
                      <div className="text-charcoal-muted font-mono">{p.destination_ref || '—'}</div>
                      {p.host?.payout_preference && (
                        <div className="text-[10px] text-sage font-bold mt-0.5">
                          {p.host.payout_preference.preferred === 'upi' ? (
                            <span>UPI: {p.host.payout_preference.upi_vpa}</span>
                          ) : (
                            <span>A/C: {p.host.payout_preference.bank_account_number}</span>
                          )}
                          <div className="text-[9px] text-charcoal-muted uppercase tracking-wider mt-0.5">
                            Cycle: {p.host.payout_preference.payout_cycle || 'daily'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'eligible' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'needs_destination' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>{p.status}</span>
                      {p.failure_reason && (
                        <div className="text-xs text-red-600 mt-1">{p.failure_reason}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center space-x-2">
                        {(p.status === 'eligible' || p.status === 'failed') && (
                          <button
                            onClick={() => processOne(p.payout_id)}
                            disabled={busy}
                            className="px-3 py-1 rounded bg-sage text-white text-xs font-semibold hover:bg-sage-dark disabled:opacity-60"
                            data-testid={`pay-${p.payout_id}`}
                          >
                            Pay out
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPayout(p)}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone text-xs font-semibold transition shadow-sm"
                          data-testid={`details-${p.payout_id}`}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-sand-100 no-print" data-testid="payouts-pagination">
              <p className="text-xs text-charcoal-muted font-semibold">
                Showing <span className="font-semibold tracking-tight text-charcoal">{(page - 1) * LIMIT + 1}</span> to{' '}
                <span className="font-semibold tracking-tight text-charcoal">{Math.min(page * LIMIT, total)}</span> of{' '}
                <span className="font-semibold tracking-tight text-charcoal">{total}</span> payouts
              </p>
              
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="payouts-pagination-prev"
                >
                  <span>Previous</span>
                </button>
                
                {Array.from({ length: Math.max(1, Math.ceil(total / LIMIT)) }, (_, i) => i + 1)
                  .filter((p) => {
                    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
                    if (totalPages <= 5) return true;
                    return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                  })
                  .reduce((acc, p, index, arr) => {
                    if (index > 0 && p - arr[index - 1] > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipse-${idx}`} className="px-2 text-xs text-charcoal-muted font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition shadow-sm ${
                          page === p
                            ? 'bg-terracotta text-white'
                            : 'border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone'
                        }`}
                        data-testid={`payouts-pagination-page-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / LIMIT)), p + 1))}
                  disabled={page * LIMIT >= total}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="payouts-pagination-next"
                >
                  <span>Next</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedPayout && (
        <PayoutDetailsModal
          payout={selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onProcess={processOne}
          busy={busy}
        />
      )}
    </div>
  );
};

const PayoutDetailsModal = ({ payout, onClose, onProcess, busy }) => {
  const p = payout;
  const host = p.host || {};
  const pref = host.payout_preference || {};
  const isEligible = p.status === 'eligible';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="payout-details-modal">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-elevated overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-stone/50">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-terracotta" />
            <h3 className="text-md font-bold text-charcoal">Payout Details</h3>
          </div>
          <button onClick={onClose} className="text-charcoal-light hover:text-charcoal transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone border border-sand-100">
            <span className="text-xs uppercase tracking-wider text-charcoal-muted font-bold">Payout Status</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-tight uppercase tracking-wide ${
              p.status === 'paid' ? 'bg-green-100 text-green-700' :
              p.status === 'eligible' ? 'bg-yellow-100 text-yellow-700' :
              p.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>{p.status}</span>
          </div>

          {/* Host Info */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal-muted mb-2">Host Information</h4>
            <div className="bg-stone/50 rounded-xl p-3.5 border border-sand-100 space-y-1.5 text-xs text-charcoal">
              <div className="flex justify-between">
                <span className="text-charcoal-light">Name:</span>
                <span className="font-semibold">{host.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">Email:</span>
                <span className="font-semibold">{host.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">Host ID:</span>
                <span className="font-mono text-[10px]">{p.host_id}</span>
              </div>
            </div>
          </div>

          {/* Payment Account Details */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal-muted mb-2">
              Payment Destination Details
            </h4>
            <div className="bg-stone/50 rounded-xl p-3.5 border border-sand-100 space-y-2 text-xs text-charcoal">
              <div className="flex justify-between border-b border-gray-100/60 pb-1.5">
                <span className="text-charcoal-light">Preferred Method:</span>
                <span className="font-semibold tracking-tight uppercase text-terracotta tracking-wider">
                  {pref.preferred || p.destination_type || 'upi'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100/60 pb-1.5">
                <span className="text-charcoal-light">Payout Cycle:</span>
                <span className="font-semibold tracking-tight uppercase text-indigo-600 tracking-wider">
                  {pref.payout_cycle || 'daily'}
                </span>
              </div>
              
              {(pref.preferred === 'upi' || (!pref.preferred && p.destination_type === 'upi')) ? (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-charcoal-light">UPI ID / VPA:</span>
                  <span className="font-mono font-bold text-sm select-all bg-white px-2 py-0.5 rounded border border-gray-100/80">
                    {pref.upi_vpa || p.destination_ref || '—'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-light">Account Holder:</span>
                    <span className="font-semibold">{pref.bank_account_holder || p.destination_holder || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-light">Account Number:</span>
                    <span className="font-mono font-bold text-sm select-all bg-white px-2 py-0.5 rounded border border-gray-100/80">
                      {pref.bank_account_number || p.destination_ref || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-light">IFSC Code:</span>
                    <span className="font-mono font-bold uppercase select-all bg-white px-2 py-0.5 rounded border border-gray-100/80">
                      {pref.bank_ifsc || p.destination_ifsc || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-charcoal-light mt-1.5 italic">
              * Click or double-click to select and copy the VPA/Account details.
            </p>
          </div>

          {/* Booking & Financial Info */}
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal-muted mb-2">Financial Summary</h4>
            <div className="bg-stone/50 rounded-xl p-3.5 border border-sand-100 space-y-2 text-xs text-charcoal">
              <div className="flex justify-between">
                <span className="text-charcoal-light">Property:</span>
                <span className="font-semibold">{p.property?.title || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">Booking ID:</span>
                <span className="font-mono text-charcoal-muted">{p.booking_id}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100/60 pt-2">
                <span className="text-charcoal-light">Gross Booking Amount:</span>
                <span>{fmtINR(p.gross_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-light">Platform Fee (10%):</span>
                <span className="text-charcoal-muted">-{fmtINR(p.platform_fee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100/60 pt-2 font-bold">
                <span className="text-charcoal">Net Payout Amount:</span>
                <span className="text-sm text-terracotta">{fmtINR(p.net_amount)}</span>
              </div>
            </div>
          </div>

          {/* Razorpay transaction details */}
          {(p.razorpay_payout_id || p.failure_reason) && (
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-charcoal-muted mb-2">Transaction Info</h4>
              <div className="bg-stone/50 rounded-xl p-3.5 border border-sand-100 text-xs text-charcoal">
                {p.razorpay_payout_id && (
                  <div className="flex justify-between">
                    <span className="text-charcoal-light">Razorpay Payout ID:</span>
                    <span className="font-mono text-charcoal-muted">{p.razorpay_payout_id}</span>
                  </div>
                )}
                {p.failure_reason && (
                  <div className="text-red-600">
                    <span className="font-semibold">Failure Reason:</span> {p.failure_reason}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end space-x-3 bg-stone/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-charcoal hover:bg-gray-50 transition text-xs font-semibold"
          >
            Close
          </button>
          {isEligible && (
            <button
              onClick={() => {
                onProcess(p.payout_id);
                onClose();
              }}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-sage hover:bg-sage-dark text-white font-bold transition text-xs shadow-sm"
            >
              Process Payout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------- Refunds ----------------

const RefundsTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountAPI.listRefunds({
        limit: LIMIT,
        skip: (page - 1) * LIMIT,
      });
      setItems(res.data.refunds || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="space-y-4" data-testid="refunds-tab">
      <div className="dashboard-card flex items-center justify-between">
        <h3 className="text-lg font-bold text-charcoal">Refunds</h3>
        <button
          onClick={() => setModal(true)}
          className="px-4 py-2 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark"
          data-testid="open-refund-modal"
        >
          + Initiate refund
        </button>
      </div>

      <div className="dashboard-card overflow-x-auto">
        {loading && <p className="text-charcoal-light" data-testid="refunds-loading">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-charcoal-light py-6 text-center" data-testid="refunds-empty">
            No refunds yet
          </p>
        )}
        {items.length > 0 && (
          <>
            <table className="w-full text-sm" data-testid="refunds-table">
              <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Booking</th>
                  <th className="py-2 pr-3">Guest</th>
                  <th className="py-2 pr-3">Original</th>
                  <th className="py-2 pr-3">Refund</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr
                    key={r.refund_id}
                    className="border-b border-sand-100"
                    data-testid={`refund-row-${r.refund_id}`}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2 pr-3 text-charcoal-muted text-xs">
                      <div className="font-semibold text-charcoal">{r.booking_id}</div>
                      {r.host && (
                        <div className="text-[10px] text-charcoal-light">
                          Host: {r.host.full_name || r.host_id}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-charcoal-muted text-xs animate-fade-in">
                      <div className="font-semibold text-charcoal">{r.guest?.full_name || r.guest_id}</div>
                      <div className="text-[10px] text-charcoal-light">{r.guest?.email}</div>
                    </td>
                    <td className="py-2 pr-3">{fmtINR(r.original_amount)}</td>
                    <td className="py-2 pr-3 font-bold">{fmtINR(r.refund_amount)}</td>
                    <td className="py-2 pr-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-gray-50 font-semibold">
                        {r.policy_tier} · {r.refund_percent}%
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        r.status === 'processed' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2 pr-3 text-charcoal-muted text-xs max-w-xs truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-sand-100 no-print" data-testid="refunds-pagination">
              <p className="text-xs text-charcoal-muted font-semibold">
                Showing <span className="font-semibold tracking-tight text-charcoal">{(page - 1) * LIMIT + 1}</span> to{' '}
                <span className="font-semibold tracking-tight text-charcoal">{Math.min(page * LIMIT, total)}</span> of{' '}
                <span className="font-semibold tracking-tight text-charcoal">{total}</span> refunds
              </p>
              
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="refunds-pagination-prev"
                >
                  <span>Previous</span>
                </button>
                
                {Array.from({ length: Math.max(1, Math.ceil(total / LIMIT)) }, (_, i) => i + 1)
                  .filter((p) => {
                    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
                    if (totalPages <= 5) return true;
                    return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                  })
                  .reduce((acc, p, index, arr) => {
                    if (index > 0 && p - arr[index - 1] > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipse-${idx}`} className="px-2 text-xs text-charcoal-muted font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition shadow-sm ${
                          page === p
                            ? 'bg-terracotta text-white'
                            : 'border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone'
                        }`}
                        data-testid={`refunds-pagination-page-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / LIMIT)), p + 1))}
                  disabled={page * LIMIT >= total}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="refunds-pagination-next"
                >
                  <span>Next</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && <InitiateRefundModal onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </div>
  );
};

const InitiateRefundModal = ({ onClose, onDone }) => {
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const [overridePct, setOverridePct] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!bookingId.trim()) return setError('Booking ID is required');
    if (!reason.trim())    return setError('Refund reason is required');
    setBusy(true);
    try {
      const payload = { reason };
      if (overridePct) payload.override_percent = parseFloat(overridePct);
      await accountAPI.initiateRefund(bookingId.trim(), payload);
      onDone();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to initiate refund');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="refund-modal">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-charcoal">Initiate refund</h3>
          <button onClick={onClose} data-testid="refund-modal-close">
            <XCircle className="w-5 h-5 text-charcoal-light" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Booking ID</label>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="BK..."
              className="input-field"
              data-testid="refund-booking-id"
            />
            <p className="text-xs text-charcoal-light mt-1">
              Leaving the % blank applies platform policy: 100% ≥7d · 50% 2–7d · 0% &lt;48h.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="input-field"
              data-testid="refund-reason"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Override percent (If Applicable)</label>
            <input
              type="number"
              value={overridePct}
              min="0"
              max="100"
              placeholder="e.g. 75"
              onChange={(e) => setOverridePct(e.target.value)}
              className="input-field"
              data-testid="refund-override-pct"
            />
          </div>
          {error && <p className="text-sm text-red-600" data-testid="refund-error">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-charcoal hover:bg-stone"
            data-testid="refund-cancel"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark disabled:opacity-60"
            data-testid="refund-submit"
          >
            {busy ? 'Processing…' : 'Process refund'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------- Top Hosts ----------------

const TopHostsTab = () => {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await accountAPI.topHosts(10);
        setHosts(res.data.hosts || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div data-testid="top-hosts-loading">Loading…</div>;
  if (hosts.length === 0) {
    return <div className="dashboard-card text-center py-8 text-charcoal-light" data-testid="top-hosts-empty">
      No confirmed bookings yet
    </div>;
  }

  const max = Math.max(...hosts.map((h) => h.gross_paise));

  return (
    <div className="dashboard-card" data-testid="top-hosts-tab">
      <h3 className="text-lg font-bold text-charcoal mb-4">Top-earning hosts</h3>
      <ol className="space-y-3">
        {hosts.map((h, idx) => (
          <li key={h.host_id} className="space-y-1" data-testid={`top-host-${h.host_id}`}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-semibold text-charcoal">{h.full_name || h.host_id}</div>
                  <div className="text-xs text-charcoal-muted">{h.city || '—'} · {h.bookings} bookings</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-charcoal">{fmtINR(h.gross_paise)}</div>
                <div className="text-xs text-charcoal-muted">+ {fmtINR(h.platform_take_paise)} platform</div>
              </div>
            </div>
            <div className="h-2 rounded bg-gray-50 overflow-hidden">
              <div
                className="h-full bg-terracotta"
                style={{ width: `${(h.gross_paise / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

// ---------------- Invoice Modal Component ----------------

const InvoiceModal = ({ transaction, onClose }) => {
  const t = transaction;
  const user = t.user || {};
<<<<<<< HEAD
  const property = t.property || {};
  const propertyName = property.title || property.property_name || property.name || t.property_name || property.property_id || 'NA';
  const propertyAddress = [property.address, property.city, property.state, property.pin_code].filter(Boolean).join(', ') || 'NA';
  const invoiceBreakdown = t.invoice_breakdown || {};
  const amountINR = Number(invoiceBreakdown.total_amount ?? ((t.amount || 0) / 100));
  const formatInvoiceMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const baseAmount = Number(invoiceBreakdown.taxable_amount ?? (amountINR / 1.18));
  const planFee = Number(invoiceBreakdown.plan_fee ?? Math.max(0, baseAmount - Number(t.plan?.platform_fee || 0)));
  const platformFee = Number(invoiceBreakdown.platform_fee ?? t.plan?.platform_fee ?? 0);
  const couponCode = invoiceBreakdown.coupon_code || t.subscription?.coupon_code || '';
  const discountAmount = Number(invoiceBreakdown.discount_amount ?? t.subscription?.discount_amount ?? 0);
  const discountBase = Math.max(0, planFee + platformFee);
  const discountPercent = discountAmount > 0 && discountBase > 0 ? (discountAmount / discountBase) * 100 : 0;
  const cgst = Number(invoiceBreakdown.cgst ?? ((amountINR - baseAmount) / 2));
  const sgst = Number(invoiceBreakdown.sgst ?? ((amountINR - baseAmount) / 2));
  const totalGst = cgst + sgst;
=======
  const amountINR = (t.amount || 0) / 100;
  
  // 18% GST calculation (GST included in all user payments)
  const gstRate = 0.18;
  const baseAmount = amountINR / (1 + gstRate);
  const totalGst = amountINR - baseAmount;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" data-testid="invoice-modal">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div id="printable-invoice" className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-elevated p-6 relative overflow-hidden flex flex-col">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-charcoal-light hover:text-charcoal no-print"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {/* Invoice Header */}
        <div className="text-center pb-6 border-b border-dashed border-gray-200">
          <div className="text-xs uppercase tracking-widest text-terracotta font-semibold tracking-tight mb-1">Tax Invoice</div>
          <h2 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">X-SPACE360</h2>
          <p className="text-xs text-charcoal-muted mt-1">Short-Term Rentals Platform · India</p>
          <p className="text-xs text-charcoal-light">GSTIN: 27AAAAA1111A1Z1</p>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-4 py-6 text-xs border-b border-dashed border-gray-200">
          <div>
            <div className="text-charcoal-muted uppercase font-bold tracking-wider mb-1">Customer Details</div>
            <div className="font-bold text-charcoal text-sm">{user.full_name || '—'}</div>
            <div className="text-charcoal-light mt-0.5">{user.email || '—'}</div>
            <div className="text-charcoal-light">{user.phone || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-charcoal-muted uppercase font-bold tracking-wider mb-1">Invoice Details</div>
            <div><span className="font-semibold text-charcoal-light">Invoice #:</span> <span className="font-bold text-charcoal">{t.transaction_id}</span></div>
            <div><span className="font-semibold text-charcoal-light">Date:</span> {new Date(t.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
            <div><span className="font-semibold text-charcoal-light">Type:</span> <span className="capitalize font-medium text-terracotta">{t.type.replaceAll('_', ' ')}</span></div>
          </div>
        </div>

<<<<<<< HEAD
        {/* Invoice View Container */}
        <div className="overflow-x-auto">
          {/* Printable Invoice element */}
          <div id="printable-invoice" className="bg-white text-black font-sans border-2 border-black w-full min-w-[700px] mx-auto text-xs relative" style={{ boxSizing: 'border-box', padding: '2px' }}>
            
            {/* Header: Company details and Invoice details */}
            <table className="w-full border-collapse border-b-2 border-black" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td className="w-1/2 p-3 align-top border-r-2 border-black" style={{ width: '50%', padding: '8px', borderRight: '2px solid black', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <img src="/logo.png" alt="X-Space360 Logo" style={{ width: '150px', height: '40px', objectFit: 'contain', objectPosition: 'left center', display: 'block' }} />
                      <div>
                        <div className="font-bold text-sm mb-1" style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: '1.15' }}>
                          Golden Rich Financial & Real Estate<br />Solutions Pvt. Ltd.
                        </div>
                        <div style={{ fontSize: '9px', lineHeight: '1.25' }}>
                          Office No-804, Royal Avaan Avenue,<br />
                          Opp. Bhosla School Gate, Jehan Circle,<br />
                          Gangapur Road, Nashik-422013<br />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '9px', lineHeight: '1.3', marginTop: '2px' }}>
                      <strong>GSTIN/UIN:</strong> 27AAKCG1285C1ZP<br />
                      <strong>State Name:</strong> Maharashtra, Code : 27<br />
                      <strong>Contact:</strong> 9225586001<br />
                      <strong>Email:</strong> finance.director@goldenrichproperties.com
                    </div>
                  </td>
                  <td className="w-1/2 p-0 align-top" style={{ width: '50%', padding: 0, verticalAlign: 'top' }}>
                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid black' }}>
                          <td className="w-1/2 p-2 border-r border-black" style={{ width: '50%', padding: '8px', borderRight: '1px solid black' }}>
                            <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Invoice No.</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{t.invoice_no || t.transaction_id}</div>
                          </td>
                          <td className="w-1/2 p-2" style={{ width: '50%', padding: '8px' }}>
                            <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Dated</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{formatDateForInvoice(t.created_at)}</div>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid black' }}>
                          <td className="w-1/2 p-2 border-r border-black" style={{ width: '50%', padding: '8px', borderRight: '1px solid black' }}>
                            <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Mode/Terms of Payment</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              {t.upi_transaction_id ? 'UPI QR' : 'NET BANKING'}
                            </div>
                          </td>
                          <td className="w-1/2 p-2" style={{ width: '50%', padding: '8px' }}>
                            <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Reference No. & Date</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.upi_transaction_id || t.razorpay_payment_id || t.transaction_id || 'NA'}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Buyer (Bill to) & Dispatch section */}
            <table className="w-full border-collapse border-b-2 border-black" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td className="w-1/2 p-3 align-top border-r-2 border-black" style={{ width: '50%', padding: '12px', borderRight: '2px solid black', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Buyer (Bill to)</div>
                    <div className="font-bold text-xs mb-1" style={{ fontSize: '11px', fontWeight: 'bold' }}>{propertyName}</div>
                    <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
                      Address: {propertyAddress}<br />
                      GSTIN/UIN: {user.gst_number || user.gst_no || 'NA'}<br />
                      State Name: {user.gst_number && user.gst_number.length >= 2 ? (user.gst_number.startsWith('27') ? 'Maharashtra, Code : 27' : 'Other State, Code : ' + user.gst_number.substring(0, 2)) : 'Maharashtra, Code : 27'}<br />
                      Contact Person: {user.full_name || 'NA'}<br />
                      Mobile: {user.phone || 'NA'}<br />
                      Email: {user.email || 'NA'}
                    </div>
                  </td>
                  <td className="w-1/2 p-0 align-top" style={{ width: '50%', padding: 0, verticalAlign: 'top' }}>
                    <div style={{ minHeight: '112px' }}></div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Description of Goods Table */}
            <table className="w-full border-collapse border-b-2 border-black text-center text-[10px]" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px', textAlign: 'center' }}>
              <thead>
                <tr className="bg-gray-50 font-bold" style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold', borderBottom: '2px solid black' }}>
                    <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '5%' }}>Sr.No</th>
                  <th style={{ padding: '6px 6px', borderRight: '1px solid black', width: '45%', textAlign: 'left' }}>Description of Services</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '10%' }}>HSN/SAC</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '10%' }}>Services Offer</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '10%' }}>GST Rate</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '10%' }}>Rate</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '8%' }}>per</th>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid black', width: '8%' }}>Disc. %</th>
                  <th style={{ padding: '6px 6px', width: '12%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top' }}>1</td>
                  <td style={{ padding: '8px 6px', borderRight: '1px solid black', textAlign: 'left', verticalAlign: 'top', fontWeight: 'bold' }}>
                    {t.type === 'subscription' ? `Property Subscription Charges [${t.subscription?.start_date ? formatDateForInvoice(t.subscription.start_date) : 'NA'} to ${t.subscription?.end_date ? formatDateForInvoice(t.subscription.end_date) : 'NA'}]` :
                     t.type === 'booking_payment' ? `Booking Accommodation Charges [booking_id: ${t.booking_id || 'NA'}]` :
                     t.type === 'registration_fee' ? 'Host Registration Fee' :
                     t.type === 'refund' ? `Accommodation Refund [booking_id: ${t.booking_id || 'NA'}]` :
                     'Platform Service Charges'}
                  </td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top', fontFamily: 'monospace' }}>{t.type === 'subscription' ? '' : '998399'}</td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top', fontWeight: 'bold' }}>{t.type === 'subscription' ? '' : '01'}</td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top' }}>{t.type === 'subscription' ? '' : '18%'}</td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top', fontFamily: 'monospace' }}>{t.type === 'subscription' ? planFee.toFixed(2) : baseAmount.toFixed(2)}</td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top' }}>{t.type === 'subscription' ? '' : 'Nos'}</td>
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top' }}></td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'monospace' }}>{t.type === 'subscription' ? planFee.toFixed(2) : baseAmount.toFixed(2)}</td>
                </tr>
                {t.type === 'subscription' && (
                  <>
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#555' }}>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>Platform Fee</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{platformFee.toFixed(2)}</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{platformFee.toFixed(2)}</td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr style={{ borderBottom: '1px solid #ddd', color: '#555' }}>
                        <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                        <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>
                          Coupon Discount{couponCode ? ` (${couponCode})` : ''}
                        </td>
                        <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                        <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                        <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                        <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>-{discountAmount.toFixed(2)}</td>
                        <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                        <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>
                          {discountPercent ? `${discountPercent.toFixed(2)}%` : ''}
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>-{discountAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #ddd', color: '#555' }}>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>Taxable Amount</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>998399</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black', fontWeight: 'bold' }}>01</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}>18%</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{baseAmount.toFixed(2)}</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}>Nos</td>
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{baseAmount.toFixed(2)}</td>
                    </tr>
                  </>
                )}
                {/* CGST row */}
                <tr style={{ borderBottom: '1px solid #ddd', color: '#555' }}>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>CGST @ 9%</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}>9%</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                </tr>
                {/* SGST row */}
                <tr style={{ borderBottom: '1px solid black', color: '#555' }}>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>SGST @ 9%</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}>9%</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{sgst.toFixed(2)}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{sgst.toFixed(2)}</td>
                </tr>
                {/* Total row */}
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9', borderBottom: '1px solid black' }}>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 6px', borderRight: '1px solid black', textAlign: 'left' }}>Total</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black', fontWeight: 'bold' }}>01 Nos</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '6px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatInvoiceMoney(amountINR)}</td>
                </tr>
              </tbody>
            </table>

            {/* Amount in words */}
            <div className="py-2 px-3 border-b-2 border-black" style={{ padding: '8px 12px', borderBottom: '2px solid black' }}>
              <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Amount Chargeable (in words)</div>
              <div className="font-bold text-xs capitalize" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                Indian Rupees {numberToWords(amountINR)} Only
              </div>
=======
        {/* Transaction/Bill details Table */}
        <div className="py-6 flex-1">
          <div className="text-xs text-charcoal-muted uppercase font-bold tracking-wider mb-3">Itemized Details</div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-100 text-charcoal-muted font-bold">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Taxable Val.</th>
                <th className="py-2 text-right">GST (18%)</th>
                <th className="py-2 text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sand-100 text-charcoal">
                <td className="py-3 font-semibold text-sm">
                  {t.type === 'booking_payment' ? `Booking Accommodation Fee (${t.booking_id || '—'})` :
                   t.type === 'registration_fee' ? 'Host Registration Fee' :
                   t.type === 'subscription' ? 'Host Subscription Premium Plan' :
                   t.type === 'refund' ? `Accommodation Refund Processed (${t.booking_id || '—'})` :
                   'Platform Service Transaction'}
                </td>
                <td className="py-3 text-right">₹{baseAmount.toFixed(2)}</td>
                <td className="py-3 text-right">₹{totalGst.toFixed(2)}</td>
                <td className="py-3 text-right font-bold text-sm">₹{amountINR.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* GST breakdown table */}
          <div className="mt-6 bg-stone/50 rounded-xl p-4 border border-sand-100 text-xs">
            <div className="font-bold text-charcoal-muted uppercase tracking-wider mb-2 text-[10px]">Tax Breakdown</div>
            <div className="flex justify-between py-1 border-b border-gray-100/60">
              <span className="text-charcoal-light">CGST (9%)</span>
              <span className="font-medium text-charcoal">₹{cgst.toFixed(2)}</span>
>>>>>>> 87cbcd105480de08e8e7aebd5219a7d287ec8593
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100/60">
              <span className="text-charcoal-light">SGST (9%)</span>
              <span className="font-medium text-charcoal">₹{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-charcoal">
              <span>Total GST Paid</span>
              <span>₹{totalGst.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Invoice Footer Details */}
        <div className="border-t border-dashed border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-charcoal font-bold tracking-tight text-sm uppercase tracking-wider">Total Amount Paid</span>
            <span className="text-2xl font-bold tracking-tight text-terracotta">₹{amountINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-stone rounded-xl p-3 text-[11px] text-charcoal-muted flex items-center justify-between">
            <div>
              <div><span className="font-semibold">Payment Method:</span> {t.upi_transaction_id ? 'UPI QR' : 'Razorpay Online Gateway'}</div>
              <div><span className="font-semibold">Payment Status:</span> SUCCESS</div>
              {t.razorpay_payment_id && <div><span className="font-semibold">Razorpay ID:</span> {t.razorpay_payment_id}</div>}
              {t.upi_transaction_id && <div><span className="font-semibold">UTR / Transaction ID:</span> {t.upi_transaction_id}</div>}
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-green-100 text-green-800 rounded-full font-bold text-[10px] uppercase">Paid</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end space-x-3 no-print">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-charcoal rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
          >
            Close
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-terracotta text-white rounded-xl text-xs font-semibold hover:bg-terracotta-dark transition flex items-center space-x-1.5 shadow-sm hover:shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAccount;
