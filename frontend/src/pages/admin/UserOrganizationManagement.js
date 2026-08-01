import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, History, KeyRound, Power, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestReason } from './shared';

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
const roleOptions = [
  { value: 'guest', label: 'Guest' },
  { value: 'host', label: 'Host' },
  { value: 'employee', label: 'Employee' },
  { value: 'rm', label: 'RM' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'team_leader', label: 'Team Leader (TL)' },
  { value: 'broker', label: 'Broker' },
  { value: 'admin', label: 'Admin' },
  { value: 'md', label: 'Managing Director' },
];

const getApiMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message || String(item)).join(', ');
  return detail || error?.message || fallback;
};

const normalizeUsersResponse = (payload) => payload?.data?.users || payload?.users || [];
const normalizeRolesResponse = (payload) => payload?.data?.roles || payload?.roles || [];

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

const userCode = (user) => user.employee_code || user.lg_code || user.uid || user.user_id;
const primaryUserId = (user) => {
  const role = String(user.role || '').toLowerCase();
  const roleKey = String(user.admin_role_key || '').toLowerCase();
  return (role === 'broker' || role === 'employee' || roleKey === 'rm') && user.employee_code
    ? user.employee_code
    : (user.uid || user.user_id);
};
const roleCodeLabel = (user) => {
  if (user.role === 'broker') return 'Broker Code / User ID';
  if (user.admin_role_key === 'rm') return 'RM Code / User ID';
  if (user.role === 'admin') return 'Admin User ID';
  return 'Employee Code / User ID';
};
const formatDate = (value) => value ? String(value).slice(0, 10) : '-';
const compactRole = (value) => String(value || '-').replace(/_/g, ' ');
const emptyValue = (value) => value || '-';
const DetailLine = ({ label, value, mono = false, capitalize = false }) => (
  <p className="min-w-0">
    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
    <span className={`block truncate text-xs font-bold text-slate-800 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>{emptyValue(value)}</span>
  </p>
);
const UserOrganizationDetails = ({ user }) => {
  const role = String(user.role || '').toLowerCase();
  const roleKey = String(user.admin_role_key || '').toLowerCase();
  const lines = role === 'broker'
    ? [
        ['Branch', user.branch],
        ['Franchise', user.franchise],
        ['Work Location', user.work_location],
      ]
    : role === 'host' || role === 'guest'
      ? []
      : [
          ['Designation', user.designation],
          ['Department', user.department],
          ...(roleKey === 'managing_director' ? [] : [
            ['Business Division', user.business_division],
            ['Branch', user.branch],
            ['Franchise', user.franchise],
            ['Work Location', user.work_location],
          ]),
        ];
  const visibleLines = lines.filter(([, value]) => value);

  if (!visibleLines.length) {
    return <p className="text-xs font-semibold text-slate-400">No organization fields required</p>;
  }

  return (
    <div className="grid min-w-[220px] gap-2">
      {visibleLines.map(([label, value]) => <DetailLine key={label} label={label} value={value} />)}
    </div>
  );
};
const userOptionLabel = (user) => {
  const code = userCode(user);
  return `${code} - ${user.full_name || user.email || user.role}`;
};

const SearchableUserSelect = ({ options, value, onChange, placeholder, emptyLabel = 'No matching users found', selectedDisplay = 'label' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => [option.user_id, userCode(option)].includes(value));
  const displayValue = open ? query : selected ? (selectedDisplay === 'code' ? userCode(selected) : userOptionLabel(selected)) : '';
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => userOptionLabel(option).toLowerCase().includes(normalizedQuery))
    : options;

  const selectOption = (option) => {
    onChange(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        autoComplete="off"
        className={inputClass}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        placeholder={selected ? '' : placeholder}
        spellCheck={false}
        type="search"
        value={displayValue}
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-elevated">
          {filteredOptions.length ? filteredOptions.map((option) => {
            const code = userCode(option);
            return (
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                key={option.user_id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                type="button"
              >
                <span className="block font-black text-slate-950">{code}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{option.full_name || option.email || option.role}</span>
              </button>
            );
          }) : <p className="px-3 py-2 text-sm font-semibold text-slate-500">{emptyLabel}</p>}
        </div>
      )}
    </div>
  );
};

const SearchableTextSelect = ({ options, value, onChange, placeholder, emptyLabel = 'No matching records found', allowCustom = true }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const displayValue = open ? query : selected ? selected.label : value || '';
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => `${option.code} ${option.name} ${option.label}`.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <div className="relative">
      <input
        autoComplete="off"
        className={inputClass}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          if (allowCustom) onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={displayValue}
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-elevated">
          {filteredOptions.length ? filteredOptions.map((option) => (
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setQuery('');
                setOpen(false);
              }}
              type="button"
            >
              <span className="block font-black text-slate-950">{option.code}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{option.name}</span>
            </button>
          )) : <p className="px-3 py-2 text-sm font-semibold text-slate-500">{emptyLabel}</p>}
        </div>
      )}
    </div>
  );
};

const UserForm = ({ initialUser, managers, roles = [], organizationCodes = { branches: [], franchises: [] }, onCancel, onSaved }) => {
  const initialRoleKey = String(initialUser?.admin_role_key || '').toLowerCase();
  const initialRole = initialUser?.role === 'employee' && ['rm', 'relationship_manager'].includes(initialRoleKey)
    ? 'rm'
    : initialUser?.role === 'employee' && initialRoleKey === 'branch_manager'
      ? 'branch_manager'
      : initialUser?.role === 'employee' && initialRoleKey === 'team_leader'
        ? 'team_leader'
    : initialUser?.role === 'admin' && ['managing_director', 'managing director'].includes(String(initialUser?.admin_role_key || initialUser?.designation || '').toLowerCase())
      ? 'md'
      : initialUser?.role;
  const [form, setForm] = useState({ ...baseForm, ...(initialUser || {}), role: initialRole || baseForm.role, password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEmploymentRole = ['employee', 'rm', 'branch_manager', 'team_leader', 'broker', 'admin', 'md'].includes(form.role);
  const showOperationalControls = isEmploymentRole && form.role !== 'md';
  const showHostAssignment = form.role === 'host';
  const brokerRmOptions = managers.filter((m) => ['broker', 'employee'].includes(m.role) && userCode(m));
  const branchManagerOptions = managers.filter((m) => {
    const designation = String(m.designation || m.admin_role_key || '').toLowerCase();
    const roleKey = String(m.admin_role_key || '').toLowerCase();
    const role = String(m.role || '').toLowerCase();
    return roleKey === 'branch_manager' || designation.includes('branch manager') || role === 'branch_manager';
  });
  const toCodeOptions = (values, prefix) => values
    .filter(Boolean)
    .map((name) => {
      const code = `${prefix}-${String(name).trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase()}`;
      return { code, name, value: name, label: `${code} - ${name}` };
    });
  const branchOptions = organizationCodes.branches.length
    ? organizationCodes.branches.map((item) => ({
        code: item.code,
        name: [item.name, item.city].filter(Boolean).join(' - '),
        value: item.code,
        label: `${item.code} - ${item.name}`,
      }))
    : toCodeOptions(Array.from(new Set(managers.map((m) => m.branch).filter(Boolean))), 'BR');
  const franchiseOptions = organizationCodes.franchises.length
    ? organizationCodes.franchises.map((item) => ({
        code: item.code,
        name: [item.name, item.city].filter(Boolean).join(' - '),
        value: item.code,
        label: `${item.code} - ${item.name}`,
      }))
    : toCodeOptions(Array.from(new Set(managers.map((m) => m.franchise).filter(Boolean))), 'FR');
  const accessScopeOptions = accessOptions.map((scope) => ({
    code: scope,
    name: scope.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: scope,
    label: scope.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
  }));
  const adminRoleOptions = Array.from(new Map([
    ...roles.filter((role) => role.role_key).map((role) => [role.role_key, {
      code: role.role_key,
      name: role.role_name || role.role_key,
      value: role.role_key,
      label: `${role.role_key} - ${role.role_name || role.role_key}`,
    }]),
    ...managers.filter((user) => user.admin_role_key).map((user) => [user.admin_role_key, {
      code: user.admin_role_key,
      name: user.full_name || user.role,
      value: user.admin_role_key,
      label: `${user.admin_role_key} - ${user.full_name || user.role}`,
    }]),
  ]).values());

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setRole = (role) => setForm((current) => {
    if (role === 'guest') {
      return {
        ...current,
        role,
        employee_code: '',
        designation: '',
        department: '',
        business_division: '',
        branch: '',
        franchise: '',
        joining_date: '',
        employment_type: '',
        work_location: '',
        reports_to: '',
        secondary_reports_to: '',
        hierarchy_level: '',
        team: '',
        escalation_manager: '',
        approval_authority: '',
        access_scope: 'self',
        admin_role_key: '',
        access_controls: [],
        admin_delete_protected: false,
      };
    }
    if (role === 'host') {
      return {
        ...current,
        role,
        designation: '',
        department: '',
        business_division: '',
        branch: '',
        franchise: '',
        joining_date: '',
        employment_type: '',
        work_location: '',
        secondary_reports_to: '',
        hierarchy_level: '',
        team: '',
        escalation_manager: '',
        approval_authority: '',
        access_scope: 'self',
        admin_role_key: '',
        access_controls: [],
        admin_delete_protected: false,
      };
    }
    if (role === 'broker') {
      return {
        ...current,
        role,
        designation: '',
        department: '',
        business_division: '',
        joining_date: '',
      };
    }
    if (role === 'admin') {
      return {
        ...current,
        role,
        employee_code: '',
        business_division: '',
        joining_date: '',
        work_location: '',
      };
    }
    if (role === 'md') {
      return {
        ...current,
        role,
        employee_code: '',
        designation: 'Managing Director',
        department: 'Management',
        business_division: '',
        branch: '',
        franchise: '',
        joining_date: '',
        employment_type: '',
        work_location: '',
        admin_role_key: 'managing_director',
        access_scope: 'global',
      };
    }
    if (role === 'employee') {
      return {
        ...current,
        role,
        business_division: '',
      };
    }
    if (role === 'rm') {
      return {
        ...current,
        role,
        business_division: '',
        joining_date: '',
        designation: current.designation || 'Relationship Manager',
        admin_role_key: current.admin_role_key || 'rm',
      };
    }
    if (role === 'branch_manager') {
      return {
        ...current,
        role,
        business_division: '',
        reports_to: '',
        joining_date: '',
        designation: current.designation || 'Branch Manager',
        admin_role_key: 'branch_manager',
      };
    }
    if (role === 'team_leader') {
      return {
        ...current,
        role,
        business_division: '',
        designation: current.designation || 'Team Leader',
        admin_role_key: 'team_leader',
      };
    }
    return { ...current, role };
  });
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
      const payload = { ...form };
      if (payload.role === 'rm') {
        payload.role = 'employee';
        payload.designation = payload.designation || 'Relationship Manager';
        payload.admin_role_key = payload.admin_role_key || 'rm';
      }
      if (payload.role === 'branch_manager') {
        payload.role = 'employee';
        payload.designation = payload.designation || 'Branch Manager';
        payload.admin_role_key = 'branch_manager';
      }
      if (payload.role === 'team_leader') {
        payload.role = 'employee';
        payload.designation = payload.designation || 'Team Leader';
        payload.admin_role_key = 'team_leader';
      }
      if (payload.role === 'md') {
        payload.role = 'admin';
        payload.employee_code = payload.employee_code || `MD-${Date.now()}`;
        payload.designation = 'Managing Director';
        payload.department = payload.department || 'Management';
        payload.admin_role_key = 'managing_director';
        payload.access_scope = payload.access_scope || 'global';
      }
      if (initialUser?.user_id) {
        await adminPhase1API.updateUser(initialUser.user_id, payload);
      } else {
        await adminPhase1API.createUser(payload);
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
          <Field label="Full Name"><input autoComplete="name" className={inputClass} name="new-user-full-name" value={form.full_name} onChange={(e) => setValue('full_name', e.target.value)} /></Field>
          <Field label="Email Address"><input autoComplete="email" className={inputClass} name="new-user-email" type="email" value={form.email} onChange={(e) => setValue('email', e.target.value)} /></Field>
          <Field label="Phone Number"><input autoComplete="tel" className={inputClass} name="new-user-phone" value={form.phone} onChange={(e) => setValue('phone', e.target.value)} /></Field>
          <Field label="Alternate Phone"><input autoComplete="tel" className={inputClass} name="new-user-alternate-phone" value={form.alternate_phone || ''} onChange={(e) => setValue('alternate_phone', e.target.value)} /></Field>
          {!initialUser && <Field label="Password"><input autoComplete="new-password" className={inputClass} name="new-user-password" type="password" value={form.password} onChange={(e) => setValue('password', e.target.value)} placeholder="Minimum 8 chars, Aa + number" /></Field>}
          <Field label="Date of Birth"><input autoComplete="bday" className={inputClass} name="new-user-birthdate" type="date" value={form.birthdate || ''} onChange={(e) => setValue('birthdate', e.target.value)} /></Field>
          <Field label="Gender"><select className={inputClass} value={form.gender || ''} onChange={(e) => setValue('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="City"><input autoComplete="address-level2" className={inputClass} name="new-user-city" value={form.city || ''} onChange={(e) => setValue('city', e.target.value)} /></Field>
          <Field label="State"><input autoComplete="address-level1" className={inputClass} name="new-user-state" value={form.state || ''} onChange={(e) => setValue('state', e.target.value)} /></Field>
          <Field label="PIN Code"><input autoComplete="postal-code" className={inputClass} name="new-user-pin-code" value={form.pin_code || ''} onChange={(e) => setValue('pin_code', e.target.value)} /></Field>
          <Field label="Address"><textarea autoComplete="street-address" className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" name="new-user-address" value={form.address || ''} onChange={(e) => setValue('address', e.target.value)} /></Field>
        </div>
      </Panel>
      <Panel className="overflow-visible p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-black">{form.role === 'broker' ? 'Broker Information' : form.role === 'rm' ? 'RM Information' : form.role === 'branch_manager' ? 'Branch Manager Information' : form.role === 'team_leader' ? 'Team Leader Information' : form.role === 'md' ? 'Managing Director Information' : 'Employment Information'}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Configure role identity, branch ownership and work location details.</p>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <Field label="Base Role"><select className={inputClass} value={form.role} onChange={(e) => setRole(e.target.value)}>{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
          {showHostAssignment && <>
            <Field label="Broker / RM Code">
              <SearchableUserSelect
                emptyLabel="No broker or RM code found"
                onChange={(manager) => setValue('employee_code', userCode(manager))}
                options={brokerRmOptions}
                placeholder="Search code or name"
                value={form.employee_code || ''}
              />
            </Field>
            <Field label="Branch Manager">
              <SearchableUserSelect
                emptyLabel="No branch manager found"
                onChange={(manager) => setValue('reports_to', manager.user_id)}
                options={branchManagerOptions}
                placeholder="Search code or name"
                selectedDisplay="code"
                value={form.reports_to || ''}
              />
            </Field>
          </>}
          {isEmploymentRole && <>
            {form.role !== 'admin' && form.role !== 'md' && <Field label={form.role === 'broker' ? 'Broker Code' : form.role === 'rm' ? 'RM Code' : form.role === 'branch_manager' ? 'Branch Manager Code' : form.role === 'team_leader' ? 'TL Code' : 'Employee Code'}><input className={inputClass} value={form.employee_code || ''} onChange={(e) => setValue('employee_code', e.target.value)} /></Field>}
            {form.role !== 'broker' && <Field label="Designation"><input className={inputClass} value={form.designation || ''} onChange={(e) => setValue('designation', e.target.value)} /></Field>}
            {form.role !== 'broker' && <Field label="Department"><input className={inputClass} value={form.department || ''} onChange={(e) => setValue('department', e.target.value)} /></Field>}
            {form.role !== 'employee' && form.role !== 'rm' && form.role !== 'branch_manager' && form.role !== 'broker' && form.role !== 'admin' && form.role !== 'md' && <Field label="Business Division"><input className={inputClass} value={form.business_division || ''} onChange={(e) => setValue('business_division', e.target.value)} /></Field>}
            {form.role !== 'md' && <Field label="Branch">
              <SearchableTextSelect
                emptyLabel="No branch code found"
                onChange={(value) => setValue('branch', value)}
                options={branchOptions}
                placeholder="Search branch code or name"
                value={form.branch || ''}
              />
            </Field>}
            {form.role !== 'branch_manager' && form.role !== 'md' && <Field label="Branch Manager">
              <SearchableUserSelect
                emptyLabel="No branch manager found"
                onChange={(manager) => setValue('reports_to', manager.user_id)}
                options={branchManagerOptions}
                placeholder="Search code or name"
                selectedDisplay="code"
                value={form.reports_to || ''}
              />
            </Field>}
            {form.role !== 'md' && <Field label="Franchise">
              <SearchableTextSelect
                emptyLabel="No franchise code found"
                onChange={(value) => setValue('franchise', value)}
                options={franchiseOptions}
                placeholder="Search franchise code or name"
                value={form.franchise || ''}
              />
            </Field>}
            {form.role !== 'employee' && form.role !== 'rm' && form.role !== 'branch_manager' && form.role !== 'broker' && form.role !== 'admin' && form.role !== 'md' && <Field label="Joining Date"><input className={inputClass} type="date" value={form.joining_date || ''} onChange={(e) => setValue('joining_date', e.target.value)} /></Field>}
            {form.role !== 'admin' && form.role !== 'md' && <Field label="Work Location"><input className={inputClass} value={form.work_location || ''} onChange={(e) => setValue('work_location', e.target.value)} /></Field>}
          </>}
        </div>
      </Panel>
      {showOperationalControls && <Panel className="p-4">
        <h3 className="mb-3 font-black">Reporting Structure</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Reports To"><select className={inputClass} value={form.reports_to || ''} onChange={(e) => setValue('reports_to', e.target.value)}><option value="">Unassigned</option>{managers.filter((m) => m.user_id !== initialUser?.user_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.role})</option>)}</select></Field>
          <Field label="Secondary Manager"><select className={inputClass} value={form.secondary_reports_to || ''} onChange={(e) => setValue('secondary_reports_to', e.target.value)}><option value="">None</option>{managers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}</select></Field>
          <Field label="Escalation Manager"><select className={inputClass} value={form.escalation_manager || ''} onChange={(e) => setValue('escalation_manager', e.target.value)}><option value="">None</option>{managers.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}</select></Field>
        </div>
      </Panel>}
      {showOperationalControls && <Panel className="overflow-visible p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-black">Access Control</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Set role scope, admin role key and allowed actions for this account.</p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_280px]">
          <Field label="Access Scope">
            <SearchableTextSelect
              allowCustom={false}
              emptyLabel="No access scope found"
              onChange={(value) => setValue('access_scope', value)}
              options={accessScopeOptions}
              placeholder="Search access scope"
              value={form.access_scope || 'self'}
            />
          </Field>
          <Field label="Admin Role Key">
            <SearchableTextSelect
              allowCustom={false}
              emptyLabel="No admin roles found"
              onChange={(value) => setValue('admin_role_key', value)}
              options={adminRoleOptions}
              placeholder="Search admin role key"
              value={form.admin_role_key || ''}
            />
          </Field>
          <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${form.admin_delete_protected ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
            <span>
              <span className="block text-xs font-black uppercase tracking-widest text-slate-500">Protected Account</span>
              <span className="mt-1 block text-sm font-bold text-slate-900">{form.admin_delete_protected ? 'Enabled' : 'Disabled'}</span>
            </span>
            <input
              checked={form.admin_delete_protected}
              className="h-4 w-4 accent-terracotta"
              onChange={(e) => setValue('admin_delete_protected', e.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Permission Actions</p>
          <div className="flex flex-wrap gap-2">
            {permissionOptions.map((permission) => {
              const selected = form.access_controls.includes(permission);
              return (
                <button
                  key={permission}
                  type="button"
                  onClick={() => togglePermission(permission)}
                  className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
                    selected
                      ? 'border-terracotta bg-terracotta text-charcoal shadow-subtle'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {permission.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>}
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
  const [roles, setRoles] = useState([]);
  const [organizationCodes, setOrganizationCodes] = useState({ branches: [], franchises: [] });
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

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await adminPhase1API.roles();
        setRoles(normalizeRolesResponse(res.data));
      } catch (error) {
        setRoles([]);
      }
    };
    loadRoles();
  }, []);

  useEffect(() => {
    const loadOrganizationCodes = async () => {
      try {
        const res = await adminPhase1API.branchFranchise();
        setOrganizationCodes({
          branches: res.data?.data?.branches || [],
          franchises: res.data?.data?.franchises || [],
        });
      } catch (error) {
        setOrganizationCodes({ branches: [], franchises: [] });
      }
    };
    loadOrganizationCodes();
  }, []);

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
    const reason = await requestReason({
      title: `${user.is_active === false ? 'Activate' : 'Deactivate'} User`,
      description: `${user.full_name || user.email} status change needs an audit reason.`,
      placeholder: 'Example: User left organization, duplicate account, access restored...',
      minLength: 3,
    });
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
    const reason = await requestReason({
      title: 'Password Reset Reason',
      description: `${user.full_name || user.email} password reset will be written to audit history.`,
      placeholder: 'Example: User requested reset after verification.',
      minLength: 3,
    });
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

  const openCreateUserModal = () => {
    window.dispatchEvent(new Event('admin:clear-module-search'));
    setModal({ type: 'form', user: null });
  };

  return (
    <div>
      <PageHeader
        title="User & Organization Management"
        description="Manage users, employees, brokers, administrators, access, reporting managers, branches and user lifecycle."
        action={<button onClick={openCreateUserModal} className="inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white"><UserPlus className="h-4 w-4" /> Create User</button>}
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
          <input
            autoComplete="off"
            className="h-8 w-full bg-transparent text-sm"
            name="admin-user-directory-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, user ID, email, mobile, employee code"
            spellCheck={false}
            type="search"
            value={search}
          />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[2100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['User', 'Contact', 'Personal', 'Location', 'Role & Code', 'Organization', 'Reporting', 'Access Control', 'Status', 'Dates', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.users.map((u) => (
                  <tr key={u.user_id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="flex min-w-[240px] items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage text-xs font-black text-white">{u.full_name?.[0] || 'U'}</span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{u.full_name || '-'}</p>
                          <p className="font-mono text-xs font-semibold text-slate-500">{primaryUserId(u)}</p>
                          {u.user_id !== primaryUserId(u) && <p className="mt-1 font-mono text-[11px] text-slate-400">Internal: {u.user_id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[230px] gap-2">
                        <DetailLine label="Email" value={u.email} />
                        <DetailLine label="Mobile" value={u.phone} />
                        <DetailLine label="Alternate" value={u.alternate_phone} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[170px] gap-2">
                        <DetailLine label="Gender" value={u.gender} capitalize />
                        <DetailLine label="Birth Date" value={formatDate(u.birthdate || u.date_of_birth)} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[240px] gap-2">
                        <DetailLine label="City / State" value={[u.city, u.state].filter(Boolean).join(', ')} />
                        <DetailLine label="PIN Code" value={u.pin_code} />
                        <DetailLine label="Address" value={u.address} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[220px] gap-2">
                        <DetailLine label="Base Role" value={compactRole(u.role)} capitalize />
                        <DetailLine label={roleCodeLabel(u)} value={u.role === 'admin' ? primaryUserId(u) : u.employee_code} mono />
                        <DetailLine label="Admin Role Key" value={u.admin_role_key} mono />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <UserOrganizationDetails user={u} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[230px] gap-2">
                        <DetailLine label="Reports To" value={u.reports_to} mono />
                        <DetailLine label="Secondary Manager" value={u.secondary_reports_to} mono />
                        <DetailLine label="Escalation Manager" value={u.escalation_manager} mono />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[210px] gap-2">
                        <DetailLine label="Access Scope" value={compactRole(u.access_scope)} capitalize />
                        <DetailLine label="Permissions" value={(u.access_controls || []).join(', ')} />
                        <DetailLine label="Protected" value={u.admin_delete_protected ? 'Yes' : 'No'} />
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={u.is_active === false ? 'inactive' : 'active'} /></td>
                    <td className="px-4 py-4">
                      <div className="grid min-w-[140px] gap-2">
                        <DetailLine label="Registered" value={formatDate(u.created_at)} />
                        <DetailLine label="Joining" value={formatDate(u.joining_date)} />
                      </div>
                    </td>
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
                <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <DetailLine label="Role / User ID" value={`${compactRole(u.role)} / ${primaryUserId(u) || '-'}`} capitalize />
                  <DetailLine label="Phone" value={u.phone} />
                  <DetailLine label="Location" value={[u.city, u.state, u.work_location].filter(Boolean).join(' / ')} />
                  <DetailLine label="Organization" value={u.role === 'broker' ? [u.branch, u.franchise, u.work_location].filter(Boolean).join(' / ') : [u.designation, u.department, u.branch, u.franchise].filter(Boolean).join(' / ')} />
                  <DetailLine label="Reporting" value={u.reports_to || 'Unassigned'} mono />
                  <DetailLine label="Access" value={compactRole(u.access_scope || 'self')} capitalize />
                </div>
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
          <UserForm initialUser={modal.user} managers={managers} roles={roles} organizationCodes={organizationCodes} onCancel={() => setModal(null)} onSaved={closeAndReload} />
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
