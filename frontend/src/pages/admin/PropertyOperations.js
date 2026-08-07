import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ExternalLink, Image, Search, Trash2, UserCog, XCircle } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestInput, requestReason, showNotice } from './shared';

const tabs = [
  ['all', 'All Properties'],
  ['broker_verification', 'Broker Verification'],
  ['rm_verification', 'RM Verification'],
  ['branch_manager_review', 'Branch Manager Review'],
  ['admin_review', 'Admin Review'],
  ['live', 'Live'],
  ['rejected', 'Rejected'],
];

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-elevated">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close review">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(92vh-70px)] overflow-y-auto bg-slate-50 p-5">{children}</div>
    </div>
  </div>
);

const PropertyOperations = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [hostFilter, setHostFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [rmFilter, setRmFilter] = useState('');
  const [state, setState] = useState({ loading: true, error: '', properties: [] });
  const [selected, setSelected] = useState({ loading: false, property: null, error: '' });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.propertyOperations({ tab, search, category, property_type: propertyType, host: hostFilter, broker: brokerFilter, rm: rmFilter });
      setState({ loading: false, error: '', properties: res.data.data.properties });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load properties', properties: [] });
    }
  }, [tab, search, category, propertyType, hostFilter, brokerFilter, rmFilter]);

  useEffect(() => { load(); }, [load]);

  const filterOptions = useMemo(() => ({
    propertyTypes: Array.from(new Set(state.properties.map((property) => property.property_type || property.bhk_type).filter(Boolean))).sort(),
    hosts: Array.from(new Set(state.properties.map((property) => property.host_name || property.owner_id).filter(Boolean))).sort(),
    brokers: Array.from(new Set(state.properties.map((property) => property.broker_name || property.broker_code || property.assigned_broker).filter(Boolean))).sort(),
    rms: Array.from(new Set(state.properties.map((property) => property.rm_name || property.rm_code || property.assigned_rm).filter(Boolean))).sort(),
  }), [state.properties]);

  const assignTeam = async (property) => {
    const broker_id = await requestInput({
      title: 'Assign Broker',
      description: `Enter broker user ID for ${property.title || property.property_id}.`,
      label: 'Broker User ID',
      defaultValue: property.assigned_broker || '',
      placeholder: 'e.g. user_broker_propnest',
      confirmLabel: 'Continue',
      allowEmpty: true,
    });
    if (broker_id === null) return;
    const rm_id = await requestInput({
      title: 'Assign RM',
      description: `Enter RM employee user ID for ${property.title || property.property_id}.`,
      label: 'RM Employee User ID',
      defaultValue: property.assigned_rm || '',
      placeholder: 'e.g. user_employee_propnest',
      confirmLabel: 'Continue',
      allowEmpty: true,
    });
    if (rm_id === null) return;
    const reason = await requestReason({
      title: 'Property Assignment Reason',
      description: `Assigning team for ${property.title || property.property_id}.`,
      placeholder: 'Explain why this broker/RM assignment is being changed.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.assignPropertyTeam(property.property_id, { broker_id, rm_id, reason });
    load();
  };

  const changeStatus = async (property, status) => {
    const reason = await requestReason({
      title: 'Property Status Change',
      description: `Changing ${property.title || property.property_id} to ${String(status).replace(/_/g, ' ')}.`,
      placeholder: 'Add status change reason for audit history.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.updatePropertyOperationStatus(property.property_id, { status, reason });
    load();
  };

  const deleteRejectedProperty = async (property) => {
    const isRejected = tab === 'rejected' || String(property.status || '').toLowerCase() === 'rejected';
    if (!isRejected) return;
    const reason = await requestReason({
      title: 'Delete Rejected Property',
      description: `${property.title || property.property_id} will be archived before deletion.`,
      placeholder: 'Enter deletion reason with enough context.',
      minLength: 10,
      confirmLabel: 'Delete Property',
    });
    if (!reason) return;
    try {
      await adminPhase1API.deletePropertyOperation(property.property_id, { reason });
      if (selected.property?.property_id === property.property_id) {
        setSelected({ loading: false, property: null, error: '' });
      }
      load();
    } catch (error) {
      await showNotice({
        title: 'Delete Failed',
        description: error.response?.data?.detail || 'Failed to delete rejected property',
        eyebrow: 'Action Failed',
      });
    }
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

  const editProperty = (property) => {
    navigate(`/host/list-property?edit=${property.property_id}`);
  };

  const updateChecklist = async (item, status) => {
    const remarks = await requestReason({
      title: `Checklist Remarks`,
      description: `${item.label} will be marked in the property review checklist.`,
      placeholder: 'Add review remarks.',
      minLength: 1,
      confirmLabel: 'Save Remarks',
    });
    if (remarks === null) return;
    await adminPhase1API.updatePropertyChecklist(selected.property.property_id, { item_key: item.item_key, status, remarks });
    refreshSelected();
  };

  const updateStage = async (stage, status) => {
    const remarks = await requestReason({
      title: 'Workflow Stage Remarks',
      description: `${String(stage).replace(/_/g, ' ')} stage update requires remarks.`,
      placeholder: 'Add stage review remarks.',
      minLength: 1,
      confirmLabel: 'Save Remarks',
    });
    if (remarks === null) return;
    await adminPhase1API.updatePropertyStage(selected.property.property_id, { stage, status, remarks });
    refreshSelected();
  };

  const finalStatus = async (status) => {
    const reason = await requestReason({
      title: status === 'rejected' ? 'Reject Property' : 'Final Property Decision',
      description: `Final decision: ${String(status).replace(/_/g, ' ')}.`,
      placeholder: status === 'rejected' ? 'Enter clear rejection reason.' : 'Enter decision reason.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.updatePropertyOperationStatus(selected.property.property_id, { status, reason });
    refreshSelected();
  };

  return (
    <div>
      <PageHeader title="Property Operations" description="Manage property verification workflow from draft to submitted, broker verification, RM verification, admin review and live operations." />
      <Panel className="mb-4 p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-[#e8f0ff] text-[#2f6df6] shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>{label}</button>)}</div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-inner"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm font-medium outline-none" placeholder="Search property, host, broker, RM, city or type" /></div>
          <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All Categories</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="event_venue">Event Venue</option></select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}><option value="">All Property Types</option>{filterOptions.propertyTypes.map((item) => <option key={item} value={item}>{String(item).replace(/_/g, ' ')}</option>)}</select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}><option value="">All Hosts</option>{filterOptions.hosts.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={brokerFilter} onChange={(e) => setBrokerFilter(e.target.value)}><option value="">All Brokers</option>{filterOptions.brokers.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={rmFilter} onChange={(e) => setRmFilter(e.target.value)}><option value="">All RMs</option>{filterOptions.rms.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="grid gap-4">
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.16em] text-slate-400"><tr>{['Property', 'Host Name', 'Property Type', 'Category', 'City', 'Broker Name', 'RM Name', 'Branch Manager', 'Stage', 'Subscription', 'Price', 'Actions'].map((h) => <th key={h} className="px-4 py-4 font-bold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{state.properties.map((property) => <tr key={property.property_id} className="transition hover:bg-slate-50/70"><td className="px-4 py-4"><p className="font-black">{property.title}</p><p className="font-mono text-xs text-slate-500">{property.property_id}</p></td><td className="px-4 py-4"><p className="font-bold">{property.host_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.owner_id}</p></td><td className="px-4 py-4 capitalize">{String(property.property_type || property.bhk_type || '-').replace(/_/g, ' ')}</td><td className="px-4 py-4 capitalize">{property.category}</td><td className="px-4 py-4">{property.city}</td><td className="px-4 py-4"><p className="font-bold">{property.broker_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.broker_code || property.assigned_broker || '-'}</p></td><td className="px-4 py-4"><p className="font-bold">{property.rm_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.rm_code || property.assigned_rm || '-'}</p></td><td className="px-4 py-4"><p className="font-bold">{property.branch_manager_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.branch_manager_code || property.assigned_branch_manager || '-'}</p></td><td className="px-4 py-4"><StatusBadge value={property.status} /></td><td className="px-4 py-4">{property.subscription_status || '-'}</td><td className="px-4 py-4">{formatMoney(property.price_per_night || 0)}</td><td className="px-4 py-4"><PropertyActions property={property} tab={tab} onReview={openProperty} onAssign={assignTeam} onStatus={changeStatus} onDelete={deleteRejectedProperty} onEdit={editProperty} /></td></tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">{state.properties.map((property) => <Panel key={property.property_id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{property.title}</p><p className="text-xs text-slate-500">{property.property_id}</p></div><StatusBadge value={property.status} /></div><p className="mt-2 text-sm">{property.city} / {property.category}</p><div className="mt-3 grid gap-1 text-xs text-slate-500"><p><b>Broker:</b> {property.broker_name || '-'} / {property.broker_code || '-'}</p><p><b>RM:</b> {property.rm_name || '-'} / {property.rm_code || '-'}</p><p><b>BM:</b> {property.branch_manager_name || '-'} / {property.branch_manager_code || '-'}</p></div><div className="mt-3"><PropertyActions property={property} tab={tab} onReview={openProperty} onAssign={assignTeam} onStatus={changeStatus} onDelete={deleteRejectedProperty} onEdit={editProperty} /></div></Panel>)}</div>
        </Panel>
        </div>
      )}
      {selected.property && (
        <Modal title="Property Verification Review" onClose={() => setSelected({ loading: false, property: null, error: '' })}>
          <PropertyReviewPanel selected={selected} onClose={() => setSelected({ loading: false, property: null, error: '' })} onChecklist={updateChecklist} onStage={updateStage} onFinal={finalStatus} onEdit={editProperty} />
        </Modal>
      )}
    </div>
  );
};

const PropertyActions = ({ property, tab, onReview, onAssign, onStatus, onDelete, onEdit }) => {
  const isRejected = tab === 'rejected' || String(property.status || '').toLowerCase() === 'rejected';
  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => onReview(property)} className="rounded-xl bg-[#2f6df6] px-2.5 py-1.5 text-xs font-bold text-white">Review</button>
      <button onClick={() => onEdit(property)} className="rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600">Edit</button>
      <button onClick={() => onAssign(property)} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Assign</button>
      <button onClick={() => onStatus(property, 'live')} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Live</button>
      <button onClick={() => onStatus(property, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
      {isRejected && (
        <button onClick={() => onDelete(property)} className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      )}
    </div>
  );
};

const ReadinessPill = ({ label, ready }) => (
  <span className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${ready ? 'border-[#cfe0ff] bg-[#eef5ff] text-[#2f6df6]' : 'border-[#d9e5fb] bg-[#f4f8ff] text-[#5b7ecb]'}`}>
    {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{label}
  </span>
);

const cleanLabel = (value) => String(value || '-').replace(/_/g, ' ');
const boolLabel = (value) => (value ? 'Yes' : 'No');

const DetailTile = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
    <span className="mt-2 block break-words text-sm font-black capitalize text-slate-950">{value || '-'}</span>
  </div>
);

const SectionCard = ({ eyebrow, title, children }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-100 bg-white px-4 py-3">
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6df6]">{eyebrow}</p>}
      <h3 className="mt-1 text-base font-black text-slate-950">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </Panel>
);

const KeyValueGrid = ({ rows, columns = 'md:grid-cols-2' }) => (
  <div className={`grid gap-3 ${columns}`}>
    {rows.map(([label, value]) => <DetailTile key={label} label={label} value={value} />)}
  </div>
);

const ChipList = ({ items, empty = 'No records added.' }) => {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <span key={String(item)} className="rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-black capitalize text-[#2f6df6]">
          {cleanLabel(item)}
        </span>
      ))}
    </div>
  );
};

const MediaLinks = ({ property }) => {
  const links = [
    ['Video', property.video_url],
    ['YouTube Short', property.youtube_short_url],
    ['YouTube Long', property.youtube_long_url],
    ['Virtual Tour', property.virtual_tour_link],
    ['Google Maps', property.google_maps_url],
  ].filter(([, url]) => url);
  if (!links.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map(([label, url]) => (
        <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-3 py-2 text-xs font-black text-[#2f6df6] hover:bg-[#dfeaff]">
          <ExternalLink className="h-3.5 w-3.5" /> {label}
        </a>
      ))}
    </div>
  );
};

const PackageList = ({ packages }) => {
  const items = Array.isArray(packages) ? packages.filter(Boolean) : [];
  if (!items.length) return <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No food packages added.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.name || 'package'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-black text-slate-950">{item.name || item.title || `Package ${index + 1}`}</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{formatMoney(item.price || item.amount || 0)}</p>
          {(item.items || item.description) && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{Array.isArray(item.items) ? item.items.join(', ') : item.description}</p>}
        </div>
      ))}
    </div>
  );
};

const PropertyReviewPanel = ({ selected, onClose, onChecklist, onStage, onFinal, onEdit }) => {
  if (!selected.property) return null;
  const property = selected.property;
  const review = property.operations_review || {};
  const images = property.images || [];
  const stages = review.stages || {};
  const brokerStages = Object.entries(stages).filter(([stage]) => stage.includes('broker'));
  const rmStages = Object.entries(stages).filter(([stage]) => stage.includes('rm'));
  const branchManagerStages = Object.entries(stages).filter(([stage]) => stage.includes('branch_manager'));
  const otherStages = Object.entries(stages).filter(([stage]) => !stage.includes('broker') && !stage.includes('rm') && !stage.includes('branch_manager'));
  const heroImage = images[0];
  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6df6]">Property Review</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{property.title}</h2>
            <p className="mt-1 font-mono text-xs font-bold text-slate-500">{property.property_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={property.status} />
            <button onClick={() => onEdit(property)} className="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600">Edit Details</button>
            <button onClick={onClose} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Close</button>
          </div>
        </div>
      </div>
      {selected.loading ? <LoadingState /> : selected.error ? <ErrorState message={selected.error} /> : (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel className="overflow-hidden">
              {heroImage ? (
                <a href={heroImage} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={heroImage} alt={property.title || 'Property'} className="h-full w-full object-cover" />
                </a>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[#eef5ff] text-[#2f6df6]">
                  <Image className="h-8 w-8" />
                </div>
              )}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <ReadinessPill label="Checklist" ready={review.summary?.checklist_approved} />
                  <ReadinessPill label="Host KYC" ready={review.summary?.host_kyc_status === 'approved'} />
                  <ReadinessPill label="Live Ready" ready={review.summary?.ready_for_live} />
                </div>
                <MediaLinks property={property} />
              </div>
            </Panel>
            <Panel className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6df6]">Operational Snapshot</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Property, Team & Subscription</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{images.length} photos</span>
              </div>
              <KeyValueGrid columns="md:grid-cols-3" rows={[
                ['Host', property.host?.full_name || property.owner_id],
                ['City', property.city],
                ['Category', cleanLabel(property.category)],
                ['Property Type', cleanLabel(property.property_type)],
                ['BHK Configuration', cleanLabel(property.bhk_type)],
                ['Max Guests', property.max_guests],
                ['Base Price', formatMoney(property.price_per_night || 0)],
                ['Broker', `${property.broker_name || '-'} / ${property.broker_code || property.assigned_broker || '-'}`],
                ['RM', `${property.rm_name || '-'} / ${property.rm_code || property.assigned_rm || '-'}`],
                ['Branch Manager', `${property.branch_manager_name || '-'} / ${property.branch_manager_code || property.assigned_branch_manager || '-'}`],
                ['Subscription', property.subscription_status || '-'],
                ['Verification Status', cleanLabel(property.status)],
                ['Area', property.area_sqft ? `${property.area_sqft} sq ft` : '-'],
              ]} />
            </Panel>
          </div>
          {!!images.length && (
            <SectionCard eyebrow="Photo Library" title="Uploaded Property Images">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
                {images.slice(0, 12).map((src, index) => (
                  <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer" className="group aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </a>
                ))}
              </div>
            </SectionCard>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard eyebrow="Listing Content" title="About This Property">
              <p className="text-sm font-semibold leading-6 text-slate-700">{property.description || 'No description added.'}</p>
              <div className="mt-4">
                <KeyValueGrid rows={[
                  ['Address', property.address],
                  ['City / State', [property.city, property.state].filter(Boolean).join(', ')],
                  ['PIN Code', property.pin_code],
                  ['Area', property.area_sqft ? `${property.area_sqft} sq ft` : '-'],
                  ['Nearby Places', (property.nearby_places || []).join(', ') || '-'],
                ]} />
              </div>
            </SectionCard>
            <SectionCard eyebrow="Pricing & Rules" title="Commercial Details">
              <KeyValueGrid rows={[
                ['Base Price', formatMoney(property.price_per_night || 0)],
                ['Pricing Cycle', cleanLabel(property.pricing_cycle)],
                ['Display Mode', cleanLabel(property.pricing_display_mode)],
                ['Weekly Price', property.price_per_week ? formatMoney(property.price_per_week) : '-'],
                ['Monthly Price', property.price_per_month ? formatMoney(property.price_per_month) : '-'],
                ['Per Person Price', property.per_person_price ? formatMoney(property.per_person_price) : '-'],
                ['Extra Guest Price', property.extra_guest_price ? formatMoney(property.extra_guest_price) : '-'],
                ['Minimum Stay', `${property.minimum_stay_days || 1} day(s)`],
              ]} />
            </SectionCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard eyebrow="Amenities" title="Facilities & Features">
              <ChipList items={property.amenities} empty="No amenities selected." />
            </SectionCard>
            <SectionCard eyebrow="Food & Services" title="Food, Cook & Travel">
              <KeyValueGrid rows={[
                ['Cook Available', boolLabel(property.has_cook)],
                ['Cook Price', property.cook_price ? formatMoney(property.cook_price) : '-'],
                ['Self Cooking Allowed', boolLabel(property.has_self_cook)],
                ['Taxi Service', boolLabel(property.has_taxi)],
                ['Veg Price', property.veg_price ? formatMoney(property.veg_price) : '-'],
                ['Non-Veg Price', property.non_veg_price ? formatMoney(property.non_veg_price) : '-'],
                ['Guest Size', property.guest_size || '-'],
              ]} />
              <div className="mt-4">
                <PackageList packages={property.packages} />
              </div>
            </SectionCard>
          </div>
          <SectionCard eyebrow="Stay Policy" title="House Rules & Booking Controls">
            <KeyValueGrid columns="md:grid-cols-3" rows={[
              ['Check-in Time', property.check_in_time || '-'],
              ['Check-out Time', property.check_out_time || '-'],
              ['Pet Friendly', boolLabel(property.pet_friendly)],
              ['Smoking Allowed', boolLabel(property.smoking_allowed)],
              ['Instant Booking', boolLabel(property.instant_booking)],
              ['Blocked Dates', (property.blocked_dates || []).length],
            ]} />
            {property.house_rules && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">House Rules</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{property.house_rules}</p>
              </div>
            )}
          </SectionCard>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Readiness Checklist</p>
            {(review.checklist || []).map((item) => (
              <div key={item.item_key} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black">{item.label}</p><p className="text-xs text-slate-500">{item.details}</p></div><StatusBadge value={item.status} /></div>
                {item.remarks && <p className="mt-2 text-xs font-semibold text-slate-600">{item.remarks}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onChecklist(item, 'approved')} className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={() => onChecklist(item, 'rejected')} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel className="p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Broker Checklist</p>
              <div className="space-y-2">{brokerStages.length ? brokerStages.map(([stage, data]) => <StageRow key={stage} stage={stage} data={data} onStage={onStage} />) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No broker checklist found.</p>}</div>
            </Panel>
            <Panel className="p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">RM Checklist</p>
              <div className="space-y-2">{rmStages.length ? rmStages.map(([stage, data]) => <StageRow key={stage} stage={stage} data={data} onStage={onStage} />) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No RM checklist found.</p>}</div>
            </Panel>
            <Panel className="p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Branch Manager Review</p>
              <div className="space-y-2">{branchManagerStages.length ? branchManagerStages.map(([stage, data]) => <StageRow key={stage} stage={stage} data={data} onStage={onStage} />) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No Branch Manager review found.</p>}</div>
            </Panel>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Other Workflow Stages</p>
            {otherStages.length ? otherStages.map(([stage, data]) => <StageRow key={stage} stage={stage} data={data} onStage={onStage} />) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No additional workflow stages.</p>}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button onClick={() => onFinal('under_review')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black">Move Under Review</button>
            <button onClick={() => onFinal('live')} disabled={!review.summary?.ready_for_live} className="rounded-xl bg-[#2f6df6] px-3 py-2 text-xs font-black text-white disabled:opacity-40">Publish Live</button>
            <button onClick={() => onFinal('rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">Reject</button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Review History</p>
            {(review.history || []).slice(0, 6).map((item) => <p key={item.event_id} className="rounded-2xl bg-slate-50 p-3 text-xs"><b>{String(item.action || '').replace(/_/g, ' ')}</b> {item.item_key || ''}<span className="block text-slate-500">{item.remarks || '-'} / {item.admin_id || '-'} / {item.created_at || '-'}</span></p>)}
            {!review.history?.length && <p className="text-xs text-slate-500">No review history yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const StageRow = ({ stage, data, onStage }) => (
  <div className="rounded-2xl border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-2"><p className="text-sm font-black capitalize">{stage.replace(/_/g, ' ')}</p><StatusBadge value={data?.status || 'pending'} /></div>
    {data?.remarks && <p className="mt-2 text-xs text-slate-500">{data.remarks}</p>}
    <div className="mt-3 flex gap-2">
      <button onClick={() => onStage(stage, 'approved')} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Approve</button>
      <button onClick={() => onStage(stage, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
    </div>
  </div>
);

export default PropertyOperations;
