import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, CheckCircle2, Clock, XCircle, Building, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { accountAPI } from '../services/api';

const fmtINR = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format((paise || 0) / 100);

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [pr, py] = await Promise.all([
          accountAPI.getHostPayoutPreference(),
          accountAPI.listMyPayouts(),
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const r = await accountAPI.updateHostPayoutPreference(pref);
      setMessage('Payout preference saved');
      setMasked(r.data.payout_preference?.bank_account_number_masked || null);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone" data-testid="host-payouts-page">
      {/* Header matching Host Central branding */}
      <header className="header-glass sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="w-full flex justify-between items-center gap-2">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <nav className="hidden md:flex items-center space-x-6">
               {[
                 { label: 'DASHBOARD', path: '/host/dashboard' },
                 { label: 'CALENDAR', path: '/host/calendar' },
                 { label: 'PAYOUTS', path: '/host/payouts' },
                 { label: 'BOOKINGS', path: '/host/bookings' }
               ].map((item) => (
                 <button
                   key={item.label}
                   onClick={() => navigate(item.path)}
                   className={`text-[10px] font-bold tracking-tight tracking-[0.2em] transition-colors ${
                     item.path === '/host/payouts' 
                       ? 'text-terracotta border-b border-terracotta pb-0.5' 
                       : 'text-charcoal-muted hover:text-terracotta'
                   }`}
                 >
                   {item.label}
                 </button>
               ))}
            </nav>
            <div className="h-6 w-px bg-sand-200 hidden md:block"></div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs font-bold text-charcoal-muted hidden sm:inline">
                Welcome, {user?.full_name?.split(' ')[0]}
              </span>
              <button 
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    logout();
                  }, 50);
                }} 
                className="text-xs font-bold tracking-tight text-terracotta hover:underline tracking-widest uppercase cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full px-2 md:px-8 lg:px-12 py-6 md:py-12 mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-charcoal tracking-tight" data-testid="page-title">
              Payouts Manager
            </h2>
            <p className="text-charcoal-muted text-sm font-medium mt-1">Configure payout destinations and track your earnings.</p>
          </div>
          <button
            onClick={() => navigate('/host/dashboard')}
            className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-sm text-charcoal hover:text-terracotta hover:border-terracotta flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            data-testid="back-to-host-dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-terracotta" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Preference Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm" data-testid="payout-preference-card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-terracotta/5 text-terracotta">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-charcoal uppercase tracking-wide">Payout destination</h2>
              <span className="text-xs text-charcoal-muted">Choose your preferred method to receive payouts</span>
            </div>
          </div>
          
          <p className="text-sm font-semibold text-charcoal-muted mb-6 bg-stone/50 p-4 rounded-2xl border border-sand-150">
            Pick how you'd like to receive payouts after guests check out. Platform fee is
            <span className="text-terracotta font-bold tracking-tight"> 10% </span> — you keep the remaining <span className="text-emerald-600 font-bold tracking-tight">90%</span> of each booking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <label
              className={`p-4 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                pref.preferred === 'upi'
                  ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/10 shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <input
                type="radio"
                checked={pref.preferred === 'upi'}
                onChange={() => setPref({ ...pref, preferred: 'upi' })}
                className="sr-only"
                data-testid="pref-upi"
              />
              <div className={`p-2.5 rounded-xl shrink-0 ${pref.preferred === 'upi' ? 'bg-terracotta text-white' : 'bg-gray-50 text-charcoal-muted'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold tracking-tight text-charcoal text-sm">UPI / VPA</div>
                <div className="text-xs text-charcoal-muted mt-0.5 font-medium">Receive instant transfers directly to your UPI ID.</div>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                pref.preferred === 'bank'
                  ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/10 shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <input
                type="radio"
                checked={pref.preferred === 'bank'}
                onChange={() => setPref({ ...pref, preferred: 'bank' })}
                className="sr-only"
                data-testid="pref-bank"
              />
              <div className={`p-2.5 rounded-xl shrink-0 ${pref.preferred === 'bank' ? 'bg-terracotta text-white' : 'bg-gray-50 text-charcoal-muted'}`}>
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold tracking-tight text-charcoal text-sm">Bank account (IMPS/NEFT)</div>
                <div className="text-xs text-charcoal-muted mt-0.5 font-medium">Direct transfer to checking or savings account.</div>
              </div>
            </label>
          </div>

          <div className="bg-stone/30 p-6 rounded-2xl border border-sand-150 mb-6">
            {pref.preferred === 'upi' ? (
              <div className="max-w-md">
                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">UPI VPA Address</label>
                <input
                  value={pref.upi_vpa}
                  onChange={(e) => setPref({ ...pref, upi_vpa: e.target.value })}
                  placeholder="name@bank"
                  className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all bg-white"
                  data-testid="upi-vpa-input"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-w-md">
                  <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Account Holder Name</label>
                  <input
                    value={pref.bank_account_holder}
                    onChange={(e) => setPref({ ...pref, bank_account_holder: e.target.value })}
                    placeholder="Enter account holder name"
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all bg-white"
                    data-testid="bank-holder-input"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">
                      Account Number {masked && <span className="text-terracotta font-bold">(current: {masked})</span>}
                    </label>
                    <input
                      value={pref.bank_account_number}
                      onChange={(e) => setPref({ ...pref, bank_account_number: e.target.value })}
                      placeholder="Enter bank account number"
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all bg-white"
                      data-testid="bank-number-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">IFSC Code</label>
                    <input
                      value={pref.bank_ifsc}
                      onChange={(e) => setPref({ ...pref, bank_ifsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-charcoal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 transition-all bg-white"
                      data-testid="bank-ifsc-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payout Cycle Section */}
          <div className="mt-8 mb-6 border-t border-sand-150 pt-6">
            <h3 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-wider mb-1">Payout Cycle</h3>
            <p className="text-xs text-charcoal-muted mb-4 font-medium">Choose how frequently you want payouts to be released after guest check-out.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'daily', label: 'Daily', desc: 'Released 1 day after guest check-out.' },
                { value: 'weekly', label: 'Weekly', desc: 'Released 7 days after guest check-out.' },
                { value: 'monthly', label: 'Monthly', desc: 'Released 30 days after guest check-out.' },
              ].map((cycle) => (
                <label
                  key={cycle.value}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer hover:shadow-subtle ${
                    pref.payout_cycle === cycle.value
                      ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/10 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                  data-testid={`cycle-${cycle.value}`}
                >
                  <input
                    type="radio"
                    name="payout_cycle"
                    checked={pref.payout_cycle === cycle.value}
                    onChange={() => setPref({ ...pref, payout_cycle: cycle.value })}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-bold tracking-tight text-charcoal text-sm">{cycle.label}</div>
                    <div className="text-xs text-charcoal-muted mt-1 font-medium leading-relaxed">{cycle.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 mb-4 flex items-center space-x-2 text-sm font-bold animate-fadeIn" data-testid="pref-success">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 mb-4 flex items-center space-x-2 text-sm font-bold animate-fadeIn" data-testid="pref-error">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3.5 bg-terracotta text-white font-bold tracking-tight text-xs uppercase tracking-widest rounded-2xl hover:bg-terracotta-dark transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              data-testid="save-preference-btn"
            >
              {saving ? 'Saving…' : 'Save preference'}
            </button>
          </div>
        </div>

        {/* Payouts list */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm" data-testid="my-payouts-card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-charcoal uppercase tracking-wide">Your payouts</h2>
              <span className="text-xs text-charcoal-muted">List of all payouts generated from bookings</span>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-charcoal-muted" data-testid="payouts-loading">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-terracotta border-gray-100 mb-4"></div>
              <span className="text-xs font-bold uppercase tracking-widest">Loading payouts data…</span>
            </div>
          )}
          
          {!loading && payouts.length === 0 && (
            <div className="text-center py-16 bg-stone/20 rounded-2xl border border-dashed border-gray-200 px-6" data-testid="payouts-empty">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-charcoal-muted" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-charcoal mb-1 uppercase tracking-wider">No Payouts Yet</h3>
              <p className="text-charcoal-muted text-xs font-semibold max-w-xs mx-auto">
                Payouts appear here automatically a day after a guest checks out of your property.
              </p>
            </div>
          )}

          {!loading && payouts.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-stone/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-tight uppercase tracking-wider text-charcoal-muted">
                    <th className="py-4 px-4">Eligible since</th>
                    <th className="py-4 px-4">Property</th>
                    <th className="py-4 px-4 text-right">Gross</th>
                    <th className="py-4 px-4 text-right">Platform fee</th>
                    <th className="py-4 px-4 text-right">Net to you</th>
                    <th className="py-4 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-150">
                  {payouts.map((p) => (
                    <tr
                      key={p.payout_id}
                      className="hover:bg-stone/30 transition-colors"
                      data-testid={`my-payout-${p.payout_id}`}
                    >
                      <td className="py-4 px-4 font-semibold text-charcoal text-xs">
                        {new Date(p.eligible_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-charcoal">{p.property?.title || p.property_id}</div>
                        <div className="text-[10px] font-bold tracking-tight uppercase tracking-wider text-terracotta mt-0.5">{p.property?.city}</div>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-charcoal-muted text-xs">
                        {fmtINR(p.gross_amount)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-charcoal-muted text-xs">
                        {fmtINR(p.platform_fee)}
                      </td>
                      <td className="py-4 px-4 text-right font-bold tracking-tight text-emerald-600 text-sm">
                        {fmtINR(p.net_amount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase tracking-wider border ${
                          p.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          p.status === 'eligible' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          p.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.status === 'needs_destination' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {p.status === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'eligible' && <Clock className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'failed' && <XCircle className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'needs_destination' && <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'processing' && <Clock className="w-3.5 h-3.5 mr-1" />}
                          <span>{p.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostPayouts;
