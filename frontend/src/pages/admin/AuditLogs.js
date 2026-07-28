import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Download, Eye, Filter, Lock, Search, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const modules = ['', 'user_organization_management', 'roles_access_permissions', 'reporting_hierarchy', 'escalation_sla_matrix', 'audit_activity_logs', 'system_administration'];
const statuses = ['', 'success', 'failed', 'warning'];

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-lg font-black">{title}</h2>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[calc(92vh-68px)] overflow-y-auto p-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;

const JsonBlock = ({ title, value }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-200 p-3"><h3 className="text-sm font-black">{title}</h3></div>
    <pre className="max-h-80 overflow-auto bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(value || {}, null, 2)}</pre>
  </Panel>
);

const AuditLogs = () => {
  const [filters, setFilters] = useState({ search: '', module: '', action: '', user_id: '', record_id: '', status: '', date_from: '', date_to: '', limit: 50 });
  const [state, setState] = useState({ loading: true, error: '', logs: [], meta: {} });
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined)), [filters]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.auditLogs(params);
      setState({ loading: false, error: '', logs: res.data.data.logs, meta: res.data.meta || {} });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load audit logs', logs: [], meta: {} });
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const moduleCount = new Set(state.logs.map((log) => log.module).filter(Boolean)).size;
    const users = new Set(state.logs.map((log) => log.user_id).filter(Boolean)).size;
    const immutable = state.logs.filter((log) => log.immutable !== false).length;
    return { total: state.meta.total || state.logs.length, moduleCount, users, immutable };
  }, [state.logs, state.meta.total]);

  const exportCsv = async () => {
    const res = await adminPhase1API.exportAuditLogs(params);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setNotice('Audit logs exported. Export action is also audited.');
    load();
  };

  return (
    <div>
      <PageHeader
        title="Audit & Activity Logs"
        description="Immutable activity timeline for security, access changes, reporting changes, approvals and configuration updates."
        action={<button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" /> Export CSV</button>}
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Total Logs</p><p className="mt-2 text-2xl font-black">{stats.total}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Modules</p><p className="mt-2 text-2xl font-black">{stats.moduleCount}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Users</p><p className="mt-2 text-2xl font-black">{stats.users}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Immutable</p><p className="mt-2 flex items-center gap-2 text-2xl font-black"><Lock className="h-5 w-5 text-emerald-600" /> {stats.immutable}</p></Panel>
      </div>
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-black"><Filter className="h-4 w-4 text-terracotta" /> Filters</div>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:col-span-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="h-8 w-full bg-transparent text-sm" placeholder="Search user, action, record, reason" />
          </div>
          <Field label="Module"><select className={inputClass} value={filters.module} onChange={(e) => setFilter('module', e.target.value)}>{modules.map((item) => <option key={item || 'all'} value={item}>{item ? item.replace(/_/g, ' ') : 'All modules'}</option>)}</select></Field>
          <Field label="Action"><input className={inputClass} value={filters.action} onChange={(e) => setFilter('action', e.target.value)} /></Field>
          <Field label="User ID"><input className={inputClass} value={filters.user_id} onChange={(e) => setFilter('user_id', e.target.value)} /></Field>
          <Field label="Record ID"><input className={inputClass} value={filters.record_id} onChange={(e) => setFilter('record_id', e.target.value)} /></Field>
          <Field label="Status"><select className={inputClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>{statuses.map((item) => <option key={item || 'all'} value={item}>{item || 'All'}</option>)}</select></Field>
          <Field label="From"><input className={inputClass} type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} /></Field>
          <Field label="To"><input className={inputClass} type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} /></Field>
          <Field label="Limit"><select className={inputClass} value={filters.limit} onChange={(e) => setFilter('limit', Number(e.target.value))}>{[25, 50, 100, 250].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'User', 'Role', 'Module', 'Action', 'Record', 'Reason', 'Status', 'Lock', 'Details'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {state.logs.map((log) => (
                  <tr key={log.audit_id}>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{String(log.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.user_id}</td>
                    <td className="px-4 py-3 capitalize">{log.role}</td>
                    <td className="px-4 py-3"><StatusBadge value={log.module} /></td>
                    <td className="px-4 py-3 font-bold capitalize">{String(log.action || '').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.record_id || 'system'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">{log.reason || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge value={log.status} /></td>
                    <td className="px-4 py-3">{log.immutable !== false ? <Lock className="h-4 w-4 text-emerald-600" /> : '-'}</td>
                    <td className="px-4 py-3"><button onClick={() => setSelected(log)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold"><Eye className="h-3.5 w-3.5" /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {state.logs.length ? state.logs.map((log) => (
              <div key={log.audit_id} className="p-4">
                <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><Activity className="mt-1 h-4 w-4 text-terracotta" /><div><p className="font-black capitalize">{String(log.action || '').replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{log.user_id} / {log.record_id || 'system'}</p></div></div><StatusBadge value={log.status} /></div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{String(log.created_at || '').slice(0, 19)}</p>
                <button onClick={() => setSelected(log)} className="mt-3 text-sm font-bold text-terracotta">View Details</button>
              </div>
            )) : <p className="p-5 text-sm text-slate-500">No audit logs found.</p>}
          </div>
        </Panel>
      )}
      {selected && (
        <Modal title="Audit Log Details" onClose={() => setSelected(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-4 md:col-span-2">
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <p><span className="block text-xs font-bold uppercase text-slate-500">Audit ID</span>{selected.audit_id}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">User</span>{selected.user_id}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Module</span>{selected.module}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Action</span>{selected.action}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Record</span>{selected.record_id || 'system'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Branch</span>{selected.branch || '-'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">IP</span>{selected.ip_address || '-'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Immutable</span>{selected.immutable !== false ? 'Yes' : 'No'}</p>
              </div>
              {selected.reason && <p className="mt-4 text-sm"><span className="font-black">Reason:</span> {selected.reason}</p>}
            </Panel>
            <JsonBlock title="Old Value" value={selected.old_value} />
            <JsonBlock title="New Value" value={selected.new_value} />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogs;
