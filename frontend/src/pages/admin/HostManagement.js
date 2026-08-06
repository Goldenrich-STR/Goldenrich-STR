import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, ExternalLink, FileCheck2, IndianRupee, RotateCcw, Search, ShieldCheck, UserCog, Users, XCircle } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestInput, requestReason } from './shared';

const tabs = [
  ['all', 'All Hosts'], ['pending_kyc', 'Pending KYC'], ['kyc_approved', 'KYC Approved'], ['kyc_rejected', 'KYC Rejected'], ['subscription_status', 'Subscription Status'],
];

const getAssigneeCode = (user) => user?.lg_code || user?.employee_code || user?.uid || user?.user_id || '';

const getAssigneeLabel = (user) => {
  const name = user?.full_name || user?.name || user?.email || user?.phone || 'Unnamed';
  const code = getAssigneeCode(user);
  return code ? `${name} (${code})` : name;
};

const getAssigneeOptionLabel = (user) => {
  const name = user?.full_name || user?.name || user?.email || user?.phone || 'Unnamed';
  const code = getAssigneeCode(user);
  return code ? `${code} - ${name}` : name;
};

const getBranchManagerIdFromHost = (host, branchManagers = []) => {
  if (host?.branch_manager_id) return host.branch_manager_id;
  const code = host?.branch_manager?.employee_code || host?.branch_manager_code || host?.employee_code;
  if (!code) return '';
  const match = branchManagers.find((manager) => getAssigneeCode(manager) === code || manager.user_id === code);
  return match?.user_id || code;
};

const codeText = (value) => value || 'Not assigned';
const displayDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AssignmentCard = ({ label, type, name, code, fallback }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
    <div className="flex items-start justify-between gap-2">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {type ? <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">{type}</span> : null}
    </div>
    <span className="mt-2 block truncate text-sm font-black text-slate-900">{name || fallback || 'Not assigned'}</span>
    <span className="mt-1 block break-all font-mono text-[11px] font-bold text-slate-500">{codeText(code)}</span>
  </div>
);

const MetricCard = ({ label, value, icon: Icon, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-[#eef5ff] text-[#2f6df6]',
    emerald: 'bg-[#eef5ff] text-[#2f6df6]',
    amber: 'bg-[#f3f7ff] text-[#5b7ecb]',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-[20px] font-black text-slate-950">{value}</p>
        </div>
        <span className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
};

const SubscriptionStatusView = ({ hosts }) => {
  const rows = hosts.map((host) => {
    const summary = host.subscription_summary || {};
    const current = summary.current || {};
    return { host, summary, current };
  });
  const totals = rows.reduce((acc, row) => ({
    total: acc.total + Number(row.summary.total || 0),
    active: acc.active + Number(row.summary.active || 0),
    trial: acc.trial + Number(row.summary.trial || 0),
    expired: acc.expired + Number(row.summary.expired || 0),
    cancelled: acc.cancelled + Number(row.summary.cancelled || 0),
  }), { total: 0, active: 0, trial: 0, expired: 0, cancelled: 0 });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Subscriptions" value={totals.total} icon={FileCheck2} />
        <MetricCard label="Active" value={totals.active} icon={CheckCircle2} tone="emerald" />
        <MetricCard label="Trial" value={totals.trial} icon={AlertCircle} tone="amber" />
        <MetricCard label="Expired" value={totals.expired} icon={RotateCcw} />
        <MetricCard label="Cancelled" value={totals.cancelled} icon={XCircle} tone="red" />
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-[#2f6df6]">Subscription Workspace</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Host Subscription Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Current Plan</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map(({ host, summary, current }) => {
                const planName = current.plan_name || current.plan?.plan_name || current.plan_id || '-';
                const endDate = current.end_date || current.expires_at || current.renew_date || current.created_at;
                return (
                  <tr key={host.user_id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-950">{host.full_name || '-'}</p>
                      <p className="mt-1 font-mono text-xs font-bold text-slate-500">{host.user_id}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{host.phone || '-'} / {host.email || '-'}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">{planName}</td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{current.property_id || '-'}</td>
                    <td className="px-4 py-4 font-black text-slate-950">{formatMoney(current.amount || current.total_amount || 0)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{displayDate(endDate)}</td>
                    <td className="px-4 py-4"><StatusBadge value={current.status || 'no_subscription'} /></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">Total {summary.total || 0}</span>
                        <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] font-black text-[#2f6df6]">Active {summary.active || 0}</span>
                        <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-700">Cancelled {summary.cancelled || 0}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No host subscription records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

const HostManagement = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', hosts: [] });
  const [selected, setSelected] = useState({ loading: false, host: null, error: '' });
  const [assignees, setAssignees] = useState({ loading: true, error: '', brokers: [], relationship_managers: [], branch_managers: [] });
  const [assignment, setAssignment] = useState({
    open: false,
    host: null,
    broker_id: '',
    rm_id: '',
    reason: 'Host team assignment updated from Host Management',
    saving: false,
    error: '',
  });

  const metrics = useMemo(() => {
    const hosts = state.hosts || [];
    return {
      total: hosts.length,
      approved: hosts.filter((host) => host.kyc_status === 'approved').length,
      pending: hosts.filter((host) => !host.kyc_status || host.kyc_status === 'pending').length,
      risk: hosts.filter((host) => host.is_active === false || host.kyc_status === 'rejected').length,
      properties: hosts.reduce((sum, host) => sum + Number(host.total_properties || 0), 0),
      bookings: hosts.reduce((sum, host) => sum + Number(host.total_bookings || 0), 0),
    };
  }, [state.hosts]);

  const visibleHosts = useMemo(() => {
    const matchesTab = (host) => {
      const kycStatus = String(host.kyc_status || 'unverified').toLowerCase();
      const subscriptionTotal = Number(host.subscription_summary?.total || 0);
      if (tab === 'pending_kyc') return !host.kyc_status || kycStatus === 'pending' || kycStatus === 'unverified';
      if (tab === 'kyc_approved') return kycStatus === 'approved';
      if (tab === 'kyc_rejected') return kycStatus === 'rejected';
      if (tab === 'subscription_status') return subscriptionTotal > 0;
      return true;
    };
    return [...(state.hosts || [])].filter(matchesTab).sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      //
      //
      return dateB - dateA;
    });
  }, [state.hosts, tab]);

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
        branch_managers: data.branch_managers || [],
      });
    } catch (error) {
      setAssignees({ loading: false, error: error.response?.data?.detail || 'Failed to load brokers, RMs and branch managers', brokers: [], relationship_managers: [], branch_managers: [] });
    }
  }, []);

  useEffect(() => { loadAssignees(); }, [loadAssignees]);

  const decideKyc = async (host, status) => {
    const remarks = await requestReason({ title: 'Host KYC Decision', description: `Marking ${host.full_name || host.user_id} KYC as ${status}.`, placeholder: 'Add KYC decision remarks.', minLength: 1, confirmLabel: 'Save Remarks' });
    if (remarks === null) return;
    await adminPhase1API.updateHostKyc(host.user_id, { status, remarks });
    await load();
    if (selected.host?.user_id === host.user_id) {
      const res = await adminPhase1API.hostKycDetail(host.user_id);
      setSelected({ loading: false, host: res.data.data.host, error: '' });
    }
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
    const remarks = await requestReason({ title: status === 'rejected' ? 'Reject Document' : 'Document Remarks', description: `${doc.label} will be marked ${status}.`, placeholder: status === 'rejected' ? 'Add rejection reason.' : 'Add document review remarks.', minLength: 1, confirmLabel: 'Save Remarks' });
    if (remarks === null) return;
    await adminPhase1API.updateHostKycDocument(selected.host.user_id, { document_type: doc.document_type, status, remarks });
    refreshSelected();
  };

  const decideBank = async (status) => {
    const remarks = await requestReason({ title: 'Bank Verification Remarks', description: `Bank verification will be marked ${status}.`, placeholder: 'Add bank verification remarks.', minLength: 1, confirmLabel: 'Save Remarks' });
    if (remarks === null) return;
    await adminPhase1API.updateHostBankVerification(selected.host.user_id, { status, remarks });
    refreshSelected();
  };

  const decideAgreement = async (status) => {
    const remarks = await requestReason({ title: 'Agreement Verification Remarks', description: `Agreement verification will be marked ${status}.`, placeholder: 'Add agreement verification remarks.', minLength: 1, confirmLabel: 'Save Remarks' });
    if (remarks === null) return;
    await adminPhase1API.updateHostAgreementVerification(selected.host.user_id, { status, remarks });
    refreshSelected();
  };

  const requestReupload = async () => {
    const reason = await requestReason({ title: 'Re-upload Request Reason', description: 'This reason will be sent with the host document re-upload request.', placeholder: 'Explain what the host needs to re-upload.', minLength: 3 });
    if (!reason) return;
    const documentTypesRaw = await requestInput({
      title: 'Document Re-upload Scope',
      description: 'Comma separated document types. Leave blank for all rejected or missing documents.',
      label: 'Document Types',
      confirmLabel: 'Send Request',
      allowEmpty: true,
    });
    if (documentTypesRaw === null) return;
    const document_types = (documentTypesRaw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    await adminPhase1API.requestHostKycReupload(selected.host.user_id, { reason, document_types });
    refreshSelected();
  };

  const openAssignment = (host) => {
    const primaryId = host.broker_id || host.rm_id || '';
    const secondaryId = host.broker_id ? (host.rm_id || '') : getBranchManagerIdFromHost(host, assignees.branch_managers);
    setAssignment({
      open: true,
      host,
      broker_id: primaryId,
      rm_id: secondaryId,
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
      <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Hosts" value={metrics.total} icon={Users} />
        <MetricCard label="KYC Approved" value={metrics.approved} icon={ShieldCheck} tone="emerald" />
        <MetricCard label="Pending KYC" value={metrics.pending} icon={AlertCircle} tone="amber" />
        <MetricCard label="Risk Review" value={metrics.risk} icon={XCircle} tone="red" />
        <MetricCard label="Properties" value={metrics.properties} icon={Building2} />
        <MetricCard label="Bookings" value={metrics.bookings} icon={IndianRupee} />
      </div>
      <Panel className="mb-4 overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-3">
          <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-[#e8f0ff] text-[#2f6df6] shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>{label}</button>)}</div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-inner"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full bg-transparent text-sm font-medium outline-none" placeholder="Search host ID, name, mobile, email" /></div>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : tab === 'subscription_status' ? (
        <SubscriptionStatusView hosts={visibleHosts} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid content-start gap-4 lg:grid-cols-2">
          {visibleHosts.map((host) => {
            const summary = host.kyc_verification?.summary || {};
            const checklist = host.kyc_verification?.checklist || [];
            const uploadedDocs = checklist.filter((doc) => doc.document_url).length;
            const requiredDocs = checklist.filter((doc) => doc.required).length;
            const brokerName = host.broker?.full_name || host.broker_name;
            const brokerCode = host.broker?.lg_code || host.broker_lg_code;
            const rmName = host.rm?.full_name || host.rm_name;
            const rmCode = host.rm?.employee_code || host.rm_code;
            const primaryAssignee = brokerCode || brokerName
              ? { type: 'Broker', name: brokerName, code: brokerCode, fallback: host.broker_id }
              : { type: 'RM', name: rmName, code: rmCode || host.lg_code, fallback: host.rm_id };
            const branchManagerName = host.branch_manager?.full_name || host.branch_manager_name;
            const branchManagerCode = host.branch_manager?.employee_code || host.branch_manager_code || host.employee_code;
            const secondaryAssignee = primaryAssignee.type === 'Broker'
              ? { type: 'RM', name: rmName, code: rmCode || host.employee_code, fallback: host.rm_id }
              : { type: 'Branch Manager', name: branchManagerName, code: branchManagerCode, fallback: host.branch_manager_id };
            return (
            <Panel key={host.user_id} className={`overflow-hidden transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(47,109,246,0.08)] ${selected.host?.user_id === host.user_id ? 'ring-2 ring-[#cfe0ff]' : ''}`}>
              <div className="border-b border-slate-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2f6df6] text-sm font-black text-white shadow-sm">
                    {host.full_name?.[0]?.toUpperCase() || 'H'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">{host.full_name}</p>
                    <p className="mt-1 break-all font-mono text-[11px] font-bold text-slate-500">HST - {host.user_id}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{host.phone || '-'} / {host.email || '-'}</p>
                    {host.created_at && (
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        Reg: {new Date(host.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge value={host.kyc_status || 'unverified'} />
              </div>
              </div>
              <div className="p-4">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verification Readiness</p>
                  <p className="mt-1 text-sm font-black text-slate-950">Documents</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{uploadedDocs}/{requiredDocs} required documents uploaded</p>
                </div>
                <ReadinessPill label={uploadedDocs ? 'Uploaded' : summary.required_documents_ready ? 'Ready' : 'Pending'} ready={uploadedDocs || summary.required_documents_ready} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <AssignmentCard label="Broker / RM Code" type={primaryAssignee.type} name={primaryAssignee.name} code={primaryAssignee.code} fallback={primaryAssignee.fallback} />
                <AssignmentCard label="Branch Manager / RM Code" type={secondaryAssignee.type} name={secondaryAssignee.name} code={secondaryAssignee.code} fallback={secondaryAssignee.fallback} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 p-3 text-center">
                <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Branch</span><span className="mt-1 block truncate text-sm font-black">{host.branch || '-'}</span></p>
                <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Props</span><span className="mt-1 block text-sm font-black">{host.total_properties || 0}/{host.live_properties || 0}</span></p>
                <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Bookings</span><span className="mt-1 block text-sm font-black">{host.total_bookings || 0}</span></p>
                <p><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Payout</span><span className="mt-1 block text-sm font-black">{formatMoney(host.pending_payout || 0)}</span></p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => openKyc(host)} className="inline-flex items-center justify-center gap-1 rounded-2xl bg-[#2f6df6] px-3 py-2.5 text-xs font-bold text-white"><Building2 className="h-3.5 w-3.5" /> Review KYC</button>
                <button onClick={() => decideKyc(host, 'approved')} className="inline-flex items-center justify-center gap-1 rounded-2xl bg-[#eef5ff] px-3 py-2.5 text-xs font-bold text-[#2f6df6]"><FileCheck2 className="h-3.5 w-3.5" /> Approve</button>
                <button onClick={() => decideKyc(host, 'rejected')} className="rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">Reject</button>
                <button onClick={() => openAssignment(host)} className="inline-flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700"><UserCog className="h-3.5 w-3.5" /> Assign</button>
              </div>
              </div>
            </Panel>
          );})}
          {!visibleHosts.length && <Panel className="p-6 text-sm text-slate-500">No hosts found.</Panel>}
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
  <span className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 font-bold ${ready ? 'border-[#cfe0ff] bg-[#eef5ff] text-[#2f6df6]' : 'border-[#d9e5fb] bg-[#f4f8ff] text-[#5b7ecb]'}`}>
    {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{label}
  </span>
);

const KycReviewPanel = ({ selected, onClose, onDoc, onBank, onAgreement, onReupload, onFinal }) => {
  if (!selected.host) {
    return (
      <Panel className="hidden overflow-hidden xl:block">
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#2f6df6]">Review Workspace</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Host Verification</h2>
        </div>
        <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <span className="mb-4 rounded-lg bg-slate-100 p-3 text-slate-600"><ShieldCheck className="h-6 w-6" /></span>
          <p className="font-black text-slate-900">Select a host</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Open a host card to review documents, agreement status, bank verification and final KYC decision.</p>
        </div>
      </Panel>
    );
  }
  const host = selected.host;
  const kyc = host.kyc_verification || {};
  return (
    <Panel className="overflow-hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="border-b border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2f6df6]">KYC Review</p>
            <h2 className="mt-1 truncate text-lg font-black">{host.full_name}</h2>
            <p className="break-all font-mono text-xs text-slate-500">{host.user_id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white px-2 py-1 text-xs font-bold shadow-sm">Close</button>
        </div>
      </div>
      <div className="p-4">
      {selected.loading ? <LoadingState /> : selected.error ? <ErrorState message={selected.error} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <ReadinessPill label="Docs" ready={kyc.summary?.required_documents_ready} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Document Checklist</p>
            {(kyc.checklist || []).map((doc) => (
              <div key={doc.document_type} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{doc.label}{doc.required ? ' *' : ''}</p><p className="text-xs text-slate-500">{doc.document_type}</p></div><StatusBadge value={doc.status} /></div>
                {doc.rejection_reason && <p className="mt-2 text-xs font-semibold text-red-700">{doc.rejection_reason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {doc.text_value && <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">{doc.text_value}</span>}
                  {doc.document_url && <a href={doc.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" /> Open</a>}
                  <button onClick={() => onDoc(doc, 'approved')} disabled={!doc.document_url && !doc.text_value} className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6] disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={() => onDoc(doc, 'rejected')} disabled={!doc.document_url && !doc.text_value} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-40"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button onClick={onReupload} className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-700"><RotateCcw className="h-4 w-4" /> Request Re-upload</button>
            <button onClick={() => onFinal(host, 'approved')} disabled={!kyc.summary?.ready_for_approval} className="rounded-2xl bg-[#2f6df6] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">Final Approve</button>
            <button onClick={() => onFinal(host, 'rejected')} className="rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-black text-white">Final Reject</button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Revision History</p>
            {(kyc.history || []).slice(0, 6).map((item) => <p key={item.event_id} className="rounded-2xl bg-slate-50 p-3 text-xs"><b>{String(item.action || '').replace(/_/g, ' ')}</b> {item.document_type || ''}<span className="block text-slate-500">{item.remarks || '-'} / {item.admin_id || '-'} / {item.created_at || '-'}</span></p>)}
            {!kyc.history?.length && <p className="text-xs text-slate-500">No review history yet.</p>}
          </div>
        </div>
      )}
      </div>
    </Panel>
  );
};

const ReviewBlock = ({ title, status, rows, onApprove, onReject }) => (
  <div className="rounded-2xl border border-slate-200 p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-black">{title}</p><StatusBadge value={status} /></div>
    <div className="grid gap-1 text-xs">{rows.map(([label, value]) => <p key={label} className="flex justify-between gap-3"><span className="font-bold text-slate-500">{label}</span><span className="text-right">{value || '-'}</span></p>)}</div>
    <div className="mt-3 flex gap-2">
      <button onClick={onApprove} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Approve</button>
      <button onClick={onReject} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
    </div>
  </div>
);

const AssignmentModal = ({ assignees, assignment, onChange, onClose, onSave }) => {
  if (!assignment.open) return null;
  const host = assignment.host || {};
  const updateField = (field, value) => onChange((current) => ({ ...current, [field]: value, error: '' }));
  const primaryOptions = [
    ...(assignees.brokers || []).map((user) => ({ ...user, assignment_type: 'broker' })),
    ...(assignees.relationship_managers || []).map((user) => ({ ...user, assignment_type: 'rm' })),
  ];
  const selectedPrimary = primaryOptions.find((user) => user.user_id === assignment.broker_id || getAssigneeCode(user) === assignment.broker_id);
  const secondaryType = selectedPrimary?.assignment_type === 'broker' ? 'rm' : selectedPrimary?.assignment_type === 'rm' ? 'branch_manager' : '';
  const secondaryOptions = secondaryType === 'rm'
    ? assignees.relationship_managers || []
    : secondaryType === 'branch_manager'
      ? assignees.branch_managers || []
      : [];
  const secondaryPlaceholder = secondaryType === 'rm'
    ? '-- Select RM Code --'
    : secondaryType === 'branch_manager'
      ? '-- Select Branch Manager Code --'
      : '-- Select Broker / RM first --';
  const handlePrimaryChange = (value) => {
    onChange((current) => ({ ...current, broker_id: value, rm_id: '', error: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="w-full max-w-xl p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f6df6]">Host Assignment</p>
            <h2 className="mt-1 text-xl font-black">{host.full_name || 'Host'}</h2>
            <p className="text-xs text-slate-500">{host.user_id || '-'} / {host.phone || '-'}</p>
          </div>
          <button onClick={onClose} disabled={assignment.saving} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black disabled:opacity-50">Close</button>
        </div>

        {assignees.error && <ErrorState message={assignees.error} />}
        {assignment.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{assignment.error}</div>}

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Broker / RM Code
            <select
              value={assignment.broker_id}
              onChange={(event) => handlePrimaryChange(event.target.value)}
              disabled={assignees.loading || assignment.saving}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#2f6df6]"
            >
              <option value="">-- No Broker / RM Assigned --</option>
              {primaryOptions.map((user) => (
                <option key={`${user.assignment_type}-${user.user_id}`} value={user.user_id}>
                  {getAssigneeOptionLabel(user)} [{user.assignment_type === 'broker' ? 'Broker' : 'RM'}]
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-slate-500">Current: {host.broker_id ? (host.broker?.lg_code || host.lg_code || host.broker_id) : (host.rm?.employee_code || host.lg_code || host.rm_id || '-')}</span>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Branch Manager / RM Code
            <select
              value={assignment.rm_id}
              onChange={(event) => updateField('rm_id', event.target.value)}
              disabled={assignees.loading || assignment.saving || !selectedPrimary}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#2f6df6]"
            >
              <option value="">{secondaryPlaceholder}</option>
              {secondaryOptions.map((user) => (
                <option key={`${secondaryType}-${user.user_id}`} value={user.user_id}>
                  {getAssigneeOptionLabel(user)} [{secondaryType === 'rm' ? 'RM' : 'Branch Manager'}]
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-slate-500">Current: {host.broker_id ? (host.rm?.employee_code || host.rm_id || '-') : (host.branch_manager?.employee_code || host.branch_manager_id || host.employee_code || '-')}</span>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Assignment Reason
            <textarea
              value={assignment.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              disabled={assignment.saving}
              rows={3}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#2f6df6]"
              placeholder="Reason for audit log"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={assignment.saving} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-black disabled:opacity-50">Cancel</button>
          <button onClick={onSave} disabled={assignees.loading || assignment.saving} className="rounded-2xl bg-[#2f6df6] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
            {assignment.saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </Panel>
    </div>
  );
};

export default HostManagement;
