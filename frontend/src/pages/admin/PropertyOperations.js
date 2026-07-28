import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Image, Search, UserCog, XCircle } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney } from './shared';

const tabs = [
  ['all', 'All Properties'], ['draft', 'Draft'], ['submitted', 'Submitted'], ['document_check', 'Document Check'], ['broker_verification', 'Broker Verification'],
  ['rm_verification', 'RM Verification'], ['admin_review', 'Admin Review'], ['approved', 'Approved'], ['live', 'Live'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['archived', 'Archived'],
];

const PropertyOperations = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState({ loading: true, error: '', properties: [] });
  const [selected, setSelected] = useState({ loading: false, property: null, error: '' });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.propertyOperations({ tab, search, category });
      setState({ loading: false, error: '', properties: res.data.data.properties });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load properties', properties: [] });
    }
  }, [tab, search, category]);

  useEffect(() => { load(); }, [load]);

  const assignTeam = async (property) => {
    const broker_id = window.prompt('Broker user ID', property.assigned_broker || '');
    if (broker_id === null) return;
    const rm_id = window.prompt('RM employee user ID', property.assigned_rm || '');
    if (rm_id === null) return;
    const reason = window.prompt('Reason for assignment');
    if (!reason) return;
    await adminPhase1API.assignPropertyTeam(property.property_id, { broker_id, rm_id, reason });
    load();
  };

  const changeStatus = async (property, status) => {
    const reason = window.prompt(`Reason for changing status to ${status}`);
    if (!reason) return;
    await adminPhase1API.updatePropertyOperationStatus(property.property_id, { status, reason });
    load();
  };

  const openProperty = async (property) => {
    try {
      setSelected({ loading: true, property, error: '' });
      const res = await adminPhase1API.propertyOperationDetail(property.property_id);
      setSelected({ loading: false, property: res.data.data.property, error: '' });
    } catch (error) {
      setSelected({ loading: false, property, error: error.response?.data?.detail || 'Failed to load property detail' });
    }
  };

  const refreshSelected = async () => {
    if (!selected.property?.property_id) return;
    const res = await adminPhase1API.propertyOperationDetail(selected.property.property_id);
    setSelected({ loading: false, property: res.data.data.property, error: '' });
    load();
  };

  const updateChecklist = async (item, status) => {
    const remarks = window.prompt(`Remarks for ${item.label}`);
    if (remarks === null) return;
    await adminPhase1API.updatePropertyChecklist(selected.property.property_id, { item_key: item.item_key, status, remarks });
    refreshSelected();
  };

  const updateStage = async (stage, status) => {
    const remarks = window.prompt(`Remarks for ${stage}`);
    if (remarks === null) return;
    await adminPhase1API.updatePropertyStage(selected.property.property_id, { stage, status, remarks });
    refreshSelected();
  };

  const finalStatus = async (status) => {
    const reason = window.prompt(`Reason for ${status}`);
    if (!reason) return;
    await adminPhase1API.updatePropertyOperationStatus(selected.property.property_id, { status, reason });
    refreshSelected();
  };

  return (
    <div>
      <PageHeader title="Property Operations" description="Manage property verification workflow from draft to submitted, broker verification, RM verification, admin review and live operations." />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${tab === id ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm" placeholder="Search property name, ID, city, host" /></div>
          <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All Categories</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="event_venue">Event Venue</option></select>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Property', 'Host', 'Category', 'City', 'Broker', 'RM', 'Stage', 'Subscription', 'Price', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{state.properties.map((property) => <tr key={property.property_id}><td className="px-4 py-3"><p className="font-black">{property.title}</p><p className="font-mono text-xs text-slate-500">{property.property_id}</p></td><td className="px-4 py-3">{property.host_name || property.owner_id}</td><td className="px-4 py-3 capitalize">{property.category}</td><td className="px-4 py-3">{property.city}</td><td className="px-4 py-3">{property.assigned_broker || '-'}</td><td className="px-4 py-3">{property.assigned_rm || '-'}</td><td className="px-4 py-3"><StatusBadge value={property.status} /></td><td className="px-4 py-3">{property.subscription_status || '-'}</td><td className="px-4 py-3">{formatMoney(property.price_per_night || 0)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><button onClick={() => openProperty(property)} className="rounded-lg bg-charcoal px-2 py-1 text-xs font-bold text-white">Review</button><button onClick={() => assignTeam(property)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Assign</button><button onClick={() => changeStatus(property, 'live')} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Live</button><button onClick={() => changeStatus(property, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button></div></td></tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">{state.properties.map((property) => <Panel key={property.property_id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{property.title}</p><p className="text-xs text-slate-500">{property.property_id}</p></div><StatusBadge value={property.status} /></div><p className="mt-2 text-sm">{property.city} / {property.category}</p><div className="mt-3 flex gap-3"><button onClick={() => openProperty(property)} className="text-sm font-bold text-charcoal">Review</button><button onClick={() => assignTeam(property)} className="inline-flex items-center gap-1 text-sm font-bold text-terracotta"><UserCog className="h-4 w-4" /> Assign Team</button></div></Panel>)}</div>
        </Panel>
        <PropertyReviewPanel selected={selected} onClose={() => setSelected({ loading: false, property: null, error: '' })} onChecklist={updateChecklist} onStage={updateStage} onFinal={finalStatus} />
        </div>
      )}
    </div>
  );
};

const ReadinessPill = ({ label, ready }) => (
  <span className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
    {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{label}
  </span>
);

const PropertyReviewPanel = ({ selected, onClose, onChecklist, onStage, onFinal }) => {
  if (!selected.property) return <Panel className="hidden p-5 text-sm text-slate-500 xl:block">Select a property to review listing readiness, workflow stages and final publishing status.</Panel>;
  const property = selected.property;
  const review = property.operations_review || {};
  const images = property.images || [];
  return (
    <Panel className="p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-terracotta">Property Review</p><h2 className="text-lg font-black">{property.title}</h2><p className="font-mono text-xs text-slate-500">{property.property_id}</p></div>
        <button onClick={onClose} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Close</button>
      </div>
      {selected.loading ? <LoadingState /> : selected.error ? <ErrorState message={selected.error} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ReadinessPill label="Checklist" ready={review.summary?.checklist_approved} />
            <ReadinessPill label="Host KYC" ready={review.summary?.host_kyc_status === 'approved'} />
            <ReadinessPill label="Live Ready" ready={review.summary?.ready_for_live} />
          </div>
          <div className="grid gap-2 text-xs">
            {[
              ['Host', property.host?.full_name || property.owner_id],
              ['City', property.city],
              ['Category', property.category],
              ['Price', formatMoney(property.price_per_night || 0)],
            ].map(([label, value]) => <p key={label} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="font-bold text-slate-500">{label}</span><span className="text-right font-semibold">{value || '-'}</span></p>)}
          </div>
          {!!images.length && (
            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-500">Photos</p>
              <div className="grid grid-cols-3 gap-2">{images.slice(0, 6).map((src, index) => <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer" className="group aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /></a>)}</div>
            </div>
          )}
          {!images.length && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700"><Image className="h-4 w-4" /> Photos missing</div>}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Readiness Checklist</p>
            {(review.checklist || []).map((item) => (
              <div key={item.item_key} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{item.label}</p><p className="text-xs text-slate-500">{item.details}</p></div><StatusBadge value={item.status} /></div>
                {item.remarks && <p className="mt-2 text-xs font-semibold text-slate-600">{item.remarks}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onChecklist(item, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={() => onChecklist(item, 'rejected')} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Workflow Stages</p>
            {Object.entries(review.stages || {}).map(([stage, data]) => <StageRow key={stage} stage={stage} data={data} onStage={onStage} />)}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button onClick={() => onFinal('under_review')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black">Move Under Review</button>
            <button onClick={() => onFinal('live')} disabled={!review.summary?.ready_for_live} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Publish Live</button>
            <button onClick={() => onFinal('rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">Reject</button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Review History</p>
            {(review.history || []).slice(0, 6).map((item) => <p key={item.event_id} className="rounded-lg bg-slate-50 p-2 text-xs"><b>{String(item.action || '').replace(/_/g, ' ')}</b> {item.item_key || ''}<span className="block text-slate-500">{item.remarks || '-'} / {item.admin_id || '-'} / {item.created_at || '-'}</span></p>)}
            {!review.history?.length && <p className="text-xs text-slate-500">No review history yet.</p>}
          </div>
        </div>
      )}
    </Panel>
  );
};

const StageRow = ({ stage, data, onStage }) => (
  <div className="rounded-lg border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-2"><p className="text-sm font-black capitalize">{stage.replace(/_/g, ' ')}</p><StatusBadge value={data?.status || 'pending'} /></div>
    {data?.remarks && <p className="mt-2 text-xs text-slate-500">{data.remarks}</p>}
    <div className="mt-3 flex gap-2">
      <button onClick={() => onStage(stage, 'approved')} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Approve</button>
      <button onClick={() => onStage(stage, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
    </div>
  </div>
);

export default PropertyOperations;
