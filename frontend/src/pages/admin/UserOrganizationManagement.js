import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, History, KeyRound, Power, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const tabs = [
  ['all', 'All Users'], ['guest', 'Guests'], ['host', 'Hosts'], ['employee', 'Employees'], ['broker', 'Brokers'], ['admin', 'Administrators'], ['inactive', 'Inactive Users'],
];

const baseForm = {
  full_name: '', email: '', phone: '', alternate_phone: '', role: 'guest', password: '',
  birthdate: '', gender: '', address: '', city: '', state: '', pin_code: '',
  employee_code: '', designation: '', department: '', business_division: '', branch: '', franchise: '',
  joining_date: '', employment_type: '', work_location: '', employment_status: 'active',
  reports_to: '', secondary_reports_to: '', hierarchy_level: '', team: '', escalation_manager: '', approval_authority: '',
  access_scope: 'self', admin_role_key: '', access_controls: [], admin_delete_protected: false,
};

const accessOptions = ['self', 'assigned_records', 'direct_reports', 'full_team', 'department', 'branch', 'franchise', 'region', 'state', 'global', 'custom'];
const permissionOptions = ['view', 'create', 'edit', 'approve', 'reject', 'assign', 'export', 'delete', 'manage_settings', 'view_sensitive_data', 'manage_permissions'];

const getApiMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message || String(item)).join(', ');
  return detail || error?.message || fallback;
};

const normalizeUsersResponse = (payload) => payload?.data?.users || payload?.users || [];

const ModalShell = ({ title, children, onClose }) => (
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
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';

const UserForm = ({ initialUser, managers, onCancel, onSaved }) => {
  const [form, setForm] = useState({ ...baseForm, ...(initialUser || {}), password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEmploymentRole = ['employee', 'broker', 'admin'].includes(form.role);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const togglePermission = (permission) => setForm((current) => ({
    ...current,
    access_controls: current.access_controls.includes(permission)
      ? current.access_controls.filter((item) => item !== permission)
      : [...current.access_controls, permission],
  }));

  const submit = async (createAnother = false) => {
    setError('');
    if (!form.full_name || !form.email || !form.phone) {
      setError('Full name, email and mobile are required');
      return;
    }
    if (!initialUser && (!form.password || form.password.length < 8)) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      setSaving(true);
      if (initialUser?.user_id) {
        await adminPhase1API.updateUser(initialUser.user_id, form);
      } else {
        await adminPhase1API.createUser(form);
      }
      onSaved(createAnother);
      if (createAnother) setForm(baseForm);
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <Panel className="p-4">
        <h3 className="mb-3 font-black">Personal Information</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Full Name"><input className={inputClass} value={form.full_name} onChange={(e) => setValue('full_name', e.target.value)} /></Field>
          <Field label="Email Address"><input className={inputClass} type="email" value={form.email} onChange={(e) => setValue('email', e.target.value)} /></Field>
          <Field label="Phone Number"><input className={inputClass} value={form.phone} onChange={(e) => setValue('phone', e.target.value)} /></Field>
          <Field label="Alternate Phone"><input className={inputClass} value={form.alternate_phone || ''} onChange={(e) => setValue('alternate_phone', e.target.value)} /></Field>
          {!initialUser && <Field label="Password"><input className={inputClass} type="password" value={form.password} onChange={(e) => setValue('password', e.target.value)} placeholder="Minimum 8 chars, Aa + number" /></Field>}
          <Field label="Date of Birth"><input className={inputClass} type="date" value={form.birthdate || ''} onChange={(e) => setValue('birthdate', e.target.value)} /></Field>
          <Field label="Gender"><select className={inputClass} value={form.gender || ''} onChange={(e) => setValue('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="City"><input className={inputClass} value={form.city || ''} onChange={(e) => setValue('city', e.target.value)} /></Field>
          <Field label="State"><input className={inputClass} value={form.state || ''} onChange={(e) => setValue('state', e.target.value)} /></Field>
          <Field label="PIN Code"><input className={inputClass} value={form.pin_code || ''} onChange={(e) => setValue('pin_code', e.target.value)} /></Field>
          <Field label="Address"><textarea className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" value={form.address || ''} onChange={(e) => setValue('address', e.target.value)} /></Field>
        </div>
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 font-black">Employment Information</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Base Role"><select className={inputClass} value={form.role} onChange={(e) => setValue('role', e.target.value)}>{['guest', 'host', 'employee', 'broker', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
          {isEmploymentRole && <>
            <Field label="Employee Code"><input className={inputClass} value={form.employee_code || ''} onChange={(e) => setValue('employee_code', e.target.value)} /></Field>
            <Field label="Designation"><input className={inputClass} value={form.designation || ''} onChange={(e) => setValue('designation', e.target.value)} /></Field>
            <Field label="Department"><input className={inputClass} value={form.department || ''} onChange={(e) => setValue('department', e.target.value)} /></Field>
            <Field label="Business Division"><input className={inputClass} value={form.business_division || ''} onChange={(e) => setValue('business_division', e.target.value)} /></Field>
            <Field label="Branch"><input className={inputClass} value={form.branch || ''} onChange={(e) => setValue('branch', e.target.value)} /></Field>
            <Field label="Franchise"><input className={inputClass} value={form.franchise || ''} onChange={(e) => setValue('franchise', e.target.value)} /></Field>
            <Field label="Joining Date"><input className={inputClass} type="date" value={form.joining_date || ''} onChange={(e) => setValue('joining_date', e.target.value)} /></Field>
            <Field label="Employment Type"><select className={inputClass} value={form.employment_type || ''} onChange={(e) => setValue('employment_type', e.target.value)}><option value="">Select</option><option>Full Time</option><option>Part Time</option><option>Contract</option></select></Field>
            <Field label="Work Location"><input className={inputClass} value={form.work_location || ''} onChange={(e) => setValue('work_location', e.target.value)} /></Field>
          </>}
        </div>
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 font-black">Reporting Structure</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Reports To"><select className={inputClass} value={form.reports_to || ''} onChange={(e) => setValue('reports_to', e.target.value)}><option value="">Unassigned</option>{managers.filter((m) => m.user_id !== initialUser?.user_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.role})</option>)}</select></Field>
          <Field label="Secondary Manager"><select className={inputClass} value={form.secondary_reports_to || ''} onChange={(e) => setValue('secondary_reports_to', e.target.value)}><option value="">None</option>{managers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}</select></Field>
          <Field label="Escalation Manager"><select className={inputClass} value={form.escalation_manager || ''} onChange={(e) => setValue('escalation_manager', e.target.value)}><option value="">None</option>{managers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}</select></Field>
          <Field label="Hierarchy Level"><input className={inputClass} value={form.hierarchy_level || ''} onChange={(e) => setValue('hierarchy_level', e.target.value)} /></Field>
          <Field label="Team"><input className={inputClass} value={form.team || ''} onChange={(e) => setValue('team', e.target.value)} /></Field>
          <Field label="Approval Authority"><input className={inputClass} value={form.approval_authority || ''} onChange={(e) => setValue('approval_authority', e.target.value)} /></Field>
        </div>
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 font-black">Access Control</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Access Scope"><select className={inputClass} value={form.access_scope || 'self'} onChange={(e) => setValue('access_scope', e.target.value)}>{accessOptions.map((scope) => <option key={scope} value={scope}>{scope.replace(/_/g, ' ')}</option>)}</select></Field>
          <Field label="Admin Role Key"><input className={inputClass} value={form.admin_role_key || ''} onChange={(e) => setValue('admin_role_key', e.target.value)} placeholder="super_admin, branch_manager..." /></Field>
          <label className="mt-6 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.admin_delete_protected} onChange={(e) => setValue('admin_delete_protected', e.target.checked)} /> Protected account</label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {permissionOptions.map((permission) => <button key={permission} type="button" onClick={() => togglePermission(permission)} className={`rounded-full px-3 py-1 text-xs font-bold ${form.access_controls.includes(permission) ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{permission.replace(/_/g, ' ')}</button>)}
        </div>
      </Panel>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white py-3 md:flex-row md:justify-end">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
        {!initialUser && <button disabled={saving} onClick={() => submit(true)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Create and Create Another</button>}
        <button disabled={saving} onClick={() => submit(false)} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white">{saving ? 'Saving...' : initialUser ? 'Save Changes' : 'Create User'}</button>
      </div>
    </div>
  );
};

const SmallAction = ({ icon: Icon, label, onClick, tone = 'slate' }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${tone === 'red' ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`} title={label}>
    <Icon className="h-3.5 w-3.5" /> {label}
  </button>
);

const UserOrganizationManagement = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', users: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const managers = useMemo(() => state.users.filter((u) => ['admin', 'employee', 'broker'].includes(u.role) && u.is_active !== false), [state.users]);

  const loadUsers = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const cleanSearch = search.trim() || undefined;
      const params = tab === 'inactive'
        ? { status: 'inactive', search: cleanSearch }
        : { role: tab === 'all' ? undefined : tab, search: cleanSearch };
      const res = await adminPhase1API.users(params);
      setState({ loading: false, error: '', users: normalizeUsersResponse(res.data) });
    } catch (error) {
      setState({ loading: false, error: getApiMessage(error, 'Failed to load users'), users: [] });
    }
  }, [tab, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const closeAndReload = (keepOpen) => {
    setNotice('User flow saved and audit log created');
    if (!keepOpen) setModal(null);
    loadUsers();
  };

  const changeStatus = async (user) => {
    if (user.admin_delete_protected && user.is_active !== false) {
      setNotice('Protected admin account cannot be deactivated.');
      return;
    }
    const reason = window.prompt(`Reason for ${user.is_active === false ? 'activating' : 'deactivating'} this user`);
    if (!reason) return;
    try {
      await adminPhase1API.updateUserStatus(user.user_id, { is_active: user.is_active === false, reason });
      closeAndReload(false);
    } catch (error) {
      setNotice(getApiMessage(error, 'Unable to update user status'));
    }
  };

  const resetPassword = async (user) => {
    const password = window.prompt('Enter new temporary password. Minimum 8 chars, uppercase, lowercase and number.');
    if (!password) return;
    const reason = window.prompt('Reason for password reset');
    if (!reason) return;
    try {
      await adminPhase1API.resetUserPassword(user.user_id, { password, reason });
      setNotice('Password reset completed and audited');
    } catch (error) {
      setNotice(getApiMessage(error, 'Unable to reset password'));
    }
  };

  const openAudit = async (user) => {
    try {
      const res = await adminPhase1API.userAuditLogs(user.user_id);
      setModal({ type: 'audit', user, logs: res.data?.data?.logs || res.data?.logs || [] });
    } catch (error) {
      setNotice(getApiMessage(error, 'Unable to load audit history'));
    }
  };

  const deleteInactiveUser = async (user) => {
    if (user.admin_delete_protected) {
      setNotice('Protected admin account cannot be deleted.');
      return;
    }
    if (user.is_active !== false) {
      setNotice('Only inactive users can be deleted. Deactivate the user first.');
      return;
    }
    const confirmed = window.confirm(`Delete inactive user ${user.full_name || user.email}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await adminPhase1API.deleteUser(user.user_id);
      setNotice('Inactive user deleted and audit log created');
      loadUsers();
    } catch (error) {
      setNotice(getApiMessage(error, 'Unable to delete inactive user'));
    }
  };

  return (
    <div>
      <PageHeader
        title="User & Organization Management"
        description="Manage users, employees, brokers, administrators, access, reporting managers, branches and user lifecycle."
        action={<button onClick={() => setModal({ type: 'form', user: null })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><UserPlus className="h-4 w-4" /> Create User</button>}
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <Panel className="mb-4 p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${tab === id ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm" placeholder="Search name, user ID, email, mobile, employee code" />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['User ID', 'Profile', 'Full Name', 'Role', 'Designation', 'Department', 'Branch', 'Reporting Manager', 'Mobile', 'Email', 'Status', 'Registration Date', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-4 py-3 font-mono text-xs">{u.uid || u.user_id}</td>
                    <td className="px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage text-xs font-black text-white">{u.full_name?.[0]}</span></td>
                    <td className="px-4 py-3 font-bold">{u.full_name}</td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">{u.designation || '-'}</td>
                    <td className="px-4 py-3">{u.department || '-'}</td>
                    <td className="px-4 py-3">{u.branch || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.reports_to || '-'}</td>
                    <td className="px-4 py-3">{u.phone}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3"><StatusBadge value={u.is_active === false ? 'inactive' : 'active'} /></td>
                    <td className="px-4 py-3">{String(u.created_at || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <SmallAction icon={Edit} label="Edit" onClick={() => setModal({ type: 'form', user: u })} />
                        <SmallAction icon={ShieldCheck} label="Access" onClick={() => setModal({ type: 'form', user: u })} />
                        <SmallAction icon={KeyRound} label="Reset" onClick={() => resetPassword(u)} />
                        <SmallAction icon={History} label="Audit" onClick={() => openAudit(u)} />
                        <SmallAction icon={Power} label={u.is_active === false ? 'Activate' : 'Deactivate'} tone={u.is_active === false ? 'slate' : 'red'} onClick={() => changeStatus(u)} />
                        {tab === 'inactive' && (
                          <SmallAction icon={Trash2} label="Delete" tone="red" onClick={() => deleteInactiveUser(u)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {state.users.map((u) => (
              <div key={u.user_id} className="p-4">
                <div className="flex justify-between gap-3"><div><p className="font-black">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></div><StatusBadge value={u.is_active === false ? 'inactive' : 'active'} /></div>
                <p className="mt-2 text-sm capitalize">{u.role} / {u.branch || 'No branch'}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <SmallAction icon={Edit} label="Edit" onClick={() => setModal({ type: 'form', user: u })} />
                  <SmallAction icon={History} label="Audit" onClick={() => openAudit(u)} />
                  <SmallAction icon={Power} label={u.is_active === false ? 'Activate' : 'Deactivate'} onClick={() => changeStatus(u)} />
                  {tab === 'inactive' && (
                    <SmallAction icon={Trash2} label="Delete" tone="red" onClick={() => deleteInactiveUser(u)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {modal?.type === 'form' && (
        <ModalShell title={modal.user ? 'Edit User' : 'Create User'} onClose={() => setModal(null)}>
          <UserForm initialUser={modal.user} managers={managers} onCancel={() => setModal(null)} onSaved={closeAndReload} />
        </ModalShell>
      )}
      {modal?.type === 'audit' && (
        <ModalShell title={`Audit History - ${modal.user.full_name}`} onClose={() => setModal(null)}>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {modal.logs.length ? modal.logs.map((log) => (
              <div key={log.audit_id} className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="font-black capitalize">{String(log.action || '').replace(/_/g, ' ')}</p>
                  <StatusBadge value={log.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{log.module} / {String(log.created_at || '').slice(0, 19)}</p>
                {log.reason && <p className="mt-2 text-sm font-semibold text-slate-700">Reason: {log.reason}</p>}
              </div>
            )) : <p className="p-4 text-sm text-slate-500">No audit records for this user yet.</p>}
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default UserOrganizationManagement;
