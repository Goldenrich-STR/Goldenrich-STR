import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, ExternalLink, FileCheck2, RotateCcw, Search, UserCog, XCircle } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney } from './shared';

const tabs = [
  ['all', 'All Hosts'], ['pending_kyc', 'Pending KYC'], ['kyc_approved', 'KYC Approved'], ['kyc_rejected', 'KYC Rejected'],
  ['agreement_pending', 'Agreement Pending'], ['bank_verification', 'Bank Verification'], ['subscription_status', 'Subscription Status'], ['suspended', 'Suspended Hosts'], ['risk_review', 'Host Risk Review'],
];

const getAssigneeCode = (user) => user?.lg_code || user?.employee_code || user?.uid || user?.user_id || '';

const getAssigneeLabel = (user) => {
  const name = user?.full_name || user?.name || user?.email || user?.phone || 'Unnamed';
  const code = getAssigneeCode(user);
  return code ? `${name} (${code})` : name;
};

const HostManagement = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', hosts: [] });
  const [selected, setSelected] = useState({ loading: false, host: null, error: '' });
  const [assignees, setAssignees] = useState({ loading: true, error: '', brokers: [], relationship_managers: [] });
  const [assignment, setAssignment] = useState({
    open: false,
    host: null,
    broker_id: '',
    rm_id: '',
    reason: 'Host team assignment updated from Host Management',
    saving: false,
    error: '',
  });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.hosts({ tab, search });
      setState({ loading: false, error: '', hosts: res.data.data.hosts });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load hosts', hosts: [] });
    }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const loadAssignees = useCallback(async () => {
    try {
      setAssignees((current) => ({ ...current, loading: true, error: '' }));
      const res = await adminPhase1API.crmAssignees();
      const data = res.data?.data || {};
      setAssignees({
        loading: false,
        error: '',
        brokers: data.brokers || [],
        relationship_managers: data.relationship_managers || [],
      });
    } catch (error) {
      setAssignees({ loading: false, error: error.response?.data?.detail || 'Failed to load brokers and RMs', brokers: [], relationship_managers: [] });
    }
  }, []);

  useEffect(() => { loadAssignees(); }, [loadAssignees]);

  const decideKyc = async (host, status) => {
    const remarks = window.prompt(`Remarks for ${status} KYC`);
    if (remarks === null) return;
    await adminPhase1API.updateHostKyc(host.user_id, { status, remarks });
    load();
  };

  const openKyc = async (host) => {
    try {
      setSelected({ loading: true, host, error: '' });
      const res = await adminPhase1API.hostKycDetail(host.user_id);
      setSelected({ loading: false, host: res.data.data.host, error: '' });
    } catch (error) {
      setSelected({ loading: false, host, error: error.response?.data?.detail || 'Failed to load KYC detail' });
    }
  };

  const refreshSelected = async () => {
    if (!selected.host?.user_id) return;
    const res = await adminPhase1API.hostKycDetail(selected.host.user_id);
    setSelected({ loading: false, host: res.data.data.host, error: '' });
    load();
  };

  const decideDocument = async (doc, status) => {
    const remarks = status === 'rejected' ? window.prompt(`Reason to reject ${doc.label}`) : window.prompt(`Remarks for ${doc.label}`);
    if (remarks === null) return;
    await adminPhase1API.updateHostKycDocument(selected.host.user_id, { document_type: doc.document_type, status, remarks });
    refreshSelected();
  };

  const decideBank = async (status) => {
    const remarks = window.prompt(`Remarks for bank ${status}`);
    if (remarks === null) return;
    await adminPhase1API.updateHostBankVerification(selected.host.user_id, { status, remarks });
    refreshSelected();
  };

  const decideAgreement = async (status) => {
    const remarks = window.prompt(`Remarks for agreement ${status}`);
    if (remarks === null) return;
    await adminPhase1API.updateHostAgreementVerification(selected.host.user_id, { status, remarks });
    refreshSelected();
  };

  const requestReupload = async () => {
    const reason = window.prompt('Reason for re-upload request');
    if (!reason) return;
    const document_types = (window.prompt('Document types comma separated, blank for all rejected/missing docs') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    await adminPhase1API.requestHostKycReupload(selected.host.user_id, { reason, document_types });
    refreshSelected();
  };

  const openAssignment = (host) => {
    setAssignment({
      open: true,
      host,
      broker_id: host.broker_id || '',
      rm_id: host.rm_id || '',
      reason: 'Host team assignment updated from Host Management',
      saving: false,
      error: '',
    });
  };

  const closeAssignment = () => {
    setAssignment({
      open: false,
      host: null,
      broker_id: '',
      rm_id: '',
      reason: 'Host team assignment updated from Host Management',
      saving: false,
      error: '',
    });
  };

  const saveAssignment = async () => {
    if (!assignment.host?.user_id) return;
    try {
      setAssignment((current) => ({ ...current, saving: true, error: '' }));
      await adminPhase1API.assignHostTeam(assignment.host.user_id, {
        broker_id: assignment.broker_id,
        rm_id: assignment.rm_id,
        reason: assignment.reason || 'Host team assignment updated from Host Management',
      });
      closeAssignment();
      load();
    } catch (error) {
      setAssignment((current) => ({
        ...current,
        saving: false,
        error: error.response?.data?.detail || 'Failed to update host assignment',
      }));
    }
  };

  return (
    <div>
      <PageHeader title="Host Management" description="Manage host KYC, agreements, bank verification, subscriptions, assignments and host risk review." />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${tab === id ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm" placeholder="Search host ID, name, mobile, email" /></div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          {state.hosts.map((host) => {
            const summary = host.kyc_verification?.summary || {};
            return (
            <Panel key={host.user_id} className="p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-black">{host.full_name}</p><p className="text-xs text-slate-500">{host.user_id} / {host.phone}</p></div><StatusBadge value={host.kyc_status || 'unverified'} /></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <ReadinessPill label="Docs" ready={summary.required_documents_ready} />
                <ReadinessPill label="Agreement" ready={summary.agreement_ready} />
                <ReadinessPill label="Bank" ready={summary.bank_ready} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p><span className="block text-xs font-bold uppercase text-slate-500">Email</span>{host.email}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Branch</span>{host.branch || '-'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Assigned Broker</span>{host.broker_id || '-'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Assigned RM</span>{host.rm_id || '-'}</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Properties</span>{host.total_properties || 0} total / {host.live_properties || 0} live</p>
                <p><span className="block text-xs font-bold uppercase text-slate-500">Pending Payout</span>{host.pending_payout || 0}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openKyc(host)} className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-2 py-1 text-xs font-bold text-white"><Building2 className="h-3.5 w-3.5" /> Review KYC</button>
                <button onClick={() => decideKyc(host, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"><FileCheck2 className="h-3.5 w-3.5" /> Approve KYC</button>
                <button onClick={() => decideKyc(host, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject KYC</button>
                <button onClick={() => openAssignment(host)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold"><UserCog className="h-3.5 w-3.5" /> Assign</button>
              </div>
            </Panel>
          );})}
          {!state.hosts.length && <Panel className="p-6 text-sm text-slate-500">No hosts found.</Panel>}
        </div>
        <KycReviewPanel selected={selected} onClose={() => setSelected({ loading: false, host: null, error: '' })} onDoc={decideDocument} onBank={decideBank} onAgreement={decideAgreement} onReupload={requestReupload} onFinal={decideKyc} />
        </div>
      )}
      <AssignmentModal
        assignees={assignees}
        assignment={assignment}
        onChange={setAssignment}
        onClose={closeAssignment}
        onSave={saveAssignment}
      />
    </div>
  );
};

const ReadinessPill = ({ label, ready }) => (
  <span className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1 font-bold ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
    {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{label}
  </span>
);

const KycReviewPanel = ({ selected, onClose, onDoc, onBank, onAgreement, onReupload, onFinal }) => {
  if (!selected.host) return <Panel className="hidden p-5 text-sm text-slate-500 xl:block">Select a host to review KYC, agreement and bank verification.</Panel>;
  const host = selected.host;
  const kyc = host.kyc_verification || {};
  return (
    <Panel className="p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-terracotta">KYC Review</p><h2 className="text-lg font-black">{host.full_name}</h2><p className="text-xs text-slate-500">{host.user_id}</p></div>
        <button onClick={onClose} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Close</button>
      </div>
      {selected.loading ? <LoadingState /> : selected.error ? <ErrorState message={selected.error} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <ReadinessPill label="Docs" ready={kyc.summary?.required_documents_ready} />
            <ReadinessPill label="Agreement" ready={kyc.summary?.agreement_ready} />
            <ReadinessPill label="Bank" ready={kyc.summary?.bank_ready} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Document Checklist</p>
            {(kyc.checklist || []).map((doc) => (
              <div key={doc.document_type} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{doc.label}{doc.required ? ' *' : ''}</p><p className="text-xs text-slate-500">{doc.document_type}</p></div><StatusBadge value={doc.status} /></div>
                {doc.rejection_reason && <p className="mt-2 text-xs font-semibold text-red-700">{doc.rejection_reason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {doc.document_url && <a href={doc.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" /> Open</a>}
                  <button onClick={() => onDoc(doc, 'approved')} disabled={!doc.document_url} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={() => onDoc(doc, 'rejected')} disabled={!doc.document_url} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-40"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          <ReviewBlock title="Agreement" status={kyc.agreement?.status} rows={[['Owner', kyc.agreement?.owner_name], ['Address', kyc.agreement?.owner_address], ['Signed', kyc.agreement?.signed_at]]} onApprove={() => onAgreement('approved')} onReject={() => onAgreement('rejected')} />
          <ReviewBlock title="Bank Verification" status={kyc.bank?.status} rows={[['Preferred', kyc.bank?.preferred], ['UPI', kyc.bank?.upi_vpa], ['A/C', kyc.bank?.bank_account_number_masked], ['IFSC', kyc.bank?.bank_ifsc]]} onApprove={() => onBank('approved')} onReject={() => onBank('rejected')} />
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button onClick={onReupload} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"><RotateCcw className="h-4 w-4" /> Request Re-upload</button>
            <button onClick={() => onFinal(host, 'approved')} disabled={!kyc.summary?.ready_for_approval} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Final Approve</button>
            <button onClick={() => onFinal(host, 'rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">Final Reject</button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Revision History</p>
            {(kyc.history || []).slice(0, 6).map((item) => <p key={item.event_id} className="rounded-lg bg-slate-50 p-2 text-xs"><b>{String(item.action || '').replace(/_/g, ' ')}</b> {item.document_type || ''}<span className="block text-slate-500">{item.remarks || '-'} / {item.admin_id || '-'} / {item.created_at || '-'}</span></p>)}
            {!kyc.history?.length && <p className="text-xs text-slate-500">No review history yet.</p>}
          </div>
        </div>
      )}
    </Panel>
  );
};

const ReviewBlock = ({ title, status, rows, onApprove, onReject }) => (
  <div className="rounded-lg border border-slate-200 p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-black">{title}</p><StatusBadge value={status} /></div>
    <div className="grid gap-1 text-xs">{rows.map(([label, value]) => <p key={label} className="flex justify-between gap-3"><span className="font-bold text-slate-500">{label}</span><span className="text-right">{value || '-'}</span></p>)}</div>
    <div className="mt-3 flex gap-2">
      <button onClick={onApprove} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Approve</button>
      <button onClick={onReject} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
    </div>
  </div>
);

const AssignmentModal = ({ assignees, assignment, onChange, onClose, onSave }) => {
  if (!assignment.open) return null;
  const host = assignment.host || {};
  const updateField = (field, value) => onChange((current) => ({ ...current, [field]: value, error: '' }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="w-full max-w-xl p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">Host Assignment</p>
            <h2 className="mt-1 text-xl font-black">{host.full_name || 'Host'}</h2>
            <p className="text-xs text-slate-500">{host.user_id || '-'} / {host.phone || '-'}</p>
          </div>
          <button onClick={onClose} disabled={assignment.saving} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black disabled:opacity-50">Close</button>
        </div>

        {assignees.error && <ErrorState message={assignees.error} />}
        {assignment.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{assignment.error}</div>}

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Broker
            <select
              value={assignment.broker_id}
              onChange={(event) => updateField('broker_id', event.target.value)}
              disabled={assignees.loading || assignment.saving}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-terracotta"
            >
              <option value="">-- No Broker Assigned --</option>
              {(assignees.brokers || []).map((broker) => (
                <option key={broker.user_id} value={broker.user_id}>{getAssigneeLabel(broker)}</option>
              ))}
            </select>
            <span className="text-xs font-medium text-slate-500">Current: {host.broker_id || '-'}</span>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Relationship Manager (RM)
            <select
              value={assignment.rm_id}
              onChange={(event) => updateField('rm_id', event.target.value)}
              disabled={assignees.loading || assignment.saving}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-terracotta"
            >
              <option value="">-- No RM Assigned --</option>
              {(assignees.relationship_managers || []).map((rm) => (
                <option key={rm.user_id} value={rm.user_id}>{getAssigneeLabel(rm)}</option>
              ))}
            </select>
            <span className="text-xs font-medium text-slate-500">Current: {host.rm_id || '-'}</span>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Assignment Reason
            <textarea
              value={assignment.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              disabled={assignment.saving}
              rows={3}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-terracotta"
              placeholder="Reason for audit log"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={assignment.saving} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-black disabled:opacity-50">Cancel</button>
          <button onClick={onSave} disabled={assignees.loading || assignment.saving} className="rounded-lg bg-charcoal px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {assignment.saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </Panel>
    </div>
  );
};

export default HostManagement;
