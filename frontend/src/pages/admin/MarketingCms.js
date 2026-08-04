import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Megaphone, Percent, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { cmsAPI, couponAPI } from '../../services/api';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestConfirm, requestReason, showNotice } from './shared';

const phaseSteps = [
  ['Step 1', 'Marketing/CMS Overview', 'completed'],
  ['Step 2', 'Landing Page CMS', 'completed'],
  ['Step 3', 'Offers, Coupons & Campaigns', 'completed'],
  ['Step 4', 'Blog, SEO & Legal Content', 'completed'],
  ['Step 5', 'Publishing Audit & Performance', 'completed'],
];

const tabs = [
  ['overview', 'Overview'],
  ['landing', 'Landing Page CMS'],
  ['offers', 'Offers & Coupons'],
  ['blogSeoLegal', 'Blog, SEO & Legal'],
  ['publishing', 'Publishing Audit'],
  ['content', 'Content Inventory'],
];

const defaultCouponForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  coupon_type: 'booking',
  property_id: '',
  plan_type: '',
  property_category: '',
  property_type: '',
  bhk_type: '',
  sqft_range: '',
};

const subscriptionTargetOptions = {
  propertyCategories: [
    ['residential', 'Residential'],
    ['event_venue', 'Event Venue'],
    ['commercial', 'Commercial'],
  ],
  propertyTypes: [
    ['independent_house', 'Independent House'],
    ['apartment', 'Apartment'],
    ['villa', 'Villa'],
    ['farmhouse', 'Farmhouse'],
    ['banquet_hall', 'Banquet Hall'],
    ['coworking', 'Co-working'],
  ],
  bhkTypes: [
    ['1bhk', '1 BHK'],
    ['2bhk', '2 BHK'],
    ['3bhk', '3 BHK'],
    ['4bhk', '4 BHK'],
    ['4bhk_plus', '4+ BHK'],
  ],
};

const formatFieldLabel = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const parseEditorObject = (editorText) => {
  try {
    return JSON.parse(editorText || '{}');
  } catch (error) {
    return null;
  }
};

const updateNestedValue = (source, path, nextValue) => {
  if (!path.length) return nextValue;
  const [key, ...rest] = path;
  if (Array.isArray(source)) {
    return source.map((item, index) => (index === key ? updateNestedValue(item, rest, nextValue) : item));
  }
  return {
    ...(source || {}),
    [key]: updateNestedValue(source?.[key], rest, nextValue),
  };
};

const removeNestedValue = (source, path) => {
  if (path.length === 1) {
    const [key] = path;
    if (Array.isArray(source)) {
      return source.filter((_, index) => index !== key);
    }
    const next = { ...(source || {}) };
    delete next[key];
    return next;
  }
  const [key, ...rest] = path;
  if (Array.isArray(source)) {
    return source.map((item, index) => (index === key ? removeNestedValue(item, rest) : item));
  }
  return {
    ...(source || {}),
    [key]: removeNestedValue(source?.[key], rest),
  };
};

const addArrayItem = (source, path, template) => {
  const current = path.reduce((acc, key) => acc?.[key], source);
  const nextArray = Array.isArray(current) ? [...current, template] : [template];
  return updateNestedValue(source, path, nextArray);
};

const coerceValue = (rawValue, templateValue) => {
  if (typeof templateValue === 'number') return Number(rawValue) || 0;
  if (typeof templateValue === 'boolean') return Boolean(rawValue);
  return rawValue;
};

const FieldRow = ({ label, children, compact = false }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-3 ${compact ? '' : 'shadow-sm'}`}>
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</label>
    {children}
  </div>
);

const StructuredFieldEditor = ({ value, path = [], onChange, onRemove, root = false }) => {
  if (Array.isArray(value)) {
    const sample = value[0];
    const newItemTemplate = sample && typeof sample === 'object'
      ? JSON.parse(JSON.stringify(sample))
      : '';

    return (
      <div className="space-y-3">
        {!root && (
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">{formatFieldLabel(path[path.length - 1])}</h4>
            <button type="button" onClick={() => onChange(path, [...value, newItemTemplate])} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">Add Item</button>
          </div>
        )}
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={`${path.join('.')}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">{formatFieldLabel(path[path.length - 1] || 'Item')} {index + 1}</p>
                <button type="button" onClick={() => onRemove(path.concat(index))} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Remove</button>
              </div>
              <StructuredFieldEditor value={item} path={path.concat(index)} onChange={onChange} onRemove={onRemove} />
            </div>
          ))}
          {!value.length && (
            <button type="button" onClick={() => onChange(path, [newItemTemplate])} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
              Add First Item
            </button>
          )}
        </div>
      </div>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(value).map(([key, currentValue]) => (
          <div key={[...path, key].join('.')} className={currentValue && typeof currentValue === 'object' ? 'md:col-span-2' : ''}>
            {currentValue && typeof currentValue === 'object' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">{formatFieldLabel(key)}</h4>
                  {!Array.isArray(value) && !root && (
                    <button type="button" onClick={() => onRemove(path.concat(key))} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Remove</button>
                  )}
                </div>
                <StructuredFieldEditor value={currentValue} path={path.concat(key)} onChange={onChange} onRemove={onRemove} />
              </div>
            ) : (
              <FieldRow label={formatFieldLabel(key)}>
                {typeof currentValue === 'boolean' ? (
                  <select
                    value={currentValue ? 'true' : 'false'}
                    onChange={(event) => onChange(path.concat(key), event.target.value === 'true')}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : String(currentValue || '').length > 90 ? (
                  <textarea
                    value={currentValue ?? ''}
                    onChange={(event) => onChange(path.concat(key), coerceValue(event.target.value, currentValue))}
                    className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                  />
                ) : (
                  <input
                    value={currentValue ?? ''}
                    onChange={(event) => onChange(path.concat(key), coerceValue(event.target.value, currentValue))}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                )}
              </FieldRow>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <input
      value={value ?? ''}
      onChange={(event) => onChange(path, coerceValue(event.target.value, value))}
      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
    />
  );
};

const MarketingCms = () => {
  const [active, setActive] = useState('overview');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editorText, setEditorText] = useState('');
  const [saving, setSaving] = useState(false);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const [state, setState] = useState({ loading: true, error: '', content: [], coupons: [], audits: [], publicStatus: { landing: false, support: false } });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [landingRes, supportRes, couponsRes, auditsRes, publicLandingRes, publicSupportRes] = await Promise.allSettled([
        cmsAPI.getAdminContent('landing'),
        cmsAPI.getAdminContent('support'),
        couponAPI.listCoupons(),
        adminPhase1API.auditLogs({ module: 'marketing_cms', limit: 20 }),
        cmsAPI.getLandingPage(),
        cmsAPI.getSupportPage(),
      ]);
      const landing = landingRes.status === 'fulfilled' ? landingRes.value.data.content || [] : [];
      const support = supportRes.status === 'fulfilled' ? supportRes.value.data.content || [] : [];
      const coupons = couponsRes.status === 'fulfilled' ? couponsRes.value.data.coupons || [] : [];
      const audits = auditsRes.status === 'fulfilled' ? auditsRes.value.data.data.logs || [] : [];
      setState({ loading: false, error: '', content: [...landing, ...support], coupons, audits, publicStatus: { landing: publicLandingRes.status === 'fulfilled', support: publicSupportRes.status === 'fulfilled' } });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load Marketing & CMS', content: [], coupons: [], audits: [], publicStatus: { landing: false, support: false } });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredContent = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return state.content;
    return state.content.filter((item) => [item.page, item.section, item.content_type, item.content_id].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [search, state.content]);

  const metrics = useMemo(() => {
    const activeCoupons = state.coupons.filter((coupon) => coupon.is_active !== false).length;
    const inactiveContent = state.content.filter((item) => item.is_active === false).length;
    const pages = new Set(state.content.map((item) => item.page || 'unknown'));
    return {
      contentSections: state.content.length,
      pages: pages.size,
      activeCoupons,
      inactiveContent,
    };
  }, [state.content, state.coupons]);

  const landingContent = useMemo(() => state.content.filter((item) => item.page === 'landing'), [state.content]);
  const selectedLanding = useMemo(() => landingContent.find((item) => item.content_id === selectedId) || landingContent[0], [landingContent, selectedId]);
  const editorialContent = useMemo(() => landingContent.filter((item) => ['blog', 'seo', 'legal_terms', 'footer'].includes(item.section)), [landingContent]);

  useEffect(() => {
    if (!selectedLanding) return;
    setSelectedId(selectedLanding.content_id);
    setEditorText(JSON.stringify(selectedLanding.content_data || {}, null, 2));
  }, [selectedLanding]);

  useEffect(() => {
    if (active !== 'blogSeoLegal' || !editorialContent.length) return;
    if (!editorialContent.some((item) => item.content_id === selectedId)) {
      setSelectedId(editorialContent[0].content_id);
    }
  }, [active, editorialContent, selectedId]);

  const saveLandingSection = async () => {
    if (!selectedLanding) return;
    let parsed;
    try {
      parsed = JSON.parse(editorText || '{}');
    } catch (error) {
      await showNotice({ title: 'Invalid JSON', description: 'Please fix the content before saving.', eyebrow: 'Validation Error' });
      return;
    }
    const reason = await requestReason({ title: 'Publishing Reason', description: `Updating landing ${selectedLanding.section}.`, defaultValue: `Updated landing ${selectedLanding.section}`, placeholder: 'Add publishing reason.', minLength: 3 });
    if (!reason) return;
    setSaving(true);
    try {
      await cmsAPI.updateContent(selectedLanding.content_id, { content_data: parsed, is_active: selectedLanding.is_active !== false, reason });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleLandingSection = async (item) => {
    const reason = await requestReason({ title: 'Content Status Reason', description: `${item.is_active === false ? 'Publish' : 'Unpublish'} landing ${item.section}.`, defaultValue: `${item.is_active === false ? 'Publish' : 'Unpublish'} landing ${item.section}`, placeholder: 'Add status change reason.', minLength: 3 });
    if (!reason) return;
    setSaving(true);
    try {
      await cmsAPI.updateContent(item.content_id, { content_data: item.content_data || {}, is_active: item.is_active === false, reason });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const createCoupon = async () => {
    if (!couponForm.code.trim()) {
      await showNotice({ title: 'Validation Error', description: 'Coupon code is required.', eyebrow: 'Validation Error' });
      return;
    }
    const value = Number(couponForm.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      await showNotice({ title: 'Validation Error', description: 'Discount value must be greater than 0.', eyebrow: 'Validation Error' });
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries({ ...couponForm, discount_value: value }).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]).filter(([, value]) => value !== ''));
      await couponAPI.createCoupon(payload);
      setCouponForm(defaultCouponForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    const confirmed = await requestConfirm({
      title: `${coupon.is_active === false ? 'Activate' : 'Deactivate'} Coupon`,
      description: `${coupon.is_active === false ? 'Activate' : 'Deactivate'} coupon ${coupon.code}?`,
      confirmLabel: coupon.is_active === false ? 'Activate Coupon' : 'Deactivate Coupon',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await couponAPI.toggleCouponStatus(coupon.coupon_id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const copyEditorText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editorText || '');
      await showNotice({ title: 'Copied', description: 'Section content copied to clipboard.', eyebrow: 'CMS Editor' });
    } catch (error) {
      await showNotice({ title: 'Copy failed', description: 'Unable to copy content right now.', eyebrow: 'CMS Editor' });
    }
  }, [editorText]);

  const pasteEditorText = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setEditorText(clipboardText || '');
      await showNotice({ title: 'Pasted', description: 'Clipboard content pasted into editor.', eyebrow: 'CMS Editor' });
    } catch (error) {
      await showNotice({ title: 'Paste failed', description: 'Clipboard read was blocked. Use normal paste once in the editor.', eyebrow: 'CMS Editor' });
    }
  }, []);

  return (
    <div>
      <PageHeader title="Marketing & CMS" description="Manage website content inventory, publishing readiness, offers and CMS health for X-Space360." />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-charcoal text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search page, section, type or content ID" />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Content Sections', metrics.contentSections, FileText],
              ['CMS Pages', metrics.pages, ShieldCheck],
              ['Active Coupons', metrics.activeCoupons, Percent],
              ['Inactive Sections', metrics.inactiveContent, TrendingUp],
            ].map(([label, value, Icon]) => <Panel key={label} className="p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4ff] text-[#2563eb]"><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
          </div>
          {active === 'overview' ? <Overview content={state.content} coupons={state.coupons} /> : active === 'landing' ? <LandingEditor content={landingContent} selected={selectedLanding} selectedId={selectedId} setSelectedId={setSelectedId} editorText={editorText} setEditorText={setEditorText} saving={saving} onSave={saveLandingSection} onToggle={toggleLandingSection} onCopy={copyEditorText} onPaste={pasteEditorText} /> : active === 'offers' ? <OffersManager coupons={state.coupons} form={couponForm} setForm={setCouponForm} saving={saving} onCreate={createCoupon} onToggle={toggleCoupon} /> : active === 'blogSeoLegal' ? <EditorialManager content={editorialContent} selected={selectedLanding} selectedId={selectedId} setSelectedId={setSelectedId} editorText={editorText} setEditorText={setEditorText} saving={saving} onSave={saveLandingSection} onToggle={toggleLandingSection} onCopy={copyEditorText} onPaste={pasteEditorText} /> : active === 'publishing' ? <PublishingAudit content={state.content} coupons={state.coupons} audits={state.audits} publicStatus={state.publicStatus} /> : <ContentInventory content={filteredContent} />}
        </div>
      )}
    </div>
  );
};

const Overview = ({ content, coupons }) => (
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <ContentInventory content={content.slice(0, 8)} compact />
    <div className="space-y-4">
      <Panel className="p-4">
        <h2 className="font-black">Phase 5 Steps</h2>
        <div className="mt-3 space-y-2">{phaseSteps.map(([step, label, status]) => <div key={step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{step}</b> {label}</span><StatusBadge value={status} /></div>)}</div>
      </Panel>
      <Panel className="p-4">
        <h2 className="font-black">Offer Snapshot</h2>
        <div className="mt-3 space-y-2">
          {coupons.slice(0, 6).map((coupon) => <div key={coupon.coupon_id || coupon.code} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{coupon.code}</span><StatusBadge value={coupon.is_active === false ? 'inactive' : 'active'} /></div>)}
          {!coupons.length && <p className="text-sm text-slate-500">No coupons found.</p>}
        </div>
      </Panel>
    </div>
  </div>
);

const LandingEditor = ({ content, selected, selectedId, setSelectedId, editorText, setEditorText, saving, onSave, onToggle, onCopy, onPaste }) => {
  const parsed = parseEditorObject(editorText);
  const handleFieldChange = (path, nextValue) => {
    if (!parsed) return;
    const next = updateNestedValue(parsed, path, nextValue);
    setEditorText(JSON.stringify(next, null, 2));
  };
  const handleFieldRemove = (path) => {
    if (!parsed) return;
    const next = removeNestedValue(parsed, path);
    setEditorText(JSON.stringify(next, null, 2));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Landing Sections</h2>
          <p className="text-xs text-slate-500">Select a website landing section to edit its structured content.</p>
        </div>
        <div className="max-h-[640px] overflow-y-auto p-3">
          {content.map((item) => (
            <button key={item.content_id} onClick={() => setSelectedId(item.content_id)} className={`mb-2 w-full rounded-lg border p-3 text-left text-sm ${selectedId === item.content_id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-black capitalize">{String(item.section || '-').replace(/_/g, ' ')}</span>
                <StatusBadge value={item.is_active === false ? 'inactive' : 'active'} />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{item.content_id}</p>
            </button>
          ))}
          {!content.length && <p className="p-3 text-sm text-slate-500">No landing content found.</p>}
        </div>
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">{selected ? String(selected.section || 'Landing Section').replace(/_/g, ' ') : 'Landing Section'}</h2>
            <p className="text-xs text-slate-500">{selected?.content_type || 'object'} content editor</p>
          </div>
          {selected && (
            <div className="flex flex-wrap gap-2">
              <button onClick={onCopy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Copy</button>
              <button onClick={onPaste} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Paste</button>
              <button disabled={saving} onClick={() => onToggle(selected)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">{selected.is_active === false ? 'Publish' : 'Unpublish'}</button>
              <button disabled={saving} onClick={onSave} className="rounded-lg bg-charcoal px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Section'}</button>
            </div>
          )}
        </div>
        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Field-wise simple editor. Ekek field fill kar, mag direct save kar.
          </div>
          {parsed ? (
            <StructuredFieldEditor value={parsed} root onChange={handleFieldChange} onRemove={handleFieldRemove} />
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              JSON parse hot nahiye. Paste kelela content format check kar.
            </div>
          )}
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-700">Advanced JSON View</summary>
            <div className="border-t border-slate-200 p-4">
              <textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} spellCheck="false" className="min-h-[320px] w-full resize-y rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
            </div>
          </details>
        </div>
      </Panel>
    </div>
  );
};

const OffersManager = ({ coupons, form, setForm, saving, onCreate, onToggle }) => {
  const bookingCoupons = coupons.filter((coupon) => coupon.coupon_type === 'booking');
  const subscriptionCoupons = coupons.filter((coupon) => coupon.coupon_type === 'subscription');
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel className="p-4">
          <h2 className="font-black">Create Offer</h2>
          <div className="mt-4 space-y-3">
            <input value={form.code} onChange={(event) => updateField('code', event.target.value.toUpperCase())} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Coupon code" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.discount_type} onChange={(event) => updateField('discount_type', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              <input value={form.discount_value} onChange={(event) => updateField('discount_value', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Value" type="number" min="1" />
            </div>
            <select value={form.coupon_type} onChange={(event) => updateField('coupon_type', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
              <option value="booking">Booking Coupon</option>
              <option value="subscription">Subscription Coupon</option>
            </select>
            {form.coupon_type === 'booking' ? (
              <input value={form.property_id} onChange={(event) => updateField('property_id', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Property ID" />
            ) : (
              <div className="grid gap-2">
                <select value={form.plan_type} onChange={(event) => updateField('plan_type', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">All subscription plans</option>
                  <option value="1bhk">1 BHK Plans</option>
                  <option value="2bhk">2 BHK Plans</option>
                  <option value="3bhk">3 BHK Plans</option>
                  <option value="4bhk">4 BHK Plans</option>
                  <option value="4bhk_plus">4+ BHK Plans</option>
                </select>
                <select value={form.property_category} onChange={(event) => updateField('property_category', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">All property categories</option>
                  {subscriptionTargetOptions.propertyCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={form.property_type} onChange={(event) => updateField('property_type', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">All property types</option>
                  {subscriptionTargetOptions.propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={form.bhk_type} onChange={(event) => updateField('bhk_type', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">All BHK configurations</option>
                  {subscriptionTargetOptions.bhkTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={form.sqft_range} onChange={(event) => updateField('sqft_range', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Sqft range" />
              </div>
            )}
            <button disabled={saving} onClick={onCreate} className="w-full rounded-lg bg-charcoal px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Create Coupon'}</button>
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-black">Campaign Mix</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricTile label="Booking" value={bookingCoupons.length} />
            <MetricTile label="Subscription" value={subscriptionCoupons.length} />
            <MetricTile label="Active" value={coupons.filter((coupon) => coupon.is_active !== false).length} />
            <MetricTile label="Inactive" value={coupons.filter((coupon) => coupon.is_active === false).length} />
          </div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Coupons & Campaigns</h2>
          <p className="text-xs text-slate-500">Booking and subscription offers currently available to the website flows.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Code', 'Type', 'Discount', 'Targeting', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <tr key={coupon.coupon_id || coupon.code}>
                  <td className="px-4 py-3"><p className="font-black">{coupon.code}</p><p className="font-mono text-xs text-slate-500">{coupon.coupon_id}</p></td>
                  <td className="px-4 py-3 capitalize">{coupon.coupon_type || '-'}</td>
                  <td className="px-4 py-3">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `Rs ${coupon.discount_value}`}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{[coupon.property_id, coupon.plan_type, coupon.property_category, coupon.property_type, coupon.bhk_type, coupon.sqft_range].filter(Boolean).join(' · ') || 'Global'}</td>
                  <td className="px-4 py-3"><StatusBadge value={coupon.is_active === false ? 'inactive' : 'active'} /></td>
                  <td className="px-4 py-3"><button disabled={saving} onClick={() => onToggle(coupon)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60">{coupon.is_active === false ? 'Activate' : 'Deactivate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!coupons.length && <p className="p-6 text-sm text-slate-500">No coupons found.</p>}
        </div>
      </Panel>
    </div>
  );
};

const EditorialManager = ({ content, selected, selectedId, setSelectedId, editorText, setEditorText, saving, onSave, onToggle, onCopy, onPaste }) => {
  const blog = content.find((item) => item.section === 'blog')?.content_data || {};
  const seo = content.find((item) => item.section === 'seo')?.content_data || {};
  const legal = content.find((item) => item.section === 'legal_terms')?.content_data || {};
  const blogPosts = Array.isArray(blog.posts) ? blog.posts : [];
  const activePosts = blogPosts.filter((post) => post.is_active !== false);
  const missingSeo = ['title', 'description', 'keywords'].filter((field) => !seo[field]);
  const legalReady = ['terms_text', 'privacy_text', 'refund_text'].filter((field) => legal[field]).length;
  const parsed = parseEditorObject(editorText);
  const handleFieldChange = (path, nextValue) => {
    if (!parsed) return;
    const next = updateNestedValue(parsed, path, nextValue);
    setEditorText(JSON.stringify(next, null, 2));
  };
  const handleFieldRemove = (path) => {
    if (!parsed) return;
    const next = removeNestedValue(parsed, path);
    setEditorText(JSON.stringify(next, null, 2));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel className="p-4">
          <h2 className="font-black">Editorial Readiness</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricTile label="Blog Posts" value={blogPosts.length} />
            <MetricTile label="Active Posts" value={activePosts.length} />
            <MetricTile label="SEO Missing" value={missingSeo.length} />
            <MetricTile label="Legal Docs" value={`${legalReady}/3`} />
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Editable Sections</h2>
            <p className="text-xs text-slate-500">Blog, SEO, footer links and legal policies are consumed by public website pages.</p>
          </div>
          <div className="p-3">
            {content.map((item) => (
              <button key={item.content_id} onClick={() => setSelectedId(item.content_id)} className={`mb-2 w-full rounded-lg border p-3 text-left text-sm ${selectedId === item.content_id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black capitalize">{String(item.section || '-').replace(/_/g, ' ')}</span>
                  <StatusBadge value={item.is_active === false ? 'inactive' : 'active'} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{item.content_id}</p>
              </button>
            ))}
            {!content.length && <p className="p-3 text-sm text-slate-500">No editorial content found.</p>}
          </div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">{selected ? String(selected.section || 'Editorial Section').replace(/_/g, ' ') : 'Editorial Section'}</h2>
            <p className="text-xs text-slate-500">Structured JSON editor for public website content.</p>
          </div>
        {selected && (
            <div className="flex flex-wrap gap-2">
              <button onClick={onCopy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Copy</button>
              <button onClick={onPaste} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Paste</button>
              <button disabled={saving} onClick={() => onToggle(selected)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">{selected.is_active === false ? 'Publish' : 'Unpublish'}</button>
              <button disabled={saving} onClick={onSave} className="rounded-lg bg-charcoal px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Content'}</button>
            </div>
          )}
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Field-wise simple editor. Blog, SEO ani legal content ekek field ne edit kar.
            </div>
            {parsed ? (
              <StructuredFieldEditor value={parsed} root onChange={handleFieldChange} onRemove={handleFieldRemove} />
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                JSON parse hot nahiye. Paste kelela content format check kar.
              </div>
            )}
            <details className="mt-4 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-700">Advanced JSON View</summary>
              <div className="border-t border-slate-200 p-4">
                <textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} spellCheck="false" className="min-h-[320px] w-full resize-y rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
              </div>
            </details>
          </div>
          <div className="space-y-3">
            <Panel className="p-3">
              <h3 className="text-sm font-black">SEO Checks</h3>
              <div className="mt-2 space-y-2">{['title', 'description', 'keywords'].map((field) => <div key={field} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs"><span>{field}</span><StatusBadge value={seo[field] ? 'ready' : 'missing'} /></div>)}</div>
            </Panel>
            <Panel className="p-3">
              <h3 className="text-sm font-black">Legal Checks</h3>
              <div className="mt-2 space-y-2">{['terms_text', 'privacy_text', 'refund_text'].map((field) => <div key={field} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs"><span>{field}</span><StatusBadge value={legal[field] ? 'ready' : 'missing'} /></div>)}</div>
            </Panel>
          </div>
        </div>
      </Panel>
    </div>
  );
};

const PublishingAudit = ({ content, coupons, audits, publicStatus }) => {
  const activeSections = content.filter((item) => item.is_active !== false).length;
  const inactiveSections = content.length - activeSections;
  const activeCoupons = coupons.filter((coupon) => coupon.is_active !== false).length;
  const readinessRows = [
    ['Landing public API', publicStatus.landing ? 'ready' : 'failed'],
    ['Support public API', publicStatus.support ? 'ready' : 'failed'],
    ['Active CMS sections', activeSections],
    ['Inactive CMS sections', inactiveSections],
    ['Active offers', activeCoupons],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel className="p-4">
          <h2 className="font-black">Publishing Health</h2>
          <div className="mt-3 space-y-2">
            {readinessRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-bold">{label}</span>
                {['ready', 'failed'].includes(value) ? <StatusBadge value={value} /> : <span>{value}</span>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-black">Performance Signals</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricTile label="CMS Sections" value={content.length} />
            <MetricTile label="Published" value={activeSections} />
            <MetricTile label="Coupons" value={coupons.length} />
            <MetricTile label="Audit Events" value={audits.length} />
          </div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Recent Publishing Audit</h2>
          <p className="text-xs text-slate-500">CMS create, update and delete events captured through the admin audit log.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'User', 'Action', 'Record', 'Reason'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((log) => (
                <tr key={log.audit_id || `${log.record_id}-${log.created_at}`}>
                  <td className="px-4 py-3">{log.created_at ? String(log.created_at).slice(0, 16).replace('T', ' ') : '-'}</td>
                  <td className="px-4 py-3">{log.user_id || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={log.action || 'audit'} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{log.record_id || '-'}</td>
                  <td className="px-4 py-3 max-w-[260px] truncate">{log.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!audits.length && <p className="p-6 text-sm text-slate-500">No marketing CMS audit events found yet.</p>}
        </div>
      </Panel>
    </div>
  );
};

const MetricTile = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

const ContentInventory = ({ content, compact = false }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-200 p-4">
      <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-terracotta" /><h2 className="font-black">CMS Content Inventory</h2></div>
      <p className="text-xs text-slate-500">Landing and support content sections currently available in the admin CMS.</p>
    </div>
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${compact ? 'min-w-[760px]' : 'min-w-[980px]'}`}>
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Page', 'Section', 'Type', 'Status', 'Updated'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {content.map((item) => (
            <tr key={item.content_id || `${item.page}-${item.section}`}>
              <td className="px-4 py-3 font-bold capitalize">{item.page || '-'}</td>
              <td className="px-4 py-3"><p className="font-black">{String(item.section || '-').replace(/_/g, ' ')}</p><p className="font-mono text-xs text-slate-500">{item.content_id || '-'}</p></td>
              <td className="px-4 py-3">{item.content_type || '-'}</td>
              <td className="px-4 py-3"><StatusBadge value={item.is_active === false ? 'inactive' : 'active'} /></td>
              <td className="px-4 py-3">{item.updated_at ? String(item.updated_at).slice(0, 10) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!content.length && <p className="p-6 text-sm text-slate-500">No CMS content found.</p>}
    </div>
  </Panel>
);

export default MarketingCms;
