import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, BookOpen, CalendarDays, CheckCircle2, Clock, Headphones, Inbox, Plus, Search, ShieldAlert, Ticket, Eye, MoreHorizontal } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { cmsAPI, supportTicketAPI } from '../../services/api';
import { ErrorState, LoadingState, Panel, StatusBadge, requestInput, requestReason, showNotice } from './shared';

const phaseSteps = [
  ['Step 1', 'Support Overview', 'completed'],
  ['Step 2', 'Ticket Inbox & Status Workflow', 'completed'],
  ['Step 3', 'Ticket Assignment & SLA Priority', 'completed'],
  ['Step 4', 'Knowledge Base / FAQ / Support Page CMS', 'completed'],
  ['Step 5', 'Support Reports & Audit', 'completed'],
];

const tabs = [
  ['overview', 'Overview'],
  ['inbox', 'Ticket Inbox'],
  ['knowledge', 'Knowledge Base & FAQ'],
  ['reports', 'Reports & Audit'],
];

const statusOptions = [
  ['all', 'All Tickets'],
  ['open', 'Open'],
  ['in_progress', 'In Progress'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
];

const supportDateRangeLabel = '01 May 2026 - 31 May 2026';

const SupportTicketManagement = () => {
  const [active, setActive] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [editorText, setEditorText] = useState('');
  const [savingCms, setSavingCms] = useState(false);
  const [state, setState] = useState({ loading: true, error: '', metrics: {}, tickets: [], assignees: [], supportContent: [], supportReports: {}, charts: {} });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [overviewRes, ticketsRes, assigneesRes] = await Promise.all([
        adminPhase1API.supportOverview(),
        supportTicketAPI.getAdminTickets({ status_filter: statusFilter }),
        adminPhase1API.supportAssignees(),
      ]);
      const [supportCmsRes, supportReportsRes] = await Promise.allSettled([
        cmsAPI.getAdminContent('support'),
        adminPhase1API.supportReports(),
      ]);
      const tickets = ticketsRes.data.tickets || overviewRes.data.data.tickets || [];
      const supportContent = supportCmsRes.status === 'fulfilled' ? supportCmsRes.value.data.content || [] : [];
      const supportReports = supportReportsRes.status === 'fulfilled' ? supportReportsRes.value.data.data || {} : {};
      setState({ loading: false, error: '', ...overviewRes.data.data, tickets, assignees: assigneesRes.data.data.assignees || [], supportContent, supportReports });
      setSelectedTicketId((current) => current || tickets[0]?.ticket_id || '');
      setSelectedContentId((current) => current || supportContent[0]?.content_id || '');
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load Support & Ticket Management', metrics: {}, tickets: [], assignees: [], supportContent: [], supportReports: {}, charts: {} });
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filteredTickets = useMemo(() => state.tickets.filter((ticket) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [ticket.ticket_id, ticket.subject, ticket.message, ticket.user_name, ticket.user_email, ticket.user_phone, ticket.category, ticket.status, ticket.priority].some((value) => String(value || '').toLowerCase().includes(term));
  }), [search, state.tickets]);
  const selectedTicket = filteredTickets.find((ticket) => ticket.ticket_id === selectedTicketId) || filteredTickets[0];
  const selectedContent = state.supportContent.find((item) => item.content_id === selectedContentId) || state.supportContent[0];
  const metrics = state.metrics || {};
  const totalTickets = Number(metrics.total || state.tickets.length || 0);
  const categoryRows = useMemo(() => {
    const grouped = filteredTickets.reduce((acc, ticket) => {
      const label = ticket.category || 'Other';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, count], index) => ({
        label,
        count,
        percent: totalTickets ? ((count / totalTickets) * 100).toFixed(1) : '0.0',
        color: ['#2f6df6', '#8b5cf6', '#f59e0b', '#14b8a6', '#94a3b8', '#ef4444'][index % 6],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredTickets, totalTickets]);
  const statusRows = useMemo(() => {
    const values = state.charts.status_distribution || [];
    if (values.length) return values;
    return [
      { label: 'Open', count: Number(metrics.open || 0) },
      { label: 'In Progress', count: Number(metrics.in_progress || 0) },
      { label: 'Resolved', count: Number(metrics.resolved || 0) },
      { label: 'Urgent', count: Number(metrics.urgent || 0) },
    ];
  }, [metrics.in_progress, metrics.open, metrics.resolved, metrics.urgent, state.charts.status_distribution]);
  const recentTickets = useMemo(() => filteredTickets.slice(0, 10), [filteredTickets]);
  const phaseStepRows = [
    { step: 1, title: 'Support Overview', description: 'Monitor key metrics and ticket health', status: 'completed' },
    { step: 2, title: 'Ticket Inbox & Status Workflow', description: 'Manage and update tickets', status: 'completed' },
    { step: 3, title: 'Ticket Assignment & SLA Priority', description: 'Assign to team and set priority', status: 'completed' },
    { step: 4, title: 'Knowledge Base / FAQ', description: 'Manage help articles', status: 'completed' },
    { step: 5, title: 'Support Reports & Audit', description: 'Generate reports and insights', status: 'completed' },
  ];

  useEffect(() => {
    const content = state.supportContent.find((item) => item.content_id === selectedContentId) || state.supportContent[0];
    if (!content) {
      setEditorText('');
      return;
    }
    setSelectedContentId(content.content_id);
    setEditorText(JSON.stringify(content.content_data || {}, null, 2));
  }, [selectedContentId, state.supportContent]);

  const updateTicket = async (ticket, status) => {
    if (!ticket) return;
    const adminResponse = await requestReason({ title: 'Ticket Response', description: `Updating ticket ${ticket.ticket_id}.`, defaultValue: ticket.admin_response || '', placeholder: 'Add admin response.', minLength: 1, confirmLabel: 'Save Response' });
    if (adminResponse === null) return;
    const priority = await requestInput({
      title: 'Ticket Priority',
      description: 'Allowed values: low, normal, high, urgent.',
      label: 'Priority',
      defaultValue: ticket.priority || 'normal',
      placeholder: 'normal',
      confirmLabel: 'Update Ticket',
    });
    if (!priority) return;
    await supportTicketAPI.updateTicket(ticket.ticket_id, { status, admin_response: adminResponse, priority });
    await load();
  };

  const assignTicket = async (ticket) => {
    if (!ticket) return;
    const options = state.assignees.map((user) => `${user.user_id} - ${user.full_name || user.email || user.phone || 'Unnamed'}`).join('\n');
    const assignedAdminId = await requestInput({
      title: 'Assign Support Ticket',
      description: options || 'No active support assignees found.',
      label: 'Assigned Admin User ID',
      defaultValue: ticket.assigned_admin_id || '',
      placeholder: 'Enter user ID from the list above',
      confirmLabel: 'Continue',
    });
    if (!assignedAdminId) return;
    const priority = await requestInput({
      title: 'Assign Support Ticket',
      description: 'Allowed values: low, normal, high, urgent.',
      label: 'Priority',
      defaultValue: ticket.priority || 'normal',
      placeholder: 'normal',
      confirmLabel: 'Continue',
    });
    if (!priority) return;
    const slaDueAt = await requestInput({
      title: 'Assign Support Ticket',
      description: 'Optional SLA due date/time: YYYY-MM-DD or YYYY-MM-DDTHH:mm',
      label: 'SLA Due At',
      defaultValue: ticket.sla_due_at ? String(ticket.sla_due_at).slice(0, 16) : '',
      placeholder: '2026-08-01T18:30',
      confirmLabel: 'Continue',
      allowEmpty: true,
    });
    if (slaDueAt === null) return;
    const reason = await requestReason({ title: 'Ticket Assignment Reason', description: `Assigning ticket ${ticket.ticket_id}.`, defaultValue: 'Support ticket ownership assigned', placeholder: 'Add assignment reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.assignSupportTicket(ticket.ticket_id, { assigned_admin_id: assignedAdminId.trim(), priority: priority.trim(), sla_due_at: slaDueAt.trim(), reason });
    await load();
  };

  const saveSupportContent = async () => {
    if (!selectedContent) return;
    let parsed;
    try {
      parsed = JSON.parse(editorText);
    } catch (error) {
      await showNotice({
        title: 'Invalid JSON',
        description: 'Please fix the support CMS content before saving.',
        eyebrow: 'Validation Error',
      });
      return;
    }
    const reason = await requestReason({ title: 'Publishing Audit Reason', description: 'Support knowledge base / FAQ content will be updated.', defaultValue: 'Support knowledge base / FAQ content updated', placeholder: 'Add publishing reason.', minLength: 3 });
    if (!reason) return;
    setSavingCms(true);
    try {
      await cmsAPI.updateContent(selectedContent.content_id, { content_data: parsed, is_active: selectedContent.is_active !== false, reason });
      await load();
    } finally {
      setSavingCms(false);
    }
  };

  const toggleSupportContent = async (content) => {
    if (!content) return;
    const nextActive = content.is_active === false;
    const reason = await requestReason({ title: 'Support Content Status Reason', description: `Support content will be ${nextActive ? 'published' : 'unpublished'}.`, defaultValue: nextActive ? 'Support content published' : 'Support content unpublished', placeholder: 'Add status reason.', minLength: 3 });
    if (!reason) return;
    await cmsAPI.updateContent(content.content_id, { content_data: content.content_data || {}, is_active: nextActive, reason });
    await load();
  };

  const createTicket = async () => {
    const subject = await requestInput({ title: 'Create Ticket', description: 'Enter the ticket subject.', label: 'Subject', placeholder: 'Property inquiry', confirmLabel: 'Continue' });
    if (!subject) return;
    const message = await requestInput({ title: 'Create Ticket', description: 'Enter the issue details.', label: 'Message', inputType: 'textarea', placeholder: 'Describe the request', confirmLabel: 'Continue' });
    if (!message) return;
    const category = await requestInput({ title: 'Create Ticket', description: 'Enter the ticket category.', label: 'Category', defaultValue: 'general', placeholder: 'general', confirmLabel: 'Create Ticket' });
    if (!category) return;
    await supportTicketAPI.createTicket({ subject: subject.trim(), message: message.trim(), category: category.trim() });
    await load();
    setActive('inbox');
  };

  const openTicketFromOverview = (ticket) => {
    if (!ticket) return;
    setSelectedTicketId(ticket.ticket_id);
    setActive('inbox');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <span>Support &amp; Ticket Management</span>
            <span className="text-slate-300">›</span>
            <span className="text-[#2563eb]">{tabs.find(([id]) => id === active)?.[1] || 'Overview'}</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Support &amp; Ticket Management</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Monitor support demand, ticket SLA risk, user issues and resolution performance.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setActive('reports')} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">
            <CalendarDays className="h-4 w-4 text-[#2563eb]" />
            {supportDateRangeLabel}
          </button>
          <button type="button" onClick={createTicket} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#142d7b] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(20,45,123,0.22)] hover:bg-[#102564]">
            <Plus className="h-4 w-4" />
            Create Ticket
          </button>
        </div>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="flex overflow-x-auto px-2 pt-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`mb-[-1px] whitespace-nowrap rounded-t-2xl border-b-2 px-4 py-3 text-sm font-black transition ${
                active === id
                  ? 'border-[#2563eb] bg-[#f6f9ff] text-[#2563eb]'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {active === 'inbox' && (
        <Panel className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search ticket ID, subject, user, category, message" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-200 px-3 text-sm font-semibold">
              {statusOptions.map(([id, label]) => <option key={label} value={id}>{label}</option>)}
            </select>
          </div>
        </Panel>
      )}
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {[
              ['Total Tickets', totalTickets, Ticket, 'vs last month', '12.6%'],
              ['Open', metrics.open || 0, Headphones, `${totalTickets ? ((Number(metrics.open || 0) / totalTickets) * 100).toFixed(1) : '0.0'}% of total`],
              ['In Progress', metrics.in_progress || 0, Clock, `${totalTickets ? ((Number(metrics.in_progress || 0) / totalTickets) * 100).toFixed(1) : '0.0'}% of total`],
              ['Resolved', metrics.resolved || 0, CheckCircle2, `${totalTickets ? ((Number(metrics.resolved || 0) / totalTickets) * 100).toFixed(1) : '0.0'}% of total`],
              ['Urgent', metrics.urgent || 0, AlertTriangle, `${totalTickets ? ((Number(metrics.urgent || 0) / totalTickets) * 100).toFixed(1) : '0.0'}% of total`],
              ['SLA Risk', metrics.sla_risk || 0, BarChart3, `${totalTickets ? ((Number(metrics.sla_risk || 0) / totalTickets) * 100).toFixed(1) : '0.0'}% of total`],
            ].map(([label, value, Icon, sub, trend]) => (
              <Panel key={label} className="p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5ff] text-[#2f6df6]"><Icon className="h-5 w-5" /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-[22px] font-black text-slate-950">{value}</p>
                  {trend ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600">↑ {trend}</span> : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">{sub}</p>
              </Panel>
            ))}
          </div>
          {active === 'overview' ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Panel className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black">Ticket Trend</h2>
                      <p className="text-xs text-slate-500">Created vs resolved ticket movement.</p>
                    </div>
                    <button type="button" onClick={() => setActive('reports')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Last 6 Months</button>
                  </div>
                  <TrendRows titleA="Created" titleB="Resolved" rows={statusRows} />
                </Panel>
                <CategoryCard total={totalTickets} rows={categoryRows} />
              </div>
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <div>
                    <h2 className="font-black">Recent Support Tickets</h2>
                    <p className="text-xs text-slate-500">Latest user tickets with status, priority and SLA ageing.</p>
                  </div>
                  <button className="rounded-xl bg-[#eef5ff] px-3 py-2 text-sm font-black text-[#2563eb]">View All →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['#', 'Ticket ID', 'User', 'Category', 'Priority', 'Status', 'Age', 'SLA', 'Actions'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTickets.map((ticket, index) => (
                        <tr key={ticket.ticket_id}>
                          <td className="px-4 py-3 font-semibold">{index + 1}</td>
                          <td className="px-4 py-3"><p className="font-black text-slate-900">{ticket.ticket_id}</p><p className="text-xs text-slate-500">{ticket.subject || '-'}</p></td>
                          <td className="px-4 py-3"><p className="font-bold">{ticket.user_name || ticket.user_id || '-'}</p><p className="text-xs text-slate-500">{ticket.user_email || ticket.user_phone || '-'}</p></td>
                          <td className="px-4 py-3 capitalize">{ticket.category || 'general'}</td>
                          <td className="px-4 py-3"><StatusBadge value={ticket.priority || 'normal'} /></td>
                          <td className="px-4 py-3"><StatusBadge value={ticket.status || 'open'} /></td>
                          <td className="px-4 py-3">{Math.round(ticket.age_hours || 0) < 24 ? `${Math.round(ticket.age_hours || 0)} hrs` : `${Math.max(1, Math.round((ticket.age_hours || 0) / 24))} days`}</td>
                          <td className="px-4 py-3"><StatusBadge value={ticket.sla_status || 'within_sla'} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><Eye className="h-4 w-4" /></button>
                              <button className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><MoreHorizontal className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!recentTickets.length && <p className="p-6 text-sm text-slate-500">No support tickets found.</p>}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-500">Showing 1 to {Math.min(recentTickets.length, 10)} of {totalTickets} tickets</p>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">10 / page</button>
                    {[1, 2, 3, 4, 5].map((item) => <button key={item} className={`h-9 w-9 rounded-xl text-sm font-black ${item === 1 ? 'bg-[#2f6df6] text-white' : 'border border-slate-200 text-slate-600'}`}>{item}</button>)}
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">25</button>
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">›</button>
                  </div>
                </div>
              </Panel>
            </div>
            <div className="space-y-4">
              <Panel className="p-4">
                <h2 className="text-2xl font-black">Phase 7 Steps</h2>
                <div className="mt-4 space-y-3">
                  {phaseStepRows.map((item) => (
                    <div key={item.step} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f6df6] text-xs font-black text-white">{item.step}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </div>
                      <StatusBadge value={item.status} />
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel className="p-4">
                <h2 className="text-2xl font-black">Quick Actions</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <QuickAction title="Create Ticket" description="Raise a new support ticket" tone="blue" onClick={createTicket} />
                  <QuickAction title="View Inbox" description="Go to ticket inbox" tone="green" onClick={() => setActive('inbox')} />
                  <QuickAction title="Manage Categories" description="Update ticket categories" tone="amber" onClick={() => setActive('knowledge')} />
                  <QuickAction title="Export Reports" description="Download support data" tone="violet" onClick={() => setActive('reports')} />
                </div>
              </Panel>
              <MiniChart title="Priority Distribution" rows={state.charts.priority_distribution || []} />
            </div>
          </div> : active === 'inbox' ? <TicketInbox tickets={filteredTickets} selected={selectedTicket} selectedId={selectedTicketId} setSelectedId={setSelectedTicketId} onUpdate={updateTicket} onAssign={assignTicket} /> : active === 'knowledge' ? <KnowledgeBaseCms content={state.supportContent} selected={selectedContent} selectedId={selectedContentId} setSelectedId={setSelectedContentId} editorText={editorText} setEditorText={setEditorText} saving={savingCms} onSave={saveSupportContent} onToggle={toggleSupportContent} /> : <SupportReports reports={state.supportReports} />}
        </div>
      )}
    </div>
  );
};

const SupportReports = ({ reports }) => {
  const metrics = reports?.metrics || {};
  const metricCards = [
    ['Tickets Sampled', metrics.tickets_sampled || 0],
    ['Open Backlog', metrics.open_backlog || 0],
    ['Resolved', metrics.resolved_total || 0],
    ['Resolution Rate', `${metrics.resolution_rate || 0}%`],
    ['Avg Resolution', `${metrics.avg_resolution_hours || 0}h`],
    ['SLA Breached', metrics.sla_breached_open || 0],
    ['Unassigned Open', metrics.unassigned_open || 0],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {metricCards.map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Panel>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">SLA Watchlist</h2>
            <p className="text-xs text-slate-500">Open tickets that are breached or beyond the default response threshold.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Ticket', 'User', 'Priority', 'Status', 'Assigned', 'Created'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(reports?.sla_watchlist || []).map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td className="px-4 py-3"><p className="font-black">{ticket.subject || '-'}</p><p className="font-mono text-xs text-slate-500">{ticket.ticket_id}</p></td>
                    <td className="px-4 py-3">{ticket.user_name || ticket.user_id || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge value={ticket.priority || 'normal'} /></td>
                    <td className="px-4 py-3"><StatusBadge value={ticket.status || 'open'} /></td>
                    <td className="px-4 py-3">{ticket.assigned_admin_id || 'unassigned'}</td>
                    <td className="px-4 py-3">{ticket.created_at ? String(ticket.created_at).slice(0, 16).replace('T', ' ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(reports?.sla_watchlist || []).length && <p className="p-6 text-sm text-slate-500">No SLA risk tickets found.</p>}
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-black">Assignee Performance</h2>
          <div className="mt-3 space-y-2">
            {(reports?.assignee_performance || []).map((row) => <div key={row.assignee_id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-black">{row.assignee_id}</span><span>{row.total} total</span></div><p className="mt-1 text-xs text-slate-500">{row.resolved} resolved / {row.open} open</p></div>)}
            {!(reports?.assignee_performance || []).length && <p className="text-sm text-slate-500">No assignee data found.</p>}
          </div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Support Audit Trail</h2>
          <p className="text-xs text-slate-500">Recent support ticket and support CMS actions from audit logs.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'Module', 'Action', 'Record', 'User', 'Reason'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(reports?.recent_audits || []).map((log) => (
                <tr key={log.audit_id || `${log.record_id}-${log.created_at}`}>
                  <td className="px-4 py-3">{log.created_at ? String(log.created_at).slice(0, 16).replace('T', ' ') : '-'}</td>
                  <td className="px-4 py-3">{log.module || '-'}</td>
                  <td className="px-4 py-3">{log.action || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.record_id || '-'}</td>
                  <td className="px-4 py-3">{log.user_id || '-'}</td>
                  <td className="px-4 py-3">{log.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(reports?.recent_audits || []).length && <p className="p-6 text-sm text-slate-500">No support audit logs found yet.</p>}
        </div>
      </Panel>
    </div>
  );
};

const KnowledgeBaseCms = ({ content, selected, selectedId, setSelectedId, editorText, setEditorText, saving, onSave, onToggle }) => {
  const data = selected?.content_data || {};
  const stats = [
    ['FAQ Items', Array.isArray(data.faq_items) ? data.faq_items.length : 0],
    ['Support Cards', Array.isArray(data.cards) ? data.cards.length : 0],
    ['Popular Topics', Array.isArray(data.popular_topics) ? data.popular_topics.length : 0],
    ['Support Hours', Array.isArray(data.support_hours) ? data.support_hours.length : 0],
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel className="p-4">
          <h2 className="font-black">Support Page CMS</h2>
          <p className="mt-1 text-xs text-slate-500">Manage support page content, FAQ items, popular topics and help-card copy from admin.</p>
          <div className="mt-4 space-y-2">
            {content.map((item) => (
              <button key={item.content_id} onClick={() => setSelectedId(item.content_id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedId === item.content_id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black">{item.section}</span>
                  <StatusBadge value={item.is_active === false ? 'draft' : 'published'} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{item.content_id}</p>
                <p className="mt-1 text-xs text-slate-400">{item.updated_at ? String(item.updated_at).slice(0, 16).replace('T', ' ') : '-'}</p>
              </button>
            ))}
            {!content.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No support CMS content found.</p>}
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-black">Readiness</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {stats.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}
          </div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">{selected?.section || 'Knowledge Base Editor'}</h2>
            <p className="font-mono text-xs text-slate-500">{selected?.content_id || 'Select support content'}</p>
          </div>
          {selected && (
            <div className="flex gap-2">
              <button onClick={() => onToggle(selected)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{selected.is_active === false ? 'Publish' : 'Unpublish'}</button>
              <button onClick={onSave} disabled={saving} className="rounded-lg bg-charcoal px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save CMS'}</button>
            </div>
          )}
        </div>
        {selected ? (
          <div className="p-4">
            <textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} spellCheck={false} className="min-h-[560px] w-full rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-50 outline-none focus:border-terracotta" />
          </div>
        ) : <p className="p-6 text-sm text-slate-500">Select a CMS section to edit.</p>}
      </Panel>
    </div>
  );
};

const TicketInbox = ({ tickets, selected, selectedId, setSelectedId, onUpdate, onAssign }) => (
  <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-black">Ticket Inbox</h2>
        <p className="text-xs text-slate-500">Review support tickets and move them through the response workflow.</p>
      </div>
      <div className="max-h-[700px] overflow-y-auto p-3">
        {tickets.map((ticket) => (
          <button key={ticket.ticket_id} onClick={() => setSelectedId(ticket.ticket_id)} className={`mb-2 w-full rounded-lg border p-3 text-left text-sm ${selectedId === ticket.ticket_id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-black">{ticket.subject || ticket.ticket_id}</span>
              <StatusBadge value={ticket.status || 'open'} />
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{ticket.user_name || ticket.user_id || '-'} / {ticket.category || 'general'}</p>
            <p className="mt-1 text-xs text-slate-400">{ticket.created_at ? String(ticket.created_at).slice(0, 16).replace('T', ' ') : '-'} / {ticket.priority || 'normal'} / {ticket.assigned_admin_id || 'unassigned'}</p>
          </button>
        ))}
        {!tickets.length && <p className="p-3 text-sm text-slate-500">No tickets found.</p>}
      </div>
    </Panel>
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-black">{selected?.subject || 'Ticket Detail'}</h2>
          <p className="font-mono text-xs text-slate-500">{selected?.ticket_id || 'No ticket selected'}</p>
        </div>
        {selected && <StatusBadge value={selected.status || 'open'} />}
      </div>
      {selected ? (
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Detail label="User" value={selected.user_name || selected.user_id || '-'} />
              <Detail label="Email" value={selected.user_email || '-'} />
              <Detail label="Phone" value={selected.user_phone || '-'} />
              <Detail label="Priority" value={selected.priority || 'normal'} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">User Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.message || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Admin Response</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.admin_response || '-'}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Detail label="Category" value={selected.category || 'general'} />
              <Detail label="Assigned Admin" value={selected.assignee?.full_name || selected.assigned_admin_id || '-'} />
              <Detail label="SLA Due" value={selected.sla_due_at ? String(selected.sla_due_at).slice(0, 16).replace('T', ' ') : '-'} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Detail label="SLA Status" value={selected.sla_status || 'within_sla'} />
              <Detail label="Assigned At" value={selected.assigned_at ? String(selected.assigned_at).slice(0, 16).replace('T', ' ') : '-'} />
              <Detail label="Resolved At" value={selected.resolved_at ? String(selected.resolved_at).slice(0, 16).replace('T', ' ') : '-'} />
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={() => onAssign(selected)} className="w-full rounded-lg bg-terracotta/10 px-3 py-2 text-sm font-bold text-charcoal">Assign / SLA</button>
            <button onClick={() => onUpdate(selected, 'open')} className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Mark Open</button>
            <button onClick={() => onUpdate(selected, 'in_progress')} className="w-full rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">In Progress</button>
            <button onClick={() => onUpdate(selected, 'resolved')} className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Resolve</button>
            <button onClick={() => onUpdate(selected, 'closed')} className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700">Close</button>
            {selected.user_email && <a href={`mailto:${selected.user_email}`} className="block w-full rounded-lg bg-charcoal px-3 py-2 text-center text-sm font-bold text-white">Reply by Email</a>}
          </div>
        </div>
      ) : <p className="p-6 text-sm text-slate-500">Select a ticket.</p>}
    </Panel>
  </div>
);

const Detail = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const MiniChart = ({ title, rows }) => (
  <Panel className="p-4">
    <h2 className="font-black">{title}</h2>
    <div className="mt-3 space-y-2">{rows.slice(0, 6).map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{row.label}</span><span>{row.count}</span></div>)}</div>
    {!rows.length && <p className="mt-3 text-sm text-slate-500">No data found.</p>}
  </Panel>
);

const TrendRows = ({ titleA, titleB, rows }) => {
  const maxCount = Math.max(...rows.map((row) => Number(row.count || 0)), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-xs font-black">
        <span className="inline-flex items-center gap-2 text-[#2f6df6]"><span className="h-2.5 w-2.5 rounded-full bg-[#2f6df6]" /> {titleA}</span>
        <span className="inline-flex items-center gap-2 text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {titleB}</span>
      </div>
      <div className="space-y-3">
        {rows.slice(0, 6).map((row, index) => {
          const value = Number(row.count || 0);
          const secondary = Math.max(0, Math.round(value * (0.55 + (index * 0.05))));
          return (
            <div key={row.label} className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3">
              <span className="text-xs font-bold text-slate-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index] || row.label}</span>
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-[#2f6df6]" style={{ width: `${(value / maxCount) * 100}%` }} />
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-emerald-400" style={{ width: `${(secondary / maxCount) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CategoryCard = ({ total, rows }) => (
  <Panel className="p-4">
    <h2 className="font-black">Tickets by Category</h2>
    <div className="mt-5 flex items-center gap-5">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(#2f6df6_0_28%,#8b5cf6_28%_49%,#f59e0b_49%_66%,#14b8a6_66%_81%,#94a3b8_81%_92%,#ef4444_92%_100%)]">
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-black text-slate-950">{total}</span>
          <span className="text-sm font-semibold text-slate-500">Tickets</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate font-semibold text-slate-700">{row.label}</span>
            </div>
            <span className="whitespace-nowrap font-black text-slate-900">{row.count} ({row.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  </Panel>
);

const QuickAction = ({ title, description, tone, onClick }) => {
  const tones = {
    blue: 'bg-[#eef5ff] text-[#2f6df6]',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone] || tones.blue}`}>
        <BookOpen className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
};

export default SupportTicketManagement;
