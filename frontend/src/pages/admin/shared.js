import React from 'react';

export const PageHeader = ({ title, description, action }) => (
  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-terracotta">X-Space360 Central Admin</p>
      <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>}
    </div>
    {action}
  </div>
);

export const Panel = ({ children, className = '' }) => (
  <section className={`rounded-lg border border-slate-200 bg-white shadow-subtle ${className}`}>{children}</section>
);

export const StatusBadge = ({ value }) => {
  const key = String(value || 'unknown').toLowerCase();
  const tone = key.includes('active') || key.includes('approved') || key.includes('success') || key.includes('live')
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : key.includes('pending') || key.includes('due')
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : key.includes('reject') || key.includes('critical') || key.includes('inactive')
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold capitalize ${tone}`}>{String(value || 'Unknown').replace(/_/g, ' ')}</span>;
};

export const LoadingState = ({ message = 'Loading...' }) => (
  <div
    aria-live="polite"
    className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500"
    role="status"
  >
    {message}
  </div>
);

export const ErrorState = ({ message, action }) => (
  <div
    aria-live="assertive"
    className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between"
    role="alert"
  >
    <span>{message || 'Something went wrong'}</span>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
