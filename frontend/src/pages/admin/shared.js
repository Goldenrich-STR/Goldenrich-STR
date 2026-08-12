import React from 'react';
import { createRoot } from 'react-dom/client';

export const PageHeader = ({ title, description, action, eyebrow = 'X-Space360 Central Admin' }) => (
  <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>}
      <h1 className="text-[28px] font-black tracking-[-0.04em] text-slate-950 md:text-[36px]">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
);

export const Panel = ({ children, className = '' }) => (
  <section className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${className}`}>{children}</section>
);

export const StatusBadge = ({ value }) => {
  const key = String(value || 'unknown').toLowerCase();
  const tone = key.includes('active') || key.includes('approved') || key.includes('success') || key.includes('live')
    ? 'bg-[#eef5ff] text-[#2f6df6] border-[#cfe0ff]'
    : key.includes('not_required') || key.includes('not required')
      ? 'bg-slate-50 text-slate-500 border-slate-200'
    : key.includes('pending') || key.includes('due')
      ? 'bg-[#f4f8ff] text-[#5b7ecb] border-[#d9e5fb]'
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
      <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-elevated">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6df6]">Audit Reason Required</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title || 'Add Reason'}</h2>
          {description && <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>}
        </div>
        <div className="p-5">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Reason</span>
            <textarea
              autoFocus
              className={`min-h-32 w-full resize-y rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${invalid ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-[#2f6df6] focus:ring-blue-100'}`}
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
          <button onClick={() => onResolve(null)} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white" type="button">Cancel</button>
          <button onClick={submit} className="rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white hover:bg-[#255fe0]" type="button">{confirmLabel}</button>
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

const BaseDialogShell = ({ title, eyebrow, description, children, footer, widthClass = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className={`w-full overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-elevated ${widthClass}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        {eyebrow && <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6df6]">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        {description && <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
        {footer}
      </div>
    </div>
  </div>
);

const PromptDialog = ({
  title,
  description,
  label = 'Value',
  defaultValue = '',
  placeholder = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  inputType = 'text',
  allowEmpty = false,
  minLength = 1,
  eyebrow = 'Input Required',
  onResolve,
}) => {
  const [value, setValue] = React.useState(defaultValue);
  const [touched, setTouched] = React.useState(false);
  const trimmed = String(value ?? '').trim();
  const invalid = touched && !allowEmpty && trimmed.length < minLength;

  const submit = () => {
    setTouched(true);
    if (!allowEmpty && trimmed.length < minLength) return;
    onResolve(inputType === 'text' || inputType === 'textarea' ? (allowEmpty ? String(value ?? '') : trimmed) : String(value ?? ''));
  };

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onResolve(null);
      if (event.key === 'Enter' && inputType !== 'textarea' && !(event.ctrlKey || event.metaKey)) submit();
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition ${invalid ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-[#2f6df6] focus:ring-2 focus:ring-blue-100'}`;

  return (
    <BaseDialogShell
      title={title}
      eyebrow={eyebrow}
      description={description}
      footer={(
        <>
          <button onClick={() => onResolve(null)} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white" type="button">{cancelLabel}</button>
          <button onClick={submit} className="rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white hover:bg-[#255fe0]" type="button">{confirmLabel}</button>
        </>
      )}
    >
      <label className="block">
        <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
        {inputType === 'textarea' ? (
          <textarea
            autoFocus
            className={`${inputClass} min-h-28 resize-y`}
            onBlur={() => setTouched(true)}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            value={value}
          />
        ) : (
          <input
            autoFocus
            type={inputType}
            className={inputClass}
            onBlur={() => setTouched(true)}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            value={value}
          />
        )}
      </label>
      {invalid && <p className="mt-2 text-xs font-semibold text-red-600">Minimum {minLength} characters required.</p>}
    </BaseDialogShell>
  );
};

const ConfirmDialog = ({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  eyebrow = 'Confirmation Required',
  tone = 'primary',
  onResolve,
}) => {
  const confirmClass = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-[#2f6df6] hover:bg-[#255fe0]';

  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onResolve(false);
      if (event.key === 'Enter') onResolve(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <BaseDialogShell
      title={title}
      eyebrow={eyebrow}
      description={description}
      footer={(
        <>
          <button onClick={() => onResolve(false)} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white" type="button">{cancelLabel}</button>
          <button onClick={() => onResolve(true)} className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white ${confirmClass}`} type="button">{confirmLabel}</button>
        </>
      )}
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        Please confirm this action to continue.
      </div>
    </BaseDialogShell>
  );
};

const NoticeDialog = ({
  title,
  description,
  buttonLabel = 'OK',
  eyebrow = 'Notice',
  onResolve,
}) => {
  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') onResolve();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <BaseDialogShell
      title={title}
      eyebrow={eyebrow}
      description={description}
      footer={<button onClick={() => onResolve()} className="rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white hover:bg-[#255fe0]" type="button">{buttonLabel}</button>}
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        {description}
      </div>
    </BaseDialogShell>
  );
};

const mountDialog = (renderDialog) => new Promise((resolve) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const cleanup = (value) => {
    root.unmount();
    container.remove();
    resolve(value);
  };
  root.render(renderDialog(cleanup));
});

export const requestInput = (options = {}) => mountDialog((cleanup) => <PromptDialog {...options} onResolve={cleanup} />);

export const requestConfirm = (options = {}) => mountDialog((cleanup) => <ConfirmDialog {...options} onResolve={cleanup} />);

export const showNotice = (options = {}) => mountDialog((cleanup) => <NoticeDialog {...options} onResolve={cleanup} />);

export const Pagination = ({ currentPage, totalItems, itemsPerPage = 10, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-gray-100 mt-6 flex-wrap gap-4">
      <p className="text-xs text-slate-500 font-semibold">
        Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
        <span className="font-bold text-slate-900">
          {Math.min(currentPage * itemsPerPage, totalItems)}
        </span>{' '}
        of <span className="font-bold text-slate-900">{totalItems}</span> items
      </p>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-xl border border-gray-100 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
        >
          &larr; Prev
        </button>
        {Array.from({ length: totalPages }).map((_, idx) => {
          const pageNum = idx + 1;
          if (
            pageNum === 1 ||
            pageNum === totalPages ||
            Math.abs(pageNum - currentPage) <= 1
          ) {
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                  currentPage === pageNum
                    ? 'bg-[#2f6df6] text-white font-bold'
                    : 'border border-gray-100 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          }
          if (
            pageNum === 2 ||
            pageNum === totalPages - 1
          ) {
            return <span key={pageNum} className="text-slate-400 px-1 text-xs">...</span>;
          }
          return null;
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-xl border border-gray-100 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};
