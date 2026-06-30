import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Download, IndianRupee, TrendingUp, Wallet, Users,
  RefreshCcw, CheckCircle, XCircle, AlertCircle, Clock,
  Search, Share2, FileText, Mail, MessageSquare, Printer, Check
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { accountAPI } from '../services/api';
import CouponManagement from '../components/admin/CouponManagement';
import { BookingManagement, SubscriptionManagement } from './AdminDashboard';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
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
        {tab === 'payouts' && <PayoutsTab />}
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
            inflow: Math.round(m.inflow_paise / 100),
            refund: Math.round(m.refund_paise / 100),
            net: Math.round(m.net_paise / 100),
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

  return (
    <div className="space-y-6" data-testid="transactions-tab">
      <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px] relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-charcoal-muted" />
            </span>
            <input
              type="text"
              placeholder="Search Customer Name / Phone / Email / Booking / Payment ID..."
              value={filters.q}
              onChange={(e) => handleFilterChange({ ...filters, q: e.target.value })}
              className="input-field pl-11 w-full bg-stone/50 focus:bg-white border border-gray-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 rounded-xl transition text-sm py-2.5"
              data-testid="filter-q"
            />
          </div>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange({ ...filters, type: e.target.value })}
            className="input-field w-52 bg-white border border-gray-200 rounded-xl py-2.5 text-sm"
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
            className="input-field w-44 bg-white border border-gray-200 rounded-xl py-2.5 text-sm"
            data-testid="filter-status"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filters.start}
              onChange={(e) => handleFilterChange({ ...filters, start: e.target.value })}
              className="input-field w-40 bg-white border border-gray-200 rounded-xl py-2 text-sm"
              data-testid="filter-start"
            />
            <span className="text-charcoal-muted text-xs font-bold">to</span>
            <input
              type="date"
              value={filters.end}
              onChange={(e) => handleFilterChange({ ...filters, end: e.target.value })}
              className="input-field w-40 bg-white border border-gray-200 rounded-xl py-2 text-sm"
              data-testid="filter-end"
            />
          </div>

          <button
            onClick={downloadCsv}
            className="px-5 py-2.5 rounded-xl bg-sage hover:bg-sage-dark text-white font-bold transition flex items-center space-x-2 text-sm shadow-sm"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-charcoal" data-testid="transactions-count">
            {loading ? 'Syncing transactions...' : `${total} Transactions Found`}
          </p>
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
              <table className="w-full text-sm text-left border-collapse" data-testid="transactions-table">
                <thead>
                  <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                    <th className="py-3 px-4 rounded-l-xl">Date & Time</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4 text-center rounded-r-xl no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {items.map((t) => (
                    <tr
                      key={t.transaction_id}
                      className="hover:bg-stone/30 transition text-charcoal"
                      data-testid={`txn-${t.transaction_id}`}
                    >
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-medium text-charcoal-light">
                        {new Date(t.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-charcoal text-sm">{t.user?.full_name || '—'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{t.user?.email || '—'}</div>
                        <div className="text-xs text-charcoal-light mt-0.5">{t.user?.phone || '—'}</div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider">
                          {t.type.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold tracking-tight text-sm text-charcoal whitespace-nowrap">
                        {fmtINR(t.amount)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-tight uppercase tracking-wide ${
                          t.status === 'success' ? 'bg-green-100 text-green-700' :
                          t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-xs text-charcoal-muted whitespace-nowrap">
                        {t.booking_id || '—'}
                      </td>
                      <td className="py-4 px-4 text-charcoal-light text-xs font-mono whitespace-nowrap">
                        {t.razorpay_payment_id || t.razorpay_payout_id || t.razorpay_refund_id || '—'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center no-print">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Invoice Button */}
                          <button
                            onClick={() => setSelectedInvoiceTxn(t)}
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone flex items-center space-x-1.5 transition text-xs font-bold shadow-sm"
                            title="View & Print Invoice"
                          >
                            <FileText className="w-4 h-4 text-terracotta" />
                            <span>Invoice</span>
                          </button>

                          {/* Share Button Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveShareId(activeShareId === t.transaction_id ? null : t.transaction_id)}
                              className="px-3 py-2 rounded-xl border border-gray-200 hover:border-sage text-charcoal hover:bg-stone flex items-center space-x-1.5 transition text-xs font-bold shadow-sm"
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
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="pagination-prev"
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
                        data-testid={`pagination-page-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                
                <button
                  onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / LIMIT)), p + 1))}
                  disabled={page * LIMIT >= total}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-stone transition text-xs font-bold shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center space-x-1"
                  data-testid="pagination-next"
                >
                  <span>Next</span>
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
  const amountINR = (t.amount || 0) / 100;
  
  // 18% GST calculation (GST included in all user payments)
  const gstRate = 0.18;
  const baseAmount = amountINR / (1 + gstRate);
  const totalGst = amountINR - baseAmount;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

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
              <div><span className="font-semibold">Payment Method:</span> Razorpay Online Gateway</div>
              <div><span className="font-semibold">Payment Status:</span> SUCCESS</div>
              {t.razorpay_payment_id && <div><span className="font-semibold">Razorpay ID:</span> {t.razorpay_payment_id}</div>}
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
