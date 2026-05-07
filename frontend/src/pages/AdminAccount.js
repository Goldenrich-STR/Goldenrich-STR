import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Download, DollarSign, TrendingUp, Wallet, Users,
  RefreshCcw, CheckCircle, XCircle, AlertCircle, Clock,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { accountAPI } from '../services/api';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
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
    <div className="min-h-screen bg-sand-50" data-testid="admin-account-page">
      <header className="header-glass px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-terracotta hover:underline flex items-center space-x-1"
              data-testid="back-to-admin-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-charcoal">PropNest · Admin Account</h1>
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex flex-wrap gap-2 mb-6" data-testid="account-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-terracotta text-white'
                  : 'bg-white text-charcoal hover:bg-sand-100 border border-sand-200'
              }`}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'transactions' && <TransactionsTab />}
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
    { label: 'Total Gross Revenue',     value: fmtINR(rev.total_gross_paise),       icon: DollarSign, testid: 'stat-total-gross' },
    { label: 'Platform Take (10%)',     value: fmtINR(rev.platform_take_paise),     icon: TrendingUp, testid: 'stat-platform-take' },
    { label: 'Pending Payouts',         value: fmtINR(data.pending_payouts.amount_paise), icon: Wallet,   testid: 'stat-pending-payouts', sub: `${data.pending_payouts.count} queued` },
    { label: 'MRR',                     value: fmtINR(data.mrr_paise),              icon: RefreshCcw, testid: 'stat-mrr' },
    { label: 'Booking Payments',        value: fmtINR(rev.booking_payments_paise),  icon: DollarSign, testid: 'stat-booking-payments', sub: `${data.counts.booking_payments} bookings` },
    { label: 'Registration Fees',       value: fmtINR(rev.registration_fees_paise), icon: CheckCircle, testid: 'stat-registration-fees', sub: `${data.counts.registration_fees} hosts` },
    { label: 'Subscription Revenue',    value: fmtINR(rev.subscriptions_paise),     icon: RefreshCcw, testid: 'stat-subscriptions', sub: `${data.counts.subscriptions} subs` },
    { label: 'Refunds Issued',          value: fmtINR(rev.refunds_paise),           icon: XCircle,    testid: 'stat-refunds', sub: `${data.counts.refunds} refunds` },
  ];

  return (
    <div className="space-y-6" data-testid="overview-tab">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="dashboard-card" data-testid={c.testid}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-muted">{c.label}</p>
                <p className="text-2xl font-bold text-charcoal mt-1">{c.value}</p>
                {c.sub && <p className="text-xs text-charcoal-light mt-1">{c.sub}</p>}
              </div>
              <c.icon className="w-5 h-5 text-terracotta" />
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
              <Line type="monotone" dataKey="inflow" stroke="#C05C4F" strokeWidth={2} dot={{ r: 3 }} />
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

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await accountAPI.listTransactions({ ...params, limit: 100 });
      setItems(res.data.transactions || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

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

  return (
    <div className="space-y-4" data-testid="transactions-tab">
      <div className="dashboard-card">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="input-field w-48"
            data-testid="filter-type"
          >
            <option value="">All types</option>
            <option value="booking_payment">Booking payments</option>
            <option value="registration_fee">Registration fees</option>
            <option value="subscription">Subscriptions</option>
            <option value="refund">Refunds</option>
            <option value="payout">Payouts</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field w-40"
            data-testid="filter-status"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={filters.start}
            onChange={(e) => setFilters({ ...filters, start: e.target.value })}
            className="input-field w-40"
            data-testid="filter-start"
          />
          <input
            type="date"
            value={filters.end}
            onChange={(e) => setFilters({ ...filters, end: e.target.value })}
            className="input-field w-40"
            data-testid="filter-end"
          />
          <input
            type="text"
            placeholder="Search id / payment / booking"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            className="input-field flex-1 min-w-[220px]"
            data-testid="filter-q"
          />
          <button
            onClick={downloadCsv}
            className="px-4 py-2 rounded-lg bg-sage text-white font-semibold hover:bg-sage-dark flex items-center space-x-2"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="dashboard-card overflow-x-auto">
        <p className="text-sm text-charcoal-light mb-2" data-testid="transactions-count">
          {loading ? 'Loading…' : `${total} transactions`}
        </p>
        {!loading && items.length === 0 && (
          <p className="text-charcoal-light py-6 text-center" data-testid="transactions-empty">
            No matching transactions
          </p>
        )}
        {items.length > 0 && (
          <table className="w-full text-sm" data-testid="transactions-table">
            <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
              <tr className="border-b border-sand-200">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Booking</th>
                <th className="py-2 pr-3">Payment ID</th>
                <th className="py-2 pr-3">Mock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr
                  key={t.transaction_id}
                  className="border-b border-sand-100"
                  data-testid={`txn-${t.transaction_id}`}
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="px-2 py-0.5 rounded bg-sand-100 text-xs font-semibold">
                      {t.type.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-semibold">{fmtINR(t.amount)}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      t.status === 'success' ? 'bg-green-100 text-green-700' :
                      t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-2 pr-3 text-charcoal-muted">{t.booking_id || '—'}</td>
                  <td className="py-2 pr-3 text-charcoal-muted text-xs">
                    {t.razorpay_payment_id || t.razorpay_payout_id || t.razorpay_refund_id || '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {t.is_mock ? <span className="text-xs text-charcoal-muted">demo</span> : <span className="text-xs">live</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ---------------- Payouts ----------------

const PayoutsTab = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('eligible');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountAPI.listPayouts(status ? { status } : {});
      setItems(res.data.payouts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

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
          onChange={(e) => setStatus(e.target.value)}
          className="input-field w-48"
          data-testid="payout-status-filter"
        >
          <option value="eligible">Eligible (ready)</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="">All</option>
        </select>
        <button
          onClick={sweep}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-sand-100 text-charcoal font-semibold hover:bg-sand-200 disabled:opacity-60"
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
          <table className="w-full text-sm" data-testid="payouts-table">
            <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
              <tr className="border-b border-sand-200">
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
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-charcoal">{p.host?.full_name || p.host_id}</div>
                    <div className="text-xs text-charcoal-muted">{p.host?.email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-charcoal">{p.property?.title || p.property_id}</div>
                    <div className="text-xs text-charcoal-muted">{p.property?.city}</div>
                  </td>
                  <td className="py-2 pr-3">{fmtINR(p.gross_amount)}</td>
                  <td className="py-2 pr-3 text-charcoal-muted">{fmtINR(p.platform_fee)}</td>
                  <td className="py-2 pr-3 font-bold">{fmtINR(p.net_amount)}</td>
                  <td className="py-2 pr-3 text-xs">
                    <div>{p.destination_type?.toUpperCase()}</div>
                    <div className="text-charcoal-muted">{p.destination_ref || '—'}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'eligible' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                    {p.failure_reason && (
                      <div className="text-xs text-red-600 mt-1">{p.failure_reason}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {p.status === 'eligible' && (
                      <button
                        onClick={() => processOne(p.payout_id)}
                        disabled={busy}
                        className="px-3 py-1 rounded bg-sage text-white text-xs font-semibold hover:bg-sage-dark disabled:opacity-60"
                        data-testid={`pay-${p.payout_id}`}
                      >
                        Pay out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ---------------- Refunds ----------------

const RefundsTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountAPI.listRefunds({});
      setItems(res.data.refunds || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          <table className="w-full text-sm" data-testid="refunds-table">
            <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
              <tr className="border-b border-sand-200">
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
                  <td className="py-2 pr-3 text-charcoal-muted text-xs">{r.booking_id}</td>
                  <td className="py-2 pr-3 text-charcoal-muted text-xs">{r.guest_id}</td>
                  <td className="py-2 pr-3">{fmtINR(r.original_amount)}</td>
                  <td className="py-2 pr-3 font-bold">{fmtINR(r.refund_amount)}</td>
                  <td className="py-2 pr-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-sand-100 font-semibold">
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
        <div className="px-6 py-4 border-b border-sand-200 flex items-center justify-between">
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
            <label className="block text-sm font-semibold text-charcoal mb-1">Override percent (optional)</label>
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
        <div className="px-6 py-4 border-t border-sand-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-sand-300 text-charcoal hover:bg-sand-50"
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
            <div className="h-2 rounded bg-sand-100 overflow-hidden">
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

export default AdminAccount;
