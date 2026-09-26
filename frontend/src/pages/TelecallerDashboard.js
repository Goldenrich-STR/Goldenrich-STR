import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Video,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage, getImageUrl, uploadAPI, verificationAPI } from '../services/api';

const STAGES = [
  'HOST_REGISTERED',
  'TELECALLER_CALL_PENDING',
  'VERIFICATION_SCHEDULED',
  'TELECALLER_VERIFICATION_IN_PROGRESS',
  'BM_REVIEW_PENDING',
  'BM_APPROVED',
  'LIVE',
  'COMPLETED',
];

const CHECKLIST = [
  ['host_identity_confirmed', 'Host identity confirmed'],
  ['host_mobile_confirmed', 'Host mobile confirmed'],
  ['host_name_matches_kyc', 'Host name matches KYC'],
  ['property_visible_on_video', 'Property shown live'],
  ['property_entrance_verified', 'Entrance verified'],
  ['property_name_verified', 'Property name verified'],
  ['address_location_verified', 'Address/location confirmed'],
  ['bedrooms_verified', 'Rooms verified'],
  ['amenities_verified', 'Amenities verified'],
  ['document_name_checked', 'Document names checked'],
  ['bank_document_checked', 'Bank document checked'],
  ['video_completed', 'Video verification completed'],
];

const CALL_CHECKLISTS = {
  first_call: [
    ['identity_confirmed', 'Host identity confirmed'],
    ['property_confirmed', 'Property/property status discussed'],
    ['documents_explained', 'Pending/approved documents explained'],
    ['next_step_shared', 'Next step shared with host'],
  ],
  reschedule_call: [
    ['reason_confirmed', 'Reschedule reason confirmed'],
    ['new_slot_confirmed', 'New call slot confirmed'],
    ['host_availability_checked', 'Host availability checked'],
  ],
  follow_up_call: [
    ['previous_context_reviewed', 'Previous discussion reviewed'],
    ['pending_action_checked', 'Pending action status checked'],
    ['next_followup_confirmed', 'Next follow-up confirmed if needed'],
  ],
};

const NAV_GROUPS = [
  ['Dashboard', [['dashboard', 'Dashboard', LayoutDashboard]]],
  ['Lead Operations', [['leads', 'My Leads', UserPlus], ['registration', 'Add New Registration', Plus], ['tasks', 'Tasks & Follow-ups', ListChecks]]],
  ['Verification', [['documents', 'Document Verification', FileText], ['calls', 'Calls', Phone], ['video', 'Video Verification', Video]]],
  ['Communication', [['whatsapp', 'WhatsApp', MessageCircle], ['email', 'Email', Mail], ['templates', 'Templates', BookOpen]]],
  ['Productivity', [['reports', 'Reports', Activity], ['history', 'Activity History', Clock3]]],
  ['Settings', [['settings', 'Settings', Settings]]],
];

const TABS = [
  ['all', 'All Leads'],
  ['today', "Today's Calls"],
  ['followups', 'Follow-ups'],
  ['documents', 'Documents Pending'],
  ['video', 'Video Verification'],
  ['verified', 'Verification Completed'],
  ['bm', 'Sent to BM'],
  ['rework', 'Rework'],
  ['listing', 'Listing In Progress'],
  ['completed', 'Completed'],
  ['rejected', 'Rejected'],
];

const cx = (...parts) => parts.filter(Boolean).join(' ');
const human = (value) => String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const today = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const clampDateToToday = (value) => (value && value < today() ? today() : value);
const normalizeTime24 = (value) => String(value || '').slice(0, 5);

const hostName = (lead) => lead?.host?.full_name || lead?.host?.name || lead?.host?.email || 'Unnamed Host';
const leadPhone = (lead) => lead?.host?.phone || lead?.host?.mobile || lead?.host?.phone_number || '-';
const leadEmail = (lead) => lead?.host?.email || '-';
const userPhone = (user) => user?.phone || user?.mobile || user?.phone_number || user?.registered_phone || user?.contact_number || '-';
const propertyTitle = (lead) => lead?.property?.title || lead?.property?.property_name || 'No property yet';
const caseOf = (lead) => lead?.verification_case || lead;
const stageOf = (lead) => lead?.lead_stage || caseOf(lead)?.current_stage || 'HOST_REGISTERED';
const isVideoVerifiedLead = (lead) => {
  const c = caseOf(lead) || {};
  const checklist = c.telecaller_checklist || {};
  const stage = stageOf(lead);
  const checklistValues = [
    checklist.video_completed,
    checklist.video_verification_completed,
    checklist.video_call_completed,
    checklist.property_shown_on_video,
  ].map((value) => String(value ?? '').toLowerCase());
  return c.video_status === 'COMPLETED'
    || c.video_status === 'PASSED'
    || String(c.video_status || '').toLowerCase() === 'completed'
    || String(c.video_status || '').toLowerCase() === 'passed'
    || c.telecaller_result === 'VERIFIED'
    || String(c.telecaller_result || '').toLowerCase() === 'verified'
    || ['TELECALLER_VERIFIED', 'BM_REVIEW_PENDING', 'BM_APPROVED', 'ADMIN_REVIEW_PENDING', 'ADMIN_APPROVED', 'LIVE', 'COMPLETED'].includes(stage)
    || checklistValues.some((value) => ['yes', 'true', 'completed', 'verified', 'passed'].includes(value));
};
const isListedLead = (lead) => {
  const stage = stageOf(lead);
  const propertyStatus = String(lead?.property?.status || '').toLowerCase();
  const workflowStatus = String(lead?.property?.workflow_status || '').toLowerCase();
  const verificationStage = String(lead?.property?.verification_stage || '').toLowerCase();
  return ['LIVE', 'COMPLETED'].includes(stage)
    || ['live', 'listed', 'published', 'active'].includes(propertyStatus)
    || ['live', 'listed', 'published', 'completed'].includes(workflowStatus)
    || ['live', 'listed', 'published', 'completed'].includes(verificationStage);
};
const sourceRoleOf = (lead) => {
  const raw = String(
    lead?.source_owner?.owner_role
    || lead?.source_owner?.source
    || lead?.registration_source
    || ''
  ).toLowerCase();
  if (raw.includes('broker')) return 'Broker';
  if (raw === 'rm' || raw.includes('relationship_manager')) return 'RM';
  if (raw.includes('telecaller')) return 'Telecaller';
  if (raw.includes('host') || raw.includes('self')) return 'Host';
  return human(raw || 'source');
};
const hostIdOf = (lead) => lead?.host?.user_id || caseOf(lead)?.host_id || '';
const phoneHref = (lead) => {
  const phone = String(leadPhone(lead)).replace(/[^\d+]/g, '');
  return phone && phone !== '-' ? `tel:${phone}` : '';
};
const dialAdbCommand = (lead) => {
  const phone = String(leadPhone(lead)).replace(/[^\d+]/g, '');
  return phone && phone !== '-' ? `adb shell am start -a android.intent.action.DIAL -d tel:${phone}` : '';
};
const whatsappHref = (lead, message = '') => {
  const phone = String(leadPhone(lead)).replace(/[^\d]/g, '');
  if (!phone || phone === '-') return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message || `Hello ${hostName(lead)}, this is X-SPACE360 verification team.`)}`;
};
const emailHref = (lead, subject = 'X-SPACE360 verification update', body = '') => {
  const email = leadEmail(lead);
  return email && email !== '-' ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '';
};
const documentUrlOf = (doc) => {
  const rawUrl = doc?.document_url || doc?.url || '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return getImageUrl(rawUrl) || rawUrl;
};
const APPROVED_DOCUMENT_STATUSES = ['approved', 'verified'];
const documentStatusOf = (doc) => String(doc?.status || doc?.review_status || doc?.verification_status || 'pending').toLowerCase();
const documentsOf = (lead, docQueue = []) => {
  const hostId = hostIdOf(lead);
  const queueItem = docQueue.find((item) => hostIdOf(item) === hostId || item?.host?.user_id === hostId);
  return (
    queueItem?.documents ||
    lead?.documents ||
    lead?.host?.kyc_documents ||
    []
  );
};
const hasDocumentRecords = (lead, docQueue = []) => documentsOf(lead, docQueue).length > 0;
const hasPendingDocuments = (lead, docQueue = []) => {
  const documentList = documentsOf(lead, docQueue);
  if (documentList.length) {
    return documentList.some((doc) => !APPROVED_DOCUMENT_STATUSES.includes(documentStatusOf(doc)));
  }
  return !APPROVED_DOCUMENT_STATUSES.includes(String(lead?.kyc_status || lead?.host?.kyc_status || '').toLowerCase());
};
const documentsApproved = (lead, docQueue = []) => {
  const documentList = documentsOf(lead, docQueue);
  if (documentList.length) {
    return documentList.every((doc) => APPROVED_DOCUMENT_STATUSES.includes(documentStatusOf(doc)));
  }
  return APPROVED_DOCUMENT_STATUSES.includes(String(lead?.kyc_status || lead?.host?.kyc_status || '').toLowerCase());
};
const documentVerificationStatus = (lead, docQueue = []) => {
  if (documentsApproved(lead, docQueue)) return 'Approved';
  if (hasDocumentRecords(lead, docQueue)) return 'Pending Review';
  return human(lead?.kyc_status || lead?.host?.kyc_status || 'pending');
};

function progressFor(stage) {
  const index = Math.max(0, STAGES.indexOf(stage));
  return Math.round(((index + 1) / STAGES.length) * 100);
}

function nextAction(lead, docQueue = []) {
  const stage = stageOf(lead);
  if (hasPendingDocuments(lead, docQueue)) return 'Verify documents';
  if (stage === 'HOST_REGISTERED') return 'Start registration follow-up';
  if (stage === 'TELECALLER_CALL_PENDING') return 'Call host';
  if (stage === 'VERIFICATION_SCHEDULED') return 'Join video verification';
  if (stage === 'TELECALLER_VERIFICATION_IN_PROGRESS') return 'Complete checklist';
  if (stage === 'TELECALLER_REWORK_REQUIRED' || stage === 'BM_REWORK_REQUIRED') return 'Fix rework';
  if (stage === 'BM_REVIEW_PENDING') return 'Waiting for BM review';
  if (stage === 'BM_APPROVED' || stage === 'ADMIN_REVIEW_PENDING') return 'Prepare listing';
  if (stage === 'LIVE' || stage === 'COMPLETED') return 'Completed';
  return 'Open lead';
}

function templateMessage(template, lead, user) {
  const name = hostName(lead);
  const leadId = caseOf(lead)?.verification_id || lead?.lead_id || '';
  const telecaller = user?.full_name || user?.email || 'X-SPACE360 Telecaller';
  const property = propertyTitle(lead);
  const messages = {
    Welcome: `Hello ${name}, welcome to X-SPACE360. Your lead ${leadId} is assigned to ${telecaller}.`,
    'Document Request': `Hello ${name}, please upload the required documents for ${property} so we can continue verification.`,
    'Missing Document': `Hello ${name}, a required document is still pending for lead ${leadId}. Please share it today.`,
    'Call Reminder': `Hello ${name}, this is a reminder for your X-SPACE360 verification call.`,
    'Video Verification Reminder': `Hello ${name}, your X-SPACE360 video verification is scheduled. Please keep the property and documents ready.`,
    'Verification Completed': `Hello ${name}, your telecaller verification for ${property} is completed and moved to the next review step.`,
    'Listing Assistance': `Hello ${name}, we will help complete your property listing for ${property}.`,
  };
  return messages[template] || `Hello ${name}, regarding your X-SPACE360 lead ${leadId}.`;
}

function slaTone(state) {
  const normalized = String(state || 'on_track').toLowerCase();
  if (normalized.includes('over')) return 'bg-red-50 text-red-700 border-red-200';
  if (normalized.includes('soon')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized.includes('complete')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function StatCard({ label, value, note, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md',
        active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value ?? 0}</p>
        </div>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-slate-500">{note}</p>
    </button>
  );
}

function StatusChip({ children, className }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider', className || 'border-slate-200 bg-slate-50 text-slate-600')}>{children}</span>;
}

function EmptyState({ title, detail }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <AlertCircle className="h-8 w-8 text-slate-300" />
      <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{detail}</p>
    </div>
  );
}

const TelecallerDashboard = () => {
  const navigate = useNavigate();
  const { verificationId, documentVerificationId } = useParams();
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);
  const [cases, setCases] = useState([]);
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [remarks, setRemarks] = useState('');
  const [callForm, setCallForm] = useState({ outcome: 'CONNECTED', remarks: '', scheduled_date: '', scheduled_time: '' });
  const [scheduleForm, setScheduleForm] = useState({ scheduled_date: today(), scheduled_start_time: '14:00', scheduled_end_time: '14:30', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openMoreFor, setOpenMoreFor] = useState('');
  const [moreMenu, setMoreMenu] = useState({ left: 0, top: 0, lead: null });
  const [callModalLead, setCallModalLead] = useState(null);
  const [videoModalLead, setVideoModalLead] = useState(null);
  const [videoCallLead, setVideoCallLead] = useState(null);
  const [telecallerVideoUrl, setTelecallerVideoUrl] = useState('');
  const [uploadingVerificationVideo, setUploadingVerificationVideo] = useState(false);
  const [callFlowType, setCallFlowType] = useState('first_call');
  const [callChecklist, setCallChecklist] = useState({});
  const [callStatus, setCallStatus] = useState('idle');
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [scheduleVideoFromCall, setScheduleVideoFromCall] = useState(false);
  const [documentModalLead, setDocumentModalLead] = useState(null);
  const [documentReason, setDocumentReason] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [pendingDocumentAction, setPendingDocumentAction] = useState('');
  const [pendingDocumentBulk, setPendingDocumentBulk] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const callConnectTimerRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, leadsRes, casesRes, docsRes] = await Promise.all([
        verificationAPI.dashboardSummary(),
        verificationAPI.myLeads(),
        verificationAPI.listCases(),
        verificationAPI.listDocumentQueue(),
      ]);
      const nextLeads = leadsRes.data?.leads || [];
      const nextCases = casesRes.data?.cases || [];
      setSummary(summaryRes.data?.data || summaryRes.data || {});
      setLeads(nextLeads);
      setCases(nextCases);
      setDocs(docsRes.data?.items || []);
      const routeId = verificationId || documentVerificationId;
      const byRoute = routeId && nextCases.find((item) => item.verification_id === routeId);
      setSelected(byRoute || nextLeads[0] || nextCases[0] || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load telecalling workspace.'));
    } finally {
      setLoading(false);
    }
  }, [documentVerificationId, verificationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = caseOf(selected)?.verification_id;
    setChecklist(caseOf(selected)?.telecaller_checklist || {});
    setRemarks(caseOf(selected)?.telecaller_remarks || '');
    if (!id) {
      setActivity([]);
      return;
    }
    verificationAPI.getCaseActivity(id)
      .then((res) => setActivity(res.data?.activity || []))
      .catch(() => setActivity([]));
  }, [selected]);

  useEffect(() => {
    if (callStatus !== 'connected' || !callStartedAt) return undefined;
    const timer = window.setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callStartedAt, callStatus]);

  const rows = useMemo(() => {
    const leadRows = leads.map((item) => ({
      ...item,
      lead_id: item.lead_id || caseOf(item)?.verification_id || item.host?.user_id,
      registration_source: item.registration_source || item.property?.registration_source || item.host?.registration_source || 'TELECALLER',
      lg_code: item.lg_code || item.property?.lg_code || item.host?.lg_code || item.host?.employee_code || item.host?.uid,
      source_owner: item.source_owner || item.host?.source_owner || item.property?.source_owner || {},
      source_owner_name: item.source_owner_name || item.source_owner?.owner_name || item.host?.source_owner_name || '',
      source_owner_code: item.source_owner_code || item.source_owner?.owner_code || item.host?.source_owner_code || '',
      lead_stage: item.lead_stage || caseOf(item)?.current_stage || (item.property?.property_id ? 'PROPERTY_LISTED' : 'HOST_REGISTERED'),
      kyc_status: item.kyc_status || item.host?.kyc_status || 'pending',
    }));
    const caseRows = cases.map((item) => ({
      lead_id: item.verification_id,
      host: item.host,
      property: item.property,
      verification_case: item,
      registration_source: item.registration_source,
      lg_code: item.lg_code,
      source_owner: item.source_owner || {},
      source_owner_name: item.source_owner_name || item.source_owner?.owner_name || '',
      source_owner_code: item.source_owner_code || item.source_owner?.owner_code || item.lg_code || '',
      lead_stage: item.current_stage,
      kyc_status: item.host?.kyc_status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
    const seen = new Set(caseRows.map((item) => item.lead_id));
    const merged = [...caseRows, ...leadRows.filter((item) => !seen.has(caseOf(item)?.verification_id || item.lead_id))];
    const baseRows = ['leads', 'tasks'].includes(activeNav) ? leadRows : merged;
    return baseRows.filter((lead) => {
      const stage = stageOf(lead);
      const text = [hostName(lead), leadPhone(lead), leadEmail(lead), propertyTitle(lead), lead.lead_id, lead.lg_code, lead.source_owner_name, lead.source_owner_code, stage].join(' ').toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (activeTab === 'calls') {
        const kycStatus = String(lead.kyc_status || '').toLowerCase();
        return ['approved', 'verified'].includes(kycStatus) || documentsApproved(lead, docs) || nextAction(lead, docs).toLowerCase().includes('call');
      }
      if (activeTab === 'today') return caseOf(lead)?.scheduled_call_date === today() || caseOf(lead)?.scheduled_date === today();
      if (activeTab === 'followups') return Boolean(caseOf(lead)?.next_follow_up || caseOf(lead)?.scheduled_call_date);
      if (activeTab === 'documents') return hasPendingDocuments(lead, docs);
      if (activeTab === 'docs_verified') return documentsApproved(lead, docs);
      if (activeTab === 'video') return ['VERIFICATION_SCHEDULED', 'TELECALLER_VERIFICATION_IN_PROGRESS'].includes(stage);
      if (activeTab === 'video_verified') return isVideoVerifiedLead(lead);
      if (activeTab === 'verified') return isVideoVerifiedLead(lead);
      if (activeTab === 'bm') return stage === 'BM_REVIEW_PENDING';
      if (activeTab === 'rework') return stage.includes('REWORK') || stage.includes('FAILED');
      if (activeTab === 'listing') return ['BM_APPROVED', 'ADMIN_REVIEW_PENDING', 'PUBLISHING'].includes(stage);
      if (activeTab === 'completed') return isListedLead(lead);
      if (activeTab === 'rejected') return stage.includes('REJECTED');
      return true;
    });
  }, [activeNav, activeTab, cases, docs, leads, search]);

  const selectedCase = caseOf(selected);
  const selectedCaseId = selectedCase?.verification_id;
  const checklistDone = CHECKLIST.filter(([key]) => ['yes', 'true', true].includes(checklist[key])).length;
  const canSubmitBm = selectedCaseId && checklistDone === CHECKLIST.length;
  const activeCallChecklist = CALL_CHECKLISTS[callFlowType] || CALL_CHECKLISTS.first_call;
  const callChecklistDone = activeCallChecklist.filter(([key]) => callChecklist[key]).length;
  const callDuration = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`;

  const allLeadRows = useMemo(() => {
    const leadRows = leads.map((item) => ({
      ...item,
      lead_id: item.lead_id || caseOf(item)?.verification_id || item.host?.user_id,
      registration_source: item.registration_source || item.property?.registration_source || item.host?.registration_source || 'TELECALLER',
      lg_code: item.lg_code || item.property?.lg_code || item.host?.lg_code || item.host?.employee_code || item.host?.uid,
      source_owner: item.source_owner || item.host?.source_owner || item.property?.source_owner || {},
      source_owner_name: item.source_owner_name || item.source_owner?.owner_name || item.host?.source_owner_name || '',
      source_owner_code: item.source_owner_code || item.source_owner?.owner_code || item.host?.source_owner_code || '',
      lead_stage: item.lead_stage || caseOf(item)?.current_stage || (item.property?.property_id ? 'PROPERTY_LISTED' : 'HOST_REGISTERED'),
      kyc_status: item.kyc_status || item.host?.kyc_status || 'pending',
    }));
    const caseRows = cases.map((item) => ({
      lead_id: item.verification_id,
      host: item.host,
      property: item.property,
      verification_case: item,
      registration_source: item.registration_source,
      lg_code: item.lg_code,
      source_owner: item.source_owner || {},
      source_owner_name: item.source_owner_name || item.source_owner?.owner_name || '',
      source_owner_code: item.source_owner_code || item.source_owner?.owner_code || item.lg_code || '',
      lead_stage: item.current_stage,
      kyc_status: item.host?.kyc_status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
    const seen = new Set(leadRows.map((item) => caseOf(item)?.verification_id || item.lead_id));
    return [...leadRows, ...caseRows.filter((item) => !seen.has(item.lead_id))];
  }, [cases, leads]);
  const dynamicTasks = useMemo(() => {
    const generated = [];
    allLeadRows.forEach((lead) => {
      const c = caseOf(lead) || {};
      const stage = stageOf(lead);
      if (c.scheduled_date === today() || c.scheduled_call_date === today()) {
        generated.push({
          task_id: `${lead.lead_id}-scheduled`,
          task: stage === 'VERIFICATION_SCHEDULED' ? 'Video verification' : 'Call host',
          property: propertyTitle(lead),
          host: hostName(lead),
          due_time: c.scheduled_start_time || c.scheduled_call_time || 'Today',
          priority: 'High',
        });
      }
      if (stage.includes('REWORK') || stage.includes('FAILED')) {
        generated.push({
          task_id: `${lead.lead_id}-rework`,
          task: 'Follow up rework',
          property: propertyTitle(lead),
          host: hostName(lead),
          due_time: 'Today',
          priority: 'Medium',
        });
      }
      if (hasPendingDocuments(lead, docs)) {
        generated.push({
          task_id: `${lead.lead_id}-documents`,
          task: 'Review host documents',
          property: propertyTitle(lead),
          host: hostName(lead),
          due_time: 'Today',
          priority: 'High',
        });
      }
    });
    return generated.filter((task, index, list) => index === list.findIndex((item) => item.task_id === task.task_id));
  }, [allLeadRows, docs]);
  const dynamicActivity = useMemo(() => {
    const historyEvents = allLeadRows.flatMap((lead) => {
      const c = caseOf(lead) || {};
      return (c.history || []).map((item) => ({
        activity_type: item.action || 'Workflow updated',
        property: propertyTitle(lead),
        host: hostName(lead),
        timestamp: item.timestamp || c.updated_at || lead.updated_at || '',
      }));
    });
    const documentEvents = allLeadRows
      .filter((lead) => hasPendingDocuments(lead, docs))
      .map((lead) => ({
        activity_type: 'Host documents assigned',
        property: propertyTitle(lead),
        host: hostName(lead),
        timestamp: lead.updated_at || lead.created_at || '',
      }));
    return [...historyEvents, ...documentEvents]
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
      .slice(0, 12);
  }, [allLeadRows, docs]);
  const dashboardMetrics = useMemo(() => {
    const pendingDocs = allLeadRows.filter((lead) => hasPendingDocuments(lead, docs));
    const docsVerified = allLeadRows.filter((lead) => documentsApproved(lead, docs));
    return {
      assigned: allLeadRows.length,
      contacted: allLeadRows.filter((lead) => Boolean(caseOf(lead)?.last_call_outcome)).length,
      docsVerified: docsVerified.length,
      videoVerified: allLeadRows.filter(isVideoVerifiedLead).length,
      sentToBm: allLeadRows.filter((lead) => stageOf(lead) === 'BM_REVIEW_PENDING').length,
      listed: allLeadRows.filter(isListedLead).length,
      callsToday: allLeadRows.filter((lead) => caseOf(lead)?.scheduled_call_date === today()).length,
      videosToday: allLeadRows.filter((lead) => caseOf(lead)?.scheduled_date === today()).length,
      followups: dynamicTasks.length,
      overdue: allLeadRows.filter((lead) => String(caseOf(lead)?.sla?.state || '').includes('over')).length,
      pendingDocs: pendingDocs.length || docs.filter((item) => !['approved', 'verified'].includes(String(item.kyc_status || '').toLowerCase())).length,
      rework: allLeadRows.filter((lead) => {
        const stage = stageOf(lead);
        return stage.includes('REWORK') || stage.includes('FAILED');
      }).length,
    };
  }, [allLeadRows, docs, dynamicTasks.length]);
  const isDashboardView = activeNav === 'dashboard';
  const isWorkspaceView = !['dashboard', 'settings', 'reports'].includes(activeNav);
  const showSideWorkspace = isWorkspaceView && !['leads', 'tasks', 'documents', 'calls', 'video'].includes(activeNav);
  const compactTable = showSideWorkspace;
  const tableTitle = {
    leads: 'My Leads Command Center',
    tasks: 'Tasks & Follow-ups',
    documents: 'Document Verification Queue',
    calls: 'Call Operations',
    video: 'Video Verification Queue',
    property: 'Property Listings',
    listing: 'Listings In Progress',
    whatsapp: 'WhatsApp Communication',
    email: 'Email Communication',
    templates: 'Communication Templates',
    calendar: "Today's Calendar",
    history: 'Activity History',
  }[activeNav] || 'My Leads Command Center';
  const stats = [
    ['Assigned Leads', dashboardMetrics.assigned, 'All assigned records', UserPlus, 'leads', 'all'],
    ['Contacted Leads', dashboardMetrics.contacted, 'Call outcome captured', Phone, 'calls', 'calls'],
    ['Documents Verified', dashboardMetrics.docsVerified, 'KYC approved hosts', FileCheck2, 'documents', 'docs_verified'],
    ['Video Verified', dashboardMetrics.videoVerified, 'Video checklist done', Video, 'leads', 'verified'],
    ['Sent to BM', dashboardMetrics.sentToBm, 'Awaiting BM review', ShieldCheck, 'leads', 'bm'],
    ['Properties Listed', dashboardMetrics.listed, 'Live or completed listings', CheckCircle2, 'leads', 'completed'],
  ];
  const ops = [
    ['Calls Today', dashboardMetrics.callsToday, 'Scheduled call load', Phone, 'calls', 'today'],
    ['Video Calls Today', dashboardMetrics.videosToday, 'Video appointments', Video, 'video', 'today'],
    ['Follow-ups Due', dashboardMetrics.followups, 'Open workflow tasks', Clock3, 'tasks', 'all'],
    ['Overdue Tasks', dashboardMetrics.overdue, 'SLA breach watch', AlertCircle, 'tasks', 'followups'],
    ['Pending Documents', dashboardMetrics.pendingDocs, 'Needs document action', FileText, 'documents', 'documents'],
    ['Rework Cases', dashboardMetrics.rework, 'Returned by workflow', RefreshCw, 'leads', 'rework'],
  ];

  const openDashboardBucket = (nav, tab) => {
    setActiveNav(nav || 'leads');
    setActiveTab(tab || 'all');
  };

  const startNewRegistration = () => {
    const context = {
      telecaller_id: user?.user_id || user?.uid || '',
      telecaller_name: user?.full_name || user?.name || user?.email || '',
      lg_code: user?.lg_code || user?.employee_code || user?.uid || user?.user_id || '',
    };
    sessionStorage.setItem('xspace360_telecaller_registration_context', JSON.stringify(context));
    navigate('/register?role=host&source=telecaller');
  };

  const handleNav = (id) => {
    setActiveNav(id);
    const tabMap = {
      dashboard: 'all',
      leads: 'all',
      registration: 'all',
      tasks: 'followups',
      documents: 'documents',
      calls: 'calls',
      video: 'video',
      property: 'completed',
      listing: 'listing',
      whatsapp: 'all',
      email: 'all',
      templates: 'all',
      calendar: 'today',
      reports: 'all',
      history: 'all',
      settings: 'all',
    };
    if (id === 'registration') {
      startNewRegistration();
      return;
    }
    setActiveTab(tabMap[id] || 'all');
  };

  const openLead = async (lead) => {
    setSelected(lead);
    const id = caseOf(lead)?.verification_id;
    if (id) navigate(`/telecaller/verification/${id}`, { replace: true });
  };

  const openLeadWorkflow = (lead, section = 'calls') => {
    setSelected(lead);
    setActiveNav(section);
    const tabMap = { calls: 'calls', documents: 'documents', video: 'video', history: 'all' };
    setActiveTab(tabMap[section] || 'all');
    setOpenMoreFor('');
    const id = caseOf(lead)?.verification_id;
    if (id) navigate(`/telecaller/verification/${id}`, { replace: true });
  };

  const openVideoModal = (lead) => {
    const c = caseOf(lead);
    setSelected(lead);
    setVideoModalLead(lead);
    setScheduleForm({
      scheduled_date: clampDateToToday(c?.scheduled_date || today()),
      scheduled_start_time: normalizeTime24(c?.scheduled_start_time || '14:00'),
      scheduled_end_time: normalizeTime24(c?.scheduled_end_time || '14:30'),
      notes: c?.schedule_notes || '',
    });
    setOpenMoreFor('');
    setMoreMenu({ left: 0, top: 0, lead: null });
  };

  const openCallModal = (lead) => {
    setSelected(lead);
    setCallModalLead(lead);
    setCallForm({ outcome: 'CONNECTED', remarks: '', scheduled_date: '', scheduled_time: '' });
    setScheduleForm({ scheduled_date: today(), scheduled_start_time: '14:00', scheduled_end_time: '14:30', notes: '' });
    setCallFlowType('first_call');
    setCallChecklist({});
    setCallStatus('idle');
    setCallStartedAt(null);
    setCallSeconds(0);
    setRecordingState('idle');
    setRecordingUrl('');
    setScheduleVideoFromCall(false);
    const id = caseOf(lead)?.verification_id;
    if (id) navigate(`/telecaller/verification/${id}`, { replace: true });
  };

  const closeCallModal = () => {
    if (callConnectTimerRef.current) window.clearTimeout(callConnectTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    setCallModalLead(null);
    setCallStatus('idle');
    setCallStartedAt(null);
    setCallSeconds(0);
  };

  const markCallReceived = () => {
    setCallStatus('connected');
    setCallStartedAt(Date.now());
    setCallSeconds(0);
    startRecording();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice('Call recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        setRecordingUrl(URL.createObjectURL(blob));
        setRecordingState('saved');
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecordingState('recording');
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Microphone permission is required for recording.'));
      setRecordingState('idle');
    }
  };

  const startCallFlow = async () => {
    if (callStatus === 'ringing' || callStatus === 'connected') return;
    const phone = String(leadPhone(callModalLead)).replace(/[^\d+]/g, '');
    if (!phone || phone === '-') {
      setNotice('Host phone number not found.');
      return;
    }
    const callUrl = `tel:${phone}`;
    try {
      window.location.href = callUrl;
      setNotice('Phone Link/desktop calling app opened. If prompted, confirm the call there, then mark Host Received.');
      setCallStatus('ringing');
      setCallForm((current) => ({ ...current, outcome: 'CONNECTED' }));
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Unable to open desktop calling app. Check Phone Link calling setup.'));
    }
  };

  const startUsbCallFlow = async () => {
    if (callStatus === 'ringing' || callStatus === 'connected') return;
    const phone = String(leadPhone(callModalLead)).replace(/[^\d+]/g, '');
    if (!phone || phone === '-') {
      setNotice('Host phone number not found.');
      return;
    }
    try {
      await verificationAPI.startLocalAdbCall({ phone, action: 'CALL', auto_record: true, record_delay_seconds: 6 });
      setNotice('USB/ADB call command sent. Mark Host Received after the host answers.');
      setCallStatus('ringing');
      setCallForm((current) => ({ ...current, outcome: 'CONNECTED' }));
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Unable to start USB call. Check ADB device connection.'));
    }
  };

  const resetCallFlow = () => {
    if (callConnectTimerRef.current) window.clearTimeout(callConnectTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    setCallStatus('idle');
    setCallStartedAt(null);
    setCallSeconds(0);
    setRecordingState('idle');
    setRecordingUrl('');
  };

  const copyAdbDialCommand = async () => {
    const command = dialAdbCommand(callModalLead);
    if (!command) {
      setNotice('Host phone number not found for USB call command.');
      return;
    }
    try {
      await navigator.clipboard.writeText(command);
      setNotice('USB/ADB dial command copied.');
    } catch (err) {
      setNotice(command);
    }
  };

  const toggleMoreMenu = (event, lead) => {
    const key = caseOf(lead)?.verification_id || lead.lead_id;
    if (openMoreFor === key) {
      setOpenMoreFor('');
      setMoreMenu({ left: 0, top: 0, lead: null });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenMoreFor(key);
    setMoreMenu({
      left: Math.max(12, rect.right - 176),
      top: rect.bottom + 8,
      lead,
    });
  };

  const runAction = async (action) => {
    if (!selectedCaseId) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      if (action === 'call') {
        if (['CALLBACK_REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'NO_ANSWER', 'BUSY'].includes(callForm.outcome) && (!callForm.scheduled_date || !callForm.scheduled_time)) {
          throw new Error('Schedule date and time are required for callback, retry or reschedule.');
        }
        if (['HOST_NOT_INTERESTED', 'WRONG_NUMBER'].includes(callForm.outcome) && !callForm.remarks.trim()) {
          throw new Error('Reason is required for this call disposition.');
        }
        await verificationAPI.saveCallOutcome(selectedCaseId, callForm);
      }
      if (action === 'schedule') {
        if (!scheduleForm.scheduled_date || !scheduleForm.scheduled_start_time) {
          throw new Error('Video verification date and start time are required.');
        }
        if (scheduleForm.scheduled_date < today()) {
          throw new Error('Past dates cannot be selected for video verification.');
        }
        await verificationAPI.scheduleCase({ verification_id: selectedCaseId, ...scheduleForm });
      }
      if (action === 'checklist') await verificationAPI.saveTelecallerChecklist(selectedCaseId, { checklist, remarks, video_url: telecallerVideoUrl });
      if (action === 'start') await verificationAPI.startCase(selectedCaseId);
      if (action === 'bm') {
        if (!remarks.trim()) throw new Error('Telecaller remarks are required before sending to BM.');
        await verificationAPI.telecallerDecision(selectedCaseId, { result: 'VERIFIED', remarks: remarks || 'Telecaller verification completed.', video_url: telecallerVideoUrl });
      }
      setNotice('Saved successfully.');
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, err.message || 'Action failed.'));
    } finally {
      setSaving(false);
    }
  };

  const saveCallOutcome = async () => {
    const targetCaseId = caseOf(callModalLead)?.verification_id;
    if (!targetCaseId) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      if (['CALLBACK_REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'NO_ANSWER', 'BUSY'].includes(callForm.outcome) && (!callForm.scheduled_date || !callForm.scheduled_time)) {
        throw new Error('Schedule date and time are required for callback, retry or reschedule.');
      }
      if (['HOST_NOT_INTERESTED', 'WRONG_NUMBER'].includes(callForm.outcome) && !callForm.remarks.trim()) {
        throw new Error('Reason is required for this call disposition.');
      }
      const payload = {
        ...callForm,
        caller_number: userPhone(user),
        caller_user_id: user?.user_id || user?.uid || '',
        call_type: callFlowType,
        call_checklist: callChecklist,
        call_duration_seconds: callSeconds,
        recording_status: recordingState,
      };
      await verificationAPI.saveCallOutcome(targetCaseId, payload);
      if (scheduleVideoFromCall && scheduleForm.scheduled_date && scheduleForm.scheduled_start_time) {
        if (scheduleForm.scheduled_date < today()) {
          throw new Error('Past dates cannot be selected for video verification.');
        }
        await verificationAPI.scheduleCase({ verification_id: targetCaseId, ...scheduleForm });
      }
      setNotice('Call outcome saved successfully.');
      closeCallModal();
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, err.message || 'Call outcome failed.'));
    } finally {
      setSaving(false);
    }
  };

  const scheduleVideoCallFromModal = async () => {
    const targetCaseId = caseOf(callModalLead)?.verification_id;
    if (!targetCaseId) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    if (!scheduleForm.scheduled_date || !scheduleForm.scheduled_start_time) {
      setNotice('Video verification date and start time are required.');
      return;
    }
    if (scheduleForm.scheduled_date < today()) {
      setNotice('Past dates cannot be selected for video verification.');
      setScheduleForm((current) => ({ ...current, scheduled_date: today() }));
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      await verificationAPI.scheduleCase({ verification_id: targetCaseId, ...scheduleForm });
      setNotice('Video verification call scheduled successfully.');
      setActiveNav('video');
      setActiveTab('video');
      closeCallModal();
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, err.message || 'Video schedule failed.'));
    } finally {
      setSaving(false);
    }
  };

  const rescheduleVideoCallFromVideoModal = async () => {
    const targetCaseId = caseOf(videoModalLead)?.verification_id;
    if (!targetCaseId) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    if (!scheduleForm.scheduled_date || !scheduleForm.scheduled_start_time) {
      setNotice('Video verification date and start time are required.');
      return;
    }
    if (scheduleForm.scheduled_date < today()) {
      setNotice('Past dates cannot be selected for video verification.');
      setScheduleForm((current) => ({ ...current, scheduled_date: today() }));
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      await verificationAPI.scheduleCase({ verification_id: targetCaseId, ...scheduleForm });
      setNotice('Video verification call re-scheduled successfully.');
      setVideoModalLead(null);
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, err.message || 'Video re-schedule failed.'));
    } finally {
      setSaving(false);
    }
  };

  const openVideoCallInModal = async (lead) => {
    const c = caseOf(lead);
    if (!c?.verification_id) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    try {
      const response = await verificationAPI.getCase(c.verification_id);
      const freshCase = response.data || c;
      const enrichedLead = { ...lead, verification_case: freshCase };
      setSelected(enrichedLead);
      setVideoCallLead(enrichedLead);
      setChecklist(freshCase?.telecaller_checklist || checklist || {});
      setRemarks(freshCase?.telecaller_remarks || remarks || '');
      setTelecallerVideoUrl(freshCase?.telecaller_video_url || '');
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Unable to open video verification room.'));
    }
  };

  const uploadTelecallerVerificationVideo = async (file) => {
    if (!file) return;
    setUploadingVerificationVideo(true);
    setNotice('');
    try {
      const response = await uploadAPI.uploadVideo(file);
      setTelecallerVideoUrl(response.url);
      setNotice('Verification video uploaded successfully.');
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Video upload failed.'));
    } finally {
      setUploadingVerificationVideo(false);
    }
  };

  const completeVideoVerification = async () => {
    const c = caseOf(videoCallLead);
    if (!c?.verification_id) {
      setNotice('This lead does not have a verification case yet.');
      return;
    }
    const failedLabels = CHECKLIST
      .filter(([key]) => !['yes', 'true', true].includes(checklist[key]))
      .map(([, label]) => label);
    const shouldReject = failedLabels.length > 6;
    const decisionRemarks = shouldReject
      ? `${remarks || 'Video verification rejected.'}\n\nRejected checklist points:\n- ${failedLabels.join('\n- ')}`
      : (remarks || 'Telecaller video verification completed.');
    setSaving(true);
    setNotice('');
    try {
      await verificationAPI.saveTelecallerChecklist(c.verification_id, {
        checklist,
        remarks,
        video_url: telecallerVideoUrl,
      });
      await verificationAPI.telecallerDecision(c.verification_id, {
        result: shouldReject ? 'FAILED' : 'VERIFIED',
        remarks: decisionRemarks,
        issue_category: shouldReject ? 'VIDEO_CHECKLIST_FAILED' : '',
        required_action: shouldReject ? failedLabels.join(', ') : '',
        video_url: telecallerVideoUrl,
      });
      setNotice(shouldReject
        ? 'Video verification rejected and host notified.'
        : 'Video verification submitted to Branch Manager for review.');
      setVideoCallLead(null);
      setVideoModalLead(null);
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, err.message || 'Video verification submit failed.'));
    } finally {
      setSaving(false);
    }
  };

  const openDocumentModal = (lead) => {
    setSelected(lead);
    setDocumentModalLead(lead);
    setDocumentReason('');
    const firstDoc = documentsOf(lead, docs)[0];
    setSelectedDocumentType(firstDoc?.document_type || firstDoc?.type || '');
    setPendingDocumentAction('');
    setPendingDocumentBulk(false);
    setOpenMoreFor('');
    setMoreMenu({ left: 0, top: 0, lead: null });
  };

  const startDocumentAction = (documentType, action) => {
    setSelectedDocumentType(documentType);
    setPendingDocumentAction(action);
    setPendingDocumentBulk(false);
    setDocumentReason('');
  };

  const startBulkDocumentAction = (action) => {
    setPendingDocumentAction(action);
    setPendingDocumentBulk(true);
    setDocumentReason('');
  };

  const runDocumentAction = async (documentType = selectedDocumentType, result = pendingDocumentAction, leadOverride = null) => {
    const targetLead = leadOverride || documentModalLead || selected;
    const hostId = hostIdOf(targetLead);
    if (!hostId) {
      setNotice('Host profile not found for document action.');
      return;
    }
    const remarksText = String(documentReason || '').trim();
    if (!remarksText) {
      setNotice('Reason is required for approve, reject and re-upload.');
      return;
    }
    setSaving(true);
    try {
      await verificationAPI.reviewHostDocument(hostId, documentType, { result, remarks: remarksText });
      setNotice('Document decision saved.');
      setDocumentReason('');
      setPendingDocumentAction('');
      setPendingDocumentBulk(false);
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Document decision failed.'));
    } finally {
      setSaving(false);
    }
  };

  const runBulkDocumentAction = async (result) => {
    const targetLead = documentModalLead || selected;
    const hostId = hostIdOf(targetLead);
    const remarksText = String(documentReason || '').trim();
    if (!hostId) {
      setNotice('Host profile not found for document action.');
      return;
    }
    if (!remarksText) {
      setNotice('Reason is required for document approval/rejection.');
      return;
    }
    const actionableDocs = modalDocuments
      .map((doc) => doc.document_type || doc.type)
      .filter(Boolean);
    if (!actionableDocs.length) {
      setNotice('No documents found for this host.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        actionableDocs.map((documentType) =>
          verificationAPI.reviewHostDocument(hostId, documentType, { result, remarks: remarksText })
        )
      );
      if (result === 'approve') {
        await verificationAPI.submitHostDocumentVerification(hostId, { result: 'approve', remarks: remarksText });
      }
      if (result === 'reject') {
        await verificationAPI.submitHostDocumentVerification(hostId, { result: 'reject', remarks: remarksText });
      }
      setNotice(result === 'approve' ? 'Host approved successfully.' : 'Host documents rejected successfully.');
      setDocumentReason('');
      setPendingDocumentAction('');
      setPendingDocumentBulk(false);
      setDocumentModalLead(null);
      setSelectedDocumentType('');
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Document decision failed.'));
    } finally {
      setSaving(false);
    }
  };

  const submitDocuments = async () => {
    const hostId = hostIdOf(selected);
    if (!hostId) {
      setNotice('Host profile not found for document submission.');
      return;
    }
    setSaving(true);
    try {
      await verificationAPI.submitHostDocumentVerification(hostId, { result: 'approve', remarks: 'Documents verified by telecaller.' });
      setNotice('Host documents submitted successfully.');
      await loadData();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Document submission failed.'));
    } finally {
      setSaving(false);
    }
  };

  const modalDocuments = documentModalLead ? documentsOf(documentModalLead, docs) : [];
  const selectedModalDocument = modalDocuments.find((doc) => (doc.document_type || doc.type) === selectedDocumentType) || modalDocuments[0] || null;
  const selectedModalDocumentType = selectedModalDocument?.document_type || selectedModalDocument?.type || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-slate-800 bg-slate-950 text-white lg:block">
        <div className="border-b border-white/10 p-4">
          <p className="text-lg font-black tracking-wide">X-SPACE360</p>
          <p className="text-xs font-semibold text-slate-400">Telecaller Workspace</p>
        </div>
        <nav className="h-[calc(100vh-78px)] overflow-y-auto p-3">
          {NAV_GROUPS.map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{group}</p>
              {items.map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={cx('mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition', activeNav === id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="lg:pl-60">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-lg font-black">Telecalling Operations Dashboard</h1>
              <p className="text-xs font-semibold text-slate-500">Lead registration, verification, BM handoff and listing follow-through</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <div className="flex h-10 w-full min-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-[320px]">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none" placeholder="Search host, phone, lead, city..." />
              </div>
              <button type="button" onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-wider hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={startNewRegistration} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" /> New Registration
              </button>
              <button type="button" className="rounded-lg border border-slate-200 bg-white p-2"><Bell className="h-4 w-4" /></button>
              <button type="button" onClick={logout} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-red-700">Logout</button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {notice && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">{notice}</div>}

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-5">
              {isDashboardView && (
                <>
                  <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {stats.map(([label, value, note, Icon, nav, tab]) => <StatCard key={label} label={label} value={value} note={note} icon={Icon} active={activeNav === nav && activeTab === tab} onClick={() => openDashboardBucket(nav, tab)} />)}
                  </section>
                  <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {ops.map(([label, value, note, Icon, nav, tab]) => <StatCard key={label} label={label} value={value} note={note} icon={Icon} active={activeNav === nav && activeTab === tab} onClick={() => openDashboardBucket(nav, tab)} />)}
                  </section>
                </>
              )}

              {isWorkspaceView && (
              <section className={cx('grid gap-4 items-start', showSideWorkspace && 'xl:grid-cols-[minmax(0,1fr)_380px]')}>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <h2 className="text-base leading-tight font-black">{tableTitle}</h2>
                        <p className="text-xs font-semibold text-slate-500">{rows.length} records in current view</p>
                      </div>
                      {activeNav === 'leads' && <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
                        {TABS.map(([id, label]) => (
                          <button key={id} type="button" onClick={() => setActiveTab(id)} className={cx('shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black', activeTab === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                            {label}
                          </button>
                        ))}
                      </div>}
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <div className="p-4"><EmptyState title="No leads found" detail="Try another filter or refresh the workspace." /></div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-visible">
                      <table className={cx('w-full table-fixed text-left', compactTable ? 'min-w-[720px]' : 'min-w-[1180px]')}>
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className={cx('px-4 py-3', compactTable ? 'w-[250px]' : 'w-[220px]')}>Lead</th>
                            <th className={cx('px-4 py-3', compactTable ? 'w-[120px]' : 'w-[125px]')}>Phone</th>
                            <th className={cx('w-[210px] px-4 py-3', compactTable && 'hidden')}>Source</th>
                            <th className={cx('w-[110px] px-4 py-3', compactTable && 'hidden')}>Location</th>
                            <th className={cx('px-4 py-3', compactTable ? 'w-[140px]' : 'w-[170px]')}>Stage</th>
                            <th className={cx('w-[130px] px-4 py-3', compactTable && 'hidden')}>Verification</th>
                            <th className={cx('px-4 py-3', compactTable ? 'w-[150px]' : 'w-[150px]')}>Next</th>
                            <th className={cx('w-[100px] px-4 py-3', compactTable && 'hidden')}>SLA</th>
                            <th className={cx('px-4 py-3 text-right', compactTable ? 'w-[80px]' : 'w-[100px]')}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {rows.map((lead) => {
                            const c = caseOf(lead);
                            const selectedNow = (c?.verification_id || lead.lead_id) === (selectedCase?.verification_id || selected?.lead_id);
                            return (
                              <tr key={c?.verification_id || lead.lead_id} className={cx('h-[74px] align-middle hover:bg-blue-50/40', selectedNow && 'bg-blue-50')}>
                                <td className="px-4 py-3">
                                  <button type="button" onClick={() => openLead(lead)} className="block max-w-full text-left">
                                    <p className="truncate font-black text-slate-950">{hostName(lead)}</p>
                                    <p className="truncate text-[11px] font-semibold text-slate-500">{c?.verification_id || lead.lead_id}</p>
                                    <p className="truncate text-xs text-slate-400">{propertyTitle(lead)}</p>
                                    {compactTable && (
                                      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        {sourceRoleOf(lead)} / {lead.source_owner_name || 'Self registration'} / {lead.source_owner_code || lead.lg_code || 'No LG'}
                                      </p>
                                    )}
                                    {compactTable && <p className="text-[10px] font-bold text-slate-400">{lead.property?.city || lead.host?.city || '-'}</p>}
                                  </button>
                                </td>
                                <td className="px-4 py-3 font-semibold">{leadPhone(lead)}</td>
                                <td className={cx('px-4 py-3', compactTable && 'hidden')}>
                                  <div className="space-y-0.5">
                                    <StatusChip>{sourceRoleOf(lead)}</StatusChip>
                                    <div className="max-w-[170px]">
                                      <p className="truncate text-[11px] font-bold text-slate-700">{lead.source_owner_name || 'Self registration'}</p>
                                      <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{lead.source_owner_code || lead.lg_code || 'No LG code'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className={cx('px-4 py-3 text-slate-600', compactTable && 'hidden')}>{lead.property?.city || lead.host?.city || '-'}</td>
                                <td className="px-4 py-3"><StatusChip className="border-slate-200 bg-slate-50 text-slate-700">{human(stageOf(lead))}</StatusChip></td>
                                <td className={cx('px-4 py-3 text-slate-600', compactTable && 'hidden')}>{documentVerificationStatus(lead, docs)}</td>
                                <td className="px-4 py-3 font-black text-blue-700"><span className="line-clamp-2">{nextAction(lead, docs)}</span></td>
                                <td className={cx('px-4 py-3', compactTable && 'hidden')}><StatusChip className={slaTone(c?.sla?.state)}>{human(c?.sla?.state || 'on_track')}</StatusChip></td>
                                <td className="px-4 py-3">
                                  <div className="relative flex items-center justify-end gap-1.5">
                                    {activeNav === 'video' && (
                                      <button type="button" title="Open video verification" onClick={() => openVideoModal(lead)} className="rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"><Video className="h-4 w-4" /></button>
                                    )}
                                    {activeNav === 'calls' && (
                                      <button type="button" title="Call host" onClick={() => openCallModal(lead)} className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50"><Phone className="h-4 w-4" /></button>
                                    )}
                                    {!['calls', 'video'].includes(activeNav) && (
                                      <>
                                        {!compactTable && <a title="WhatsApp host" href={whatsappHref(lead) || undefined} target="_blank" rel="noreferrer" onClick={() => setSelected(lead)} className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50"><MessageCircle className="h-4 w-4" /></a>}
                                        <button
                                          type="button"
                                          title="More actions"
                                          onClick={(event) => toggleMoreMenu(event, lead)}
                                          className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {showSideWorkspace && <Lead360
                  selected={selected}
                  activity={activity}
                  checklist={checklist}
                  setChecklist={setChecklist}
                  checklistDone={checklistDone}
                  remarks={remarks}
                  setRemarks={setRemarks}
                  callForm={callForm}
                  setCallForm={setCallForm}
                  scheduleForm={scheduleForm}
                  setScheduleForm={setScheduleForm}
                  saving={saving}
                  runAction={runAction}
                  runDocumentAction={runDocumentAction}
                  submitDocuments={submitDocuments}
                  canSubmitBm={canSubmitBm}
                  user={user}
                  activeNav={activeNav}
                />}
              </section>
              )}

              {isDashboardView && (
              <section className="grid gap-5 xl:grid-cols-2">
                <Panel title="Today's Schedule" subtitle="Calls, videos and follow-ups">
                  {dynamicTasks.length ? dynamicTasks.map((task) => (
                    <div key={task.task_id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                      <div>
                        <p className="text-sm font-black">{task.task}</p>
                        <p className="text-xs font-semibold text-slate-500">{task.host} / {task.property}</p>
                      </div>
                      <StatusChip className={task.priority === 'High' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{task.due_time}</StatusChip>
                    </div>
                  )) : <EmptyState title="No tasks due" detail="The schedule will populate from calls, videos and workflow follow-ups." />}
                </Panel>
                <Panel title="Recent Activity" subtitle="Immutable workflow trail">
                  {dynamicActivity.length ? dynamicActivity.map((item, index) => (
                    <div key={`${item.timestamp}-${index}`} className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                      <div>
                        <p className="text-sm font-black">{human(item.activity_type)}</p>
                        <p className="text-xs font-semibold text-slate-500">{item.host} / {item.property}</p>
                      </div>
                    </div>
                  )) : <EmptyState title="No recent activity" detail="Audit events will appear after workflow actions." />}
                </Panel>
              </section>
              )}

              {!isDashboardView && activeNav === 'reports' && (
                <Panel title="Reports" subtitle="Operational summary for this telecaller">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Info label="Completion" value={`${dashboardMetrics.assigned ? Math.round((dashboardMetrics.listed / dashboardMetrics.assigned) * 100) : 0}%`} />
                    <Info label="Rework" value={`${dashboardMetrics.assigned ? Math.round((dashboardMetrics.rework / dashboardMetrics.assigned) * 100) : 0}%`} />
                    <Info label="Average Time" value="-" />
                  </div>
                </Panel>
              )}

              {!isDashboardView && activeNav === 'settings' && (
                <Panel title="Settings" subtitle="Telecaller profile context">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Info label="Name" value={user?.full_name || user?.name || '-'} />
                    <Info label="Email" value={user?.email || '-'} />
                    <Info label="LG Code" value={user?.lg_code || user?.employee_code || '-'} />
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>
      </main>
      {moreMenu.lead && (
        <>
          <button
            type="button"
            aria-label="Close actions menu"
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
            onClick={() => {
              setOpenMoreFor('');
              setMoreMenu({ left: 0, top: 0, lead: null });
            }}
          />
          <div
            className="fixed z-[9999] w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
            style={{ left: `${moreMenu.left}px`, top: `${moreMenu.top}px` }}
          >
            <a
              href={emailHref(moreMenu.lead, 'X-SPACE360 lead follow-up', templateMessage('Call Reminder', moreMenu.lead, user)) || undefined}
              className="block rounded-md px-3 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-50"
              onClick={() => setMoreMenu({ left: 0, top: 0, lead: null })}
            >
              Email
            </a>
            <button type="button" onClick={() => openDocumentModal(moreMenu.lead)} className="block w-full rounded-md px-3 py-2 text-left text-xs font-black uppercase tracking-wider hover:bg-slate-50">Documents</button>
            <button type="button" onClick={() => openLeadWorkflow(moreMenu.lead, 'video')} className="block w-full rounded-md px-3 py-2 text-left text-xs font-black uppercase tracking-wider hover:bg-slate-50">Video</button>
            <button type="button" onClick={() => openLeadWorkflow(moreMenu.lead, 'history')} className="block w-full rounded-md px-3 py-2 text-left text-xs font-black uppercase tracking-wider hover:bg-slate-50">Timeline</button>
          </div>
        </>
      )}
      {videoModalLead && (() => {
        const c = caseOf(videoModalLead);
        return (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Video Verification</p>
                  <h2 className="mt-1 text-lg font-black">{hostName(videoModalLead)}</h2>
                  <p className="text-xs font-semibold text-slate-500">{propertyTitle(videoModalLead)}</p>
                </div>
                <button type="button" onClick={() => setVideoModalLead(null)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Verification ID" value={c?.verification_id || '-'} />
                <Info label="Stage" value={human(stageOf(videoModalLead))} />
                <Info label="Scheduled Date" value={c?.scheduled_date || '-'} highlight />
                <Info label="Time" value={[c?.scheduled_start_time, c?.scheduled_end_time].filter(Boolean).join(' - ') || '-'} highlight />
                <Info label="Phone" value={leadPhone(videoModalLead)} />
                <Info label="Location" value={videoModalLead.property?.city || videoModalLead.host?.city || '-'} />
              </div>

              {c?.schedule_notes ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Schedule Notes</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{c.schedule_notes}</p>
                </div>
              ) : null}

              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Re-schedule Call</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Use this if the video call fails, host misses the slot, or network issues interrupt verification.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="date" min={today()} value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: clampDateToToday(e.target.value) })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none" />
                  <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_start_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none" />
                  <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_end_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none" />
                  <input value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Reason / notes for re-schedule" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none sm:col-span-3" />
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={rescheduleVideoCallFromVideoModal}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Video className="h-4 w-4" /> Re-schedule Video Call
                </button>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setVideoModalLead(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider">Close</button>
                {c?.verification_id ? (
                  <button
                    type="button"
                    onClick={() => openVideoCallInModal(videoModalLead)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white"
                  >
                    <Video className="h-4 w-4" /> Join Video Call
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}
      {videoCallLead && (() => {
        const c = caseOf(videoCallLead);
        const roomName = c?.jitsi_room_name;
        const displayName = encodeURIComponent(user?.full_name || user?.name || 'Telecaller');
        const meetingUrl = roomName
          ? `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false&config.requireDisplayName=false&config.disableDeepLinking=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true&interfaceConfig.SHOW_JITSI_WATERMARK=true`
          : '';
        return (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/70 p-4">
            <div className="grid max-h-[90vh] w-full max-w-6xl gap-4 overflow-hidden rounded-xl bg-slate-50 p-3 shadow-2xl lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">Video Verification in Progress</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{hostName(videoCallLead)} / {propertyTitle(videoCallLead)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {c?.scheduled_start_time || '00:00'}
                    </span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">Record</span>
                    <button type="button" onClick={() => setVideoCallLead(null)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                  {meetingUrl ? (
                    <iframe
                      title="X-Space360 Video Verification"
                      src={meetingUrl}
                      allow="camera; microphone; fullscreen; display-capture; autoplay"
                      className="h-[54vh] w-full rounded-lg border border-slate-800 bg-black"
                    />
                  ) : (
                    <div className="flex h-[54vh] items-center justify-center rounded-lg border border-red-200 bg-slate-950 text-center text-sm font-bold text-red-200">
                      Video room is not ready. Re-schedule or refresh this verification.
                    </div>
                  )}
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Please verify property live view, interiors, utilities and surrounding area as per the checklist.
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-xs font-black text-slate-900">Call & Schedule</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoCallLead(null);
                        openVideoModal(videoCallLead);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700"
                    >
                      <Clock3 className="h-4 w-4" /> Reschedule
                    </button>
                    <a
                      href={whatsappHref(videoCallLead, templateMessage('Video Verification Reminder', videoCallLead, user)) || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-700"
                    >
                      <MessageCircle className="h-4 w-4" /> Send WhatsApp
                    </a>
                    <a
                      href={emailHref(videoCallLead, 'X-SPACE360 Video Verification', templateMessage('Video Verification Reminder', videoCallLead, user)) || undefined}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700"
                    >
                      <Mail className="h-4 w-4" /> Send Email
                    </a>
                  </div>
                </div>
              </section>

              <aside className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Verification Checklist</p>
                    <p className="text-xs font-bold text-slate-500">{checklistDone}/{CHECKLIST.length}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {CHECKLIST.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={['yes', 'true', true].includes(checklist[key])}
                        onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked ? 'yes' : 'no' })}
                        className="h-3.5 w-3.5 accent-blue-600"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-black text-slate-900">Telecaller Notes</p>
                    <p className="text-[10px] font-bold text-slate-400">{remarks.length}/500</p>
                  </div>
                  <textarea
                    value={remarks}
                    maxLength={500}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add your notes here..."
                    className="min-h-[92px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none"
                  />
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-900">Verification Video Upload</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Upload recorded proof if the telecaller captured a separate verification video.</p>
                  <input
                    type="file"
                    accept="video/*"
                    disabled={uploadingVerificationVideo}
                    onChange={(event) => uploadTelecallerVerificationVideo(event.target.files?.[0])}
                    className="mt-2 block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-wider file:text-white"
                  />
                  {uploadingVerificationVideo ? (
                    <p className="mt-2 text-xs font-bold text-blue-700">Uploading video...</p>
                  ) : telecallerVideoUrl ? (
                    <a href={telecallerVideoUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-bold text-blue-700">
                      Uploaded: {telecallerVideoUrl}
                    </a>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={saving || !c?.verification_id}
                    onClick={() => runAction('checklist')}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 disabled:opacity-50"
                  >
                    Save & Schedule
                  </button>
                  <button
                    type="button"
                    disabled={saving || !c?.verification_id}
                    onClick={completeVideoVerification}
                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 ${
                      CHECKLIST.filter(([key]) => !['yes', 'true', true].includes(checklist[key])).length > 6
                        ? 'bg-red-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {CHECKLIST.filter(([key]) => !['yes', 'true', true].includes(checklist[key])).length > 6
                      ? 'Reject Verification'
                      : 'Complete Verification'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        );
      })()}
      {callModalLead && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Call Management</p>
                <h2 className="mt-0.5 text-lg font-black leading-tight">{hostName(callModalLead)}</h2>
                <p className="text-xs font-semibold text-slate-500">{leadPhone(callModalLead)} / {leadEmail(callModalLead)}</p>
                <p className="mt-1 text-xs font-black text-slate-700">Calling from: {userPhone(user)}</p>
              </div>
              <button type="button" onClick={closeCallModal} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <select value={callFlowType} onChange={(e) => { setCallFlowType(e.target.value); setCallChecklist({}); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none">
                <option value="first_call">First Call Checklist</option>
                <option value="reschedule_call">Reschedule Call Checklist</option>
                <option value="follow_up_call">Follow-up Call Checklist</option>
              </select>
              <select value={callForm.outcome} onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none">
                {['CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'HOST_NOT_INTERESTED', 'WRONG_NUMBER'].map((o) => <option key={o} value={o}>{human(o)}</option>)}
              </select>
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">Timer: {callDuration}</div>
              <input type="date" min={today()} value={callForm.scheduled_date} onChange={(e) => setCallForm({ ...callForm, scheduled_date: clampDateToToday(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
              <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={callForm.scheduled_time} onChange={(e) => setCallForm({ ...callForm, scheduled_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
              <button type="button" onClick={startCallFlow} title={`Call host from telecaller registered number: ${userPhone(user)}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
                <Phone className="h-4 w-4" /> Start Call
              </button>
            </div>
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
              Start Call opens Phone Link/desktop calling. Keep default SIM selected on phone, and keep Windows input/output set to desktop headset.
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={callStatus !== 'ringing'}
                onClick={markCallReceived}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
              >
                Host Received
              </button>
              <button
                type="button"
                disabled={callStatus === 'idle'}
                onClick={resetCallFlow}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                Reset Call
              </button>
              <a
                href={phoneHref(callModalLead) || undefined}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider"
              >
                Open Dialer
              </a>
            </div>
            <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-black uppercase tracking-widest text-slate-500">Phone Link Setup & USB Fallback</summary>
              <div className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                <p>1. Phone madhye default calling SIM select kara.</p>
                <p>2. Phone Link Calls tab madhun PC headset audio test kara.</p>
                <p>3. Website Start Call nantar prompt aala tar Phone Link/Windows madhye confirm kara.</p>
                <p>4. Host answer kelyavar Host Received click kara. Timer ani web mic recording tevha start hotil.</p>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700">{dialAdbCommand(callModalLead) || 'Host phone number unavailable'}</code>
                <button type="button" onClick={copyAdbDialCommand} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider">Copy</button>
                <button type="button" onClick={startUsbCallFlow} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700">Run USB</button>
              </div>
            </details>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip className={callStatus === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : callStatus === 'ringing' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                {callStatus === 'ringing' ? 'Ringing' : callStatus === 'connected' ? 'Connected' : 'Not started'}
              </StatusChip>
              <StatusChip className={recordingState === 'recording' ? 'border-red-200 bg-red-50 text-red-700' : ''}>
                {recordingState === 'recording' ? 'Web Recording Auto' : recordingState === 'saved' ? 'Web Recording Saved' : 'Phone Recording Auto'}
              </StatusChip>
            </div>
            {recordingUrl && <audio controls src={recordingUrl} className="mt-3 w-full" />}
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Checklist</p>
                <p className="text-xs font-black text-slate-500">{callChecklistDone}/{activeCallChecklist.length}</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {activeCallChecklist.map(([key, label]) => (
                  <label key={key} className="flex min-h-[38px] items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold">
                    <span>{label}</span>
                    <input type="checkbox" checked={Boolean(callChecklist[key])} onChange={(e) => setCallChecklist({ ...callChecklist, [key]: e.target.checked })} />
                  </label>
                ))}
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-black">
              <input type="checkbox" checked={scheduleVideoFromCall} onChange={(e) => setScheduleVideoFromCall(e.target.checked)} />
              Schedule video verification
            </label>
            {scheduleVideoFromCall && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input type="date" min={today()} value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: clampDateToToday(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
                <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_start_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
                <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_end_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
                <input value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Video schedule notes" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none md:col-span-3" />
                <button type="button" disabled={saving} onClick={scheduleVideoCallFromModal} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 md:col-span-3">
                  <Video className="h-4 w-4" /> Schedule Video Call
                </button>
              </div>
            )}
            <textarea value={callForm.remarks} onChange={(e) => setCallForm({ ...callForm, remarks: e.target.value })} placeholder="Disposition notes / reason" className="mt-3 min-h-[90px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={closeCallModal} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider">Cancel</button>
              <button type="button" disabled={saving} onClick={saveCallOutcome} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">Save Call Outcome</button>
            </div>
          </div>
        </div>
      )}
      {documentModalLead && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Document Verification</p>
                <h2 className="text-base font-black">{hostName(documentModalLead)}</h2>
                <p className="text-xs font-semibold text-slate-500">{leadPhone(documentModalLead)} / {leadEmail(documentModalLead)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocumentModalLead(null);
                  setDocumentReason('');
                  setPendingDocumentAction('');
                  setPendingDocumentBulk(false);
                  setSelectedDocumentType('');
                }}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-68px)] overflow-y-auto p-3">
              <div className="space-y-3">
                {modalDocuments.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All Documents</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">Bulk approve/reject karaycha asel tar reason popup open hoil.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:w-72">
                        <button type="button" disabled={saving} onClick={() => startBulkDocumentAction('approve')} className="rounded-md bg-emerald-600 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50">Approve All</button>
                        <button type="button" disabled={saving} onClick={() => startBulkDocumentAction('reject')} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50">Reject All</button>
                      </div>
                    </div>
                  </div>
                )}
                {modalDocuments.length === 0 ? (
                  <EmptyState title="No documents found" detail="This host has not uploaded KYC documents yet." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {modalDocuments.map((doc) => {
                      const documentType = doc.document_type || doc.type;
                      const docUrl = documentUrlOf(doc);
                      const active = documentType === selectedModalDocumentType;
                      const status = documentStatusOf(doc);
                      return (
                        <div key={documentType} className={cx('rounded-lg border p-3', active ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-white')}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black">{doc.document_name || doc.label || human(documentType)}</p>
                              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500" title={docUrl || doc.text_value || ''}>{docUrl || doc.text_value || 'Uploaded value unavailable'}</p>
                              {doc.rejection_reason && <p className="mt-1 text-xs font-semibold text-red-600">{doc.rejection_reason}</p>}
                              {doc.remarks && <p className="mt-1 text-xs font-semibold text-slate-500">{doc.remarks}</p>}
                            </div>
                            <StatusChip className={status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                              {human(status || 'pending')}
                            </StatusChip>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            <a
                              href={docUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => {
                                if (!docUrl) event.preventDefault();
                              }}
                              className={cx(
                                'inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50',
                                !docUrl && 'pointer-events-none opacity-50'
                              )}
                            >
                              Open
                            </a>
                            <button disabled={saving || !documentType} onClick={() => startDocumentAction(documentType, 'approve')} className="rounded-md bg-emerald-600 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50">Approve</button>
                            <button disabled={saving || !documentType} onClick={() => startDocumentAction(documentType, 'request_reupload')} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700 disabled:opacity-50">Re-upload</button>
                            <button disabled={saving || !documentType} onClick={() => startDocumentAction(documentType, 'reject')} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-red-700 disabled:opacity-50">Reject</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  Approve, reject or re-upload kelyavar mandatory reason popup open hoil.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {documentModalLead && pendingDocumentAction && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Reason Required</p>
            <h3 className="mt-1 text-lg font-black">
              {pendingDocumentBulk ? `${human(pendingDocumentAction)} Documents` : `${human(pendingDocumentAction)} Document`}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {pendingDocumentBulk
                ? 'This reason will be saved for all documents in this host profile.'
                : `Document: ${selectedModalDocument?.document_name || selectedModalDocument?.label || human(selectedModalDocumentType)}`}
            </p>
            <textarea
              value={documentReason}
              onChange={(event) => setDocumentReason(event.target.value)}
              placeholder="Enter reason / remarks. This is mandatory."
              className="mt-3 min-h-[130px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-400"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDocumentAction('');
                  setPendingDocumentBulk(false);
                  setDocumentReason('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !documentReason.trim()}
                onClick={() => pendingDocumentBulk
                  ? runBulkDocumentAction(pendingDocumentAction)
                  : runDocumentAction(selectedModalDocumentType, pendingDocumentAction, documentModalLead)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-black">{title}</h3>
        {subtitle && <p className="text-xs font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Lead360({ selected, activity, checklist, setChecklist, checklistDone, remarks, setRemarks, callForm, setCallForm, scheduleForm, setScheduleForm, saving, runAction, runDocumentAction, submitDocuments, canSubmitBm, user, activeNav }) {
  if (!selected) return <EmptyState title="Select a lead" detail="Lead 360 workspace opens here with registration, documents, calls, video and BM handoff." />;
  const c = caseOf(selected);
  const stage = stageOf(selected);
  const pct = progressFor(stage);
  const showOverview = ['leads', 'tasks', 'property', 'listing', 'calendar'].includes(activeNav);
  const showCalls = ['leads', 'tasks', 'calls', 'calendar'].includes(activeNav);
  const showDocuments = ['leads', 'documents'].includes(activeNav);
  const showVideo = ['leads', 'video', 'calendar'].includes(activeNav);
  const showChecklist = ['leads', 'video'].includes(activeNav);
  const showCommunication = ['leads', 'whatsapp', 'email', 'templates'].includes(activeNav);
  const showActivity = ['leads', 'history'].includes(activeNav);
  const showProperty = ['property', 'listing'].includes(activeNav);
  return (
    <div className="space-y-4">
      <div className="sticky top-[76px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Lead 360 Workspace</p>
            <h2 className="mt-1 text-xl font-black">{hostName(selected)}</h2>
            <p className="text-xs font-semibold text-slate-500">{c?.verification_id || selected.lead_id} / {leadPhone(selected)} / {leadEmail(selected)}</p>
          </div>
          <StatusChip className={slaTone(c?.sla?.state)}>{human(c?.sla?.state || 'on_track')}</StatusChip>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs font-black">
            <span>{human(stage)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {showOverview && <Panel title="Overview" subtitle="Host, lead and property context">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Property" value={propertyTitle(selected)} />
          <Info label="Location" value={selected.property?.city || selected.host?.city || '-'} />
          <Info label="Source" value={sourceRoleOf(selected)} />
          <Info label="Source Owner" value={selected.source_owner_name || 'Self registration'} />
          <Info label="Owner LG Code" value={selected.source_owner_code || selected.lg_code || '-'} />
          <Info label="Assigned Telecaller" value={user?.full_name || user?.email || '-'} />
          <Info label="Next Best Action" value={nextAction(selected)} highlight />
        </div>
      </Panel>}

      {showCalls && <Panel title="Call Management" subtitle="Disposition history is appended in backend">
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={callForm.outcome} onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none">
            {['CONNECTED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'HOST_NOT_INTERESTED', 'COMPLETED', 'SCHEDULED', 'RESCHEDULED'].map((item) => <option key={item} value={item}>{human(item)}</option>)}
          </select>
          <input type="date" min={today()} value={callForm.scheduled_date} onChange={(e) => setCallForm({ ...callForm, scheduled_date: clampDateToToday(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
          <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={callForm.scheduled_time} onChange={(e) => setCallForm({ ...callForm, scheduled_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
          <input value={callForm.remarks} onChange={(e) => setCallForm({ ...callForm, remarks: e.target.value })} placeholder="Disposition notes / reason" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
        </div>
        <button disabled={saving} onClick={() => runAction('call')} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">Save Call Outcome</button>
      </Panel>}

      {showDocuments && <Panel title="Document Verification" subtitle="Approve required KYC documents before BM handoff">
        <div className="space-y-2">
          {(selected.host?.kyc_documents || selected.documents || []).length === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              No uploaded documents found on this host profile yet.
            </p>
          )}
          {(selected.host?.kyc_documents || selected.documents || []).map((doc) => {
            const documentType = doc.document_type || doc.type;
            const docUrl = doc.document_url || doc.url;
            return (
              <div key={documentType} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black">{doc.document_name || doc.label || human(documentType)}</p>
                    <p className="text-xs font-semibold text-slate-500">{docUrl || doc.text_value || 'Uploaded value unavailable'}</p>
                  </div>
                  <StatusChip className={doc.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : doc.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                    {human(doc.status || 'pending')}
                  </StatusChip>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {docUrl && <a href={docUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider">View</a>}
                  <button disabled={saving || !documentType} onClick={() => runDocumentAction(documentType, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">Approve</button>
                  <button disabled={saving || !documentType} onClick={() => runDocumentAction(documentType, 'request_reupload')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-700 disabled:opacity-50">Re-upload</button>
                  <button disabled={saving || !documentType} onClick={() => runDocumentAction(documentType, 'reject')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-red-700 disabled:opacity-50">Reject</button>
                </div>
              </div>
            );
          })}
        </div>
        <button disabled={saving} onClick={submitDocuments} className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700 disabled:opacity-50">Submit Document Verification</button>
      </Panel>}

      {showVideo && <Panel title="Video Verification" subtitle="Jitsi-ready scheduling and start flow">
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="date" min={today()} value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: clampDateToToday(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
          <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_start_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
          <input type="time" lang="en-GB" step="60" pattern="[0-2][0-9]:[0-5][0-9]" value={scheduleForm.scheduled_end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_end_time: normalizeTime24(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
          <input value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Schedule notes" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={saving} onClick={() => runAction('schedule')} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">Schedule / Reschedule</button>
          <button disabled={saving} onClick={() => runAction('start')} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-50">Mark In Progress</button>
          {c?.verification_id && <a href={`/verification/video/${c.verification_id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">Join Video</a>}
        </div>
      </Panel>}

      {showChecklist && <Panel title="Final Telecaller Checklist" subtitle={`${checklistDone}/${CHECKLIST.length} completed`}>
        <div className="space-y-2">
          {CHECKLIST.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm font-semibold">{label}</span>
              <input type="checkbox" checked={['yes', 'true', true].includes(checklist[key])} onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked ? 'yes' : 'no' })} className="h-4 w-4 accent-blue-600" />
            </label>
          ))}
        </div>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Telecaller remarks" className="mt-3 min-h-[82px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={saving} onClick={() => runAction('checklist')} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-50">Save Checklist</button>
          <button disabled={saving || !canSubmitBm} onClick={() => runAction('bm')} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">Send to BM</button>
        </div>
      </Panel>}

      {showProperty && <Panel title="Property Listing" subtitle="Listing readiness and completion">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Listing Status" value={human(selected.property?.status || c?.workflow_status || 'not_started')} />
          <Info label="Category" value={selected.property?.category || selected.property?.property_type || '-'} />
          <Info label="City" value={selected.property?.city || selected.host?.city || '-'} />
          <Info label="Next Step" value={nextAction(selected)} highlight />
        </div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          Property listing wizard can continue after BM approval. Current backend exposes listing data through the property profile.
        </p>
      </Panel>}

      {showCommunication && <Panel title="Communication" subtitle="Template-ready WhatsApp and email panel">
        <div className="grid gap-2">
          {['Welcome', 'Document Request', 'Missing Document', 'Call Reminder', 'Video Verification Reminder', 'Verification Completed', 'Listing Assistance'].map((template) => (
            <div key={template} className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="mb-2 text-xs font-black uppercase tracking-wider">{template}</p>
              <div className="flex gap-2">
                <a href={whatsappHref(selected, templateMessage(template, selected, user)) || undefined} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
                <a href={emailHref(selected, `X-SPACE360 ${template}`, templateMessage(template, selected, user)) || undefined} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-blue-700">
                  <Mail className="h-3 w-3" /> Email
                </a>
              </div>
            </div>
          ))}
        </div>
      </Panel>}

      {showActivity && <Panel title="Activity Timeline" subtitle="Latest lead events">
        {activity.length ? activity.slice(0, 8).map((item, index) => (
          <div key={`${item.timestamp}-${index}`} className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
            <span className="mt-1 rounded-full bg-blue-50 p-1 text-blue-700"><CheckCircle2 className="h-3 w-3" /></span>
            <div>
              <p className="text-sm font-black">{human(item.activity_type)}</p>
              <p className="text-xs font-semibold text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : '-'}</p>
            </div>
          </div>
        )) : <EmptyState title="No timeline yet" detail="Call, schedule, document and checklist actions will create activity entries." />}
      </Panel>}
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={cx('mt-1 text-sm font-black', highlight ? 'text-blue-700' : 'text-slate-950')}>{value}</p>
    </div>
  );
}

export default TelecallerDashboard;
