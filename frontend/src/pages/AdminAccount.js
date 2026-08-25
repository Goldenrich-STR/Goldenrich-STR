import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Download, IndianRupee, TrendingUp, Wallet, Users,
  RefreshCcw, CheckCircle, XCircle, AlertCircle, Clock,
  Search, Share2, FileText, Mail, MessageSquare, Printer, CalendarDays, ChevronLeft, ChevronRight,
  Plus, Trash, SlidersHorizontal, Eye
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { accountAPI, bookingAPI, pricingAPI } from '../services/api';
import CouponManagement from '../components/admin/CouponManagement';
import { BookingManagement, SubscriptionManagement } from './AdminDashboard';
import { requestConfirm, showNotice } from './admin/shared';
import { buildCustomerBookingInvoiceHtml } from '../utils/bookingInvoice';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Math.abs(Number(paise || 0)) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

const formatDateForInvoice = (value) => {
  if (!value) return 'NA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'NA';
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-');
};

const usefulInvoiceText = (...values) => {
  const value = values.find((item) => {
    if (item === undefined || item === null) return false;
    const text = String(item).trim();
    return text && !['NA', 'N/A', '-'].includes(text.toUpperCase());
  });
  return value === undefined || value === null ? null : String(value).trim();
};

const invoiceFinancialYearLabel = (value) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const startYear = safeDate.getMonth() + 1 >= 4 ? year : year - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

const bookingInvoiceSuffix = (...values) => {
  const value = usefulInvoiceText(...values);
  if (!value) return null;
  const compact = value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact ? compact.slice(-5) : null;
};

const customerBookingInvoiceNo = (record = {}, booking = {}) => {
  const explicit = usefulInvoiceText(
    record.customer_invoice_no,
    record.tax_invoice_no,
    record.booking_invoice_no,
    record.invoice_no,
    record.invoice_number,
    booking.customer_invoice_no,
    booking.tax_invoice_no,
    booking.booking_invoice_no,
    booking.invoice_no,
    booking.invoice_number,
  );
  if (explicit?.toUpperCase().startsWith('STRC/')) return explicit;
  if (explicit?.toUpperCase().startsWith('STRB/')) return `STRC/${explicit.split('/').slice(1).join('/')}`;
  return explicit || 'NA';
};

const displayInvoiceNoForTransaction = (transaction = {}) => {
  if (['booking_payment', 'refund'].includes(transaction.type)) {
    return customerBookingInvoiceNo(transaction, transaction.booking || {});
  }
  return usefulInvoiceText(transaction.invoice_no, transaction.invoice_number, transaction.transaction_id) || 'NA';
};

const numberToWordsInteger = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowHundred = (n) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`);
  const belowThousand = (n) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? `${ones[hundred]} Hundred${rest ? ' ' : ''}` : ''}${rest ? belowHundred(rest) : ''}`;
  };

  let n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return parts.join(' ');
};

const numberToWords = (amount) => {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const rupees = Math.floor(safeAmount);
  const paise = Math.round((safeAmount - rupees) * 100);
  return `${numberToWordsInteger(rupees)}${paise ? ` And Paise ${numberToWordsInteger(paise)}` : ''}`;
};

const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'pricing',      label: 'Pricing Engine' },
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
        {tab === 'pricing' && <PricingEngineTab />}
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

// ---------------- Dynamic Pricing Engine Tab ----------------

export const PricingEngineTab = () => {
  const [properties, setProperties] = useState([]);
  const [rules, setRules] = useState({
    calculation_mode: 'highest',
    weekend: { is_enabled: false, saturday_pct: 0, sunday_pct: 0 },
    festival: { is_enabled: false, festivals: [] },
    seasonal: { is_enabled: false, summer_pct: 0, winter_pct: 0, monsoon_pct: 0 },
    occupancy: { is_enabled: false, bracket_0_30: 0, bracket_31_60: 0, bracket_61_80: 0, bracket_81_100: 0 },
    promotional: { is_enabled: false, campaign_name: '', pct_change: 0 }
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [applying, setApplying] = useState(false);
  
  const [selectedProps, setSelectedProps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState('rules'); // 'rules' or 'history'
  const [tableTab, setTableTab] = useState('all'); // 'all', 'running', 'stopped'
  
  // Property type filters for applying rules
  const [targetTypes, setTargetTypes] = useState([]);

  // Modal states
  const [overrideProperty, setOverrideProperty] = useState(null);
  const [overridePrice, setOverridePrice] = useState('');
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [viewRulesProperty, setViewRulesProperty] = useState(null);

  // New Festival form inputs
  const [newFestName, setNewFestName] = useState('');
  const [newFestStart, setNewFestStart] = useState('');
  const [newFestEnd, setNewFestEnd] = useState('');
  const [newFestPct, setNewFestPct] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [propsRes, rulesRes, histRes] = await Promise.all([
        pricingAPI.getProperties(),
        pricingAPI.getRules(),
        pricingAPI.getHistory()
      ]);
      setProperties(propsRes.data || []);
      setRules(rulesRes.data || rules);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error("Failed to load pricing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await pricingAPI.saveRules(rules);
      await showNotice({ title: 'Rules Saved', description: 'Pricing rules saved successfully!', eyebrow: 'Completed' });
      await loadData();
    } catch (err) {
      await showNotice({ title: 'Save Failed', description: 'Failed to save pricing rules.', eyebrow: 'Action Failed' });
    } finally {
      setSavingRules(false);
    }
  };

  const handlePreview = async () => {
    if (selectedProps.length === 0) {
      await showNotice({ title: 'Selection Required', description: 'Please select at least one property first.', eyebrow: 'Validation Error' });
      return;
    }
    try {
      setLoading(true);
      await pricingAPI.saveRules(rules);
      const res = await pricingAPI.previewPricing(selectedProps, rules, targetTypes.length > 0 ? targetTypes : null);
      
      const previewMap = {};
      res.data.forEach(item => {
        previewMap[item.property_id] = item.new_price;
      });
      
      setProperties(prev => prev.map(p => ({
        ...p,
        new_price: previewMap[p.property_id] !== undefined ? previewMap[p.property_id] : p.new_price
      })));
      await showNotice({ title: 'Preview Ready', description: 'Price previews generated in the table below!', eyebrow: 'Completed' });
    } catch (err) {
      await showNotice({ title: 'Preview Failed', description: 'Failed to generate price preview.', eyebrow: 'Action Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (selectedProps.length === 0) {
      await showNotice({ title: 'Selection Required', description: 'Please select at least one property first.', eyebrow: 'Validation Error' });
      return;
    }
    setApplying(true);
    try {
      await pricingAPI.saveRules(rules);
      const res = await pricingAPI.applyPricing(selectedProps, rules, targetTypes.length > 0 ? targetTypes : null);
      await showNotice({ title: 'Pricing Applied', description: res.data.message || 'Pricing rules applied and activated successfully!', eyebrow: 'Completed' });
      setSelectedProps([]);
      setTargetTypes([]);
      await loadData();
    } catch (err) {
      await showNotice({ title: 'Apply Failed', description: 'Failed to apply pricing.', eyebrow: 'Action Failed' });
    } finally {
      setApplying(false);
    }
  };

  const handleToggleStatus = async (propertyId, status) => {
    try {
      setLoading(true);
      const res = await pricingAPI.toggleRulesStatus(propertyId, status);
      await showNotice({ title: 'Status Updated', description: res.data.message || `Rules status updated to ${status}`, eyebrow: 'Completed' });
      await loadData();
    } catch (err) {
      await showNotice({ title: 'Update Failed', description: 'Failed to update status.', eyebrow: 'Action Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchToggleStatus = async (status) => {
    try {
      setLoading(true);
      const res = await pricingAPI.toggleRulesStatusBatch(selectedProps, status);
      await showNotice({ title: 'Batch Update Complete', description: res.data.message || `Successfully batch updated status to ${status}`, eyebrow: 'Completed' });
      setSelectedProps([]);
      await loadData();
    } catch (err) {
      await showNotice({ title: 'Batch Update Failed', description: 'Failed to batch update status.', eyebrow: 'Action Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async () => {
    if (!overrideProperty || !overridePrice) return;
    try {
      setLoading(true);
      await pricingAPI.manualOverride(overrideProperty.property_id, Number(overridePrice));
      await showNotice({ title: 'Override Applied', description: 'Manual override applied successfully (Pricing Rules Stopped)!', eyebrow: 'Completed' });
      setOverrideProperty(null);
      setOverridePrice('');
      await loadData();
    } catch (err) {
      await showNotice({ title: 'Override Failed', description: 'Failed to apply manual override.', eyebrow: 'Action Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFestival = () => {
    if (!newFestName || !newFestStart || !newFestEnd || !newFestPct) {
      showNotice({ title: 'Validation Error', description: 'Please fill in all festival fields.', eyebrow: 'Validation Error' });
      return;
    }
    const newFest = {
      name: newFestName,
      start_date: newFestStart,
      end_date: newFestEnd,
      increase_pct: Number(newFestPct)
    };
    setRules(prev => ({
      ...prev,
      festival: {
        ...prev.festival,
        festivals: [...prev.festival.festivals, newFest]
      }
    }));
    setNewFestName('');
    setNewFestStart('');
    setNewFestEnd('');
    setNewFestPct('');
  };

  const handleRemoveFestival = (idx) => {
    setRules(prev => ({
      ...prev,
      festival: {
        ...prev.festival,
        festivals: prev.festival.festivals.filter((_, i) => i !== idx)
      }
    }));
  };

  const toggleSelectProperty = (id) => {
    setSelectedProps(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProps(filteredProperties.map(p => p.property_id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleTargetTypeChange = (type) => {
    setTargetTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeRulesProperties = properties.filter(p => p.rules_status === 'active');
  const stoppedRulesProperties = properties.filter(p => p.rules_status === 'stopped' || !p.rules_status);

  // Switch display array based on selected tableTab filter
  const displayProperties = filteredProperties.filter(p => {
    if (tableTab === 'running') return p.rules_status === 'active';
    if (tableTab === 'stopped') return p.rules_status === 'stopped' || !p.rules_status;
    return true;
  });

  const totalProperties = properties.length;
  const activeRulesCount = activeRulesProperties.length;
  const stoppedRulesCount = stoppedRulesProperties.length;
  const pendingUpdatesCount = properties.filter(p => p.new_price !== undefined && p.new_price !== p.price_per_night).length;

  const COMMON_PROPERTY_TYPES = [
    { value: 'villa', label: 'Villa' },
    { value: 'banquet_hall', label: 'Banquet Hall' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'farmhouse', label: 'Farmhouse' },
    { value: 'co_working', label: 'Co-working' }
  ];

  const isRulesPanelEnabled = selectedProps.length > 0;

  return (
    <div className="space-y-6" data-testid="pricing-engine-tab">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Live Properties', value: totalProperties, color: 'text-charcoal' },
          { label: 'Active Rules Properties', value: activeRulesCount, color: 'text-green-600' },
          { label: 'Stopped Rules Properties', value: stoppedRulesCount, color: 'text-[#2563eb]' },
          { label: 'Pending Updates', value: pendingUpdatesCount, color: 'text-red-500' }
        ].map(card => (
          <div key={card.label} className="dashboard-card border border-gray-100 shadow-sm bg-white p-5 rounded-2xl">
            <p className="text-xs uppercase tracking-wider text-charcoal-muted font-bold">{card.label}</p>
            <p className={`text-3xl font-bold tracking-tight mt-2 ${card.color}`}>{loading ? '...' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Subtab Navigation */}
      <div className="flex border-b border-sand-100">
        <button
          onClick={() => setSubTab('rules')}
          className={`px-4 py-2.5 font-bold text-sm tracking-wide transition-all border-b-2 ${
            subTab === 'rules' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Rules Configuration
        </button>
        <button
          onClick={() => setSubTab('history')}
          className={`px-4 py-2.5 font-bold text-sm tracking-wide transition-all border-b-2 ${
            subTab === 'history' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Price Change History
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-charcoal-light">Syncing pricing details...</div>
      ) : subTab === 'history' ? (
        /* History logs */
        <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-charcoal mb-4">Price Change History Log</h3>
          {history.length === 0 ? (
            <p className="text-charcoal-light text-center py-10">No price changes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                    <th className="py-3 px-4 rounded-l-xl">Date & Time</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Old Price</th>
                    <th className="py-3 px-4">New Price</th>
                    <th className="py-3 px-4">Updated By</th>
                    <th className="py-3 px-4 rounded-r-xl">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {history.map(item => (
                    <tr key={item.history_id} className="hover:bg-stone/40 transition text-charcoal">
                      <td className="py-3 px-4 whitespace-nowrap">{new Date(item.created_at).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-bold">{item.property_title}</td>
                      <td className="py-3 px-4 font-mono">₹{item.old_price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-mono text-[#2563eb] font-bold">₹{item.new_price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">{item.updated_by}</td>
                      <td className="py-3 px-4 font-semibold text-charcoal-light">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Pricing engine controls and property table */
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
          
          {/* Rules settings side panel */}
          <div className="relative">
            {!isRulesPanelEnabled && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 rounded-2xl border border-gray-100/50">
                <SlidersHorizontal className="w-10 h-10 text-charcoal-muted mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-charcoal">Pricing Rules Locked</h4>
                <p className="text-xs text-charcoal-muted mt-1 max-w-[240px]">
                  Please select one or more properties in the table to unlock pricing rule options.
                </p>
              </div>
            )}
            
            <div className={`dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-6 space-y-6 ${!isRulesPanelEnabled ? 'opacity-40 select-none pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#2563eb]" />
                  <span>Configure Rules</span>
                </h3>
                <button
                  onClick={handleSaveRules}
                  className="btn-premium px-3 py-1.5 text-[10px]"
                >
                  Save Rules
                </button>
              </div>

              {/* Target Property Types filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-widest block">Apply For (Property Types)</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_PROPERTY_TYPES.map(type => (
                    <label key={type.value} className="flex items-center space-x-2 text-xs font-bold text-charcoal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetTypes.includes(type.value)}
                        onChange={() => handleTargetTypeChange(type.value)}
                        className="w-3.5 h-3.5 rounded text-[#2563eb] focus:ring-[#93c5fd] border-gray-300"
                      />
                      <span>{type.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-charcoal-muted mt-1">If none selected, rules apply to all checked properties.</p>
              </div>

              {/* Rules Toggles & Settings */}
              <div className="space-y-4 pt-2">
                
                {/* Weekend Pricing */}
                <div className="p-4 bg-stone/40 border border-sand-100/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wide">Weekend Adjustments</span>
                    <input
                      type="checkbox"
                      checked={rules.weekend.is_enabled}
                      onChange={e => setRules(prev => ({
                        ...prev,
                        weekend: { ...prev.weekend, is_enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                    />
                  </div>
                  {rules.weekend.is_enabled && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Saturday Increase %</span>
                        <input
                          type="number"
                          value={rules.weekend.saturday_pct === 0 ? "" : rules.weekend.saturday_pct}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            weekend: { ...prev.weekend, saturday_pct: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Sunday Increase %</span>
                        <input
                          type="number"
                          value={rules.weekend.sunday_pct === 0 ? "" : rules.weekend.sunday_pct}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            weekend: { ...prev.weekend, sunday_pct: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Seasonal Pricing */}
                <div className="p-4 bg-stone/40 border border-sand-100/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wide">Seasonal Pricing</span>
                    <input
                      type="checkbox"
                      checked={rules.seasonal.is_enabled}
                      onChange={e => setRules(prev => ({
                        ...prev,
                        seasonal: { ...prev.seasonal, is_enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                    />
                  </div>
                  {rules.seasonal.is_enabled && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Summer %</span>
                        <input
                          type="number"
                          value={rules.seasonal.summer_pct === 0 ? "" : rules.seasonal.summer_pct}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            seasonal: { ...prev.seasonal, summer_pct: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Winter %</span>
                        <input
                          type="number"
                          value={rules.seasonal.winter_pct === 0 ? "" : rules.seasonal.winter_pct}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            seasonal: { ...prev.seasonal, winter_pct: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Monsoon %</span>
                        <input
                          type="number"
                          value={rules.seasonal.monsoon_pct === 0 ? "" : rules.seasonal.monsoon_pct}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            seasonal: { ...prev.seasonal, monsoon_pct: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Occupancy Pricing */}
                <div className="p-4 bg-stone/40 border border-sand-100/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wide">Occupancy Pricing</span>
                    <input
                      type="checkbox"
                      checked={rules.occupancy.is_enabled}
                      onChange={e => setRules(prev => ({
                        ...prev,
                        occupancy: { ...prev.occupancy, is_enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                    />
                  </div>
                  {rules.occupancy.is_enabled && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">0–30% occupancy</span>
                        <input
                          type="number"
                          value={rules.occupancy.bracket_0_30 === 0 ? "" : rules.occupancy.bracket_0_30}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            occupancy: { ...prev.occupancy, bracket_0_30: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">31–60% occupancy</span>
                        <input
                          type="number"
                          value={rules.occupancy.bracket_31_60 === 0 ? "" : rules.occupancy.bracket_31_60}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            occupancy: { ...prev.occupancy, bracket_31_60: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">61–80% occupancy</span>
                        <input
                          type="number"
                          value={rules.occupancy.bracket_61_80 === 0 ? "" : rules.occupancy.bracket_61_80}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            occupancy: { ...prev.occupancy, bracket_61_80: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">81–100% occupancy</span>
                        <input
                          type="number"
                          value={rules.occupancy.bracket_81_100 === 0 ? "" : rules.occupancy.bracket_81_100}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            occupancy: { ...prev.occupancy, bracket_81_100: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Promotional Campaign */}
                <div className="p-4 bg-stone/40 border border-sand-100/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wide">Promo Campaign</span>
                    <input
                      type="checkbox"
                      checked={rules.promotional.is_enabled}
                      onChange={e => setRules(prev => ({
                        ...prev,
                        promotional: { ...prev.promotional, is_enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                    />
                  </div>
                  {rules.promotional.is_enabled && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Campaign Name</span>
                        <input
                          type="text"
                          value={rules.promotional.campaign_name}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            promotional: { ...prev.promotional, campaign_name: e.target.value }
                          }))}
                          placeholder="e.g. Monsoon Sale"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Price change % (use - for discount)</span>
                        <input
                          type="number"
                          value={rules.promotional.pct_change === 0 ? "" : rules.promotional.pct_change}
                          onChange={e => setRules(prev => ({
                            ...prev,
                            promotional: { ...prev.promotional, pct_change: e.target.value === "" ? 0 : Number(e.target.value) }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Festival Pricing */}
                <div className="p-4 bg-stone/40 border border-sand-100/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wide">Festival Adjustments</span>
                    <input
                      type="checkbox"
                      checked={rules.festival.is_enabled}
                      onChange={e => setRules(prev => ({
                        ...prev,
                        festival: { ...prev.festival, is_enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                    />
                  </div>
                  {rules.festival.is_enabled && (
                    <div className="space-y-3 pt-2">
                      <div className="p-3 bg-white border border-sand-200 rounded-xl space-y-2">
                        <span className="text-[9px] font-bold text-charcoal uppercase block">Create Festival Range</span>
                        <input
                          type="text"
                          placeholder="Festival Name"
                          value={newFestName}
                          onChange={e => setNewFestName(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={newFestStart}
                            onChange={e => setNewFestStart(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]"
                          />
                          <input
                            type="date"
                            value={newFestEnd}
                            onChange={e => setNewFestEnd(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Increase %"
                            value={newFestPct}
                            onChange={e => setNewFestPct(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]"
                          />
                          <button
                            onClick={handleAddFestival}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {rules.festival.festivals.map((fest, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-gray-150 rounded-xl p-2.5 text-[11px]">
                            <div>
                              <span className="font-bold text-charcoal block">{fest.name}</span>
                              <span className="text-charcoal-muted">{fest.start_date} to {fest.end_date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#2563eb] font-bold">+{fest.increase_pct}%</span>
                              <button
                                onClick={() => handleRemoveFestival(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Right side property table and action triggers */}
          <div className="space-y-6">
            
            {/* Global Actions */}
            <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-5 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-charcoal font-serif">Global Pricing Actions</h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  Preview pricing updates or apply rules immediately.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedProps.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBatchToggleStatus('stopped')}
                      className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition"
                    >
                      Stop Selected
                    </button>
                    <button
                      onClick={() => handleBatchToggleStatus('active')}
                      className="px-4 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 font-bold text-xs transition"
                    >
                      Continue Selected
                    </button>
                  </>
                )}
                <button
                  disabled={selectedProps.length === 0}
                  onClick={handlePreview}
                  className="px-5 py-2.5 rounded-xl border border-[#bfdbfe] hover:bg-[#eff6ff] text-[#2563eb] font-bold text-sm transition disabled:opacity-40"
                >
                  Preview Changes
                </button>
                <button
                  disabled={selectedProps.length === 0 || applying}
                  onClick={handleApply}
                  className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm transition disabled:opacity-40"
                >
                  {applying ? "Applying..." : "Apply Rules"}
                </button>
              </div>
            </div>

            {/* View Switcher Tabs right above Table */}
            <div className="flex border-b border-sand-100 bg-white p-1 rounded-t-2xl border-t border-x border-gray-100">
              {[
                { id: 'all', label: `All Properties (${totalProperties})` },
                { id: 'running', label: `Running Rules (${activeRulesCount})` },
                { id: 'stopped', label: `Stopped Properties (${stoppedRulesCount})` }
              ].map(tabOpt => (
                <button
                  key={tabOpt.id}
                  onClick={() => setTableTab(tabOpt.id)}
                  className={`px-5 py-3 font-bold text-xs tracking-wider uppercase rounded-xl transition ${
                    tableTab === tabOpt.id
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'text-charcoal-muted hover:text-charcoal hover:bg-stone/50'
                  }`}
                >
                  {tabOpt.label}
                </button>
              ))}
            </div>

            {/* Properties Table Card */}
            <div className="dashboard-card border border-gray-100 shadow-sm rounded-b-2xl rounded-tr-none bg-white p-6 overflow-hidden mt-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="text-base font-bold text-charcoal">
                  {tableTab === 'all' && 'All Enterprise Properties'}
                  {tableTab === 'running' && 'Properties Currently Running Dynamic Rules'}
                  {tableTab === 'stopped' && 'Stopped Properties (Running Original Rates)'}
                </h3>
                <div className="relative max-w-xs w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search property or city..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                      <th className="py-3 px-4 rounded-l-xl w-10 text-center">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={displayProperties.length > 0 && selectedProps.length === displayProperties.length}
                          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                        />
                      </th>
                      <th className="py-3 px-4">Property Name</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Original Base Price</th>
                      <th className="py-3 px-4 text-right">Calculated/Dyn. Rate</th>
                      <th className="py-3 px-4 text-center">Rules Status</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4 text-center">Status Action</th>
                      <th className="py-3 px-4 text-center rounded-r-xl">Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100">
                    {displayProperties.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-charcoal-light">No properties found in this view.</td>
                      </tr>
                    ) : (
                      displayProperties.map(p => {
                        const hasChange = p.new_price !== undefined && p.new_price !== p.price_per_night;
                        const isRulesActive = p.rules_status === 'active';
                        return (
                          <tr key={p.property_id} className="hover:bg-stone/40 transition text-charcoal">
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedProps.includes(p.property_id)}
                                onChange={() => toggleSelectProperty(p.property_id)}
                                className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#93c5fd]"
                              />
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <div className="flex items-center gap-2">
                                <span>{p.title}</span>
                                {p.pricing_rules && (
                                  <button
                                    onClick={() => setViewRulesProperty(p)}
                                    className="p-1 hover:bg-stone rounded-lg text-[#2563eb] transition"
                                    title="View Configured Rules"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold">{p.city}</td>
                            <td className="py-3 px-4 text-right font-mono">₹{p.base_price?.toLocaleString('en-IN') || p.price_per_night.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#2563eb]">
                              ₹{p.price_per_night.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isRulesActive ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-[#eef4ff] text-[#2563eb]'
                              }`}>
                                {isRulesActive ? 'running' : 'stopped'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-charcoal-muted">
                              {p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isRulesActive ? (
                                <button
                                  onClick={() => handleToggleStatus(p.property_id, 'stopped')}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg transition"
                                >
                                  Stop Rules
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(p.property_id, 'active')}
                                  className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-600 font-bold text-xs rounded-lg transition"
                                >
                                  Continue
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => {
                                  setOverrideProperty(p);
                                  setOverridePrice(p.base_price || p.price_per_night);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-[#bfdbfe] hover:bg-[#eff6ff] text-[#2563eb] text-xs font-bold transition"
                              >
                                Override
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Manual Override Modal */}
      {overrideProperty && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-premium animate-slide-up">
            <h3 className="text-xl font-bold tracking-tight text-charcoal mb-2">Manual Price Override</h3>
            <p className="text-xs text-charcoal-muted mb-4">
              Manually set the Base Price for <span className="font-bold text-charcoal">{overrideProperty.title}</span>. This property's pricing mode will be locked to <span className="font-semibold text-[#2563eb]">manual</span> and active rules will be stopped.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">New Base Price (₹)</label>
                <input
                  type="number"
                  value={overridePrice}
                  onChange={e => setOverridePrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe] font-semibold text-charcoal text-sm"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setOverrideProperty(null)}
                  className="flex-1 py-3 font-bold text-charcoal-muted text-sm hover:underline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualOverride}
                  className="flex-1 btn-premium py-3 text-sm"
                >
                  Save Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Rules Modal */}
      {viewRulesProperty && (() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const weekday = today.getDay(); // 0 Sunday, 6 Saturday
        const month = today.getMonth() + 1; // 1-12
        const basePrice = viewRulesProperty.base_price || viewRulesProperty.price_per_night || 0;
        const livePrice = viewRulesProperty.price_per_night || 0;
        const rules = viewRulesProperty.pricing_rules || {};

        // Weekend Active status
        let weekendActive = false;
        let weekendLabel = "Inactive Today";
        let weekendPct = 0;
        if (rules.weekend?.is_enabled) {
          if (weekday === 6) {
            weekendActive = true;
            weekendPct = rules.weekend.saturday_pct || 0;
            weekendLabel = `Active Today (Saturday: +${weekendPct}%)`;
          } else if (weekday === 0) {
            weekendActive = true;
            weekendPct = rules.weekend.sunday_pct || 0;
            weekendLabel = `Active Today (Sunday: +${weekendPct}%)`;
          } else {
            weekendLabel = `Scheduled/Active on Weekends (Saturdays: +${rules.weekend.saturday_pct}%, Sundays: +${rules.weekend.sunday_pct}%)`;
          }
        }

        // Seasonal Active status
        let seasonalActive = false;
        let seasonalLabel = "Inactive Today";
        let seasonalPct = 0;
        if (rules.seasonal?.is_enabled) {
          let seasonName = "Monsoon";
          seasonalPct = rules.seasonal.monsoon_pct || 0;
          if ([3,4,5].includes(month)) {
            seasonName = "Summer";
            seasonalPct = rules.seasonal.summer_pct || 0;
          } else if ([10,11,12,1,2].includes(month)) {
            seasonName = "Winter";
            seasonalPct = rules.seasonal.winter_pct || 0;
          }
          
          if (seasonalPct !== 0) {
            seasonalActive = true;
            seasonalLabel = `Active Today (${seasonName}: +${seasonalPct}%)`;
          } else {
            seasonalLabel = `Inactive Today (${seasonName} season has +0% increase configured)`;
          }
        }

        // Promotional Active status
        let promoActive = false;
        let promoLabel = "Inactive Today";
        let promoPct = 0;
        if (rules.promotional?.is_enabled) {
          promoActive = true;
          promoPct = rules.promotional.pct_change || 0;
          promoLabel = `Active Today (${rules.promotional.campaign_name || 'Promo'}: ${promoPct}%)`;
        }

        return (
          <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-premium animate-slide-up space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-charcoal flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#2563eb]" />
                <span>Configured Rules: {viewRulesProperty.title}</span>
              </h3>

              {/* Price Summary Row */}
              <div className="grid grid-cols-2 gap-4 bg-stone/50 p-4 rounded-2xl border border-sand-100">
                <div>
                  <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Original Base Price</span>
                  <span className="text-lg font-bold font-mono text-charcoal">₹{basePrice.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-charcoal-muted uppercase block">Current Calculated Rate</span>
                  <span className="text-lg font-bold font-mono text-[#2563eb]">₹{livePrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 divide-y divide-gray-100">
                
                {/* Weekend */}
                <div className="pt-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Weekend Adjustments</h4>
                    {rules.weekend?.is_enabled ? (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        weekendActive ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {weekendActive ? 'Active Today' : 'Scheduled'}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Disabled</span>
                    )}
                  </div>
                  {rules.weekend?.is_enabled && (
                    <div className="text-xs text-charcoal-light mt-1 space-y-1">
                      <p className="font-semibold text-charcoal-muted">{weekendLabel}</p>
                      {weekendActive && (
                        <p className="text-[11px] text-green-600 font-bold">
                          Increase: +₹{((basePrice * weekendPct) / 100).toLocaleString('en-IN')} ({weekendPct}%)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Seasonal */}
                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Seasonal Pricing</h4>
                    {rules.seasonal?.is_enabled ? (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        seasonalActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {seasonalActive ? 'Active Today' : 'Inactive Today'}
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Disabled</span>
                    )}
                  </div>
                  {rules.seasonal?.is_enabled && (
                    <div className="text-xs text-charcoal-light mt-1 space-y-1">
                      <p className="font-semibold text-charcoal-muted">{seasonalLabel}</p>
                      {seasonalActive && (
                        <p className="text-[11px] text-green-600 font-bold">
                          Increase: +₹{((basePrice * seasonalPct) / 100).toLocaleString('en-IN')} ({seasonalPct}%)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Occupancy */}
                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Occupancy Brackets</h4>
                    {rules.occupancy?.is_enabled ? (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Active</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Disabled</span>
                    )}
                  </div>
                  {rules.occupancy?.is_enabled && (
                    <div className="text-xs text-charcoal-light mt-1 space-y-1.5">
                      <p className="font-semibold text-charcoal-muted">Active (Adjusts dynamically as occupancy changes):</p>
                      <ul className="text-[11px] space-y-0.5 list-disc pl-4 text-charcoal-muted">
                        <li>0–30% occupancy: +{rules.occupancy.bracket_0_30}%</li>
                        <li>31–60% occupancy: +{rules.occupancy.bracket_31_60}%</li>
                        <li>61–80% occupancy: +{rules.occupancy.bracket_61_80}%</li>
                        <li>81–100% occupancy: +{rules.occupancy.bracket_81_100}%</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Promo */}
                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Promotional Campaign</h4>
                    {rules.promotional?.is_enabled ? (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Active Today</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Disabled</span>
                    )}
                  </div>
                  {rules.promotional?.is_enabled && (
                    <div className="text-xs text-charcoal-light mt-1 space-y-1">
                      <p className="font-semibold text-charcoal-muted">{promoLabel}</p>
                      <p className="text-[11px] text-green-600 font-bold">
                        Adjustment: {promoPct > 0 ? '+' : ''}₹{((basePrice * promoPct) / 100).toLocaleString('en-IN')} ({promoPct}%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Festival */}
                <div className="pt-3 pb-2">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-2">Festival Adjustments</h4>
                  {rules.festival?.is_enabled && rules.festival.festivals?.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {rules.festival.festivals.map((fest, idx) => {
                        let festStatus = 'Expired';
                        let badgeColor = 'bg-gray-100 text-gray-500';
                        try {
                          const start = new Date(fest.start_date);
                          start.setHours(0,0,0,0);
                          const end = new Date(fest.end_date);
                          end.setHours(23,59,59,999);
                          
                          if (today >= start && today <= end) {
                            festStatus = 'Active Today';
                            badgeColor = 'bg-green-100 text-green-800 border-green-200';
                          } else if (today < start) {
                            festStatus = 'Scheduled (Future)';
                            badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                          }
                        } catch (e) {}

                        return (
                          <div key={idx} className="flex justify-between items-center bg-stone/40 border border-sand-100 p-2.5 rounded-xl text-xs">
                            <div>
                              <span className="font-bold text-charcoal block">{fest.name}</span>
                              <span className="text-[10px] text-charcoal-muted">{fest.start_date} to {fest.end_date}</span>
                            </div>
                            <div className="text-right space-y-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase block text-center ${badgeColor}`}>
                                {festStatus}
                              </span>
                              <span className="font-mono text-[#2563eb] font-bold text-[11px] block">
                                +₹{((basePrice * (fest.increase_pct || 0)) / 100).toLocaleString('en-IN')} (+{fest.increase_pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-charcoal-muted">Disabled / No festivals added</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setViewRulesProperty(null)}
                  className="px-6 py-2.5 bg-charcoal text-white font-bold text-xs rounded-xl shadow-premium hover:bg-black transition uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

// ---------------- Transactions ----------------

const TransactionsTab = ({ hideFilters = false, limit = 10 }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    customer_name: '',
    employee_name: '',
    mobile_no: '',
    booking_id: '',
    payment_id: '',
    broker_name: '',
    property_type: '',
    type: '',
    status: '',
    start: '',
    end: '',
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = limit;

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
      const [res, paymentConfigRes] = await Promise.all([
        accountAPI.listTransactions({
          ...params,
          limit: LIMIT,
          skip: (page - 1) * LIMIT,
        }),
        bookingAPI.getPaymentConfig().catch(() => null),
      ]);
      setItems(res.data.transactions || []);
      setTotal(res.data.total || 0);
      if (paymentConfigRes?.data) setPaymentConfig(paymentConfigRes.data);
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

  const updateFilter = (key, value) => handleFilterChange({ ...filters, [key]: value });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const resetFilters = () => handleFilterChange({
    q: '',
    customer_name: '',
    employee_name: '',
    mobile_no: '',
    booking_id: '',
    payment_id: '',
    broker_name: '',
    property_type: '',
    type: '',
    status: '',
    start: '',
    end: '',
  });

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
  const cleanDisplayValue = (value) => {
    const text = String(value || '').trim();
    return text && !['NA', 'N/A', 'NULL', 'NONE', '-'].includes(text.toUpperCase()) ? text : '';
  };
  const formatPropertyName = (txn) => (
    txn.property?.title ||
    txn.property?.property_name ||
    txn.property?.name ||
    txn.booking?.property?.title ||
    txn.booking?.property?.property_name ||
    txn.booking?.property?.name ||
    txn.property_name ||
    txn.property?.property_id ||
    txn.property_id ||
    txn.booking?.property_id ||
    txn.subscription?.property_id ||
    'NA'
  );
  const formatStayDates = (txn) => {
    const checkIn = txn.booking?.check_in_date;
    const checkOut = txn.booking?.check_out_date;
    if (!checkIn && !checkOut) return 'NA';
    return `${formatPlanDate(checkIn)} to ${formatPlanDate(checkOut)}`;
  };
  const getStayUnits = (txn) => {
    const explicitUnits = Number(
      txn.booking_invoice_breakdown?.pricing_units ??
      txn.invoice_breakdown?.pricing_units ??
      txn.booking?.pricing_units ??
      txn.booking?.nights ??
      txn.booking?.num_nights ??
      0
    );
    if (explicitUnits > 0) return explicitUnits;
    const checkIn = txn.booking?.check_in_date;
    const checkOut = txn.booking?.check_out_date;
    const start = checkIn ? new Date(checkIn) : null;
    const end = checkOut ? new Date(checkOut) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  };
  const configuredChargeAmount = (chargeKey, baseAmount, units) => {
    const chargeConfig = paymentConfig?.charges?.[chargeKey];
    if (!chargeConfig || chargeConfig.enabled === false) return 0;
    const value = Number(chargeConfig.value || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (chargeConfig.charge_type === 'percentage') {
      return Number(((Number(baseAmount || 0) / Math.max(1, units || 1)) * value / 100 * Math.max(1, units || 1)).toFixed(2));
    }
    return Number((value * Math.max(1, units || 1)).toFixed(2));
  };
  const firstPositive = (...values) => {
    for (const value of values) {
      const n = Number(value || 0);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  };
  const getBookingBreakdown = (txn) => {
    const breakdown = txn.booking_invoice_breakdown || txn.invoice_breakdown || {};
    const total = Number(breakdown.total_amount ?? ((txn.amount || 0) / 100));
    const sourceCharges = {
      ...(txn.booking?.extra_charges || {}),
      ...(breakdown.extra_charges || {}),
    };
    const chargeAmount = (...keys) => keys.reduce((sum, key) => (
      sum + Number(sourceCharges[key] ?? breakdown[key] ?? txn.booking?.[key] ?? 0)
    ), 0);
    const platformFee = chargeAmount('platform_fee', 'platform_charge', 'service_fee');
    const gatewayFee = chargeAmount('payment_gateway_charge', 'gateway_charge', 'payment_gateway_fee', 'gateway_fee');
    const convenienceFee = chargeAmount('convenience_fee', 'convenience_charge');
    const insuranceFee = chargeAmount('insurance_fee', 'insurance_charge');
    const explicitCleaningFee = chargeAmount('cleaning_fee');
    const extraGuestFee = chargeAmount('extra_guest_fee', 'host_extra_guest_fee', 'extra_person_fee', 'extra_person_charge');
    const rawExtraTotal = Number(breakdown.extra_charges_total ?? breakdown.total_extra_charges ?? txn.booking?.extra_charges_total ?? txn.booking?.total_extra_charges ?? 0);
    const knownWithoutCleaning = platformFee + gatewayFee + convenienceFee + insuranceFee + extraGuestFee;
    const cleaningFee = explicitCleaningFee > 0 ? explicitCleaningFee : Math.max(0, rawExtraTotal - knownWithoutCleaning);
    const baseAmount = Number(breakdown.base_amount ?? breakdown.gross ?? txn.booking?.base_amount ?? txn.booking?.host_amount ?? 0);
    const units = getStayUnits(txn);
    const extraCharges = {
      platform_fee: firstPositive(platformFee, configuredChargeAmount('platform_fee', baseAmount, units)),
      payment_gateway_charge: firstPositive(gatewayFee, configuredChargeAmount('payment_gateway_charge', baseAmount, units)),
      convenience_fee: firstPositive(convenienceFee, configuredChargeAmount('convenience_fee', baseAmount, units)),
      insurance_fee: firstPositive(insuranceFee, configuredChargeAmount('insurance_fee', baseAmount, units)),
      cleaning_fee: firstPositive(cleaningFee, configuredChargeAmount('cleaning_fee', baseAmount, units)),
      extra_guest_fee: firstPositive(extraGuestFee, configuredChargeAmount('extra_guest_fee', baseAmount, units)),
    };
    const extraTotal = rawExtraTotal || Object.values(extraCharges).reduce((sum, value) => sum + Number(value || 0), 0);
    const gstAmount = Number(breakdown.gst_amount ?? (Number(breakdown.igst || 0) + Number(breakdown.cgst || 0) + Number(breakdown.sgst || 0)));
    return {
      baseAmount,
      extraTotal,
      extraCharges,
      igst: Number(breakdown.igst || 0),
      cgst: Number(breakdown.cgst || 0),
      sgst: Number(breakdown.sgst || 0),
      gstAmount,
      total,
      taxableAmount: Number(breakdown.taxable_amount ?? Math.max(0, total - gstAmount)),
    };
  };
  const formatOptionalMoney = (value) => Number(value || 0) > 0 ? formatMoney(value) : 'NA';
  const getInvoiceBreakdown = (txn) => {
    if (txn.booking_invoice_breakdown) {
      const bookingBreakdown = getBookingBreakdown(txn);
      return {
        planFee: bookingBreakdown.baseAmount,
        gross: bookingBreakdown.baseAmount,
        platformFee: Number(txn.booking_invoice_breakdown.platform_fee || txn.booking_invoice_breakdown.extra_charges?.platform_fee || 0),
        couponCode: txn.booking_invoice_breakdown.coupon_code || txn.booking?.coupon_code || '',
        discount: Number(txn.booking_invoice_breakdown.discount_amount || 0),
        taxableAmount: bookingBreakdown.taxableAmount,
        igst: bookingBreakdown.igst,
        cgst: bookingBreakdown.cgst,
        sgst: bookingBreakdown.sgst,
        total: bookingBreakdown.total,
      };
    }
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
      {!hideFilters && <div className="border border-gray-100 shadow-sm rounded-lg bg-white overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-white border border-gray-100 text-terracotta inline-flex items-center justify-center shadow-sm">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-charcoal">Search & Filter Transactions</h3>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied` : 'Use any field below to narrow account transactions'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetFilters}
              disabled={!activeFilterCount}
              className="px-4 py-2 rounded-lg border border-gray-200 text-charcoal text-xs font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              data-testid="clear-filters-btn"
            >
              Clear
            </button>
            <button
              onClick={downloadCsv}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center space-x-2 text-xs shadow-sm"
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4" />
              <span>Export Filtered Excel</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-charcoal-muted" />
            </span>
            <input
              type="text"
              placeholder="Quick search across name, phone, email, booking, payment and UTR ID"
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              className="input-field pl-10 w-full bg-white border border-gray-200 focus:border-terracotta focus:ring-2 focus:ring-amber-100 rounded-lg transition text-sm py-3"
              data-testid="filter-q"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ['customer_name', 'Customer name'],
              ['employee_name', 'Employee name'],
              ['mobile_no', 'Mobile no'],
              ['booking_id', 'Booking ID'],
              ['payment_id', 'Payment ID'],
              ['broker_name', 'Broker name'],
              ['property_type', 'Property type'],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-[11px] uppercase font-bold text-charcoal-muted">{label}</span>
                <input
                  type="text"
                  value={filters[key]}
                  onChange={(e) => updateFilter(key, e.target.value)}
                  placeholder={`Search ${label}`}
                  className="input-field mt-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 text-xs focus:border-terracotta focus:ring-2 focus:ring-amber-100"
                  data-testid={`filter-${key.replaceAll('_', '-')}`}
                />
              </label>
            ))}

            <label className="block">
              <span className="text-[11px] uppercase font-bold text-charcoal-muted">Transaction type</span>
              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="input-field mt-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 text-xs focus:border-terracotta focus:ring-2 focus:ring-amber-100"
                data-testid="filter-type"
              >
                <option value="">All transaction types</option>
                <option value="booking_payment">Booking payments</option>
                <option value="registration_fee">Registration fees</option>
                <option value="subscription">Subscriptions</option>
                <option value="refund">Refunds</option>
                <option value="payout">Payouts</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] uppercase font-bold text-charcoal-muted">Status</span>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="input-field mt-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 text-xs focus:border-terracotta focus:ring-2 focus:ring-amber-100"
                data-testid="filter-status"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)] gap-3">
            <label className="block">
              <span className="text-[11px] uppercase font-bold text-charcoal-muted flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> From date
              </span>
            <input
              type="date"
              value={filters.start}
              onChange={(e) => updateFilter('start', e.target.value)}
              className="input-field mt-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 text-xs focus:border-terracotta focus:ring-2 focus:ring-amber-100"
              data-testid="filter-start"
            />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase font-bold text-charcoal-muted flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> To date
              </span>
            <input
              type="date"
              value={filters.end}
              onChange={(e) => updateFilter('end', e.target.value)}
              className="input-field mt-1 w-full bg-white border border-gray-200 rounded-lg py-2.5 text-xs focus:border-terracotta focus:ring-2 focus:ring-amber-100"
              data-testid="filter-end"
            />
            </label>
          </div>
        </div>
      </div>}

      <div className="dashboard-card border border-gray-100 shadow-sm rounded-2xl bg-white p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-charcoal" data-testid="transactions-count">
            {loading ? 'Syncing transactions...' : hideFilters ? `Recent ${items.length} Transactions` : `${total} Transactions Found`}
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
              {filters.type === 'booking_payment' ? (
              <table className="w-full min-w-[2800px] text-xs text-left border-collapse" data-testid="booking-transactions-table">
                <thead>
                  <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                    {[
                      'Booking ID',
                      'Invoice No',
                      'Booking Date',
                      'Customer Name',
                      'Customer GSTIN',
                      'Property Name',
                      'Stay Dates',
                      'Host Name',
                      'Broker/RM Name',
                      'Branch Manager',
                      'Base Amount',
                      'Platform Fee',
                      'Payment Gateway Charge',
                      'Convenience Fee',
                      'Insurance Fee',
                      'Cleaning Fee',
                      'Extra Guest Fee',
                      'IGST',
                      'CGST',
                      'SGST',
                      'Total Invoice Value',
                      'Booking Status',
                      'Payment Method',
                      'Payment Confirmation',
                      'Payment Status',
                      'Invoice Details',
                    ].map((header, idx, arr) => (
                      <th key={header} className={`py-3 px-4 ${idx === 0 ? 'rounded-l-xl' : ''} ${idx === arr.length - 1 ? 'rounded-r-xl text-center no-print' : ''}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {items.map((t) => {
                    const breakdown = getBookingBreakdown(t);
                    const paymentMethod = t.booking?.payment_method || (t.is_mock ? 'Razorpay Test/Mock' : 'Razorpay');
                    const confirmation = t.razorpay_payment_id || t.upi_transaction_id || t.booking?.razorpay_payment_id || t.booking?.upi_transaction_id || 'Pending';
                    const brokerName = cleanDisplayValue(t.broker?.full_name) || cleanDisplayValue(t.broker_name);
                    const rmName = cleanDisplayValue(t.employee?.full_name) || cleanDisplayValue(t.employee_name);
                    const brokerRmPrimary = brokerName || rmName || 'NA';
                    return (
                      <tr key={t.transaction_id} className="hover:bg-stone/40 transition text-charcoal" data-testid={`booking-txn-${t.transaction_id}`}>
                        <td className="py-4 px-4 whitespace-nowrap font-mono font-bold">{t.booking_id || t.booking?.booking_id || 'NA'}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-bold">{displayInvoiceNoForTransaction(t)}</td>
                        <td className="py-4 px-4 whitespace-nowrap">{formatInvoiceDate(t.booking?.created_at || t.created_at)}</td>
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="font-bold text-charcoal text-sm">{t.user?.full_name || 'NA'}</div>
                          <div className="text-xs text-charcoal-muted mt-0.5">{t.user?.phone || t.user?.email || 'NA'}</div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-charcoal-muted">{t.user?.gst_number || t.user?.gst_no || 'NA'}</td>
                        <td className="py-4 px-4 min-w-[190px] font-bold">{formatPropertyName(t)}</td>
                        <td className="py-4 px-4 whitespace-nowrap">{formatStayDates(t)}</td>
                        <td className="py-4 px-4 min-w-[150px]">
                          <div className="font-bold text-charcoal text-sm">{t.host?.full_name || 'NA'}</div>
                          <div className="text-xs text-charcoal-muted mt-0.5">{t.host?.phone || t.host?.email || 'NA'}</div>
                        </td>
                        <td className="py-4 px-4 min-w-[180px]">
                          <div className="font-bold text-charcoal text-sm">{brokerRmPrimary}</div>
                          {rmName && rmName !== brokerRmPrimary && (
                            <div className="text-xs text-charcoal-muted mt-0.5">RM: {rmName}</div>
                          )}
                        </td>
                        <td className="py-4 px-4 min-w-[150px] font-bold">{t.branch_manager?.full_name || 'NA'}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatMoney(breakdown.baseAmount)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.platform_fee)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.payment_gateway_charge)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.convenience_fee)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.insurance_fee)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.cleaning_fee)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatOptionalMoney(breakdown.extraCharges.extra_guest_fee)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{breakdown.igst ? formatMoney(breakdown.igst) : 'NA'}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatMoney(breakdown.cgst)}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono">{formatMoney(breakdown.sgst)}</td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm font-bold">{formatMoney(breakdown.total)}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700">{t.booking?.booking_status || 'NA'}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">{paymentMethod}</td>
                        <td className="py-4 px-4 whitespace-nowrap font-mono text-[11px]">{confirmation}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            (t.booking?.payment_status || t.status) === 'paid' || t.status === 'success' ? 'bg-green-100 text-green-700' :
                            (t.booking?.payment_status || t.status) === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{t.booking?.payment_status || t.status}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-center no-print">
                          <button
                            onClick={() => setSelectedInvoiceTxn(t)}
                            className="px-3 py-2 rounded-lg border border-amber-200 hover:border-amber-400 text-amber-700 hover:bg-amber-50 inline-flex items-center space-x-1.5 transition text-xs font-bold shadow-sm"
                            title="View & Print Invoice"
                          >
                            <FileText className="w-4 h-4 text-terracotta" />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              ) : (
              <table className="w-full text-xs text-left border-collapse" data-testid="transactions-table">
                <thead>
                  <tr className="border-b border-gray-100 text-charcoal-muted uppercase text-xs font-bold tracking-wider bg-stone/50">
                    <th className="py-3 px-4 rounded-l-xl">Invoice Date</th>
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Broker</th>
                    <th className="py-3 px-4">Employee (RM)</th>
                    <th className="py-3 px-4">Branch Manager</th>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {items.map((t) => {
                    const breakdown = getInvoiceBreakdown(t);
                    return (
                    <tr
                      key={t.transaction_id}
                      className="hover:bg-stone/40 transition text-charcoal"
                      data-testid={`txn-${t.transaction_id}`}
                    >
                      <td className="py-4 px-4 whitespace-nowrap text-xs">{formatInvoiceDate(t.created_at)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-bold">{displayInvoiceNoForTransaction(t)}</td>
                      <td className="py-4 px-4 min-w-[150px]">
                        <div className="font-bold text-charcoal text-sm">{t.broker?.full_name || t.broker_name || 'NA'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">LG Code: {t.broker?.lg_code || t.broker?.employee_code || t.broker?.uid || t.broker?.user_id || t.broker_lg_code || 'NA'}</div>
                      </td>
                      <td className="py-4 px-4 min-w-[150px]">
                        <div className="font-bold text-charcoal text-sm">{t.employee?.full_name || t.employee_name || 'NA'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{t.employee?.employee_code || t.employee_code || 'NA'}</div>
                      </td>
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="font-bold text-charcoal text-sm">{t.branch_manager?.full_name || 'NA'}</div>
                        <div className="text-xs text-charcoal-muted mt-0.5">{t.branch_manager?.employee_code || t.branch_manager?.uid || t.branch_manager?.user_id || 'NA'}</div>
                      </td>
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
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          t.status === 'success' ? 'bg-green-100 text-green-700' :
                          t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700">
                          {t.type.replaceAll('_', ' ')}
                        </span>
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
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>

            {/* Pagination Controls */}
            {!hideFilters && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-sand-100 no-print" data-testid="transactions-pagination">
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
            </div>}
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
      await showNotice({ title: 'Payout Failed', description: e?.response?.data?.detail || 'Failed to process payout', eyebrow: 'Action Failed' });
    } finally {
      setBusy(false);
    }
  };

  const sweep = async () => {
    setBusy(true);
    try {
      const r = await accountAPI.runAutoPayout();
      await showNotice({ title: 'Auto Payout Complete', description: `Marked eligible: ${r.data.marked_eligible}. Processed: ${r.data.processed}. Failed: ${r.data.failed}.`, eyebrow: 'Completed' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const processAll = async () => {
    if (!(await requestConfirm({ title: 'Process Eligible Payouts', description: 'Process all eligible payouts in this cycle?', confirmLabel: 'Process All' }))) return;
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
  const bookingInvoiceFrameRef = useRef(null);
  const user = t.user || {};
  const property = t.property || {};
  const bookingProperty = t.booking?.property || {};
  const propertyName = property.title || property.property_name || property.name || bookingProperty.title || bookingProperty.property_name || bookingProperty.name || t.property_name || property.property_id || t.booking?.property_id || 'NA';
  const propertyAddress = [property.address, property.city, property.state, property.pin_code].filter(Boolean).join(', ') || [bookingProperty.address, bookingProperty.city, bookingProperty.state, bookingProperty.pin_code].filter(Boolean).join(', ') || 'NA';
  const invoiceBreakdown = t.booking_invoice_breakdown || t.invoice_breakdown || {};
  const amountINR = Number(invoiceBreakdown.total_amount ?? ((t.amount || 0) / 100));
  const formatInvoiceMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const taxPercent = Number(invoiceBreakdown.tax_percent ?? t.booking?.tax_percent ?? t.booking?.gst_percent ?? t.plan?.tax_percent ?? 18);
  const splitTaxPercent = taxPercent / 2;
  const taxPercentLabel = `${taxPercent.toFixed(taxPercent % 1 === 0 ? 0 : 2)}%`;
  const splitTaxPercentLabel = `${splitTaxPercent.toFixed(splitTaxPercent % 1 === 0 ? 0 : 2)}%`;
  const baseAmount = Number(invoiceBreakdown.taxable_amount ?? (amountINR / (1 + taxPercent / 100)));
  const planFee = Number(invoiceBreakdown.plan_fee ?? Math.max(0, baseAmount - Number(t.plan?.platform_fee || 0)));
  const platformFee = Number(invoiceBreakdown.platform_fee ?? t.plan?.platform_fee ?? 0);
  const couponCode = invoiceBreakdown.coupon_code || t.subscription?.coupon_code || '';
  const discountAmount = Number(invoiceBreakdown.discount_amount ?? t.subscription?.discount_amount ?? 0);
  const discountBase = Math.max(0, planFee + platformFee);
  const discountPercent = discountAmount > 0 && discountBase > 0 ? (discountAmount / discountBase) * 100 : 0;
  const cgst = Number(invoiceBreakdown.cgst ?? ((amountINR - baseAmount) / 2));
  const sgst = Number(invoiceBreakdown.sgst ?? ((amountINR - baseAmount) / 2));
  const totalGst = cgst + sgst;
  const escapeInvoiceHtml = (value) =>
    String(value ?? 'NA')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const plainMoney = (value) => Number(value || 0).toFixed(2);
  const serviceDescription = t.type === 'subscription'
    ? `Property Subscription Charges [${t.subscription?.start_date ? formatDateForInvoice(t.subscription.start_date) : 'NA'} to ${t.subscription?.end_date ? formatDateForInvoice(t.subscription.end_date) : 'NA'}]`
    : t.type === 'booking_payment'
      ? `Booking Accommodation Charges [booking_id: ${t.booking_id || 'NA'}]`
      : t.type === 'registration_fee'
        ? 'Host Registration Fee'
        : t.type === 'refund'
          ? `Accommodation Refund [booking_id: ${t.booking_id || 'NA'}]`
          : 'Platform Service Charges';
  const invoiceNo = displayInvoiceNoForTransaction(t);
  const buildAdminBookingInvoiceHtml = () => {
    const booking = t.booking || {};
    const bookingInvoice = {
      ...booking,
      booking_id: t.booking_id || booking.booking_id,
      invoice_no: invoiceNo,
      booking_invoice_no: invoiceNo,
      customer_invoice_no: invoiceNo,
      tax_invoice_no: invoiceNo,
      created_at: booking.created_at || t.created_at,
      total_amount: amountINR,
      paid_amount: amountINR,
      total_extra_charges: Math.max(0, amountINR - baseAmount + discountAmount),
      discount_amount: discountAmount,
      razorpay_payment_id: t.razorpay_payment_id || booking.razorpay_payment_id,
      upi_transaction_id: t.upi_transaction_id || booking.upi_transaction_id,
      payment_id: t.razorpay_payment_id || t.upi_transaction_id || t.transaction_id,
      customer_base_amount: baseAmount,
    };
    return buildCustomerBookingInvoiceHtml(bookingInvoice, property, user);
  };
  const printHtml = (html, title = 'Tax Invoice') => {
    const printWindow = window.open('', 'xspace-invoice-print', 'width=1100,height=900');
    if (!printWindow) {
      window.print();
      return false;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  };

  const handlePrint = () => {
    if (t.type === 'booking_payment') {
      const frameWindow = bookingInvoiceFrameRef.current?.contentWindow;
      if (frameWindow) {
        frameWindow.focus();
        frameWindow.print();
      } else {
        window.print();
      }
      return;
    }
    const printWindow = window.open('', 'xspace-invoice-print', 'width=1100,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const invoiceHtml = `
      <div class="tax-invoice-title">Tax Invoice</div>
      <table class="invoice-shell">
        <tbody>
          <tr>
            <td class="company-cell">
              <table>
                <tbody>
                  <tr><td class="buyer-top-cell">
                    <span>Buyer (Bill to)</span><br />
                    <strong>${escapeInvoiceHtml(propertyName)}</strong><br />
                    Address: ${escapeInvoiceHtml(propertyAddress)}<br />
                    GSTIN/UIN: ${escapeInvoiceHtml(user.gst_number || user.gst_no || 'NA')}<br />
                    State Name: ${escapeInvoiceHtml(user.gst_number && user.gst_number.length >= 2 ? (user.gst_number.startsWith('27') ? 'Maharashtra, Code : 27' : 'Other State, Code : ' + user.gst_number.substring(0, 2)) : 'Maharashtra, Code : 27')}<br />
                    Contact Person: ${escapeInvoiceHtml(user.full_name || 'NA')}<br />
                    Mobile: ${escapeInvoiceHtml(user.phone || 'NA')}<br />
                    Email: ${escapeInvoiceHtml(user.email || 'NA')}
                  </td></tr>
                </tbody>
              </table>
            </td>
            <td class="details-cell">
              <table>
                <tbody>
                  <tr>
                    <td><span>Invoice No.</span><strong>${escapeInvoiceHtml(invoiceNo)}</strong></td>
                    <td><span>Dated</span><strong>${escapeInvoiceHtml(formatDateForInvoice(t.created_at))}</strong></td>
                  </tr>
                  <tr>
                    <td><span>Mode/Terms of Payment</span><strong>${t.upi_transaction_id ? 'UPI QR' : 'NET BANKING'}</strong></td>
                    <td><span>Reference No. &amp; Date</span><strong>${escapeInvoiceHtml(t.upi_transaction_id || t.razorpay_payment_id || t.transaction_id || 'NA')}</strong></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td class="buyer-cell">
              <table class="company-heading-table">
                <tbody>
                  <tr>
                    <td class="logo-cell"><img src="/logo.png" alt="X-Space360 Logo" /></td>
                    <td class="company-name-cell">
                      <strong>Golden Rich Financial &amp; Real Estate<br />Solutions Pvt. Ltd.</strong><br />
                      Office No-804, Royal Avaan Avenue,<br />
                      Opp. Bhosla School Gate, Jehan Circle,<br />
                      Gangapur Road, Nashik-422013<br />
                      <strong>GSTIN/UIN:</strong> 27AAKCG1285C1ZP<br />
                      <strong>State Name:</strong> Maharashtra, Code : 27<br />
                      <strong>Contact:</strong> 9225586001<br />
                      <strong>Email:</strong> finance.director@goldenrichproperties.com
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td class="buyer-blank-cell">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <table class="services-table">
        <thead>
          <tr>
            <th class="sr">Sr.No</th>
            <th class="desc">Description of Services</th>
            <th class="hsn">HSN/SAC</th>
            <th class="offer">Services Offer</th>
            <th class="gst">GST Rate</th>
            <th class="rate">Rate</th>
            <th class="per">per</th>
            <th class="disc">Disc. %</th>
            <th class="amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td class="desc-text"><strong>${escapeInvoiceHtml(serviceDescription)}</strong></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="right mono">${t.type === 'subscription' ? plainMoney(planFee) : plainMoney(baseAmount)}</td>
            <td></td>
            <td></td>
            <td class="right mono">${t.type === 'subscription' ? plainMoney(planFee) : plainMoney(baseAmount)}</td>
          </tr>
          ${t.type === 'subscription' ? `
            <tr>
              <td></td>
              <td class="sub-desc">Platform Fee</td>
              <td></td><td></td><td></td>
              <td class="right mono">${plainMoney(platformFee)}</td>
              <td></td><td></td>
              <td class="right mono">${plainMoney(platformFee)}</td>
            </tr>
            ${discountAmount > 0 ? `
              <tr>
                <td></td>
                <td class="sub-desc">Coupon Discount${couponCode ? ` (${escapeInvoiceHtml(couponCode)})` : ''}</td>
                <td></td><td></td><td></td>
                <td class="right mono">-${plainMoney(discountAmount)}</td>
                <td></td>
                <td class="right mono">${discountPercent ? `${discountPercent.toFixed(2)}%` : ''}</td>
                <td class="right mono">-${plainMoney(discountAmount)}</td>
              </tr>
            ` : ''}
            <tr>
              <td></td>
              <td class="sub-desc">Taxable Amount</td>
              <td class="center mono">998399</td>
              <td class="center"><strong>01</strong></td>
              <td class="center">${taxPercentLabel}</td>
              <td class="right mono">${plainMoney(baseAmount)}</td>
              <td class="center">Nos</td>
              <td></td>
              <td class="right mono">${plainMoney(baseAmount)}</td>
            </tr>
          ` : ''}
          <tr>
            <td></td>
            <td class="sub-desc">CGST @ ${splitTaxPercentLabel}</td>
            <td></td><td></td>
            <td class="center">${splitTaxPercentLabel}</td>
            <td class="right mono">${plainMoney(cgst)}</td>
            <td></td><td></td>
            <td class="right mono">${plainMoney(cgst)}</td>
          </tr>
          <tr>
            <td></td>
            <td class="sub-desc">SGST @ ${splitTaxPercentLabel}</td>
            <td></td><td></td>
            <td class="center">${splitTaxPercentLabel}</td>
            <td class="right mono">${plainMoney(sgst)}</td>
            <td></td><td></td>
            <td class="right mono">${plainMoney(sgst)}</td>
          </tr>
          <tr class="total-row">
            <td></td>
            <td><strong>Total</strong></td>
            <td></td>
            <td class="center"><strong>01 Nos</strong></td>
            <td></td><td></td><td></td><td></td>
            <td class="right"><strong>${formatInvoiceMoney(amountINR)}</strong></td>
          </tr>
        </tbody>
      </table>

      <table class="words-table">
        <tbody>
          <tr><td><span>Amount Chargeable (in words)</span><br /><strong>Indian Rupees ${escapeInvoiceHtml(numberToWords(amountINR))} Only</strong></td></tr>
        </tbody>
      </table>

      <table class="gst-table">
        <thead>
          <tr>
            <th>HSN/SAC</th>
            <th>Taxable Value</th>
            <th>Central Tax Rate</th>
            <th>Central Tax Amount</th>
            <th>State Tax Rate</th>
            <th>State Tax Amount</th>
            <th>Total Tax Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mono">998399</td>
            <td class="center mono">${plainMoney(baseAmount)}</td>
            <td class="center"><strong>${splitTaxPercentLabel}</strong></td>
            <td class="center mono"><strong>${plainMoney(cgst)}</strong></td>
            <td class="center"><strong>${splitTaxPercentLabel}</strong></td>
            <td class="center mono"><strong>${plainMoney(sgst)}</strong></td>
            <td class="center mono"><strong>${plainMoney(totalGst)}</strong></td>
          </tr>
          <tr>
            <td><strong>Total</strong></td>
            <td class="center mono"><strong>${plainMoney(baseAmount)}</strong></td>
            <td></td>
            <td class="center mono"><strong>${plainMoney(cgst)}</strong></td>
            <td></td>
            <td class="center mono"><strong>${plainMoney(sgst)}</strong></td>
            <td class="center mono"><strong>${plainMoney(totalGst)}</strong></td>
          </tr>
        </tbody>
      </table>

      <table class="words-table">
        <tbody>
          <tr><td><span>Tax Amount (in words)</span><br /><strong>Indian Rupees ${escapeInvoiceHtml(numberToWords(totalGst))} Only</strong></td></tr>
        </tbody>
      </table>

      <table class="signature-table">
        <tbody>
          <tr>
            <td colspan="2" class="jurisdiction-note">Subject to Nashik Juridiction</td>
          </tr>
          <tr>
            <td class="bank-cell">
              <strong><u>Company's Bank Details:</u></strong><br />
              <strong>A/c Holder's Name:</strong> Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.<br />
              <strong>Bank Name:</strong> IDFC FIRST BANK<br />
              <strong>A/c No.:</strong> 10250563892<br />
              <strong>Branch &amp; IFSC Code:</strong> Gangapur Road, Nashik &amp; IDFB0042283<br />
              <em>Declaration: We declare that this invoice shows the actual price of the Service described and that all particulars are true and correct.</em>
            </td>
            <td class="sign-cell">
              <strong>For Golden Rich Properties</strong><br />
              <br /><br /><br /><br />
              <strong>Authorized Signatory</strong>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${invoiceNo || 'Tax Invoice'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 210mm;
              min-height: 297mm;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              display: block;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .invoice-print-page {
              width: 190mm;
              margin: 0 auto;
              padding: 0;
              background: #ffffff;
              overflow: visible;
            }

            .print-invoice {
              width: 190mm;
              margin: 0 auto;
              border: 1.5px solid #000 !important;
              background: #fff !important;
              color: #000 !important;
              box-shadow: none !important;
              font-size: 10.5px !important;
              line-height: 1.28 !important;
              overflow: visible !important;
              transform: none !important;
              zoom: 1 !important;
            }

            table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
              border-spacing: 0 !important;
              table-layout: fixed !important;
              border-top: 0.75px solid #444 !important;
              border-right: 0.75px solid #444 !important;
              border-bottom: 0.75px solid #444 !important;
              border-left: 0.75px solid #444 !important;
              transform: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            thead,
            tbody,
            tr,
            td,
            th {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            tr {
              page-break-after: auto !important;
            }

            td,
            th {
              border-top: 0.75px solid #444 !important;
              border-right: 0.75px solid #444 !important;
              border-bottom: 0.75px solid #444 !important;
              border-left: 0.75px solid #444 !important;
              border-color: #444 !important;
              color: #000 !important;
              overflow-wrap: anywhere;
              box-sizing: border-box !important;
              padding: 5px;
              vertical-align: top;
            }

            img {
              max-width: 100% !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            span {
              color: #555;
              display: inline-block;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
            }

            strong { font-weight: 700; }
            .tax-invoice-title {
              width: 100%;
              padding: 6px 8px;
              border-bottom: 1.5px solid #000 !important;
              text-align: center;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 0;
              text-transform: uppercase;
            }
            .invoice-shell { border-bottom: 0 !important; }
            .company-cell { width: 50%; padding: 0; }
            .details-cell { width: 50%; padding: 0; }
            .logo-cell { width: 30%; padding: 6px; border-right: 0 !important; }
            .logo-cell img { width: 124px; height: 34px; object-fit: contain; object-position: left center; display: block; }
            .company-name-cell { width: 70%; padding: 6px; border-left: 0 !important; font-size: 8.4px; line-height: 1.18; }
            .company-name-cell strong { font-size: 12px; line-height: 1.12; }
            .details-cell td { width: 50%; height: 26px; font-size: 9px; line-height: 1.18; }
            .buyer-cell { width: 50%; padding: 0; }
            .buyer-top-cell { min-height: 84px; padding: 7px 8px; font-size: 9px; line-height: 1.25; }
            .buyer-blank-cell { width: 50%; height: 86px; }
            .services-table th { background: #f9f9f9; font-size: 8.5px; padding: 5px 4px; text-align: center; vertical-align: middle; }
            .services-table td { font-size: 8.5px; padding: 4px 4px; }
            .sr { width: 5%; }
            .desc { width: 42%; text-align: left !important; }
            .hsn { width: 10%; }
            .offer { width: 10%; }
            .gst { width: 9%; }
            .rate { width: 10%; }
            .per { width: 7%; }
            .disc { width: 7%; }
            .amt { width: 10%; }
            .center { text-align: center; vertical-align: middle; }
            .right { text-align: right; }
            .mono { font-family: Consolas, 'Courier New', monospace; }
            .desc-text { text-align: left; line-height: 1.18; }
            .sub-desc { padding-left: 18px !important; text-align: left; font-weight: 700; color: #555; }
            .total-row td { background: #f9f9f9; font-weight: 700; }
            .words-table td { padding: 6px 8px; font-size: 8.7px; line-height: 1.25; }
            .gst-table th { background: #f9f9f9; font-size: 8.5px; padding: 5px 4px; text-align: center; vertical-align: middle; }
            .gst-table td { font-size: 8.5px; padding: 5px 4px; }
            .signature-table td { height: 78px; font-size: 8.7px; line-height: 1.28; }
            .jurisdiction-note { height: auto !important; padding: 5px 8px !important; font-size: 9px !important; font-weight: 800; text-align: center; }
            .bank-cell { width: 58%; padding: 8px; }
            .bank-cell em { display: block; margin-top: 7px; color: #555; font-size: 8px; }
            .sign-cell { width: 42%; padding: 8px; text-align: right; }

            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm !important;
                min-height: 297mm !important;
                overflow: visible !important;
              }

              .invoice-print-page,
              .print-invoice {
                width: 190mm !important;
                overflow: visible !important;
                transform: none !important;
                zoom: 1 !important;
              }

              table {
                border-collapse: collapse !important;
                border-spacing: 0 !important;
              }

              table,
              th,
              td {
                border-top: 0.75px solid #444 !important;
                border-right: 0.75px solid #444 !important;
                border-bottom: 0.75px solid #444 !important;
                border-left: 0.75px solid #444 !important;
                border-color: #444 !important;
                box-sizing: border-box !important;
              }

              .print-invoice {
                border: 1.5px solid #000 !important;
              }
            }
          </style>
        </head>
        <body>
          <main class="invoice-print-page">
            <section class="print-invoice">
              ${invoiceHtml}
            </section>
          </main>
          <script>
            const printInvoice = () => {
              window.focus();
              window.print();
            };
            const images = Array.from(document.images);
            if (!images.length) {
              setTimeout(printInvoice, 150);
            } else {
              let pending = images.length;
              const done = () => {
                pending -= 1;
                if (pending <= 0) setTimeout(printInvoice, 150);
              };
              images.forEach((img) => {
                if (img.complete) done();
                else {
                  img.addEventListener('load', done, { once: true });
                  img.addEventListener('error', done, { once: true });
                }
              });
              setTimeout(printInvoice, 1200);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadInvoice = () => {
    const frameDoc = bookingInvoiceFrameRef.current?.contentDocument;
    const html = t.type === 'booking_payment' && frameDoc
      ? `<!doctype html>\n${frameDoc.documentElement.outerHTML}`
      : `<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNo || 'Tax Invoice'}</title></head><body>${document.getElementById('printable-invoice')?.outerHTML || ''}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${String(invoiceNo || 'tax-invoice').replace(/[^a-z0-9_-]+/gi, '_')}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (t.type === 'booking_payment') {
    const bookingObj = t.booking || {};
    const bookingBaseAmount = Number(invoiceBreakdown.base_amount ?? invoiceBreakdown.gross ?? invoiceBreakdown.plan_fee ?? baseAmount);
    const bookingTaxableAmount = Number(invoiceBreakdown.taxable_amount ?? Math.max(0, amountINR - Number(invoiceBreakdown.gst_amount || 0)));
    const derivedExtraTotal = Math.max(0, bookingTaxableAmount - bookingBaseAmount + discountAmount);
    const bookingExtraTotal = Math.max(Number(invoiceBreakdown.extra_charges_total || 0), derivedExtraTotal);
    const bookingExtraCharges = {
      ...(bookingObj.extra_charges || {}),
      ...(invoiceBreakdown.extra_charges || {}),
      platform_fee: invoiceBreakdown.platform_fee ?? bookingObj.platform_fee ?? bookingObj.extra_charges?.platform_fee,
      payment_gateway_charge: invoiceBreakdown.payment_gateway_charge ?? invoiceBreakdown.gateway_charge ?? bookingObj.payment_gateway_charge ?? bookingObj.gateway_charge ?? bookingObj.extra_charges?.payment_gateway_charge ?? bookingObj.extra_charges?.gateway_charge,
      convenience_fee: invoiceBreakdown.convenience_fee ?? bookingObj.convenience_fee ?? bookingObj.extra_charges?.convenience_fee,
      insurance_fee: invoiceBreakdown.insurance_fee ?? bookingObj.insurance_fee ?? bookingObj.extra_charges?.insurance_fee,
      cleaning_fee: invoiceBreakdown.cleaning_fee ?? bookingObj.cleaning_fee ?? bookingObj.extra_charges?.cleaning_fee,
      extra_guest_fee: invoiceBreakdown.extra_guest_fee ?? invoiceBreakdown.host_extra_guest_fee ?? bookingObj.extra_guest_fee ?? bookingObj.host_extra_guest_fee ?? bookingObj.extra_charges?.extra_guest_fee,
    };
    const effectiveProperty = {
      ...(bookingObj.property || {}),
      ...(property || {}),
      property_id: property.property_id || bookingObj.property?.property_id || bookingObj.property_id || t.property_id,
      host: t.host || bookingObj.property?.host || property.host,
    };
    const effectiveUser = bookingObj.user || bookingObj.guest || user || {};

    const invoiceHtml = buildCustomerBookingInvoiceHtml({
      ...bookingObj,
      booking_id: t.booking_id || bookingObj.booking_id,
      invoice_no: invoiceNo,
      booking_invoice_no: invoiceNo,
      customer_invoice_no: invoiceNo,
      tax_invoice_no: invoiceNo,
      created_at: bookingObj.created_at || t.created_at,
      total_amount: amountINR,
      paid_amount: amountINR,
      total_extra_charges: bookingExtraTotal,
      extra_charges_total: bookingExtraTotal,
      extra_charges: bookingExtraCharges,
      discount_amount: discountAmount,
      gst_amount: invoiceBreakdown.gst_amount,
      cgst: invoiceBreakdown.cgst,
      sgst: invoiceBreakdown.sgst,
      igst: invoiceBreakdown.igst,
      razorpay_payment_id: t.razorpay_payment_id || bookingObj.razorpay_payment_id,
      upi_transaction_id: t.upi_transaction_id || bookingObj.upi_transaction_id,
      payment_id: t.razorpay_payment_id || t.upi_transaction_id || t.transaction_id,
      customer_base_amount: bookingBaseAmount,
      property: effectiveProperty,
      user: effectiveUser,
    }, effectiveProperty, effectiveUser, { hideToolbar: true, showExtraChargeBreakdown: true });
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white" data-testid="invoice-modal">
        <div className="bg-white rounded-xl w-full max-w-6xl border border-gray-100 shadow-elevated p-5 relative">
          <div className="no-print flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-charcoal">Tax Invoice Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print / Download PDF
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 text-charcoal rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
          <iframe
            ref={bookingInvoiceFrameRef}
            title={invoiceNo || 'Booking invoice'}
            srcDoc={invoiceHtml}
            className="w-full h-[78vh] rounded-lg border border-gray-200 bg-white"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white" data-testid="invoice-modal">
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
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="bg-white rounded-xl w-full max-w-5xl border border-gray-100 shadow-elevated p-5 relative">
        <div className="no-print flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-charcoal">Tax Invoice Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Download PDF
            </button>
            <button
              onClick={handleDownloadInvoice}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-charcoal rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Printable Invoice element */}
          <div id="printable-invoice" className="bg-white text-black font-sans border-2 border-black w-full min-w-[900px] mx-auto text-xs relative" style={{ boxSizing: 'border-box', padding: '2px' }}>
            <div
              style={{
                padding: '6px 8px',
                borderBottom: '2px solid black',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              Tax Invoice
            </div>
            
            {/* Header: Company details and Invoice details */}
            <table className="w-full border-collapse border-b-2 border-black" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td className="w-1/2 p-3 align-top border-r-2 border-black" style={{ width: '50%', padding: '8px', borderRight: '2px solid black', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '9px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Buyer (Bill to)</div>
                    <div className="font-bold text-xs mb-1" style={{ fontSize: '11px', fontWeight: 'bold' }}>{propertyName}</div>
                    <div style={{ fontSize: '9px', lineHeight: '1.3' }}>
                      Address: {propertyAddress}<br />
                      GSTIN/UIN: {user.gst_number || user.gst_no || 'NA'}<br />
                      State Name: {user.gst_number && user.gst_number.length >= 2 ? (user.gst_number.startsWith('27') ? 'Maharashtra, Code : 27' : 'Other State, Code : ' + user.gst_number.substring(0, 2)) : 'Maharashtra, Code : 27'}<br />
                      Contact Person: {user.full_name || 'NA'}<br />
                      Mobile: {user.phone || 'NA'}<br />
                      Email: {user.email || 'NA'}
                    </div>
                  </td>
                  <td className="w-1/2 p-0 align-top" style={{ width: '50%', padding: 0, verticalAlign: 'top' }}>
                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid black' }}>
                          <td className="w-1/2 p-2 border-r border-black" style={{ width: '50%', padding: '8px', borderRight: '1px solid black' }}>
                            <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Invoice No.</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{invoiceNo}</div>
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

            {/* Company section */}
            <table className="w-full border-collapse border-b-2 border-black" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td className="w-1/2 p-3 align-top border-r-2 border-black" style={{ width: '50%', padding: '8px', borderRight: '2px solid black', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <img src="/logo.png" alt="X-Space360 Logo" style={{ width: '130px', height: '36px', objectFit: 'contain', objectPosition: 'left center', display: 'block' }} />
                      <div>
                        <div className="font-bold text-sm mb-1" style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.12' }}>
                          Golden Rich Financial & Real Estate<br />Solutions Pvt. Ltd.
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: '1.22' }}>
                          Office No-804, Royal Avaan Avenue,<br />
                          Opp. Bhosla School Gate, Jehan Circle,<br />
                          Gangapur Road, Nashik-422013<br />
                          <strong>GSTIN/UIN:</strong> 27AAKCG1285C1ZP<br />
                          <strong>State Name:</strong> Maharashtra, Code : 27<br />
                          <strong>Contact:</strong> 9225586001<br />
                          <strong>Email:</strong> finance.director@goldenrichproperties.com
                        </div>
                      </div>
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
                  <td style={{ padding: '8px 4px', borderRight: '1px solid black', verticalAlign: 'top' }}>{t.type === 'subscription' ? '' : taxPercentLabel}</td>
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
                      <td style={{ padding: '4px', borderRight: '1px solid black' }}>{taxPercentLabel}</td>
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
                  <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>CGST @ {splitTaxPercentLabel}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}>{splitTaxPercentLabel}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                </tr>
                {/* SGST row */}
                <tr style={{ borderBottom: '1px solid black', color: '#555' }}>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px 6px', paddingLeft: '24px', borderRight: '1px solid black', textAlign: 'left', fontWeight: 'bold' }}>SGST @ {splitTaxPercentLabel}</td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '4px', borderRight: '1px solid black' }}>{splitTaxPercentLabel}</td>
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
            </div>

            {/* GST summary */}
            <table className="w-full border-collapse border-b-2 border-black text-center" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold', borderBottom: '1px solid black' }}>
                  <th rowSpan="2" style={{ padding: '7px 6px', borderRight: '1px solid black', width: '18%', textAlign: 'left' }}>HSN/SAC</th>
                  <th rowSpan="2" style={{ padding: '7px 6px', borderRight: '1px solid black', width: '18%' }}>Taxable Value</th>
                  <th colSpan="2" style={{ padding: '5px 6px', borderRight: '1px solid black' }}>Central Tax</th>
                  <th colSpan="2" style={{ padding: '5px 6px', borderRight: '1px solid black' }}>State Tax</th>
                  <th rowSpan="2" style={{ padding: '7px 6px', width: '12%' }}>Total Tax Amount</th>
                </tr>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold', borderBottom: '1px solid black' }}>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid black' }}>Rate</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid black' }}>Amount</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid black' }}>Rate</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid black' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid black', fontWeight: 'bold' }}>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', textAlign: 'left', fontFamily: 'monospace' }}>998399</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{baseAmount.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black' }}>{splitTaxPercentLabel}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black' }}>{splitTaxPercentLabel}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{sgst.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', fontFamily: 'monospace' }}>{totalGst.toFixed(2)}</td>
                </tr>
                <tr style={{ fontWeight: 'bold' }}>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', textAlign: 'left' }}>Total</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{baseAmount.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{cgst.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black' }}></td>
                  <td style={{ padding: '7px 6px', borderRight: '1px solid black', fontFamily: 'monospace' }}>{sgst.toFixed(2)}</td>
                  <td style={{ padding: '7px 6px', fontFamily: 'monospace' }}>{totalGst.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="py-2 px-3 border-b-2 border-black" style={{ padding: '8px 12px', borderBottom: '2px solid black' }}>
              <div style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Tax Amount (in words)</div>
              <div className="font-bold text-xs capitalize" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                Indian Rupees {numberToWords(totalGst)} Only
              </div>
            </div>

            {/* Bank details and signature */}
            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse', width: '100%', minHeight: '120px' }}>
              <tbody>
                <tr>
                  <td colSpan="2" style={{ padding: '6px 12px', borderBottom: '2px solid black', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                    Subject to Nashik Juridiction
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '58%', padding: '12px', borderRight: '2px solid black', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px' }}>Company's Bank Details:</div>
                    <div style={{ fontSize: '10px', lineHeight: '1.45' }}>
                      <strong>A/c Holder's Name:</strong> Golden Rich Financial & Real Estate Solutions Pvt. Ltd.<br />
                      <strong>Bank Name:</strong> IDFC FIRST BANK<br />
                      <strong>A/c No.:</strong> 10250563892<br />
                      <strong>Branch & IFSC Code:</strong> Gangapur Road, Nashik & IDFB0042283
                    </div>
                    <div style={{ fontSize: '8px', color: '#666', fontStyle: 'italic', lineHeight: '1.4', marginTop: '14px' }}>
                      Declaration: We declare that this invoice shows the actual price of the Service described and that all particulars are true and correct.
                    </div>
                  </td>
                  <td style={{ width: '42%', padding: '12px', textAlign: 'right', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>For Golden Rich Properties</div>
                    <div style={{ height: '70px' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Authorized Signatory</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export { TransactionsTab as AdminAccountTransactionsTab };
export default AdminAccount;
