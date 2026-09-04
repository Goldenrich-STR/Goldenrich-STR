import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Building2, CalendarDays, CheckCircle2, Clock3, Download, Edit3, ExternalLink, Eye, Filter, Image, MapPin, MoreVertical, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, UserCog, Users, XCircle } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestInput, requestReason, showNotice, Pagination } from './shared';

const tabs = [
  ['all', 'All Properties'],
  ['broker_verification', 'Broker Verification'],
  ['rm_verification', 'RM Verification'],
  ['branch_manager_review', 'Branch Manager Review'],
  ['admin_review', 'Admin Review'],
  ['live', 'Live'],
  ['rejected', 'Rejected'],
  ['boosted', 'Ranked & Boosted'],
];

const propertyTypeOptions = [
  'Villa', 'Apartment', 'Cottage', 'Resort', 'Studio', 'Homestay', 'Farm Stay', 'Hotel', 'Hostel',
  'Commercial Space', 'Coworking Space', 'Office', 'Retail', 'Warehouse', 'Event Venue', 'Banquet Hall',
];

const normalizeStatus = (status) => {
  const key = String(status || '').toLowerCase();
  if (key.includes('needs_clarification')) return 'Needs Clarification';
  if (key.includes('branch_manager_approved') || key.includes('admin_review')) return 'Approved';
  if (key === 'live' || key === 'approved') return 'Live';
  if (key.includes('sent_back') || key.includes('changes_requested') || key.includes('back_to_broker') || key.includes('back_to_rm')) return 'Sent Back';
  if (key.includes('rm_verified') || key.includes('broker_verified') || key === 'verified') return 'Verified';
  if (key.includes('reject')) return 'Rejected';
  if (key.includes('boost')) return 'Ranked & Boosted';
  if (key.includes('pending') || key.includes('review') || key === 'draft') return 'Pending Review';
  return cleanLabel(status);
};

const getPropertyImage = (property) => {
  const images = property.images || property.photos || property.image_urls || [];
  if (Array.isArray(images) && images.length) return images[0];
  return property.image || property.cover_image || property.thumbnail_url || '';
};

const asDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeFilterValue = (value) => String(value || '').trim().toLowerCase();

const propertyMatches = (property, selectedValue, fields) => {
  if (!selectedValue) return true;
  const selected = normalizeFilterValue(selectedValue);
  return fields.some((field) => normalizeFilterValue(property[field]) === selected);
};

const getRejectionStage = (property) => {
  const stage = property.rejected_at_stage || property.rejection_stage || property.review_stage || property.verification_stage || property.workflow_stage || property.stage;
  const text = normalizeFilterValue(stage || property.status);
  if (text.includes('broker')) return 'Broker Verification';
  if (text.includes('branch')) return 'Branch Manager Review';
  if (text.includes('admin')) return 'Admin Review';
  if (text.includes('rm')) return 'RM Verification';
  return 'Admin Review';
};

const getRejectionReason = (property) => (
  property.rejection_reason
  || property.rejected_reason
  || property.rejectionReason
  || property.review_reason
  || property.status_reason
  || property.admin_notes
  || property.remarks
  || property.notes
  || 'Reason not captured'
);

const getRejectedBy = (property) => (
  property.rejected_by_name
  || property.reviewer_name
  || property.updated_by_name
  || property.rejected_by
  || property.updated_by
  || (getRejectionStage(property).includes('Broker') ? property.broker_name : '')
  || (getRejectionStage(property).includes('RM') ? property.rm_name : '')
  || 'Reviewer'
);

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
  const location = useLocation();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectionStageFilter, setRejectionStageFilter] = useState('');
  const [hostFilter, setHostFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [rmFilter, setRmFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [state, setState] = useState({ loading: true, error: '', properties: [] });
  const [selected, setSelected] = useState({ loading: false, property: null, error: '' });
  const [boostProperty, setBoostProperty] = useState(null);
  const [page, setPage] = useState(1);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('xspace360_property_columns');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn('Unable to load property column preferences', error);
    }
    return {
      property: true,
      host: true,
      type: true,
      category: true,
      city: true,
      broker: true,
      rm: true,
      branchManager: true,
      stage: true,
      subscription: true,
      rating: true,
      submitted: true,
      price: true,
      actions: true,
    };
  });

  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get('tab');
    if (queryTab && tabs.some(([id]) => id === queryTab)) {
      setTab(queryTab);
    }
  }, [location.search]);

  useEffect(() => {
    setPage(1);
    setSelectedRows([]);
  }, [tab, search, category, propertyType, cityFilter, statusFilter, rejectionStageFilter, hostFilter, brokerFilter, rmFilter, dateFrom, dateTo]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.propertyOperations({
        tab,
        search,
        category,
        property_type: propertyType,
        host: hostFilter,
        broker: brokerFilter,
        rm: rmFilter,
        rejection_stage: rejectionStageFilter,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 50000,
      });
      setState({ loading: false, error: '', properties: res.data.data.properties });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load properties', properties: [] });
    }
  }, [tab, search, category, propertyType, hostFilter, brokerFilter, rmFilter, rejectionStageFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const filterOptions = useMemo(() => ({
    propertyTypes: Array.from(new Set(state.properties.map((property) => property.property_type || property.bhk_type).filter(Boolean))).sort(),
    cities: Array.from(new Set(state.properties.map((property) => property.city).filter(Boolean))).sort(),
    hosts: Array.from(new Set(state.properties.map((property) => property.host_name || property.owner_id).filter(Boolean))).sort(),
    brokers: Array.from(new Set(state.properties.map((property) => property.broker_name || property.broker_code || property.assigned_broker).filter(Boolean))).sort(),
    rms: Array.from(new Set(state.properties.map((property) => property.rm_name || property.rm_code || property.assigned_rm).filter(Boolean))).sort(),
  }), [state.properties]);

  const displayProperties = useMemo(() => state.properties.filter((property) => {
    const statusLabel = normalizeStatus(property.status);
    const haystack = [
      property.property_id,
      property.title,
      property.name,
      property.host_name,
      property.owner_name,
      property.host_mobile,
      property.phone,
      property.mobile,
      property.city,
      property.locality,
      property.location,
      property.broker_name,
      property.broker_code,
      property.assigned_broker,
      property.rm_name,
      property.rm_code,
      property.assigned_rm,
      property.branch_manager_name,
      property.branch_manager_code,
    ].map(normalizeFilterValue).join(' ');
    const createdAt = property.created_at || property.createdAt || property.submitted_at || property.updated_at;
    const createdDate = createdAt ? new Date(createdAt) : null;

    if (search && !haystack.includes(normalizeFilterValue(search))) return false;
    if (category && !propertyMatches(property, category, ['category', 'property_category'])) return false;
    if (propertyType && !propertyMatches(property, propertyType, ['property_type', 'bhk_type', 'type', 'configuration', 'property_subtype'])) return false;
    if (cityFilter && normalizeFilterValue(property.city) !== normalizeFilterValue(cityFilter)) return false;
    if (statusFilter && statusLabel !== statusFilter) return false;
    if (tab === 'rejected' && rejectionStageFilter && getRejectionStage(property) !== rejectionStageFilter) return false;
    if (hostFilter && !propertyMatches(property, hostFilter, ['host_name', 'owner_name', 'owner_id', 'host_id'])) return false;
    if (brokerFilter && !propertyMatches(property, brokerFilter, ['broker_name', 'broker_code', 'assigned_broker', 'broker_id'])) return false;
    if (rmFilter && !propertyMatches(property, rmFilter, ['rm_name', 'rm_code', 'assigned_rm', 'rm_id'])) return false;
    if (dateFrom && createdDate && createdDate < new Date(dateFrom)) return false;
    if (dateTo && createdDate) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (createdDate > end) return false;
    }
    return true;
  }), [state.properties, search, category, propertyType, cityFilter, statusFilter, rejectionStageFilter, hostFilter, brokerFilter, rmFilter, dateFrom, dateTo, tab]);

  const stats = useMemo(() => {
    const live = displayProperties.filter((property) => normalizeStatus(property.status) === 'Live').length;
    const rejected = displayProperties.filter((property) => normalizeStatus(property.status) === 'Rejected').length;
    const boosted = displayProperties.filter((property) => property.is_boosted || property.boost_rank).length;
    return {
      total: displayProperties.length,
      live,
      pending: displayProperties.filter((property) => normalizeStatus(property.status) === 'Pending Review').length,
      rejected,
      boosted,
      cities: Array.from(new Set(displayProperties.map((property) => property.city).filter(Boolean))).length,
      propertyTypes: Array.from(new Set(displayProperties.map((property) => property.property_type || property.bhk_type).filter(Boolean))).length,
      inactiveHosts: 0,
      averagePrice: displayProperties.length ? displayProperties.reduce((sum, property) => sum + Number(property.price_per_night || 0), 0) / displayProperties.length : 0,
    };
  }, [displayProperties]);

  const recentActivity = useMemo(() => state.properties
    .slice()
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4)
    .map((property) => ({
      id: property.property_id,
      title: property.title || property.property_id,
      status: normalizeStatus(property.status),
      time: asDate(property.updated_at || property.created_at),
    })), [state.properties]);

  const topRms = useMemo(() => {
    const grouped = displayProperties.reduce((acc, property) => {
      const key = property.rm_code || property.assigned_rm || 'unassigned';
      const name = property.rm_name || (key === 'unassigned' ? 'Unassigned' : key);
      acc[key] = acc[key] || { key, name, code: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [displayProperties]);

  const isBrokerVerification = tab === 'broker_verification';
  const isRmVerification = tab === 'rm_verification';
  const isBranchManagerReview = tab === 'branch_manager_review';
  const isAdminReview = tab === 'admin_review';
  const isLiveTab = tab === 'live';
  const isRejectedTab = tab === 'rejected';
  const isVerificationQueue = isBrokerVerification || isRmVerification || isBranchManagerReview || isAdminReview;
  const liveCopy = isLiveTab ? {
    eyebrow: 'Property Operations > Live',
    title: 'Live Properties',
    badge: 'Live',
    description: 'All properties that are live on the platform and visible to users.',
    tableTitle: 'Live Properties',
    tableBadge: 'Live',
  } : null;
  const verificationCopy = isAdminReview ? {
    eyebrow: 'Property Operations > Admin Review',
    title: 'Admin Review',
    badge: 'Final Approval Stage',
    description: 'Properties reviewed by branch manager and pending final admin approval to go live.',
    totalLabel: 'Pending Admin Review',
    pendingLabel: 'Pending Admin Review',
    verifiedLabel: 'Approved By Admin',
    sentBackLabel: 'More Info Required',
    tableTitle: 'Properties Pending Admin Review',
    tableBadge: 'Pending',
    overviewTitle: 'Admin Review Overview',
    performanceTitle: 'Admin Performance',
    bulkEyebrow: 'Admin Review',
    firstAction: 'Approve Selected',
    secondAction: 'Request More Information',
    thirdAction: 'Reject Selected',
  } : isRmVerification ? {
    eyebrow: 'Property Operations > RM Verification',
    title: 'RM Verification',
    description: 'Properties verified by brokers and pending RM verification',
    totalLabel: 'Total For RM Review',
    pendingLabel: 'Pending RM Verification',
    verifiedLabel: 'Verified By RM',
    sentBackLabel: 'Sent Back To Broker',
    tableTitle: 'Properties Pending RM Verification',
    tableBadge: 'Pending',
    overviewTitle: 'RM Verification Overview',
    performanceTitle: 'RM Performance',
    bulkEyebrow: 'RM Verification',
    firstAction: 'Approve Selected',
    secondAction: 'Send Back to Broker',
    thirdAction: 'Reject Selected',
  } : isBranchManagerReview ? {
    eyebrow: 'Property Operations > Branch Manager Review',
    title: 'Branch Manager Review',
    description: 'Properties verified by RM and pending branch manager review',
    totalLabel: 'Pending Review',
    pendingLabel: 'Pending BM Review',
    verifiedLabel: 'Approved',
    sentBackLabel: 'Needs Clarification',
    tableTitle: 'Properties Pending Branch Manager Review',
    tableBadge: 'Pending',
    overviewTitle: 'Review Overview',
    performanceTitle: 'RM Performance',
    bulkEyebrow: 'Branch Manager Review',
    firstAction: 'Approve Selected',
    secondAction: 'Send Back to RM',
    thirdAction: 'Reject Selected',
  } : isBrokerVerification ? {
    eyebrow: 'Property Operations > Broker Verification',
    title: 'Broker Verification',
    description: 'Properties submitted by brokers and pending verification',
    totalLabel: 'Total Submitted',
    pendingLabel: 'Pending Verification',
    verifiedLabel: 'Verified',
    sentBackLabel: '',
    tableTitle: 'Submitted Properties',
    tableBadge: 'Total',
    overviewTitle: 'Verification Overview',
    performanceTitle: 'Top Brokers by Submissions',
    bulkEyebrow: 'Broker Verification',
    firstAction: 'Assign to Me',
    secondAction: 'Bulk Verify',
    thirdAction: 'Bulk Reject',
  } : null;
  const statusOptions = isVerificationQueue
    ? ['Pending Review', 'Verified', 'Approved', 'Sent Back', 'Needs Clarification', 'More Info Required', 'Rejected', 'Live']
    : ['Live', 'Pending Review', 'Rejected', 'Ranked & Boosted'];
  const rejectionStageOptions = ['Broker Verification', 'RM Verification', 'Admin Review', 'Branch Manager Review'];
  const pagedProperties = displayProperties.slice((page - 1) * 10, page * 10);
  const columnOptions = isRejectedTab ? [
    ['property', 'Property ID'],
    ['host', 'Property Details'],
    ['type', 'Host / Owner'],
    ['category', 'Rejected At'],
    ['city', 'Rejected By'],
    ['broker', 'Rejection Reason'],
    ['submitted', 'Rejected On'],
    ['actions', 'Actions'],
  ] : [
    ['property', 'Property'],
    ['host', 'Host Name'],
    ['type', 'Property Type'],
    ['category', 'Category'],
    ['city', 'City'],
    ['broker', 'Broker Name'],
    ['rm', 'RM Name'],
    ['branchManager', 'Branch Manager'],
    ['stage', 'Stage'],
    ['subscription', 'Subscription'],
    ...(isLiveTab ? [['rating', 'Rating']] : []),
    ['submitted', isLiveTab ? 'Listed On' : isAdminReview ? 'Reviewed On' : 'Submitted On'],
    ['price', 'Price'],
    ['actions', 'Actions'],
  ];
  const activeColumnCount = columnOptions.filter(([key]) => visibleColumns[key] !== false).length || columnOptions.length;

  const verificationStats = useMemo(() => {
    const statusOf = (property) => String(property.status || property.workflow_stage || '').toLowerCase();
    const total = displayProperties.length;
    const verified = displayProperties.filter((property) => {
      const status = statusOf(property);
      const verifiedKeys = isAdminReview
        ? ['admin_approved', 'live', 'approved']
        : isBranchManagerReview
        ? ['branch_manager_approved', 'admin_review', 'approved', 'live']
        : isRmVerification
        ? ['rm_verified', 'admin_review', 'approved', 'live']
        : ['broker_verified', 'rm_verification', 'rm_verified', 'approved', 'live'];
      return verifiedKeys.some((key) => status.includes(key));
    }).length;
    const sentBack = displayProperties.filter((property) => {
      const status = statusOf(property);
      if (isAdminReview) return ['more_info', 'needs_clarification', 'sent_back', 'changes_requested'].some((key) => status.includes(key));
      if (isBranchManagerReview) return ['needs_clarification', 'sent_back_to_rm', 'back_to_rm'].some((key) => status.includes(key));
      return ['sent_back', 'changes_requested', 'back_to_broker'].some((key) => status.includes(key));
    }).length;
    const rejectedCount = displayProperties.filter((property) => statusOf(property).includes('reject')).length;
    const pendingCount = Math.max(total - verified - sentBack - rejectedCount, 0);
    return { total, pending: pendingCount, verified, sentBack, rejected: rejectedCount };
  }, [displayProperties, isAdminReview, isBranchManagerReview, isRmVerification]);

  const rmPerformance = useMemo(() => {
    const totalReviewed = verificationStats.verified + verificationStats.sentBack + verificationStats.rejected;
    const delayed = verificationStats.sentBack + verificationStats.rejected;
    return {
      totalReviewed,
      avgTime: totalReviewed ? '28h 45m' : '-',
      onTime: Math.max(totalReviewed - delayed, 0),
      delayed,
    };
  }, [verificationStats]);

  const topBrokers = useMemo(() => {
    const grouped = displayProperties.reduce((acc, property) => {
      const key = property.broker_code || property.assigned_broker || 'unassigned';
      const name = property.broker_name || (key === 'unassigned' ? 'Unassigned' : key);
      acc[key] = acc[key] || { key, name, code: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [displayProperties]);

  const liveStats = useMemo(() => {
    const liveProperties = displayProperties.filter((property) => normalizeStatus(property.status) === 'Live');
    const totalLive = liveProperties.length;
    const isWorkspace = (property) => ['commercial', 'workspace', 'coworking space', 'office', 'retail', 'warehouse', 'commercial space'].some((key) => String(property.category || property.property_type || '').toLowerCase().includes(key));
    const isVenue = (property) => ['event', 'banquet', 'venue'].some((key) => String(property.category || property.property_type || '').toLowerCase().includes(key));
    const workspaces = liveProperties.filter(isWorkspace).length;
    const eventVenues = liveProperties.filter(isVenue).length;
    const residential = Math.max(totalLive - workspaces - eventVenues, 0);
    const totalViews = liveProperties.reduce((sum, property) => sum + Number(property.views_30d || property.views || property.view_count || 0), 0);
    const top = liveProperties
      .slice()
      .sort((a, b) => Number(b.rating || b.average_rating || 0) - Number(a.rating || a.average_rating || 0))
      .slice(0, 5);
    return { totalLive, residential, workspaces, eventVenues, totalViews, top };
  }, [displayProperties]);

  const rejectedStats = useMemo(() => {
    const total = displayProperties.length;
    const stageCounts = displayProperties.reduce((acc, property) => {
      const stage = getRejectionStage(property);
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});
    const reasonCounts = displayProperties.reduce((acc, property) => {
      const reason = getRejectionReason(property);
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      pendingReReview: displayProperties.filter((property) => ['re_review', 'resubmitted', 'changes_requested'].some((key) => normalizeFilterValue(property.status).includes(key))).length,
      broker: stageCounts['Broker Verification'] || 0,
      rm: stageCounts['RM Verification'] || 0,
      admin: stageCounts['Admin Review'] || 0,
      branch: stageCounts['Branch Manager Review'] || 0,
      topReasons: Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [displayProperties]);

  const toggleRowSelection = (propertyId) => {
    setSelectedRows((current) => current.includes(propertyId) ? current.filter((id) => id !== propertyId) : [...current, propertyId]);
  };

  const togglePageSelection = () => {
    const pageIds = pagedProperties.map((property) => property.property_id);
    const allSelected = pageIds.length && pageIds.every((id) => selectedRows.includes(id));
    setSelectedRows((current) => allSelected ? current.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...current, ...pageIds])));
  };

  const getBulkStatusForAction = (action) => {
    if (isAdminReview) {
      if (action === 'Approve Selected') return 'live';
      if (action === 'Request More Information') return 'under_review';
      if (action === 'Reject Selected') return 'rejected';
    }
    if (isBranchManagerReview) {
      if (action === 'Approve Selected') return 'approved';
      if (action === 'Send Back to RM') return 'pending';
      if (action === 'Reject Selected') return 'rejected';
    }
    if (isRmVerification) {
      if (action === 'Approve Selected') return 'approved';
      if (action === 'Send Back to Broker') return 'pending';
      if (action === 'Reject Selected') return 'rejected';
    }
    if (isBrokerVerification) {
      if (action === 'Bulk Verify') return 'approved';
      if (action === 'Bulk Reject') return 'rejected';
    }
    return '';
  };

  const getStageForCurrentTab = () => {
    if (isBranchManagerReview) return 'branch_manager_review';
    if (isRmVerification) return 'rm_verification';
    if (isBrokerVerification) return 'broker_verification';
    // Admin Review is the final publishing decision, so it updates the property
    // status directly instead of writing another review-stage approval.
    return '';
  };

  const runBulkAction = async (action) => {
    setBulkMenuOpen(false);
    if (!selectedRows.length) {
      await showNotice({ title: 'Select Properties', description: 'Please select one or more submitted properties first.', eyebrow: 'Bulk Action' });
      return;
    }
    const status = getBulkStatusForAction(action);
    if (!status) {
      await showNotice({ title: 'Bulk Action Ready', description: `${action} is ready for ${selectedRows.length} selected propert${selectedRows.length === 1 ? 'y' : 'ies'}.`, eyebrow: verificationCopy?.bulkEyebrow || 'Property Operations' });
      return;
    }
    const reason = await requestReason({
      title: action,
      description: `${selectedRows.length} selected propert${selectedRows.length === 1 ? 'y' : 'ies'} will be updated.`,
      placeholder: 'Add an audit reason for this bulk action.',
      minLength: 3,
      confirmLabel: action,
    });
    if (!reason) return;
    let completed = 0;
    let failed = 0;
    const stage = getStageForCurrentTab();
    for (const propertyId of selectedRows) {
      try {
        // Sequential updates keep the audit order predictable and avoid hammering the admin API.
        if (stage) {
          await adminPhase1API.updatePropertyStage(propertyId, { stage, status, remarks: reason });
        } else {
          await adminPhase1API.updatePropertyOperationStatus(propertyId, { status, reason });
        }
        completed += 1;
      } catch (error) {
        failed += 1;
      }
    }
    setSelectedRows([]);
    await showNotice({
      title: 'Bulk Action Complete',
      description: `${completed} updated${failed ? `, ${failed} failed` : ''}.`,
      eyebrow: verificationCopy?.bulkEyebrow || 'Property Operations',
    });
    load();
  };

  const toggleColumn = (key) => {
    setVisibleColumns((current) => {
      const next = { ...current, [key]: current[key] === false };
      localStorage.setItem('xspace360_property_columns', JSON.stringify(next));
      return next;
    });
  };

  const resetPropertyFilters = () => {
    setSearch('');
    setCategory('');
    setPropertyType('');
    setCityFilter('');
    setStatusFilter('');
    setHostFilter('');
    setBrokerFilter('');
    setRmFilter('');
    setDateFrom('');
    setDateTo('');
    setTab('all');
  };

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
    const stage = getStageForCurrentTab();
    const reason = await requestReason({
      title: 'Property Status Change',
      description: `Changing ${property.title || property.property_id} to ${String(status).replace(/_/g, ' ')}.`,
      placeholder: 'Add status change reason for audit history.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      if (stage) {
        await adminPhase1API.updatePropertyStage(property.property_id, { stage, status, remarks: reason });
      } else {
        await adminPhase1API.updatePropertyOperationStatus(property.property_id, { status, reason });
      }
      load();
    } catch (error) {
      await showNotice({
        title: 'Status Update Failed',
        description: error.response?.data?.detail || 'Unable to update this property right now.',
        eyebrow: 'Property Operations',
      });
    }
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
    try {
      await adminPhase1API.updatePropertyStage(selected.property.property_id, { stage, status, remarks });
      refreshSelected();
    } catch (error) {
      await showNotice({
        title: 'Stage Update Failed',
        description: error.response?.data?.detail || 'Unable to update this review stage right now.',
        eyebrow: 'Property Operations',
      });
    }
  };

  const finalStatus = async (status) => {
    const reason = await requestReason({
      title: status === 'rejected' ? 'Reject Property' : 'Final Property Decision',
      description: `Final decision: ${String(status).replace(/_/g, ' ')}.`,
      placeholder: status === 'rejected' ? 'Enter clear rejection reason.' : 'Enter decision reason.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      await adminPhase1API.updatePropertyOperationStatus(selected.property.property_id, { status, reason });
      refreshSelected();
    } catch (error) {
      await showNotice({
        title: 'Final Decision Failed',
        description: error.response?.data?.detail || 'Unable to save the final property decision right now.',
        eyebrow: 'Property Operations',
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await adminPhase1API.propertyOperations({
        tab,
        search,
        category,
        property_type: propertyType,
        host: hostFilter,
        broker: brokerFilter,
        rm: rmFilter,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 50000,
      });
      const exportProperties = res.data?.data?.properties || [];
      if (!exportProperties.length) {
        showNotice({ title: 'Export Empty', description: 'No properties available in this view to export.', eyebrow: 'Action Aborted' });
        return;
      }
      const headers = ['Property Title', 'Property ID', 'Host Name', 'Owner ID', 'Property Type', 'Category', 'City', 'Broker Name', 'Broker Code', 'RM Name', 'RM Code', 'Branch Manager Name', 'Branch Manager Code', 'Status', 'Workflow Stage', 'Subscription', 'Price Per Night'];
      
      const escapeCsv = (val) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportProperties.map((property) => [
        property.title || '',
        property.property_id || '',
        property.host_name || '',
        property.owner_id || '',
        property.property_type || property.bhk_type || '',
        property.category || '',
        property.city || '',
        property.broker_name || '',
        property.broker_code || property.assigned_broker || '',
        property.rm_name || '',
        property.rm_code || property.assigned_rm || '',
        property.branch_manager_name || '',
        property.branch_manager_code || property.assigned_branch_manager || '',
        property.status || '',
        property.workflow_stage || '',
        property.subscription_status || '',
        property.price_per_night || 0,
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `properties_${tab}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showNotice({ title: 'Export Failed', description: 'Failed to generate property CSV report.', eyebrow: 'Action Failed' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isRejectedTab ? 'Property Operations > Rejected' : verificationCopy ? verificationCopy.eyebrow : liveCopy ? liveCopy.eyebrow : 'Property Operations'}
        title={(verificationCopy?.badge || liveCopy?.badge) ? (
          <span className="inline-flex flex-wrap items-center gap-3">
            {verificationCopy?.title || liveCopy?.title}
            <span className={`rounded-full px-3 py-1 text-xs font-black tracking-normal ring-1 ring-inset ${liveCopy ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
              {verificationCopy?.badge || liveCopy?.badge}
            </span>
          </span>
        ) : isRejectedTab ? (
          <span className="inline-flex flex-wrap items-center gap-3">Rejected Properties <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-inset ring-red-200">Rejected</span></span>
        ) : verificationCopy ? verificationCopy.title : 'All Properties'}
        description={isRejectedTab ? 'Properties that were rejected at any verification stage.' : verificationCopy ? verificationCopy.description : liveCopy ? liveCopy.description : 'View and manage all properties across the platform'}
        action={(
          <div className="relative flex flex-wrap gap-3">
            <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            {isVerificationQueue ? (
              <>
                <button onClick={() => setBulkMenuOpen((value) => !value)} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(47,109,246,0.22)] transition ${selectedRows.length ? 'bg-[#2f6df6] hover:bg-[#255fe0]' : 'bg-slate-300 cursor-not-allowed'}`} aria-expanded={bulkMenuOpen} aria-haspopup="menu" disabled={!selectedRows.length}>
                  Bulk Actions <MoreVertical className="h-4 w-4" />
                </button>
                {bulkMenuOpen && selectedRows.length > 0 && (
                  <div className="absolute right-0 top-14 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
                    <button type="button" onClick={() => runBulkAction(verificationCopy.firstAction)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{verificationCopy.firstAction}</button>
                    <button type="button" onClick={() => runBulkAction(verificationCopy.secondAction)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-50">{verificationCopy.secondAction}</button>
                    <button type="button" onClick={() => runBulkAction(verificationCopy.thirdAction)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50">{verificationCopy.thirdAction}</button>
                  </div>
                )}
              </>
            ) : isLiveTab || isRejectedTab ? (
              <button onClick={() => showNotice({ title: 'Bulk Actions', description: `Select specific ${isRejectedTab ? 'rejected' : 'live'} properties from the table before applying bulk changes.`, eyebrow: isRejectedTab ? 'Rejected Properties' : 'Live Properties' })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10255f] px-4 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(16,37,95,0.2)] transition hover:bg-[#0b1b49]">
                Bulk Actions <MoreVertical className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => navigate('/host/list-property')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2f6df6] px-4 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(47,109,246,0.22)] transition hover:bg-[#255fe0]">
                <Plus className="h-4 w-4" /> Add Property
              </button>
            )}
          </div>
        )}
      />
      <Panel className="overflow-hidden p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_160px_150px_auto]">
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder={(isAdminReview || isBranchManagerReview) ? 'Search by property name, host, RM, location or property ID...' : 'Search by property name, location, host, or property ID...'} />
          </div>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-[#2f6df6]" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">All Property Types</option>
            {Array.from(new Set([...propertyTypeOptions, ...filterOptions.propertyTypes])).map((item) => <option key={item} value={item}>{cleanLabel(item)}</option>)}
          </select>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-[#2f6df6]" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">All Cities</option>
            {filterOptions.cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-[#2f6df6]" value={isRejectedTab ? rejectionStageFilter : statusFilter} onChange={(e) => isRejectedTab ? setRejectionStageFilter(e.target.value) : setStatusFilter(e.target.value)}>
            <option value="">{isRejectedTab ? 'All Rejection Stages' : 'All Status'}</option>
            {(isRejectedTab ? rejectionStageOptions : statusOptions).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => { setCategory(''); setHostFilter(''); setBrokerFilter(''); setRmFilter(''); setRejectionStageFilter(''); setDateFrom(''); setDateTo(''); }} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-black transition ${tab === id ? 'bg-[#2f6df6] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All Categories</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="event_venue">Event Venue</option></select>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}><option value="">All Hosts</option>{filterOptions.hosts.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={brokerFilter} onChange={(e) => setBrokerFilter(e.target.value)}><option value="">All Brokers</option>{filterOptions.brokers.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm" value={rmFilter} onChange={(e) => setRmFilter(e.target.value)}><option value="">All RMs</option>{filterOptions.rms.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-xs font-bold text-slate-400 w-24 shrink-0">Created From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
            />
            {dateFrom && <button type="button" onClick={() => setDateFrom('')} className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 ml-1">Clear</button>}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-xs font-bold text-slate-400 w-24 shrink-0">Created To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
            />
            {dateTo && <button type="button" onClick={() => setDateTo('')} className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 ml-1">Clear</button>}
          </div>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {isAdminReview ? (
            <>
              <PropertyMetricCard label="Pending Admin Review" value={verificationStats.pending} helper={`${verificationStats.total ? Math.round((verificationStats.pending / verificationStats.total) * 100) : 0}% of total`} icon={Building2} tone="blue" />
              <PropertyMetricCard label="Approved By Admin" value={verificationStats.verified} helper={`${verificationStats.total ? Math.round((verificationStats.verified / verificationStats.total) * 100) : 0}% of total`} icon={CheckCircle2} tone="emerald" />
              <PropertyMetricCard label="More Info Required" value={verificationStats.sentBack} helper={`${verificationStats.total ? Math.round((verificationStats.sentBack / verificationStats.total) * 100) : 0}% of total`} icon={AlertCircle} tone="amber" />
              <PropertyMetricCard label="Rejected" value={verificationStats.rejected} helper={`${verificationStats.total ? Math.round((verificationStats.rejected / verificationStats.total) * 100) : 0}% of total`} icon={XCircle} tone="rose" />
              <PropertyMetricCard label="Avg Review Time" value="-" helper="Calculated when review SLA data is available" icon={Clock3} tone="violet" />
            </>
          ) : isBranchManagerReview ? (
            <>
              <PropertyMetricCard label="Pending Review" value={verificationStats.pending} helper={`${verificationStats.total ? Math.round((verificationStats.pending / verificationStats.total) * 100) : 0}% of queue`} icon={Users} tone="blue" />
              <PropertyMetricCard label="Approved" value={verificationStats.verified} helper="Moved to admin review" icon={CheckCircle2} tone="emerald" />
              <PropertyMetricCard label="Needs Clarification" value={verificationStats.sentBack} helper="Sent back to RM" icon={RefreshCw} tone="amber" />
              <PropertyMetricCard label="Rejected" value={verificationStats.rejected} helper="Rejected by reviewer" icon={XCircle} tone="rose" />
              <PropertyMetricCard label="Avg Review Time" value={rmPerformance.avgTime} helper="Branch review cycle" icon={Clock3} tone="violet" />
            </>
          ) : isVerificationQueue ? (
            <>
              <PropertyMetricCard label={verificationCopy.totalLabel} value={verificationStats.total} helper="All time" icon={Users} tone="blue" />
              <PropertyMetricCard label={verificationCopy.pendingLabel} value={verificationStats.pending} helper={`${verificationStats.total ? Math.round((verificationStats.pending / verificationStats.total) * 100) : 0}% of total`} icon={Clock3} tone="amber" />
              <PropertyMetricCard label={verificationCopy.verifiedLabel} value={verificationStats.verified} helper={`${verificationStats.total ? Math.round((verificationStats.verified / verificationStats.total) * 100) : 0}% of total`} icon={CheckCircle2} tone="emerald" />
              {isRmVerification && <PropertyMetricCard label={verificationCopy.sentBackLabel} value={verificationStats.sentBack} helper={`${verificationStats.total ? Math.round((verificationStats.sentBack / verificationStats.total) * 100) : 0}% of total`} icon={RefreshCw} tone="violet" />}
              <PropertyMetricCard label="Rejected" value={verificationStats.rejected} helper={`${verificationStats.total ? Math.round((verificationStats.rejected / verificationStats.total) * 100) : 0}% of total`} icon={XCircle} tone="rose" />
              <PropertyMetricCard label="Avg Verification Time" value="-" helper="No data yet" icon={Clock3} tone="violet" />
            </>
          ) : isRejectedTab ? (
            <>
              <PropertyMetricCard label="Total Rejected" value={rejectedStats.total} helper="All time" icon={XCircle} tone="rose" />
              <PropertyMetricCard label="Pending Re-review" value={rejectedStats.pendingReReview} helper={`${rejectedStats.total ? Math.round((rejectedStats.pendingReReview / rejectedStats.total) * 100) : 0}% of total`} icon={RefreshCw} tone="amber" />
              <PropertyMetricCard label="Rejected By Broker" value={rejectedStats.broker} helper={`${rejectedStats.total ? Math.round((rejectedStats.broker / rejectedStats.total) * 100) : 0}% of total`} icon={Users} tone="violet" />
              <PropertyMetricCard label="Rejected By RM" value={rejectedStats.rm} helper={`${rejectedStats.total ? Math.round((rejectedStats.rm / rejectedStats.total) * 100) : 0}% of total`} icon={UserCog} tone="blue" />
              <PropertyMetricCard label="Avg Rejection Time" value="-" helper="Available when SLA data is synced" icon={Clock3} tone="emerald" />
            </>
          ) : isLiveTab ? (
            <>
              <PropertyMetricCard label="Total Live Properties" value={liveStats.totalLive} helper="All time" icon={Building2} tone="emerald" />
              <PropertyMetricCard label="Residential Stays" value={liveStats.residential} helper={`${liveStats.totalLive ? Math.round((liveStats.residential / liveStats.totalLive) * 100) : 0}% of total`} icon={Building2} tone="blue" />
              <PropertyMetricCard label="Workspaces" value={liveStats.workspaces} helper={`${liveStats.totalLive ? Math.round((liveStats.workspaces / liveStats.totalLive) * 100) : 0}% of total`} icon={Users} tone="violet" />
              <PropertyMetricCard label="Event Venues" value={liveStats.eventVenues} helper={`${liveStats.totalLive ? Math.round((liveStats.eventVenues / liveStats.totalLive) * 100) : 0}% of total`} icon={CalendarDays} tone="amber" />
              <PropertyMetricCard label="Total Views (30 Days)" value={liveStats.totalViews ? liveStats.totalViews.toLocaleString('en-IN') : 0} helper="From property analytics when available" icon={Eye} tone="cyan" />
            </>
          ) : isLiveTab ? (
            <>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Live Properties Overview</h3>
                <StatusDonut
                  stats={{ total: liveStats.totalLive, live: liveStats.residential, pending: liveStats.workspaces, rejected: 0, boosted: liveStats.eventVenues }}
                  labels={{ live: 'Residential Stays', pending: 'Workspaces', boosted: 'Event Venues', rejected: 'Other' }}
                />
                <button type="button" className="mt-4 w-full rounded-xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]">View Detailed Analytics</button>
              </Panel>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Top Performing Properties <span className="text-xs font-bold text-slate-400">(This Month)</span></h3>
                <div className="mt-4 grid gap-2">
                  {liveStats.top.map((property, index) => (
                    <div key={property.property_id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eef5ff] text-xs font-black text-[#2f6df6]">{index + 1}</span>
                      <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {getPropertyImage(property) ? <img src={getPropertyImage(property)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Building2 className="m-3 h-4 w-4 text-slate-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">{property.title || property.property_id}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{property.city || '-'}</p>
                      </div>
                      <span className="text-xs font-black text-slate-950">★ {Number(property.rating || property.average_rating || 0).toFixed(1)}</span>
                    </div>
                  ))}
                  {!liveStats.top.length && <p className="text-sm font-semibold text-slate-500">No live property performance data yet.</p>}
                </div>
                <button type="button" className="mt-4 w-full rounded-xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]">View All Rankings</button>
              </Panel>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Quick Actions</h3>
                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => navigate('/host/list-property')} className="flex items-center justify-between rounded-xl bg-[#eef5ff] px-3 py-3 text-left text-sm font-black text-[#2f6df6]"><span>Add New Property</span><Plus className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setTab('boosted')} className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-3 text-left text-sm font-black text-emerald-700"><span>Boost Property</span><ArrowUpRight className="h-4 w-4" /></button>
                  <button type="button" onClick={() => navigate('/admin/reports')} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-3 text-left text-sm font-black text-amber-700"><span>Property Analytics</span><Eye className="h-4 w-4" /></button>
                </div>
              </Panel>
            </>
          ) : (
            <>
              <PropertyMetricCard label="Total Properties" value={stats.total} helper="All properties in system" icon={Building2} tone="blue" />
              <PropertyMetricCard label="Live Properties" value={stats.live} helper="Active and visible" icon={CheckCircle2} tone="emerald" />
              <PropertyMetricCard label="Pending Review" value={stats.pending} helper="Awaiting approval" icon={CalendarDays} tone="amber" />
              <PropertyMetricCard label="Rejected" value={stats.rejected} helper="Did not meet criteria" icon={XCircle} tone="rose" />
              <PropertyMetricCard label="Ranked & Boosted" value={stats.boosted} helper="Promoted properties" icon={ArrowUpRight} tone="cyan" />
            </>
          )}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-base font-black text-slate-950">{isRejectedTab ? 'Rejected Properties' : verificationCopy ? verificationCopy.tableTitle : liveCopy ? liveCopy.tableTitle : 'Properties List'}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">{displayProperties.length} {isRejectedTab ? 'rejected' : (verificationCopy?.tableBadge || liveCopy?.tableBadge)?.toLowerCase() || 'total'}{selectedRows.length ? ` / ${selectedRows.length} selected` : ''}</p>
            </div>
            <div className="relative flex items-center gap-2">
              <button type="button" onClick={() => { setColumnMenuOpen((value) => !value); setTableMenuOpen(false); }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:border-[#2f6df6]/30 hover:bg-[#eef5ff] hover:text-[#2f6df6]" aria-expanded={columnMenuOpen} aria-haspopup="menu">
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </button>
              <button type="button" onClick={() => { setTableMenuOpen((value) => !value); setColumnMenuOpen(false); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-[#2f6df6]/30 hover:bg-[#eef5ff] hover:text-[#2f6df6]" aria-label="More table options" aria-expanded={tableMenuOpen} aria-haspopup="menu">
                <MoreVertical className="h-4 w-4" />
              </button>
              {columnMenuOpen && (
                <div className="absolute right-11 top-11 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.14)]" role="menu">
                  <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Visible columns</p>
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = Object.fromEntries(columnOptions.map(([key]) => [key, true]));
                        localStorage.setItem('xspace360_property_columns', JSON.stringify(defaults));
                        setVisibleColumns(defaults);
                      }}
                      className="text-[11px] font-black text-[#2f6df6]"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid max-h-72 gap-1 overflow-y-auto">
                    {columnOptions.map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" checked={visibleColumns[key] !== false} onChange={() => toggleColumn(key)} className="h-4 w-4 rounded border-slate-300 text-[#2f6df6] focus:ring-[#2f6df6]" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {tableMenuOpen && (
                <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)]" role="menu">
                  <button type="button" onClick={() => { handleExportCSV(); setTableMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> Export current view</button>
                  <button type="button" onClick={() => { load(); setTableMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh data</button>
                  <button type="button" onClick={() => { resetPropertyFilters(); setTableMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Filter className="h-4 w-4" /> Reset filters</button>
                </div>
              )}
            </div>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  {isVerificationQueue && (
                    <th className="w-10 px-4 py-4 font-bold">
                      <input
                        aria-label="Select all submitted properties on this page"
                        type="checkbox"
                        checked={pagedProperties.length > 0 && pagedProperties.every((property) => selectedRows.includes(property.property_id))}
                        onChange={togglePageSelection}
                        className="h-4 w-4 rounded border-slate-300 text-[#2f6df6] focus:ring-[#2f6df6]"
                      />
                    </th>
                  )}
                  {columnOptions.filter(([key]) => visibleColumns[key] !== false).map(([, label]) => (
                    <th key={label} className="px-4 py-4 font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!pagedProperties.length && (
                  <tr>
                    <td colSpan={activeColumnCount + (isVerificationQueue ? 1 : 0)} className="px-4 py-12 text-center">
                      <p className="text-base font-black text-slate-950">No properties found</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                )}
                {pagedProperties.map((property) => (
                  <tr key={property.property_id} className="transition hover:bg-slate-50/70">
                    {isVerificationQueue && (
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Select ${property.title || property.property_id}`}
                          type="checkbox"
                          checked={selectedRows.includes(property.property_id)}
                          onChange={() => toggleRowSelection(property.property_id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#2f6df6] focus:ring-[#2f6df6]"
                        />
                      </td>
                    )}
                    {isRejectedTab ? (
                      <>
                        {visibleColumns.property !== false && <td className="px-4 py-4"><p className="font-mono text-xs font-black text-slate-800">{property.property_id}</p><p className="mt-1 text-[11px] font-bold text-slate-500">Submitted on {asDate(property.submitted_at || property.created_at)}</p></td>}
                        {visibleColumns.host !== false && <td className="px-4 py-4"><PropertyIdentityCell property={property} showThumbnail /></td>}
                        {visibleColumns.type !== false && <td className="px-4 py-4"><p className="font-bold">{property.host_name || property.owner_name || '-'}</p><p className="text-xs font-semibold text-slate-500">{property.host_mobile || property.phone || property.mobile || ''}</p></td>}
                        {visibleColumns.category !== false && <td className="px-4 py-4"><span className="inline-flex rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-inset ring-red-100">{getRejectionStage(property)}</span></td>}
                        {visibleColumns.city !== false && <td className="px-4 py-4"><p className="font-bold">{getRejectedBy(property)}</p><p className="text-xs font-semibold text-slate-500">{property.rejected_by_role || cleanLabel(property.updated_by_role || '')}</p></td>}
                        {visibleColumns.broker !== false && <td className="max-w-[260px] px-4 py-4"><p className="line-clamp-2 font-bold text-slate-700">{getRejectionReason(property)}</p></td>}
                        {visibleColumns.submitted !== false && <td className="px-4 py-4"><p className="font-bold">{asDate(property.rejected_at || property.reviewed_at || property.updated_at || property.created_at)}</p><p className="text-xs font-semibold text-slate-500">{property.rejected_time || ''}</p></td>}
                        {visibleColumns.actions !== false && <td className="px-4 py-4"><PropertyActions property={property} tab={tab} onReview={openProperty} onAssign={assignTeam} onStatus={changeStatus} onDelete={deleteRejectedProperty} onEdit={editProperty} onBoost={setBoostProperty} /></td>}
                      </>
                    ) : (
                      <>
                        {visibleColumns.property !== false && <td className="px-4 py-4"><PropertyIdentityCell property={property} showThumbnail={isVerificationQueue || isLiveTab} /></td>}
                        {visibleColumns.host !== false && <td className="px-4 py-4"><p className="font-bold">{property.host_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.owner_id}</p></td>}
                        {visibleColumns.type !== false && <td className="px-4 py-4 capitalize">{String(property.property_type || property.bhk_type || '-').replace(/_/g, ' ')}</td>}
                        {visibleColumns.category !== false && <td className="px-4 py-4 capitalize">{property.category}</td>}
                        {visibleColumns.city !== false && <td className="px-4 py-4">{property.city}</td>}
                        {visibleColumns.broker !== false && <td className="px-4 py-4"><p className="font-bold">{property.broker_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.broker_code || property.assigned_broker || '-'}</p></td>}
                        {visibleColumns.rm !== false && <td className="px-4 py-4"><p className="font-bold">{property.rm_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.rm_code || property.assigned_rm || '-'}</p></td>}
                        {visibleColumns.branchManager !== false && <td className="px-4 py-4"><p className="font-bold">{property.branch_manager_name || '-'}</p><p className="font-mono text-xs text-slate-500">{property.branch_manager_code || property.assigned_branch_manager || '-'}</p></td>}
                        {visibleColumns.stage !== false && <td className="px-4 py-4"><StatusBadge value={normalizeStatus(property.status)} /></td>}
                        {visibleColumns.subscription !== false && <td className="px-4 py-4">{property.subscription_status || '-'}</td>}
                        {isLiveTab && visibleColumns.rating !== false && <td className="px-4 py-4"><RatingCell property={property} /></td>}
                        {visibleColumns.submitted !== false && <td className="px-4 py-4"><p className="font-bold">{asDate(property.submitted_at || property.created_at || property.updated_at)}</p><p className="text-xs font-semibold text-slate-500">{property.submitted_at ? asDate(property.updated_at) : ''}</p></td>}
                        {visibleColumns.price !== false && <td className="px-4 py-4">{formatMoney(property.price_per_night || 0)}</td>}
                        {visibleColumns.actions !== false && <td className="px-4 py-4"><PropertyActions property={property} tab={tab} onReview={openProperty} onAssign={assignTeam} onStatus={changeStatus} onDelete={deleteRejectedProperty} onEdit={editProperty} onBoost={setBoostProperty} /></td>}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {!pagedProperties.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <p className="font-black text-slate-950">No properties found</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Try adjusting your search or filters.</p>
              </div>
            )}
            {pagedProperties.map((property) => <Panel key={property.property_id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1.5"><p className="font-black">{property.title}</p>{property.is_boosted && <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 ring-1 ring-inset ring-amber-600/20">BOOSTED #{property.boost_rank || '1'}</span>}</div><p className="text-xs text-slate-500">{property.property_id}</p></div><StatusBadge value={normalizeStatus(property.status)} /></div><p className="mt-2 text-sm">{property.city} / {property.category}</p><div className="mt-3 grid gap-1 text-xs text-slate-500"><p><b>Broker:</b> {property.broker_name || '-'} / {property.broker_code || '-'}</p><p><b>RM:</b> {property.rm_name || '-'} / {property.rm_code || '-'}</p><p><b>BM:</b> {property.branch_manager_name || '-'} / {property.branch_manager_code || '-'}</p></div><div className="mt-3"><PropertyActions property={property} tab={tab} onReview={openProperty} onAssign={assignTeam} onStatus={changeStatus} onDelete={deleteRejectedProperty} onEdit={editProperty} onBoost={setBoostProperty} /></div></Panel>)}
          </div>
        </Panel>
        <div className="grid content-start gap-4">
          {isRejectedTab ? (
            <>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Rejection Overview</h3>
                <StatusDonut
                  stats={{ total: rejectedStats.total, live: rejectedStats.broker, pending: rejectedStats.rm, rejected: rejectedStats.branch, boosted: rejectedStats.admin }}
                  labels={{ live: 'Broker Verification', pending: 'RM Verification', boosted: 'Admin Review', rejected: 'Branch Manager Review' }}
                />
              </Panel>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Rejection Reasons <span className="text-xs font-bold text-slate-400">(Top 5)</span></h3>
                <div className="mt-4 grid gap-2">
                  {rejectedStats.topReasons.map(([reason, count], index) => (
                    <div key={reason} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${index === 0 ? 'bg-red-50 text-red-700' : index === 1 ? 'bg-amber-50 text-amber-700' : 'bg-[#eef5ff] text-[#2f6df6]'}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black text-slate-800">{reason}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{count} properties ({rejectedStats.total ? Math.round((count / rejectedStats.total) * 100) : 0}%)</p>
                      </div>
                    </div>
                  ))}
                  {!rejectedStats.topReasons.length && <p className="text-sm font-semibold text-slate-500">No rejection reasons recorded yet.</p>}
                </div>
                <button type="button" onClick={() => navigate('/admin/reports?tab=rejected-properties')} className="mt-4 w-full rounded-xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]">View All Reasons</button>
              </Panel>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Quick Actions</h3>
                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => showNotice({ title: 'Send for Re-review', description: 'Select rejected properties and use Re-review to move them back into review.', eyebrow: 'Rejected Properties' })} className="flex items-center justify-between rounded-xl bg-[#eef5ff] px-3 py-3 text-left text-sm font-black text-[#2f6df6]"><span>Send for Re-review</span><ArrowUpRight className="h-4 w-4" /></button>
                  <button type="button" onClick={() => navigate('/admin/reports?tab=rejections')} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-700"><span>View Rejected Reports</span><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={handleExportCSV} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-3 text-left text-sm font-black text-amber-700"><span>Export Rejected List</span><Download className="h-4 w-4" /></button>
                </div>
              </Panel>
            </>
          ) : isVerificationQueue ? (
            <>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">{verificationCopy.overviewTitle}</h3>
                <StatusDonut
                  stats={{ total: verificationStats.total, live: verificationStats.verified, pending: verificationStats.pending, rejected: verificationStats.rejected, boosted: verificationStats.sentBack }}
                  labels={isAdminReview ? { live: 'Approved', pending: 'Pending', boosted: 'More Info', rejected: 'Rejected' } : isBranchManagerReview ? { live: 'Approved', pending: 'Pending', boosted: 'Needs Clarification', rejected: 'Rejected' } : { live: 'Verified', pending: 'Pending', boosted: 'Sent Back', rejected: 'Rejected' }}
                />
              </Panel>
              {isBrokerVerification ? <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">{verificationCopy.performanceTitle}</h3>
                <div className="mt-4 grid gap-2">
                  {topBrokers.map((broker, index) => (
                    <div key={broker.key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${index < 3 ? 'bg-amber-50 text-amber-700' : 'bg-[#eef5ff] text-[#2f6df6]'}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">{broker.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{broker.code}</p>
                      </div>
                      <span className="text-sm font-black text-slate-950">{broker.count}</span>
                    </div>
                  ))}
                  {!topBrokers.length && <p className="text-sm font-semibold text-slate-500">No broker submissions yet.</p>}
                </div>
              </Panel> : isBranchManagerReview ? <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">{verificationCopy.performanceTitle}</h3>
                <div className="mt-4 grid gap-2">
                  {topRms.map((rm, index) => (
                    <div key={rm.key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${index < 3 ? 'bg-blue-50 text-[#2f6df6]' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">{rm.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{rm.code}</p>
                      </div>
                      <span className="text-sm font-black text-slate-950">{rm.count}</span>
                    </div>
                  ))}
                  {!topRms.length && <p className="text-sm font-semibold text-slate-500">No RM review records yet.</p>}
                </div>
              </Panel> : isAdminReview ? <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">{verificationCopy.performanceTitle} <span className="text-xs font-bold text-slate-400">(This Month)</span></h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <SummaryRow label="Total Reviewed" value={rmPerformance.totalReviewed} />
                  <SummaryRow label="Avg Review Time" value="-" />
                  <SummaryRow label="Approved" value={verificationStats.verified} />
                  <SummaryRow label="Rejected" value={verificationStats.rejected} />
                  <SummaryRow label="More Info" value={verificationStats.sentBack} />
                </div>
                <button type="button" className="mt-4 w-full rounded-xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]">View Full Report</button>
              </Panel> : <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">{verificationCopy.performanceTitle} <span className="text-xs font-bold text-slate-400">(This Month)</span></h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <SummaryRow label="Total Reviewed" value={rmPerformance.totalReviewed} />
                  <SummaryRow label="Avg Verification Time" value={rmPerformance.avgTime} />
                  <SummaryRow label="On Time" value={rmPerformance.onTime} />
                  <SummaryRow label="Delayed" value={rmPerformance.delayed} />
                </div>
                <button type="button" className="mt-4 w-full rounded-xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]">View Full Report</button>
              </Panel>}
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Quick Actions</h3>
                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={() => runBulkAction(verificationCopy.firstAction)} className="flex items-center justify-between rounded-xl bg-[#eef5ff] px-3 py-3 text-left text-sm font-black text-[#2f6df6]"><span>{verificationCopy.firstAction}</span><ArrowUpRight className="h-4 w-4" /></button>
                  <button type="button" onClick={() => runBulkAction(verificationCopy.secondAction)} className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-3 text-left text-sm font-black text-emerald-700"><span>{verificationCopy.secondAction}</span><CheckCircle2 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => runBulkAction(verificationCopy.thirdAction)} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-3 text-left text-sm font-black text-red-700"><span>{verificationCopy.thirdAction}</span><XCircle className="h-4 w-4" /></button>
                </div>
              </Panel>
            </>
          ) : (
            <>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Quick Summary</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <SummaryRow label="Total Cities" value={stats.cities} />
                  <SummaryRow label="Total Property Types" value={stats.propertyTypes} />
                  <SummaryRow label="Active Hosts" value={filterOptions.hosts.length} />
                  <SummaryRow label="Avg. Price / Night" value={formatMoney(stats.averagePrice)} />
                </div>
              </Panel>
              <Panel className="p-4">
                <h3 className="text-base font-black text-slate-950">Property Status</h3>
                <StatusDonut stats={stats} />
              </Panel>
              <Panel className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-slate-950">Recent Activity</h3>
                  <button type="button" className="text-xs font-black text-[#2f6df6]">View All</button>
                </div>
                <div className="mt-4 grid gap-3">
                  {recentActivity.map((item) => <ActivityRow key={item.id} item={item} />)}
                  {!recentActivity.length && <p className="text-sm font-semibold text-slate-500">No property activity yet.</p>}
                </div>
              </Panel>
            </>
          )}
        </div>
        </div>
        <Pagination currentPage={page} totalItems={displayProperties.length} itemsPerPage={10} onPageChange={setPage} />
        </div>
      )}
      {selected.property && (
        <Modal title="Property Verification Review" onClose={() => setSelected({ loading: false, property: null, error: '' })}>
          <PropertyReviewPanel selected={selected} onClose={() => setSelected({ loading: false, property: null, error: '' })} onChecklist={updateChecklist} onStage={updateStage} onFinal={finalStatus} onEdit={editProperty} />
        </Modal>
      )}
      {boostProperty && (
        <BoostModal 
          property={boostProperty} 
          properties={state.properties} 
          onClose={() => setBoostProperty(null)} 
          onSuccess={() => {
            setBoostProperty(null);
            load();
          }} 
        />
      )}
    </div>
  );
};

const PropertyMetricCard = ({ label, value, helper, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Panel>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
    <span className="text-xs font-bold text-slate-500">{label}</span>
    <span className="text-sm font-black text-slate-950">{value}</span>
  </div>
);

const StatusDonut = ({ stats, labels = {} }) => {
  const total = Math.max(stats.total, 1);
  const live = Math.round((stats.live / total) * 100);
  const pending = Math.round((stats.pending / total) * 100);
  const rejected = Math.round((stats.rejected / total) * 100);
  const background = `conic-gradient(#22c55e 0 ${live}%, #f59e0b ${live}% ${live + pending}%, #ef4444 ${live + pending}% ${live + pending + rejected}%, #8b5cf6 ${live + pending + rejected}% 100%)`;
  const rows = [
    [labels.live || 'Live', stats.live, live, 'bg-emerald-500'],
    [labels.pending || 'Pending Review', stats.pending, pending, 'bg-amber-500'],
    [labels.rejected || 'Rejected', stats.rejected, rejected, 'bg-red-500'],
    [labels.boosted || 'Ranked & Boosted', stats.boosted, total ? Math.round((stats.boosted / total) * 100) : 0, 'bg-violet-500'],
  ];
  return (
    <div className="mt-4">
      <div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background }}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-sm">
          <div><p className="text-xl font-black text-slate-950">{stats.total}</p><p className="text-xs font-bold text-slate-500">Total</p></div>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map(([label, count, percent, color]) => (
          <div key={label} className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <span className="flex-1">{label}</span>
            <span className="text-slate-950">{count}</span>
            <span className="text-slate-400">{percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityRow = ({ item }) => (
  <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef5ff] text-[#2f6df6]">
      <Building2 className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-black text-slate-950">{item.status}</p>
      <p className="truncate text-xs font-semibold text-slate-500">{item.title}</p>
    </div>
    <span className="text-[11px] font-bold text-slate-400">{item.time}</span>
  </div>
);

const RatingCell = ({ property }) => {
  const rating = Number(property.rating || property.average_rating || property.guest_rating || 0);
  const reviews = Number(property.review_count || property.reviews_count || property.total_reviews || 0);
  if (!rating) {
    return (
      <div>
        <p className="text-xs font-black text-slate-500">Not rated</p>
        <p className="text-[11px] font-semibold text-slate-400">0 reviews</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-black text-slate-950"><span className="text-amber-500">★</span> {rating.toFixed(1)}</p>
      <p className="text-[11px] font-semibold text-slate-500">({reviews} reviews)</p>
    </div>
  );
};

const PropertyIdentityCell = ({ property, showThumbnail = false }) => {
  const thumbnail = getPropertyImage(property);
  const subtitle = property.bhk_configuration || property.bhk_type || property.property_type || property.category || '';

  return (
    <div className={`flex ${showThumbnail ? 'items-center gap-3' : 'items-start gap-0'}`}>
      {showThumbnail && (
        <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="h-5 w-5 text-slate-300" />
          )}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-black text-slate-950">{property.title || '-'}</p>
          {property.is_boosted && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 ring-1 ring-inset ring-amber-600/20">
              BOOSTED #{property.boost_rank || '1'}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-xs font-bold capitalize text-slate-500">{cleanLabel(subtitle)}</p>}
        <p className="mt-0.5 font-mono text-xs text-slate-500">{property.property_id}</p>
      </div>
    </div>
  );
};

const PropertyActions = ({ property, tab, onReview, onAssign, onStatus, onDelete, onEdit, onBoost }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isRejected = tab === 'rejected' || String(property.status || '').toLowerCase() === 'rejected';
  const isBrokerVerification = tab === 'broker_verification';
  const isRmVerification = tab === 'rm_verification';
  const isBranchManagerReview = tab === 'branch_manager_review';
  const isAdminReview = tab === 'admin_review';
  const isVerificationQueue = isBrokerVerification || isRmVerification || isBranchManagerReview || isAdminReview;

  if (isVerificationQueue) {
    const closeAndRun = (handler) => {
      setMenuOpen(false);
      handler();
    };
    const approveStatus = isAdminReview ? 'live' : 'approved';
    const sendBackStatus = isAdminReview ? 'under_review' : 'pending';
    const approveLabel = isAdminReview ? 'Approve & Make Live' : isBranchManagerReview ? 'Approve to Admin Review' : isRmVerification ? 'Verify by RM' : 'Approve';
    const sendBackLabel = isAdminReview ? 'Request More Information' : isBranchManagerReview ? 'Send Back to RM' : 'Send Back to Broker';

    return (
      <div className="relative flex items-center gap-2">
        <button onClick={() => onReview(property)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#2f6df6]/30 hover:bg-[#eef5ff] hover:text-[#2f6df6]" aria-label={`View ${property.title || property.property_id}`}>
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#2f6df6]/30 hover:bg-[#eef5ff] hover:text-[#2f6df6]" aria-label={`More actions for ${property.title || property.property_id}`} aria-expanded={menuOpen} aria-haspopup="menu">
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)]" role="menu">
            <button type="button" onClick={() => closeAndRun(() => onReview(property))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" /> View Property</button>
            <button type="button" onClick={() => closeAndRun(() => onEdit(property))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Edit Property</button>
            <button type="button" onClick={() => closeAndRun(() => onAssign(property))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><UserCog className="h-4 w-4" /> Assign Reviewer</button>
            <button type="button" onClick={() => closeAndRun(() => onStatus(property, approveStatus))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /> {approveLabel}</button>
            {(isRmVerification || isBranchManagerReview || isAdminReview) && <button type="button" onClick={() => closeAndRun(() => onStatus(property, sendBackStatus))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-amber-700 hover:bg-amber-50"><RefreshCw className="h-4 w-4" /> {sendBackLabel}</button>}
            {isBranchManagerReview && <button type="button" onClick={() => closeAndRun(() => onStatus(property, 'pending'))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-blue-700 hover:bg-blue-50"><AlertCircle className="h-4 w-4" /> Request Clarification</button>}
            <button type="button" onClick={() => closeAndRun(() => onStatus(property, 'rejected'))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"><XCircle className="h-4 w-4" /> Reject</button>
            {!(isBranchManagerReview || isAdminReview) && <button type="button" onClick={() => closeAndRun(() => onBoost(property))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-amber-700 hover:bg-amber-50"><ArrowUpRight className="h-4 w-4" /> Rank / Boost</button>}
          </div>
        )}
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onReview(property)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#2f6df6]/30 hover:bg-[#eef5ff] hover:text-[#2f6df6]" aria-label={`View ${property.title || property.property_id}`}>
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => onStatus(property, 'under_review')} className="rounded-xl border border-[#cfe0ff] bg-[#eef5ff] px-3 py-2 text-xs font-black text-[#2f6df6] hover:bg-[#dfeaff]">
          Re-review
        </button>
        <button onClick={() => onDelete(property)} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => onReview(property)} className="rounded-xl bg-[#2f6df6] px-2.5 py-1.5 text-xs font-bold text-white">Review</button>
      <button onClick={() => onEdit(property)} className="rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600">Edit</button>
      <button onClick={() => onAssign(property)} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Assign</button>
      <button onClick={() => onStatus(property, 'live')} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Live</button>
      <button onClick={() => onStatus(property, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
      <button onClick={() => onBoost(property)} className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${property.is_boosted ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}>
        ⚡ {property.is_boosted ? `Boosted #${property.boost_rank || '1'}` : 'Boost'}
      </button>
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
  const isLive = property.status === 'live';
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
            <button onClick={() => onFinal('live')} disabled={isLive || !review.summary?.ready_for_live} className="rounded-xl bg-[#2f6df6] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{isLive ? 'Already Live' : 'Publish Live'}</button>
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

const StageRow = ({ stage, data, onStage }) => {
  const status = data?.status || 'pending';
  const isClosed = status === 'approved' || status === 'rejected';
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-sm font-black capitalize">{stage.replace(/_/g, ' ')}</p><StatusBadge value={status} /></div>
      {data?.remarks && <p className="mt-2 text-xs text-slate-500">{data.remarks}</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={isClosed} onClick={() => onStage(stage, 'approved')} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6] disabled:cursor-not-allowed disabled:opacity-40">Approve</button>
        <button disabled={isClosed} onClick={() => onStage(stage, 'rejected')} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Reject</button>
      </div>
    </div>
  );
};

const BoostModal = ({ property, properties, onClose, onSuccess }) => {
  const [rank, setRank] = useState(property.boost_rank || 1);
  const [duration, setDuration] = useState(property.boost_expires_at ? '7' : 'permanent');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categoryProperties = properties.filter(p => p.category === property.category && p.property_id !== property.property_id);
  const occupiedRanks = categoryProperties.filter(p => p.is_boosted).map(p => ({ rank: p.boost_rank, title: p.title }));
  const occupiedMap = occupiedRanks.reduce((acc, curr) => {
    acc[curr.rank] = curr.title;
    return acc;
  }, {});

  const handleSetBoost = async () => {
    setError('');
    if (occupiedMap[rank]) {
      setError(`Rank #${rank} is already occupied by "${occupiedMap[rank]}". You must stop its boost first.`);
      return;
    }

    setSubmitting(true);
    try {
      const boost_days = duration === 'permanent' ? null : parseInt(duration);
      await adminPhase1API.updatePropertyBoost(property.property_id, {
        is_boosted: true,
        boost_rank: parseInt(rank),
        boost_days
      });
      await showNotice({
        title: 'Boost Configured',
        description: `Successfully pinned to Rank #${rank} for ${boost_days ? `${boost_days} days` : 'permanent duration'}.`,
        eyebrow: 'Action Completed'
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update property boost settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopBoost = async () => {
    setError('');
    setSubmitting(true);
    try {
      await adminPhase1API.updatePropertyBoost(property.property_id, {
        is_boosted: false
      });
      await showNotice({
        title: 'Boost Stopped',
        description: 'Successfully removed priorities and disabled boost for this property.',
        eyebrow: 'Action Completed'
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to stop property boost.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-elevated">
        <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
          <span>⚡ Boost Settings</span>
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500 leading-normal">
          Configure search priority rank and duration for:
        </p>
        <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 border border-slate-100">
          {property.title} <span className="block mt-1 font-mono text-xs text-slate-500 font-bold capitalize">{property.category.replace(/_/g, ' ')}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 border border-red-100 text-xs font-bold text-red-700 leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Priority Rank Slot</label>
            <select
              value={rank}
              onChange={(e) => setRank(parseInt(e.target.value))}
              className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-[#2f6df6]/20 focus:border-[#2f6df6]"
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  Rank #{r} {occupiedMap[r] ? `(Occupied by: ${occupiedMap[r]})` : '(Available)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Boost Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-[#2f6df6]/20 focus:border-[#2f6df6]"
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="permanent">Permanent / Infinite</option>
            </select>
          </div>
        </div>

        {occupiedRanks.length > 0 && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Currently Boosted in {property.category.replace(/_/g, ' ')}</span>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {occupiedRanks.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Rank #{item.rank}</span>
                  <span className="truncate max-w-[200px] text-slate-800 font-semibold">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-11 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          
          {property.is_boosted && (
            <button
              onClick={handleStopBoost}
              disabled={submitting}
              className="h-11 px-4 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
            >
              {submitting ? 'Stopping...' : 'Stop Boost'}
            </button>
          )}

          <button
            onClick={handleSetBoost}
            disabled={submitting}
            className="h-11 px-5 rounded-xl text-xs font-bold bg-[#2f6df6] text-white hover:bg-[#1a55db] transition shadow-sm cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Set Boost'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyOperations;
