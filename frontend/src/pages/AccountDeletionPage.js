import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Mail, Send, Smartphone } from 'lucide-react';
import SEO from '../components/SEO';
import { apiClient, getApiErrorMessage } from '../services/api';

const AccountDeletionPage = () => {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitDeletionRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice('');
    setError('');
    try {
      const res = await apiClient.post('/api/auth/account-deletion/request', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setNotice(`Request received. Reference: ${res.data?.request_id || 'created'}`);
      setForm({ full_name: '', email: '', phone: '', message: '' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to submit deletion request. Please email customer.support@x-space360.com.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <SEO
        title="Account Deletion Request | X-Space360"
        description="Request deletion of your X-Space360 account and associated personal data."
        canonicalUrl="https://x-space360.in/account-deletion"
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-lg font-black tracking-tight text-slate-950">
            X-Space360
          </Link>
          <Link
            to="/privacy"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Privacy Policy
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#b8860b]">
            Account and Data Deletion
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Request deletion of your X-Space360 account
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-700">
            X-Space360 users can permanently delete their account from the mobile app or request deletion from this page after uninstalling the app.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#fff7e0] text-[#b8860b]">
              <Smartphone size={23} />
            </div>
            <h2 className="text-xl font-black text-slate-950">Delete your X-Space360 account from the app</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-700">
              <li>Open the X-Space360 mobile app.</li>
              <li>Sign in to your account.</li>
              <li>Go to Profile.</li>
              <li>Tap Delete Account and confirm.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#eef7ff] text-[#2563eb]">
              <Mail size={23} />
            </div>
            <h2 className="text-xl font-black text-slate-950">Request deletion by email</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Email us from your registered email address with the subject Account Deletion Request. Support verifies account ownership before processing.
            </p>
            <a
              href="mailto:customer.support@x-space360.com?subject=Account%20Deletion%20Request"
              className="mt-5 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              customer.support@x-space360.com
            </a>
          </section>
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Send size={22} />
          </div>
          <h2 className="text-xl font-black text-slate-950">Submit an external deletion request</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submitDeletionRequest}>
            <label className="text-sm font-bold text-slate-700">
              Full name
              <input
                value={form.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-slate-900"
                autoComplete="name"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Registered email address
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-slate-900"
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Phone number
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-slate-900"
                autoComplete="tel"
              />
            </label>
            <label className="text-sm font-bold text-slate-700 md:col-span-2">
              Message
              <textarea
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                className="mt-2 min-h-[110px] w-full rounded-md border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-slate-900"
                placeholder="Please delete my X-Space360 account and associated personal data."
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit deletion request'}
              </button>
              {notice && <p className="mt-3 text-sm font-bold text-emerald-700">{notice}</p>}
              {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">What data is deleted or retained</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={20} />
              <p className="text-sm leading-7 text-slate-700">
                Account access is removed. Name, email, phone, profile details, app sessions, notifications, property listing media references, and support contact fields are deleted or anonymized where permitted.
              </p>
            </div>
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 shrink-0 text-amber-600" size={20} />
              <p className="text-sm leading-7 text-slate-700">
                Booking, purchase, invoice, payment, Razorpay reference, KYC, dispute, fraud-prevention, tax, audit, and legal records may be retained where required.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-700">
            Financial/payment/legal records are retained for 8 years from the end of the relevant financial year. Account deletion request, support, security, and audit records are retained for 3 years after completion unless a longer legal hold applies. Deletion requests are processed within 90 days after ownership verification.
          </p>
        </section>
      </section>
    </main>
  );
};

export default AccountDeletionPage;
