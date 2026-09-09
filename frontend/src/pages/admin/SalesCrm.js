import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Eye,
  Filter,
  Funnel,
  MailPlus,
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import apiClient from '../../services/api';
import { ErrorState, LoadingState, Panel, StatusBadge, requestInput, requestReason, showNotice } from './shared';

const phaseSteps = [
  ['1', 'Sales & CRM Overview', 'Understand lead flow', 'completed'],
  ['2', 'Lead Directory', 'Manage all leads', 'completed'],
  ['3', 'Lead Assignment', 'Assign to sales team', 'completed'],
  ['4', 'Sales Reports & Analytics', 'Track performance', 'completed'],
];

const leadStatusTabs = [
  ['', 'All Leads'],
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['qualified', 'Qualified'],
  ['converted', 'Converted'],
  ['lost', 'Lost'],
];

const crmTabs = [
  ['dashboard', 'CRM Dashboard'],
  ['directory', 'Lead Directory'],
  ['pipeline', 'Pipeline'],
  ['reports', 'Reports'],
];

const pipelineStages = [
  ['new', 'New'],
  ['qualified', 'Qualified'],
  ['site_visit', 'Site Visit'],
  ['proposal', 'Proposal'],
  ['negotiation', 'Negotiation'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];

const defaultLeadForm = {
  full_name: '',
  phone: '',
  email: '',
  city: '',
  property_type: 'residential',
  from_date: '',
  to_date: '',
  property_id: '',
  property_title: '',
  notes: '',
};

const crmDateRangeLabel = '01 May 2026 - 31 May 2026';
const metricTones = [
  'bg-[#eef5ff] text-[#2563eb]',
  'bg-[#f5edff] text-[#8b5cf6]',
  'bg-[#eef5ff] text-[#2563eb]',
  'bg-[#f4edff] text-[#7c3aed]',
  'bg-emerald-50 text-emerald-600',
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const leadBudgetLabel = (lead) => {
  const min = Number(lead.budget_min || lead.min_budget || lead.budget?.min || 0);
  const max = Number(lead.budget_max || lead.max_budget || lead.budget?.max || 0);
  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  if (max) return formatCurrency(max);
  if (min) return `${formatCurrency(min)}+`;
  return '-';
};

const leadAgeLabel = (lead) => {
  const age = Number(lead.age_hours || 0);
  if (age < 1) return 'Just now';
  if (age < 24) return `${Math.round(age)} hrs`;
  const days = Math.max(1, Math.round(age / 24));
  return `${days} day${days === 1 ? '' : 's'}`;
};

const requirementLabel = (lead) => {
  const propertyType = String(lead.property_type || lead.requirement || '').replace(/_/g, ' ').trim();
  if (!propertyType) return 'General inquiry';
  return propertyType.replace(/\b\w/g, (char) => char.toUpperCase());
};

const sourceLabel = (lead) => {
  const value = String(lead.source || lead.lead_source || 'manual');
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const SalesMetricCard = ({ label, value, icon: Icon, helper, trend, tone }) => (
  <Panel className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
    <div className="flex items-start justify-between gap-4">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5c6b8c]">{label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[2rem] font-black leading-none tracking-[-0.04em] text-slate-950">{value}</p>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600">↑ {trend}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
      </div>
    </div>
  </Panel>
);

const OverviewRailCard = ({ title, actionLabel, onAction, children }) => (
  <Panel className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[1.2rem] font-black text-slate-950">{title}</h2>
      {actionLabel ? <button type="button" onClick={onAction} className="text-sm font-black text-[#2563eb]">{actionLabel}</button> : null}
    </div>
    <div className="mt-4">{children}</div>
  </Panel>
);

const EmptyLeadState = ({ onAddLead }) => (
  <div className="flex min-h-[410px] flex-col items-center justify-center px-6 py-12 text-center">
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_#eef5ff,_#dfeaff)] text-[#4f7cff]">
      <MailPlus className="h-10 w-10" />
    </div>
    <h3 className="mt-6 text-[2rem] font-black tracking-[-0.04em] text-slate-950">No leads found</h3>
    <p className="mt-2 max-w-md text-sm font-medium text-slate-500">Try adjusting your filters or add a new lead to get started.</p>
    <button type="button" onClick={onAddLead} className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#163b93] px-6 text-sm font-black text-white shadow-[0_18px_30px_rgba(22,59,147,0.25)] hover:bg-[#12327d]">
      <Plus className="h-4 w-4" /> Add New Lead
    </button>
  </div>
);

const AddLeadModal = ({ open, form, setForm, submitting, onClose, onSubmit }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-slate-950">Add Lead</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Create a new CRM lead with required inquiry details.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">Close</button>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" placeholder="Lead name *" />
          <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" placeholder="Mobile *" />
          <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" placeholder="Email" />
          <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" placeholder="City" />
          <select value={form.property_type} onChange={(event) => setForm((current) => ({ ...current, property_type: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none">
            <option value="residential">Residential Stays</option>
            <option value="commercial">Workspaces</option>
            <option value="event_venue">Event Venues</option>
          </select>
          <input value={form.property_title} onChange={(event) => setForm((current) => ({ ...current, property_title: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" placeholder="Interested property" />
          <input type="date" value={form.from_date} onChange={(event) => setForm((current) => ({ ...current, from_date: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" />
          <input type="date" value={form.to_date} onChange={(event) => setForm((current) => ({ ...current, to_date: event.target.value }))} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none" />
          <div className="md:col-span-2">
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-[140px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none" placeholder="Notes" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">Cancel</button>
          <button type="button" disabled={submitting} onClick={onSubmit} className="rounded-xl bg-[#163b93] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
            {submitting ? 'Saving...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesCrm = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [active, setActive] = useState('dashboard');
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);
  const [state, setState] = useState({ loading: true, error: '', metrics: {}, leads: [], charts: {}, pipeline: { summary: {}, overdue: [], upcoming: [] }, reports: { summary: {}, lost_leads: [], lost_reasons: [], owner_performance: [], zoho_readiness: {} }, assignees: { brokers: [], relationship_managers: [], team_leaders: [] } });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [dashboardRes, leadsRes] = await Promise.all([
        adminPhase1API.crmDashboard({ search, status_filter: statusFilter }),
        adminPhase1API.crmLeads({ search, status_filter: statusFilter, property_type: propertyType, city }),
      ]);
      const [assigneesRes, pipelineRes, reportsRes] = await Promise.allSettled([
        adminPhase1API.crmAssignees(),
        adminPhase1API.crmPipeline(),
        adminPhase1API.crmReports(),
      ]);
      setState({
        loading: false,
        error: '',
        ...dashboardRes.data.data,
        leads: leadsRes.data.data.leads || [],
        assignees: assigneesRes.status === 'fulfilled' ? assigneesRes.value.data.data : { brokers: [], relationship_managers: [], team_leaders: [] },
        pipeline: pipelineRes.status === 'fulfilled' ? pipelineRes.value.data.data : { summary: {}, overdue: [], upcoming: [] },
        reports: reportsRes.status === 'fulfilled' ? reportsRes.value.data.data : { summary: {}, lost_leads: [], lost_reasons: [], owner_performance: [], zoho_readiness: {} },
      });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load CRM dashboard', metrics: {}, leads: [], charts: {}, pipeline: { summary: {}, overdue: [], upcoming: [] }, reports: { summary: {}, lost_leads: [], lost_reasons: [], owner_performance: [], zoho_readiness: {} }, assignees: { brokers: [], relationship_managers: [], team_leaders: [] } });
    }
  }, [city, propertyType, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const conversionRate = useMemo(() => {
    const total = Number(state.metrics.total || 0);
    return total ? Math.round((Number(state.metrics.converted || 0) / total) * 100) : 0;
  }, [state.metrics]);

  const cityOptions = useMemo(() => Array.from(new Set((state.leads || []).map((lead) => lead.city).filter(Boolean))).sort(), [state.leads]);

  const metrics = [
    ['Total Leads', state.metrics.total || 0, Users, 'vs last month', '0%'],
    ['New Leads', state.metrics.new || 0, MailPlus, 'vs last month', '0%'],
    ['Contacted', state.metrics.contacted || 0, UserCheck, 'vs last month', '0%'],
    ['Converted', state.metrics.converted || 0, TrendingUp, 'vs last month', '0%'],
    ['Conversion Rate', `${conversionRate}%`, Funnel, 'vs last month', '0%'],
  ];

  const updateLead = async (lead, status) => {
    const notes = await requestInput({
      title: 'Lead Notes',
      description: `Update notes for ${lead.lead_id || lead.full_name || 'lead'}.`,
      label: 'Notes',
      defaultValue: lead.notes || '',
      inputType: 'textarea',
      confirmLabel: 'Continue',
      allowEmpty: true,
    });
    if (notes === null) return;
    const reason = await requestReason({ title: 'Lead Update Reason', description: `Updating lead ${lead.lead_id || lead.full_name || ''}.`, placeholder: 'Add lead update reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateCrmLead(lead.lead_id, { status, notes, reason });
    await load();
  };

  const formatAssigneeOptions = (users) => users.map((user) => `${user.user_id} - ${user.full_name || user.name || user.email || user.phone || 'Unnamed'}`).join('\n');

  const assignLead = async (lead) => {
    const brokerId = await requestInput({ title: 'Assign Broker', description: formatAssigneeOptions(state.assignees.brokers || []) || 'No active brokers found', label: 'Broker ID', defaultValue: lead.broker_id || '', confirmLabel: 'Continue', allowEmpty: true });
    if (brokerId === null) return;
    const rmId = await requestInput({ title: 'Assign Relationship Manager', description: formatAssigneeOptions(state.assignees.relationship_managers || []) || 'No active employees found', label: 'Relationship Manager ID', defaultValue: lead.rm_id || '', confirmLabel: 'Continue', allowEmpty: true });
    if (rmId === null) return;
    const teamLeaderId = await requestInput({ title: 'Assign Team Leader', description: formatAssigneeOptions(state.assignees.team_leaders || []) || 'No active team leaders found', label: 'Team Leader ID', defaultValue: lead.team_leader_id || '', confirmLabel: 'Continue', allowEmpty: true });
    if (teamLeaderId === null) return;
    const reason = await requestReason({ title: 'Lead Assignment Reason', description: 'Lead ownership assignment will be audited.', defaultValue: 'Lead ownership assigned from CRM admin', placeholder: 'Add assignment reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.assignCrmLead(lead.lead_id, { broker_id: brokerId.trim(), rm_id: rmId.trim(), team_leader_id: teamLeaderId.trim(), reason });
    await load();
  };

  const updatePipeline = async (lead) => {
    const stage = await requestInput({ title: 'Pipeline Stage', description: pipelineStages.map(([id, label]) => `${id} - ${label}`).join('\n'), label: 'Stage', defaultValue: lead.pipeline_stage || lead.status || 'qualified', confirmLabel: 'Continue' });
    if (stage === null) return;
    const nextFollowUpAt = await requestInput({ title: 'Next Follow-up', description: 'Optional date/time format: YYYY-MM-DD or YYYY-MM-DDTHH:mm', label: 'Next Follow-up At', defaultValue: lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16) : '', confirmLabel: 'Continue', allowEmpty: true });
    if (nextFollowUpAt === null) return;
    const followUpStatus = await requestInput({ title: 'Follow-up Status', description: 'Enter follow-up status.', label: 'Follow-up Status', defaultValue: lead.follow_up_status || 'scheduled', confirmLabel: 'Continue' });
    if (followUpStatus === null) return;
    const notes = await requestInput({ title: 'Follow-up Notes', description: 'Add notes for this sales follow-up.', label: 'Notes', defaultValue: lead.notes || '', inputType: 'textarea', confirmLabel: 'Continue', allowEmpty: true });
    if (notes === null) return;
    const reason = await requestReason({ title: 'Pipeline Update Reason', description: 'Sales pipeline follow-up will be audited.', defaultValue: 'Sales pipeline follow-up updated', placeholder: 'Add pipeline update reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateCrmPipeline(lead.lead_id, { pipeline_stage: stage.trim(), next_follow_up_at: nextFollowUpAt.trim(), follow_up_status: followUpStatus.trim(), notes, reason });
    await load();
  };

  const createLead = async () => {
    if (!leadForm.full_name.trim() || !leadForm.phone.trim()) {
      await showNotice({ title: 'Missing Required Fields', description: 'Lead name and mobile are required.', eyebrow: 'Validation Error' });
      return;
    }
    setCreatingLead(true);
    try {
      await apiClient.post('/broker/leads', {
        full_name: leadForm.full_name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim() || null,
        city: leadForm.city.trim(),
        property_type: leadForm.property_type,
        from_date: leadForm.from_date || null,
        to_date: leadForm.to_date || null,
        property_id: leadForm.property_id || null,
        property_title: leadForm.property_title.trim() || null,
        notes: leadForm.notes.trim() || null,
      });
      setLeadForm(defaultLeadForm);
      setShowAddLead(false);
      await load();
      await showNotice({ title: 'Lead created', description: 'New lead added successfully.', eyebrow: 'Sales & CRM' });
    } catch (error) {
      await showNotice({ title: 'Lead create unavailable', description: error.response?.data?.detail || 'Lead creation endpoint is not available for this admin account yet.', eyebrow: 'Sales & CRM' });
    } finally {
      setCreatingLead(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setPropertyType('');
    setCity('');
    setStatusFilter('');
    setShowFilters(false);
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-[30px] border border-[#e8eef8] bg-white p-5 shadow-[0_20px_44px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                <span>Sales &amp; CRM</span>
                <span className="text-slate-300">&gt;</span>
                <span className="text-[#2563eb]">{crmTabs.find(([id]) => id === active)?.[1] || 'CRM Dashboard'}</span>
              </div>
              <h1 className="mt-2 text-[2.2rem] font-black tracking-[-0.04em] text-slate-950">Sales &amp; CRM</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Manage leads, inquiries, follow-ups, sales pipeline and customer performance.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setActive('reports')} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">
                <CalendarDays className="h-4 w-4 text-[#2563eb]" />
                {crmDateRangeLabel}
              </button>
              <button type="button" onClick={() => setShowAddLead(true)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#163b93] px-5 text-sm font-black text-white shadow-[0_18px_32px_rgba(22,59,147,0.24)] hover:bg-[#12327d]">
                <Plus className="h-4 w-4" />
                Add Lead
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-[22px] border border-[#e8eef8] bg-white p-2">
              {crmTabs.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setActive(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-black ${active === id ? 'bg-[#eef5ff] text-[#2563eb]' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {leadStatusTabs.map(([id, label]) => (
                <button key={label} type="button" onClick={() => setStatusFilter(id)} className={`rounded-2xl border px-4 py-2.5 text-sm font-black ${statusFilter === id ? 'border-[#bfdbfe] bg-[#eef5ff] text-[#2563eb]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e8eef8] bg-white p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_120px]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm font-medium outline-none" placeholder="Search by lead ID, name, phone, email, city or property..." />
              </div>
              <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none">
                <option value="">All Property Types</option>
                <option value="residential">Residential Stays</option>
                <option value="commercial">Workspaces</option>
                <option value="event_venue">Event Venues</option>
              </select>
              <select value={city} onChange={(event) => setCity(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none">
                <option value="">All Cities</option>
                {cityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <button type="button" onClick={() => setShowFilters((current) => !current)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
            {showFilters ? (
              <div className="mt-4 grid gap-3 rounded-2xl border border-[#e8eef8] bg-[#f8fbff] p-4 md:grid-cols-4">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none">
                  {leadStatusTabs.map(([id, label]) => <option key={label} value={id}>{label}</option>)}
                </select>
                <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none">
                  <option value="">All Property Types</option>
                  <option value="residential">Residential Stays</option>
                  <option value="commercial">Workspaces</option>
                  <option value="event_venue">Event Venues</option>
                </select>
                <select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none">
                  <option value="">All Cities</option>
                  {cityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <button type="button" onClick={resetFilters} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">Reset Filters</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metrics.map(([label, value, Icon, helper, trend], index) => (
              <SalesMetricCard key={label} label={label} value={value} icon={Icon} helper={helper} trend={trend} tone={metricTones[index]} />
            ))}
          </div>

          {active === 'dashboard' ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Panel className="overflow-hidden rounded-[24px] border border-[#e8eef8] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2563eb]">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-[1.5rem] font-black text-slate-950">Recent Leads</h2>
                        <p className="text-sm font-medium text-slate-500">Latest leads and inquiries received across all channels.</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setActive('directory')} className="rounded-2xl bg-[#eef5ff] px-4 py-2.5 text-sm font-black text-[#2563eb]">View All Leads →</button>
                </div>
                {state.leads.length ? (
                  <RecentLeadsTable leads={state.leads} onViewLead={assignLead} onOpenDirectory={() => setActive('directory')} />
                ) : (
                  <EmptyLeadState onAddLead={() => setShowAddLead(true)} />
                )}
              </Panel>

              <div className="space-y-4">
                <OverviewRailCard title="Phase 4 Steps" actionLabel="View All →" onAction={() => setActive('reports')}>
                  <div className="space-y-3">
                    {phaseSteps.map(([step, title, description, status]) => (
                      <div key={step} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f0ff] text-sm font-black text-[#2563eb]">{step}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900">{title}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
                        </div>
                        <StatusBadge value={status} />
                      </div>
                    ))}
                  </div>
                </OverviewRailCard>
                <MiniAnalyticsCard title="Lead Source Distribution" rows={(state.charts.source_distribution || []).map((row) => ({ label: sourceLabel(row), count: row.count }))} />
                <MiniAnalyticsCard title="Property Type Interest" rows={(state.charts.property_type_distribution || []).map((row) => ({ label: row.label || requirementLabel(row), count: row.count }))} />
                <MiniAnalyticsCard title="Top Cities by Leads" rows={(state.charts.city_distribution || []).map((row) => ({ label: row.city || row.label, count: row.count }))} />
              </div>
            </div>
          ) : active === 'directory' ? (
            <LeadDirectory leads={state.leads} onUpdate={updateLead} onAssign={assignLead} onPipeline={updatePipeline} onAddLead={() => setShowAddLead(true)} />
          ) : active === 'pipeline' ? (
            <PipelineBoard pipeline={state.pipeline} leads={state.leads} onPipeline={updatePipeline} />
          ) : (
            <ReportsView reports={state.reports} />
          )}
        </div>
      )}

      <AddLeadModal open={showAddLead} form={leadForm} setForm={setLeadForm} submitting={creatingLead} onClose={() => setShowAddLead(false)} onSubmit={createLead} />
    </div>
  );
};

const RecentLeadsTable = ({ leads, onViewLead, onOpenDirectory }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <tr>{['#', 'Lead ID', 'Contact', 'City', 'Requirement', 'Budget', 'Age', 'Status', 'Source', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {leads.slice(0, 10).map((lead, index) => (
          <tr key={lead.lead_id}>
            <td className="px-4 py-4 font-semibold text-slate-700">{index + 1}</td>
            <td className="px-4 py-4">
              <button type="button" onClick={onOpenDirectory} className="font-black text-slate-950 hover:text-[#2563eb]">{lead.lead_id}</button>
            </td>
            <td className="px-4 py-4">
              <p className="font-black text-slate-950">{lead.full_name || '-'}</p>
              <p className="text-xs text-slate-500">{lead.phone || lead.email || '-'}</p>
            </td>
            <td className="px-4 py-4">
              <p className="font-semibold text-slate-800">{lead.city || '-'}</p>
            </td>
            <td className="px-4 py-4">
              <p className="font-semibold text-slate-800">{requirementLabel(lead)}</p>
              <p className="text-xs text-slate-500">{lead.property_title || lead.property_id || '-'}</p>
            </td>
            <td className="px-4 py-4 font-semibold text-slate-800">{leadBudgetLabel(lead)}</td>
            <td className="px-4 py-4 font-semibold text-slate-800">{leadAgeLabel(lead)}</td>
            <td className="px-4 py-4"><StatusBadge value={lead.status || 'new'} /></td>
            <td className="px-4 py-4 font-semibold text-slate-800">{sourceLabel(lead)}</td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onViewLead(lead)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><Eye className="h-4 w-4" /></button>
                <button type="button" onClick={() => onViewLead(lead)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LeadDirectory = ({ leads, onUpdate, onAssign, onPipeline, onAddLead }) => (
  <Panel className="overflow-hidden rounded-[24px] border border-[#e8eef8] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
      <div>
        <h2 className="text-[1.4rem] font-black text-slate-950">Lead Directory</h2>
        <p className="text-sm font-medium text-slate-500">Complete admin lead list with contact, requirement, ownership and action controls.</p>
      </div>
      <button type="button" onClick={onAddLead} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#163b93] px-4 text-sm font-black text-white">
        <Plus className="h-4 w-4" /> Add Lead
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] text-left text-sm">
        <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.16em] text-slate-500">
          <tr>{['Lead', 'Contact', 'City', 'Requirement', 'Dates', 'Ownership', 'Follow-up', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.lead_id}>
              <td className="px-4 py-4"><p className="font-black text-slate-950">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
              <td className="px-4 py-4"><p>{lead.phone}</p><p className="text-xs text-slate-500">{lead.email || '-'}</p></td>
              <td className="px-4 py-4">{lead.city || '-'}</td>
              <td className="px-4 py-4"><p className="font-semibold text-slate-800">{requirementLabel(lead)}</p><p className="text-xs text-slate-500">{lead.property_title || lead.property_id || '-'}</p></td>
              <td className="px-4 py-4">{lead.from_date || '-'} to {lead.to_date || '-'}</td>
              <td className="px-4 py-4">
                <p className="font-bold">Broker: {lead.broker?.full_name || lead.broker_id || '-'}</p>
                <p className="text-xs text-slate-500">RM: {lead.rm?.full_name || lead.rm_id || '-'}</p>
                <p className="text-xs text-slate-500">TL: {lead.team_leader?.full_name || lead.team_leader_id || '-'}</p>
              </td>
              <td className="px-4 py-4"><p className="font-bold capitalize">{String(lead.pipeline_stage || lead.status || 'new').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16).replace('T', ' ') : 'No follow-up set'}</p></td>
              <td className="px-4 py-4"><StatusBadge value={lead.status} /></td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => onAssign(lead)} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Assign</button>
                  <button type="button" onClick={() => onPipeline(lead)} className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">Pipeline</button>
                  <button type="button" onClick={() => onUpdate(lead, 'contacted')} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Contacted</button>
                  <button type="button" onClick={() => onUpdate(lead, 'converted')} className="rounded-xl bg-[#2f6df6] px-2.5 py-1.5 text-xs font-bold text-white">Converted</button>
                  <button type="button" onClick={() => onUpdate(lead, 'lost')} className="rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Lost</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!leads.length && <p className="p-6 text-sm text-slate-500">No leads found.</p>}
    </div>
  </Panel>
);

const PipelineBoard = ({ pipeline, leads, onPipeline }) => (
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="space-y-4">
      <Panel className="overflow-hidden rounded-[24px] border border-[#e8eef8] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-[1.4rem] font-black text-slate-950">Sales Pipeline</h2>
          <p className="text-sm font-medium text-slate-500">Track lead stages, next actions and follow-up ageing.</p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {(pipeline.summary?.stages || []).map((row) => (
            <div key={row.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">{String(row.stage).replace(/_/g, ' ')}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{row.count}</p>
            </div>
          ))}
          {!pipeline.summary?.stages?.length && <p className="text-sm text-slate-500">No pipeline stages found.</p>}
        </div>
      </Panel>
      <Panel className="overflow-hidden rounded-[24px] border border-[#e8eef8] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-[1.4rem] font-black text-slate-950">Active Lead Follow-ups</h2>
          <p className="text-sm font-medium text-slate-500">Use the pipeline action to move stages and schedule the next touchpoint.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.16em] text-slate-500"><tr>{['Lead', 'Owner', 'Stage', 'Next Follow-up', 'Notes', 'Action'].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {leads.filter((lead) => !['converted', 'lost'].includes(lead.status)).map((lead) => <PipelineRow key={lead.lead_id} lead={lead} onPipeline={onPipeline} />)}
            </tbody>
          </table>
          {!leads.filter((lead) => !['converted', 'lost'].includes(lead.status)).length && <p className="p-6 text-sm text-slate-500">No active pipeline leads found.</p>}
        </div>
      </Panel>
    </div>
    <div className="space-y-4">
      <FollowUpPanel title="Overdue Follow-ups" count={pipeline.summary?.overdue_followups || 0} leads={pipeline.overdue || []} onPipeline={onPipeline} tone="red" />
      <FollowUpPanel title="Upcoming Follow-ups" count={pipeline.summary?.upcoming_followups || 0} leads={pipeline.upcoming || []} onPipeline={onPipeline} tone="blue" />
    </div>
  </div>
);

const PipelineRow = ({ lead, onPipeline }) => (
  <tr>
    <td className="px-4 py-4"><p className="font-black text-slate-950">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
    <td className="px-4 py-4"><p>{lead.broker?.full_name || lead.rm?.full_name || '-'}</p><p className="text-xs text-slate-500">{lead.team_leader?.full_name || lead.broker_id || '-'}</p></td>
    <td className="px-4 py-4 capitalize">{String(lead.pipeline_stage || lead.status || 'new').replace(/_/g, ' ')}</td>
    <td className="px-4 py-4">{lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16).replace('T', ' ') : '-'}</td>
    <td className="px-4 py-4 max-w-[260px] truncate">{lead.notes || '-'}</td>
    <td className="px-4 py-4"><button type="button" onClick={() => onPipeline(lead)} className="rounded-xl bg-[#2f6df6] px-3 py-1.5 text-xs font-bold text-white">Update</button></td>
  </tr>
);

const FollowUpPanel = ({ title, count, leads, onPipeline, tone }) => (
  <Panel className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[1.2rem] font-black text-slate-950">{title}</h2>
      <span className={`rounded-xl px-2.5 py-1.5 text-xs font-black ${tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-[#eef5ff] text-[#2f6df6]'}`}>{count}</span>
    </div>
    <div className="space-y-2">
      {leads.slice(0, 8).map((lead) => (
        <button key={lead.lead_id} type="button" onClick={() => onPipeline(lead)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-sm transition hover:border-blue-200 hover:bg-white">
          <p className="font-black text-slate-950">{lead.full_name}</p>
          <p className="text-xs text-slate-500">{lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16).replace('T', ' ') : 'No date'} · {lead.broker?.full_name || lead.rm?.full_name || 'Unassigned'}</p>
        </button>
      ))}
      {!leads.length && <p className="text-sm text-slate-500">No leads found.</p>}
    </div>
  </Panel>
);

const ReportsView = ({ reports }) => {
  const readiness = reports.zoho_readiness || {};
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Lost Leads', reports.summary?.lost || 0],
            ['Lost Rate', `${reports.summary?.lost_rate || 0}%`],
            ['Converted', reports.summary?.converted || 0],
            ['Zoho Ready', `${readiness.ready_percent || 0}%`],
          ].map(([label, value]) => <Panel key={label} className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></Panel>)}
        </div>
        <Panel className="overflow-hidden rounded-[24px] border border-[#e8eef8] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-[1.4rem] font-black text-slate-950">Lost Leads</h2>
            <p className="text-sm font-medium text-slate-500">Recent lost opportunities with owner and captured reason.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-[0.16em] text-slate-500"><tr>{['Lead', 'Contact', 'Requirement', 'Owner', 'Reason', 'Updated'].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(reports.lost_leads || []).map((lead) => (
                  <tr key={lead.lead_id}>
                    <td className="px-4 py-4"><p className="font-black text-slate-950">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
                    <td className="px-4 py-4"><p>{lead.phone}</p><p className="text-xs text-slate-500">{lead.email || '-'}</p></td>
                    <td className="px-4 py-4"><p className="font-semibold text-slate-800">{requirementLabel(lead)}</p><p className="text-xs text-slate-500">{lead.city || '-'}</p></td>
                    <td className="px-4 py-4">{lead.broker?.full_name || lead.rm?.full_name || 'Unassigned'}</td>
                    <td className="px-4 py-4 max-w-[260px] truncate">{lead.lost_reason || lead.notes || '-'}</td>
                    <td className="px-4 py-4">{lead.updated_at ? String(lead.updated_at).slice(0, 10) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reports.lost_leads?.length && <p className="p-6 text-sm text-slate-500">No lost leads found.</p>}
          </div>
        </Panel>
      </div>
      <div className="space-y-4">
        <MiniAnalyticsCard title="Lost Reasons" rows={(reports.lost_reasons || []).map((row) => ({ label: row.reason, count: row.count }))} />
        <MiniAnalyticsCard title="Owner Performance" rows={(reports.owner_performance || []).map((row) => ({ label: row.broker_id, count: `${row.converted}/${row.total}` }))} />
        <Panel className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
          <h2 className="text-[1.2rem] font-black text-slate-950">Zoho Readiness</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{readiness.ready_count || 0} of {readiness.sample_size || 0} sampled leads are ready.</p>
          <div className="mt-4 space-y-2">
            {Object.entries(readiness.missing_counts || {}).map(([field, count]) => <div key={field} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"><span className="font-bold text-slate-800">{field}</span><span>{count} missing</span></div>)}
            {!Object.keys(readiness.missing_counts || {}).length && <p className="text-sm text-slate-500">No readiness gaps found.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const MiniAnalyticsCard = ({ title, rows }) => (
  <Panel className="rounded-[24px] border border-[#e8eef8] bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
    <h2 className="text-[1.2rem] font-black text-slate-950">{title}</h2>
    <div className="mt-4 space-y-3">
      {rows.slice(0, 6).map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm">
          <span className="font-semibold text-slate-700">{row.label}</span>
          <span className="font-black text-slate-950">{row.count}</span>
        </div>
      ))}
      {!rows.length && <p className="text-sm font-medium text-slate-500">No data found.</p>}
    </div>
  </Panel>
);

export default SalesCrm;
