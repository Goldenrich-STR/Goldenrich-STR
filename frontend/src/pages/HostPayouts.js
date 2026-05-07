import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, CheckCircle, Clock, XCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-sand-50" data-testid="host-payouts-page">
      <header className="header-glass px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/host/dashboard')}
              className="text-terracotta hover:underline flex items-center space-x-1"
              data-testid="back-to-host-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-charcoal">Payouts · {user?.full_name}</h1>
          </div>
          <button onClick={logout} className="text-terracotta hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Preference card */}
        <div className="dashboard-card" data-testid="payout-preference-card">
          <div className="flex items-center space-x-2 mb-3">
            <Wallet className="w-5 h-5 text-terracotta" />
            <h2 className="text-lg font-bold text-charcoal">Payout destination</h2>
          </div>
          <p className="text-sm text-charcoal-light mb-4">
            Pick how you'd like to receive payouts after guests check out. Platform fee is
            10% — you keep the remaining 90% of each booking.
          </p>

          <div className="flex space-x-4 mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={pref.preferred === 'upi'}
                onChange={() => setPref({ ...pref, preferred: 'upi' })}
                data-testid="pref-upi"
              />
              <span className="text-sm font-semibold">UPI / VPA</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={pref.preferred === 'bank'}
                onChange={() => setPref({ ...pref, preferred: 'bank' })}
                data-testid="pref-bank"
              />
              <span className="text-sm font-semibold">Bank account (IMPS/NEFT)</span>
            </label>
          </div>

          {pref.preferred === 'upi' ? (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">UPI VPA</label>
              <input
                value={pref.upi_vpa}
                onChange={(e) => setPref({ ...pref, upi_vpa: e.target.value })}
                placeholder="name@bank"
                className="input-field"
                data-testid="upi-vpa-input"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Account holder</label>
                <input
                  value={pref.bank_account_holder}
                  onChange={(e) => setPref({ ...pref, bank_account_holder: e.target.value })}
                  className="input-field"
                  data-testid="bank-holder-input"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1">
                    Account number {masked && <span className="text-charcoal-muted">(current: {masked})</span>}
                  </label>
                  <input
                    value={pref.bank_account_number}
                    onChange={(e) => setPref({ ...pref, bank_account_number: e.target.value })}
                    className="input-field"
                    data-testid="bank-number-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-1">IFSC</label>
                  <input
                    value={pref.bank_ifsc}
                    onChange={(e) => setPref({ ...pref, bank_ifsc: e.target.value.toUpperCase() })}
                    className="input-field"
                    data-testid="bank-ifsc-input"
                  />
                </div>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-green-700 mt-3" data-testid="pref-success">{message}</p>}
          {error && <p className="text-sm text-red-600 mt-3" data-testid="pref-error">{error}</p>}

          <div className="mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark disabled:opacity-60"
              data-testid="save-preference-btn"
            >
              {saving ? 'Saving…' : 'Save preference'}
            </button>
          </div>
        </div>

        {/* Payouts list */}
        <div className="dashboard-card overflow-x-auto" data-testid="my-payouts-card">
          <h2 className="text-lg font-bold text-charcoal mb-4">Your payouts</h2>
          {loading && <p className="text-charcoal-light" data-testid="payouts-loading">Loading…</p>}
          {!loading && payouts.length === 0 && (
            <p className="text-charcoal-light py-6 text-center" data-testid="payouts-empty">
              No payouts yet. They appear here a day after a guest checks out.
            </p>
          )}
          {payouts.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-charcoal-muted uppercase text-xs tracking-wider">
                <tr className="border-b border-sand-200">
                  <th className="py-2 pr-3">Eligible since</th>
                  <th className="py-2 pr-3">Property</th>
                  <th className="py-2 pr-3">Gross</th>
                  <th className="py-2 pr-3">Platform fee</th>
                  <th className="py-2 pr-3">Net to you</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.payout_id}
                    className="border-b border-sand-100"
                    data-testid={`my-payout-${p.payout_id}`}
                  >
                    <td className="py-2 pr-3">{new Date(p.eligible_at).toLocaleDateString('en-IN')}</td>
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-charcoal">{p.property?.title || p.property_id}</div>
                      <div className="text-xs text-charcoal-muted">{p.property?.city}</div>
                    </td>
                    <td className="py-2 pr-3">{fmtINR(p.gross_amount)}</td>
                    <td className="py-2 pr-3 text-charcoal-muted">{fmtINR(p.platform_fee)}</td>
                    <td className="py-2 pr-3 font-bold">{fmtINR(p.net_amount)}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'eligible' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {p.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {p.status === 'eligible' && <Clock className="w-3 h-3 mr-1" />}
                        {p.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostPayouts;
