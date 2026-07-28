import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, History, Plus, Save, ShieldCheck, Trash2, UserCog, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const scopes = ['self', 'assigned_records', 'direct_reports', 'full_team', 'department', 'branch', 'franchise', 'region', 'state', 'global', 'custom'];
const deletePolicies = ['protected', 'soft_delete_only', 'deactivatable', 'permanent_delete_allowed'];
const tabs = ['Roles', 'Permission Matrix', 'User Access', 'Data Scope', 'Protected Accounts', 'Access History'];

const emptyRole = {
  role_name: '',
  role_key: '',
  description: '',
  data_scope: 'self',
  permissions: [],
  is_active: true,
  delete_policy: 'soft_delete_only',
  approval_authority: [],
};

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

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const Field = ({ label, children }) => <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;

const groupPermissions = (permissions) => permissions.reduce((acc, item) => {
  acc[item.module] = acc[item.module] || [];
  acc[item.module].push(item);
  return acc;
}, {});

const RoleForm = ({ role, permissions, onClose, onSaved }) => {
  const [form, setForm] = useState({ ...emptyRole, ...(role || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const togglePermission = (key) => setForm((current) => ({
    ...current,
    permissions: current.permissions.includes(key) ? current.permissions.filter((item) => item !== key) : [...current.permissions, key],
  }));
  const toggleModule = (modulePermissions) => {
    const keys = modulePermissions.map((item) => item.permission_key);
    const allSelected = keys.every((key) => form.permissions.includes(key));
    setForm((current) => ({
      ...current,
      permissions: allSelected ? current.permissions.filter((key) => !keys.includes(key)) : Array.from(new Set([...current.permissions, ...keys])),
    }));
  };

  const save = async () => {
    setError('');
    if (!form.role_name) {
      setError('Role name is required');
      return;
    }
    try {
      setSaving(true);
      if (role?.role_id) await adminPhase1API.updateRole(role.role_id, form);
      else await adminPhase1API.createRole(form);
      onSaved();
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Role Name"><input className={inputClass} value={form.role_name} onChange={(e) => setValue('role_name', e.target.value)} /></Field>
          <Field label="Role Key"><input className={inputClass} value={form.role_key || ''} onChange={(e) => setValue('role_key', e.target.value)} placeholder="branch_manager" /></Field>
          <Field label="Data Scope"><select className={inputClass} value={form.data_scope} onChange={(e) => setValue('data_scope', e.target.value)}>{scopes.map((scope) => <option key={scope} value={scope}>{scope.replace(/_/g, ' ')}</option>)}</select></Field>
          <Field label="Delete Policy"><select className={inputClass} value={form.delete_policy} onChange={(e) => setValue('delete_policy', e.target.value)}>{deletePolicies.map((policy) => <option key={policy} value={policy}>{policy.replace(/_/g, ' ')}</option>)}</select></Field>
          <label className="mt-6 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(e) => setValue('is_active', e.target.checked)} /> Active role</label>
          <Field label="Description"><input className={inputClass} value={form.description || ''} onChange={(e) => setValue('description', e.target.value)} /></Field>
        </div>
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4"><h3 className="font-black">Editable Permission Matrix</h3></div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {Object.entries(grouped).map(([module, modulePermissions]) => (
            <div key={module} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-black capitalize">{module.replace(/_/g, ' ')}</h4>
                <button type="button" onClick={() => toggleModule(modulePermissions)} className="text-xs font-bold text-terracotta">Toggle module</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {modulePermissions.map((permission) => (
                  <button
                    key={permission.permission_key}
                    type="button"
                    onClick={() => togglePermission(permission.permission_key)}
                    className={`rounded-full px-2 py-1 text-xs font-bold ${form.permissions.includes(permission.permission_key) ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {permission.action.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white py-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Role'}</button>
      </div>
    </div>
  );
};

const UserAccessForm = ({ users, roles, permissions, onSaved }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [scope, setScope] = useState('self');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const selectedUser = users.find((user) => user.user_id === selectedUserId);

  useEffect(() => {
    if (!selectedUser) return;
    setRoleKey(selectedUser.admin_role_key || '');
    setScope(selectedUser.admin_scope || selectedUser.access_scope || 'self');
    setSelectedPermissions(selectedUser.access_controls || []);
  }, [selectedUser]);

  const toggle = (key) => setSelectedPermissions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const save = async () => {
    setError('');
    if (!selectedUserId || !reason) {
      setError('Select user and enter reason');
      return;
    }
    try {
      await adminPhase1API.assignAccess(selectedUserId, { role_key: roleKey, access_scope: scope, permissions: selectedPermissions, reason });
      onSaved();
      setReason('');
    } catch (apiError) {
      setError(apiError.response?.data?.detail || 'Unable to assign access');
    }
  };

  return (
    <Panel className="p-4">
      {error && <div className="mb-3"><ErrorState message={error} /></div>}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="User"><select className={inputClass} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}><option value="">Select user</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.full_name} ({user.role})</option>)}</select></Field>
        <Field label="Role"><select className={inputClass} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}><option value="">No admin role</option>{roles.map((role) => <option key={role.role_id} value={role.role_key}>{role.role_name}</option>)}</select></Field>
        <Field label="Data Scope"><select className={inputClass} value={scope} onChange={(e) => setScope(e.target.value)}>{scopes.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></Field>
        <Field label="Reason"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
        {permissions.map((permission) => <button key={permission.permission_key} type="button" onClick={() => toggle(permission.permission_key)} className={`rounded-full px-2 py-1 text-xs font-bold ${selectedPermissions.includes(permission.permission_key) ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{permission.permission_key}</button>)}
      </div>
      <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><UserCog className="h-4 w-4" /> Assign Access</button>
    </Panel>
  );
};

const RolesPermissions = () => {
  const [activeTab, setActiveTab] = useState('Roles');
  const [state, setState] = useState({ loading: true, error: '', roles: [], permissions: [], users: [], protectedUsers: [], history: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const grouped = useMemo(() => groupPermissions(state.permissions), [state.permissions]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [rolesRes, permissionsRes, usersRes, protectedRes, historyRes] = await Promise.all([
        adminPhase1API.roles(),
        adminPhase1API.permissions(),
        adminPhase1API.users({ role: 'all', limit: 500 }),
        adminPhase1API.protectedAccounts(),
        adminPhase1API.accessHistory(),
      ]);
      setState({
        loading: false,
        error: '',
        roles: rolesRes.data.data.roles,
        permissions: permissionsRes.data.data.permissions,
        users: usersRes.data.data.users,
        protectedUsers: protectedRes.data.data.users,
        history: historyRes.data.data.logs,
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.detail || 'Failed to load roles' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const afterSave = () => {
    setNotice('Roles and permissions updated with audit history');
    setModal(null);
    load();
  };

  const toggleRoleStatus = async (role) => {
    const reason = window.prompt(`Reason for ${role.is_active ? 'deactivating' : 'activating'} ${role.role_name}`);
    if (!reason) return;
    try {
      await adminPhase1API.updateRoleStatus(role.role_id, { is_active: !role.is_active, reason });
      afterSave();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to update role status');
    }
  };

  const deleteRole = async (role) => {
    if (role.is_system) {
      setNotice('System roles are protected and cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(`Delete role ${role.role_name}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await adminPhase1API.deleteRole(role.role_id);
      setNotice('Role deleted and audit history updated');
      load();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to delete role');
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} />;

  return (
    <div>
      <PageHeader
        title="Roles, Access & Permissions"
        description="Control roles, permission matrix, user access, data scopes, protected accounts and access history."
        action={<button onClick={() => setModal({ type: 'role', role: null })} className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Role</button>}
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <Panel className="mb-4 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${activeTab === tab ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{tab}</button>)}
        </div>
      </Panel>

      {activeTab === 'Roles' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.roles.map((role) => (
            <Panel key={role.role_id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-black">{role.role_name}</p><p className="text-xs font-semibold text-slate-500">{role.role_key}</p></div>
                <StatusBadge value={role.is_active ? 'active' : 'inactive'} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{role.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                <span>Scope: {String(role.data_scope || 'self').replace(/_/g, ' ')}</span>
                <span>Permissions: {(role.permissions || []).length}</span>
                <span>Delete: {String(role.delete_policy || 'soft_delete_only').replace(/_/g, ' ')}</span>
                <span>{role.is_system ? 'System role' : 'Custom role'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setModal({ type: 'role', role })} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold"><Edit className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => toggleRoleStatus(role)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">{role.is_active ? 'Deactivate' : 'Activate'}</button>
                {role.is_system ? (
                  <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-400">Protected</span>
                ) : (
                  <button onClick={() => deleteRole(role)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {activeTab === 'Permission Matrix' && (
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4"><h2 className="font-black">System Permission Matrix</h2></div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {Object.entries(grouped).map(([module, permissions]) => (
              <div key={module} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-terracotta" /><h3 className="font-black capitalize">{module.replace(/_/g, ' ')}</h3></div>
                <div className="flex flex-wrap gap-2">{permissions.map((permission) => <span key={permission.permission_key} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{permission.action.replace(/_/g, ' ')}</span>)}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {activeTab === 'User Access' && <UserAccessForm users={state.users} roles={state.roles} permissions={state.permissions} onSaved={afterSave} />}

      {activeTab === 'Data Scope' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scopes.map((scope) => <Panel key={scope} className="p-4"><h3 className="font-black capitalize">{scope.replace(/_/g, ' ')}</h3><p className="mt-2 text-sm text-slate-600">Controls which records a user can view or act on after API authorization resolves ownership and reporting relationships.</p></Panel>)}
        </div>
      )}

      {activeTab === 'Protected Accounts' && (
        <Panel className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {state.protectedUsers.length ? state.protectedUsers.map((user) => <div key={user.user_id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-black">{user.full_name}</p><p className="text-sm text-slate-500">{user.email} / {user.role}</p></div><StatusBadge value="protected" /></div>) : <p className="p-4 text-sm text-slate-500">No protected accounts found.</p>}
          </div>
        </Panel>
      )}

      {activeTab === 'Access History' && (
        <Panel className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {state.history.length ? state.history.map((log) => <div key={log.audit_id} className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px] md:items-center"><div className="flex items-start gap-2"><History className="mt-1 h-4 w-4 text-terracotta" /><div><p className="font-black capitalize">{String(log.action || '').replace(/_/g, ' ')}</p><p className="text-sm text-slate-500">{log.user_id} / {log.record_id || 'system'}</p></div></div><StatusBadge value={log.status} /><p className="text-xs font-semibold text-slate-500">{String(log.created_at || '').slice(0, 19)}</p></div>) : <p className="p-4 text-sm text-slate-500">No access history yet.</p>}
          </div>
        </Panel>
      )}

      {modal?.type === 'role' && <Modal title={modal.role ? 'Edit Role' : 'Create Role'} onClose={() => setModal(null)}><RoleForm role={modal.role} permissions={state.permissions} onClose={() => setModal(null)} onSaved={afterSave} /></Modal>}
    </div>
  );
};

export default RolesPermissions;
