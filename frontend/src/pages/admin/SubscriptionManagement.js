import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Edit3, PlusCircle, PauseCircle, Search, Trash2, XCircle, Download } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestConfirm, requestReason, showNotice, Pagination } from './shared';

const tabs = [
  ['all', 'All Subscriptions'],
  ['trial', 'Trial'],
  ['active', 'Active'],
  ['expiring_soon', 'Expiring Soon'],
  ['expired', 'Expired'],
  ['cancelled', 'Cancelled'],
  ['plans', 'Plan Catalog'],
];

const SubscriptionManagement = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', subscriptions: [], plans: [], metrics: {} });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [subs, plans] = await Promise.all([
        adminPhase1API.subscriptions({ tab: tab === 'plans' ? 'all' : tab, search }),
        adminPhase1API.subscriptionPlans(),
      ]);
      setState({
        loading: false,
        error: '',
        subscriptions: subs.data.data.subscriptions,
        metrics: subs.data.data.metrics,
        plans: plans.data.data.plans,
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.detail || 'Failed to load subscriptions' }));
    }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const response = await adminPhase1API.exportAnalytics({ module: 'subscriptions' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      await showNotice({
        title: 'Export Failed',
        description: error.response?.data?.detail || 'Failed to export subscriptions CSV.',
        eyebrow: 'Action Failed',
      });
    }
  };

  const updateSubscriptionStatus = async (subscription, status) => {
    const reason = await requestReason({
      title: 'Subscription Status Reason',
      description: `Marking subscription as ${status}.`,
      placeholder: 'Add subscription status reason.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.updateSubscriptionStatus(subscription.subscription_id, { status, reason });
    load();
  };

  const deleteSubscription = async (subscription) => {
    const reason = await requestReason({
      title: 'Delete Cancelled Subscription',
      description: `Deleting cancelled subscription ${subscription.subscription_id}.`,
      placeholder: 'Add reason for deleting this cancelled subscription.',
      minLength: 3,
      confirmLabel: 'Delete Subscription',
    });
    if (!reason) return;
    try {
      await adminPhase1API.deleteSubscription(subscription.subscription_id, { reason });
      await load();
    } catch (error) {
      await showNotice({
        title: 'Delete Failed',
        description: error.response?.data?.detail || 'Failed to delete cancelled subscription. Please restart backend and try again.',
        eyebrow: 'Action Failed',
      });
    }
  };

  const updatePlanStatus = async (plan, isActive) => {
    const reason = await requestReason({
      title: 'Plan Status Reason',
      description: `${isActive ? 'Activating' : 'Pausing'} this subscription plan.`,
      placeholder: 'Add plan status change reason.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.updateSubscriptionPlanStatus(plan.plan_id, { is_active: isActive, reason });
    load();
  };

  const createPlan = async (payload) => {
    await adminPhase1API.createSubscriptionPlan(payload);
    await load();
  };

  const updatePlan = async (planId, payload) => {
    await adminPhase1API.updateSubscriptionPlan(planId, payload);
    await load();
  };

  const deletePlan = async (plan) => {
    const confirmed = await requestConfirm({
      title: 'Delete Subscription Plan',
      description: `Delete plan "${plan.plan_name}"? Existing subscriptions will stay unchanged.`,
      confirmLabel: 'Delete Plan',
      tone: 'danger',
    });
    if (!confirmed) return;
    await adminPhase1API.deleteSubscriptionPlan(plan.plan_id);
    await load();
  };

  const rows = useMemo(() => state.subscriptions || [], [state.subscriptions]);

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        description="Manage host plans, trial, active, expired and cancelled subscriptions with property status sync."
        action={tab !== 'plans' && (
          <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-[#e8f0ff] text-[#2f6df6] shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>{label}</button>)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search subscription, host, property or plan ID" />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : tab === 'plans' ? (
        <PlanCatalog plans={state.plans} onStatus={updatePlanStatus} onCreate={createPlan} onUpdate={updatePlan} onDelete={deletePlan} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Trial', state.metrics.trial || 0],
              ['Active', state.metrics.active || 0],
              ['Expired', state.metrics.expired || 0],
              ['Cancelled', state.metrics.cancelled || 0],
              ['Active Revenue', formatMoney(state.metrics.revenue || 0)],
            ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
          </div>
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Subscription', 'Host', 'Property', 'Plan', 'Cycle', 'Amount', 'End Date', 'Payment Ref', 'Status', 'Actions'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice((page - 1) * 10, page * 10).map((subscription) => (
                    <tr key={subscription.subscription_id}>
                      <td className="px-4 py-3"><p className="font-black">{subscription.subscription_id}</p><p className="text-xs text-slate-500">{subscription.days_remaining ?? '-'} days left</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{subscription.host?.full_name || subscription.user_id}</p><p className="text-xs text-slate-500">{subscription.host?.phone || subscription.host?.email || '-'}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{subscription.property?.title || subscription.property_id || '-'}</p><p className="text-xs text-slate-500">{subscription.property?.city || '-'}</p></td>
                      <td className="px-4 py-3">{subscription.plan?.plan_name || subscription.plan_id}</td>
                      <td className="px-4 py-3 capitalize">{subscription.billing_cycle}</td>
                      <td className="px-4 py-3">{formatMoney(subscription.amount || 0)}</td>
                      <td className="px-4 py-3">{String(subscription.end_date || '-')}</td>
                      <td className="px-4 py-3 font-mono text-xs">{subscription.payment_reference || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge value={subscription.status} /></td>
                      <td className="px-4 py-3"><SubscriptionActions subscription={subscription} onStatus={updateSubscriptionStatus} onDelete={deleteSubscription} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <p className="p-6 text-sm text-slate-500">No subscriptions found.</p>}
            </div>
          </Panel>
          <Pagination currentPage={page} totalItems={rows.length} itemsPerPage={10} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

const SubscriptionActions = ({ subscription, onStatus, onDelete }) => (
  <div className="flex flex-wrap gap-1">
    <button onClick={() => onStatus(subscription, 'active')} className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]"><CheckCircle2 className="h-3.5 w-3.5" /> Active</button>
    <button onClick={() => onStatus(subscription, 'expired')} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"><PauseCircle className="h-3.5 w-3.5" /> Expire</button>
    <button onClick={() => onStatus(subscription, 'cancelled')} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
    {subscription.status === 'cancelled' && (
      <button onClick={() => onDelete(subscription)} className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-800"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
    )}
  </div>
);

const PLAN_CATEGORY_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'event_venue', label: 'Event Venue' },
];

const PLAN_PROPERTY_OPTIONS = {
  residential: [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'bungalow', label: 'Bungalow' },
    { value: 'studio', label: 'Studio' },
    { value: 'independent_house', label: 'Private House' },
    { value: 'farmhouse', label: 'Farmhouse' },
  ],
  commercial: [
    { value: 'private_office', label: 'Private Office' },
    { value: 'co_working', label: 'Co-working' },
    { value: 'meeting_room', label: 'Meeting Room' },
    { value: 'conference_room', label: 'Conference Room' },
    { value: 'shop', label: 'Shop/Showroom' },
    { value: 'warehouse', label: 'Warehouse' },
  ],
  event_venue: [
    { value: 'banquet_hall', label: 'Banquet' },
    { value: 'hotel_ballroom', label: 'Hotel Ballroom' },
    { value: 'wedding_venue', label: 'Wedding Venue' },
  ],
};

const PLAN_TYPE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: '1bhk', label: '1 BHK' },
  { value: '2bhk', label: '2 BHK' },
  { value: '3bhk', label: '3 BHK' },
  { value: '4bhk', label: '4 BHK' },
  { value: '4bhk_plus', label: '5+ BHK' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'event_venue', label: 'Event Venue' },
];

const inferPlanCategory = (plan) => (
  plan.property_category
  || (plan.plan_type === 'commercial' ? 'commercial' : plan.plan_type === 'event_venue' || plan.plan_type === 'banquet' ? 'event_venue' : 'residential')
);

const parseSqftRange = (rangeText) => {
  const text = String(rangeText || '').toLowerCase().replace(/sq\.?ft/g, '').replace(/,/g, '').replace(/\s/g, '');
  if (!text) return { sqft_from: '', sqft_to: '' };
  if (text.endsWith('+')) return { sqft_from: text.slice(0, -1), sqft_to: '' };
  if (text.startsWith('>=')) return { sqft_from: text.slice(2), sqft_to: '' };
  if (text.startsWith('>')) return { sqft_from: String(Number(text.slice(1)) + 1), sqft_to: '' };
  if (text.startsWith('<=')) return { sqft_from: '', sqft_to: text.slice(2) };
  if (text.startsWith('<')) return { sqft_from: '', sqft_to: String(Number(text.slice(1)) - 1) };
  if (text.includes('-')) {
    const [from, to] = text.split('-');
    return { sqft_from: from || '', sqft_to: to || '' };
  }
  return { sqft_from: text, sqft_to: '' };
};

const buildSqftRange = (from, to) => {
  const start = String(from || '').trim();
  const end = String(to || '').trim();
  if (start && end) return `${start}-${end}`;
  if (start) return `${start}+`;
  if (end) return `<=${end}`;
  return '';
};

const emptyPlan = {
  plan_name: '',
  plan_type: '1bhk',
  property_category: 'residential',
  property_type: 'apartment',
  sqft_from: '',
  sqft_to: '',
  price_monthly: '',
  platform_fee: '',
  tax_percent: 18,
  validity_days: 30,
  description: '',
};

const planToForm = (plan) => ({
  ...parseSqftRange(plan.sqft_range),
  plan_name: plan.plan_name || '',
  plan_type: plan.plan_type || '1bhk',
  property_category: inferPlanCategory(plan),
  property_type: plan.property_type || PLAN_PROPERTY_OPTIONS[inferPlanCategory(plan)]?.[0]?.value || '',
  price_monthly: plan.price_monthly || '',
  platform_fee: plan.platform_fee || '',
  tax_percent: plan.tax_percent ?? 18,
  validity_days: plan.validity_days || 30,
  description: plan.description || '',
});

const Field = ({ label, help, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>
    {children}
    <span className="mt-1 block text-[11px] font-semibold text-slate-500">{help}</span>
  </label>
);

const PlanCatalog = ({ plans, onStatus, onCreate, onUpdate, onDelete }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCategory = (value) => {
    const firstPropertyType = PLAN_PROPERTY_OPTIONS[value]?.[0]?.value || '';
    setForm((current) => ({
      ...current,
      property_category: value,
      property_type: firstPropertyType,
      plan_type: value === 'commercial' ? 'commercial' : value === 'event_venue' ? 'event_venue' : current.plan_type === 'commercial' || current.plan_type === 'event_venue' ? '1bhk' : current.plan_type,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.plan_name || !form.price_monthly || !form.description) {
      setError('Plan name, monthly price and description are required');
      return;
    }
    try {
      setSaving(true);
      const monthly = Number(form.price_monthly);
      const payload = {
        ...form,
        price_monthly: monthly,
        price_annual: monthly * 10,
        platform_fee: Number(form.platform_fee || 0),
        tax_percent: Number(form.tax_percent || 0),
        validity_days: Number(form.validity_days || 30),
        property_category: form.property_category || null,
        property_type: form.property_type || null,
        sqft_range: buildSqftRange(form.sqft_from, form.sqft_to) || null,
      };
      delete payload.sqft_from;
      delete payload.sqft_to;
      if (editingPlanId) {
        await onUpdate(editingPlanId, payload);
      } else {
        await onCreate(payload);
      }
      setForm(emptyPlan);
      setShowCreate(false);
      setEditingPlanId('');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Failed to save subscription plan');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (plan) => {
    setError('');
    setEditingPlanId(plan.plan_id);
    setForm(planToForm(plan));
    setShowCreate(true);
  };

  const cancelEdit = () => {
    setForm(emptyPlan);
    setEditingPlanId('');
    setShowCreate(false);
    setError('');
  };

  return (
  <div className="space-y-4">
    <Panel className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-black">Plan Catalog</h2>
          <p className="text-sm text-slate-500">Create and manage subscription plans shown to hosts.</p>
        </div>
        <button onClick={() => (showCreate ? cancelEdit() : setShowCreate(true))} className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white">
          <PlusCircle className="h-4 w-4" /> {showCreate ? 'Close Form' : 'Create Plan'}
        </button>
      </div>
      {showCreate && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Plan Name" help="Example: Family Stay, Premium Stay, Villa 3BHK Plan">
            <input value={form.plan_name} onChange={(event) => update('plan_name', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Enter plan display name" />
          </Field>
          <Field label="Plan Type" help="Residential sathi BHK, commercial/event venue sathi category type">
            <select value={form.plan_type} onChange={(event) => update('plan_type', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
              {PLAN_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Property Category" help="Host property listing madhe je category options aahet tech">
            <select value={form.property_category} onChange={(event) => updateCategory(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
              {PLAN_CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Property Type" help="Selected category nusar host listing madhle same property types">
            <select value={form.property_type} onChange={(event) => update('property_type', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
              {(PLAN_PROPERTY_OPTIONS[form.property_category] || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Monthly Price" help="Host kadun mahinyala charge honari plan fee">
            <input value={form.price_monthly} onChange={(event) => update('price_monthly', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 3000" type="number" min="0" />
          </Field>
          <Field label="Platform Fee" help="Extra platform/service fee amount, optional">
            <input value={form.platform_fee} onChange={(event) => update('platform_fee', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 150" type="number" min="0" />
          </Field>
          <Field label="Tax Percent" help="GST/tax percentage, example 18">
            <input value={form.tax_percent} onChange={(event) => update('tax_percent', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 18" type="number" min="0" />
          </Field>
          <Field label="Validity Days" help="Plan active rahnar divas, example 30">
            <input value={form.validity_days} onChange={(event) => update('validity_days', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 30" type="number" min="1" />
          </Field>
          <Field label="Sq.ft From" help="Minimum area. Example: 2501">
            <input value={form.sqft_from} onChange={(event) => update('sqft_from', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 2501" type="number" min="0" />
          </Field>
          <Field label="Sq.ft To" help="Maximum area blank thevla tar From+ hoil">
            <input value={form.sqft_to} onChange={(event) => update('sqft_to', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: 10000" type="number" min="0" />
          </Field>
          <Field label="Description" help="Host la plan card madhe disnar short description">
            <input value={form.description} onChange={(event) => update('description', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Example: Ideal for 1BHK apartments" />
          </Field>
          {error && <p className="text-sm font-bold text-red-700 md:col-span-2 xl:col-span-3">{error}</p>}
          <button disabled={saving} className="self-end rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{saving ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Save Plan'}</button>
        </form>
      )}
    </Panel>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => (
      <Panel key={plan.plan_id} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-black">{plan.plan_name}</p><p className="text-xs text-slate-500">{plan.plan_id}</p></div>
          <StatusBadge value={plan.is_active ? 'active' : 'inactive'} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <p><span className="block text-xs font-bold uppercase text-slate-500">Monthly</span>{formatMoney(plan.price_monthly || 0)}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Platform Fee</span>{formatMoney(plan.platform_fee || 0)}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Tax</span>{plan.tax_percent || 0}%</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Category</span>{(plan.property_category || inferPlanCategory(plan) || '-').replace(/_/g, ' ')}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Type</span>{(plan.property_type || '-').replace(/_/g, ' ')}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Sq.ft Range</span>{plan.sqft_range || '-'}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Active Subs</span>{plan.active_subscriptions || 0}</p>
          <p><span className="block text-xs font-bold uppercase text-slate-500">Trial Subs</span>{plan.trial_subscriptions || 0}</p>
        </div>
        <p className="mt-3 text-sm text-slate-600">{plan.description || '-'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onStatus(plan, true)} className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]"><CreditCard className="h-3.5 w-3.5" /> Activate</button>
          <button onClick={() => onStatus(plan, false)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Pause</button>
          <button onClick={() => startEdit(plan)} className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
          <button onClick={() => onDelete(plan)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>
      </Panel>
      ))}
      {!plans.length && <Panel className="p-6 text-sm text-slate-500">No plans found.</Panel>}
    </div>
  </div>
  );
};

export default SubscriptionManagement;
