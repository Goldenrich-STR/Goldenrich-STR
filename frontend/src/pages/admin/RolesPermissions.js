import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, History, Plus, Save, ShieldCheck, Trash2, UserCog, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestReason } from './shared';

const scopes = ['self', 'assigned_records', 'direct_reports', 'full_team', 'department', 'branch', 'franchise', 'region', 'state', 'global', 'custom'];
const deletePolicies = ['protected', 'soft_delete_only', 'deactivatable', 'permanent_delete_allowed'];
const tabs = ['Roles', 'Permission Matrix', 'User Access', 'Data Scope', 'Protected Accounts', 'Access History'];
const scopeMeta = {
  self: 'Only the user-owned records',
  assigned_records: 'Records directly assigned to this role',
  direct_reports: 'Direct reporting-line records',
  full_team: 'Complete team and subordinate scope',
  department: 'All users and records in department',
  branch: 'Branch-level operating access',
  franchise: 'Franchise-level business access',
  region: 'Regional portfolio access',
  state: 'State-wide access boundary',
  global: 'Full platform-wide visibility',
  custom: 'Custom rule-based data scope',
};
const deletePolicyMeta = {
  protected: 'Cannot be deleted from admin UI',
  soft_delete_only: 'Can be removed from UI while history remains',
  deactivatable: 'Can only be deactivated, not removed',
  permanent_delete_allowed: 'Can be permanently deleted with audit trail',
};

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

const SearchableSelect = ({ options, value, onChange, placeholder, emptyLabel = 'No records found' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = query.trim()
    ? options.filter((option) => `${option.label} ${option.meta || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="relative">
      <button
        className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-900 transition hover:border-slate-300 focus:border-charcoal focus:outline-none"
        onClick={() => {
          setQuery('');
          setOpen((current) => !current);
        }}
        type="button"
      >
        <span className={selected ? 'truncate' : 'truncate text-slate-400'}>{selected?.label || placeholder}</span>
        <span className="text-xs text-slate-400">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-elevated">
          <input
            autoComplete="off"
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-charcoal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            spellCheck={false}
            type="search"
            value={query}
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length ? filtered.map((option) => (
              <button
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${option.value === value ? 'bg-terracotta text-charcoal' : 'hover:bg-slate-100'}`}
                key={option.value || 'none'}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                type="button"
              >
                <span className="block font-black">{option.label}</span>
                {option.meta && <span className="block truncate text-xs font-semibold opacity-70">{option.meta}</span>}
              </button>
            )) : <p className="px-3 py-2 text-sm font-semibold text-slate-500">{emptyLabel}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfessionalSelect = ({ options, value, onChange, placeholder, searchPlaceholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = query.trim()
    ? options.filter((option) => `${option.label} ${option.meta || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setQuery('');
          setOpen((current) => !current);
        }}
        className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-slate-300 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <span>
          <span className={selected ? 'block font-black text-slate-950' : 'block font-bold text-slate-400'}>{selected?.label || placeholder}</span>
          {selected?.meta && <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{selected.meta}</span>}
        </span>
        <span className={`text-sm font-black text-slate-400 transition ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[90] rounded-xl border border-slate-200 bg-white p-2 shadow-elevated ring-1 ring-black/5">
          <input
            autoComplete="off"
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-charcoal"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder || 'Search option...'}
            spellCheck={false}
            type="search"
            value={query}
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.length ? filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                className={`mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition ${option.value === value ? 'border-[#d8b431] bg-[#fff7df]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="block text-sm font-black text-slate-950">{option.label}</span>
                {option.meta && <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">{option.meta}</span>}
              </button>
            )) : <p className="px-3 py-2 text-sm font-semibold text-slate-500">No matching option found</p>}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const scopeOptions = scopes.map((scope) => ({
    value: scope,
    label: scope.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    meta: scopeMeta[scope] || scope,
  }));
  const deletePolicyOptions = deletePolicies.map((policy) => ({
    value: policy,
    label: policy.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    meta: deletePolicyMeta[policy] || policy,
  }));

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
          <Field label="Data Scope">
            <ProfessionalSelect
              onChange={(value) => setValue('data_scope', value)}
              options={scopeOptions}
              placeholder="Select data scope"
              searchPlaceholder="Search scope by name..."
              value={form.data_scope}
            />
          </Field>
          <Field label="Delete Policy">
            <ProfessionalSelect
              onChange={(value) => setValue('delete_policy', value)}
              options={deletePolicyOptions}
              placeholder="Select delete policy"
              searchPlaceholder="Search delete policy..."
              value={form.delete_policy}
            />
          </Field>
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
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const selectedRole = roles.find((role) => role.role_key === roleKey);
  const userOptions = users.map((user) => ({
    value: user.user_id,
    label: user.full_name || user.email || user.user_id,
    meta: `${user.role || 'user'} | ${user.email || user.phone || user.user_id}`,
  }));
  const roleOptions = [
    { value: '', label: 'No admin role', meta: 'Remove role key assignment' },
    ...roles.map((role) => ({
      value: role.role_key,
      label: role.role_name || role.role_key,
      meta: `${role.role_key || 'role'} | ${role.data_scope || 'self'} scope`,
    })),
  ];
  const scopeOptions = scopes.map((item) => ({
    value: item,
    label: item.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    meta: item,
  }));

  useEffect(() => {
    if (!selectedUser) return;
    setRoleKey(selectedUser.admin_role_key || '');
    setScope(selectedUser.admin_scope || selectedUser.access_scope || 'self');
    setSelectedPermissions(selectedUser.access_controls || []);
  }, [selectedUser]);

  const toggle = (key) => setSelectedPermissions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const toggleModule = (modulePermissions) => {
    const keys = modulePermissions.map((permission) => permission.permission_key);
    const allSelected = keys.every((key) => selectedPermissions.includes(key));
    setSelectedPermissions((current) => (
      allSelected ? current.filter((key) => !keys.includes(key)) : Array.from(new Set([...current, ...keys]))
    ));
  };
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
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">User Access Assignment</h2>
            <p className="mt-1 text-sm text-slate-500">Assign role key, data scope and module permissions with audit reason.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selected</p><p className="font-black">{selectedPermissions.length}</p></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modules</p><p className="font-black">{Object.keys(grouped).length}</p></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scope</p><p className="font-black capitalize">{scope.replace(/_/g, ' ')}</p></div>
          </div>
        </div>
      </div>
      <div className="p-4">
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="grid gap-3 lg:grid-cols-4">
        <Field label="User"><SearchableSelect emptyLabel="No user found" onChange={setSelectedUserId} options={userOptions} placeholder="Select user" value={selectedUserId} /></Field>
        <Field label="Role"><SearchableSelect emptyLabel="No role found" onChange={setRoleKey} options={roleOptions} placeholder="Select role" value={roleKey} /></Field>
        <Field label="Data Scope"><SearchableSelect emptyLabel="No data scope found" onChange={setScope} options={scopeOptions} placeholder="Select data scope" value={scope} /></Field>
        <Field label="Reason"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why access is being changed" /></Field>
      </div>
      {selectedUser && (
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-3">
          <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">User</span><span className="font-black">{selectedUser.full_name}</span></p>
          <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Current Role</span><span className="font-black capitalize">{selectedUser.role}</span></p>
          <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Admin Role</span><span className="font-black">{selectedRole?.role_name || 'No admin role'}</span></p>
        </div>
      )}
      <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 xl:grid-cols-2">
        {Object.entries(grouped).map(([module, modulePermissions]) => {
          const selectedCount = modulePermissions.filter((permission) => selectedPermissions.includes(permission.permission_key)).length;
          return (
            <div key={module} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black capitalize text-slate-950">{module.replace(/_/g, ' ')}</h3>
                  <p className="text-xs font-semibold text-slate-500">{selectedCount}/{modulePermissions.length} selected</p>
                </div>
                <button type="button" onClick={() => toggleModule(modulePermissions)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 hover:bg-terracotta hover:text-charcoal">Toggle</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {modulePermissions.map((permission) => {
                  const selected = selectedPermissions.includes(permission.permission_key);
                  return (
                    <button
                      key={permission.permission_key}
                      type="button"
                      onClick={() => toggle(permission.permission_key)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${selected ? 'border-terracotta bg-terracotta text-charcoal' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'}`}
                    >
                      {permission.action.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><UserCog className="h-4 w-4" /> Assign Access</button>
      </div>
    </Panel>
  );
};

const RolesPermissions = () => {
  const [activeTab, setActiveTab] = useState('Roles');
  const [state, setState] = useState({ loading: true, error: '', roles: [], permissions: [], users: [], protectedUsers: [], history: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
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
      setSelectedRoleIds((current) => current.filter((roleId) => rolesRes.data.data.roles.some((role) => role.role_id === roleId)));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.detail || 'Failed to load roles' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const afterSave = () => {
    setNotice('Roles and permissions updated with audit history');
    setModal(null);
    setSelectedRoleIds([]);
    load();
  };

  const toggleRoleStatus = async (role) => {
    const reason = await requestReason({
      title: `${role.is_active ? 'Deactivate' : 'Activate'} Role`,
      description: `${role.role_name} role status change needs an audit reason.`,
      placeholder: 'Explain why this role status is changing.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      await adminPhase1API.updateRoleStatus(role.role_id, { is_active: !role.is_active, reason });
      afterSave();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to update role status');
    }
  };

  const deleteRole = async (role) => {
    const confirmed = window.confirm(`Delete role ${role.role_name}? This action cannot be undone. Assigned roles must be removed from users before deleting.`);
    if (!confirmed) return;
    try {
      await adminPhase1API.deleteRole(role.role_id);
      setNotice('Role deleted and audit history updated');
      setSelectedRoleIds((current) => current.filter((roleId) => roleId !== role.role_id));
      load();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to delete role');
    }
  };

  const toggleRoleSelection = (roleId) => {
    setSelectedRoleIds((current) => current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]);
  };

  const toggleSelectAllRoles = () => {
    setSelectedRoleIds((current) => current.length === state.roles.length ? [] : state.roles.map((role) => role.role_id));
  };

  const bulkDeleteRoles = async () => {
    if (!selectedRoleIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedRoleIds.length} selected role(s)? Assigned roles will be skipped.`);
    if (!confirmed) return;
    try {
      const response = await adminPhase1API.bulkDeleteRoles(selectedRoleIds);
      const data = response.data?.data || {};
      const skipped = data.skipped || [];
      setNotice(skipped.length ? `${response.data?.message || 'Bulk delete completed'}. Skipped: ${skipped.map((item) => item.role_name || item.role_id).join(', ')}` : (response.data?.message || 'Selected roles deleted'));
      setSelectedRoleIds([]);
      load();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to delete selected roles');
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
        <div className="space-y-4">
          <Panel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={state.roles.length > 0 && selectedRoleIds.length === state.roles.length}
                  onChange={toggleSelectAllRoles}
                  className="h-4 w-4 rounded border-slate-300 text-terracotta focus:ring-terracotta"
                />
                Select All Roles
              </label>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{selectedRoleIds.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedRoleIds([])} disabled={!selectedRoleIds.length} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Clear</button>
              <button onClick={bulkDeleteRoles} disabled={!selectedRoleIds.length} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete Selected</button>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.roles.map((role) => (
            <Panel key={role.role_id} className={`p-4 ${selectedRoleIds.includes(role.role_id) ? 'ring-2 ring-terracotta' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.role_id)}
                    onChange={() => toggleRoleSelection(role.role_id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-terracotta focus:ring-terracotta"
                    aria-label={`Select ${role.role_name}`}
                  />
                  <div><p className="font-black">{role.role_name}</p><p className="text-xs font-semibold text-slate-500">{role.role_key}</p></div>
                </div>
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
                <button onClick={() => deleteRole(role)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </Panel>
          ))}
          </div>
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
