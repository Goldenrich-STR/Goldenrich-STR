import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, FileText, Filter, Megaphone, MoreHorizontal, Percent, Plus, Search, ShieldCheck } from 'lucide-react';
import { cmsAPI, couponAPI } from '../../services/api';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, Panel, StatusBadge, requestConfirm, requestReason, showNotice } from './shared';

const phaseSteps = [
  ['1', 'Content Inventory Overview', 'Manage all CMS content', 'completed'],
  ['2', 'Landing Page CMS', 'Edit homepage and sections', 'completed'],
  ['3', 'Offers & Coupons', 'Create and manage offers', 'completed'],
  ['4', 'Blogs, SEO & Legal', 'Manage blogs and legal pages', 'completed'],
  ['5', 'Parts & Integrations', 'Configure third-party integrations', 'completed'],
];

const tabs = [
  ['overview', 'Overview'],
  ['landing', 'Landing Page CMS'],
  ['offers', 'Offers & Coupons'],
  ['blogSeoLegal', 'Blogs, SEO & Legal'],
  ['integrations', 'Parts & Integrations'],
  ['content', 'Content Inventory'],
];

const contentSectionDescriptions = {
  footer: 'Quick links and info',
  hero: 'Main banner section',
  offer: 'Offers and discounts',
  offers: 'Offers and discounts',
  testimonials: 'Customer reviews section',
  blog: 'Latest blog posts',
  advertisement: 'Marketing banners',
  legal_terms: 'Terms and privacy details',
  faq: 'FAQ section',
  contact: 'Contact information',
  seo: 'SEO metadata and page signals',
};

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

const defaultContentForm = {
  page: 'landing',
  section: '',
  content_type: 'object',
  content_data: '{\n  "title": "",\n  "description": ""\n}',
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

const formatContentDate = (value) => {
  if (!value) return { date: '-', time: '-' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: String(value).slice(0, 10) || '-', time: String(value).slice(11, 16) || '-' };
  }
  const date = parsed.toLocaleDateString('en-CA');
  const time = parsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
};

const getContentSectionDescription = (item) => {
  const key = String(item?.section || '').toLowerCase();
  return contentSectionDescriptions[key] || item?.content_id || 'Content section';
};

const getContentEditorTab = (item) => {
  const section = String(item?.section || '').toLowerCase();
  if (['blog', 'seo', 'legal_terms', 'footer'].includes(section)) return 'blogSeoLegal';
  if (String(item?.page || '').toLowerCase() === 'landing') return 'landing';
  return 'content';
};

const MarketingMetricCard = ({ icon: Icon, iconTone, label, value, trend, trendTone = 'positive', helper }) => (
  <Panel className="rounded-[26px] border border-[#e7edf8] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
    <div className="flex items-start justify-between gap-4">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconTone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#506187]">{label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[2rem] font-black leading-none text-[#0f172a]">{value}</p>
          {trend ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
              trendTone === 'positive' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#dc2626]'
            }`}
            >
              {trend}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-[#64748b]">{helper}</p>
      </div>
    </div>
  </Panel>
);

const OverviewRailCard = ({ title, actionLabel, onAction, children }) => (
  <Panel className="rounded-[24px] border border-[#e7edf8] bg-white p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[1.05rem] font-black text-[#0f172a]">{title}</h3>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="text-sm font-bold text-[#2563eb]">
          {actionLabel}
        </button>
      ) : null}
    </div>
    <div className="mt-4">{children}</div>
  </Panel>
);

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
  const [showFilters, setShowFilters] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [contentForm, setContentForm] = useState(defaultContentForm);
  const [contentFilters, setContentFilters] = useState({ page: 'all', type: 'all', status: 'all' });
  const [openActionId, setOpenActionId] = useState('');
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
    return state.content.filter((item) => {
      const matchesSearch = !term || [item.page, item.section, item.content_type, item.content_id].some((value) => String(value || '').toLowerCase().includes(term));
      const matchesPage = contentFilters.page === 'all' || String(item.page || '').toLowerCase() === contentFilters.page;
      const matchesType = contentFilters.type === 'all' || String(item.content_type || '').toLowerCase() === contentFilters.type;
      const matchesStatus = contentFilters.status === 'all'
        || (contentFilters.status === 'active' && item.is_active !== false)
        || (contentFilters.status === 'inactive' && item.is_active === false);
      return matchesSearch && matchesPage && matchesType && matchesStatus;
    });
  }, [contentFilters.page, contentFilters.status, contentFilters.type, search, state.content]);

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

  const resetContentFilters = useCallback(() => {
    setSearch('');
    setContentFilters({ page: 'all', type: 'all', status: 'all' });
    setShowFilters(false);
  }, []);

  const handleViewContent = useCallback((item) => {
    setSelectedId(item.content_id || '');
    setEditorText(JSON.stringify(item.content_data || {}, null, 2));
    setActive(getContentEditorTab(item));
    setOpenActionId('');
  }, []);

  const handleQuickAction = useCallback((target) => {
    if (target === 'addContent') {
      setActive('content');
      setShowAddContent(true);
      return;
    }
    if (target === 'viewAllContent') {
      setActive('content');
      return;
    }
    if (target === 'offers') {
      setActive('offers');
      return;
    }
    if (target === 'blogSeoLegal') {
      setActive('blogSeoLegal');
      return;
    }
    if (target === 'landing') {
      setActive('landing');
      return;
    }
    if (target === 'integrations') {
      setActive('integrations');
    }
  }, []);

  const handleCreateContent = useCallback(async () => {
    const section = contentForm.section.trim().toLowerCase().replace(/\s+/g, '_');
    if (!section) {
      await showNotice({ title: 'Validation Error', description: 'Section key is required.', eyebrow: 'CMS Content' });
      return;
    }
    const parsed = parseEditorObject(contentForm.content_data);
    if (!parsed) {
      await showNotice({ title: 'Validation Error', description: 'Content JSON is invalid.', eyebrow: 'CMS Content' });
      return;
    }
    setSaving(true);
    try {
      await cmsAPI.createContent({
        page: contentForm.page,
        section,
        content_type: contentForm.content_type,
        content_data: parsed,
      });
      await load();
      setContentForm(defaultContentForm);
      setShowAddContent(false);
      setActive(contentForm.page === 'landing' ? 'landing' : 'content');
      await showNotice({ title: 'Content created', description: `${formatFieldLabel(section)} section created successfully.`, eyebrow: 'CMS Content' });
    } catch (error) {
      await showNotice({ title: 'Create failed', description: error.response?.data?.detail || 'Unable to create CMS content right now.', eyebrow: 'CMS Content' });
    } finally {
      setSaving(false);
    }
  }, [contentForm, load]);

  const handleToggleContentFromTable = useCallback(async (item) => {
    setOpenActionId('');
    await toggleLandingSection(item);
  }, [toggleLandingSection]);

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-[30px] border border-[#e7edf8] bg-white/95 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#64748b]">
                <span>Marketing &amp; CMS</span>
                <span className="text-[#94a3b8]">&gt;</span>
                <span className="text-[#2563eb]">{tabs.find(([id]) => id === active)?.[1] || 'Overview'}</span>
              </div>
              <h1 className="mt-2 text-[2.15rem] font-black tracking-[-0.03em] text-[#0f172a]">Marketing &amp; CMS</h1>
              <p className="mt-2 max-w-[760px] text-[15px] font-medium text-[#5b6b8c]">
                Manage and create content, marketing campaigns, offers and CMS assets for X-Space360.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-[22px] border border-[#e8eef8] bg-white p-2">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                    active === id
                      ? 'bg-[#eff6ff] text-[#2563eb] shadow-[inset_0_-2px_0_rgba(37,99,235,0.18)]'
                      : 'text-[#506187] hover:bg-[#f8fbff]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MarketingMetricCard icon={FileText} iconTone="bg-[#eaf2ff] text-[#2563eb]" label="Content Sections" value={metrics.contentSections} trend="↑ 12.5%" helper="vs last month" />
            <MarketingMetricCard icon={ShieldCheck} iconTone="bg-[#f3ebff] text-[#8b5cf6]" label="CMS Pages" value={metrics.pages} helper="No change" />
            <MarketingMetricCard icon={Percent} iconTone="bg-[#eff6ff] text-[#2563eb]" label="Active Coupons" value={metrics.activeCoupons} trend="↑ 33.3%" helper="vs last month" />
            <MarketingMetricCard icon={Megaphone} iconTone="bg-[#f6edff] text-[#8b5cf6]" label="Marketing Sections" value={metrics.inactiveContent} helper="No change" />
          </div>
          {active === 'overview' ? <Overview content={filteredContent} allContent={state.content} coupons={state.coupons} search={search} setSearch={setSearch} filters={contentFilters} setFilters={setContentFilters} showFilters={showFilters} setShowFilters={setShowFilters} onResetFilters={resetContentFilters} onAddContent={() => setShowAddContent(true)} onView={handleViewContent} onToggleContent={handleToggleContentFromTable} openActionId={openActionId} setOpenActionId={setOpenActionId} onQuickAction={handleQuickAction} /> : active === 'landing' ? <LandingEditor content={landingContent} selected={selectedLanding} selectedId={selectedId} setSelectedId={setSelectedId} editorText={editorText} setEditorText={setEditorText} saving={saving} onSave={saveLandingSection} onToggle={toggleLandingSection} onCopy={copyEditorText} onPaste={pasteEditorText} /> : active === 'offers' ? <OffersManager coupons={state.coupons} form={couponForm} setForm={setCouponForm} saving={saving} onCreate={createCoupon} onToggle={toggleCoupon} /> : active === 'blogSeoLegal' ? <EditorialManager content={editorialContent} selected={selectedLanding} selectedId={selectedId} setSelectedId={setSelectedId} editorText={editorText} setEditorText={setEditorText} saving={saving} onSave={saveLandingSection} onToggle={toggleLandingSection} onCopy={copyEditorText} onPaste={pasteEditorText} /> : active === 'integrations' ? <PublishingAudit content={state.content} coupons={state.coupons} audits={state.audits} publicStatus={state.publicStatus} /> : <ContentInventory content={filteredContent} search={search} setSearch={setSearch} filters={contentFilters} setFilters={setContentFilters} showFilters={showFilters} setShowFilters={setShowFilters} onResetFilters={resetContentFilters} onAddContent={() => setShowAddContent(true)} onView={handleViewContent} onToggleContent={handleToggleContentFromTable} openActionId={openActionId} setOpenActionId={setOpenActionId} />}
        </div>
      )}
      {showAddContent ? (
        <AddContentModal
          form={contentForm}
          setForm={setContentForm}
          saving={saving}
          onClose={() => setShowAddContent(false)}
          onSubmit={handleCreateContent}
        />
      ) : null}
    </div>
  );
};

const Overview = ({ content, allContent, coupons, search, setSearch, filters, setFilters, showFilters, setShowFilters, onResetFilters, onAddContent, onView, onToggleContent, openActionId, setOpenActionId, onQuickAction }) => (
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <ContentInventory content={content} compact search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} onResetFilters={onResetFilters} onAddContent={onAddContent} onView={onView} onToggleContent={onToggleContent} openActionId={openActionId} setOpenActionId={setOpenActionId} />
    <div className="space-y-4">
      <OverviewRailCard title="Phase 6 Steps" actionLabel="View All →" onAction={() => onQuickAction('viewAllContent')}>
        <div className="space-y-3">
          {phaseSteps.map(([step, label, description, status]) => (
            <div key={step} className="flex items-start gap-3 rounded-2xl bg-[#f8fbff] px-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-sm font-black text-[#2563eb]">
                {step}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[#0f172a]">{label}</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">{description}</p>
              </div>
              <StatusBadge value={status} />
            </div>
          ))}
        </div>
      </OverviewRailCard>
      <OverviewRailCard title="Quick Actions">
        <div className="space-y-3">
          {[
            ['Add New Section', 'Create a new CMS section', 'addContent'],
            ['Manage Offers', 'Create or update offers', 'offers'],
            ['Write Blog Post', 'Publish a new blog', 'blogSeoLegal'],
            ['SEO Settings', 'Update meta and SEO info', 'blogSeoLegal'],
          ].map(([title, description, target]) => (
            <button key={title} type="button" onClick={() => onQuickAction(target)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e8eef8] bg-white px-3 py-3 text-left hover:bg-[#f8fbff]">
              <div>
                <p className="text-sm font-black text-[#0f172a]">{title}</p>
                <p className="mt-1 text-xs font-medium text-[#64748b]">{description}</p>
              </div>
              <span className="text-base font-bold text-[#2563eb]">›</span>
            </button>
          ))}
        </div>
      </OverviewRailCard>
      <OverviewRailCard title="Content Status">
        <ContentStatusCard content={allContent} coupons={coupons} />
      </OverviewRailCard>
    </div>
  </div>
);

const AddContentModal = ({ form, setForm, saving, onClose, onSubmit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
    <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h3 className="text-xl font-black text-slate-900">Add Content</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Create a new CMS section with real backend payload.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">Close</button>
      </div>
      <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
        <FieldRow label="Page">
          <select value={form.page} onChange={(event) => setForm((current) => ({ ...current, page: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="landing">Landing</option>
            <option value="support">Support</option>
          </select>
        </FieldRow>
        <FieldRow label="Content Type">
          <select value={form.content_type} onChange={(event) => setForm((current) => ({ ...current, content_type: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="object">Object</option>
            <option value="list">List</option>
          </select>
        </FieldRow>
        <div className="md:col-span-2">
          <FieldRow label="Section Key">
            <input value={form.section} onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" placeholder="hero, footer, faq..." />
          </FieldRow>
        </div>
        <div className="md:col-span-2">
          <FieldRow label="Content Data JSON">
            <textarea value={form.content_data} onChange={(event) => setForm((current) => ({ ...current, content_data: event.target.value }))} spellCheck="false" className="min-h-[220px] w-full rounded-lg border border-slate-200 bg-white px-3 py-3 font-mono text-sm outline-none" />
          </FieldRow>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
        <button type="button" disabled={saving} onClick={onSubmit} className="rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Creating...' : 'Create Content'}
        </button>
      </div>
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
  const updateCouponType = (value) => setForm((current) => ({
    ...current,
    coupon_type: value,
    discount_type: value === 'booking' && current.discount_type === 'target_taxable' ? 'percentage' : current.discount_type,
  }));
  const formatDiscount = (coupon) => {
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
    if (coupon.discount_type === 'target_taxable') return `Final taxable Rs ${coupon.discount_value}`;
    return `Rs ${coupon.discount_value}`;
  };
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
                {form.coupon_type === 'subscription' && (
                  <option value="target_taxable">Final Taxable Amount</option>
                )}
              </select>
              <input value={form.discount_value} onChange={(event) => updateField('discount_value', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Value" type="number" min="1" />
            </div>
            {form.discount_type === 'target_taxable' && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Coupon value will become the final taxable amount. GST is calculated after this amount.
              </p>
            )}
            <select value={form.coupon_type} onChange={(event) => updateCouponType(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
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
                  <td className="px-4 py-3">{formatDiscount(coupon)}</td>
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

const ContentStatusCard = ({ content, coupons }) => {
  const active = content.filter((item) => item.is_active !== false).length;
  const inactive = content.filter((item) => item.is_active === false).length;
  const draft = Math.max(coupons.filter((coupon) => coupon.is_active === false).length - inactive, 0);
  const scheduled = 0;
  const total = active + inactive + draft + scheduled;
  const segments = [
    ['Active', active, '#16a34a'],
    ['Inactive', inactive, '#fb7185'],
    ['Draft', draft, '#818cf8'],
    ['Scheduled', scheduled, '#f59e0b'],
  ];
  const gradientStops = segments.reduce((accumulator, [, value, color]) => {
    if (!total || !value) return accumulator;
    const previous = accumulator.length ? accumulator[accumulator.length - 1].end : 0;
    const next = previous + (value / total) * 100;
    accumulator.push({ color, start: previous, end: next });
    return accumulator;
  }, []);
  const donut = gradientStops.length
    ? `conic-gradient(${gradientStops.map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`).join(', ')})`
    : 'conic-gradient(#e2e8f0 0% 100%)';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 rounded-full" style={{ background: donut }}>
          <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white text-center">
            <span className="text-[1.8rem] font-black leading-none text-[#0f172a]">{content.length}</span>
            <span className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">Sections</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {segments.map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-semibold text-[#334155]">{label}</span>
              </div>
              <span className="font-black text-[#0f172a]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContentInventory = ({ content, compact = false, search = '', setSearch, filters, setFilters, showFilters, setShowFilters, onResetFilters, onAddContent, onView, onToggleContent, openActionId, setOpenActionId }) => (
  <Panel className="overflow-hidden rounded-[26px] border border-[#e7edf8] bg-white shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
    <div className="border-b border-[#edf2fb] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3e8] text-[#f59e0b]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[1.35rem] font-black text-[#0f172a]">CMS Content Inventory</h2>
              <p className="text-sm font-medium text-[#64748b]">List of all pages and content sections used on the website and other CMS.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-[240px] items-center gap-2 rounded-2xl border border-[#dbe5f4] bg-white px-3 py-2.5">
            <Search className="h-4 w-4 text-[#94a3b8]" />
            <input value={search} onChange={(event) => setSearch?.(event.target.value)} className="w-full bg-transparent text-sm font-medium text-[#0f172a] outline-none" placeholder="Search content, section, type..." />
          </div>
          <button type="button" onClick={() => setShowFilters?.((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#dbe5f4] px-4 py-2.5 text-sm font-bold text-[#1e3a8a]">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button type="button" onClick={onAddContent} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(30,58,138,0.25)]">
            <Plus className="h-4 w-4" />
            Add Content
          </button>
        </div>
      </div>
      {showFilters ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[#e7edf8] bg-[#f8fbff] p-4 md:grid-cols-4">
          <select value={filters?.page || 'all'} onChange={(event) => setFilters?.((current) => ({ ...current, page: event.target.value }))} className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none">
            <option value="all">All Pages</option>
            <option value="landing">Landing</option>
            <option value="support">Support</option>
          </select>
          <select value={filters?.type || 'all'} onChange={(event) => setFilters?.((current) => ({ ...current, type: event.target.value }))} className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none">
            <option value="all">All Types</option>
            <option value="object">Object</option>
            <option value="list">List</option>
          </select>
          <select value={filters?.status || 'all'} onChange={(event) => setFilters?.((current) => ({ ...current, status: event.target.value }))} className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="button" onClick={onResetFilters} className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold text-[#1e3a8a]">
            Reset Filters
          </button>
        </div>
      ) : null}
    </div>
    <div className="overflow-x-auto">
      <table className={`w-full text-left ${compact ? 'min-w-[980px]' : 'min-w-[1040px]'}`}>
        <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.16em] text-[#64748b]">
          <tr>
            {['#', 'Name', 'Section', 'Type', 'Status', 'Updated On', 'Actions'].map((heading) => (
              <th key={heading} className="px-5 py-3 font-extrabold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf2fb]">
          {content.map((item, index) => {
            const updated = formatContentDate(item.updated_at);
            return (
              <tr key={item.content_id || `${item.page}-${item.section}`} className="align-top">
                <td className="px-5 py-4 text-sm font-bold text-[#0f172a]">{index + 1}</td>
                <td className="px-5 py-4">
                  <p className="text-sm font-black capitalize text-[#0f172a]">{item.page || 'Landing'}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-black text-[#0f172a]">{String(item.section || '-').replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs font-medium text-[#64748b]">{getContentSectionDescription(item)}</p>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-[#334155]">{item.content_type || 'object'}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={item.is_active === false ? 'inactive' : 'active'} />
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-bold text-[#0f172a]">{updated.date}</p>
                  <p className="mt-1 text-xs font-medium text-[#64748b]">{updated.time}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="relative flex items-center gap-2">
                    <button type="button" onClick={() => onView?.(item)} className="inline-flex items-center gap-2 rounded-xl border border-[#dbe5f4] px-3 py-2 text-sm font-bold text-[#1e3a8a]">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button type="button" onClick={() => setOpenActionId?.((current) => (current === item.content_id ? '' : item.content_id))} aria-label="More actions" className="rounded-xl border border-[#dbe5f4] p-2 text-[#64748b]">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openActionId === item.content_id ? (
                      <div className="absolute right-0 top-12 z-10 w-44 rounded-2xl border border-[#dbe5f4] bg-white p-2 shadow-[0_18px_35px_rgba(15,23,42,0.12)]">
                        <button type="button" onClick={() => onView?.(item)} className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#0f172a] hover:bg-[#f8fbff]">
                          Edit Content
                        </button>
                        <button type="button" onClick={() => onToggleContent?.(item)} className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#0f172a] hover:bg-[#f8fbff]">
                          {item.is_active === false ? 'Activate Section' : 'Deactivate Section'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!content.length && (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-[#64748b]">No CMS content found.</p>
        </div>
      )}
    </div>
    <div className="flex flex-col gap-3 border-t border-[#edf2fb] px-5 py-4 text-sm md:flex-row md:items-center md:justify-between">
      <p className="font-medium text-[#64748b]">
        Showing 1 to {content.length} of {content.length} content sections
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe5f4] bg-white px-4 py-2 font-bold text-[#0f172a]">
          10 / page
          <CalendarDays className="h-4 w-4 text-[#64748b]" />
        </button>
        <div className="flex items-center gap-2">
          {[1, 2].map((page) => (
            <button
              key={page}
              type="button"
              className={`h-10 min-w-[40px] rounded-xl border text-sm font-bold ${
                page === 1 ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#dbe5f4] bg-white text-[#0f172a]'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    </div>
  </Panel>
);

export default MarketingCms;
