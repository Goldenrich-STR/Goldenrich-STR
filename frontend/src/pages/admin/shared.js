import React from 'react';
import { createRoot } from 'react-dom/client';

export const PageHeader = ({ title, description, action, eyebrow = 'X-Space360 Central Admin' }) => (
  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-terracotta">{eyebrow}</p>}
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

const ReasonDialog = ({ title, description, defaultValue = '', minLength = 1, placeholder = 'Enter reason', confirmLabel = 'Submit', onResolve }) => {
  const [value, setValue] = React.useState(defaultValue);
  const [touched, setTouched] = React.useState(false);
  const trimmed = value.trim();
  const invalid = touched && trimmed.length < minLength;

  const submit = () => {
    setTouched(true);
    if (trimmed.length < minLength) return;
    onResolve(trimmed);
  };

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onResolve(null);
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-terracotta">Audit Reason Required</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title || 'Add Reason'}</h2>
          {description && <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>}
        </div>
        <div className="p-5">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Reason</span>
            <textarea
              autoFocus
              className={`min-h-32 w-full resize-y rounded-lg border px-3 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${invalid ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-terracotta focus:ring-amber-100'}`}
              onBlur={() => setTouched(true)}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              value={value}
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>{invalid ? `Minimum ${minLength} characters required.` : 'This reason will be saved in audit history.'}</span>
            <span>{trimmed.length}/{minLength}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button onClick={() => onResolve(null)} className="rounded-lg px-4 py-2 text-sm font-black text-slate-600 hover:bg-white" type="button">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-black text-white hover:bg-slate-800" type="button">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export const requestReason = ({
  title = 'Add Reason',
  description = '',
  defaultValue = '',
  minLength = 1,
  placeholder = 'Write a clear reason for this action',
  confirmLabel = 'Submit Reason',
} = {}) => new Promise((resolve) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const cleanup = (value) => {
    root.unmount();
    container.remove();
    resolve(value);
  };
  root.render(
    <ReasonDialog
      confirmLabel={confirmLabel}
      defaultValue={defaultValue}
      description={description}
      minLength={minLength}
      onResolve={cleanup}
      placeholder={placeholder}
      title={title}
    />
  );
});
