import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Edit, GitBranch, Plus, Search, Trash2, X } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestReason } from './shared';

const emptyForm = { type: 'branch', name: '', code: '', city: '', state: '', parent_code: '', manager_id: '' };
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-terracotta focus:ring-2 focus:ring-amber-100';
const makeCode = (prefix, name) => `${prefix}-${String(name || '').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase()}`;

const BranchFranchiseManagement = () => {
  const [state, setState] = useState({ loading: true, error: '', branches: [], franchises: [] });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.branchFranchise();
      setState({
        loading: false,
        error: '',
        branches: res.data?.data?.branches || [],
        franchises: res.data?.data?.franchises || [],
      });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load branch and franchise records', branches: [], franchises: [] });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setValue = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key === 'name' && !current.code) {
      next.code = makeCode(current.type === 'franchise' ? 'FR' : 'BR', value);
    }
    if (key === 'type' && current.name) {
      next.code = makeCode(value === 'franchise' ? 'FR' : 'BR', current.name);
    }
    return next;
  });

  const records = useMemo(() => {
    const rows = [
      ...state.branches.map((item) => ({ ...item, type: 'Branch', parent: item.franchise_code || '-' })),
      ...state.franchises.map((item) => ({ ...item, type: 'Franchise', parent: '-' })),
    ];
    const q = search.trim().toLowerCase();
    return q ? rows.filter((row) => [row.name, row.code, row.city, row.state, row.type, row.parent].join(' ').toLowerCase().includes(q)) : rows;
  }, [state.branches, state.franchises, search]);

  const submit = async () => {
    if (!form.name.trim()) {
      setNotice('Name is required');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, code: form.code || makeCode(form.type === 'franchise' ? 'FR' : 'BR', form.name) };
      if (editing && form.type === 'franchise') {
        await adminPhase1API.updateFranchise(editing.code, payload);
      } else if (editing && form.type === 'branch') {
        await adminPhase1API.updateBranch(editing.code, payload);
      } else if (form.type === 'franchise') {
        await adminPhase1API.createFranchise(payload);
      } else {
        await adminPhase1API.createBranch(payload);
      }
      setNotice(`${form.type === 'franchise' ? 'Franchise' : 'Branch'} ${editing ? 'updated' : 'created'} successfully`);
      setForm(emptyForm);
      setEditing(null);
      loadData();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Unable to save record');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      type: row.type.toLowerCase(),
      name: row.name || '',
      code: row.code || '',
      city: row.city || '',
      state: row.state || '',
      parent_code: row.franchise_code || '',
      manager_id: row.manager_id || '',
    });
    setNotice('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const deleteRecord = async (row) => {
    const reason = await requestReason({
      title: `Delete ${row.type}`,
      description: `${row.code} - ${row.name} will be removed from branch/franchise master data if it is not assigned anywhere.`,
      placeholder: 'Example: Duplicate code created by mistake.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      if (row.type === 'Franchise') {
        await adminPhase1API.deleteFranchise(row.code, { reason });
      } else {
        await adminPhase1API.deleteBranch(row.code, { reason });
      }
      setNotice(`${row.type} deleted successfully`);
      if (editing?.code === row.code) cancelEdit();
      loadData();
    } catch (error) {
      setNotice(error.response?.data?.detail || `Unable to delete ${row.type.toLowerCase()}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Branch & Franchise Management"
        description="Create and manage branch and franchise codes used across user assignment, broker setup and organization reporting."
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-700">{notice}</div>}
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-terracotta">{editing ? 'Edit Record' : 'Create Record'}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{editing ? `${editing.type} Setup` : 'Branch / Franchise Setup'}</h2>
          </div>
          <div className="grid gap-3 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">Record Type</span>
              <select className={inputClass} value={form.type} onChange={(e) => setValue('type', e.target.value)}>
                <option value="branch">Branch</option>
                <option value="franchise">Franchise</option>
              </select>
            </label>
            <Field label={`${form.type === 'franchise' ? 'Franchise' : 'Branch'} Name`} value={form.name} onChange={(value) => setValue('name', value)} />
            <Field label={`${form.type === 'franchise' ? 'Franchise' : 'Branch'} Code`} value={form.code} onChange={(value) => setValue('code', value.toUpperCase())} placeholder={form.type === 'franchise' ? 'FR-NASHIK' : 'BR-NASHIK'} />
            {form.type === 'branch' && (
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">Franchise Code</span>
                <select className={inputClass} value={form.parent_code} onChange={(e) => setValue('parent_code', e.target.value)}>
                  <option value="">No franchise linked</option>
                  {state.franchises.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City" value={form.city} onChange={(value) => setValue('city', value)} />
              <Field label="State" value={form.state} onChange={(value) => setValue('state', value)} />
            </div>
            <Field label="Manager User ID" value={form.manager_id} onChange={(value) => setValue('manager_id', value)} placeholder="Optional admin/employee user ID" />
            <div className="grid gap-2 sm:grid-cols-2">
              {editing && <button disabled={saving} onClick={cancelEdit} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                <X className="h-4 w-4" /> Cancel Edit
              </button>}
              <button disabled={saving} onClick={submit} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60 ${editing ? '' : 'sm:col-span-2'}`}>
                <Plus className="h-4 w-4" /> {saving ? 'Saving...' : `${editing ? 'Save' : 'Create'} ${form.type === 'franchise' ? 'Franchise' : 'Branch'}`}
              </button>
            </div>
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-terracotta">Directory</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Active Branch & Franchise Codes</h2>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 md:w-80">
              <Search className="h-4 w-4 text-slate-400" />
              <input className="w-full bg-transparent text-sm font-semibold outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, city" />
            </div>
          </div>
          {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Type', 'Code', 'Name', 'City', 'State', 'Linked Franchise', 'Manager', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((row) => (
                    <tr key={`${row.type}-${row.code}`} className="align-top">
                      <td className="px-4 py-4"><span className="inline-flex items-center gap-2 font-black"><RecordIcon type={row.type} /> {row.type}</span></td>
                      <td className="px-4 py-4 font-mono text-xs font-black text-slate-900">{row.code}</td>
                      <td className="px-4 py-4 font-bold">{row.name}</td>
                      <td className="px-4 py-4">{row.city || '-'}</td>
                      <td className="px-4 py-4">{row.state || '-'}</td>
                      <td className="px-4 py-4 font-mono text-xs">{row.parent}</td>
                      <td className="px-4 py-4 font-mono text-xs">{row.manager_id || '-'}</td>
                      <td className="px-4 py-4"><StatusBadge value={row.status || 'active'} /></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-200">
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => deleteRecord(row)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-700 hover:bg-red-100">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!records.length && <tr><td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={9}>No branch or franchise records found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
    <input className={inputClass} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </label>
);

const RecordIcon = ({ type }) => {
  const Icon = type === 'Franchise' ? Building2 : GitBranch;
  return <Icon className="h-4 w-4 text-terracotta" />;
};

export default BranchFranchiseManagement;
