import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Mail, Smartphone } from 'lucide-react';
import SEO from '../components/SEO';

const AccountDeletionPage = () => {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-slate-950">
      <SEO
        title="Account Deletion Request | X-Space360"
        description="Request deletion or deactivation of your X-Space360 account and associated personal data."
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
            X-Space360 users can request account deactivation or deletion of associated personal data from the mobile app or by contacting support.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#fff7e0] text-[#b8860b]">
              <Smartphone size={23} />
            </div>
            <h2 className="text-xl font-black text-slate-950">Delete or deactivate from the app</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-700">
              <li>Open the X-Space360 mobile app.</li>
              <li>Sign in to your account.</li>
              <li>Go to Profile.</li>
              <li>Tap Deactivate Account and confirm.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[#eef7ff] text-[#2563eb]">
              <Mail size={23} />
            </div>
            <h2 className="text-xl font-black text-slate-950">Request deletion by email</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Email us from your registered email address with the subject Account Deletion Request.
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
          <h2 className="text-xl font-black text-slate-950">What data is deleted or retained</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={20} />
              <p className="text-sm leading-7 text-slate-700">
                Account access is disabled and personal profile details are removed or anonymized where deletion is legally and operationally permitted.
              </p>
            </div>
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 shrink-0 text-amber-600" size={20} />
              <p className="text-sm leading-7 text-slate-700">
                Booking, payment, tax, fraud-prevention, dispute, and legal compliance records may be retained for the period required by applicable law.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-700">
            We may contact you to verify account ownership before completing the request. Deletion requests are processed within 90 days unless a longer retention period is required for legal, security, or financial record obligations.
          </p>
        </section>
      </section>
    </main>
  );
};

export default AccountDeletionPage;
