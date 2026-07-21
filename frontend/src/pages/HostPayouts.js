import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  Building,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { accountAPI, bookingAPI } from '../services/api';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const cycleDelay = (cycle) => {
  if (cycle === 'weekly') return 7;
  if (cycle === 'monthly') return 30;
  return 1;
};

const statusStyle = (status) => (
  status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
  status === 'eligible' ? 'bg-amber-50 text-amber-700 border-amber-200' :
  status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
  status === 'needs_destination' ? 'bg-orange-50 text-orange-700 border-orange-200' :
  'bg-red-50 text-red-700 border-red-200'
);

const statusIcon = (status) => {
  if (status === 'paid') return CheckCircle2;
  if (status === 'failed') return XCircle;
  if (status === 'needs_destination') return AlertCircle;
  return Clock;
};

const HostPayouts = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [pref, setPref] = useState({
    preferred: 'upi',
    upi_vpa: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc: '',
    payout_cycle: 'daily',
  });
  const [masked, setMasked] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const [pr, py, bk] = await Promise.all([
        accountAPI.getHostPayoutPreference(),
        accountAPI.listMyPayouts(),
        bookingAPI.getHostBookings(),
      ]);
      const p = pr.data.payout_preference || {};
      setPref({
        preferred: p.preferred || 'upi',
        upi_vpa: p.upi_vpa || '',
        bank_account_holder: p.bank_account_holder || '',
        bank_account_number: p.bank_account_number || '',
        bank_ifsc: p.bank_ifsc || '',
        payout_cycle: p.payout_cycle || 'daily',
      });
      setMasked(p.bank_account_number_masked || null);
      setPayouts(py.data.payouts || []);
      setBookings(bk.data.bookings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const inThisMonth = (value) => {
      const d = value ? new Date(value) : null;
      return d && !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year;
    };

    const isEarnedBooking = (b) =>
      ['confirmed', 'completed'].includes(String(b.booking_status || '').toLowerCase()) &&
      ['paid', 'captured'].includes(String(b.payment_status || '').toLowerCase());
    const bookingDate = (b) => b.check_in_date || b.created_at;
    const thisMonthBookings = bookings.filter((b) => isEarnedBooking(b) && inThisMonth(bookingDate(b)));
    const allEarnedBookings = bookings.filter(isEarnedBooking);
    const paid = payouts.filter((p) => p.status === 'paid');
    const upcoming = payouts.filter((p) => ['eligible', 'processing', 'needs_destination'].includes(p.status));
    const totalGross = thisMonthBookings.reduce((sum, b) => sum + Math.round(Number(b.total_amount || 0) * 100), 0);
    const totalFee = Math.round(totalGross * 0.10);
    const totalTds = thisMonthBookings.reduce((sum, b) => {
      const payout = payouts.find((p) => p.booking_id === b.booking_id);
      if (payout?.tds_amount !== undefined && payout?.tds_amount !== null) return sum + Number(payout.tds_amount || 0);
      return sum + Math.round(Number(b.total_amount || 0) * 100 * 0.01);
    }, 0);
    const totalNet = Math.max(0, totalGross - totalFee - totalTds);
    const lifetimeGross = allEarnedBookings.reduce((sum, b) => sum + Math.round(Number(b.total_amount || 0) * 100), 0);
    const lifetimeFee = Math.round(lifetimeGross * 0.10);
    const lifetimeTds = Math.round(lifetimeGross * 0.01);
    const lifetimeNet = Math.max(0, lifetimeGross - lifetimeFee - lifetimeTds);
    const paidNet = paid.reduce((sum, p) => sum + (p.net_amount || 0), 0);
    const payoutUpcomingNet = upcoming.reduce((sum, p) => sum + (p.net_amount || 0), 0);
    const unpaidEarnedNet = Math.max(0, totalNet - paidNet);
    const upcomingNet = Math.max(payoutUpcomingNet, unpaidEarnedNet);
    const latestPaid = paid
      .map((p) => p.processed_at || p.updated_at || p.eligible_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    const nextEligible = upcoming
      .map((p) => p.eligible_at)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0];

    return { totalGross, totalFee, totalTds, totalNet, lifetimeGross, lifetimeFee, lifetimeTds, lifetimeNet, paidNet, upcomingNet, latestPaid, nextEligible, hasUnpaidEarnings: unpaidEarnedNet > 0 };
  }, [payouts, bookings]);

  const chartData = useMemo(() => {
    const buckets = new Map();
    const sourceRows = payouts.length
      ? payouts.map((p) => ({ date: p.processed_at || p.eligible_at || p.created_at, amount: p.net_amount || 0 }))
      : bookings
          .filter((b) => ['confirmed', 'completed'].includes(String(b.booking_status || '').toLowerCase()) && ['paid', 'captured'].includes(String(b.payment_status || '').toLowerCase()))
          .map((b) => ({ date: b.check_in_date || b.created_at, amount: Math.round(Number(b.total_amount || 0) * 100 * 0.90) }));
    sourceRows.forEach((row) => {
      const dateValue = row.date;
      const d = dateValue ? new Date(dateValue) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      buckets.set(key, (buckets.get(key) || 0) + (row.amount || 0));
    });
    const rows = Array.from(buckets.entries()).slice(-6).map(([label, amount]) => ({ label, amount }));
    const max = Math.max(1, ...rows.map((r) => r.amount));
    return rows.map((r) => ({ ...r, height: Math.max(12, Math.round((r.amount / max) * 118)) }));
  }, [payouts, bookings]);

  const chartMaxRupees = useMemo(() => {
    const maxPaise = Math.max(1, ...chartData.map((r) => r.amount || 0));
    return Math.max(1000, Math.ceil((maxPaise / 100) / 1000) * 1000);
  }, [chartData]);

  const save = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const r = await accountAPI.updateHostPayoutPreference(pref);
      setMessage('Payout preference saved');
      setMasked(r.data.payout_preference?.bank_account_number_masked || null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save payout preference');
    } finally {
      setSaving(false);
    }
  };

  const downloadStatement = () => {
    const rows = [
      ['Payout ID', 'Payout Date', 'Booking ID', 'Property', 'Gross INR', 'Platform Fee INR', 'TDS INR', 'Net INR', 'Status'],
      ...payouts.map((p) => [
        p.payout_id,
        fmtDate(p.processed_at || p.eligible_at),
        p.booking_id,
        p.property?.title || p.property_id,
        ((p.gross_amount || 0) / 100).toFixed(2),
        ((p.platform_fee || 0) / 100).toFixed(2),
        ((p.tds_amount || Math.round((p.gross_amount || 0) * 0.01)) / 100).toFixed(2),
        ((p.net_amount || 0) / 100).toFixed(2),
        p.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host_payout_statement_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const destinationLabel = pref.preferred === 'bank'
    ? (masked || pref.bank_account_number || 'Bank account not added')
    : (pref.upi_vpa || 'UPI ID not added');

  return (
    <div className="min-h-screen bg-stone" data-testid="host-payouts-page">
      <header className="header-glass sticky top-0 z-50 px-6 py-4">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              {[
                { label: 'DASHBOARD', path: '/host/dashboard' },
                { label: 'CALENDAR', path: '/host/calendar' },
                { label: 'PAYOUTS', path: '/host/payouts' },
                { label: 'BOOKINGS', path: '/host/bookings' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`text-[10px] font-bold tracking-[0.2em] transition-colors ${
                    item.path === '/host/payouts'
                      ? 'text-terracotta border-b border-terracotta pb-0.5'
                      : 'text-charcoal-muted hover:text-terracotta'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="h-6 w-px bg-sand-200" />
            <span className="text-xs font-bold text-charcoal-muted hidden sm:inline">
              Welcome, {user?.full_name?.split(' ')[0]}
            </span>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(logout, 50);
              }}
              className="text-xs font-bold text-terracotta hover:underline tracking-widest uppercase"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 lg:px-12 py-8 mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Payouts</h1>
            <p className="text-xs text-charcoal-muted font-semibold mt-1">
              Track your earnings and payouts from X-Space360 bookings
            </p>
          </div>
          <button
            onClick={downloadStatement}
            className="px-5 py-3 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
            data-testid="download-statement-btn"
          >
            <Download className="w-4 h-4" />
            Download Statement
          </button>
        </div>

        <div className="flex gap-7 border-b border-gray-200 bg-white px-3 rounded-t-2xl">
          {[
            ['overview', 'Overview'],
            ['history', 'Payout History'],
            ['statements', 'Statements'],
            ['invoices', 'Invoices'],
            ['tax', 'Tax Documents'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-3 text-xs font-bold border-b-2 transition ${
                tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-charcoal-muted font-bold text-xs uppercase tracking-widest">
            Loading payouts data...
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <MetricCard title="Total Earnings" value={fmtINR(summary.totalGross)} note="This month" icon={Wallet} color="blue" />
                  <MetricCard title="Net Payout" value={fmtINR(summary.paidNet)} note={summary.latestPaid ? `Paid out ${fmtDate(summary.latestPaid)}` : 'No paid payouts yet'} icon={Banknote} color="green" />
                  <MetricCard title="Upcoming Payout" value={fmtINR(summary.upcomingNet)} note={summary.nextEligible ? `Scheduled ${fmtDate(summary.nextEligible)}` : summary.hasUnpaidEarnings ? 'Pending earned payout' : 'No pending payout'} icon={CalendarDays} color="amber" />
                  <MetricCard title="Payout Frequency" value={pref.payout_cycle || 'Daily'} note={`After ${cycleDelay(pref.payout_cycle)} day cycle`} icon={Clock} color="purple" />
                  <MetricCard title="Payout Account" value={pref.preferred === 'bank' ? 'Bank Account' : 'UPI / VPA'} note={destinationLabel} icon={Landmark} color="sky" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-5 items-start">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-5">
                      <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-charcoal">Earnings Overview</h2>
                        <p className="text-[11px] text-charcoal-muted font-semibold mt-1">This Month</p>
                        <div className="mt-5 space-y-3 text-xs">
                          <AmountLine label="Booking Revenue" amount={summary.totalGross} />
                          <AmountLine label="Platform Commission (10%)" amount={-summary.totalFee} muted />
                          <AmountLine label="TDS Deducted (1%)" amount={-summary.totalTds} muted />
                          <div className="border-t border-gray-100 pt-3">
                            <AmountLine label="Total Net Earnings" amount={summary.totalNet} strong />
                            <AmountLine label="Paid Payout Received" amount={summary.paidNet} muted />
                            <AmountLine label="Pending / Upcoming Payout" amount={summary.upcomingNet} muted />
                          </div>
                        </div>
                      </section>

                      <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm min-h-[260px] overflow-hidden">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-sm font-bold text-charcoal">Net Earnings Trend</h2>
                          <span className="text-[11px] font-semibold text-charcoal-muted border border-gray-100 rounded-lg px-3 py-1">
                            Last {Math.max(chartData.length, 1)} payouts
                          </span>
                        </div>
                        <div className="relative h-44 mt-5 overflow-x-auto px-2">
                          <div className="absolute inset-x-2 top-0 bottom-7 flex flex-col justify-between pointer-events-none">
                            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                              <div key={ratio} className="flex items-center gap-3">
                                <span className="w-10 text-[10px] font-semibold text-charcoal-muted text-right">{ratio === 0 ? '₹0' : `₹${Math.round((chartMaxRupees * ratio) / 1000)}K`}</span>
                                <span className="h-px flex-1 bg-gray-100" />
                              </div>
                            ))}
                          </div>
                          <div className="relative h-full flex items-end gap-8 pl-12 pr-3">
                          {chartData.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-charcoal-muted">
                              No payout trend yet
                            </div>
                          ) : chartData.map((bar) => (
                            <div key={bar.label} className="flex flex-col items-center gap-2 min-w-14">
                              <div className="w-9 rounded-t-md bg-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.22)]" style={{ height: `${bar.height}px` }} />
                              <span className="text-[10px] font-semibold text-charcoal-muted">{bar.label}</span>
                            </div>
                          ))}
                          </div>
                        </div>
                        <div className="flex justify-center text-[10px] font-semibold text-charcoal-muted gap-2">
                          <span className="w-2 h-2 rounded-sm bg-blue-600 mt-0.5" />
                          Net Earnings
                        </div>
                      </section>
                    </div>

                    <PayoutHistory payouts={payouts.slice(0, 5)} compact />
                    <EarningsInsightBanner onDownload={downloadStatement} />
                  </div>

                  <aside className="space-y-4">
                    <PreferencePanel
                      pref={pref}
                      setPref={setPref}
                      masked={masked}
                      save={save}
                      saving={saving}
                      message={message}
                      error={error}
                    />
                    <InfoCard
                      title="Payout Information"
                      lines={[
                        'Payouts are released by admin from Account > Payouts.',
                        '10% platform commission is deducted per booking.',
                        'Eligible payouts depend on your selected payout cycle.',
                      ]}
                    />
                    <ActionCard title="Download Reports" text="Download detailed reports of your earnings and payouts." action="Download Report" icon={Download} onClick={downloadStatement} />
                    <ActionCard title="Tax Information" text="View and download your TDS certificates." action="View Tax Documents" icon={FileText} onClick={() => setTab('tax')} />
                  </aside>
                </div>
              </div>
            )}

            {tab === 'history' && <PayoutHistory payouts={payouts} />}
            {tab === 'statements' && <SimpleDocumentTab title="Statements" text="Generate a CSV statement for all payout records." action="Download Statement" onClick={downloadStatement} icon={ReceiptText} />}
            {tab === 'invoices' && <SimpleDocumentTab title="Invoices" text="Payout invoices are generated from paid payout ledger entries." action="Download Statement" onClick={downloadStatement} icon={FileText} />}
            {tab === 'tax' && <SimpleDocumentTab title="Tax Documents" text="TDS and tax documents will appear here once issued by admin." action="Download Statement" onClick={downloadStatement} icon={ShieldCheck} />}
          </>
        )}
      </main>
    </div>
  );
};

const MetricCard = ({ title, value, note, icon: Icon, color }) => {
  const styles = {
    blue: { card: 'bg-blue-50/40 border-blue-100', icon: 'bg-blue-600 text-white' },
    green: { card: 'bg-emerald-50/45 border-emerald-100', icon: 'bg-emerald-600 text-white' },
    amber: { card: 'bg-amber-50/45 border-amber-100', icon: 'bg-amber-500 text-white' },
    purple: { card: 'bg-violet-50/45 border-violet-100', icon: 'bg-violet-600 text-white' },
    sky: { card: 'bg-sky-50/45 border-sky-100', icon: 'bg-blue-600 text-white' },
  };
  const tone = styles[color] || styles.blue;
  return (
    <section className={`rounded-xl border p-5 shadow-sm min-h-[126px] ${tone.card}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-charcoal-muted">{title}</p>
          <p className="text-xl font-bold text-charcoal mt-3 capitalize break-words">{value}</p>
          <p className="text-[11px] font-semibold text-charcoal-muted mt-2 break-words">{note}</p>
        </div>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm ${tone.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
};

const AmountLine = ({ label, amount, strong, muted }) => (
  <div className={`flex justify-between gap-3 ${strong ? 'font-bold text-blue-700' : muted ? 'text-charcoal-muted' : 'text-charcoal'}`}>
    <span className="font-semibold flex items-center gap-2">
      {!strong && <span className={`w-1.5 h-1.5 rounded-full ${amount < 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />}
      {label}
    </span>
    <span className="font-bold">{amount < 0 ? '-' : ''}{fmtINR(Math.abs(amount))}</span>
  </div>
);

const PayoutHistory = ({ payouts, compact = false }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm" data-testid="my-payouts-card">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-sm font-bold text-charcoal">Payout History</h2>
      {compact && <span className="text-[11px] font-bold text-blue-700">View All Payouts</span>}
    </div>
    {payouts.length === 0 ? (
      <div className="py-12 text-center text-xs font-semibold text-charcoal-muted border border-dashed border-gray-200 rounded-2xl">
        Payouts will appear here after completed paid bookings become eligible.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="text-left text-charcoal-muted">
            <tr className="border-b border-gray-100">
              <th className="py-3 pr-4">Payout ID</th>
              <th className="py-3 pr-4">Payout Date</th>
              <th className="py-3 pr-4">For Period</th>
              <th className="py-3 pr-4 text-right">Amount</th>
              <th className="py-3 pr-4 text-center">Status</th>
              <th className="py-3 pr-4">Reference No.</th>
              <th className="py-3 pr-4">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payouts.map((p) => {
              const StatusIcon = statusIcon(p.status);
              const fromDate = p.booking?.check_in_date || p.eligible_at;
              const toDate = p.booking?.check_out_date || p.eligible_at;
              return (
                <tr key={p.payout_id} data-testid={`my-payout-${p.payout_id}`}>
                  <td className="py-3 pr-4 font-mono text-[11px] text-charcoal">{p.payout_id}</td>
                  <td className="py-3 pr-4 font-semibold text-charcoal">{fmtDate(p.processed_at || p.eligible_at)}</td>
                  <td className="py-3 pr-4 text-charcoal-muted">{fmtDate(fromDate)} - {fmtDate(toDate)}</td>
                  <td className="py-3 pr-4 text-right font-bold text-charcoal">{fmtINR(p.net_amount)}</td>
                  <td className="py-3 pr-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold capitalize ${statusStyle(p.status)}`}>
                      <StatusIcon className="w-3 h-3" />
                      {String(p.status || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11px] text-charcoal-muted">{p.razorpay_payout_id || p.booking_id}</td>
                  <td className="py-3 pr-4">
                    <button className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline">
                      <ArrowDownToLine className="w-3 h-3" />
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const EarningsInsightBanner = ({ onDownload }) => (
  <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5 shadow-sm">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
          <Wallet className="w-9 h-9 text-blue-600" />
          <div className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="absolute -top-2 right-2 w-8 h-8 rounded-full bg-emerald-400 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-blue-700">Keep track of your earnings</h2>
          <p className="text-xs font-semibold text-charcoal-muted mt-1 max-w-xl">
            View detailed insights, download reports and manage your payout preferences easily.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['Real-time Updates', Clock],
              ['Secure Transactions', LockKeyhole],
              ['Detailed Reports', FileText],
              ['Easy Downloads', Download],
            ].map(([label, Icon]) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-lg bg-white border border-blue-100 px-3 py-2 text-[11px] font-bold text-charcoal-muted">
                <Icon className="w-3.5 h-3.5 text-blue-600" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="hidden xl:block rounded-2xl bg-white border border-blue-100 p-4 w-48 shadow-sm">
        <div className="h-20 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Banknote className="w-10 h-10" />
        </div>
        <button onClick={onDownload} className="mt-3 w-full rounded-lg bg-blue-600 text-white py-2 text-[11px] font-bold">
          Download Statement
        </button>
      </div>
    </div>
  </section>
);

const PreferencePanel = ({ pref, setPref, masked, save, saving, message, error }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <h2 className="text-sm font-bold text-charcoal">Payout Destination</h2>
    <p className="text-[11px] text-charcoal-muted font-semibold mt-1">Platform fee is 10%; you keep 90% of each booking.</p>

    <div className="grid grid-cols-2 gap-2 mt-4">
      {[
        ['upi', 'UPI / VPA', Wallet],
        ['bank', 'Bank', Building],
      ].map(([value, label, Icon]) => (
        <button
          key={value}
          onClick={() => setPref({ ...pref, preferred: value })}
          className={`p-3 rounded-xl border text-left flex items-center gap-2 ${
            pref.preferred === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <Icon className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold">{label}</span>
        </button>
      ))}
    </div>

    {pref.preferred === 'upi' ? (
      <input
        value={pref.upi_vpa}
        onChange={(e) => setPref({ ...pref, upi_vpa: e.target.value })}
        placeholder="name@bank"
        className="mt-4 w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-terracotta"
      />
    ) : (
      <div className="mt-4 space-y-3">
        <input value={pref.bank_account_holder} onChange={(e) => setPref({ ...pref, bank_account_holder: e.target.value })} placeholder="Account holder name" className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-terracotta" />
        <input value={pref.bank_account_number} onChange={(e) => setPref({ ...pref, bank_account_number: e.target.value })} placeholder={masked ? `Current: ${masked}` : 'Account number'} className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-terracotta" />
        <input value={pref.bank_ifsc} onChange={(e) => setPref({ ...pref, bank_ifsc: e.target.value.toUpperCase() })} placeholder="IFSC code" className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-terracotta" />
      </div>
    )}

    <div className="grid grid-cols-3 gap-2 mt-4">
      {['daily', 'weekly', 'monthly'].map((cycle) => (
        <button
          key={cycle}
          onClick={() => setPref({ ...pref, payout_cycle: cycle })}
          className={`px-2 py-2 rounded-xl border text-xs font-bold capitalize ${
            pref.payout_cycle === cycle ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-charcoal'
          }`}
        >
          {cycle}
        </button>
      ))}
    </div>

    {message && <p className="mt-3 text-xs font-bold text-emerald-700">{message}</p>}
    {error && <p className="mt-3 text-xs font-bold text-red-700">{error}</p>}
    <button onClick={save} disabled={saving} className="mt-4 w-full bg-blue-600 text-white rounded-xl py-3 text-xs font-bold tracking-widest uppercase disabled:opacity-60 hover:bg-blue-700 transition">
      {saving ? 'Saving...' : 'Save Preference'}
    </button>
  </section>
);

const InfoCard = ({ title, lines }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <h2 className="text-sm font-bold text-charcoal">{title}</h2>
    <ul className="mt-4 space-y-3 text-[11px] font-semibold text-charcoal-muted">
      {lines.map((line) => (
        <li key={line} className="flex gap-2">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  </section>
);

const ActionCard = ({ title, text, action, icon: Icon, onClick }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <h2 className="text-sm font-bold text-charcoal">{title}</h2>
    <p className="text-[11px] font-semibold text-charcoal-muted mt-2">{text}</p>
    <button onClick={onClick} className="mt-4 px-4 py-2 rounded-xl border border-blue-200 text-blue-700 font-bold text-xs flex items-center gap-2 hover:bg-blue-50">
      <Icon className="w-4 h-4" />
      {action}
    </button>
  </section>
);

const SimpleDocumentTab = ({ title, text, action, onClick, icon: Icon }) => (
  <section className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm text-center">
    <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
      <Icon className="w-7 h-7" />
    </div>
    <h2 className="text-lg font-bold text-charcoal mt-5">{title}</h2>
    <p className="text-sm text-charcoal-muted font-semibold mt-2">{text}</p>
    <button onClick={onClick} className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-2">
      <Download className="w-4 h-4" />
      {action}
    </button>
  </section>
);

export default HostPayouts;
