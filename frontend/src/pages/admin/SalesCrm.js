import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Search, Target, TrendingUp, UserCheck, Users } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestReason } from './shared';

const phaseSteps = [
  ['Step 1', 'CRM Dashboard', 'completed'],
  ['Step 2', 'Lead Directory', 'completed'],
  ['Step 3', 'Lead Assignment', 'completed'],
  ['Step 4', 'Sales Pipeline & Follow-ups', 'completed'],
  ['Step 5', 'Lost Leads, Reports & Zoho Readiness', 'completed'],
];

const statuses = [
  ['', 'All Leads'],
  ['new', 'New'],
  ['contacted', 'Contacted'],
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

const SalesCrm = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [active, setActive] = useState('dashboard');
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
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
        leads: leadsRes.data.data.leads,
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

  const updateLead = async (lead, status) => {
    const notes = window.prompt('Lead notes', lead.notes || '');
    if (notes === null) return;
    const reason = await requestReason({ title: 'Lead Update Reason', description: `Updating lead ${lead.lead_id || lead.full_name || ''}.`, placeholder: 'Add lead update reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateCrmLead(lead.lead_id, { status, notes, reason });
    load();
  };

  const formatAssigneeOptions = (users) => users.map((user) => `${user.user_id} - ${user.full_name || user.name || user.email || user.phone || 'Unnamed'}`).join('\n');

  const assignLead = async (lead) => {
    const brokerOptions = formatAssigneeOptions(state.assignees.brokers || []);
    const rmOptions = formatAssigneeOptions(state.assignees.relationship_managers || []);
    const tlOptions = formatAssigneeOptions(state.assignees.team_leaders || []);
    const brokerId = window.prompt(`Broker ID\n\n${brokerOptions || 'No active brokers found'}`, lead.broker_id || '');
    if (brokerId === null) return;
    const rmId = window.prompt(`Relationship Manager ID\n\n${rmOptions || 'No active employees found'}`, lead.rm_id || '');
    if (rmId === null) return;
    const teamLeaderId = window.prompt(`Team Leader ID\n\n${tlOptions || 'No active team leaders found'}`, lead.team_leader_id || '');
    if (teamLeaderId === null) return;
    const reason = await requestReason({ title: 'Lead Assignment Reason', description: 'Lead ownership assignment will be audited.', defaultValue: 'Lead ownership assigned from CRM admin', placeholder: 'Add assignment reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.assignCrmLead(lead.lead_id, { broker_id: brokerId.trim(), rm_id: rmId.trim(), team_leader_id: teamLeaderId.trim(), reason });
    load();
  };

  const updatePipeline = async (lead) => {
    const stage = window.prompt(`Pipeline stage\n\n${pipelineStages.map(([id, label]) => `${id} - ${label}`).join('\n')}`, lead.pipeline_stage || lead.status || 'qualified');
    if (stage === null) return;
    const nextFollowUpAt = window.prompt('Next follow-up date/time (YYYY-MM-DD or YYYY-MM-DDTHH:mm)', lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16) : '');
    if (nextFollowUpAt === null) return;
    const followUpStatus = window.prompt('Follow-up status', lead.follow_up_status || 'scheduled');
    if (followUpStatus === null) return;
    const notes = window.prompt('Follow-up notes', lead.notes || '');
    if (notes === null) return;
    const reason = await requestReason({ title: 'Pipeline Update Reason', description: 'Sales pipeline follow-up will be audited.', defaultValue: 'Sales pipeline follow-up updated', placeholder: 'Add pipeline update reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateCrmPipeline(lead.lead_id, { pipeline_stage: stage.trim(), next_follow_up_at: nextFollowUpAt.trim(), follow_up_status: followUpStatus.trim(), notes, reason });
    load();
  };

  return (
    <div>
      <PageHeader title="Sales & CRM" description="Manage lead intake, broker ownership, sales pipeline health, follow-up risk and conversion performance." />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {crmTabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-charcoal text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {statuses.map(([id, label]) => <button key={label} onClick={() => setStatusFilter(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${statusFilter === id ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_180px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search lead ID, name, phone, email, city or property" />
          </div>
          <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">All Property Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="event_venue">Event Venue</option>
          </select>
          <input value={city} onChange={(event) => setCity(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="City" />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['Total Leads', state.metrics.total || 0, Users],
              ['New Leads', state.metrics.new || 0, Target],
              ['Contacted', state.metrics.contacted || 0, UserCheck],
              ['Converted', state.metrics.converted || 0, TrendingUp],
              ['Conversion Rate', `${conversionRate}%`, BarChart3],
            ].map(([label, value, Icon]) => <Panel key={label} className="p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta"><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
          </div>
          {active === 'dashboard' ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="overflow-hidden">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-black">Recent Leads</h2>
                <p className="text-xs text-slate-500">Admin-wide lead intake preview across brokers and cities.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Lead', 'Contact', 'City', 'Requirement', 'Broker', 'Age', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.leads.map((lead) => <tr key={lead.lead_id}><td className="px-4 py-3"><p className="font-black">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td><td className="px-4 py-3"><p>{lead.phone}</p><p className="text-xs text-slate-500">{lead.email || '-'}</p></td><td className="px-4 py-3">{lead.city}</td><td className="px-4 py-3"><p className="capitalize">{String(lead.property_type || '-').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{lead.property_title || '-'}</p></td><td className="px-4 py-3">{lead.broker?.full_name || lead.broker_id || '-'}</td><td className="px-4 py-3">{Math.round(lead.age_hours || 0)}h</td><td className="px-4 py-3"><StatusBadge value={lead.status} /></td></tr>)}
                  </tbody>
                </table>
                {!state.leads.length && <p className="p-6 text-sm text-slate-500">No leads found.</p>}
              </div>
            </Panel>
            <div className="space-y-4">
              <Panel className="p-4">
                <h2 className="font-black">Phase 4 Steps</h2>
                <div className="mt-3 space-y-2">{phaseSteps.map(([step, label, status]) => <div key={step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{step}</b> {label}</span><StatusBadge value={status} /></div>)}</div>
              </Panel>
              <MiniChart title="City Distribution" rows={state.charts.city_distribution || []} />
              <MiniChart title="Property Type" rows={state.charts.property_type_distribution || []} />
              <MiniChart title="Broker Performance" rows={(state.charts.broker_performance || []).map((row) => ({ label: row.broker_id, count: `${row.converted}/${row.count}` }))} />
            </div>
          </div> : active === 'directory' ? <LeadDirectory leads={state.leads} onUpdate={updateLead} onAssign={assignLead} onPipeline={updatePipeline} /> : active === 'pipeline' ? <PipelineBoard pipeline={state.pipeline} leads={state.leads} onPipeline={updatePipeline} /> : <ReportsView reports={state.reports} />}
        </div>
      )}
    </div>
  );
};

const LeadDirectory = ({ leads, onUpdate, onAssign, onPipeline }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-200 p-4">
      <h2 className="font-black">Lead Directory</h2>
      <p className="text-xs text-slate-500">Complete admin lead list with contact, requirement, broker ownership and status controls.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1320px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Lead', 'Contact', 'City', 'Requirement', 'Dates', 'Ownership', 'Follow-up', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.lead_id}>
              <td className="px-4 py-3"><p className="font-black">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
              <td className="px-4 py-3"><p>{lead.phone}</p><p className="text-xs text-slate-500">{lead.email || '-'}</p></td>
              <td className="px-4 py-3">{lead.city}</td>
              <td className="px-4 py-3"><p className="capitalize">{String(lead.property_type || '-').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{lead.property_title || lead.property_id || '-'}</p></td>
              <td className="px-4 py-3">{lead.from_date || '-'} to {lead.to_date || '-'}</td>
              <td className="px-4 py-3">
                <p className="font-bold">Broker: {lead.broker?.full_name || lead.broker_id || '-'}</p>
                <p className="text-xs text-slate-500">RM: {lead.rm?.full_name || lead.rm_id || '-'}</p>
                <p className="text-xs text-slate-500">TL: {lead.team_leader?.full_name || lead.team_leader_id || '-'}</p>
                <p className="text-xs text-slate-400">{lead.assigned_at ? `Assigned ${String(lead.assigned_at).slice(0, 10)}` : 'Not assigned'}</p>
              </td>
              <td className="px-4 py-3"><p className="font-bold capitalize">{String(lead.pipeline_stage || lead.status || 'new').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16).replace('T', ' ') : 'No follow-up set'}</p><p className="max-w-[220px] truncate text-xs text-slate-400">{lead.notes || '-'}</p></td>
              <td className="px-4 py-3"><StatusBadge value={lead.status} /></td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><button onClick={() => onAssign(lead)} className="rounded-lg bg-terracotta/10 px-2 py-1 text-xs font-bold text-charcoal">Assign</button><button onClick={() => onPipeline(lead)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Pipeline</button><button onClick={() => onUpdate(lead, 'contacted')} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Contacted</button><button onClick={() => onUpdate(lead, 'converted')} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Converted</button><button onClick={() => onUpdate(lead, 'lost')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Lost</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!leads.length && <p className="p-6 text-sm text-slate-500">No leads found.</p>}
    </div>
  </Panel>
);

const PipelineBoard = ({ pipeline, leads, onPipeline }) => (
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Sales Pipeline</h2>
          <p className="text-xs text-slate-500">Track lead stages, next actions and follow-up ageing without changing booking workflows.</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {(pipeline.summary?.stages || []).map((row) => (
            <div key={row.stage} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">{String(row.stage).replace(/_/g, ' ')}</p>
              <p className="mt-1 text-2xl font-black">{row.count}</p>
            </div>
          ))}
          {!pipeline.summary?.stages?.length && <p className="text-sm text-slate-500">No pipeline stages found.</p>}
        </div>
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Active Lead Follow-ups</h2>
          <p className="text-xs text-slate-500">Use the Pipeline action to move stages and schedule the next touchpoint.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Lead', 'Owner', 'Stage', 'Next Follow-up', 'Notes', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
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
    <td className="px-4 py-3"><p className="font-black">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
    <td className="px-4 py-3"><p>{lead.broker?.full_name || lead.rm?.full_name || '-'}</p><p className="text-xs text-slate-500">{lead.team_leader?.full_name || lead.broker_id || '-'}</p></td>
    <td className="px-4 py-3 capitalize">{String(lead.pipeline_stage || lead.status || 'new').replace(/_/g, ' ')}</td>
    <td className="px-4 py-3">{lead.next_follow_up_at ? String(lead.next_follow_up_at).slice(0, 16).replace('T', ' ') : '-'}</td>
    <td className="px-4 py-3 max-w-[260px] truncate">{lead.notes || '-'}</td>
    <td className="px-4 py-3"><button onClick={() => onPipeline(lead)} className="rounded-lg bg-charcoal px-3 py-1.5 text-xs font-bold text-white">Update</button></td>
  </tr>
);

const FollowUpPanel = ({ title, count, leads, onPipeline, tone }) => (
  <Panel className="p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-black">{title}</h2>
      <span className={`rounded-lg px-2 py-1 text-xs font-black ${tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{count}</span>
    </div>
    <div className="space-y-2">
      {leads.slice(0, 8).map((lead) => (
        <button key={lead.lead_id} onClick={() => onPipeline(lead)} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:border-terracotta">
          <p className="font-black">{lead.full_name}</p>
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Lost Leads', reports.summary?.lost || 0],
            ['Lost Rate', `${reports.summary?.lost_rate || 0}%`],
            ['Converted', reports.summary?.converted || 0],
            ['Zoho Ready', `${readiness.ready_percent || 0}%`],
          ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
        </div>
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Lost Leads</h2>
            <p className="text-xs text-slate-500">Recent lost opportunities with owner and captured reason or notes.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Lead', 'Contact', 'Requirement', 'Owner', 'Reason', 'Updated'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(reports.lost_leads || []).map((lead) => (
                  <tr key={lead.lead_id}>
                    <td className="px-4 py-3"><p className="font-black">{lead.full_name}</p><p className="font-mono text-xs text-slate-500">{lead.lead_id}</p></td>
                    <td className="px-4 py-3"><p>{lead.phone}</p><p className="text-xs text-slate-500">{lead.email || '-'}</p></td>
                    <td className="px-4 py-3"><p className="capitalize">{String(lead.property_type || '-').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{lead.city || '-'}</p></td>
                    <td className="px-4 py-3">{lead.broker?.full_name || lead.rm?.full_name || 'Unassigned'}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate">{lead.lost_reason || lead.notes || '-'}</td>
                    <td className="px-4 py-3">{lead.updated_at ? String(lead.updated_at).slice(0, 10) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reports.lost_leads?.length && <p className="p-6 text-sm text-slate-500">No lost leads found.</p>}
          </div>
        </Panel>
      </div>
      <div className="space-y-4">
        <MiniChart title="Lost Reasons" rows={(reports.lost_reasons || []).map((row) => ({ label: row.reason, count: row.count }))} />
        <MiniChart title="Owner Performance" rows={(reports.owner_performance || []).map((row) => ({ label: row.broker_id, count: `${row.converted}/${row.total}` }))} />
        <Panel className="p-4">
          <h2 className="font-black">Zoho Readiness</h2>
          <p className="mt-1 text-sm text-slate-500">{readiness.ready_count || 0} of {readiness.sample_size || 0} sampled leads are ready.</p>
          <div className="mt-3 space-y-2">
            {Object.entries(readiness.missing_counts || {}).map(([field, count]) => <div key={field} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{field}</span><span>{count} missing</span></div>)}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const MiniChart = ({ title, rows }) => (
  <Panel className="p-4">
    <h2 className="font-black">{title}</h2>
    <div className="mt-3 space-y-2">{rows.slice(0, 6).map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{row.label}</span><span>{row.count}</span></div>)}</div>
    {!rows.length && <p className="mt-3 text-sm text-slate-500">No data found.</p>}
  </Panel>
);

export default SalesCrm;
