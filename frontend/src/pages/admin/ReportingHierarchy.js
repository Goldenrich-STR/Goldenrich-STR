import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Building2, GitBranch, History, Network, Search, UserCog, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const views = ['Organization Tree', 'Department Tree', 'Branch Tree', 'Franchise Tree', 'Employee List', 'Reporting Exceptions', 'Unassigned Employees'];
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-lg font-black">{title}</h2>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[calc(92vh-68px)] overflow-y-auto p-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;

const buildTreeRows = (nodes) => {
  const byManager = nodes.reduce((acc, node) => {
    const key = node.reports_to || 'root';
    acc[key] = acc[key] || [];
    acc[key].push(node);
    return acc;
  }, {});
  const rows = [];
  const visit = (managerId, level) => {
    (byManager[managerId] || []).sort((a, b) => String(a.name).localeCompare(String(b.name))).forEach((node) => {
      rows.push({ ...node, level });
      visit(node.user_id, level + 1);
    });
  };
  visit('root', 0);
  return rows;
};

const NodeCard = ({ node, onManager, onTransfer, onHistory, compact = false }) => (
  <Panel className="overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-elevated">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/15 text-terracotta"><Network className="h-4 w-4" /></span>
        <div><p className="font-black text-slate-950">{node.name}</p><p className="text-xs font-semibold text-slate-500">{node.employee_code || node.user_id}</p></div>
      </div>
      <div className="p-4"><StatusBadge value={node.status} /></div>
    </div>
    <div className={`grid gap-2 border-y border-slate-100 bg-slate-50/70 p-4 text-sm ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Role</span>{node.role}</p>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Department</span>{node.department || '-'}</p>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Branch</span>{node.branch || '-'}</p>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Reports To</span>{node.reports_to_name || node.reports_to || 'Unassigned'}</p>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Direct Reports</span>{node.direct_reports_count}</p>
      <p><span className="block text-xs font-bold uppercase text-slate-500">Escalated Tasks</span>{node.escalated_tasks}</p>
    </div>
    <div className="flex flex-wrap gap-2 p-4">
      <button onClick={() => onManager(node)} className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-3 py-2 text-xs font-bold text-white"><UserCog className="h-3.5 w-3.5" /> Manager</button>
      <button onClick={() => onTransfer(node)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><ArrowRightLeft className="h-3.5 w-3.5" /> Transfer</button>
      <button onClick={() => onHistory(node)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><History className="h-3.5 w-3.5" /> History</button>
    </div>
  </Panel>
);

const ManagerForm = ({ node, managers, onSaved, onCancel }) => {
  const [reportsToId, setReportsToId] = useState(node.reports_to || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    setError('');
    if (!reportsToId || !reason) {
      setError('Reporting manager and reason are required');
      return;
    }
    try {
      await adminPhase1API.saveReportingRelation({ employee_id: node.user_id, reports_to_id: reportsToId, relation_type: 'primary', reason });
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save reporting manager');
    }
  };
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <Field label="Employee"><input className={inputClass} value={`${node.name} (${node.role})`} disabled /></Field>
      <Field label="Reports To"><select className={inputClass} value={reportsToId} onChange={(e) => setReportsToId(e.target.value)}><option value="">Select manager</option>{managers.filter((m) => m.user_id !== node.user_id && m.status === 'active').map((m) => <option key={m.user_id} value={m.user_id}>{m.name} ({m.role})</option>)}</select></Field>
      <Field label="Reason"><textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white">Save Manager</button></div>
    </div>
  );
};

const TransferForm = ({ node, managers, onSaved, onCancel }) => {
  const [form, setForm] = useState({ employee_id: node.user_id, new_branch: node.branch || '', new_department: node.department || '', new_franchise: node.franchise || '', new_manager_id: node.reports_to || '', reason: '' });
  const [error, setError] = useState('');
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError('');
    if (!form.reason) {
      setError('Reason is required');
      return;
    }
    try {
      await adminPhase1API.transferEmployee(form);
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to transfer employee');
    }
  };
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Employee"><input className={inputClass} value={node.name} disabled /></Field>
        <Field label="New Manager"><select className={inputClass} value={form.new_manager_id} onChange={(e) => setValue('new_manager_id', e.target.value)}><option value="">Keep unassigned</option>{managers.filter((m) => m.user_id !== node.user_id && m.status === 'active').map((m) => <option key={m.user_id} value={m.user_id}>{m.name} ({m.role})</option>)}</select></Field>
        <Field label="New Branch"><input className={inputClass} value={form.new_branch} onChange={(e) => setValue('new_branch', e.target.value)} /></Field>
        <Field label="New Department"><input className={inputClass} value={form.new_department} onChange={(e) => setValue('new_department', e.target.value)} /></Field>
        <Field label="New Franchise"><input className={inputClass} value={form.new_franchise} onChange={(e) => setValue('new_franchise', e.target.value)} /></Field>
      </div>
      <Field label="Reason"><textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.reason} onChange={(e) => setValue('reason', e.target.value)} /></Field>
      <div className="flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white">Transfer Employee</button></div>
    </div>
  );
};

const ReportingHierarchy = () => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('Organization Tree');
  const [filters, setFilters] = useState({ branch: '', department: '', role: '' });
  const [state, setState] = useState({ loading: true, error: '', nodes: [], exceptions: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.reportingHierarchy();
      setState({ loading: false, error: '', nodes: res.data.data.nodes, exceptions: res.data.data.exceptions || [] });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load reporting hierarchy', nodes: [], exceptions: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const options = useMemo(() => ({
    branch: Array.from(new Set(state.nodes.map((n) => n.branch).filter(Boolean))),
    department: Array.from(new Set(state.nodes.map((n) => n.department).filter(Boolean))),
    role: Array.from(new Set(state.nodes.map((n) => n.role).filter(Boolean))),
  }), [state.nodes]);

  const filteredNodes = useMemo(() => state.nodes.filter((node) => {
    const matchesSearch = [node.name, node.employee_code, node.role, node.branch, node.department].join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!filters.branch || node.branch === filters.branch) && (!filters.department || node.department === filters.department) && (!filters.role || node.role === filters.role);
  }), [state.nodes, search, filters]);

  const managers = useMemo(() => state.nodes.filter((node) => ['admin', 'employee', 'broker'].includes(node.role)), [state.nodes]);
  const treeRows = useMemo(() => buildTreeRows(filteredNodes), [filteredNodes]);
  const unassigned = filteredNodes.filter((node) => node.role !== 'admin' && !node.reports_to);
  const hierarchyStats = useMemo(() => {
    const active = filteredNodes.filter((node) => node.status === 'active').length;
    const assigned = filteredNodes.filter((node) => node.reports_to).length;
    return [
      { label: 'Total People', value: filteredNodes.length, icon: Network },
      { label: 'Assigned', value: assigned, icon: UserCog },
      { label: 'Unassigned', value: unassigned.length, icon: GitBranch },
      { label: 'Active', value: active, icon: Building2 },
    ];
  }, [filteredNodes, unassigned.length]);
  const grouped = (key) => filteredNodes.reduce((acc, node) => {
    const group = node[key] || 'Unassigned';
    acc[group] = acc[group] || [];
    acc[group].push(node);
    return acc;
  }, {});

  const afterSave = () => {
    setNotice('Reporting hierarchy updated and audit log created');
    setModal(null);
    load();
  };

  const openHistory = async (node) => {
    const res = await adminPhase1API.reportingHistory(node.user_id);
    setModal({ type: 'history', node, history: res.data.data.history, audits: res.data.data.audits });
  };

  const renderGroupView = (key, Icon) => (
    <div className="space-y-4">
      {Object.entries(grouped(key)).map(([group, nodes]) => (
        <Panel key={group} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4"><Icon className="h-4 w-4 text-terracotta" /><h2 className="font-black">{group}</h2><span className="text-sm font-bold text-slate-500">({nodes.length})</span></div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{nodes.map((node) => <NodeCard key={node.user_id} node={node} onManager={(n) => setModal({ type: 'manager', node: n })} onTransfer={(n) => setModal({ type: 'transfer', node: n })} onHistory={openHistory} compact />)}</div>
        </Panel>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="" title="Reporting Hierarchy" description="Manage reporting relationships independently from escalation ownership, with loop prevention, transfer validation and reporting history preserved." />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {hierarchyStats.map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/15 text-terracotta"><Icon className="h-5 w-5" /></span>
          </Panel>
        ))}
      </div>
      <Panel className="mb-5 overflow-hidden p-0">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white p-3">
          {views.map((item) => <button key={item} onClick={() => setView(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${view === item ? 'bg-charcoal text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>)}
        </div>
        <div className="grid gap-3 bg-slate-50/70 p-3 md:grid-cols-[1fr_180px_180px_160px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm" placeholder="Search employee, role, branch, department" />
          </div>
          {['branch', 'department', 'role'].map((key) => (
            <select key={key} className={inputClass} value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))}>
              <option value="">{key.replace(/^\w/, (c) => c.toUpperCase())}</option>
              {options[key].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ))}
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <>
          {view === 'Organization Tree' && (
            <Panel className="overflow-hidden">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Employee', 'Role', 'Department', 'Branch', 'Reports To', 'Direct Reports', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {treeRows.map((node) => <tr key={node.user_id} className="bg-white transition hover:bg-slate-50"><td className="px-4 py-4"><div style={{ paddingLeft: `${node.level * 20}px` }} className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/15 text-terracotta"><GitBranch className="h-4 w-4" /></span><div><p className="font-black text-slate-950">{node.name}</p><p className="text-xs font-semibold text-slate-500">{node.employee_code || node.user_id}</p></div></div></td><td className="px-4 py-4 capitalize"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{node.role}</span></td><td className="px-4 py-4">{node.department || '-'}</td><td className="px-4 py-4">{node.branch || '-'}</td><td className="px-4 py-4">{node.reports_to_name || 'Unassigned'}</td><td className="px-4 py-4 font-black">{node.direct_reports_count}</td><td className="px-4 py-4"><StatusBadge value={node.status} /></td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => setModal({ type: 'manager', node })} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-bold text-white">Manager</button><button onClick={() => setModal({ type: 'transfer', node })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Transfer</button><button onClick={() => openHistory(node)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">History</button></div></td></tr>)}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 md:hidden">{treeRows.map((node) => <NodeCard key={node.user_id} node={node} onManager={(n) => setModal({ type: 'manager', node: n })} onTransfer={(n) => setModal({ type: 'transfer', node: n })} onHistory={openHistory} compact />)}</div>
            </Panel>
          )}
          {view === 'Department Tree' && renderGroupView('department', Network)}
          {view === 'Branch Tree' && renderGroupView('branch', Building2)}
          {view === 'Franchise Tree' && renderGroupView('franchise', Building2)}
          {view === 'Employee List' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredNodes.map((node) => <NodeCard key={node.user_id} node={node} onManager={(n) => setModal({ type: 'manager', node: n })} onTransfer={(n) => setModal({ type: 'transfer', node: n })} onHistory={openHistory} />)}</div>}
          {view === 'Reporting Exceptions' && <Panel className="overflow-hidden"><div className="divide-y divide-slate-100">{state.exceptions.length ? state.exceptions.map((item, index) => <div key={`${item.user_id}-${index}`} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-black">{item.message}</p><p className="text-sm text-slate-500">{item.type} / {item.user_id}</p></div><StatusBadge value={item.severity} /></div>) : <p className="p-4 text-sm text-slate-500">No reporting exceptions found.</p>}</div></Panel>}
          {view === 'Unassigned Employees' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{unassigned.map((node) => <NodeCard key={node.user_id} node={node} onManager={(n) => setModal({ type: 'manager', node: n })} onTransfer={(n) => setModal({ type: 'transfer', node: n })} onHistory={openHistory} />)}</div>}
        </>
      )}
      {modal?.type === 'manager' && <Modal title="Change Reporting Manager" onClose={() => setModal(null)}><ManagerForm node={modal.node} managers={managers} onSaved={afterSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'transfer' && <Modal title="Transfer Employee" onClose={() => setModal(null)}><TransferForm node={modal.node} managers={managers} onSaved={afterSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'history' && <Modal title={`Reporting History - ${modal.node.name}`} onClose={() => setModal(null)}><div className="space-y-4"><Panel className="overflow-hidden"><div className="border-b border-slate-200 p-4"><h3 className="font-black">Relation History</h3></div>{modal.history.length ? modal.history.map((item) => <div key={item.history_id} className="border-b border-slate-100 p-4 text-sm"><p className="font-bold">{item.employee_id} reported to {item.reports_to_id}</p><p className="text-slate-500">{String(item.changed_at || '').slice(0, 19)}</p></div>) : <p className="p-4 text-sm text-slate-500">No previous relation history.</p>}</Panel><Panel className="overflow-hidden"><div className="border-b border-slate-200 p-4"><h3 className="font-black">Audit Timeline</h3></div>{modal.audits.length ? modal.audits.map((item) => <div key={item.audit_id} className="border-b border-slate-100 p-4 text-sm"><p className="font-bold capitalize">{String(item.action || '').replace(/_/g, ' ')}</p><p className="text-slate-500">{item.reason || 'No reason'} / {String(item.created_at || '').slice(0, 19)}</p></div>) : <p className="p-4 text-sm text-slate-500">No reporting audits yet.</p>}</Panel></div></Modal>}
    </div>
  );
};

export default ReportingHierarchy;
