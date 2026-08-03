import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, CalendarCheck, FileText, Headphones, Home, TrendingUp, Users } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, showNotice } from './shared';

const fallbackAnalytics = {
  phase_steps: [
    { step: 'Step 1', label: 'Analytics Overview Dashboard', status: 'completed' },
    { step: 'Step 2', label: 'Advanced Reports & Filters', status: 'completed' },
    { step: 'Step 3', label: 'Export Center', status: 'completed' },
    { step: 'Step 4', label: 'Compliance Readiness', status: 'completed' },
    { step: 'Step 5', label: 'Phase 9 Testing & Hardening', status: 'completed' },
  ],
  kpis: {},
  charts: {},
  health: {},
  recent_activity: [],
  report_rows: [],
  compliance: { score: 0, items: [], audit_modules: [] },
};

const ReportsAnalytics = () => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [filters, setFilters] = useState({ module: 'all', status: '', date_from: '', date_to: '' });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const response = await adminPhase1API.analyticsOverview(filters);
      setState({ loading: false, error: '', data: response.data.data });
    } catch (error) {
      setState({ loading: false, error: '', data: fallbackAnalytics });
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const data = state.data || {};
  const kpis = data.kpis || {};
  const health = data.health || {};

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportModule = async (moduleName) => {
    try {
      const response = await adminPhase1API.exportAnalytics({ ...filters, module: moduleName });
      downloadBlob(response.data, `${moduleName}_analytics.csv`);
    } catch (error) {
      await showNotice({ title: 'Export Failed', description: error.response?.data?.detail || 'Export failed. Please try after backend restart.', eyebrow: 'Action Failed' });
    }
  };

  const exportAudit = async () => {
    try {
      const response = await adminPhase1API.exportAuditLogs({ date_from: filters.date_from, date_to: filters.date_to, status: filters.status });
      downloadBlob(response.data, 'audit_logs.csv');
    } catch (error) {
      await showNotice({ title: 'Audit Export Failed', description: error.response?.data?.detail || 'Audit export failed', eyebrow: 'Action Failed' });
    }
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Platform analytics overview across users, properties, bookings, finance, CRM, support and CMS performance." />
      <Panel className="mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-5">
          <select value={filters.module} onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm">
            {['all', 'users', 'properties', 'bookings', 'finance', 'support', 'crm', 'cms'].map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
          </select>
          <input value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Status filter" />
          <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} className="h-11 rounded-lg border border-slate-200 px-3 text-sm" />
          <button onClick={() => setFilters({ module: 'all', status: '', date_from: '', date_to: '' })} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Reset Filters</button>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {[
              ['Users', kpis.users_total || 0, Users],
              ['Properties', kpis.properties_total || 0, Home],
              ['Bookings', kpis.bookings_total || 0, CalendarCheck],
              ['Revenue', formatMoney(kpis.revenue_total || 0), TrendingUp],
              ['Open Support', kpis.support_open || 0, Headphones],
              ['CMS Live', kpis.cms_active_sections || 0, FileText],
            ].map(([label, value, Icon]) => <Panel key={label} className="p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4ff] text-[#2563eb]"><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 break-words text-2xl font-black">{value}</p></Panel>)}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="p-4">
              <h2 className="font-black">Performance Health</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Health label="Booking Conversion" value={health.booking_conversion_rate || 0} />
                <Health label="Lead Conversion" value={health.lead_conversion_rate || 0} />
                <Health label="Support Resolution" value={health.support_resolution_rate || 0} />
                <Health label="CMS Publish Rate" value={health.cms_publish_rate || 0} />
              </div>
            </Panel>
            <Panel className="p-4">
              <h2 className="font-black">Phase 9 Steps</h2>
              <div className="mt-3 space-y-2">
                {(data.phase_steps || []).map((item) => <div key={item.step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{item.step}</b> {item.label}</span><StatusBadge value={item.status} /></div>)}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <MiniChart title="Users By Role" rows={data.charts?.users_by_role || []} />
            <MiniChart title="Properties By Status" rows={data.charts?.properties_by_status || []} />
            <MiniChart title="Bookings By Status" rows={data.charts?.bookings_by_status || []} />
            <MiniChart title="Revenue Status" rows={data.charts?.revenue_by_status || []} />
            <MiniChart title="Support By Status" rows={data.charts?.support_by_status || []} />
            <MiniChart title="CRM Leads By Status" rows={data.charts?.leads_by_status || []} />
          </div>

          {filters.module !== 'all' && <FilteredReport module={filters.module} rows={data.report_rows || []} />}

          <ExportCenter currentModule={filters.module} onExport={exportModule} onAuditExport={exportAudit} />

          <ComplianceReadiness compliance={data.compliance || fallbackAnalytics.compliance} />

          <Panel className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-black">Recent Analytics Activity</h2>
              <p className="text-xs text-slate-500">Latest audited platform events feeding reports and compliance views.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'Module', 'Action', 'Record', 'User', 'Status'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.recent_activity || []).map((log) => <tr key={log.audit_id || `${log.record_id}-${log.created_at}`}><td className="px-4 py-3">{log.created_at ? String(log.created_at).slice(0, 16).replace('T', ' ') : '-'}</td><td className="px-4 py-3">{log.module || '-'}</td><td className="px-4 py-3">{log.action || '-'}</td><td className="px-4 py-3 font-mono text-xs">{log.record_id || 'system'}</td><td className="px-4 py-3">{log.user_id || '-'}</td><td className="px-4 py-3"><StatusBadge value={log.status || 'success'} /></td></tr>)}
                </tbody>
              </table>
              {!data.recent_activity?.length && <p className="p-6 text-sm text-slate-500">No activity found.</p>}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};

const Health = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-black">{value}%</p>
  </div>
);

const MiniChart = ({ title, rows }) => (
  <Panel className="p-4">
    <div className="mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-terracotta" /><h2 className="font-black">{title}</h2></div>
    <div className="space-y-2">
      {rows.slice(0, 6).map((row) => <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{row.label}</span><span>{row.count ?? row.value ?? 0}</span></div>)}
      {!rows.length && <p className="text-sm text-slate-500">No data found.</p>}
    </div>
  </Panel>
);

const ExportCenter = ({ currentModule, onExport, onAuditExport }) => {
  const modules = ['users', 'properties', 'bookings', 'finance', 'support', 'crm', 'cms'];
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black">Export Center</h2>
          <p className="text-xs text-slate-500">Download module-wise CSV reports using the active date and status filters.</p>
        </div>
        <button onClick={onAuditExport} className="rounded-lg bg-charcoal px-3 py-2 text-sm font-black text-white">Export Audit Logs</button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {modules.map((moduleName) => <button key={moduleName} onClick={() => onExport(moduleName)} className={`rounded-lg px-3 py-2 text-sm font-black ${currentModule === moduleName ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-700'}`}>{moduleName}</button>)}
      </div>
    </Panel>
  );
};

const ComplianceReadiness = ({ compliance }) => (
  <Panel className="p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-black">Compliance Readiness</h2>
        <p className="text-xs text-slate-500">Audit coverage, security policy, KYC, property, CMS and backup readiness signals.</p>
      </div>
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
        <p className="text-xs font-bold uppercase text-slate-500">Score</p>
        <p className="text-2xl font-black">{compliance?.score || 0}%</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {(compliance?.items || []).map((item) => <div key={item.key} className="rounded-lg bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><p className="font-black">{item.label}</p><StatusBadge value={item.status} /></div><p className="mt-2 text-sm text-slate-500">{item.value}</p></div>)}
      {!(compliance?.items || []).length && <p className="text-sm text-slate-500">No compliance data found.</p>}
    </div>
  </Panel>
);

const FilteredReport = ({ module, rows }) => {
  const columns = reportColumns[module] || ['id', 'status', 'created_at'];
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-black capitalize">{module} Filtered Report</h2>
        <p className="text-xs text-slate-500">Filtered records for the selected module, limited to the latest 50 rows.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column.replace(/_/g, ' ')}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => <tr key={row.user_id || row.property_id || row.booking_id || row.transaction_id || row.ticket_id || row.lead_id || row.content_id || index}>{columns.map((column) => <td key={column} className="px-4 py-3">{formatCell(row[column])}</td>)}</tr>)}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-sm text-slate-500">No filtered rows found.</p>}
      </div>
    </Panel>
  );
};

const reportColumns = {
  users: ['user_id', 'full_name', 'role', 'email', 'phone', 'created_at'],
  properties: ['property_id', 'title', 'category', 'city', 'status', 'created_at'],
  bookings: ['booking_id', 'property_id', 'user_id', 'booking_status', 'payment_status', 'created_at'],
  finance: ['transaction_id', 'type', 'status', 'amount', 'user_id', 'created_at'],
  support: ['ticket_id', 'subject', 'category', 'priority', 'status', 'created_at'],
  crm: ['lead_id', 'name', 'phone', 'status', 'source', 'created_at'],
  cms: ['content_id', 'page', 'section', 'content_type', 'is_active', 'updated_at'],
};

const formatCell = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80);
  return String(value).slice(0, 120);
};

export default ReportsAnalytics;
