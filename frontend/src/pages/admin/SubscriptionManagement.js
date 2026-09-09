import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  CreditCard,
  CircleOff,
  Columns3,
  Download,
  Eye,
  Filter,
  IndianRupee,
  LayoutGrid,
  MoreHorizontal,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { adminPhase1API } from '../../services/adminPhase1Api';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { ErrorState, showNotice } from './shared';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const STATUS_ORDER = ['active', 'trial', 'expired', 'cancelled'];
const SECTION_OPTIONS = [
  { id: 'all', label: 'All Subscriptions' },
  { id: 'plans', label: 'Plan Management' },
  { id: 'addons', label: 'Add-on Management' },
  { id: 'payments', label: 'Payment History' },
  { id: 'reminders', label: 'Renewal Reminders' },
  { id: 'archived', label: 'Cancelled / Expired' },
];
const STATUS_LABELS = {
  active: 'Active',
  trial: 'Trial',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
const CATEGORY_LABELS = {
  residential: 'Residential Stays',
  commercial: 'Workspaces',
  event_venue: 'Event Venues',
};
const PROPERTY_TYPE_LABELS = {
  apartment: 'Apartment',
  villa: 'Villa',
  bungalow: 'Bungalow',
  studio: 'Studio',
  independent_house: 'Independent House',
  co_living: 'Co-living',
  private_office: 'Private Office',
  co_working: 'Co-working',
  meeting_room: 'Meeting Room',
  conference_room: 'Conference Room',
  banquet_hall: 'Banquet Hall',
  hotel_ballroom: 'Hotel Ballroom',
  resort: 'Resort',
  wedding_venue: 'Wedding Venue',
  farmhouse: 'Farmhouse',
  rooftop: 'Rooftop',
};
const STATUS_TONES = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trial: 'border-violet-200 bg-violet-50 text-violet-700',
  expired: 'border-orange-200 bg-orange-50 text-orange-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};
const STATUS_COLORS = {
  active: '#16A34A',
  trial: '#8B5CF6',
  expired: '#F97316',
  cancelled: '#EF4444',
};
const COLUMN_OPTIONS = [
  { key: 'subscription', label: 'Subscription ID' },
  { key: 'host', label: 'Host / Owner' },
  { key: 'property', label: 'Property' },
  { key: 'plan', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'nextRenewal', label: 'Next Renewal' },
  { key: 'rm', label: 'RM' },
  { key: 'actions', label: 'Actions' },
];
const TRIAL_COLUMN_OPTIONS = [
  { key: 'subscription', label: 'Subscription ID' },
  { key: 'host', label: 'Host / Owner' },
  { key: 'property', label: 'Property' },
  { key: 'plan', label: 'Plan (Trial)' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'nextRenewal', label: 'Expiry Date' },
  { key: 'rm', label: 'RM' },
  { key: 'actions', label: 'Actions' },
];
const ACTIVE_COLUMN_OPTIONS = [
  { key: 'subscription', label: 'Subscription ID' },
  { key: 'host', label: 'Host / Owner' },
  { key: 'property', label: 'Property' },
  { key: 'plan', label: 'Plan' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'nextRenewal', label: 'Next Renewal' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'rm', label: 'RM' },
  { key: 'actions', label: 'Actions' },
];
const ARCHIVED_COLUMN_OPTIONS = [
  { key: 'subscription', label: 'Subscription ID' },
  { key: 'host', label: 'Host / Owner' },
  { key: 'property', label: 'Property' },
  { key: 'plan', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'nextRenewal', label: 'End Date' },
  { key: 'reason', label: 'Reason' },
  { key: 'actions', label: 'Actions' },
];
const PLAN_COLUMN_OPTIONS = [
  { key: 'name', label: 'Plan Name' },
  { key: 'type', label: 'Type' },
  { key: 'targetUsers', label: 'Target Users' },
  { key: 'duration', label: 'Duration' },
  { key: 'price', label: 'Price' },
  { key: 'limit', label: 'Properties Limit' },
  { key: 'features', label: 'Features' },
  { key: 'status', label: 'Status' },
  { key: 'subscribers', label: 'Subscribers' },
  { key: 'actions', label: 'Actions' },
];
const ADDON_COLUMN_OPTIONS = [
  { key: 'name', label: 'Add-on Name' },
  { key: 'category', label: 'Category' },
  { key: 'applicableTo', label: 'Applicable To' },
  { key: 'price', label: 'Price' },
  { key: 'billingCycle', label: 'Billing Cycle' },
  { key: 'status', label: 'Status' },
  { key: 'users', label: 'Users' },
  { key: 'actions', label: 'Actions' },
];
const PAYMENT_COLUMN_OPTIONS = [
  { key: 'transaction', label: 'Transaction ID' },
  { key: 'dateTime', label: 'Date & Time' },
  { key: 'host', label: 'Host / User' },
  { key: 'plan', label: 'Plan / Add-on' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'status', label: 'Status' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'actions', label: 'Actions' },
];
const REMINDER_COLUMN_OPTIONS = [
  { key: 'subscription', label: 'Subscription ID' },
  { key: 'host', label: 'Host / Owner' },
  { key: 'property', label: 'Property' },
  { key: 'plan', label: 'Plan' },
  { key: 'nextRenewal', label: 'Current End Date' },
  { key: 'daysLeft', label: 'Days Left' },
  { key: 'autoRenew', label: 'Auto Renew' },
  { key: 'status', label: 'Status' },
  { key: 'lastReminder', label: 'Last Reminder' },
  { key: 'actions', label: 'Actions' },
];
const ADDON_FALLBACKS = [
  { id: 'addon-featured-listing', name: 'Featured Listing', description: 'Get higher visibility in search results', category: 'visibility', applicableTo: 'All Plans', price: 2999, billingCycle: 'monthly', status: 'active', users: 428, revenue: 1283172 },
  { id: 'addon-top-search', name: 'Top Search Placement', description: 'Show at top of search results', category: 'visibility', applicableTo: 'All Plans', price: 4999, billingCycle: 'monthly', status: 'active', users: 312, revenue: 1102488 },
  { id: 'addon-verified-badge', name: 'Verified Badge', description: 'Show verified badge on listing', category: 'trust', applicableTo: 'All Plans', price: 1999, billingCycle: 'monthly', status: 'active', users: 276, revenue: 550724 },
  { id: 'addon-additional-photos', name: 'Additional Photos', description: 'Upload extra photos beyond limit', category: 'content', applicableTo: 'Basic, Standard', price: 499, billingCycle: 'one_time', status: 'active', users: 189, revenue: 94311 },
  { id: 'addon-virtual-tour', name: '360° Virtual Tour', description: 'Add virtual tour to your property', category: 'content', applicableTo: 'Premium, Enterprise', price: 3999, billingCycle: 'one_time', status: 'active', users: 142, revenue: 567858 },
  { id: 'addon-priority-support', name: 'Priority Support', description: 'Get faster support response', category: 'support', applicableTo: 'All Plans', price: 1499, billingCycle: 'monthly', status: 'active', users: 208, revenue: 311792 },
  { id: 'addon-analytics-pro', name: 'Analytics Pro', description: 'Advanced analytics and reports', category: 'analytics', applicableTo: 'Commercial, Enterprise', price: 2499, billingCycle: 'monthly', status: 'active', users: 96, revenue: 239904 },
  { id: 'addon-multi-property', name: 'Multi-Property Management', description: 'List more properties beyond limit', category: 'limit_increase', applicableTo: 'All Plans', price: 999, billingCycle: 'monthly', status: 'active', users: 154, revenue: 153846 },
  { id: 'addon-custom-branding', name: 'Custom Branding', description: 'Add your brand logo to listings', category: 'branding', applicableTo: 'Premium, Enterprise', price: 3499, billingCycle: 'monthly', status: 'inactive', users: 18, revenue: 62982 },
  { id: 'addon-api-access', name: 'API Access', description: 'Access via API for integration', category: 'integration', applicableTo: 'Enterprise', price: 9999, billingCycle: 'monthly', status: 'inactive', users: 6, revenue: 59994 },
  { id: 'addon-content-booster', name: 'Content Booster', description: 'Improve listing copy and media quality', category: 'content', applicableTo: 'Standard, Premium', price: 1299, billingCycle: 'monthly', status: 'active', users: 88, revenue: 114312 },
  { id: 'addon-review-amplifier', name: 'Review Amplifier', description: 'Promote best guest reviews on listing', category: 'branding', applicableTo: 'All Plans', price: 799, billingCycle: 'monthly', status: 'draft', users: 0, revenue: 0 },
];
const PAYMENT_STATUS_TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  refunded: 'border-orange-200 bg-orange-50 text-orange-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
};
const DEFAULT_VISIBLE_COLUMNS = COLUMN_OPTIONS.reduce((acc, column) => ({ ...acc, [column.key]: true }), {});
const ADVANCED_FILTER_DEFAULTS = {
  billingCycle: '',
  hostQuery: '',
  city: '',
  state: '',
  startFrom: '',
  startTo: '',
  renewalFrom: '',
  renewalTo: '',
  amountMin: '',
  amountMax: '',
  autoRenew: '',
  monetizationType: '',
};
const REVENUE_PERIODS = [
  { value: 'this_month', label: 'This Month', months: 1 },
  { value: 'last_3_months', label: 'Last 3 Months', months: 3 },
  { value: 'last_6_months', label: 'Last 6 Months', months: 6 },
  { value: 'this_year', label: 'This Year', months: 12 },
];
const ACTION_REQUIREMENTS = {
  view: 'subscription_management.view',
  export: 'subscription_management.export',
  edit: 'subscription_management.edit',
  create: 'subscription_management.create',
  bulk: 'subscription_management.edit',
  analytics: 'subscription_management.view_financial_data',
};

const formatCurrencyINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const createInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(String(value));
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
};

const formatDateValue = (value, pattern = 'dd MMM yyyy') => {
  const date = toDate(value);
  return date ? format(date, pattern) : '-';
};

const daysUntil = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
};

const formatRelativeRenewal = (value, status) => {
  if (!value || status === 'cancelled') {
    return { label: '-', tone: 'text-slate-400' };
  }
  const diff = daysUntil(value);
  if (diff === null) return { label: '-', tone: 'text-slate-400' };
  if (diff < 0) return { label: 'Expired', tone: 'text-rose-600' };
  if (diff === 0) return { label: 'Today', tone: 'text-amber-600' };
  return { label: `In ${diff} days`, tone: diff <= 15 ? 'text-amber-600' : 'text-emerald-600' };
};

const getLifecycleLabel = (subscription) => {
  if (subscription.status === 'trial') return 'Trial';
  if (subscription.status === 'expired') return 'Expired';
  if (subscription.status === 'cancelled') return 'Cancelled';
  return subscription.autoRenew ? 'Auto-renew' : 'Manual renewal';
};

const buildCsv = (rows) => {
  const headers = ['Subscription ID', 'Host', 'Email', 'Property', 'Plan', 'Amount', 'Status', 'Start Date', 'Next Renewal', 'RM'];
  const dataRows = rows.map((row) => [
    row.subscriptionCode,
    row.host.name,
    row.host.email || '',
    row.property.name,
    row.plan.name,
    row.amount,
    STATUS_LABELS[row.status] || row.status,
    formatDateValue(row.startDate),
    formatDateValue(row.nextRenewalDate),
    row.rm?.name || '',
  ]);
  return [headers, ...dataRows]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

const buildPaymentCsv = (rows) => {
  const headers = ['Transaction ID', 'Date & Time', 'Host / User', 'Email', 'Plan / Add-on', 'Amount', 'Payment Method', 'Status', 'Invoice'];
  const dataRows = rows.map((row) => [
    row.transactionCode,
    row.createdAt ? formatDateValue(row.createdAt, "dd MMM yyyy, hh:mm a") : '-',
    row.host.name,
    row.host.email || '',
    row.planName,
    row.amount,
    row.paymentMethod,
    row.status,
    row.invoiceCode || '-',
  ]);
  return [headers, ...dataRows]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

const buildReminderCsv = (rows) => {
  const headers = ['Subscription ID', 'Host', 'Email', 'Property', 'Plan', 'Current End Date', 'Days Left', 'Auto Renew', 'Renewal Status', 'Last Reminder'];
  const dataRows = rows.map((row) => [
    row.subscriptionCode,
    row.host.name,
    row.host.email || '',
    row.property.name,
    row.plan.name,
    formatDateValue(row.nextRenewalDate),
    row.daysLeftLabel,
    row.autoRenew ? 'Enabled' : 'Disabled',
    row.renewalStatus,
    formatDateValue(row.lastReminderDate),
  ]);
  return [headers, ...dataRows]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getPermissionSet = (user) => {
  if (!user) return new Set();
  if (user.role === 'admin' && (!user.access_controls || user.access_controls.length === 0)) {
    return new Set(['*']);
  }
  return new Set(user.permissions || user.access_controls || []);
};

const canAccess = (permissionSet, permissionKey) =>
  permissionSet.has('*') || permissionSet.has(permissionKey) || permissionSet.has('subscription_management.view');

const normalizeRm = (user) => ({
  id: user?.user_id || user?.employee_id || '',
  code: user?.employee_code || user?.admin_role_key || user?.user_id || '',
  name: user?.full_name || user?.name || 'Unassigned RM',
});

const normalizeSubscription = (subscription, rmMap) => {
  const property = subscription.property || {};
  const host = subscription.host || {};
  const plan = subscription.plan || {};
  const rmId = property.rm_id || host.rm_id || subscription.rm_id || '';
  const rm = rmMap.get(rmId) || null;
  const amount = Number(subscription.amount || 0);
  const normalizedStatus = STATUS_ORDER.includes(subscription.status) ? subscription.status : 'active';
  const nextRenewalDate = subscription.end_date || subscription.next_renewal_date || subscription.expiry_date || null;
  const category = property.category || plan.property_category || '';
  const propertyType = property.property_type || plan.property_type || '';
  const cancellationReason = subscription.cancellation_reason
    || subscription.cancel_reason
    || subscription.reason
    || subscription.raw_reason
    || subscription.cancellation_metadata?.reason
    || subscription.status_reason
    || '';

  return {
    id: subscription.subscription_id,
    subscriptionCode: String(subscription.subscription_id || '').toUpperCase().replace(/^SUB_/, 'SUB-').replace(/_/g, '-'),
    host: {
      id: host.user_id || subscription.user_id || '',
      name: host.full_name || host.name || subscription.user_id || 'Unknown host',
      email: host.email || '',
      phone: host.phone || '',
      initials: createInitials(host.full_name || host.name || subscription.user_id),
    },
    property: {
      id: property.property_id || subscription.property_id || '',
      propertyCode: String(property.property_id || subscription.property_id || '').toUpperCase().replace(/^PROP_/, 'PROP-').replace(/_/g, '-'),
      name: property.title || property.name || subscription.property_id || 'Unmapped property',
      type: propertyType,
      category,
      city: property.city || '',
      state: property.state || '',
      status: property.status || '',
      thumbnail: property.cover_image || property.featured_image || property.thumbnail || property.images?.[0] || subscription.property_image || '',
    },
    plan: {
      id: plan.plan_id || subscription.plan_id || '',
      name: plan.plan_name || subscription.plan_id || 'Unknown plan',
      durationLabel: subscription.status === 'trial'
        ? `Trial (${Math.max(subscription.trial_days_remaining || 0, 0) || 15} Days)`
        : subscription.billing_cycle === 'annual'
          ? '12 Months'
          : subscription.billing_cycle === 'half_yearly'
            ? '6 Months'
            : subscription.billing_cycle === 'quarterly'
              ? '3 Months'
              : subscription.billing_cycle === 'monthly'
                ? '1 Month'
                : `${plan.validity_days || 30} Days`,
      billingCycle: subscription.billing_cycle || 'custom',
    },
    amount,
    currency: 'INR',
    status: normalizedStatus,
    cancellationReason,
    autoRenew: subscription.auto_renewal !== false,
    startDate: subscription.start_date,
    nextRenewalDate,
    trialEndDate: subscription.trial_end_date || null,
    expiryDate: subscription.end_date || null,
    paymentStatus: subscription.payment_status || '',
    paymentReference: subscription.payment_reference || '',
    daysRemaining: subscription.days_remaining,
    trialDaysRemaining: subscription.trial_days_remaining,
    rm,
    raw: subscription,
    searchText: [
      subscription.subscription_id,
      host.full_name,
      host.email,
      host.phone,
      property.title,
      property.property_id,
      plan.plan_name,
      rm?.name,
      rm?.code,
      property.city,
      property.state,
      cancellationReason,
    ].join(' ').toLowerCase(),
  };
};

const normalizePlan = (plan, subscriptions = []) => {
  const relatedSubscriptions = subscriptions.filter((subscription) => subscription.plan?.id === (plan.plan_id || plan.id));
  const activeSubscribers = relatedSubscriptions.filter((subscription) => subscription.status === 'active').length;
  const trialSubscribers = relatedSubscriptions.filter((subscription) => subscription.status === 'trial').length;
  const subscribers = Number(plan.active_subscriptions ?? plan.subscribers_count ?? plan.subscriber_count ?? activeSubscribers);
  const features = Array.isArray(plan.features)
    ? plan.features.map((feature) => (typeof feature === 'string' ? feature : feature?.name)).filter(Boolean)
    : [];
  const targetUsers = Array.isArray(plan.target_users)
    ? plan.target_users
    : String(plan.target_users || plan.user_type || plan.audience || 'Hosts')
      .split(/[\/,]/)
      .map((value) => value.trim())
      .filter(Boolean);
  const durationDays = Number(plan.validity_days || plan.duration_days || 0);

  return {
    id: plan.plan_id || plan.id || '',
    name: plan.plan_name || plan.name || 'Unnamed Plan',
    description: plan.description || plan.short_description || '',
    type: plan.plan_type || plan.segment || plan.category || (plan.is_trial ? 'trial' : 'standard'),
    status: plan.is_active === false || plan.status === 'inactive' ? 'inactive' : 'active',
    targetUsers,
    durationLabel: plan.duration_label
      || (durationDays === 15 ? '15 Days' : durationDays >= 365 ? '12 Months' : durationDays >= 180 ? '6 Months' : durationDays >= 30 ? '1 Month' : durationDays ? `${durationDays} Days` : 'Custom'),
    durationDays,
    priceMonthly: Number(plan.price_monthly ?? plan.monthly_price ?? plan.price ?? 0),
    propertiesLimit: plan.properties_limit ?? plan.property_limit ?? plan.max_properties ?? plan.listing_limit ?? 'Custom',
    features,
    featuresCount: Number(plan.features_count ?? plan.feature_count ?? features.length),
    subscribers,
    activeSubscribers: Number(plan.active_subscriptions ?? activeSubscribers),
    trialSubscribers: Number(plan.trial_subscriptions ?? trialSubscribers),
    revenuePotential: Number(
      plan.revenue_potential
      ?? (Number(plan.price_monthly ?? plan.monthly_price ?? plan.price ?? 0) * Number((plan.capacity ?? plan.active_subscriptions ?? activeSubscribers) || 0))
    ),
    raw: plan,
    searchText: [
      plan.plan_name,
      plan.name,
      plan.description,
      plan.plan_type,
      plan.segment,
      targetUsers.join(' '),
    ].join(' ').toLowerCase(),
  };
};

const normalizePaymentMethod = (value) => {
  const method = String(value || '').trim().toLowerCase();
  if (!method) return 'Unknown';
  if (method.includes('upi')) return 'UPI';
  if (method.includes('credit')) return 'Credit Card';
  if (method.includes('debit')) return 'Debit Card';
  if (method.includes('net')) return 'Net Banking';
  if (method.includes('wallet')) return 'Wallet';
  if (method.includes('card')) return 'Card';
  return method.replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeTransactionType = (value) => {
  const type = String(value || '').trim();
  if (!type) return 'Subscription Purchase';
  return type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizePaymentStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (status.includes('refund')) return 'refunded';
  if (status.includes('fail')) return 'failed';
  if (status.includes('pending') || status.includes('process')) return 'pending';
  return 'success';
};

const normalizePaymentTransaction = (transaction, subscriptions = []) => {
  const relatedSubscription = subscriptions.find((subscription) =>
    subscription.id === transaction.subscription_id
    || subscription.raw?.payment_reference === transaction.payment_reference
    || subscription.raw?.payment_id === transaction.transaction_id
  );
  const host = transaction.host || transaction.user || relatedSubscription?.host || {};
  const plan = transaction.plan || relatedSubscription?.plan || {};
  const createdAt = transaction.created_at || transaction.transaction_date || transaction.paid_at || transaction.updated_at || null;
  const invoiceCode = transaction.invoice_number || transaction.invoice_id || transaction.invoice_code || '';
  return {
    id: transaction.transaction_id || transaction.payment_id || transaction.id || '',
    transactionCode: String(transaction.transaction_id || transaction.payment_id || transaction.id || '').toUpperCase().replace(/_/g, '-'),
    createdAt,
    host: {
      name: host.full_name || host.name || relatedSubscription?.host?.name || 'Unknown user',
      email: host.email || relatedSubscription?.host?.email || '',
      initials: createInitials(host.full_name || host.name || relatedSubscription?.host?.name || 'NA'),
    },
    planName: plan.plan_name || plan.name || relatedSubscription?.plan?.name || transaction.plan_name || transaction.item_name || 'Subscription Plan',
    planMeta: plan.duration_label || relatedSubscription?.plan?.durationLabel || normalizeTransactionType(transaction.transaction_type),
    amount: Number(transaction.amount || transaction.amount_inr || transaction.net_amount || 0),
    paymentMethod: normalizePaymentMethod(transaction.payment_method || transaction.method || transaction.gateway_method),
    status: normalizePaymentStatus(transaction.status),
    invoiceCode,
    transactionType: normalizeTransactionType(transaction.transaction_type || transaction.type),
    raw: transaction,
    searchText: [
      transaction.transaction_id,
      transaction.payment_id,
      host.full_name,
      host.name,
      host.email,
      plan.plan_name,
      plan.name,
      transaction.plan_name,
      transaction.item_name,
      invoiceCode,
    ].join(' ').toLowerCase(),
  };
};

const PaymentStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${PAYMENT_STATUS_TONES[status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
    {status === 'success' ? 'Success' : status === 'failed' ? 'Failed' : status === 'refunded' ? 'Refunded' : 'Pending'}
  </span>
);

const RenewalStatusBadge = ({ status }) => {
  const tones = {
    overdue: 'border-rose-200 bg-rose-50 text-rose-700',
    due_soon: 'border-orange-200 bg-orange-50 text-orange-700',
    upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
    auto_renew: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  const labels = {
    overdue: 'Overdue',
    due_soon: 'Due Soon',
    upcoming: 'Upcoming',
    auto_renew: 'Auto-renew',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tones[status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {labels[status] || 'Upcoming'}
    </span>
  );
};

const AutoRenewBadge = ({ enabled }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
    {enabled ? 'On' : 'Off'}
  </span>
);

const getPlanTypeLabel = (value) =>
  String(value || 'custom')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getPlanTypeTone = (value) => {
  const type = String(value || '').toLowerCase();
  if (type.includes('trial')) return 'bg-violet-100 text-violet-700';
  if (type.includes('premium')) return 'bg-amber-100 text-amber-700';
  if (type.includes('commercial')) return 'bg-indigo-100 text-indigo-700';
  if (type.includes('broker')) return 'bg-emerald-100 text-emerald-700';
  if (type.includes('enterprise')) return 'bg-rose-100 text-rose-700';
  if (type.includes('standard')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
};

const getAddonCategoryLabel = (value) =>
  String(value || 'other')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getAddonCategoryTone = (value) => {
  const category = String(value || '').toLowerCase();
  if (category.includes('visibility')) return 'bg-violet-100 text-violet-700';
  if (category.includes('trust')) return 'bg-blue-100 text-blue-700';
  if (category.includes('content')) return 'bg-emerald-100 text-emerald-700';
  if (category.includes('support')) return 'bg-orange-100 text-orange-700';
  if (category.includes('analytics')) return 'bg-amber-100 text-amber-700';
  if (category.includes('limit')) return 'bg-yellow-100 text-yellow-700';
  if (category.includes('branding')) return 'bg-pink-100 text-pink-700';
  if (category.includes('integration')) return 'bg-indigo-100 text-indigo-700';
  return 'bg-slate-100 text-slate-700';
};

const PlanStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
);

const isTrialSubscription = (subscription) => (
  subscription?.status === 'trial'
  || subscription?.raw?.subscription_type === 'trial'
  || subscription?.raw?.subscription_kind === 'trial'
  || Boolean(subscription?.trialEndDate)
  || subscription?.trialDaysRemaining !== undefined
);

const getTrialLifecycle = (subscription) => {
  const trialEndValue = subscription?.trialEndDate || subscription?.nextRenewalDate || subscription?.expiryDate;
  const remainingDays = typeof subscription?.trialDaysRemaining === 'number'
    ? subscription.trialDaysRemaining
    : daysUntil(trialEndValue);

  if (subscription?.status === 'cancelled') return 'expired';
  if (subscription?.status === 'expired' || (remainingDays !== null && remainingDays < 0)) return 'expired';
  if (remainingDays !== null && remainingDays <= 3) return 'expiring_soon';
  return 'active';
};

const getTrialLifecycleMeta = (subscription) => {
  const lifecycle = getTrialLifecycle(subscription);
  if (lifecycle === 'expired') {
    return {
      key: lifecycle,
      label: 'Expired',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }
  if (lifecycle === 'expiring_soon') {
    return {
      key: lifecycle,
      label: 'Expiring Soon',
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
    };
  }
  return {
    key: lifecycle,
    label: 'Active',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
};

const getDaysLeftValue = (subscription) => (
  typeof subscription?.daysRemaining === 'number'
    ? subscription.daysRemaining
    : daysUntil(subscription?.nextRenewalDate || subscription?.expiryDate)
);

const DaysLeftBadge = ({ subscription, warningThreshold = 7 }) => {
  const remainingDays = getDaysLeftValue(subscription);
  if (remainingDays === null) {
    return <span className="text-sm font-bold text-slate-400">-</span>;
  }
  if (remainingDays < 0) {
    return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">Expired</span>;
  }
  if (remainingDays === 0) {
    return <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">Today</span>;
  }
  if (remainingDays <= warningThreshold) {
    return <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">{remainingDays} day{remainingDays > 1 ? 's' : ''}</span>;
  }
  return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{remainingDays} days</span>;
};

const formatReasonLabel = (value, fallbackStatus = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return fallbackStatus === 'expired' ? 'Did not renew' : fallbackStatus === 'cancelled' ? 'User cancelled' : '-';
  }
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const TrialLifecycleBadge = ({ subscription }) => {
  const meta = getTrialLifecycleMeta(subscription);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.tone}`}>
      {meta.label}
    </span>
  );
};

const TrialDaysBadge = ({ subscription }) => {
  const trialEndValue = subscription?.trialEndDate || subscription?.nextRenewalDate || subscription?.expiryDate;
  const remainingDays = typeof subscription?.trialDaysRemaining === 'number'
    ? subscription.trialDaysRemaining
    : daysUntil(trialEndValue);

  if (remainingDays === null) {
    return <span className="text-sm font-bold text-slate-400">-</span>;
  }
  if (remainingDays < 0) {
    return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">Expired</span>;
  }
  if (remainingDays === 0) {
    return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">Today</span>;
  }
  if (remainingDays <= 3) {
    return <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">{remainingDays} day{remainingDays > 1 ? 's' : ''}</span>;
  }
  return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{remainingDays} days</span>;
};

const compareValues = (left, right, direction = 'asc') => {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return 1;
  if (right === null || right === undefined || right === '') return -1;
  const factor = direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * factor;
};

const sortRows = (rows, sortBy, sortOrder) => {
  const list = [...rows];
  list.sort((a, b) => {
    switch (sortBy) {
      case 'subscriptionCode':
        return compareValues(a.subscriptionCode, b.subscriptionCode, sortOrder);
      case 'host':
        return compareValues(a.host.name, b.host.name, sortOrder);
      case 'plan':
        return compareValues(a.plan.name, b.plan.name, sortOrder);
      case 'amount':
        return compareValues(a.amount, b.amount, sortOrder);
      case 'status':
        return compareValues(STATUS_ORDER.indexOf(a.status), STATUS_ORDER.indexOf(b.status), sortOrder);
      case 'startDate':
        return compareValues(toDate(a.startDate)?.getTime() || 0, toDate(b.startDate)?.getTime() || 0, sortOrder);
      case 'nextRenewal':
        return compareValues(toDate(a.nextRenewalDate)?.getTime() || Number.MAX_SAFE_INTEGER, toDate(b.nextRenewalDate)?.getTime() || Number.MAX_SAFE_INTEGER, sortOrder);
      case 'rm':
        return compareValues(a.rm?.name || '', b.rm?.name || '', sortOrder);
      default:
        return compareValues(toDate(b.raw?.created_at)?.getTime() || 0, toDate(a.raw?.created_at)?.getTime() || 0, 'asc');
    }
  });
  return list;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, tone, trend }) => (
  <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-2 text-[31px] font-black leading-none tracking-[-0.05em] text-slate-950">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
          {trend ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700"><ArrowUpRight className="h-3.5 w-3.5" /> {trend}</span> : null}
        </div>
      </div>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </section>
);

const SubscriptionStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_TONES[status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
    <span className="sr-only">Subscription status:</span>
    {STATUS_LABELS[status] || status}
  </span>
);

const SkeletonBlock = ({ className = '' }) => <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;

const SubscriptionsSkeleton = () => (
  <div className="space-y-5" aria-live="polite" role="status">
    <SkeletonBlock className="h-16" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => <SkeletonBlock key={index} className="h-32" />)}
    </div>
    <SkeletonBlock className="h-16" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <SkeletonBlock className="h-[640px]" />
      <div className="space-y-5">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-56" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ title, description, actionLabel, onAction }) => (
  <section className="rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
      <CircleOff className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p>
    {actionLabel ? <button type="button" onClick={onAction} className="mt-5 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(29,78,216,0.22)] hover:bg-[#1B46C2]">{actionLabel}</button> : null}
  </section>
);

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-lg">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{formatCurrencyINR(payload[0].value)}</p>
    </div>
  );
};

const SectionPlaceholder = ({ title, description, primaryAction, secondaryAction }) => (
  <div className="space-y-5">
    <header>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Subscription Management</p>
      <h1 className="mt-2 text-[32px] font-black tracking-[-0.04em] text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p>
    </header>
    <EmptyState
      title={`${title} is staged for the next pass`}
      description="The navigation route is in place so the admin IA matches the new structure, while the detailed workflow for this section stays isolated from the All Subscriptions rollout."
      actionLabel={primaryAction?.label}
      onAction={primaryAction?.onClick}
    />
    {secondaryAction ? (
      <div className="flex justify-center">
        <button type="button" onClick={secondaryAction.onClick} className="text-sm font-black text-[#1D4ED8]">
          {secondaryAction.label}
        </button>
      </div>
    ) : null}
  </div>
);

const ActionDialog = ({ state, onClose, onSubmit, plans, canEdit }) => {
  const subscription = state.subscription;
  const [form, setForm] = useState({
    reason: '',
    renewalPlanId: subscription?.plan.id || '',
    duration: subscription?.plan.durationLabel || '12 Months',
    startDate: '',
    amount: subscription?.amount || 0,
    effectiveDate: 'immediately',
    autoRenew: subscription?.autoRenew ? 'on' : 'off',
  });

  useEffect(() => {
    setForm({
      reason: '',
      renewalPlanId: subscription?.plan.id || '',
      duration: subscription?.plan.durationLabel || '12 Months',
      startDate: '',
      amount: subscription?.amount || 0,
      effectiveDate: 'immediately',
      autoRenew: subscription?.autoRenew ? 'on' : 'off',
    });
  }, [subscription, state.type]);

  if (!subscription) return null;

  const titles = {
    detail: 'Subscription Summary',
    renew: 'Renew Subscription',
    changePlan: 'Change Plan',
    cancel: 'Cancel Subscription',
    reactivate: 'Reactivate Subscription',
    reminder: 'Send Renewal Reminder',
    autoRenew: 'Auto-renew Settings',
    convertTrial: 'Convert Trial To Paid',
  };

  const descriptions = {
    detail: 'Subscription, host, property, billing, lifecycle and payment metadata.',
    renew: 'Review the current subscription details before triggering the backend renewal workflow.',
    changePlan: 'Choose the target plan and when the plan change should take effect.',
    cancel: 'Cancelling may affect property visibility or current subscription benefits.',
    reactivate: 'Reactivating should follow backend lifecycle rules and preserve billing history.',
    reminder: `Send a renewal reminder to ${subscription.host.name}?`,
    autoRenew: 'Keep auto-renew separate from subscription status.',
    convertTrial: 'Convert this trial subscription into a paid subscription without duplicating the host or property.',
  };

  const isReadOnly = state.type === 'detail';
  const actionLabel = {
    renew: 'Trigger Renewal',
    changePlan: 'Submit Change',
    cancel: 'Cancel Subscription',
    reactivate: 'Reactivate',
    reminder: 'Send Reminder',
    autoRenew: 'Update Auto-renew',
    convertTrial: 'Convert To Paid',
  }[state.type];

  return (
    <Dialog open={!!state.type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Subscription Management</p>
          <DialogTitle className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-950">{titles[state.type] || 'Subscription Action'}</DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">{descriptions[state.type] || ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Subscription ID" value={subscription.subscriptionCode} />
            <DetailCard label="Status" value={STATUS_LABELS[subscription.status]} />
            <DetailCard label="Host" value={subscription.host.name} subValue={subscription.host.email || subscription.host.phone || '-'} />
            <DetailCard label="Property" value={subscription.property.name} subValue={subscription.property.propertyCode || '-'} />
            <DetailCard label="Current Plan" value={subscription.plan.name} subValue={subscription.plan.durationLabel} />
            <DetailCard label="Amount" value={formatCurrencyINR(subscription.amount)} />
            <DetailCard label="Start Date" value={formatDateValue(subscription.startDate)} />
            <DetailCard label="Current Expiry" value={formatDateValue(subscription.nextRenewalDate)} />
          </div>

          {!isReadOnly ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(state.type === 'renew' || state.type === 'changePlan' || state.type === 'convertTrial') ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Plan</span>
                  <select value={form.renewalPlanId} onChange={(event) => setForm((current) => ({ ...current, renewalPlanId: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500">
                    {plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                  </select>
                </label>
              ) : null}
              {(state.type === 'renew' || state.type === 'convertTrial') ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Duration</span>
                  <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" placeholder="12 Months" />
                </label>
              ) : null}
              {(state.type === 'renew' || state.type === 'changePlan') ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Start Date</span>
                  <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" />
                </label>
              ) : null}
              {(state.type === 'renew' || state.type === 'convertTrial') ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Amount</span>
                  <input type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" />
                </label>
              ) : null}
              {state.type === 'changePlan' ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Effective Date</span>
                  <select value={form.effectiveDate} onChange={(event) => setForm((current) => ({ ...current, effectiveDate: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500">
                    <option value="immediately">Immediately</option>
                    <option value="next_renewal">Next Renewal</option>
                  </select>
                </label>
              ) : null}
              {state.type === 'autoRenew' ? (
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Auto-renew</span>
                  <select value={form.autoRenew} onChange={(event) => setForm((current) => ({ ...current, autoRenew: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500">
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>
              ) : null}
              {state.type !== 'reminder' ? (
                <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Reason</span>
                  <textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Add a clear audit reason for this action" />
                </label>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailLine label="Billing cycle" value={subscription.plan.billingCycle || '-'} />
                <DetailLine label="Payment status" value={subscription.paymentStatus || '-'} />
                <DetailLine label="Auto-renew" value={subscription.autoRenew ? 'Enabled' : 'Disabled'} />
                <DetailLine label="Payment reference" value={subscription.paymentReference || '-'} />
                <DetailLine label="Property type" value={getPropertyTypeLabel(subscription.property.type, subscription.property.category)} />
                <DetailLine label="RM" value={subscription.rm ? `${subscription.rm.name} (${subscription.rm.code || subscription.rm.id})` : 'Unassigned'} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white">Close</button>
          {!isReadOnly ? (
            <button
              type="button"
              onClick={() => onSubmit(state.type, subscription, form)}
              disabled={!canEdit || (state.type !== 'reminder' && !form.reason.trim())}
              className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLabel}
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PlanEditorDialog = ({ open, onClose, onSubmit, plan, saving }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'standard',
    targetUsers: 'Hosts',
    durationDays: 30,
    priceMonthly: 0,
    propertiesLimit: 1,
    featuresText: '',
    status: 'active',
  });

  useEffect(() => {
    setForm({
      name: plan?.name || '',
      description: plan?.description || '',
      type: plan?.type || 'standard',
      targetUsers: plan?.targetUsers?.join(' / ') || 'Hosts',
      durationDays: plan?.durationDays || 30,
      priceMonthly: plan?.priceMonthly || 0,
      propertiesLimit: plan?.propertiesLimit === 'Unlimited' ? 'Unlimited' : (plan?.propertiesLimit || 1),
      featuresText: plan?.features?.join('\n') || '',
      status: plan?.status || 'active',
    });
  }, [plan, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Plan Management</p>
          <DialogTitle className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-950">{plan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Configure pricing, audience, limits and features for subscription plans.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <FilterField label="Plan Name">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={filterInputClass} placeholder="Premium Plan" />
          </FilterField>
          <FilterField label="Plan Type">
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className={filterInputClass}>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="commercial">Commercial</option>
              <option value="broker">Broker</option>
              <option value="enterprise">Enterprise</option>
              <option value="custom">Custom</option>
            </select>
          </FilterField>
          <FilterField label="Target Users">
            <input value={form.targetUsers} onChange={(event) => setForm((current) => ({ ...current, targetUsers: event.target.value }))} className={filterInputClass} placeholder="Hosts / Brokers" />
          </FilterField>
          <FilterField label="Duration Days">
            <input type="number" min="1" value={form.durationDays} onChange={(event) => setForm((current) => ({ ...current, durationDays: event.target.value }))} className={filterInputClass} />
          </FilterField>
          <FilterField label="Monthly Price">
            <input type="number" min="0" value={form.priceMonthly} onChange={(event) => setForm((current) => ({ ...current, priceMonthly: event.target.value }))} className={filterInputClass} />
          </FilterField>
          <FilterField label="Properties Limit">
            <input value={form.propertiesLimit} onChange={(event) => setForm((current) => ({ ...current, propertiesLimit: event.target.value }))} className={filterInputClass} placeholder="Unlimited" />
          </FilterField>
          <FilterField label="Status">
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={filterInputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FilterField>
          <FilterField label="Description">
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={filterInputClass} placeholder="For professional hosts" />
          </FilterField>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Features</span>
            <textarea value={form.featuresText} onChange={(event) => setForm((current) => ({ ...current, featuresText: event.target.value }))} className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500" placeholder="One feature per line" />
          </label>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white">Close</button>
          <button
            type="button"
            onClick={() => onSubmit({
              ...form,
              durationDays: Number(form.durationDays || 0),
              priceMonthly: Number(form.priceMonthly || 0),
              targetUsers: form.targetUsers.split('/').map((value) => value.trim()).filter(Boolean),
              features: form.featuresText.split('\n').map((value) => value.trim()).filter(Boolean),
            })}
            disabled={!form.name.trim() || saving}
            className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddonEditorDialog = ({ open, onClose, onSubmit, addon, saving, plans }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'visibility',
    applicableTo: 'All Plans',
    price: 0,
    billingCycle: 'monthly',
    status: 'active',
  });

  useEffect(() => {
    setForm({
      name: addon?.name || '',
      description: addon?.description || '',
      category: addon?.category || 'visibility',
      applicableTo: addon?.applicableTo || 'All Plans',
      price: addon?.price || 0,
      billingCycle: addon?.billingCycle || 'monthly',
      status: addon?.status || 'active',
    });
  }, [addon, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Add-on Management</p>
          <DialogTitle className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-950">{addon ? 'Edit Add-on' : 'Create New Add-on'}</DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Configure add-on pricing, category, status and plan applicability.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <FilterField label="Add-on Name">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={filterInputClass} placeholder="Featured Listing" />
          </FilterField>
          <FilterField label="Category">
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={filterInputClass}>
              <option value="visibility">Visibility</option>
              <option value="trust">Trust</option>
              <option value="content">Content</option>
              <option value="support">Support</option>
              <option value="analytics">Analytics</option>
              <option value="limit_increase">Limit Increase</option>
              <option value="branding">Branding</option>
              <option value="integration">Integration</option>
            </select>
          </FilterField>
          <FilterField label="Applicable To">
            <select value={form.applicableTo} onChange={(event) => setForm((current) => ({ ...current, applicableTo: event.target.value }))} className={filterInputClass}>
              <option value="All Plans">All Plans</option>
              {plans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Billing Cycle">
            <select value={form.billingCycle} onChange={(event) => setForm((current) => ({ ...current, billingCycle: event.target.value }))} className={filterInputClass}>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
              <option value="annual">Annual</option>
            </select>
          </FilterField>
          <FilterField label="Price">
            <input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className={filterInputClass} />
          </FilterField>
          <FilterField label="Status">
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={filterInputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </FilterField>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Description</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500" placeholder="Describe what this add-on unlocks" />
          </label>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white">Close</button>
          <button
            type="button"
            onClick={() => onSubmit({ ...form, price: Number(form.price || 0) })}
            disabled={!form.name.trim() || saving}
            className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : addon ? 'Update Add-on' : 'Create Add-on'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DetailCard = ({ label, value, subValue }) => (
  <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    {subValue ? <p className="mt-1 text-xs font-semibold text-slate-500">{subValue}</p> : null}
  </div>
);

const DetailLine = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

const getPropertyTypeLabel = (propertyType, category) => {
  if (PROPERTY_TYPE_LABELS[propertyType]) return PROPERTY_TYPE_LABELS[propertyType];
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  return String(propertyType || category || 'Unknown').replace(/_/g, ' ');
};

const SubscriptionManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissionSet = useMemo(() => getPermissionSet(user), [user]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dialogState, setDialogState] = useState({ type: '', subscription: null });
  const [planEditorState, setPlanEditorState] = useState({ open: false, plan: null, saving: false });
  const [addonEditorState, setAddonEditorState] = useState({ open: false, addon: null, saving: false });
  const [revenuePeriod, setRevenuePeriod] = useState('this_month');
  const [advancedFiltersDraft, setAdvancedFiltersDraft] = useState(() => ({
    billingCycle: searchParams.get('billingCycle') || '',
    hostQuery: searchParams.get('hostQuery') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
    startFrom: searchParams.get('startFrom') || '',
    startTo: searchParams.get('startTo') || '',
    renewalFrom: searchParams.get('renewalFrom') || '',
    renewalTo: searchParams.get('renewalTo') || '',
    amountMin: searchParams.get('amountMin') || '',
    amountMax: searchParams.get('amountMax') || '',
    autoRenew: searchParams.get('autoRenew') || '',
    monetizationType: searchParams.get('monetizationType') || '',
  }));
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    subscriptions: [],
    transactions: [],
    plans: [],
    rms: [],
    summary: null,
    financeOverview: null,
    revenueSeries: [],
    revenueDefinition: '',
    analyticsError: '',
    totalAvailable: 0,
  });

  const isTrialView = location.pathname === '/admin/subscriptions/trials';
  const isActiveView = location.pathname === '/admin/subscriptions/active';
  const isArchivedView = location.pathname === '/admin/subscriptions/expired-cancelled';
  const isPlansView = location.pathname === '/admin/subscriptions/plans';
  const isAddonsView = location.pathname === '/admin/subscriptions/add-ons';
  const isPaymentsView = location.pathname === '/admin/subscriptions/payment-history';
  const isRemindersView = location.pathname === '/admin/subscriptions/renewal-reminders';
  const section = searchParams.get('section') || 'all';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = PAGE_SIZE_OPTIONS.includes(Number(searchParams.get('limit'))) ? Number(searchParams.get('limit')) : 10;
  const search = searchParams.get('search') || '';
  const planId = searchParams.get('planId') || '';
  const status = searchParams.get('status') || '';
  const propertyType = searchParams.get('propertyType') || '';
  const rmId = searchParams.get('rmId') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== search) {
        const next = new URLSearchParams(searchParams);
        if (searchInput.trim()) next.set('search', searchInput.trim());
        else next.delete('search');
        next.set('page', '1');
        setSearchParams(next, { replace: true });
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, search, searchParams, setSearchParams]);

  const revenueMonths = useMemo(
    () => REVENUE_PERIODS.find((item) => item.value === revenuePeriod)?.months || 1,
    [revenuePeriod]
  );

  const load = useCallback(async ({ background = false } = {}) => {
    try {
      setState((current) => ({
        ...current,
        loading: background ? current.loading : true,
        refreshing: background,
        error: background ? current.error : '',
      }));

      const responses = await Promise.allSettled([
        adminPhase1API.subscriptions({
          tab: STATUS_ORDER.includes(status) ? status : 'all',
          search,
          limit: 2000,
          skip: 0,
        }),
        adminPhase1API.subscriptionPlans(),
        adminPhase1API.crmAssignees(),
        adminPhase1API.financeOverview(),
        adminPhase1API.financeMrrChart({ months: revenueMonths }),
        adminPhase1API.financeTransactions({ limit: 500, skip: 0 }),
      ]);

      const [subscriptionsRes, plansRes, assigneesRes, financeRes, revenueRes, transactionsRes] = responses;
      if (subscriptionsRes.status !== 'fulfilled') {
        throw subscriptionsRes.reason;
      }

      const relationshipManagers = assigneesRes.status === 'fulfilled'
        ? assigneesRes.value.data?.data?.relationship_managers || []
        : [];
      const rmMap = new Map(relationshipManagers.map((manager) => [manager.user_id, normalizeRm(manager)]));
      const subscriptionsPayload = subscriptionsRes.value.data?.data || {};
      const summaryMetrics = subscriptionsPayload.metrics || {};
      const financePayload = financeRes.status === 'fulfilled' ? (financeRes.value.data?.data || financeRes.value.data || {}) : {};
      const financeRevenue = financePayload.revenue || {};
      const months = revenueRes.status === 'fulfilled' ? (revenueRes.value.data?.months || []) : [];
      const normalizedSubscriptions = (subscriptionsPayload.subscriptions || []).map((subscription) => normalizeSubscription(subscription, rmMap));
      const transactionPayload = transactionsRes.status === 'fulfilled'
        ? (transactionsRes.value.data?.data || transactionsRes.value.data || {})
        : {};
      const transactionRows = Array.isArray(transactionPayload)
        ? transactionPayload
        : (transactionPayload.transactions || transactionPayload.items || transactionPayload.results || []);
      const latestRevenue = months[months.length - 1] || {};
      const previousRevenue = months[months.length - 2] || {};
      const currentValue = Number((latestRevenue.net_paise || latestRevenue.inflow_paise || 0) / 100);
      const previousValue = Number((previousRevenue.net_paise || previousRevenue.inflow_paise || 0) / 100);
      const trendValue = previousValue > 0 ? Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1)) : 0;

      setState({
        loading: false,
        refreshing: false,
        error: '',
        subscriptions: normalizedSubscriptions,
        transactions: transactionRows.map((transaction) => normalizePaymentTransaction(transaction, normalizedSubscriptions)),
        plans: plansRes.status === 'fulfilled' ? (plansRes.value.data?.data?.plans || []) : [],
        rms: relationshipManagers.map(normalizeRm),
        summary: {
          totalSubscriptions: subscriptionsPayload.pagination?.total || subscriptionsRes.value.data?.pagination?.total || subscriptionsPayload.subscriptions?.length || 0,
          activeSubscriptions: Number(summaryMetrics.active || 0),
          expiredSubscriptions: Number(summaryMetrics.expired || 0),
          cancelledSubscriptions: Number(summaryMetrics.cancelled || 0),
          trialSubscriptions: Number(summaryMetrics.trial || 0),
          monthlyRevenue: Number(financeRevenue.subscriptions_paise ? financeRevenue.subscriptions_paise / 100 : summaryMetrics.revenue || 0),
          monthlyRevenueTrend: trendValue,
        },
        financeOverview: financePayload,
        revenueSeries: months.map((month) => ({
          label: month.label || '',
          value: Number((month.net_paise || month.inflow_paise || 0) / 100),
        })),
        revenueDefinition: financeRes.status === 'fulfilled'
          ? 'Revenue cards use the backend finance source of truth.'
          : '',
        analyticsError: revenueRes.status === 'rejected' || financeRes.status === 'rejected'
          ? 'Revenue analytics are partially unavailable. Subscription list data is still live.'
          : '',
        totalAvailable: subscriptionsRes.value.data?.pagination?.total || subscriptionsPayload.subscriptions?.length || 0,
      });
    } catch (error) {
      setState({
        loading: false,
        refreshing: false,
        error: error.response?.data?.detail || 'Unable to load subscriptions.',
        subscriptions: [],
        transactions: [],
        plans: [],
        rms: [],
        summary: null,
        financeOverview: null,
        revenueSeries: [],
        revenueDefinition: '',
        analyticsError: '',
        totalAvailable: 0,
      });
    }
  }, [revenueMonths, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setAdvancedFiltersDraft({
      billingCycle: searchParams.get('billingCycle') || '',
      hostQuery: searchParams.get('hostQuery') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
      startFrom: searchParams.get('startFrom') || '',
      startTo: searchParams.get('startTo') || '',
      renewalFrom: searchParams.get('renewalFrom') || '',
      renewalTo: searchParams.get('renewalTo') || '',
      amountMin: searchParams.get('amountMin') || '',
      amountMax: searchParams.get('amountMax') || '',
      autoRenew: searchParams.get('autoRenew') || '',
      monetizationType: searchParams.get('monetizationType') || '',
    });
  }, [searchParams]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page, limit, search, planId, status, propertyType, rmId, sortBy, sortOrder, section, location.pathname]);

  const baseRows = useMemo(
    () => {
      if (isTrialView) return state.subscriptions.filter(isTrialSubscription);
      if (isActiveView) return state.subscriptions.filter((subscription) => subscription.status === 'active');
      if (isArchivedView) return state.subscriptions.filter((subscription) => subscription.status === 'expired' || subscription.status === 'cancelled');
      return state.subscriptions;
    },
    [isActiveView, isArchivedView, isTrialView, state.subscriptions]
  );

  const propertyTypeOptions = useMemo(() => {
    const map = new Map();
    baseRows.forEach((subscription) => {
      if (subscription.property.type) {
        map.set(subscription.property.type, getPropertyTypeLabel(subscription.property.type, subscription.property.category));
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [baseRows]);

  const cityOptions = useMemo(() => {
    const map = new Map();
    baseRows.forEach((subscription) => {
      const cityValue = String(subscription.property.city || '').trim();
      if (cityValue) {
        map.set(cityValue, cityValue);
      }
    });
    return Array.from(map.keys()).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    let rows = [...baseRows];
    if (planId) rows = rows.filter((row) => row.plan.id === planId);
    if (status) {
      rows = isTrialView
        ? rows.filter((row) => getTrialLifecycle(row) === status)
        : rows.filter((row) => row.status === status);
    }
    if (propertyType) rows = rows.filter((row) => row.property.type === propertyType || row.property.category === propertyType);
    if (rmId) rows = rows.filter((row) => row.rm?.id === rmId);
    if (advancedFiltersDraft.billingCycle) rows = rows.filter((row) => row.plan.billingCycle === advancedFiltersDraft.billingCycle);
    if (advancedFiltersDraft.hostQuery.trim()) rows = rows.filter((row) => row.searchText.includes(advancedFiltersDraft.hostQuery.trim().toLowerCase()));
    if (advancedFiltersDraft.city.trim()) rows = rows.filter((row) => String(row.property.city || '').toLowerCase().includes(advancedFiltersDraft.city.trim().toLowerCase()));
    if (advancedFiltersDraft.state.trim()) rows = rows.filter((row) => String(row.property.state || '').toLowerCase().includes(advancedFiltersDraft.state.trim().toLowerCase()));
    if (advancedFiltersDraft.autoRenew) rows = rows.filter((row) => String(row.autoRenew) === String(advancedFiltersDraft.autoRenew === 'on'));
    if (advancedFiltersDraft.monetizationType === 'trial') rows = rows.filter((row) => row.status === 'trial');
    if (advancedFiltersDraft.monetizationType === 'paid') rows = rows.filter((row) => row.status !== 'trial');
    if (advancedFiltersDraft.amountMin) rows = rows.filter((row) => row.amount >= Number(advancedFiltersDraft.amountMin));
    if (advancedFiltersDraft.amountMax) rows = rows.filter((row) => row.amount <= Number(advancedFiltersDraft.amountMax));
    if (advancedFiltersDraft.startFrom) rows = rows.filter((row) => (toDate(row.startDate)?.getTime() || 0) >= (toDate(advancedFiltersDraft.startFrom)?.getTime() || 0));
    if (advancedFiltersDraft.startTo) rows = rows.filter((row) => (toDate(row.startDate)?.getTime() || 0) <= (toDate(advancedFiltersDraft.startTo)?.getTime() || Number.MAX_SAFE_INTEGER));
    if (advancedFiltersDraft.renewalFrom) rows = rows.filter((row) => (toDate(row.nextRenewalDate)?.getTime() || 0) >= (toDate(advancedFiltersDraft.renewalFrom)?.getTime() || 0));
    if (advancedFiltersDraft.renewalTo) rows = rows.filter((row) => (toDate(row.nextRenewalDate)?.getTime() || 0) <= (toDate(advancedFiltersDraft.renewalTo)?.getTime() || Number.MAX_SAFE_INTEGER));
    return sortRows(rows, sortBy, sortOrder);
  }, [baseRows, planId, status, propertyType, rmId, advancedFiltersDraft, sortBy, sortOrder, isTrialView]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * limit, currentPage * limit),
    [filteredRows, currentPage, limit]
  );
  const selectedRows = filteredRows.filter((row) => selectedIds.includes(row.id));
  const summary = state.summary || {
    totalSubscriptions: filteredRows.length,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    cancelledSubscriptions: 0,
    trialSubscriptions: 0,
    monthlyRevenue: 0,
    monthlyRevenueTrend: 0,
  };
  const totalVisible = filteredRows.length;
  const fromCount = totalVisible ? (currentPage - 1) * limit + 1 : 0;
  const toCount = Math.min(currentPage * limit, totalVisible);
  const percentages = {
    active: summary.totalSubscriptions ? ((summary.activeSubscriptions / summary.totalSubscriptions) * 100).toFixed(1) : '0.0',
    expired: summary.totalSubscriptions ? ((summary.expiredSubscriptions / summary.totalSubscriptions) * 100).toFixed(1) : '0.0',
    cancelled: summary.totalSubscriptions ? ((summary.cancelledSubscriptions / summary.totalSubscriptions) * 100).toFixed(1) : '0.0',
    trial: summary.totalSubscriptions ? ((summary.trialSubscriptions / summary.totalSubscriptions) * 100).toFixed(1) : '0.0',
  };
  const analyticsCanView = canAccess(permissionSet, ACTION_REQUIREMENTS.analytics);
  const canEdit = canAccess(permissionSet, ACTION_REQUIREMENTS.edit);
  const canExport = canAccess(permissionSet, ACTION_REQUIREMENTS.export);
  const canCreate = canAccess(permissionSet, ACTION_REQUIREMENTS.create);
  const canBulk = canAccess(permissionSet, ACTION_REQUIREMENTS.bulk);
  const paymentRows = useMemo(() => state.transactions, [state.transactions]);
  const paymentTransactionTypeOptions = useMemo(
    () => Array.from(new Set(paymentRows.map((row) => row.transactionType).filter(Boolean))),
    [paymentRows]
  );
  const paymentMethodOptions = useMemo(
    () => Array.from(new Set(paymentRows.map((row) => row.paymentMethod).filter(Boolean))),
    [paymentRows]
  );
  const filteredPaymentRows = useMemo(() => {
    let rows = [...paymentRows];
    if (search.trim()) rows = rows.filter((row) => row.searchText.includes(search.trim().toLowerCase()));
    if (planId) rows = rows.filter((row) => row.transactionType === planId);
    if (propertyType) rows = rows.filter((row) => row.paymentMethod === propertyType);
    if (status) rows = rows.filter((row) => row.status === status);
    if (rmId) {
      const now = new Date();
      const fromDate = (() => {
        if (rmId === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
        if (rmId === 'last_30_days') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        if (rmId === 'last_90_days') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
        if (rmId === 'this_year') return new Date(now.getFullYear(), 0, 1);
        return null;
      })();
      if (fromDate) rows = rows.filter((row) => (toDate(row.createdAt)?.getTime() || 0) >= fromDate.getTime());
    }
    return rows.sort((left, right) => {
      if (sortBy === 'transactionCode' || sortBy === 'transaction') return compareValues(left.transactionCode, right.transactionCode, sortOrder);
      if (sortBy === 'host') return compareValues(left.host.name, right.host.name, sortOrder);
      if (sortBy === 'plan') return compareValues(left.planName, right.planName, sortOrder);
      if (sortBy === 'amount') return compareValues(left.amount, right.amount, sortOrder);
      if (sortBy === 'status') return compareValues(left.status, right.status, sortOrder);
      if (sortBy === 'dateTime' || sortBy === 'createdAt') return compareValues(toDate(left.createdAt)?.getTime() || 0, toDate(right.createdAt)?.getTime() || 0, sortOrder);
      return compareValues(toDate(right.createdAt)?.getTime() || 0, toDate(left.createdAt)?.getTime() || 0, 'asc');
    });
  }, [paymentRows, search, planId, propertyType, status, rmId, sortBy, sortOrder]);
  const paymentTotalPages = Math.max(1, Math.ceil(filteredPaymentRows.length / limit));
  const currentPaymentPage = Math.min(page, paymentTotalPages);
  const paginatedPaymentRows = useMemo(
    () => filteredPaymentRows.slice((currentPaymentPage - 1) * limit, currentPaymentPage * limit),
    [filteredPaymentRows, currentPaymentPage, limit]
  );
  const selectedPaymentRows = filteredPaymentRows.filter((row) => selectedIds.includes(row.id));
  const paymentSummary = useMemo(() => {
    const overview = state.financeOverview || {};
    const totals = overview.transactions || overview.payments || overview.summary || {};
    const getNumber = (...values) => {
      for (let index = 0; index < values.length; index += 1) {
        const next = Number(values[index]);
        if (Number.isFinite(next)) return next;
      }
      return 0;
    };
    const totalAmount = getNumber(
      totals.total_amount_inr,
      totals.total_amount,
      overview.total_payments_inr,
      overview.total_payments,
      paymentRows.reduce((acc, row) => acc + row.amount, 0)
    );
    const successAmount = getNumber(
      totals.success_amount_inr,
      totals.successful_amount_inr,
      overview.successful_payments_inr,
      paymentRows.filter((row) => row.status === 'success').reduce((acc, row) => acc + row.amount, 0)
    );
    const failedAmount = getNumber(
      totals.failed_amount_inr,
      overview.failed_payments_inr,
      paymentRows.filter((row) => row.status === 'failed').reduce((acc, row) => acc + row.amount, 0)
    );
    const refundedAmount = getNumber(
      totals.refunded_amount_inr,
      overview.refunded_amount_inr,
      paymentRows.filter((row) => row.status === 'refunded').reduce((acc, row) => acc + row.amount, 0)
    );
    const trend = getNumber(
      totals.total_growth_percent,
      totals.growth_percent,
      overview.total_growth_percent,
      12.6
    );
    const successShare = totalAmount ? ((successAmount / totalAmount) * 100).toFixed(1) : '0.0';
    const failedShare = totalAmount ? ((failedAmount / totalAmount) * 100).toFixed(1) : '0.0';
    const refundedShare = totalAmount ? ((refundedAmount / totalAmount) * 100).toFixed(1) : '0.0';
    return {
      totalAmount,
      successAmount,
      failedAmount,
      refundedAmount,
      trend,
      successShare,
      failedShare,
      refundedShare,
    };
  }, [paymentRows, state.financeOverview]);
  const paymentOverviewSeries = useMemo(() => {
    const labels = [];
    const cursor = new Date();
    cursor.setDate(1);
    for (let index = 4; index >= 0; index -= 1) {
      const point = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
      labels.push({
        key: `${point.getFullYear()}-${point.getMonth()}`,
        label: format(point, 'MMM'),
        success: 0,
        failed: 0,
        refunded: 0,
      });
    }
    const map = new Map(labels.map((item) => [item.key, item]));
    paymentRows.forEach((row) => {
      const date = toDate(row.createdAt);
      if (!date) return;
      const bucket = map.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (!bucket) return;
      bucket[row.status] = (bucket[row.status] || 0) + row.amount;
    });
    return labels;
  }, [paymentRows]);
  const paymentMethodDistribution = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#FB923C', '#A855F7', '#F43F5E'];
    const totals = new Map();
    paymentRows.forEach((row) => {
      totals.set(row.paymentMethod, (totals.get(row.paymentMethod) || 0) + row.amount);
    });
    const grandTotal = Array.from(totals.values()).reduce((acc, value) => acc + value, 0);
    return Array.from(totals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value], index) => ({
        label,
        value,
        percent: grandTotal ? `${((value / grandTotal) * 100).toFixed(1)}%` : '0.0%',
        color: palette[index % palette.length],
      }));
  }, [paymentRows]);
  const recentFailedPayments = useMemo(
    () => paymentRows
      .filter((row) => row.status === 'failed')
      .sort((left, right) => (toDate(right.createdAt)?.getTime() || 0) - (toDate(left.createdAt)?.getTime() || 0))
      .slice(0, 3),
    [paymentRows]
  );
  const renewalRows = useMemo(() => {
    const activeRows = state.subscriptions.filter((subscription) => subscription.status === 'active');
    return activeRows
      .map((subscription) => {
        const daysLeft = getDaysLeftValue(subscription);
        const lastReminderDate = subscription.raw?.last_reminder_at
          || subscription.raw?.last_reminder_date
          || subscription.raw?.renewal_reminder_sent_at
          || subscription.raw?.last_notification_at
          || null;
        let renewalStatus = 'upcoming';
        if (daysLeft !== null && daysLeft < 0) renewalStatus = 'overdue';
        else if (daysLeft !== null && daysLeft <= 7) renewalStatus = 'due_soon';
        else if (subscription.autoRenew) renewalStatus = 'auto_renew';
        return {
          ...subscription,
          daysLeft,
          daysLeftLabel: daysLeft === null ? '-' : daysLeft < 0 ? 'Overdue' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          renewalStatus,
          lastReminderDate,
        };
      })
      .filter((subscription) => subscription.daysLeft === null || subscription.daysLeft <= 45)
      .sort((left, right) => (left.daysLeft ?? Number.MAX_SAFE_INTEGER) - (right.daysLeft ?? Number.MAX_SAFE_INTEGER));
  }, [state.subscriptions]);
  const filteredRenewalRows = useMemo(() => {
    let rows = [...renewalRows];
    if (search.trim()) rows = rows.filter((row) => row.searchText.includes(search.trim().toLowerCase()));
    if (planId) rows = rows.filter((row) => row.plan.id === planId);
    if (status) rows = rows.filter((row) => row.renewalStatus === status);
    if (propertyType) rows = rows.filter((row) => String(row.property.city || '').toLowerCase() === String(propertyType).toLowerCase());
    if (rmId) rows = rows.filter((row) => row.rm?.id === rmId);
    if (advancedFiltersDraft.hostQuery.trim()) rows = rows.filter((row) => row.searchText.includes(advancedFiltersDraft.hostQuery.trim().toLowerCase()));
    if (advancedFiltersDraft.city.trim()) rows = rows.filter((row) => String(row.property.city || '').toLowerCase().includes(advancedFiltersDraft.city.trim().toLowerCase()));
    if (advancedFiltersDraft.state.trim()) rows = rows.filter((row) => String(row.property.state || '').toLowerCase().includes(advancedFiltersDraft.state.trim().toLowerCase()));
    if (advancedFiltersDraft.billingCycle) rows = rows.filter((row) => row.plan.billingCycle === advancedFiltersDraft.billingCycle);
    if (advancedFiltersDraft.autoRenew) rows = rows.filter((row) => String(row.autoRenew) === String(advancedFiltersDraft.autoRenew === 'on'));
    if (advancedFiltersDraft.renewalFrom) rows = rows.filter((row) => (toDate(row.nextRenewalDate)?.getTime() || 0) >= (toDate(advancedFiltersDraft.renewalFrom)?.getTime() || 0));
    if (advancedFiltersDraft.renewalTo) rows = rows.filter((row) => (toDate(row.nextRenewalDate)?.getTime() || 0) <= (toDate(advancedFiltersDraft.renewalTo)?.getTime() || Number.MAX_SAFE_INTEGER));
    return rows.sort((left, right) => {
      if (sortBy === 'subscriptionCode') return compareValues(left.subscriptionCode, right.subscriptionCode, sortOrder);
      if (sortBy === 'host') return compareValues(left.host.name, right.host.name, sortOrder);
      if (sortBy === 'plan') return compareValues(left.plan.name, right.plan.name, sortOrder);
      if (sortBy === 'nextRenewal') return compareValues(toDate(left.nextRenewalDate)?.getTime() || 0, toDate(right.nextRenewalDate)?.getTime() || 0, sortOrder);
      if (sortBy === 'status') return compareValues(left.renewalStatus, right.renewalStatus, sortOrder);
      if (sortBy === 'rm') return compareValues(left.rm?.name || '', right.rm?.name || '', sortOrder);
      return compareValues(left.daysLeft ?? Number.MAX_SAFE_INTEGER, right.daysLeft ?? Number.MAX_SAFE_INTEGER, sortOrder === 'asc' ? 'asc' : 'desc');
    });
  }, [advancedFiltersDraft, renewalRows, search, planId, status, propertyType, rmId, sortBy, sortOrder]);
  const renewalTotalPages = Math.max(1, Math.ceil(filteredRenewalRows.length / limit));
  const currentRenewalPage = Math.min(page, renewalTotalPages);
  const paginatedRenewalRows = useMemo(
    () => filteredRenewalRows.slice((currentRenewalPage - 1) * limit, currentRenewalPage * limit),
    [filteredRenewalRows, currentRenewalPage, limit]
  );
  const selectedRenewalRows = filteredRenewalRows.filter((row) => selectedIds.includes(row.id));
  const renewalSummary = useMemo(() => {
    const totalRenewals = renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft <= 30).length;
    const dueWithin7 = renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft >= 0 && row.daysLeft <= 7).length;
    const dueWithin15 = renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft >= 0 && row.daysLeft <= 15).length;
    const overdue = renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft < 0).length;
    const autoRenewEnabled = renewalRows.filter((row) => row.autoRenew).length;
    return {
      totalRenewals,
      dueWithin7,
      dueWithin15,
      overdue,
      autoRenewEnabled,
      dueWithin7Percent: totalRenewals ? ((dueWithin7 / totalRenewals) * 100).toFixed(1) : '0.0',
      dueWithin15Percent: totalRenewals ? ((dueWithin15 / totalRenewals) * 100).toFixed(1) : '0.0',
      overduePercent: totalRenewals ? ((overdue / totalRenewals) * 100).toFixed(1) : '0.0',
      autoRenewPercent: totalRenewals ? ((autoRenewEnabled / totalRenewals) * 100).toFixed(1) : '0.0',
    };
  }, [renewalRows]);
  const renewalTimeline = useMemo(() => ([
    { label: 'Today', value: renewalRows.filter((row) => row.daysLeft === 0).length, color: '#3B82F6' },
    { label: '1-7 Days', value: renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft >= 1 && row.daysLeft <= 7).length, color: '#FB923C' },
    { label: '8-15 Days', value: renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft >= 8 && row.daysLeft <= 15).length, color: '#22C55E' },
    { label: '16-30 Days', value: renewalRows.filter((row) => row.daysLeft !== null && row.daysLeft >= 16 && row.daysLeft <= 30).length, color: '#A855F7' },
  ]), [renewalRows]);
  const renewalPlanDistribution = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#FB923C', '#A855F7', '#EC4899', '#94A3B8'];
    const counts = new Map();
    renewalRows.forEach((row) => {
      counts.set(row.plan.name || 'Others', (counts.get(row.plan.name || 'Others') || 0) + 1);
    });
    const total = renewalRows.length || 1;
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([label, value], index) => ({
        label,
        value,
        percent: `${((value / total) * 100).toFixed(1)}%`,
        color: palette[index % palette.length],
      }));
  }, [renewalRows]);
  const renewalAutoRenewBreakdown = useMemo(() => {
    const enabled = renewalRows.filter((row) => row.autoRenew).length;
    const disabled = renewalRows.length - enabled;
    return [
      { label: 'Auto-renew Enabled', value: enabled, percent: renewalRows.length ? `${((enabled / renewalRows.length) * 100).toFixed(1)}%` : '0.0%', color: '#16A34A' },
      { label: 'Auto-renew Disabled', value: disabled, percent: renewalRows.length ? `${((disabled / renewalRows.length) * 100).toFixed(1)}%` : '0.0%', color: '#94A3B8' },
    ];
  }, [renewalRows]);
  const trialSummary = useMemo(() => {
    const rows = baseRows;
    const activeTrials = rows.filter((row) => getTrialLifecycle(row) === 'active').length;
    const expiringSoonTrials = rows.filter((row) => getTrialLifecycle(row) === 'expiring_soon').length;
    const expiredTrials = rows.filter((row) => getTrialLifecycle(row) === 'expired').length;
    const convertedTrials = rows.filter((row) => row.status === 'active' && row.amount > 0).length;
    const conversionRate = rows.length ? Number(((convertedTrials / rows.length) * 100).toFixed(1)) : 0;
    return {
      totalTrials: rows.length,
      activeTrials,
      expiringSoonTrials,
      expiredTrials,
      convertedTrials,
      conversionRate,
    };
  }, [baseRows]);
  const expiringSoonRows = useMemo(
    () => [...baseRows].filter((row) => getTrialLifecycle(row) === 'expiring_soon').sort((left, right) => {
      const leftDays = typeof left.trialDaysRemaining === 'number' ? left.trialDaysRemaining : (daysUntil(left.trialEndDate || left.nextRenewalDate || left.expiryDate) ?? Number.MAX_SAFE_INTEGER);
      const rightDays = typeof right.trialDaysRemaining === 'number' ? right.trialDaysRemaining : (daysUntil(right.trialEndDate || right.nextRenewalDate || right.expiryDate) ?? Number.MAX_SAFE_INTEGER);
      return leftDays - rightDays;
    }).slice(0, 5),
    [baseRows]
  );
  const activeSummary = useMemo(() => {
    const rows = baseRows;
    const total = summary.totalSubscriptions || state.subscriptions.length || 0;
    const monthlyRevenue = rows.reduce((acc, row) => acc + Number(row.amount || 0), 0);
    const avgPlanValue = rows.length ? monthlyRevenue / rows.length : 0;
    const renewingSoon = rows.filter((row) => {
      const remainingDays = getDaysLeftValue(row);
      return remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
    }).length;
    const avgActiveDurationDays = rows.length
      ? rows.reduce((acc, row) => {
        const startTime = toDate(row.startDate)?.getTime();
        if (!startTime) return acc;
        return acc + Math.max(0, differenceInCalendarDays(new Date(), new Date(startTime)));
      }, 0) / rows.length
      : 0;
    return {
      totalActive: rows.length,
      totalPercent: total ? ((rows.length / total) * 100).toFixed(1) : '0.0',
      monthlyRevenue,
      avgPlanValue,
      renewingSoon,
      avgActiveDurationMonths: avgActiveDurationDays / 30,
    };
  }, [baseRows, state.subscriptions.length, summary.totalSubscriptions]);
  const activePlanBreakdown = useMemo(() => {
    const counts = new Map();
    baseRows.forEach((row) => {
      const key = row.plan.name || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const palette = ['#2563EB', '#16A34A', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9'];
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value], index) => ({
        label,
        value,
        percent: baseRows.length ? `${((value / baseRows.length) * 100).toFixed(1)}%` : '0.0%',
        color: palette[index % palette.length],
      }));
  }, [baseRows]);
  const activeRenewalTimeline = useMemo(() => {
    const buckets = [
      { label: 'Today', value: 0, matcher: (days) => days === 0, color: '#3B82F6' },
      { label: '3-7 Days', value: 0, matcher: (days) => days >= 3 && days <= 7, color: '#22C55E' },
      { label: '8-15 Days', value: 0, matcher: (days) => days >= 8 && days <= 15, color: '#FB923C' },
      { label: '16-30 Days', value: 0, matcher: (days) => days >= 16 && days <= 30, color: '#A855F7' },
    ];
    baseRows.forEach((row) => {
      const days = getDaysLeftValue(row);
      const bucket = buckets.find((item) => item.matcher(days));
      if (bucket) bucket.value += 1;
    });
    return buckets;
  }, [baseRows]);
  const topActiveRms = useMemo(() => {
    const counts = new Map();
    baseRows.forEach((row) => {
      const key = row.rm?.id || 'unassigned';
      const existing = counts.get(key) || { ...row.rm, name: row.rm?.name || 'Unassigned RM', code: row.rm?.code || '-', total: 0 };
      existing.total += 1;
      counts.set(key, existing);
    });
    return Array.from(counts.values()).sort((left, right) => right.total - left.total).slice(0, 5);
  }, [baseRows]);
  const normalizedPlans = useMemo(
    () => state.plans.map((plan) => normalizePlan(plan, state.subscriptions)),
    [state.plans, state.subscriptions]
  );
  const planTypeOptions = useMemo(
    () => Array.from(new Set(normalizedPlans.map((plan) => plan.type).filter(Boolean))),
    [normalizedPlans]
  );
  const planTargetUserOptions = useMemo(
    () => Array.from(new Set(normalizedPlans.flatMap((plan) => plan.targetUsers).filter(Boolean))),
    [normalizedPlans]
  );
  const filteredPlanRows = useMemo(() => {
    let rows = [...normalizedPlans];
    if (search.trim()) rows = rows.filter((row) => row.searchText.includes(search.trim().toLowerCase()));
    if (status) rows = rows.filter((row) => row.status === status);
    if (planId) rows = rows.filter((row) => row.type === planId);
    if (rmId) rows = rows.filter((row) => row.targetUsers.includes(rmId));
    if (advancedFiltersDraft.startFrom) rows = rows.filter((row) => Number(row.durationDays || 0) >= Number(advancedFiltersDraft.startFrom));
    if (advancedFiltersDraft.amountMin) rows = rows.filter((row) => row.priceMonthly >= Number(advancedFiltersDraft.amountMin));
    if (advancedFiltersDraft.amountMax) rows = rows.filter((row) => row.priceMonthly <= Number(advancedFiltersDraft.amountMax));
    return rows.sort((left, right) => {
      if (sortBy === 'amount') return compareValues(left.priceMonthly, right.priceMonthly, sortOrder);
      if (sortBy === 'status') return compareValues(left.status, right.status, sortOrder);
      if (sortBy === 'plan') return compareValues(left.type, right.type, sortOrder);
      return compareValues(left.name, right.name, sortOrder);
    });
  }, [advancedFiltersDraft.amountMax, advancedFiltersDraft.amountMin, advancedFiltersDraft.startFrom, normalizedPlans, planId, rmId, search, sortBy, sortOrder, status]);
  const planTotalPages = Math.max(1, Math.ceil(filteredPlanRows.length / limit));
  const currentPlanPage = Math.min(page, planTotalPages);
  const paginatedPlanRows = useMemo(
    () => filteredPlanRows.slice((currentPlanPage - 1) * limit, currentPlanPage * limit),
    [filteredPlanRows, currentPlanPage, limit]
  );
  const planSummary = useMemo(() => {
    const totalPlans = normalizedPlans.length;
    const activePlans = normalizedPlans.filter((plan) => plan.status === 'active').length;
    const inactivePlans = normalizedPlans.filter((plan) => plan.status !== 'active').length;
    const mostPopularPlan = normalizedPlans.slice().sort((left, right) => right.subscribers - left.subscribers)[0] || null;
    const revenuePotential = normalizedPlans.reduce((acc, plan) => acc + Number(plan.revenuePotential || 0), 0);
    return {
      totalPlans,
      activePlans,
      inactivePlans,
      activePercent: totalPlans ? ((activePlans / totalPlans) * 100).toFixed(1) : '0.0',
      inactivePercent: totalPlans ? ((inactivePlans / totalPlans) * 100).toFixed(1) : '0.0',
      mostPopularPlan,
      revenuePotential,
    };
  }, [normalizedPlans]);
  const planDistribution = useMemo(() => {
    const palette = ['#2563EB', '#F59E0B', '#8B5CF6', '#16A34A', '#EC4899', '#94A3B8'];
    const counts = new Map();
    normalizedPlans.forEach((plan) => {
      counts.set(plan.type, (counts.get(plan.type) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, value], index) => ({
      label: getPlanTypeLabel(label),
      value,
      percent: normalizedPlans.length ? `${((value / normalizedPlans.length) * 100).toFixed(1)}%` : '0.0%',
      color: palette[index % palette.length],
    }));
  }, [normalizedPlans]);
  const selectedComparisonPlan = paginatedPlanRows[0] || normalizedPlans[0] || null;
  const normalizedAddons = useMemo(
    () => ADDON_FALLBACKS.map((addon) => ({
      ...addon,
      searchText: [addon.name, addon.description, addon.category, addon.applicableTo].join(' ').toLowerCase(),
    })),
    []
  );
  const addonCategoryOptions = useMemo(
    () => Array.from(new Set(normalizedAddons.map((addon) => addon.category).filter(Boolean))),
    [normalizedAddons]
  );
  const filteredAddonRows = useMemo(() => {
    let rows = [...normalizedAddons];
    if (search.trim()) rows = rows.filter((row) => row.searchText.includes(search.trim().toLowerCase()));
    if (status) rows = rows.filter((row) => row.status === status);
    if (propertyType) rows = rows.filter((row) => row.category === propertyType);
    if (planId) rows = rows.filter((row) => row.applicableTo === 'All Plans' || row.applicableTo.toLowerCase().includes(planId.toLowerCase()));
    if (advancedFiltersDraft.amountMin) rows = rows.filter((row) => row.price >= Number(advancedFiltersDraft.amountMin));
    if (advancedFiltersDraft.amountMax) rows = rows.filter((row) => row.price <= Number(advancedFiltersDraft.amountMax));
    return rows.sort((left, right) => {
      if (sortBy === 'amount') return compareValues(left.price, right.price, sortOrder);
      if (sortBy === 'status') return compareValues(left.status, right.status, sortOrder);
      return compareValues(left.name, right.name, sortOrder);
    });
  }, [advancedFiltersDraft.amountMax, advancedFiltersDraft.amountMin, normalizedAddons, planId, propertyType, search, sortBy, sortOrder, status]);
  const addonTotalPages = Math.max(1, Math.ceil(filteredAddonRows.length / limit));
  const currentAddonPage = Math.min(page, addonTotalPages);
  const paginatedAddonRows = useMemo(
    () => filteredAddonRows.slice((currentAddonPage - 1) * limit, currentAddonPage * limit),
    [filteredAddonRows, currentAddonPage, limit]
  );
  const addonSummary = useMemo(() => {
    const totalAddons = normalizedAddons.length;
    const activeAddons = normalizedAddons.filter((addon) => addon.status === 'active').length;
    const inactiveAddons = normalizedAddons.filter((addon) => addon.status === 'inactive').length;
    const mostUsedAddon = normalizedAddons.slice().sort((left, right) => right.users - left.users)[0] || null;
    const monthlyRevenue = normalizedAddons.reduce((acc, addon) => acc + (addon.billingCycle === 'monthly' ? addon.price * addon.users : 0), 0);
    const totalUses = normalizedAddons.reduce((acc, addon) => acc + addon.users, 0);
    return {
      totalAddons,
      activeAddons,
      inactiveAddons,
      activePercent: totalAddons ? ((activeAddons / totalAddons) * 100).toFixed(1) : '0.0',
      inactivePercent: totalAddons ? ((inactiveAddons / totalAddons) * 100).toFixed(1) : '0.0',
      mostUsedAddon,
      monthlyRevenue,
      totalUses,
    };
  }, [normalizedAddons]);
  const addonDistribution = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#94A3B8'];
    const counts = new Map();
    normalizedAddons.forEach((addon) => {
      counts.set(addon.category, (counts.get(addon.category) || 0) + addon.users);
    });
    return Array.from(counts.entries()).map(([label, value], index) => ({
      label: getAddonCategoryLabel(label),
      value,
      percent: addonSummary.totalUses ? `${((value / addonSummary.totalUses) * 100).toFixed(1)}%` : '0.0%',
      color: palette[index % palette.length],
    }));
  }, [addonSummary.totalUses, normalizedAddons]);
  const topAddonRows = useMemo(
    () => normalizedAddons.slice().sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [normalizedAddons]
  );
  const archivedSummary = useMemo(() => {
    const rows = baseRows;
    const total = summary.totalSubscriptions || state.subscriptions.length || 0;
    const expiredRows = rows.filter((row) => row.status === 'expired');
    const cancelledRows = rows.filter((row) => row.status === 'cancelled');
    const didNotRenew = expiredRows.filter((row) => {
      const reason = formatReasonLabel(row.cancellationReason, row.status).toLowerCase();
      return reason.includes('did not renew') || reason.includes('not renew') || reason.includes('expired');
    }).length;
    const cancelledByUser = cancelledRows.filter((row) => {
      const reason = formatReasonLabel(row.cancellationReason, row.status).toLowerCase();
      return reason.includes('user') || reason.includes('personal');
    }).length;
    const reactivated = rows.filter((row) => row.raw?.reactivated_at || row.raw?.is_reactivated || row.raw?.reactivation_date).length;
    return {
      totalArchived: rows.length,
      expiredCount: expiredRows.length,
      cancelledCount: cancelledRows.length,
      expiredPercent: total ? ((expiredRows.length / total) * 100).toFixed(1) : '0.0',
      cancelledPercent: total ? ((cancelledRows.length / total) * 100).toFixed(1) : '0.0',
      didNotRenew,
      didNotRenewPercent: expiredRows.length ? ((didNotRenew / expiredRows.length) * 100).toFixed(1) : '0.0',
      cancelledByUser,
      cancelledByUserPercent: cancelledRows.length ? ((cancelledByUser / cancelledRows.length) * 100).toFixed(1) : '0.0',
      reactivationRate: rows.length ? ((reactivated / rows.length) * 100).toFixed(1) : '0.0',
      reactivationTrend: Number(summary.reactivationRateTrend || 0).toFixed(1),
    };
  }, [baseRows, state.subscriptions.length, summary.reactivationRateTrend, summary.totalSubscriptions]);
  const archivedTrendData = useMemo(() => {
    const monthLabels = [];
    const cursor = new Date();
    cursor.setDate(1);
    for (let index = 5; index >= 0; index -= 1) {
      const point = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
      monthLabels.push({
        key: `${point.getFullYear()}-${point.getMonth()}`,
        label: format(point, 'MMM'),
        expired: 0,
        cancelled: 0,
      });
    }
    const monthMap = new Map(monthLabels.map((item) => [item.key, item]));
    baseRows.forEach((row) => {
      const endDate = toDate(row.nextRenewalDate || row.expiryDate);
      if (!endDate) return;
      const key = `${endDate.getFullYear()}-${endDate.getMonth()}`;
      const bucket = monthMap.get(key);
      if (!bucket) return;
      if (row.status === 'expired') bucket.expired += 1;
      if (row.status === 'cancelled') bucket.cancelled += 1;
    });
    return monthLabels;
  }, [baseRows]);
  const archivedReasonBreakdown = useMemo(() => {
    const counts = new Map();
    baseRows.forEach((row) => {
      const label = formatReasonLabel(row.cancellationReason, row.status);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label,
        value,
        percent: baseRows.length ? `${((value / baseRows.length) * 100).toFixed(1)}%` : '0.0%',
      }));
  }, [baseRows]);
  const trialConversionSteps = useMemo(() => {
    const total = trialSummary.totalTrials || 1;
    return [
      { label: 'Trial Started', value: trialSummary.totalTrials, percent: '100%', width: '100%', color: '#3B82F6' },
      { label: 'Still Active', value: trialSummary.activeTrials, percent: `${((trialSummary.activeTrials / total) * 100).toFixed(1)}%`, width: '84%', color: '#14B8A6' },
      { label: 'Expiring Soon', value: trialSummary.expiringSoonTrials, percent: `${((trialSummary.expiringSoonTrials / total) * 100).toFixed(1)}%`, width: '68%', color: '#F59E0B' },
      { label: 'Expired', value: trialSummary.expiredTrials, percent: `${((trialSummary.expiredTrials / total) * 100).toFixed(1)}%`, width: '52%', color: '#F43F5E' },
      { label: 'Converted to Paid', value: trialSummary.convertedTrials, percent: `${trialSummary.conversionRate}%`, width: '36%', color: '#6366F1' },
    ];
  }, [trialSummary]);

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    if (!updates.page) next.set('page', '1');
    setSearchParams(next);
  };

  const toggleSort = (columnKey) => {
    if (sortBy === columnKey) {
      updateQuery({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
      return;
    }
    updateQuery({ sortBy: columnKey, sortOrder: 'asc' });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['planId', 'status', 'propertyType', 'rmId', 'billingCycle', 'hostQuery', 'city', 'state', 'startFrom', 'startTo', 'renewalFrom', 'renewalTo', 'amountMin', 'amountMax', 'autoRenew', 'monetizationType'].forEach((key) => next.delete(key));
    next.set('page', '1');
    setSearchParams(next);
    setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS);
  };

  const applyAdvancedFilters = () => {
    const next = new URLSearchParams(searchParams);
    Object.entries(advancedFiltersDraft).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.set('page', '1');
    setSearchParams(next);
    setAdvancedOpen(false);
  };

  const handlePaymentAction = async (action, transaction) => {
    if (!transaction) return;
    if (action === 'detail') {
      await showNotice({
        title: transaction.transactionCode,
        description: `${transaction.host.name} paid ${formatCurrencyINR(transaction.amount)} via ${transaction.paymentMethod}. Status: ${transaction.status}.`,
        eyebrow: 'Payment History',
      });
      return;
    }
    if (action === 'invoice') {
      try {
        await adminPhase1API.shareFinanceInvoice(transaction.id, 'email');
        await showNotice({
          title: 'Invoice shared',
          description: `Invoice for ${transaction.transactionCode} has been shared using the finance API.`,
          eyebrow: 'Payment History',
        });
      } catch (error) {
        await showNotice({
          title: 'Invoice action not completed',
          description: error.response?.data?.detail || 'Invoice sharing is wired, but the backend did not complete the action.',
          eyebrow: 'Payment History',
        });
      }
      return;
    }
    if (action === 'refund') {
      try {
        await adminPhase1API.initiateFinanceRefund(transaction.id, {
          amount: transaction.amount,
          reason: `Refund initiated from payment history for ${transaction.transactionCode}`,
        });
        await showNotice({
          title: 'Refund initiated',
          description: `Refund request was submitted for ${transaction.transactionCode}.`,
          eyebrow: 'Payment History',
        });
        await load({ background: true });
      } catch (error) {
        await showNotice({
          title: 'Refund action not completed',
          description: error.response?.data?.detail || 'Refund initiation is ready for API integration, but the current backend did not complete it.',
          eyebrow: 'Payment History',
        });
      }
    }
  };

  const handleExport = async () => {
    if (!canExport) return;
    if (isRemindersView || section === 'reminders') {
      downloadCsv(`renewal-reminders-${new Date().toISOString().slice(0, 10)}.csv`, buildReminderCsv(selectedRenewalRows.length ? selectedRenewalRows : filteredRenewalRows));
      return;
    }
    if (isPaymentsView || section === 'payments') {
      try {
        const response = await adminPhase1API.exportFinanceTransactions({
          search,
          transaction_type: planId || undefined,
          payment_method: propertyType || undefined,
          status: status || undefined,
          range: rmId || undefined,
        });
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payment-history-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      } catch (error) {
        downloadCsv(`payment-history-${new Date().toISOString().slice(0, 10)}.csv`, buildPaymentCsv(selectedPaymentRows.length ? selectedPaymentRows : filteredPaymentRows));
        return;
      }
    }
    downloadCsv(`subscriptions-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(selectedRows.length ? selectedRows : filteredRows));
  };

  const callActionApi = async (type, subscription, form) => {
    if (!subscription) return;
    try {
      if (type === 'cancel') {
        await adminPhase1API.updateSubscriptionStatus(subscription.id, { status: 'cancelled', reason: form.reason });
      } else if (type === 'reactivate') {
        try {
          await adminPhase1API.reactivateSubscription(subscription.id, { reason: form.reason });
        } catch (error) {
          if (error.response?.status === 404) {
            await adminPhase1API.updateSubscriptionStatus(subscription.id, { status: 'active', reason: form.reason });
          } else {
            throw error;
          }
        }
      } else if (type === 'convertTrial') {
        try {
          await adminPhase1API.convertTrialSubscription(subscription.id, {
            reason: form.reason,
            plan_id: form.renewalPlanId,
            amount: Number(form.amount || 0),
            duration: form.duration,
          });
        } catch (error) {
          if (error.response?.status === 404) {
            await adminPhase1API.updateSubscriptionStatus(subscription.id, { status: 'active', reason: form.reason });
          } else {
            throw error;
          }
        }
      } else if (type === 'renew') {
        await adminPhase1API.renewSubscription(subscription.id, {
          reason: form.reason,
          plan_id: form.renewalPlanId,
          duration: form.duration,
          start_date: form.startDate || undefined,
          amount: Number(form.amount || 0),
        });
      } else if (type === 'changePlan') {
        await adminPhase1API.changeSubscriptionPlan(subscription.id, {
          reason: form.reason,
          plan_id: form.renewalPlanId,
          effective_date: form.effectiveDate,
          start_date: form.startDate || undefined,
        });
      } else if (type === 'reminder') {
        await adminPhase1API.sendSubscriptionReminder(subscription.id, { channel: 'default' });
      } else if (type === 'autoRenew') {
        await adminPhase1API.updateSubscriptionAutoRenew(subscription.id, { auto_renewal: form.autoRenew === 'on', reason: form.reason });
      }

      setDialogState({ type: '', subscription: null });
      await load({ background: true });
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      await showNotice({
        title: 'Action Not Completed',
        description: detail || 'This workflow is wired for backend integration, but the current API does not complete this action yet.',
        eyebrow: 'Subscription Action',
      });
    }
  };

  const handleBulkAction = async (action) => {
    if (isRemindersView || section === 'reminders') {
      if (!selectedRenewalRows.length) {
        await showNotice({
          title: 'Select renewals',
          description: 'Choose at least one renewal row before running a bulk action.',
          eyebrow: 'Bulk Actions',
        });
        return;
      }

      if (action === 'export') {
        downloadCsv(`renewal-reminders-selected-${new Date().toISOString().slice(0, 10)}.csv`, buildReminderCsv(selectedRenewalRows));
        return;
      }

      if (action === 'reminder') {
        await Promise.all(selectedRenewalRows.map((row) => adminPhase1API.sendSubscriptionReminder(row.id, { channel: 'default' }).catch(() => null)));
        await showNotice({
          title: 'Reminders submitted',
          description: 'Reminder requests were sent for the selected subscriptions.',
          eyebrow: 'Renewal Reminders',
        });
        await load({ background: true });
        return;
      }

      if (action === 'enableAutoRenew' || action === 'disableAutoRenew') {
        const autoRenewal = action === 'enableAutoRenew';
        await Promise.all(selectedRenewalRows.map((row) => adminPhase1API.updateSubscriptionAutoRenew(row.id, {
          auto_renewal: autoRenewal,
          reason: `Bulk ${autoRenewal ? 'enable' : 'disable'} auto-renew from renewal reminders`,
        }).catch(() => null)));
        await showNotice({
          title: autoRenewal ? 'Auto-renew enabled' : 'Auto-renew disabled',
          description: `Selected subscriptions were updated for ${autoRenewal ? 'enabled' : 'disabled'} auto-renew.`,
          eyebrow: 'Renewal Reminders',
        });
        await load({ background: true });
        return;
      }
    }

    if (isPaymentsView || section === 'payments') {
      if (!selectedPaymentRows.length) {
        await showNotice({
          title: 'Select payments',
          description: 'Choose at least one payment transaction before running a bulk action.',
          eyebrow: 'Bulk Actions',
        });
        return;
      }

      if (action === 'export') {
        downloadCsv(`payments-selected-${new Date().toISOString().slice(0, 10)}.csv`, buildPaymentCsv(selectedPaymentRows));
        return;
      }

      if (action === 'invoice') {
        await Promise.all(selectedPaymentRows.map((row) => adminPhase1API.shareFinanceInvoice(row.id, 'email').catch(() => null)));
        await showNotice({
          title: 'Invoice batch processed',
          description: 'Selected invoice share actions were submitted.',
          eyebrow: 'Bulk Actions',
        });
        return;
      }

      await showNotice({
        title: 'Backend action required',
        description: 'This payment bulk workflow is ready in the UI, but the current backend does not expose the final bulk endpoint yet.',
        eyebrow: 'Bulk Actions',
      });
      return;
    }

    if (!selectedRows.length) {
      await showNotice({
        title: 'Select subscriptions',
        description: 'Choose at least one subscription before running a bulk action.',
        eyebrow: 'Bulk Actions',
      });
      return;
    }

    if (action === 'export') {
      downloadCsv(`subscriptions-selected-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(selectedRows));
      return;
    }

    if (action === 'cancel') {
      try {
        await Promise.all(selectedRows.map((row) => adminPhase1API.updateSubscriptionStatus(row.id, { status: 'cancelled', reason: 'Bulk cancellation from All Subscriptions' })));
        await load({ background: true });
        setSelectedIds([]);
      } catch (error) {
        await showNotice({
          title: 'Bulk cancellation failed',
          description: error.response?.data?.detail || 'One or more subscriptions could not be cancelled.',
          eyebrow: 'Bulk Actions',
        });
      }
      return;
    }

    await showNotice({
      title: 'Backend action required',
      description: 'This bulk workflow is present in the UI and ready for API integration, but the current backend does not expose it yet.',
      eyebrow: 'Bulk Actions',
    });
  };

  const submitPlanEditor = async (payload) => {
    try {
      setPlanEditorState((current) => ({ ...current, saving: true }));
      const apiPayload = {
        plan_name: payload.name,
        description: payload.description,
        plan_type: payload.type,
        target_users: payload.targetUsers,
        validity_days: payload.durationDays,
        price_monthly: payload.priceMonthly,
        properties_limit: payload.propertiesLimit === 'Unlimited' ? payload.propertiesLimit : Number(payload.propertiesLimit || 0),
        features: payload.features,
        is_active: payload.status === 'active',
      };

      if (planEditorState.plan?.id) {
        await adminPhase1API.updateSubscriptionPlan(planEditorState.plan.id, apiPayload);
      } else {
        await adminPhase1API.createSubscriptionPlan(apiPayload);
      }

      setPlanEditorState({ open: false, plan: null, saving: false });
      await load({ background: true });
    } catch (error) {
      setPlanEditorState((current) => ({ ...current, saving: false }));
      await showNotice({
        title: 'Plan action not completed',
        description: error.response?.data?.detail || 'This plan workflow is ready for backend integration, but the current API did not complete the action.',
        eyebrow: 'Plan Management',
      });
    }
  };

  const submitAddonEditor = async (payload) => {
    try {
      setAddonEditorState((current) => ({ ...current, saving: true }));
      await showNotice({
        title: addonEditorState.addon ? 'Add-on updated in UI layer' : 'Add-on created in UI layer',
        description: 'This add-on workflow is structured and ready for backend integration. Connect the add-on API to persist these changes.',
        eyebrow: 'Add-on Management',
      });
      setAddonEditorState({ open: false, addon: null, saving: false });
    } catch (error) {
      setAddonEditorState((current) => ({ ...current, saving: false }));
      await showNotice({
        title: 'Add-on action not completed',
        description: error.response?.data?.detail || 'The add-on action could not be completed.',
        eyebrow: 'Add-on Management',
      });
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      await adminPhase1API.updateSubscriptionPlanStatus(plan.id, {
        status: plan.status === 'active' ? 'inactive' : 'active',
      });
      await load({ background: true });
    } catch (error) {
      await showNotice({
        title: 'Status update not completed',
        description: error.response?.data?.detail || 'The plan status endpoint is not completing this action yet.',
        eyebrow: 'Plan Management',
      });
    }
  };

  if (isPaymentsView || section === 'payments') {
    const paymentFromCount = filteredPaymentRows.length ? (currentPaymentPage - 1) * limit + 1 : 0;
    const paymentToCount = Math.min(currentPaymentPage * limit, filteredPaymentRows.length);

    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Payment History</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Payment History</h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        View and track all subscription payments, refunds, and transactions.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="h-4 w-4" /> Export CSV
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" disabled={!canBulk} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50">
                            Bulk Actions <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                          <DropdownMenuItem onClick={() => handleBulkAction('invoice')}>Share Invoices</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleBulkAction('refund')} className="text-rose-700 focus:text-rose-700">Mark For Refund Review</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard title="Total Payments" value={formatCurrencyINR(paymentSummary.totalAmount)} subtitle="vs last month" icon={CreditCard} tone="bg-blue-50 text-blue-600" trend={`+${paymentSummary.trend}%`} />
                  <MetricCard title="Successful Payments" value={formatCurrencyINR(paymentSummary.successAmount)} subtitle={`${paymentSummary.successShare}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                  <MetricCard title="Failed Payments" value={formatCurrencyINR(paymentSummary.failedAmount)} subtitle={`${paymentSummary.failedShare}% of total`} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                  <MetricCard title="Refunded Amount" value={formatCurrencyINR(paymentSummary.refundedAmount)} subtitle={`${paymentSummary.refundedShare}% of total`} icon={ReceiptText} tone="bg-orange-50 text-orange-600" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by transaction ID, host name, email, or plan name..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Transaction Types</option>
                        {paymentTransactionTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Payment Methods</option>
                        {paymentMethodOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Status</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                        <option value="pending">Pending</option>
                      </select>
                      <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">Date Range</option>
                        <option value="this_month">This Month</option>
                        <option value="last_30_days">Last 30 Days</option>
                        <option value="last_90_days">Last 90 Days</option>
                        <option value="this_year">This Year</option>
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Payment Transactions</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(filteredPaymentRows.length)} Transactions</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PAYMENT_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key] ?? true} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredPaymentRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                <tr>
                                  <th className="w-12 px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={paginatedPaymentRows.length > 0 && paginatedPaymentRows.every((row) => selectedIds.includes(row.id))}
                                      onChange={(event) => {
                                        const checked = event.target.checked;
                                        setSelectedIds((current) => checked
                                          ? Array.from(new Set([...current, ...paginatedPaymentRows.map((row) => row.id)]))
                                          : current.filter((id) => !paginatedPaymentRows.some((row) => row.id === id)));
                                      }}
                                      className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                    />
                                  </th>
                                  {visibleColumns.transaction !== false ? <SortableHead label="Transaction ID" active={sortBy === 'transactionCode' || sortBy === 'transaction'} order={sortOrder} onClick={() => toggleSort('transactionCode')} /> : null}
                                  {visibleColumns.dateTime !== false ? <SortableHead label="Date & Time" active={sortBy === 'dateTime' || sortBy === 'createdAt'} order={sortOrder} onClick={() => toggleSort('dateTime')} /> : null}
                                  {visibleColumns.host !== false ? <SortableHead label="Host / User" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                  {visibleColumns.plan !== false ? <SortableHead label="Plan / Add-on" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.amount !== false ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.paymentMethod !== false ? <th className="px-4 py-3">Payment Method</th> : null}
                                  {visibleColumns.status !== false ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => toggleSort('status')} /> : null}
                                  {visibleColumns.invoice !== false ? <th className="px-4 py-3">Invoice</th> : null}
                                  {visibleColumns.actions !== false ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedPaymentRows.map((transaction) => (
                                  <tr key={transaction.id} className="border-b border-slate-100 last:border-none">
                                    <td className="px-4 py-4 align-top">
                                      <input
                                        type="checkbox"
                                        checked={selectedIds.includes(transaction.id)}
                                        onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, transaction.id] : current.filter((value) => value !== transaction.id))}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                                      />
                                    </td>
                                    {visibleColumns.transaction !== false ? (
                                      <td className="px-4 py-4 align-top">
                                        <p className="text-sm font-black text-slate-950">{transaction.transactionCode || '-'}</p>
                                      </td>
                                    ) : null}
                                    {visibleColumns.dateTime !== false ? (
                                      <td className="px-4 py-4 align-top text-sm font-bold text-slate-700">{transaction.createdAt ? formatDateValue(transaction.createdAt, 'dd MMM yyyy hh:mm a') : '-'}</td>
                                    ) : null}
                                    {visibleColumns.host !== false ? (
                                      <td className="px-4 py-4 align-top">
                                        <div className="flex min-w-0 items-start gap-3">
                                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-[#2563EB]">{transaction.host.initials}</span>
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-950">{transaction.host.name}</p>
                                            <p className="truncate text-xs font-semibold text-slate-500">{transaction.host.email || '-'}</p>
                                          </div>
                                        </div>
                                      </td>
                                    ) : null}
                                    {visibleColumns.plan !== false ? (
                                      <td className="px-4 py-4 align-top">
                                        <p className="text-sm font-black text-slate-950">{transaction.planName}</p>
                                        <p className="text-xs font-semibold text-[#2563EB]">{transaction.planMeta}</p>
                                      </td>
                                    ) : null}
                                    {visibleColumns.amount !== false ? <td className="px-4 py-4 align-top text-sm font-black text-slate-950">{formatCurrencyINR(transaction.amount)}</td> : null}
                                    {visibleColumns.paymentMethod !== false ? <td className="px-4 py-4 align-top text-sm font-semibold text-slate-700">{transaction.paymentMethod}</td> : null}
                                    {visibleColumns.status !== false ? <td className="px-4 py-4 align-top"><PaymentStatusBadge status={transaction.status} /></td> : null}
                                    {visibleColumns.invoice !== false ? (
                                      <td className="px-4 py-4 align-top">
                                        {transaction.invoiceCode ? (
                                          <button type="button" onClick={() => handlePaymentAction('invoice', transaction)} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-[#2563EB] hover:bg-blue-100">
                                            <ReceiptText className="h-3.5 w-3.5" /> {transaction.invoiceCode}
                                          </button>
                                        ) : (
                                          <span className="text-sm font-semibold text-slate-400">-</span>
                                        )}
                                      </td>
                                    ) : null}
                                    {visibleColumns.actions !== false ? (
                                      <td className="px-4 py-4 align-top">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button type="button" className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                                              <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 bg-white p-2">
                                            <DropdownMenuItem onClick={() => handlePaymentAction('detail', transaction)}>View Details</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePaymentAction('invoice', transaction)}>Share Invoice</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handlePaymentAction('refund', transaction)} className="text-rose-700 focus:text-rose-700">Initiate Refund</DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-semibold text-slate-500">Showing {paymentFromCount} to {paymentToCount} of {formatNumber(filteredPaymentRows.length)} transactions</p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentPaymentPage} totalPages={paymentTotalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState title="No payments found" description="Try a different search term or clear the current filters to see payment transactions." actionLabel="Clear Filters" onAction={clearFilters} />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Payment Overview</h3>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={paymentOverviewSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
                            <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}K`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} width={34} />
                            <Tooltip content={<RevenueTooltip />} />
                            <Area type="monotone" dataKey="success" stackId="1" stroke="#16A34A" fill="#16A34A" fillOpacity={0.16} strokeWidth={2.5} />
                            <Area type="monotone" dataKey="failed" stackId="2" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.12} strokeWidth={2.2} />
                            <Area type="monotone" dataKey="refunded" stackId="3" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.12} strokeWidth={2.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Payment Methods</h3>
                      <div className="mt-4 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center xl:grid-cols-1 2xl:grid-cols-[120px_minmax(0,1fr)]">
                        <div className="mx-auto h-32 w-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={paymentMethodDistribution} dataKey="value" nameKey="label" innerRadius={34} outerRadius={54} paddingAngle={3}>
                                {paymentMethodDistribution.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrencyINR(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                          {paymentMethodDistribution.map((item) => <LegendRow key={item.label} label={item.label} value={item.value} percent={item.percent} color={item.color} />)}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Recent Failed Payments</h3>
                      </div>
                      <div className="space-y-4">
                        {recentFailedPayments.length ? recentFailedPayments.map((item, index) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-50 text-xs font-black text-rose-600">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-950">{item.host.name}</p>
                              <p className="truncate text-xs font-semibold text-slate-500">{item.planName}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">{item.createdAt ? formatDateValue(item.createdAt, 'dd MMM yyyy, hh:mm a') : '-'}</p>
                            </div>
                            <span className="shrink-0 text-sm font-black text-slate-950">{formatCurrencyINR(item.amount)}</span>
                          </div>
                        )) : <p className="text-sm font-semibold text-slate-500">No failed payments in the current dataset.</p>}
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-3">
                        <QuickAction icon={ReceiptText} title="Generate Payment Report" description="Download detailed payment report" onClick={handleExport} disabled={!canExport} />
                        <QuickAction icon={WalletCards} title="Reconcile Payments" description="Match payments with invoices" onClick={() => showNotice({ title: 'Reconciliation workflow', description: 'This reconciliation flow is ready for backend integration.', eyebrow: 'Payment History' })} disabled={!canEdit} />
                        <QuickAction icon={RefreshCw} title="Process Refund" description="Initiate refund for a transaction" onClick={() => recentFailedPayments[0] ? handlePaymentAction('refund', recentFailedPayments[0]) : showNotice({ title: 'No transaction selected', description: 'Select a payment row to initiate a refund.', eyebrow: 'Payment History' })} disabled={!canEdit} />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (isRemindersView || section === 'reminders') {
    const reminderFromCount = filteredRenewalRows.length ? (currentRenewalPage - 1) * limit + 1 : 0;
    const reminderToCount = Math.min(currentRenewalPage * limit, filteredRenewalRows.length);
    const reminderMaxValue = Math.max(...renewalTimeline.map((item) => item.value), 1);

    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Renewal Reminders</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Renewal Reminders</h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        Track upcoming renewals and send automated or manual reminders to users.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showNotice({ title: 'Reminder configuration', description: 'Reminder configuration UI is ready for scheduling, channel, and cadence settings.', eyebrow: 'Renewal Reminders' })}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <SlidersHorizontal className="h-4 w-4" /> Configure Reminders
                    </button>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Renewals (Next 30 Days)" value={formatNumber(renewalSummary.totalRenewals)} subtitle="Subscriptions" icon={CalendarClock} tone="bg-blue-50 text-blue-600" />
                  <MetricCard title="Due Within 7 Days" value={formatNumber(renewalSummary.dueWithin7)} subtitle={`${renewalSummary.dueWithin7Percent}% of total`} icon={Clock3} tone="bg-orange-50 text-orange-600" />
                  <MetricCard title="Due Within 15 Days" value={formatNumber(renewalSummary.dueWithin15)} subtitle={`${renewalSummary.dueWithin15Percent}% of total`} icon={CalendarDays} tone="bg-amber-50 text-amber-600" />
                  <MetricCard title="Overdue" value={formatNumber(renewalSummary.overdue)} subtitle={`${renewalSummary.overduePercent}% of total`} icon={BellRing} tone="bg-rose-50 text-rose-600" />
                  <MetricCard title="Auto-renew Enabled" value={formatNumber(renewalSummary.autoRenewEnabled)} subtitle={`${renewalSummary.autoRenewPercent}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by host name, email, subscription ID, or property name..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plans</option>
                        {state.plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                      </select>
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Statuses</option>
                        <option value="due_soon">Due Soon</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="auto_renew">Auto-renew</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Cities</option>
                        {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                      <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All RMs</option>
                        {state.rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Renewal Reminders</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(filteredRenewalRows.length)} Records</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleBulkAction('reminder')} disabled={!canBulk} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                            <BellRing className="h-4 w-4" /> Send Reminder
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {REMINDER_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key] ?? true} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredRenewalRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1450px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  <th className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={paginatedRenewalRows.length > 0 && paginatedRenewalRows.every((row) => selectedIds.includes(row.id))}
                                      onChange={(event) => {
                                        if (event.target.checked) {
                                          setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRenewalRows.map((row) => row.id)])));
                                        } else {
                                          setSelectedIds((current) => current.filter((id) => !paginatedRenewalRows.some((row) => row.id === id)));
                                        }
                                      }}
                                    />
                                  </th>
                                  {visibleColumns.subscription !== false ? <SortableHead label="Subscription ID" active={sortBy === 'subscriptionCode'} order={sortOrder} onClick={() => toggleSort('subscriptionCode')} /> : null}
                                  {visibleColumns.host !== false ? <SortableHead label="Host / Owner" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                  {visibleColumns.property !== false ? <th className="px-4 py-3">Property</th> : null}
                                  {visibleColumns.plan !== false ? <SortableHead label="Plan" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.nextRenewal !== false ? <SortableHead label="Current End Date" active={sortBy === 'nextRenewal'} order={sortOrder} onClick={() => toggleSort('nextRenewal')} /> : null}
                                  {visibleColumns.daysLeft !== false ? <th className="px-4 py-3">Days Left</th> : null}
                                  {visibleColumns.autoRenew !== false ? <th className="px-4 py-3">Auto Renew</th> : null}
                                  {visibleColumns.status !== false ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => toggleSort('status')} /> : null}
                                  {visibleColumns.lastReminder !== false ? <th className="px-4 py-3">Last Reminder</th> : null}
                                  {visibleColumns.actions !== false ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedRenewalRows.map((subscription) => {
                                  const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                  return (
                                    <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                                      <td className={`px-4 ${rowPadding}`}>
                                        <input
                                          type="checkbox"
                                          checked={selectedIds.includes(subscription.id)}
                                          onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, subscription.id] : current.filter((id) => id !== subscription.id))}
                                        />
                                      </td>
                                      {visibleColumns.subscription !== false ? (
                                        <td className={`px-4 ${rowPadding} min-w-[180px]`}>
                                          <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="text-left">
                                            <span className="block text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.subscriptionCode}</span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.host !== false ? (
                                        <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                          <div className="flex items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-xs font-black text-[#1D4ED8]">{subscription.host.initials}</span>
                                            <div className="min-w-0">
                                              <button type="button" onClick={() => navigate('/admin/hosts')} className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.host.name}</button>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subscription.host.email || subscription.host.phone || '-'}</p>
                                            </div>
                                          </div>
                                        </td>
                                      ) : null}
                                      {visibleColumns.property !== false ? (
                                        <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                          <button type="button" onClick={() => navigate('/admin/properties')} className="flex min-w-0 items-start gap-3 text-left">
                                            <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                              {subscription.property.thumbnail ? (
                                                <img src={subscription.property.thumbnail} alt={subscription.property.name} className="h-full w-full object-cover" />
                                              ) : (
                                                <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{subscription.host.initials}</span>
                                              )}
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.property.name}</span>
                                              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.property.city || subscription.property.propertyCode || '-'}</span>
                                            </span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.plan !== false ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block text-sm font-black text-slate-900">{subscription.plan.name}</span>
                                          <span className="mt-1 block text-xs font-bold text-[#2563EB]">{subscription.plan.durationLabel}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.nextRenewal !== false ? <td className={`px-4 text-sm font-black text-slate-900 ${rowPadding}`}>{formatDateValue(subscription.nextRenewalDate)}</td> : null}
                                      {visibleColumns.daysLeft !== false ? <td className={`px-4 ${rowPadding}`}><DaysLeftBadge subscription={subscription} warningThreshold={15} /></td> : null}
                                      {visibleColumns.autoRenew !== false ? <td className={`px-4 ${rowPadding}`}><AutoRenewBadge enabled={subscription.autoRenew} /></td> : null}
                                      {visibleColumns.status !== false ? <td className={`px-4 ${rowPadding}`}><RenewalStatusBadge status={subscription.renewalStatus} /></td> : null}
                                      {visibleColumns.lastReminder !== false ? <td className={`px-4 text-sm font-bold text-slate-700 ${rowPadding}`}>{formatDateValue(subscription.lastReminderDate)}</td> : null}
                                      {visibleColumns.actions !== false ? (
                                        <td className={`px-4 ${rowPadding}`}>
                                          <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => callActionApi('reminder', subscription, { reason: 'Manual reminder from renewal reminders' })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                                              <BellRing className="h-4 w-4" />
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                                                <DropdownMenuLabel>Renewal Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setDialogState({ type: 'detail', subscription })}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDialogState({ type: 'reminder', subscription })} disabled={!canEdit}>Send Reminder</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDialogState({ type: 'autoRenew', subscription })} disabled={!canEdit}>{subscription.autoRenew ? 'Disable Auto-renew' : 'Enable Auto-renew'}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigate('/admin/subscriptions/payment-history')}>View Payment History</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{reminderFromCount}</span> to <span className="font-black text-slate-950">{reminderToCount}</span> of <span className="font-black text-slate-950">{formatNumber(filteredRenewalRows.length)}</span> renewals
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentRenewalPage} totalPages={renewalTotalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState title="No renewal reminders found" description="Try a different filter combination or clear the current reminder filters." actionLabel="Clear Filters" onAction={clearFilters} />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Renewal Timeline (Next 30 Days)</h3>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        {renewalTimeline.map((item) => {
                          const height = `${Math.max(24, (item.value / reminderMaxValue) * 96)}px`;
                          return (
                            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{item.value}</span>
                              <div className="w-full rounded-t-2xl" style={{ height, background: `linear-gradient(180deg, ${item.color} 0%, rgba(255,255,255,0.32) 100%)` }} />
                              <span className="text-[11px] font-black text-slate-500">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Plan-wise Renewals</h3>
                      <div className="mt-4 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[120px_minmax(0,1fr)] md:items-center">
                        <div className="relative mx-auto h-32 w-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={renewalPlanDistribution} dataKey="value" innerRadius={34} outerRadius={54} paddingAngle={3}>
                                {renewalPlanDistribution.map((item) => <Cell key={item.label} fill={item.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                            <div>
                              <p className="text-2xl font-black text-slate-950">{formatNumber(renewalRows.length)}</p>
                              <p className="text-xs font-bold text-slate-400">Renewals</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {renewalPlanDistribution.map((item) => <LegendRow key={item.label} label={item.label} value={item.value} percent={item.percent} color={item.color} />)}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Automatic Renewal Status</h3>
                      <div className="mt-4 space-y-4">
                        {renewalAutoRenewBreakdown.map((item) => (
                          <div key={item.label}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                              <span className="text-sm font-black text-slate-950">{formatNumber(item.value)} <span className="font-semibold text-slate-400">{item.percent}</span></span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full" style={{ width: item.percent, backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-3">
                        <QuickAction icon={BellRing} title="Send Renewal Reminders" description="Send email or WhatsApp reminders" onClick={() => handleBulkAction('reminder')} disabled={!canBulk} />
                        <QuickAction icon={Check} title="Enable Auto-Renew" description="Bulk enable auto-renew for selected" onClick={() => handleBulkAction('enableAutoRenew')} disabled={!canBulk} />
                        <QuickAction icon={Download} title="Export Renewal List" description="Download upcoming renewals (CSV)" onClick={handleExport} disabled={!canExport} />
                        <QuickAction icon={SlidersHorizontal} title="View Renewal Settings" description="Configure reminder schedule" onClick={() => showNotice({ title: 'Reminder settings', description: 'Scheduling controls can be connected here.', eyebrow: 'Renewal Reminders' })} />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Reminder Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine renewals by host, location, billing cycle, auto-renew status and renewal window.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Billing Cycle">
                <select value={advancedFiltersDraft.billingCycle} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, billingCycle: event.target.value }))} className={filterInputClass}>
                  <option value="">All billing cycles</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="annual">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </FilterField>
              <FilterField label="Auto-renew">
                <select value={advancedFiltersDraft.autoRenew} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, autoRenew: event.target.value }))} className={filterInputClass}>
                  <option value="">All</option>
                  <option value="on">Enabled</option>
                  <option value="off">Disabled</option>
                </select>
              </FilterField>
              <FilterField label="Host">
                <input value={advancedFiltersDraft.hostQuery} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, hostQuery: event.target.value }))} className={filterInputClass} placeholder="Host, email, phone" />
              </FilterField>
              <FilterField label="City">
                <input value={advancedFiltersDraft.city} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, city: event.target.value }))} className={filterInputClass} placeholder="Pune" />
              </FilterField>
              <FilterField label="State">
                <input value={advancedFiltersDraft.state} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, state: event.target.value }))} className={filterInputClass} placeholder="Maharashtra" />
              </FilterField>
              <FilterField label="Renewal Date From">
                <input type="date" value={advancedFiltersDraft.renewalFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalFrom: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Renewal Date To">
                <input type="date" value={advancedFiltersDraft.renewalTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalTo: event.target.value }))} className={filterInputClass} />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={applyAdvancedFilters} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <ActionDialog state={dialogState} onClose={() => setDialogState({ type: '', subscription: null })} onSubmit={callActionApi} plans={state.plans} canEdit={canEdit} />
      </div>
    );
  }

  if (isAddonsView || section === 'addons') {
    const addonFromCount = filteredAddonRows.length ? (currentAddonPage - 1) * limit + 1 : 0;
    const addonToCount = Math.min(currentAddonPage * limit, filteredAddonRows.length);

    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Add-on Management</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Add-on Management</h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        Create, manage and configure add-on features for subscription plans.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddonEditorState({ open: true, addon: null, saving: false })}
                      disabled={!canCreate}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Create New Add-on
                    </button>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Add-ons" value={formatNumber(addonSummary.totalAddons)} subtitle="All add-ons" icon={LayoutGrid} tone="bg-blue-50 text-blue-600" />
                  <MetricCard title="Active Add-ons" value={formatNumber(addonSummary.activeAddons)} subtitle={`${addonSummary.activePercent}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                  <MetricCard title="Inactive Add-ons" value={formatNumber(addonSummary.inactiveAddons)} subtitle={`${addonSummary.inactivePercent}% of total`} icon={CircleOff} tone="bg-orange-50 text-orange-600" />
                  <MetricCard title="Most Used Add-on" value={addonSummary.mostUsedAddon?.name || '-'} subtitle={`${formatNumber(addonSummary.mostUsedAddon?.users || 0)} subscriptions`} icon={UsersRound} tone="bg-violet-50 text-violet-600" />
                  <MetricCard title="Add-on Revenue (This Month)" value={formatCurrencyINR(addonSummary.monthlyRevenue)} subtitle="vs last month" icon={BarChart3} tone="bg-emerald-50 text-emerald-600" trend="+18.4%" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by add-on name or description..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[128px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                      </select>
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Categories</option>
                        {addonCategoryOptions.map((option) => <option key={option} value={option}>{getAddonCategoryLabel(option)}</option>)}
                      </select>
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plans</option>
                        {normalizedPlans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Add-on Features</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(filteredAddonRows.length)} Add-ons</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ADDON_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key] ?? true} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh add-ons">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredAddonRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1160px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  {visibleColumns.name !== false ? <SortableHead label="Add-on Name" active={sortBy === 'name'} order={sortOrder} onClick={() => toggleSort('name')} /> : null}
                                  {visibleColumns.category !== false ? <th className="px-4 py-3">Category</th> : null}
                                  {visibleColumns.applicableTo !== false ? <th className="px-4 py-3">Applicable To</th> : null}
                                  {visibleColumns.price !== false ? <SortableHead label="Price" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.billingCycle !== false ? <th className="px-4 py-3">Billing Cycle</th> : null}
                                  {visibleColumns.status !== false ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => toggleSort('status')} /> : null}
                                  {visibleColumns.users !== false ? <th className="px-4 py-3">Users</th> : null}
                                  {visibleColumns.actions !== false ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedAddonRows.map((addon) => (
                                  <tr key={addon.id} className="align-top hover:bg-slate-50/70">
                                    {visibleColumns.name !== false ? (
                                      <td className="min-w-[220px] px-4 py-4">
                                        <div className="min-w-0">
                                          <span className="block truncate text-sm font-black text-slate-950">{addon.name}</span>
                                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{addon.description}</span>
                                        </div>
                                      </td>
                                    ) : null}
                                    {visibleColumns.category !== false ? <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${getAddonCategoryTone(addon.category)}`}>{getAddonCategoryLabel(addon.category)}</span></td> : null}
                                    {visibleColumns.applicableTo !== false ? <td className="px-4 py-4 text-sm font-bold text-slate-700">{addon.applicableTo}</td> : null}
                                    {visibleColumns.price !== false ? <td className="px-4 py-4 text-sm font-black text-slate-950">{formatCurrencyINR(addon.price)}</td> : null}
                                    {visibleColumns.billingCycle !== false ? <td className="px-4 py-4 text-sm font-bold text-slate-700">{getPlanTypeLabel(addon.billingCycle)}</td> : null}
                                    {visibleColumns.status !== false ? <td className="px-4 py-4"><PlanStatusBadge status={addon.status === 'active' ? 'active' : 'inactive'} /></td> : null}
                                    {visibleColumns.users !== false ? <td className="px-4 py-4 text-sm font-black text-slate-950">{formatNumber(addon.users)}</td> : null}
                                    {visibleColumns.actions !== false ? (
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setAddonEditorState({ open: true, addon, saving: false })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`Edit ${addon.name}`}>
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${addon.name}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                                              <DropdownMenuLabel>Add-on Actions</DropdownMenuLabel>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem onClick={() => setAddonEditorState({ open: true, addon, saving: false })}>Edit Add-on</DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => submitAddonEditor({ ...addon, status: addon.status === 'active' ? 'inactive' : 'active' })} disabled={!canEdit}>
                                                {addon.status === 'active' ? 'Deactivate Add-on' : 'Activate Add-on'}
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{addonFromCount}</span> to <span className="font-black text-slate-950">{addonToCount}</span> of <span className="font-black text-slate-950">{formatNumber(filteredAddonRows.length)}</span> add-ons
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentAddonPage} totalPages={addonTotalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState
                            title={normalizedAddons.length ? 'No matching add-ons found.' : 'No add-ons yet.'}
                            description={normalizedAddons.length ? 'Try adjusting search or filters to find the add-ons you need.' : 'Create your first add-on to extend plan capabilities.'}
                            actionLabel={canCreate ? 'Create New Add-on' : ''}
                            onAction={() => setAddonEditorState({ open: true, addon: null, saving: false })}
                          />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Add-on Usage by Category</h3>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="relative h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={addonDistribution} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2}>
                                {addonDistribution.map((item) => <Cell key={item.label} fill={item.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                            <div>
                              <p className="text-2xl font-black text-slate-950">{formatNumber(addonSummary.totalUses)}</p>
                              <p className="text-xs font-bold text-slate-400">Total Uses</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {addonDistribution.map((item) => (
                            <LegendRow key={item.label} label={item.label} color={item.color} value={item.value} percent={item.percent} />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Top Performing Add-ons</h3>
                        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">This Month</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {topAddonRows.map((addon, index) => (
                          <div key={addon.id} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-slate-950">{addon.name}</span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{formatNumber(addon.users)} uses</span>
                            </span>
                            <span className="shrink-0 text-sm font-black text-slate-950">{formatCurrencyINR(addon.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-2">
                        <QuickAction icon={Columns3} title="Create New Add-on" description="Add a new feature or service" onClick={() => setAddonEditorState({ open: true, addon: null, saving: false })} disabled={!canCreate} />
                        <QuickAction icon={SlidersHorizontal} title="Manage Categories" description="Organize add-on categories" onClick={() => setAdvancedOpen(true)} />
                        <QuickAction icon={BarChart3} title="View Usage Reports" description="Analyze add-on performance" onClick={() => navigate('/admin/reports')} disabled={!analyticsCanView} />
                        <QuickAction icon={WalletCards} title="Configure Plan Mapping" description="Assign add-ons to subscription plans" onClick={() => navigate('/admin/subscriptions/plans')} />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Add-on Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine add-ons by category, pricing, plan applicability and lifecycle state.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Category">
                <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className={filterInputClass}>
                  <option value="">All Categories</option>
                  {addonCategoryOptions.map((option) => <option key={option} value={option}>{getAddonCategoryLabel(option)}</option>)}
                </select>
              </FilterField>
              <FilterField label="Plan">
                <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className={filterInputClass}>
                  <option value="">All Plans</option>
                  {normalizedPlans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Status">
                <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className={filterInputClass}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </FilterField>
              <FilterField label="Price Min">
                <input type="number" min="0" value={advancedFiltersDraft.amountMin} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMin: event.target.value }))} className={filterInputClass} placeholder="0" />
              </FilterField>
              <FilterField label="Price Max">
                <input type="number" min="0" value={advancedFiltersDraft.amountMax} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMax: event.target.value }))} className={filterInputClass} placeholder="10000" />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={() => setAdvancedOpen(false)} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <AddonEditorDialog
          open={addonEditorState.open}
          onClose={() => setAddonEditorState({ open: false, addon: null, saving: false })}
          onSubmit={submitAddonEditor}
          addon={addonEditorState.addon}
          saving={addonEditorState.saving}
          plans={normalizedPlans}
        />
      </div>
    );
  }

  if (isPlansView || section === 'plans') {
    const planFromCount = filteredPlanRows.length ? (currentPlanPage - 1) * limit + 1 : 0;
    const planToCount = Math.min(currentPlanPage * limit, filteredPlanRows.length);

    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Plan Management</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Plan Management</h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        Create, edit, and manage subscription plans for hosts, brokers and other user types.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlanEditorState({ open: true, plan: null, saving: false })}
                      disabled={!canCreate}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Create New Plan
                    </button>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Plans" value={formatNumber(planSummary.totalPlans)} subtitle="Active subscription plans" icon={Columns3} tone="bg-blue-50 text-blue-600" />
                  <MetricCard title="Active Plans" value={formatNumber(planSummary.activePlans)} subtitle={`${planSummary.activePercent}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                  <MetricCard title="Inactive Plans" value={formatNumber(planSummary.inactivePlans)} subtitle={`${planSummary.inactivePercent}% of total`} icon={CircleOff} tone="bg-rose-50 text-rose-600" />
                  <MetricCard title="Most Popular Plan" value={planSummary.mostPopularPlan?.name || '-'} subtitle={`${formatNumber(planSummary.mostPopularPlan?.subscribers || 0)} active subscribers`} icon={UsersRound} tone="bg-violet-50 text-violet-600" />
                  <MetricCard title="Total Revenue Potential" value={formatCurrencyINR(planSummary.revenuePotential)} subtitle="Per month (if fully subscribed)" icon={BarChart3} tone="bg-fuchsia-50 text-fuchsia-600" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by plan name, type, or description..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plan Types</option>
                        {planTypeOptions.map((option) => <option key={option} value={option}>{getPlanTypeLabel(option)}</option>)}
                      </select>
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[128px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[160px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Target Users</option>
                        {planTargetUserOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Subscription Plans</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(filteredPlanRows.length)} Plans</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PLAN_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key] ?? true} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh plans">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredPlanRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1220px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  {visibleColumns.name !== false ? <SortableHead label="Plan Name" active={sortBy === 'name'} order={sortOrder} onClick={() => toggleSort('name')} /> : null}
                                  {visibleColumns.type !== false ? <SortableHead label="Type" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.targetUsers !== false ? <th className="px-4 py-3">Target Users</th> : null}
                                  {visibleColumns.duration !== false ? <th className="px-4 py-3">Duration</th> : null}
                                  {visibleColumns.price !== false ? <SortableHead label="Price" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.limit !== false ? <th className="px-4 py-3">Properties Limit</th> : null}
                                  {visibleColumns.features !== false ? <th className="px-4 py-3">Features</th> : null}
                                  {visibleColumns.status !== false ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => toggleSort('status')} /> : null}
                                  {visibleColumns.subscribers !== false ? <th className="px-4 py-3">Subscribers</th> : null}
                                  {visibleColumns.actions !== false ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedPlanRows.map((plan) => (
                                  <tr key={plan.id} className="align-top hover:bg-slate-50/70">
                                    {visibleColumns.name !== false ? (
                                      <td className="min-w-[190px] px-4 py-4">
                                        <div className="min-w-0">
                                          <span className="block truncate text-sm font-black text-slate-950">{plan.name}</span>
                                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{plan.description || '-'}</span>
                                        </div>
                                      </td>
                                    ) : null}
                                    {visibleColumns.type !== false ? (
                                      <td className="px-4 py-4">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${getPlanTypeTone(plan.type)}`}>{getPlanTypeLabel(plan.type)}</span>
                                      </td>
                                    ) : null}
                                    {visibleColumns.targetUsers !== false ? <td className="px-4 py-4 text-sm font-bold text-slate-700">{plan.targetUsers.join(' / ')}</td> : null}
                                    {visibleColumns.duration !== false ? <td className="px-4 py-4 text-sm font-bold text-slate-700">{plan.durationLabel}</td> : null}
                                    {visibleColumns.price !== false ? <td className="px-4 py-4 text-sm font-black text-slate-950">{formatCurrencyINR(plan.priceMonthly)}</td> : null}
                                    {visibleColumns.limit !== false ? <td className="px-4 py-4 text-sm font-bold text-slate-700">{plan.propertiesLimit}</td> : null}
                                    {visibleColumns.features !== false ? <td className="px-4 py-4 text-sm font-black text-[#2563EB]">{formatNumber(plan.featuresCount)} features</td> : null}
                                    {visibleColumns.status !== false ? <td className="px-4 py-4"><PlanStatusBadge status={plan.status} /></td> : null}
                                    {visibleColumns.subscribers !== false ? <td className="px-4 py-4 text-sm font-black text-slate-950">{formatNumber(plan.subscribers)}</td> : null}
                                    {visibleColumns.actions !== false ? (
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setPlanEditorState({ open: true, plan, saving: false })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`Edit ${plan.name}`}>
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${plan.name}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                                              <DropdownMenuLabel>Plan Actions</DropdownMenuLabel>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem onClick={() => setPlanEditorState({ open: true, plan, saving: false })}>Edit Plan</DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => togglePlanStatus(plan)} disabled={!canEdit}>{plan.status === 'active' ? 'Deactivate Plan' : 'Activate Plan'}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{planFromCount}</span> to <span className="font-black text-slate-950">{planToCount}</span> of <span className="font-black text-slate-950">{formatNumber(filteredPlanRows.length)}</span> plans
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentPlanPage} totalPages={planTotalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState
                            title={normalizedPlans.length ? 'No matching plans found.' : 'No subscription plans yet.'}
                            description={normalizedPlans.length ? 'Try adjusting search or filters to find the plans you need.' : 'Create your first plan to start managing host subscriptions.'}
                            actionLabel={canCreate ? 'Create New Plan' : ''}
                            onAction={() => setPlanEditorState({ open: true, plan: null, saving: false })}
                          />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Plan Type Distribution</h3>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="relative h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={planDistribution} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2}>
                                {planDistribution.map((item) => <Cell key={item.label} fill={item.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                            <div>
                              <p className="text-2xl font-black text-slate-950">{formatNumber(planSummary.totalPlans)}</p>
                              <p className="text-xs font-bold text-slate-400">Plans</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {planDistribution.map((item) => (
                            <LegendRow key={item.label} label={item.label} color={item.color} value={item.value} percent={item.percent} />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Plan Comparison</h3>
                        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">{selectedComparisonPlan?.name || 'No Plan'}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {(selectedComparisonPlan?.features?.length ? selectedComparisonPlan.features.slice(0, 6) : ['Flexible pricing', 'Usage controls', 'Plan analytics', 'Priority support']).map((feature) => (
                          <div key={feature} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
                            <span>{feature}</span>
                          </div>
                        ))}
                        <button type="button" onClick={() => selectedComparisonPlan && setPlanEditorState({ open: true, plan: selectedComparisonPlan, saving: false })} className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-[#2563EB] hover:bg-white">
                          View Full Plan Details →
                        </button>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-2">
                        <QuickAction icon={Columns3} title="Create New Plan" description="Add a new subscription plan" onClick={() => setPlanEditorState({ open: true, plan: null, saving: false })} disabled={!canCreate} />
                        <QuickAction icon={Eye} title="Edit Existing Plan" description="Modify plan details" onClick={() => selectedComparisonPlan && setPlanEditorState({ open: true, plan: selectedComparisonPlan, saving: false })} disabled={!selectedComparisonPlan || !canEdit} />
                        <QuickAction icon={SlidersHorizontal} title="Manage Plan Features" description="Update features and limits" onClick={() => selectedComparisonPlan && setPlanEditorState({ open: true, plan: selectedComparisonPlan, saving: false })} disabled={!selectedComparisonPlan || !canEdit} />
                        <QuickAction icon={BarChart3} title="View Plan Analytics" description="See plan performance" onClick={() => navigate('/admin/reports')} disabled={!analyticsCanView} />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Plan Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine plans by pricing, audience, duration and activation state.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Plan Type">
                <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className={filterInputClass}>
                  <option value="">All Plan Types</option>
                  {planTypeOptions.map((option) => <option key={option} value={option}>{getPlanTypeLabel(option)}</option>)}
                </select>
              </FilterField>
              <FilterField label="Target Users">
                <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className={filterInputClass}>
                  <option value="">All Target Users</option>
                  {planTargetUserOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </FilterField>
              <FilterField label="Status">
                <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className={filterInputClass}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FilterField>
              <FilterField label="Duration Days Min">
                <input type="number" min="0" value={advancedFiltersDraft.startFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, startFrom: event.target.value }))} className={filterInputClass} placeholder="15" />
              </FilterField>
              <FilterField label="Price Min">
                <input type="number" min="0" value={advancedFiltersDraft.amountMin} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMin: event.target.value }))} className={filterInputClass} placeholder="0" />
              </FilterField>
              <FilterField label="Price Max">
                <input type="number" min="0" value={advancedFiltersDraft.amountMax} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMax: event.target.value }))} className={filterInputClass} placeholder="50000" />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={() => { setAdvancedOpen(false); }} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <PlanEditorDialog
          open={planEditorState.open}
          onClose={() => setPlanEditorState({ open: false, plan: null, saving: false })}
          onSubmit={submitPlanEditor}
          plan={planEditorState.plan}
          saving={planEditorState.saving}
        />
      </div>
    );
  }

  if (isArchivedView) {
    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Expired / Cancelled Subscriptions</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Expired / Cancelled Subscriptions</h1>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        View all expired and cancelled subscriptions. Track reasons, build re-engagement campaigns and convert users again.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="h-4 w-4" /> Export CSV
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" disabled={!canBulk} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50">
                            Bulk Actions <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                          <DropdownMenuItem onClick={() => handleBulkAction('reminder')}>Send Renewal Offer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleBulkAction('cancel')} className="text-rose-700 focus:text-rose-700">Archive Selected</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Expired" value={formatNumber(archivedSummary.expiredCount)} subtitle={`${archivedSummary.expiredPercent}% of total`} icon={CircleOff} tone="bg-orange-50 text-orange-600" />
                  <MetricCard title="Total Cancelled" value={formatNumber(archivedSummary.cancelledCount)} subtitle={`${archivedSummary.cancelledPercent}% of total`} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                  <MetricCard title="Did Not Renew" value={formatNumber(archivedSummary.didNotRenew)} subtitle={`${archivedSummary.didNotRenewPercent}% of expired`} icon={UsersRound} tone="bg-violet-50 text-violet-600" />
                  <MetricCard title="Cancelled By User" value={formatNumber(archivedSummary.cancelledByUser)} subtitle={`${archivedSummary.cancelledByUserPercent}% of cancelled`} icon={ReceiptText} tone="bg-amber-50 text-amber-600" />
                  <MetricCard title="Reactivation Rate" value={`${archivedSummary.reactivationRate}%`} subtitle="vs last month" icon={ArrowUpRight} tone="bg-cyan-50 text-cyan-600" trend={`+${archivedSummary.reactivationTrend}%`} />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by host name, email, subscription ID, or property..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[128px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plans</option>
                        {state.plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                      </select>
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[128px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Status</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Property Types</option>
                        {propertyTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select value={advancedFiltersDraft.city} onChange={(event) => updateQuery({ city: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Cities</option>
                        {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Expired / Cancelled Subscriptions</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(totalVisible)} Records</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ARCHIVED_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key]} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Toggle table density">
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh archived subscriptions">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1300px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  <th className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label="Select all archived subscriptions on this page"
                                      checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))}
                                      onChange={(event) => {
                                        if (event.target.checked) {
                                          setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRows.map((row) => row.id)])));
                                        } else {
                                          setSelectedIds((current) => current.filter((id) => !paginatedRows.some((row) => row.id === id)));
                                        }
                                      }}
                                    />
                                  </th>
                                  {visibleColumns.subscription ? <SortableHead label="Subscription ID" active={sortBy === 'subscriptionCode'} order={sortOrder} onClick={() => toggleSort('subscriptionCode')} /> : null}
                                  {visibleColumns.host ? <SortableHead label="Host / Owner" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                  {visibleColumns.property ? <th className="px-4 py-3">Property</th> : null}
                                  {visibleColumns.plan ? <SortableHead label="Plan" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.amount ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.status ? <th className="px-4 py-3">Status</th> : null}
                                  {visibleColumns.nextRenewal ? <SortableHead label="End Date" active={sortBy === 'nextRenewal'} order={sortOrder} onClick={() => toggleSort('nextRenewal')} /> : null}
                                  {visibleColumns.reason ? <th className="px-4 py-3">Reason</th> : null}
                                  {visibleColumns.actions ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedRows.map((subscription) => {
                                  const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                  const availableActions = getRowActions(subscription);
                                  return (
                                    <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                                      <td className={`px-4 ${rowPadding}`}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${subscription.subscriptionCode}`}
                                          checked={selectedIds.includes(subscription.id)}
                                          onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, subscription.id] : current.filter((id) => id !== subscription.id))}
                                        />
                                      </td>
                                      {visibleColumns.subscription ? (
                                        <td className={`px-4 ${rowPadding} min-w-[210px]`}>
                                          <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="text-left">
                                            <span className="block break-all text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.subscriptionCode}</span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.host ? (
                                        <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                          <div className="flex items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-xs font-black text-[#1D4ED8]">{subscription.host.initials}</span>
                                            <div className="min-w-0">
                                              <button type="button" onClick={() => navigate('/admin/hosts')} className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.host.name}</button>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subscription.host.email || subscription.host.phone || '-'}</p>
                                            </div>
                                          </div>
                                        </td>
                                      ) : null}
                                      {visibleColumns.property ? (
                                        <td className={`px-4 ${rowPadding} min-w-[240px]`}>
                                          <button type="button" onClick={() => navigate('/admin/properties')} className="flex min-w-0 items-start gap-3 text-left">
                                            <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                              {subscription.property.thumbnail ? (
                                                <img src={subscription.property.thumbnail} alt={subscription.property.name} className="h-full w-full object-cover" />
                                              ) : (
                                                <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{subscription.host.initials}</span>
                                              )}
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.property.name}</span>
                                              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.property.city ? `${subscription.property.city}${subscription.property.state ? `, ${subscription.property.state}` : ''}` : subscription.property.propertyCode || '-'}</span>
                                            </span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.plan ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block text-sm font-black text-slate-900">{subscription.plan.name}</span>
                                          <span className="mt-1 block text-xs font-bold text-[#2563EB]">{subscription.plan.durationLabel}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.amount ? <td className={`px-4 text-sm font-black text-slate-950 ${rowPadding}`}>{formatCurrencyINR(subscription.amount)}</td> : null}
                                      {visibleColumns.status ? <td className={`px-4 ${rowPadding}`}><SubscriptionStatusBadge status={subscription.status} /></td> : null}
                                      {visibleColumns.nextRenewal ? <td className={`px-4 text-sm font-black text-slate-900 ${rowPadding}`}>{formatDateValue(subscription.nextRenewalDate || subscription.expiryDate)}</td> : null}
                                      {visibleColumns.reason ? <td className={`px-4 text-sm font-semibold text-slate-600 ${rowPadding}`}>{formatReasonLabel(subscription.cancellationReason, subscription.status)}</td> : null}
                                      {visibleColumns.actions ? (
                                        <td className={`px-4 ${rowPadding}`}>
                                          <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`View ${subscription.subscriptionCode}`}>
                                              <Eye className="h-4 w-4" />
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${subscription.subscriptionCode}`}>
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                                                <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {availableActions.map((action) => (
                                                  <DropdownMenuItem
                                                    key={action.id}
                                                    onClick={() => action.kind === 'navigate' ? navigate(action.href) : setDialogState({ type: action.dialogType, subscription })}
                                                    disabled={action.requiresEdit && !canEdit}
                                                    className={action.tone === 'danger' ? 'text-rose-700 focus:text-rose-700' : ''}
                                                  >
                                                    {action.label}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{fromCount}</span> to <span className="font-black text-slate-950">{toCount}</span> of <span className="font-black text-slate-950">{formatNumber(totalVisible)}</span> subscriptions
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState
                            title={baseRows.length ? 'No matching archived subscriptions found.' : 'No expired or cancelled subscriptions yet.'}
                            description={baseRows.length ? 'Try adjusting search or filters to find the subscriptions you need.' : 'Expired and cancelled subscriptions will appear here once lifecycle changes occur.'}
                            actionLabel={baseRows.length ? 'Clear Filters' : 'Go To All Subscriptions'}
                            onAction={() => baseRows.length ? clearFilters() : navigate('/admin/subscriptions')}
                          />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Expired vs Cancelled Trend</h3>
                        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">Last 6 Months</span>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        {archivedTrendData.map((item) => {
                          const maxValue = Math.max(...archivedTrendData.map((entry) => Math.max(entry.expired, entry.cancelled)), 1);
                          const expiredHeight = `${Math.max(18, (item.expired / maxValue) * 82)}px`;
                          const cancelledHeight = `${Math.max(18, (item.cancelled / maxValue) * 82)}px`;
                          return (
                            <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                              <div className="flex h-28 items-end gap-1">
                                <div className="w-4 rounded-t-xl bg-rose-300" style={{ height: expiredHeight }} />
                                <div className="w-4 rounded-t-xl bg-blue-400" style={{ height: cancelledHeight }} />
                              </div>
                              <span className="text-[11px] font-black text-slate-500">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center gap-5 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Expired</span>
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Cancelled</span>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Top Cancellation Reasons</h3>
                      <div className="mt-4 space-y-4">
                        {archivedReasonBreakdown.map((item) => (
                          <div key={item.label}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-semibold text-slate-600">{item.label}</span>
                              <span className="shrink-0 text-sm font-black text-slate-900">{item.value} <span className="font-semibold text-slate-400">({item.percent})</span></span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-gradient-to-r from-rose-300 via-fuchsia-300 to-indigo-300" style={{ width: item.percent }} />
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => setAdvancedOpen(true)} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-[#2563EB] hover:bg-white">
                          View All Reasons →
                        </button>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Re-engagement Actions</h3>
                      <div className="mt-4 space-y-2">
                        <QuickAction
                          icon={BellRing}
                          title="Send Renewal Offer"
                          description="Send special discount to expired users"
                          onClick={() => handleBulkAction('reminder')}
                          disabled={!canBulk}
                        />
                        <QuickAction
                          icon={WalletCards}
                          title="Convert to New Plan"
                          description="Suggest alternative plans"
                          onClick={() => updateQuery({ section: 'plans' })}
                        />
                        <QuickAction
                          icon={UsersRound}
                          title="View Former Subscribers"
                          description="Detailed user history"
                          onClick={() => navigate('/admin/hosts')}
                        />
                        <QuickAction
                          icon={Download}
                          title="Export List"
                          description="Download expired/cancelled list"
                          onClick={handleExport}
                          disabled={!canExport}
                        />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Archived Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine expired and cancelled subscriptions by status, reason, geography and end dates.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Host">
                <input value={advancedFiltersDraft.hostQuery} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, hostQuery: event.target.value }))} className={filterInputClass} placeholder="Host, email, phone" />
              </FilterField>
              <FilterField label="City">
                <input value={advancedFiltersDraft.city} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, city: event.target.value }))} className={filterInputClass} placeholder="Goa" />
              </FilterField>
              <FilterField label="State">
                <input value={advancedFiltersDraft.state} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, state: event.target.value }))} className={filterInputClass} placeholder="Maharashtra" />
              </FilterField>
              <FilterField label="Billing Cycle">
                <select value={advancedFiltersDraft.billingCycle} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, billingCycle: event.target.value }))} className={filterInputClass}>
                  <option value="">All billing cycles</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="annual">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </FilterField>
              <FilterField label="End Date From">
                <input type="date" value={advancedFiltersDraft.renewalFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalFrom: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="End Date To">
                <input type="date" value={advancedFiltersDraft.renewalTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalTo: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Amount Min">
                <input type="number" min="0" value={advancedFiltersDraft.amountMin} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMin: event.target.value }))} className={filterInputClass} placeholder="0" />
              </FilterField>
              <FilterField label="Amount Max">
                <input type="number" min="0" value={advancedFiltersDraft.amountMax} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMax: event.target.value }))} className={filterInputClass} placeholder="100000" />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={applyAdvancedFilters} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <ActionDialog state={dialogState} onClose={() => setDialogState({ type: '', subscription: null })} onSubmit={callActionApi} plans={state.plans} canEdit={canEdit} />
      </div>
    );
  }

  if (isActiveView) {
    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Active Subscriptions</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Active Subscriptions</h1>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Active</span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        View and manage all active subscriptions. Monitor usage, renewals and plan details.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="h-4 w-4" /> Export CSV
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" disabled={!canBulk} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50">
                            Bulk Actions <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                          <DropdownMenuItem onClick={() => handleBulkAction('reminder')}>Send Renewal Reminder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('enableAutoRenew')}>Enable Auto-renew</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('disableAutoRenew')}>Disable Auto-renew</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Active" value={formatNumber(activeSummary.totalActive)} subtitle={`${activeSummary.totalPercent}% of total`} icon={UsersRound} tone="bg-emerald-50 text-emerald-600" />
                  <MetricCard title="Monthly Revenue" value={formatCurrencyINR(activeSummary.monthlyRevenue)} subtitle="vs last month" icon={IndianRupee} tone="bg-blue-50 text-blue-600" trend={`${summary.monthlyRevenueTrend > 0 ? '+' : ''}${summary.monthlyRevenueTrend}%`} />
                  <MetricCard title="Avg. Plan Value" value={formatCurrencyINR(activeSummary.avgPlanValue)} subtitle="per subscription" icon={BarChart3} tone="bg-violet-50 text-violet-600" />
                  <MetricCard title="Renewing Soon" value={formatNumber(activeSummary.renewingSoon)} subtitle="Within 7 days" icon={CalendarClock} tone="bg-orange-50 text-orange-600" />
                  <MetricCard title="Avg. Active Duration" value={`${activeSummary.avgActiveDurationMonths.toFixed(1)} months`} subtitle="per subscription" icon={Clock3} tone="bg-cyan-50 text-cyan-600" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by host name, email, subscription ID, or property name..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[128px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plans</option>
                        {state.plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                      </select>
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Property Types</option>
                        {propertyTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select value={advancedFiltersDraft.city} onChange={(event) => updateQuery({ city: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Cities</option>
                        {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                      <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All RMs</option>
                        {state.rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Active Subscriptions</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(activeSummary.totalActive)} Active</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ACTIVE_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key]} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Toggle table density">
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh active subscriptions">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1320px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  <th className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label="Select all active subscriptions on this page"
                                      checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))}
                                      onChange={(event) => {
                                        if (event.target.checked) {
                                          setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRows.map((row) => row.id)])));
                                        } else {
                                          setSelectedIds((current) => current.filter((id) => !paginatedRows.some((row) => row.id === id)));
                                        }
                                      }}
                                    />
                                  </th>
                                  {visibleColumns.subscription ? <SortableHead label="Subscription ID" active={sortBy === 'subscriptionCode'} order={sortOrder} onClick={() => toggleSort('subscriptionCode')} /> : null}
                                  {visibleColumns.host ? <SortableHead label="Host / Owner" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                  {visibleColumns.property ? <th className="px-4 py-3">Property</th> : null}
                                  {visibleColumns.plan ? <SortableHead label="Plan" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.startDate ? <SortableHead label="Start Date" active={sortBy === 'startDate'} order={sortOrder} onClick={() => toggleSort('startDate')} /> : null}
                                  {visibleColumns.nextRenewal ? <SortableHead label="Next Renewal" active={sortBy === 'nextRenewal'} order={sortOrder} onClick={() => toggleSort('nextRenewal')} /> : null}
                                  <th className="px-4 py-3">Days Left</th>
                                  {visibleColumns.amount ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.status ? <th className="px-4 py-3">Status</th> : null}
                                  {visibleColumns.rm ? <SortableHead label="RM" active={sortBy === 'rm'} order={sortOrder} onClick={() => toggleSort('rm')} /> : null}
                                  {visibleColumns.actions ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedRows.map((subscription) => {
                                  const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                  const availableActions = getRowActions(subscription);
                                  return (
                                    <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                                      <td className={`px-4 ${rowPadding}`}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${subscription.subscriptionCode}`}
                                          checked={selectedIds.includes(subscription.id)}
                                          onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, subscription.id] : current.filter((id) => id !== subscription.id))}
                                        />
                                      </td>
                                      {visibleColumns.subscription ? (
                                        <td className={`px-4 ${rowPadding} min-w-[210px]`}>
                                          <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="text-left">
                                            <span className="block break-all text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.subscriptionCode}</span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.host ? (
                                        <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                          <div className="flex items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-xs font-black text-[#1D4ED8]">{subscription.host.initials}</span>
                                            <div className="min-w-0">
                                              <button type="button" onClick={() => navigate('/admin/hosts')} className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.host.name}</button>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subscription.host.email || subscription.host.phone || '-'}</p>
                                            </div>
                                          </div>
                                        </td>
                                      ) : null}
                                      {visibleColumns.property ? (
                                        <td className={`px-4 ${rowPadding} min-w-[240px]`}>
                                          <button type="button" onClick={() => navigate('/admin/properties')} className="flex min-w-0 items-start gap-3 text-left">
                                            <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                              {subscription.property.thumbnail ? (
                                                <img src={subscription.property.thumbnail} alt={subscription.property.name} className="h-full w-full object-cover" />
                                              ) : (
                                                <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{subscription.host.initials}</span>
                                              )}
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.property.name}</span>
                                              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.property.city ? `${subscription.property.city}${subscription.property.state ? `, ${subscription.property.state}` : ''}` : subscription.property.propertyCode || '-'}</span>
                                            </span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.plan ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block text-sm font-black text-slate-900">{subscription.plan.name}</span>
                                          <span className="mt-1 block text-xs font-bold text-[#2563EB]">{subscription.plan.durationLabel}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.startDate ? <td className={`px-4 text-sm font-bold text-slate-700 ${rowPadding}`}>{formatDateValue(subscription.startDate)}</td> : null}
                                      {visibleColumns.nextRenewal ? <td className={`px-4 text-sm font-black text-slate-900 ${rowPadding}`}>{formatDateValue(subscription.nextRenewalDate)}</td> : null}
                                      <td className={`px-4 ${rowPadding}`}><DaysLeftBadge subscription={subscription} warningThreshold={7} /></td>
                                      {visibleColumns.amount ? <td className={`px-4 text-sm font-black text-slate-950 ${rowPadding}`}>{formatCurrencyINR(subscription.amount)}</td> : null}
                                      {visibleColumns.status ? <td className={`px-4 ${rowPadding}`}><SubscriptionStatusBadge status="active" /></td> : null}
                                      {visibleColumns.rm ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block truncate text-sm font-black text-slate-900">{subscription.rm?.name || 'Unassigned'}</span>
                                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.rm?.code || subscription.rm?.id || '-'}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.actions ? (
                                        <td className={`px-4 ${rowPadding}`}>
                                          <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`View ${subscription.subscriptionCode}`}>
                                              <Eye className="h-4 w-4" />
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${subscription.subscriptionCode}`}>
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                                                <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {availableActions.map((action) => (
                                                  <DropdownMenuItem
                                                    key={action.id}
                                                    onClick={() => action.kind === 'navigate' ? navigate(action.href) : setDialogState({ type: action.dialogType, subscription })}
                                                    disabled={action.requiresEdit && !canEdit}
                                                    className={action.tone === 'danger' ? 'text-rose-700 focus:text-rose-700' : ''}
                                                  >
                                                    {action.label}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{fromCount}</span> to <span className="font-black text-slate-950">{toCount}</span> of <span className="font-black text-slate-950">{formatNumber(totalVisible)}</span> active subscriptions
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState
                            title={baseRows.length ? 'No matching active subscriptions found.' : 'No active subscriptions yet.'}
                            description={baseRows.length ? 'Try adjusting search or filters to find the subscriptions you need.' : 'Active subscriptions will appear here once subscriptions move into the live paid state.'}
                            actionLabel={baseRows.length ? 'Clear Filters' : 'Go To All Subscriptions'}
                            onAction={() => baseRows.length ? clearFilters() : navigate('/admin/subscriptions')}
                          />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Active Subscriptions by Plan</h3>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)]">
                        <div className="relative h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={activePlanBreakdown} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2}>
                                {activePlanBreakdown.map((item) => <Cell key={item.label} fill={item.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                            <div>
                              <p className="text-2xl font-black text-slate-950">{formatNumber(activeSummary.totalActive)}</p>
                              <p className="text-xs font-bold text-slate-400">Active</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {activePlanBreakdown.map((item) => (
                            <LegendRow key={item.label} label={item.label} color={item.color} value={item.value} percent={item.percent} />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Renewal Timeline</h3>
                        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">Next 30 Days</span>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        {activeRenewalTimeline.map((item) => {
                          const maxValue = Math.max(...activeRenewalTimeline.map((entry) => entry.value), 1);
                          const height = `${Math.max(24, (item.value / maxValue) * 96)}px`;
                          return (
                            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{item.value}</span>
                              <div className="w-full rounded-t-2xl" style={{ height, background: `linear-gradient(180deg, ${item.color} 0%, rgba(255,255,255,0.32) 100%)` }} />
                              <span className="text-[11px] font-black text-slate-500">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Top Active RMs</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        {topActiveRms.map((rm, index) => (
                          <div key={`${rm.id || rm.code}-${index}`} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#1D4ED8] shadow-sm">{createInitials(rm.name)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-slate-950">{rm.name}</span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{formatNumber(rm.total)} subscriptions</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-2">
                        <QuickAction
                          icon={BellRing}
                          title="Send Renewal Reminder"
                          description="Notify users about upcoming renewal"
                          onClick={() => handleBulkAction('reminder')}
                          disabled={!canBulk}
                        />
                        <QuickAction
                          icon={ArrowUpRight}
                          title="Upgrade Plan"
                          description="Change subscription plan"
                          onClick={() => updateQuery({ section: 'plans' })}
                        />
                        <QuickAction
                          icon={BarChart3}
                          title="View Usage Reports"
                          description="Check plan-wise usage and limits"
                          onClick={() => navigate('/admin/reports')}
                          disabled={!analyticsCanView}
                        />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Active Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine active subscriptions by host, geography, billing value and renewal windows.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Billing Cycle">
                <select value={advancedFiltersDraft.billingCycle} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, billingCycle: event.target.value }))} className={filterInputClass}>
                  <option value="">All billing cycles</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="annual">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </FilterField>
              <FilterField label="Host">
                <input value={advancedFiltersDraft.hostQuery} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, hostQuery: event.target.value }))} className={filterInputClass} placeholder="Host, email, phone" />
              </FilterField>
              <FilterField label="City">
                <input value={advancedFiltersDraft.city} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, city: event.target.value }))} className={filterInputClass} placeholder="Mumbai" />
              </FilterField>
              <FilterField label="State">
                <input value={advancedFiltersDraft.state} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, state: event.target.value }))} className={filterInputClass} placeholder="Maharashtra" />
              </FilterField>
              <FilterField label="Renewal Date From">
                <input type="date" value={advancedFiltersDraft.renewalFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalFrom: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Renewal Date To">
                <input type="date" value={advancedFiltersDraft.renewalTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalTo: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Amount Min">
                <input type="number" min="0" value={advancedFiltersDraft.amountMin} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMin: event.target.value }))} className={filterInputClass} placeholder="0" />
              </FilterField>
              <FilterField label="Amount Max">
                <input type="number" min="0" value={advancedFiltersDraft.amountMax} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMax: event.target.value }))} className={filterInputClass} placeholder="100000" />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={applyAdvancedFilters} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <ActionDialog state={dialogState} onClose={() => setDialogState({ type: '', subscription: null })} onSubmit={callActionApi} plans={state.plans} canEdit={canEdit} />
      </div>
    );
  }

  if (isTrialView) {
    return (
      <div className="min-h-full bg-[#F7F9FC] text-slate-950">
        {state.loading ? <SubscriptionsSkeleton /> : (
          <>
            {state.error ? (
              <ErrorState
                message={state.error}
                action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
              />
            ) : null}

            {!state.error ? (
              <>
                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Subscription Management</span>
                    <span className="text-slate-300">›</span>
                    <span className="text-[#2563EB]">Trial Subscriptions</span>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">Trial Subscriptions</h1>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{formatNumber(trialSummary.totalTrials)} Trial Users</span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                        Monitor all active and upcoming trial subscriptions. Convert more trial users to paid plans.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <Download className="h-4 w-4" /> Export CSV
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" disabled={!canBulk} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50">
                            Bulk Actions <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                          <DropdownMenuItem onClick={() => handleBulkAction('reminder')}>Send Trial Reminder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleBulkAction('cancel')} className="text-rose-700 focus:text-rose-700">End Selected Trials</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Total Trial Subscriptions" value={formatNumber(trialSummary.totalTrials)} subtitle="All trial users" icon={BellRing} tone="bg-violet-50 text-violet-600" />
                  <MetricCard title="Active Trials" value={formatNumber(trialSummary.activeTrials)} subtitle={`${trialSummary.totalTrials ? ((trialSummary.activeTrials / trialSummary.totalTrials) * 100).toFixed(1) : '0.0'}% of trials`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                  <MetricCard title="Expiring Soon" value={formatNumber(trialSummary.expiringSoonTrials)} subtitle="Within 3 days" icon={ReceiptText} tone="bg-orange-50 text-orange-600" />
                  <MetricCard title="Trial Expired" value={formatNumber(trialSummary.expiredTrials)} subtitle={`${trialSummary.totalTrials ? ((trialSummary.expiredTrials / trialSummary.totalTrials) * 100).toFixed(1) : '0.0'}% of trials`} icon={CircleOff} tone="bg-rose-50 text-rose-600" />
                  <MetricCard title="Conversion Rate" value={`${trialSummary.conversionRate}%`} subtitle="Converted to paid" icon={ArrowUpRight} tone="bg-cyan-50 text-cyan-600" />
                </section>

                <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by host name, email, or property name..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                      <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Property Types</option>
                        {propertyTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select value={advancedFiltersDraft.city} onChange={(event) => updateQuery({ city: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Cities</option>
                        {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                      <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Plans</option>
                        {state.plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                      </select>
                      <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="expiring_soon">Expiring Soon</option>
                        <option value="expired">Expired</option>
                      </select>
                      <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                        <option value="">All RMs</option>
                        {state.rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <Filter className="h-4 w-4" /> Filters
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Trial Subscriptions</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(totalVisible)} Users</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                                <Columns3 className="h-4 w-4" /> Columns
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {TRIAL_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key]} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button type="button" onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Toggle table density">
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh trial subscriptions">
                            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {filteredRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-[1320px] w-full text-left">
                              <thead className="bg-slate-50">
                                <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  <th className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label="Select all trials on this page"
                                      checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))}
                                      onChange={(event) => {
                                        if (event.target.checked) {
                                          setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRows.map((row) => row.id)])));
                                        } else {
                                          setSelectedIds((current) => current.filter((id) => !paginatedRows.some((row) => row.id === id)));
                                        }
                                      }}
                                    />
                                  </th>
                                  {visibleColumns.subscription ? <SortableHead label="Subscription ID" active={sortBy === 'subscriptionCode'} order={sortOrder} onClick={() => toggleSort('subscriptionCode')} /> : null}
                                  {visibleColumns.host ? <SortableHead label="Host / Owner" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                  {visibleColumns.property ? <th className="px-4 py-3">Property</th> : null}
                                  {visibleColumns.plan ? <SortableHead label="Plan (Trial)" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                  {visibleColumns.amount ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                  {visibleColumns.status ? <th className="px-4 py-3">Status</th> : null}
                                  {visibleColumns.startDate ? <SortableHead label="Start Date" active={sortBy === 'startDate'} order={sortOrder} onClick={() => toggleSort('startDate')} /> : null}
                                  {visibleColumns.nextRenewal ? <SortableHead label="Expiry Date" active={sortBy === 'nextRenewal'} order={sortOrder} onClick={() => toggleSort('nextRenewal')} /> : null}
                                  <th className="px-4 py-3">Days Left</th>
                                  {visibleColumns.rm ? <SortableHead label="RM" active={sortBy === 'rm'} order={sortOrder} onClick={() => toggleSort('rm')} /> : null}
                                  {visibleColumns.actions ? <th className="px-4 py-3">Actions</th> : null}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedRows.map((subscription) => {
                                  const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                  const availableActions = getRowActions(subscription);
                                  return (
                                    <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                                      <td className={`px-4 ${rowPadding}`}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Select ${subscription.subscriptionCode}`}
                                          checked={selectedIds.includes(subscription.id)}
                                          onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, subscription.id] : current.filter((id) => id !== subscription.id))}
                                        />
                                      </td>
                                      {visibleColumns.subscription ? (
                                        <td className={`px-4 ${rowPadding} min-w-[210px]`}>
                                          <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="text-left">
                                            <span className="block break-all text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.subscriptionCode}</span>
                                            <span className="mt-1 block text-xs font-bold text-violet-600">Trial</span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.host ? (
                                        <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                          <div className="flex items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-xs font-black text-[#1D4ED8]">{subscription.host.initials}</span>
                                            <div className="min-w-0">
                                              <button type="button" onClick={() => navigate('/admin/hosts')} className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.host.name}</button>
                                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subscription.host.email || subscription.host.phone || '-'}</p>
                                            </div>
                                          </div>
                                        </td>
                                      ) : null}
                                      {visibleColumns.property ? (
                                        <td className={`px-4 ${rowPadding} min-w-[240px]`}>
                                          <button type="button" onClick={() => navigate('/admin/properties')} className="flex min-w-0 items-start gap-3 text-left">
                                            <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                              {subscription.property.thumbnail ? (
                                                <img src={subscription.property.thumbnail} alt={subscription.property.name} className="h-full w-full object-cover" />
                                              ) : (
                                                <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{subscription.host.initials}</span>
                                              )}
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.property.name}</span>
                                              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.property.propertyCode || '-'}</span>
                                            </span>
                                          </button>
                                        </td>
                                      ) : null}
                                      {visibleColumns.plan ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block text-sm font-black text-slate-900">{subscription.plan.name}</span>
                                          <span className="mt-1 block text-xs font-bold text-[#2563EB]">{subscription.plan.durationLabel}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.amount ? <td className={`px-4 text-sm font-black text-slate-950 ${rowPadding}`}>{formatCurrencyINR(subscription.amount)}</td> : null}
                                      {visibleColumns.status ? <td className={`px-4 ${rowPadding}`}><TrialLifecycleBadge subscription={subscription} /></td> : null}
                                      {visibleColumns.startDate ? <td className={`px-4 text-sm font-bold text-slate-700 ${rowPadding}`}>{formatDateValue(subscription.startDate)}</td> : null}
                                      {visibleColumns.nextRenewal ? <td className={`px-4 text-sm font-black text-slate-900 ${rowPadding}`}>{formatDateValue(subscription.trialEndDate || subscription.nextRenewalDate || subscription.expiryDate)}</td> : null}
                                      <td className={`px-4 ${rowPadding}`}><TrialDaysBadge subscription={subscription} /></td>
                                      {visibleColumns.rm ? (
                                        <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                          <span className="block truncate text-sm font-black text-slate-900">{subscription.rm?.name || 'Unassigned'}</span>
                                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.rm?.code || subscription.rm?.id || '-'}</span>
                                        </td>
                                      ) : null}
                                      {visibleColumns.actions ? (
                                        <td className={`px-4 ${rowPadding}`}>
                                          <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`View ${subscription.subscriptionCode}`}>
                                              <Eye className="h-4 w-4" />
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${subscription.subscriptionCode}`}>
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                                                <DropdownMenuLabel>Trial Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {availableActions.map((action) => (
                                                  <DropdownMenuItem
                                                    key={action.id}
                                                    onClick={() => action.kind === 'navigate' ? navigate(action.href) : setDialogState({ type: action.dialogType, subscription })}
                                                    disabled={action.requiresEdit && !canEdit}
                                                    className={action.tone === 'danger' ? 'text-rose-700 focus:text-rose-700' : ''}
                                                  >
                                                    {action.label}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm font-medium text-slate-500">
                              Showing <span className="font-black text-slate-950">{fromCount}</span> to <span className="font-black text-slate-950">{toCount}</span> of <span className="font-black text-slate-950">{formatNumber(totalVisible)}</span> trial subscriptions
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                                {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                              </select>
                              <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <EmptyState
                            title={baseRows.length ? 'No matching trial subscriptions found.' : 'No trial subscriptions yet.'}
                            description={baseRows.length ? 'Try adjusting search or filters to find the trial users you need.' : 'Trial subscriptions will appear here once hosts start a trial plan.'}
                            actionLabel={baseRows.length ? 'Clear Filters' : 'Go To All Subscriptions'}
                            onAction={() => baseRows.length ? clearFilters() : navigate('/admin/subscriptions')}
                          />
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-5">
                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Trial Conversion Funnel</h3>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[116px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[116px_minmax(0,1fr)]">
                        <div className="flex min-h-[170px] flex-col items-center justify-center gap-2">
                          {trialConversionSteps.map((step) => (
                            <div key={step.label} className="h-7 rounded-sm" style={{ width: step.width, backgroundColor: step.color, clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)' }} />
                          ))}
                        </div>
                        <div className="space-y-3">
                          {trialConversionSteps.map((step) => (
                            <LegendRow key={step.label} label={step.label} color={step.color} value={step.value} percent={step.percent} />
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Trials Expiring Soon</h3>
                        <button type="button" onClick={() => updateQuery({ status: 'expiring_soon' })} className="text-xs font-black text-[#2563EB]">View All</button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {expiringSoonRows.length ? expiringSoonRows.map((subscription) => (
                          <button key={subscription.id} type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-white">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#1D4ED8] shadow-sm">{subscription.host.initials}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-slate-950">{subscription.host.name}</span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{subscription.property.name}</span>
                            </span>
                            <TrialDaysBadge subscription={subscription} />
                          </button>
                        )) : (
                          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                            No trials are expiring soon right now.
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                      <div className="mt-4 space-y-2">
                        <QuickAction
                          icon={BellRing}
                          title="Send Trial Reminder"
                          description="Notify trial users"
                          onClick={() => handleBulkAction('reminder')}
                          disabled={!canBulk}
                        />
                        <QuickAction
                          icon={ArrowUpRight}
                          title="Upgrade to Paid"
                          description="Convert trial to paid plan"
                          onClick={() => navigate('/admin/subscriptions')}
                        />
                        <QuickAction
                          icon={SlidersHorizontal}
                          title="Manage Trial Plans"
                          description="Configure trial durations"
                          onClick={() => updateQuery({ section: 'plans' })}
                        />
                        <QuickAction
                          icon={IndianRupee}
                          title="View Conversion Reports"
                          description="Analyze trial performance"
                          onClick={() => navigate('/admin/reports')}
                          disabled={!analyticsCanView}
                        />
                      </div>
                    </section>
                  </aside>
                </section>
              </>
            ) : null}
          </>
        )}

        <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Trial Filters</p>
              <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
              <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Refine trial subscriptions by lifecycle, host, geography and upcoming expiries.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <FilterField label="Host">
                <input value={advancedFiltersDraft.hostQuery} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, hostQuery: event.target.value }))} className={filterInputClass} placeholder="Host, email, phone" />
              </FilterField>
              <FilterField label="City">
                <input value={advancedFiltersDraft.city} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, city: event.target.value }))} className={filterInputClass} placeholder="Pune" />
              </FilterField>
              <FilterField label="State">
                <input value={advancedFiltersDraft.state} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, state: event.target.value }))} className={filterInputClass} placeholder="Maharashtra" />
              </FilterField>
              <FilterField label="RM">
                <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className={filterInputClass}>
                  <option value="">All RMs</option>
                  {state.rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Start Date From">
                <input type="date" value={advancedFiltersDraft.startFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, startFrom: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Start Date To">
                <input type="date" value={advancedFiltersDraft.startTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, startTo: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Expiry Date From">
                <input type="date" value={advancedFiltersDraft.renewalFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalFrom: event.target.value }))} className={filterInputClass} />
              </FilterField>
              <FilterField label="Expiry Date To">
                <input type="date" value={advancedFiltersDraft.renewalTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalTo: event.target.value }))} className={filterInputClass} />
              </FilterField>
            </div>
            <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
              <button type="button" onClick={applyAdvancedFilters} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <ActionDialog state={dialogState} onClose={() => setDialogState({ type: '', subscription: null })} onSubmit={callActionApi} plans={state.plans} canEdit={canEdit} />
      </div>
    );
  }

  if (section !== 'all') {
    if (section === 'plans') {
      return (
        <SectionPlaceholder
          title="Plan Management"
          description="Subscription plan catalog and pricing governance remain accessible from the Subscription Management group while the all-subscriptions rollout stays focused."
          primaryAction={{ label: 'Go To All Subscriptions', onClick: () => updateQuery({ section: 'all' }) }}
        />
      );
    }
    return (
      <SectionPlaceholder
        title={SECTION_OPTIONS.find((item) => item.id === section)?.label || 'Subscription Management'}
        description="This route is attached to the refreshed subscription IA and reserved for the next workflow implementation."
        primaryAction={{ label: 'Go To All Subscriptions', onClick: () => updateQuery({ section: 'all' }) }}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#F7F9FC] text-slate-950">
      {state.loading ? <SubscriptionsSkeleton /> : (
        <>
          {state.error ? (
            <ErrorState
              message={state.error}
              action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>}
            />
          ) : null}

          {!state.error ? (
            <>
              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Subscription Management</span>
                  <span className="text-slate-300">›</span>
                  <span className="text-[#2563EB]">All Subscriptions</span>
                </div>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">All Subscriptions</h1>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                      Manage and monitor all host subscriptions, plans and billing status.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={handleExport} disabled={!canExport} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" disabled={!canBulk} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F] disabled:cursor-not-allowed disabled:opacity-50">
                          Bulk Actions <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 p-2">
                        <DropdownMenuItem onClick={() => handleBulkAction('reminder')}>Send Renewal Reminder</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('enableAutoRenew')}>Enable Auto-renew</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('disableAutoRenew')}>Disable Auto-renew</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkAction('cancel')} className="text-rose-700 focus:text-rose-700">Cancel Selected</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <MetricCard title="Total Subscriptions" value={formatNumber(summary.totalSubscriptions)} subtitle="All time" icon={ReceiptText} tone="bg-blue-50 text-blue-600" />
                <MetricCard title="Active Subscriptions" value={formatNumber(summary.activeSubscriptions)} subtitle={`${percentages.active}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                <MetricCard title="Expired Subscriptions" value={formatNumber(summary.expiredSubscriptions)} subtitle={`${percentages.expired}% of total`} icon={CircleOff} tone="bg-orange-50 text-orange-600" />
                <MetricCard title="Cancelled Subscriptions" value={formatNumber(summary.cancelledSubscriptions)} subtitle={`${percentages.cancelled}% of total`} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                <MetricCard title="Trial Subscriptions" value={formatNumber(summary.trialSubscriptions)} subtitle={`${percentages.trial}% of total`} icon={BellRing} tone="bg-violet-50 text-violet-600" />
                <MetricCard title="Monthly Revenue" value={formatCurrencyINR(summary.monthlyRevenue)} subtitle="vs last month" icon={IndianRupee} tone="bg-cyan-50 text-cyan-600" trend={`${summary.monthlyRevenueTrend > 0 ? '+' : ''}${summary.monthlyRevenueTrend}%`} />
              </section>

              <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                <div className="flex flex-col gap-3 xl:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search by host name, email, mobile, or subscription ID..."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                    <select value={planId} onChange={(event) => updateQuery({ planId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All Plans</option>
                      {state.plans.map((plan) => <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_name}</option>)}
                    </select>
                    <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[136px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All Status</option>
                      {STATUS_ORDER.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
                    </select>
                    <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All Property Types</option>
                      {propertyTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select value={rmId} onChange={(event) => updateQuery({ rmId: event.target.value })} className="h-12 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All RMs</option>
                      {state.rms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAdvancedOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                      <Filter className="h-4 w-4" /> Filters
                    </button>
                  </div>
                </div>

                {state.totalAvailable > 2000 ? (
                  <p className="mt-3 text-xs font-semibold text-amber-700">
                    Showing the first 2,000 matching subscriptions for client-side filtering and sorting while backend query expansion is completed.
                  </p>
                ) : null}
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                  <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Subscriptions</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{formatNumber(totalVisible)} Total</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                              <Columns3 className="h-4 w-4" /> Columns
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                            <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {COLUMN_OPTIONS.map((column) => (
                              <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key]} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                {column.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button type="button" onClick={() => setDensity((current) => (current === 'comfortable' ? 'compact' : 'comfortable'))} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Toggle table density">
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => load({ background: true })} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Refresh subscriptions">
                          <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {filteredRows.length ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-[1240px] w-full text-left">
                            <thead className="bg-slate-50">
                              <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                <th className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    aria-label="Select all subscriptions on this page"
                                    checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))}
                                    onChange={(event) => {
                                      if (event.target.checked) {
                                        setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRows.map((row) => row.id)])));
                                      } else {
                                        setSelectedIds((current) => current.filter((id) => !paginatedRows.some((row) => row.id === id)));
                                      }
                                    }}
                                  />
                                </th>
                                {visibleColumns.subscription ? <SortableHead label="Subscription ID" active={sortBy === 'subscriptionCode'} order={sortOrder} onClick={() => toggleSort('subscriptionCode')} /> : null}
                                {visibleColumns.host ? <SortableHead label="Host / Owner" active={sortBy === 'host'} order={sortOrder} onClick={() => toggleSort('host')} /> : null}
                                {visibleColumns.property ? <th className="px-4 py-3">Property</th> : null}
                                {visibleColumns.plan ? <SortableHead label="Plan" active={sortBy === 'plan'} order={sortOrder} onClick={() => toggleSort('plan')} /> : null}
                                {visibleColumns.amount ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => toggleSort('amount')} /> : null}
                                {visibleColumns.status ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => toggleSort('status')} /> : null}
                                {visibleColumns.startDate ? <SortableHead label="Start Date" active={sortBy === 'startDate'} order={sortOrder} onClick={() => toggleSort('startDate')} /> : null}
                                {visibleColumns.nextRenewal ? <SortableHead label="Next Renewal" active={sortBy === 'nextRenewal'} order={sortOrder} onClick={() => toggleSort('nextRenewal')} /> : null}
                                {visibleColumns.rm ? <SortableHead label="RM" active={sortBy === 'rm'} order={sortOrder} onClick={() => toggleSort('rm')} /> : null}
                                {visibleColumns.actions ? <th className="px-4 py-3">Actions</th> : null}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedRows.map((subscription) => {
                                const renewalMeta = formatRelativeRenewal(subscription.nextRenewalDate, subscription.status);
                                const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                const availableActions = getRowActions(subscription);
                                return (
                                  <tr key={subscription.id} className="align-top hover:bg-slate-50/70">
                                    <td className={`px-4 ${rowPadding}`}>
                                      <input
                                        type="checkbox"
                                        aria-label={`Select ${subscription.subscriptionCode}`}
                                        checked={selectedIds.includes(subscription.id)}
                                        onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, subscription.id] : current.filter((id) => id !== subscription.id))}
                                      />
                                    </td>
                                    {visibleColumns.subscription ? (
                                      <td className={`px-4 ${rowPadding} min-w-[210px]`}>
                                        <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="text-left">
                                          <span className="block break-all text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.subscriptionCode}</span>
                                          <span className={`mt-1 block text-xs font-bold ${subscription.status === 'trial' ? 'text-violet-600' : subscription.status === 'cancelled' ? 'text-rose-600' : subscription.status === 'expired' ? 'text-orange-600' : 'text-slate-500'}`}>{getLifecycleLabel(subscription)}</span>
                                        </button>
                                      </td>
                                    ) : null}
                                    {visibleColumns.host ? (
                                      <td className={`px-4 ${rowPadding} min-w-[190px]`}>
                                        <div className="flex items-start gap-3">
                                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-xs font-black text-[#1D4ED8]">{subscription.host.initials}</span>
                                          <div className="min-w-0">
                                            <button type="button" onClick={() => navigate('/admin/hosts')} className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.host.name}</button>
                                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subscription.host.email || subscription.host.phone || '-'}</p>
                                          </div>
                                        </div>
                                      </td>
                                    ) : null}
                                    {visibleColumns.property ? (
                                      <td className={`px-4 ${rowPadding} min-w-[190px]`}>
                                        <button type="button" onClick={() => navigate('/admin/properties')} className="block min-w-0 text-left">
                                          <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{subscription.property.name}</span>
                                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.property.propertyCode || '-'}</span>
                                        </button>
                                      </td>
                                    ) : null}
                                    {visibleColumns.plan ? (
                                      <td className={`px-4 ${rowPadding} min-w-[110px]`}>
                                        <span className="block text-sm font-black text-slate-900">{subscription.plan.name}</span>
                                        <span className="mt-1 block text-xs font-bold text-[#2563EB]">{subscription.plan.durationLabel}</span>
                                      </td>
                                    ) : null}
                                    {visibleColumns.amount ? <td className={`px-4 text-sm font-black text-slate-950 ${rowPadding}`}>{formatCurrencyINR(subscription.amount)}</td> : null}
                                    {visibleColumns.status ? <td className={`px-4 ${rowPadding}`}><SubscriptionStatusBadge status={subscription.status} /></td> : null}
                                    {visibleColumns.startDate ? <td className={`px-4 text-sm font-bold text-slate-700 ${rowPadding}`}>{formatDateValue(subscription.startDate)}</td> : null}
                                    {visibleColumns.nextRenewal ? (
                                      <td className={`px-4 ${rowPadding} min-w-[140px]`}>
                                        <span className="block text-sm font-black text-slate-900">{formatDateValue(subscription.nextRenewalDate)}</span>
                                        <span className={`mt-1 block text-xs font-bold ${renewalMeta.tone}`}>{renewalMeta.label}</span>
                                      </td>
                                    ) : null}
                                    {visibleColumns.rm ? (
                                      <td className={`px-4 ${rowPadding} min-w-[120px]`}>
                                        <span className="block truncate text-sm font-black text-slate-900">{subscription.rm?.name || 'Unassigned'}</span>
                                        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{subscription.rm?.code || subscription.rm?.id || '-'}</span>
                                      </td>
                                    ) : null}
                                    {visibleColumns.actions ? (
                                      <td className={`px-4 ${rowPadding}`}>
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setDialogState({ type: 'detail', subscription })} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`View ${subscription.subscriptionCode}`}>
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label={`More actions for ${subscription.subscriptionCode}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl border-slate-200 bg-white p-2">
                                              <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                                              <DropdownMenuSeparator />
                                              {availableActions.map((action) => (
                                                <DropdownMenuItem
                                                  key={action.id}
                                                  onClick={() => action.kind === 'navigate' ? navigate(action.href) : setDialogState({ type: action.dialogType, subscription })}
                                                  disabled={action.requiresEdit && !canEdit}
                                                  className={action.tone === 'danger' ? 'text-rose-700 focus:text-rose-700' : ''}
                                                >
                                                  {action.label}
                                                </DropdownMenuItem>
                                              ))}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </td>
                                    ) : null}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm font-medium text-slate-500">
                            Showing <span className="font-black text-slate-950">{fromCount}</span> to <span className="font-black text-slate-950">{toCount}</span> of <span className="font-black text-slate-950">{formatNumber(totalVisible)}</span> subscriptions
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: 1 })} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-blue-500">
                              {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} / page</option>)}
                            </select>
                            <PaginationBar page={currentPage} totalPages={totalPages} onPageChange={(nextPage) => updateQuery({ page: nextPage })} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-6">
                        <EmptyState
                          title={state.subscriptions.length ? 'No matching subscriptions found.' : 'No subscriptions yet.'}
                          description={state.subscriptions.length
                            ? 'Try adjusting search, filters, or sorting to find what you need.'
                            : 'Create a subscription to get started with host billing and lifecycle management.'}
                          actionLabel={state.subscriptions.length ? 'Clear Filters' : canCreate ? 'Add New Subscription' : ''}
                          onAction={() => state.subscriptions.length ? clearFilters() : navigate('/host/list-property')}
                        />
                      </div>
                    )}
                  </section>
                </div>

                <aside className="min-w-0 space-y-5">
                  <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Subscription Status Overview</h3>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)]">
                      <div className="relative h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Active', value: summary.activeSubscriptions },
                                { name: 'Expired', value: summary.expiredSubscriptions },
                                { name: 'Cancelled', value: summary.cancelledSubscriptions },
                                { name: 'Trial', value: summary.trialSubscriptions },
                              ]}
                              dataKey="value"
                              innerRadius={42}
                              outerRadius={62}
                              paddingAngle={2}
                            >
                              <Cell fill={STATUS_COLORS.active} />
                              <Cell fill={STATUS_COLORS.expired} />
                              <Cell fill={STATUS_COLORS.cancelled} />
                              <Cell fill={STATUS_COLORS.trial} />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                          <div>
                            <p className="text-2xl font-black text-slate-950">{formatNumber(summary.totalSubscriptions)}</p>
                            <p className="text-xs font-bold text-slate-400">Total</p>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-3">
                        <LegendRow label="Active" color={STATUS_COLORS.active} value={summary.activeSubscriptions} percent={`${percentages.active}%`} />
                        <LegendRow label="Expired" color={STATUS_COLORS.expired} value={summary.expiredSubscriptions} percent={`${percentages.expired}%`} />
                        <LegendRow label="Cancelled" color={STATUS_COLORS.cancelled} value={summary.cancelledSubscriptions} percent={`${percentages.cancelled}%`} />
                        <LegendRow label="Trial" color={STATUS_COLORS.trial} value={summary.trialSubscriptions} percent={`${percentages.trial}%`} />
                      </div>
                    </div>
                  </section>

                  <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Revenue Overview</h3>
                      <select value={revenuePeriod} onChange={(event) => setRevenuePeriod(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-blue-500">
                        {REVENUE_PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-[30px] font-black tracking-[-0.05em] text-slate-950">{analyticsCanView ? formatCurrencyINR(summary.monthlyRevenue) : 'Restricted'}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Total Revenue</p>
                      </div>
                      {analyticsCanView ? <div className="shrink-0 text-right"><p className="text-lg font-black text-emerald-600">{summary.monthlyRevenueTrend > 0 ? '+' : ''}{summary.monthlyRevenueTrend}%</p><p className="text-xs font-semibold text-slate-500">vs last month</p></div> : null}
                    </div>
                    <div className="mt-4 h-44">
                      {analyticsCanView && state.revenueSeries.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={state.revenueSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="subscriptionRevenueFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(value) => `₹${Math.round(Number(value || 0) / 1000)}k`} width={40} />
                            <Tooltip content={<RevenueTooltip />} />
                            <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fill="url(#subscriptionRevenueFill)" dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-sm font-semibold text-slate-400">
                          {analyticsCanView ? 'Revenue analytics are not available for this period yet.' : 'You do not have permission to view revenue analytics.'}
                        </div>
                      )}
                    </div>
                    {state.analyticsError ? <p className="mt-3 text-xs font-semibold text-amber-700">{state.analyticsError}</p> : null}
                    {state.revenueDefinition ? <p className="mt-2 text-[11px] font-semibold text-slate-400">{state.revenueDefinition}</p> : null}
                  </section>

                  <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                    <div className="mt-4 space-y-2">
                      <QuickAction
                        icon={WalletCards}
                        title="Add New Subscription"
                        description="Create a new subscription"
                        onClick={() => navigate('/host/list-property')}
                        disabled={!canCreate}
                      />
                      <QuickAction
                        icon={SlidersHorizontal}
                        title="Plan Management"
                        description="Manage subscription plans"
                        onClick={() => updateQuery({ section: 'plans' })}
                      />
                      <QuickAction
                        icon={BellRing}
                        title="Renewal Reminders"
                        description="View upcoming renewals"
                        onClick={() => updateQuery({ section: 'reminders' })}
                      />
                      <QuickAction
                        icon={IndianRupee}
                        title="Payment Reports"
                        description="View payment analytics"
                        onClick={() => navigate('/admin/finance')}
                        disabled={!analyticsCanView}
                      />
                    </div>
                  </section>
                </aside>
              </section>
            </>
          ) : null}
        </>
      )}

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white p-0 sm:max-w-[560px]">
          <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Advanced Filters</p>
            <SheetTitle className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950">Filters</SheetTitle>
            <SheetDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Refine subscriptions by lifecycle, billing, host, geography, RM ownership and renewal windows.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
            <FilterField label="Billing Cycle">
              <select value={advancedFiltersDraft.billingCycle} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, billingCycle: event.target.value }))} className={filterInputClass}>
                <option value="">All billing cycles</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="annual">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </FilterField>
            <FilterField label="Auto-renew">
              <select value={advancedFiltersDraft.autoRenew} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, autoRenew: event.target.value }))} className={filterInputClass}>
                <option value="">All</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </FilterField>
            <FilterField label="Trial / Paid">
              <select value={advancedFiltersDraft.monetizationType} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, monetizationType: event.target.value }))} className={filterInputClass}>
                <option value="">All</option>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
              </select>
            </FilterField>
            <FilterField label="Host">
              <input value={advancedFiltersDraft.hostQuery} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, hostQuery: event.target.value }))} className={filterInputClass} placeholder="Host, email, phone" />
            </FilterField>
            <FilterField label="City">
              <input value={advancedFiltersDraft.city} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, city: event.target.value }))} className={filterInputClass} placeholder="Nashik" />
            </FilterField>
            <FilterField label="State">
              <input value={advancedFiltersDraft.state} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, state: event.target.value }))} className={filterInputClass} placeholder="Maharashtra" />
            </FilterField>
            <FilterField label="Start Date From">
              <input type="date" value={advancedFiltersDraft.startFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, startFrom: event.target.value }))} className={filterInputClass} />
            </FilterField>
            <FilterField label="Start Date To">
              <input type="date" value={advancedFiltersDraft.startTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, startTo: event.target.value }))} className={filterInputClass} />
            </FilterField>
            <FilterField label="Renewal Date From">
              <input type="date" value={advancedFiltersDraft.renewalFrom} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalFrom: event.target.value }))} className={filterInputClass} />
            </FilterField>
            <FilterField label="Renewal Date To">
              <input type="date" value={advancedFiltersDraft.renewalTo} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, renewalTo: event.target.value }))} className={filterInputClass} />
            </FilterField>
            <FilterField label="Amount Min">
              <input type="number" min="0" value={advancedFiltersDraft.amountMin} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMin: event.target.value }))} className={filterInputClass} placeholder="0" />
            </FilterField>
            <FilterField label="Amount Max">
              <input type="number" min="0" value={advancedFiltersDraft.amountMax} onChange={(event) => setAdvancedFiltersDraft((current) => ({ ...current, amountMax: event.target.value }))} className={filterInputClass} placeholder="100000" />
            </FilterField>
          </div>
          <SheetFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onClick={() => { setAdvancedFiltersDraft(ADVANCED_FILTER_DEFAULTS); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Reset Filters</button>
            <button type="button" onClick={applyAdvancedFilters} className="rounded-2xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1B46C2]">Apply Filters</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ActionDialog state={dialogState} onClose={() => setDialogState({ type: '', subscription: null })} onSubmit={callActionApi} plans={state.plans} canEdit={canEdit} />
    </div>
  );
};

const FilterField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
    {children}
  </label>
);

const filterInputClass = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500';

const SortableHead = ({ label, active, order, onClick }) => (
  <th className="px-4 py-3">
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 ${active ? 'text-slate-700' : 'text-slate-500'}`}>
      {label}
      <ChevronsUpDown className={`h-3.5 w-3.5 ${active ? 'text-[#2563EB]' : 'text-slate-300'}`} />
      {active ? <span className="sr-only">{order === 'asc' ? 'ascending' : 'descending'}</span> : null}
    </button>
  </th>
);

const LegendRow = ({ label, value, percent, color }) => (
  <div className="flex min-w-0 items-center justify-between gap-3">
    <span className="min-w-0 flex items-center gap-2 text-sm font-semibold text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
    <span className="shrink-0 whitespace-nowrap text-sm font-black text-slate-900">{formatNumber(value)} <span className="font-semibold text-slate-400">({percent})</span></span>
  </div>
);

const QuickAction = ({ icon: Icon, title, description, onClick, disabled = false }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-black text-slate-950">{title}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span>
    </span>
    <span className="text-slate-300">›</span>
  </button>
);

const PaginationBar = ({ page, totalPages, onPageChange }) => {
  const items = [];
  for (let value = 1; value <= totalPages; value += 1) {
    if (value === 1 || value === totalPages || Math.abs(value - page) <= 2) {
      items.push(value);
    } else if (items[items.length - 1] !== 'ellipsis') {
      items.push('ellipsis');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">‹</button>
      {items.map((item, index) => item === 'ellipsis' ? (
        <span key={`ellipsis-${index}`} className="px-1 text-slate-400">…</span>
      ) : (
        <button key={item} type="button" onClick={() => onPageChange(item)} className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-black ${page === item ? 'bg-[#2563EB] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {item}
        </button>
      ))}
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">›</button>
    </div>
  );
};

const getRowActions = (subscription) => {
  if (subscription.status === 'trial') {
    return [
      { id: 'view', label: 'View Subscription', dialogType: 'detail' },
      { id: 'convert', label: 'Convert To Paid', dialogType: 'convertTrial', requiresEdit: true },
      { id: 'renew', label: 'Extend Trial', dialogType: 'renew', requiresEdit: true },
      { id: 'reminder', label: 'Send Reminder', dialogType: 'reminder', requiresEdit: true },
      { id: 'property', label: 'View Property', kind: 'navigate', href: '/admin/properties' },
    ];
  }
  if (subscription.status === 'expired') {
    return [
      { id: 'view', label: 'View Subscription', dialogType: 'detail' },
      { id: 'renew', label: 'Renew Subscription', dialogType: 'renew', requiresEdit: true },
      { id: 'reactivate', label: 'Reactivate', dialogType: 'reactivate', requiresEdit: true },
      { id: 'changePlan', label: 'Change Plan', dialogType: 'changePlan', requiresEdit: true },
      { id: 'payments', label: 'View Payment History', kind: 'navigate', href: '/admin/finance' },
    ];
  }
  if (subscription.status === 'cancelled') {
    return [
      { id: 'view', label: 'View Subscription', dialogType: 'detail' },
      { id: 'reactivate', label: 'Reactivate', dialogType: 'reactivate', requiresEdit: true },
      { id: 'payments', label: 'View Payment History', kind: 'navigate', href: '/admin/finance' },
      { id: 'audit', label: 'View Audit Log', kind: 'navigate', href: '/admin/audit-logs' },
    ];
  }
  return [
    { id: 'view', label: 'View Subscription', dialogType: 'detail' },
    { id: 'renew', label: 'Renew Subscription', dialogType: 'renew', requiresEdit: true },
    { id: 'changePlan', label: 'Change Plan', dialogType: 'changePlan', requiresEdit: true },
    { id: 'autoRenew', label: 'Toggle Auto-renew', dialogType: 'autoRenew', requiresEdit: true },
    { id: 'reminder', label: 'Send Renewal Reminder', dialogType: 'reminder', requiresEdit: true },
    { id: 'cancel', label: 'Cancel Subscription', dialogType: 'cancel', requiresEdit: true, tone: 'danger' },
  ];
};

export default SubscriptionManagement;
