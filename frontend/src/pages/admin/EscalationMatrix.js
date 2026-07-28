import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Edit, History, Plus, Save, Timer, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const tabs = ['Escalation Rules', 'SLA Policies', 'Active Escalations', 'Escalation History', 'Notification Rules'];
const channels = ['in_app', 'email', 'sms', 'whatsapp', 'push', 'ai_voice_call'];
const priorities = ['low', 'medium', 'high', 'critical'];
const statuses = ['active', 'inactive', 'draft'];
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';

const emptyRule = {
  rule_name: '', process_name: '', task_type: '', business_division: '', department: '', branch: '',
  primary_owner_role: '', primary_owner: '', sla_duration_hours: 24, reminder_hours: 12,
  first_escalation: '', second_escalation: '', third_escalation: '', final_escalation: '',
  notification_channels: ['in_app'], auto_action: '', priority: 'medium', status: 'active',
};

const emptyPolicy = {
  policy_name: '', process_name: '', task_type: '', sla_duration_hours: 24, warning_before_hours: 4,
  breach_priority: 'high', business_hours_only: false, status: 'active',
};

const emptyNotification = {
  rule_name: '', event_name: '', channels: ['in_app'], recipient_roles: [], template: '', retry_enabled: true, status: 'active',
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-lg font-black">{title}</h2>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[calc(92vh-68px)] overflow-y-auto p-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;

const ToggleList = ({ values, selected, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {values.map((value) => (
      <button key={value} type="button" onClick={() => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])} className={`rounded-full px-3 py-1 text-xs font-bold ${selected.includes(value) ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>
        {value.replace(/_/g, ' ')}
      </button>
    ))}
  </div>
);

const RuleForm = ({ rule, onSaved, onCancel }) => {
  const [form, setForm] = useState({ ...emptyRule, ...(rule || {}) });
  const [error, setError] = useState('');
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError('');
    if (!form.rule_name || !form.process_name || !form.task_type) {
      setError('Rule name, process and task type are required');
      return;
    }
    try {
      const payload = { ...form, sla_duration_hours: Number(form.sla_duration_hours), reminder_hours: Number(form.reminder_hours) };
      if (rule?.rule_id) await adminPhase1API.updateEscalationRule(rule.rule_id, payload);
      else await adminPhase1API.createEscalationRule(payload);
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save escalation rule');
    }
  };
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Rule Name"><input className={inputClass} value={form.rule_name} onChange={(e) => setValue('rule_name', e.target.value)} /></Field>
        <Field label="Process Name"><input className={inputClass} value={form.process_name} onChange={(e) => setValue('process_name', e.target.value)} /></Field>
        <Field label="Task Type"><input className={inputClass} value={form.task_type} onChange={(e) => setValue('task_type', e.target.value)} /></Field>
        <Field label="Business Division"><input className={inputClass} value={form.business_division || ''} onChange={(e) => setValue('business_division', e.target.value)} /></Field>
        <Field label="Department"><input className={inputClass} value={form.department || ''} onChange={(e) => setValue('department', e.target.value)} /></Field>
        <Field label="Branch"><input className={inputClass} value={form.branch || ''} onChange={(e) => setValue('branch', e.target.value)} /></Field>
        <Field label="Primary Owner Role"><input className={inputClass} value={form.primary_owner_role || ''} onChange={(e) => setValue('primary_owner_role', e.target.value)} /></Field>
        <Field label="Primary Owner"><input className={inputClass} value={form.primary_owner || ''} onChange={(e) => setValue('primary_owner', e.target.value)} /></Field>
        <Field label="SLA Duration Hours"><input className={inputClass} type="number" min="1" value={form.sla_duration_hours} onChange={(e) => setValue('sla_duration_hours', e.target.value)} /></Field>
        <Field label="Reminder Hours"><input className={inputClass} type="number" min="0" value={form.reminder_hours} onChange={(e) => setValue('reminder_hours', e.target.value)} /></Field>
        <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => setValue('priority', e.target.value)}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        <Field label="First Escalation"><input className={inputClass} value={form.first_escalation || ''} onChange={(e) => setValue('first_escalation', e.target.value)} /></Field>
        <Field label="Second Escalation"><input className={inputClass} value={form.second_escalation || ''} onChange={(e) => setValue('second_escalation', e.target.value)} /></Field>
        <Field label="Third Escalation"><input className={inputClass} value={form.third_escalation || ''} onChange={(e) => setValue('third_escalation', e.target.value)} /></Field>
        <Field label="Final Escalation"><input className={inputClass} value={form.final_escalation || ''} onChange={(e) => setValue('final_escalation', e.target.value)} /></Field>
        <Field label="Auto Action"><input className={inputClass} value={form.auto_action || ''} onChange={(e) => setValue('auto_action', e.target.value)} /></Field>
      </div>
      <Field label="Notification Channels"><ToggleList values={channels} selected={form.notification_channels || []} onChange={(value) => setValue('notification_channels', value)} /></Field>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Save className="h-4 w-4" /> Save Rule</button></div>
    </div>
  );
};

const PolicyForm = ({ policy, onSaved, onCancel }) => {
  const [form, setForm] = useState({ ...emptyPolicy, ...(policy || {}) });
  const [error, setError] = useState('');
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError('');
    if (!form.policy_name || !form.process_name || !form.task_type) {
      setError('Policy name, process and task type are required');
      return;
    }
    try {
      const payload = { ...form, sla_duration_hours: Number(form.sla_duration_hours), warning_before_hours: Number(form.warning_before_hours) };
      if (policy?.policy_id) await adminPhase1API.updateSlaPolicy(policy.policy_id, payload);
      else await adminPhase1API.createSlaPolicy(payload);
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save SLA policy');
    }
  };
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Policy Name"><input className={inputClass} value={form.policy_name} onChange={(e) => setValue('policy_name', e.target.value)} /></Field>
        <Field label="Process"><input className={inputClass} value={form.process_name} onChange={(e) => setValue('process_name', e.target.value)} /></Field>
        <Field label="Task Type"><input className={inputClass} value={form.task_type} onChange={(e) => setValue('task_type', e.target.value)} /></Field>
        <Field label="SLA Hours"><input className={inputClass} type="number" min="1" value={form.sla_duration_hours} onChange={(e) => setValue('sla_duration_hours', e.target.value)} /></Field>
        <Field label="Warning Before Hours"><input className={inputClass} type="number" min="0" value={form.warning_before_hours} onChange={(e) => setValue('warning_before_hours', e.target.value)} /></Field>
        <Field label="Breach Priority"><select className={inputClass} value={form.breach_priority} onChange={(e) => setValue('breach_priority', e.target.value)}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
        <label className="mt-6 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.business_hours_only} onChange={(e) => setValue('business_hours_only', e.target.checked)} /> Business hours only</label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white">Save Policy</button></div>
    </div>
  );
};

const NotificationForm = ({ onSaved, onCancel }) => {
  const [form, setForm] = useState(emptyNotification);
  const [error, setError] = useState('');
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setError('');
    if (!form.rule_name || !form.event_name) {
      setError('Rule name and event name are required');
      return;
    }
    try {
      await adminPhase1API.createNotificationRule(form);
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save notification rule');
    }
  };
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Rule Name"><input className={inputClass} value={form.rule_name} onChange={(e) => setValue('rule_name', e.target.value)} /></Field>
        <Field label="Event Name"><input className={inputClass} value={form.event_name} onChange={(e) => setValue('event_name', e.target.value)} /></Field>
        <Field label="Recipient Roles"><input className={inputClass} value={form.recipient_roles.join(', ')} onChange={(e) => setValue('recipient_roles', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
        <label className="mt-6 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.retry_enabled} onChange={(e) => setValue('retry_enabled', e.target.checked)} /> Retry enabled</label>
      </div>
      <Field label="Channels"><ToggleList values={channels} selected={form.channels} onChange={(value) => setValue('channels', value)} /></Field>
      <Field label="Template"><textarea className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.template} onChange={(e) => setValue('template', e.target.value)} /></Field>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button onClick={save} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white">Save Notification Rule</button></div>
    </div>
  );
};

const EscalationMatrix = () => {
  const [activeTab, setActiveTab] = useState('Escalation Rules');
  const [state, setState] = useState({ loading: true, error: '', rules: [], policies: [], active: [], history: [], audits: [], notificationRules: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [rulesRes, policiesRes, activeRes, historyRes, notificationRes] = await Promise.all([
        adminPhase1API.escalationRules(),
        adminPhase1API.slaPolicies(),
        adminPhase1API.activeEscalations(),
        adminPhase1API.escalationHistory(),
        adminPhase1API.notificationRules(),
      ]);
      setState({
        loading: false,
        error: '',
        rules: rulesRes.data.data.rules,
        policies: policiesRes.data.data.policies,
        active: activeRes.data.data.instances,
        history: historyRes.data.data.instances,
        audits: historyRes.data.data.audits,
        notificationRules: notificationRes.data.data.rules,
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.detail || 'Failed to load escalation matrix' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const afterSave = () => {
    setNotice('Escalation and SLA configuration updated with audit history');
    setModal(null);
    load();
  };

  const changeRuleStatus = async (rule) => {
    const status = rule.status === 'active' ? 'inactive' : 'active';
    const reason = window.prompt(`Reason for changing ${rule.rule_name} to ${status}`);
    if (!reason) return;
    await adminPhase1API.updateEscalationRuleStatus(rule.rule_id, { status, reason });
    afterSave();
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} />;

  return (
    <div>
      <PageHeader
        title="Escalation & SLA Matrix"
        description="Define escalation rules separately from reporting managers for overdue verification, support, refund, payout and approval workflows."
        action={<button onClick={() => setModal({ type: 'rule', rule: null })} className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Rule</button>}
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <Panel className="mb-4 p-2"><div className="flex gap-2 overflow-x-auto">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${activeTab === tab ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{tab}</button>)}</div></Panel>

      {activeTab === 'Escalation Rules' && (
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Rule', 'Process', 'Task', 'Owner', 'SLA', 'Reminder', 'Escalation Path', 'Channels', 'Priority', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{state.rules.map((rule) => <tr key={rule.rule_id}><td className="px-4 py-3 font-black">{rule.rule_name}</td><td className="px-4 py-3">{rule.process_name}</td><td className="px-4 py-3">{rule.task_type}</td><td className="px-4 py-3">{rule.primary_owner_role || rule.primary_owner || '-'}</td><td className="px-4 py-3">{rule.sla_duration_hours}h</td><td className="px-4 py-3">{rule.reminder_hours}h</td><td className="px-4 py-3">{[rule.first_escalation, rule.second_escalation, rule.third_escalation, rule.final_escalation].filter(Boolean).join(' -> ')}</td><td className="px-4 py-3">{(rule.notification_channels || []).join(', ')}</td><td className="px-4 py-3 capitalize">{rule.priority}</td><td className="px-4 py-3"><StatusBadge value={rule.status} /></td><td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => setModal({ type: 'rule', rule })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Edit</button><button onClick={() => changeRuleStatus(rule)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">{rule.status === 'active' ? 'Disable' : 'Enable'}</button></div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">{state.rules.map((rule) => <div key={rule.rule_id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><BellRing className="h-4 w-4 text-terracotta" /><div><p className="font-black">{rule.rule_name}</p><p className="text-sm text-slate-500">{rule.task_type}</p></div></div><StatusBadge value={rule.status} /></div><p className="mt-2 text-sm">SLA: {rule.sla_duration_hours}h / Reminder: {rule.reminder_hours}h</p><button onClick={() => setModal({ type: 'rule', rule })} className="mt-3 text-sm font-bold text-terracotta">Edit Rule</button></div>)}</div>
        </Panel>
      )}

      {activeTab === 'SLA Policies' && (
        <div>
          <button onClick={() => setModal({ type: 'policy', policy: null })} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create SLA Policy</button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.policies.map((policy) => <Panel key={policy.policy_id} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black">{policy.policy_name}</p><p className="text-sm text-slate-500">{policy.process_name} / {policy.task_type}</p></div><StatusBadge value={policy.status} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p><span className="block text-xs font-bold uppercase text-slate-500">SLA</span>{policy.sla_duration_hours}h</p><p><span className="block text-xs font-bold uppercase text-slate-500">Warning</span>{policy.warning_before_hours}h</p><p><span className="block text-xs font-bold uppercase text-slate-500">Priority</span>{policy.breach_priority}</p><p><span className="block text-xs font-bold uppercase text-slate-500">Hours</span>{policy.business_hours_only ? 'Business only' : 'Calendar'}</p></div><button onClick={() => setModal({ type: 'policy', policy })} className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold"><Edit className="h-3.5 w-3.5" /> Edit</button></Panel>)}</div>
        </div>
      )}

      {activeTab === 'Active Escalations' && (
        <Panel className="overflow-hidden"><div className="divide-y divide-slate-100">{state.active.length ? state.active.map((item) => <div key={item.instance_id} className="grid gap-3 p-4 md:grid-cols-[1fr_140px_120px_120px] md:items-center"><div className="flex items-start gap-3"><Timer className="mt-1 h-4 w-4 text-terracotta" /><div><p className="font-black">{item.title || item.record_id}</p><p className="text-sm text-slate-500">{item.process_name} / {item.task_type} / Owner: {item.owner || '-'}</p></div></div><StatusBadge value={item.status} /><p className="text-sm font-bold">{item.age_hours || 0}h old</p><p className="text-sm capitalize">{item.priority}</p></div>) : <p className="p-4 text-sm text-slate-500">No active escalations.</p>}</div></Panel>
      )}

      {activeTab === 'Escalation History' && (
        <Panel className="overflow-hidden"><div className="divide-y divide-slate-100">{[...state.history, ...state.audits].length ? [...state.history, ...state.audits].map((item, index) => <div key={item.instance_id || item.audit_id || index} className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px] md:items-center"><div className="flex items-start gap-3"><History className="mt-1 h-4 w-4 text-terracotta" /><div><p className="font-black capitalize">{String(item.action || item.task_type || 'Escalation event').replace(/_/g, ' ')}</p><p className="text-sm text-slate-500">{item.record_id || item.user_id || 'system'}</p></div></div><StatusBadge value={item.status || item.module} /><p className="text-xs font-semibold text-slate-500">{String(item.updated_at || item.created_at || '').slice(0, 19)}</p></div>) : <p className="p-4 text-sm text-slate-500">No escalation history yet.</p>}</div></Panel>
      )}

      {activeTab === 'Notification Rules' && (
        <div>
          <button onClick={() => setModal({ type: 'notification' })} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Notification Rule</button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.notificationRules.map((rule) => <Panel key={rule.notification_rule_id} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black">{rule.rule_name}</p><p className="text-sm text-slate-500">{rule.event_name}</p></div><StatusBadge value={rule.status} /></div><p className="mt-3 text-sm"><span className="font-bold">Channels:</span> {(rule.channels || []).join(', ')}</p><p className="mt-1 text-sm"><span className="font-bold">Recipients:</span> {(rule.recipient_roles || []).join(', ') || '-'}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{rule.template || 'No template'}</p></Panel>)}</div>
        </div>
      )}

      {modal?.type === 'rule' && <Modal title={modal.rule ? 'Edit Escalation Rule' : 'Create Escalation Rule'} onClose={() => setModal(null)}><RuleForm rule={modal.rule} onSaved={afterSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'policy' && <Modal title={modal.policy ? 'Edit SLA Policy' : 'Create SLA Policy'} onClose={() => setModal(null)}><PolicyForm policy={modal.policy} onSaved={afterSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'notification' && <Modal title="Create Notification Rule" onClose={() => setModal(null)}><NotificationForm onSaved={afterSave} onCancel={() => setModal(null)} /></Modal>}
    </div>
  );
};

export default EscalationMatrix;
