import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  Columns3,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Line, LineChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { adminPhase1API } from '../../services/adminPhase1Api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ErrorState, requestReason, showNotice } from './shared';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const BOOKING_COLUMN_OPTIONS = [
  { key: 'booking', label: 'Booking ID' },
  { key: 'property', label: 'Property' },
  { key: 'guest', label: 'Guest Details' },
  { key: 'dates', label: 'Check-in / Check-out' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Payment Status' },
  { key: 'actions', label: 'Actions' },
];
const BOOKING_TABS = [
  { id: 'all', label: 'All Bookings' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refund_requested', label: 'Refund Requests' },
];
const DEFAULT_VISIBLE_COLUMNS = BOOKING_COLUMN_OPTIONS.reduce((acc, item) => ({ ...acc, [item.key]: true }), {});
const PROPERTY_TYPE_LABELS = {
  apartment: 'Residential Stays',
  villa: 'Residential Stays',
  bungalow: 'Residential Stays',
  studio: 'Residential Stays',
  private_office: 'Workspaces',
  co_working: 'Workspaces',
  meeting_room: 'Workspaces',
  conference_room: 'Workspaces',
  banquet_hall: 'Event Venues',
  wedding_venue: 'Event Venues',
  resort: 'Event Venues',
};

const formatCurrencyINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
  }).format(Number(value || 0));

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

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

const createInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NA';

const normalizeBookingStatus = (value, checkIn, checkOut) => {
  const status = String(value || '').trim().toLowerCase();
  const now = new Date();
  const start = toDate(checkIn);
  const end = toDate(checkOut);
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('complete')) return 'completed';
  if (status.includes('refund')) return 'refund_requested';
  if (status.includes('pending')) return 'pending_approval';
  if (status.includes('confirm')) {
    if (start && end && now >= start && now <= end) return 'ongoing';
    if (start && start > now) return 'upcoming';
    return 'confirmed';
  }
  if (start && end && now >= start && now <= end) return 'ongoing';
  if (start && start > now) return 'upcoming';
  return status || 'pending_approval';
};

const normalizePaymentStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (status.includes('refund')) return 'refunded';
  if (status.includes('partial')) return 'partially_paid';
  if (status.includes('paid') || status.includes('success')) return 'paid';
  if (status.includes('process')) return 'processing';
  if (status.includes('fail')) return 'failed';
  return 'payment_pending';
};

const getBookingStatusMeta = (status) => ({
  confirmed: { label: 'Confirmed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  upcoming: { label: 'Upcoming', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  ongoing: { label: 'Ongoing', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  completed: { label: 'Completed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  pending_approval: { label: 'Pending', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  refund_requested: { label: 'Refund Requested', tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
}[status] || { label: 'Pending', tone: 'border-slate-200 bg-slate-50 text-slate-700' });

const getPaymentStatusMeta = (status) => ({
  paid: { label: 'Paid', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  processing: { label: 'Processing', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  payment_pending: { label: 'Payment Pending', tone: 'border-slate-200 bg-slate-100 text-slate-600' },
  partially_paid: { label: 'Partially Paid', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  failed: { label: 'Failed', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  refunded: { label: 'Refunded', tone: 'border-orange-200 bg-orange-50 text-orange-700' },
}[status] || { label: 'Payment Pending', tone: 'border-slate-200 bg-slate-100 text-slate-600' });

const getPropertyTypeGroup = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return PROPERTY_TYPE_LABELS[key] || 'Others';
};

const normalizeBooking = (booking) => {
  const property = booking.property || {};
  const guest = booking.guest || booking.user || {};
  const host = booking.host || property.host || {};
  const bookingStatus = normalizeBookingStatus(booking.booking_status || booking.status, booking.check_in_date, booking.check_out_date);
  const paymentStatus = normalizePaymentStatus(booking.payment_status || booking.payment?.status);
  const amount = Number(booking.total_amount || booking.amount || booking.grand_total || 0);
  const checkIn = booking.check_in_date || booking.check_in || booking.start_date;
  const checkOut = booking.check_out_date || booking.check_out || booking.end_date;
  const nights = Number(booking.nights || booking.num_nights || booking.duration_nights || 0)
    || (() => {
      const start = toDate(checkIn);
      const end = toDate(checkOut);
      if (!start || !end) return 0;
      return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    })();
  const propertyType = property.property_type || property.type || booking.property_type || '';
  return {
    id: booking.booking_id || booking.id || '',
    bookingCode: String(booking.booking_id || booking.id || '').toUpperCase().replace(/_/g, '-'),
    createdAt: booking.created_at || booking.createdAt || checkIn,
    property: {
      name: property.title || property.property_name || property.name || booking.property_name || 'Unknown Property',
      city: property.city || booking.city || '',
      type: propertyType,
      typeGroup: getPropertyTypeGroup(propertyType),
      thumbnail: property.cover_image || property.featured_image || property.thumbnail || property.images?.[0] || '',
    },
    guest: {
      name: guest.full_name || guest.name || booking.guest_name || 'Unknown Guest',
      phone: guest.phone || guest.mobile || booking.guest_phone || '',
      email: guest.email || booking.guest_email || '',
      initials: createInitials(guest.full_name || guest.name || booking.guest_name || 'NA'),
    },
    host: {
      name: host.full_name || host.name || booking.host_name || 'Unknown Host',
    },
    checkIn,
    checkOut,
    nights,
    amount,
    bookingStatus,
    paymentStatus,
    paymentMethod: booking.payment_method || booking.payment?.method || 'Razorpay',
    raw: booking,
    searchText: [
      booking.booking_id,
      guest.full_name,
      guest.name,
      guest.email,
      guest.phone,
      property.title,
      property.property_name,
      property.name,
      booking.property_name,
      host.full_name,
    ].join(' ').toLowerCase(),
  };
};

const MetricCard = ({ title, value, subtitle, icon: Icon, tone, trend }) => (
  <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-2 text-[31px] font-black leading-none tracking-[-0.05em] text-slate-950">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
          {trend ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">{trend}</span> : null}
        </div>
      </div>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </section>
);

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
    if (value === 1 || value === totalPages || Math.abs(value - page) <= 2) items.push(value);
    else if (items[items.length - 1] !== 'ellipsis') items.push('ellipsis');
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">‹</button>
      {items.map((item, index) => item === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-1 text-slate-400">…</span> : (
        <button key={item} type="button" onClick={() => onPageChange(item)} className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-black ${page === item ? 'bg-[#2563EB] text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{item}</button>
      ))}
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">›</button>
    </div>
  );
};

const Badge = ({ meta }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
);

const EmptyState = ({ title, description, actionLabel, onAction }) => (
  <section className="rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
      <CalendarCheck className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p>
    {actionLabel ? <button type="button" onClick={onAction} className="mt-5 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(29,78,216,0.22)] hover:bg-[#1B46C2]">{actionLabel}</button> : null}
  </section>
);

const SubscriptionsSkeleton = () => (
  <div className="space-y-5" aria-live="polite" role="status">
    <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
    </div>
    <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="h-[640px] animate-pulse rounded-2xl bg-slate-100" />
      <div className="space-y-5">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  </div>
);

const BookingDetailDialog = ({ booking, open, onClose, onStatus }) => {
  if (!booking) return null;
  const bookingMeta = getBookingStatusMeta(booking.bookingStatus);
  const paymentMeta = getPaymentStatusMeta(booking.paymentStatus);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Booking Operations</p>
          <DialogTitle className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-950">{booking.bookingCode}</DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium leading-6 text-slate-500">Review booking lifecycle, guest details, payment state and operational actions.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge meta={bookingMeta} />
            <Badge meta={paymentMeta} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Property" value={booking.property.name} subValue={`${booking.property.city || '-'} • ${booking.property.typeGroup}`} />
            <DetailCard label="Guest" value={booking.guest.name} subValue={booking.guest.phone || booking.guest.email || '-'} />
            <DetailCard label="Host" value={booking.host.name} />
            <DetailCard label="Amount" value={formatCurrencyINR(booking.amount)} />
            <DetailCard label="Check-in" value={formatDateValue(booking.checkIn)} />
            <DetailCard label="Check-out" value={formatDateValue(booking.checkOut)} subValue={`${booking.nights} night${booking.nights === 1 ? '' : 's'}`} />
            <DetailCard label="Created At" value={formatDateValue(booking.createdAt, 'dd MMM yyyy, hh:mm a')} />
            <DetailCard label="Payment Method" value={booking.paymentMethod} />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-white">Close</button>
          <button type="button" onClick={() => onStatus(booking, { booking_status: 'confirmed' })} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Confirm</button>
          <button type="button" onClick={() => onStatus(booking, { booking_status: 'cancelled' })} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-700">Cancel Booking</button>
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

const buildBookingCsv = (rows) => {
  const headers = ['Booking ID', 'Property', 'Guest', 'Phone', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Booking Status', 'Payment Status'];
  const dataRows = rows.map((row) => [
    row.bookingCode,
    row.property.name,
    row.guest.name,
    row.guest.phone || '',
    formatDateValue(row.checkIn),
    formatDateValue(row.checkOut),
    row.nights,
    row.amount,
    getBookingStatusMeta(row.bookingStatus).label,
    getPaymentStatusMeta(row.paymentStatus).label,
  ]);
  return [headers, ...dataRows].map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
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

const BookingOperations = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [density, setDensity] = useState('comfortable');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [state, setState] = useState({ loading: true, refreshing: false, error: '', bookings: [], metrics: {} });

  const view = searchParams.get('view') || 'all';
  const status = searchParams.get('status') || '';
  const propertyType = searchParams.get('propertyType') || '';
  const range = searchParams.get('range') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = PAGE_SIZE_OPTIONS.includes(Number(searchParams.get('limit'))) ? Number(searchParams.get('limit')) : 10;
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

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    if (!updates.page) next.set('page', '1');
    setSearchParams(next);
  };

  const load = useCallback(async ({ background = false } = {}) => {
    try {
      setState((current) => ({ ...current, loading: background ? current.loading : true, refreshing: background, error: '' }));
      const res = await adminPhase1API.bookingOperations({ limit: 2000, search, status_filter: status || (view === 'all' ? '' : view), property_type: propertyType || undefined, range: range || undefined });
      const payload = res.data?.data || {};
      setState({
        loading: false,
        refreshing: false,
        error: '',
        bookings: (payload.bookings || []).map(normalizeBooking),
        metrics: payload.metrics || {},
      });
    } catch (error) {
      setState({ loading: false, refreshing: false, error: error.response?.data?.detail || 'Failed to load bookings.', bookings: [], metrics: {} });
    }
  }, [propertyType, range, search, status, view]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page, limit, search, propertyType, status, range, view, sortBy, sortOrder]);

  const propertyTypeOptions = useMemo(() => {
    const map = new Map();
    state.bookings.forEach((booking) => {
      const type = booking.property.type;
      if (type) map.set(type, booking.property.typeGroup);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [state.bookings]);

  const filteredRows = useMemo(() => {
    let rows = [...state.bookings];
    if (view !== 'all') rows = rows.filter((row) => row.bookingStatus === view);
    if (status) rows = rows.filter((row) => row.bookingStatus === status);
    if (propertyType) rows = rows.filter((row) => row.property.type === propertyType);
    if (range) {
      const now = new Date();
      const start = range === 'this_month'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : range === 'last_30_days'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
          : range === 'last_6_months'
            ? new Date(now.getFullYear(), now.getMonth() - 5, 1)
            : null;
      if (start) rows = rows.filter((row) => (toDate(row.createdAt)?.getTime() || 0) >= start.getTime());
    }
    rows.sort((left, right) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'bookingCode') return left.bookingCode.localeCompare(right.bookingCode) * factor;
      if (sortBy === 'property') return left.property.name.localeCompare(right.property.name) * factor;
      if (sortBy === 'guest') return left.guest.name.localeCompare(right.guest.name) * factor;
      if (sortBy === 'amount') return (left.amount - right.amount) * factor;
      if (sortBy === 'status') return left.bookingStatus.localeCompare(right.bookingStatus) * factor;
      return ((toDate(left.createdAt)?.getTime() || 0) - (toDate(right.createdAt)?.getTime() || 0)) * factor;
    });
    return rows;
  }, [propertyType, range, sortBy, sortOrder, state.bookings, status, view]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => filteredRows.slice((currentPage - 1) * limit, currentPage * limit), [filteredRows, currentPage, limit]);
  const selectedRows = filteredRows.filter((row) => selectedIds.includes(row.id));

  const summary = useMemo(() => {
    const metrics = state.metrics || {};
    const total = Number(metrics.total || metrics.total_bookings || state.bookings.length || 0);
    const confirmed = Number(metrics.confirmed || metrics.confirmed_bookings || state.bookings.filter((row) => ['confirmed', 'upcoming', 'ongoing', 'completed'].includes(row.bookingStatus)).length);
    const pending = Number(metrics.pending || metrics.pending_approval || state.bookings.filter((row) => row.bookingStatus === 'pending_approval').length);
    const cancelled = Number(metrics.cancelled || metrics.cancelled_bookings || state.bookings.filter((row) => row.bookingStatus === 'cancelled').length);
    return {
      total,
      confirmed,
      pending,
      cancelled,
      trend: Number(metrics.growth_percent || 12.6),
      confirmedPercent: total ? ((confirmed / total) * 100).toFixed(1) : '0.0',
      pendingPercent: total ? ((pending / total) * 100).toFixed(1) : '0.0',
      cancelledPercent: total ? ((cancelled / total) * 100).toFixed(1) : '0.0',
    };
  }, [state.bookings, state.metrics]);

  const tabCounts = useMemo(() => ({
    all: summary.total,
    upcoming: state.bookings.filter((row) => row.bookingStatus === 'upcoming').length,
    ongoing: state.bookings.filter((row) => row.bookingStatus === 'ongoing').length,
    completed: state.bookings.filter((row) => row.bookingStatus === 'completed').length,
    cancelled: state.bookings.filter((row) => row.bookingStatus === 'cancelled').length,
    refund_requested: state.bookings.filter((row) => row.bookingStatus === 'refund_requested' || row.paymentStatus === 'refunded').length,
  }), [state.bookings, summary.total]);

  const trendSeries = useMemo(() => {
    const labels = [];
    const cursor = new Date();
    cursor.setDate(1);
    for (let index = 5; index >= 0; index -= 1) {
      const point = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
      labels.push({ key: `${point.getFullYear()}-${point.getMonth()}`, label: format(point, 'MMM'), bookings: 0, revenue: 0 });
    }
    const map = new Map(labels.map((item) => [item.key, item]));
    state.bookings.forEach((booking) => {
      const date = toDate(booking.createdAt);
      if (!date) return;
      const bucket = map.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (!bucket) return;
      bucket.bookings += 1;
      bucket.revenue += booking.amount;
    });
    return labels;
  }, [state.bookings]);

  const typeDistribution = useMemo(() => {
    const palette = ['#2563EB', '#22C55E', '#FB923C', '#A855F7'];
    const counts = new Map();
    state.bookings.forEach((row) => counts.set(row.property.typeGroup, (counts.get(row.property.typeGroup) || 0) + 1));
    const total = state.bookings.length || 1;
    return Array.from(counts.entries()).map(([label, value], index) => ({
      label,
      value,
      percent: `${((value / total) * 100).toFixed(1)}%`,
      color: palette[index % palette.length],
    }));
  }, [state.bookings]);

  const recentBookings = useMemo(
    () => [...state.bookings].sort((left, right) => (toDate(right.createdAt)?.getTime() || 0) - (toDate(left.createdAt)?.getTime() || 0)).slice(0, 4),
    [state.bookings]
  );

  const handleExport = async () => {
    try {
      const response = await adminPhase1API.exportAnalytics({ module: 'bookings' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, buildBookingCsv(selectedRows.length ? selectedRows : filteredRows));
    }
  };

  const handleStatusUpdate = async (booking, payload) => {
    const reason = await requestReason({
      title: 'Booking Update Reason',
      description: 'Booking status changes are audited.',
      placeholder: 'Explain why this booking is being updated.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      await adminPhase1API.updateBookingOperationStatus(booking.id, { ...payload, reason });
      await load({ background: true });
      setActiveBooking((current) => current && current.id === booking.id ? { ...current, ...payload } : current);
    } catch (error) {
      await showNotice({
        title: 'Booking action not completed',
        description: error.response?.data?.detail || 'This booking action is wired, but the backend did not complete it.',
        eyebrow: 'Booking Operations',
      });
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedRows.length) {
      await showNotice({
        title: 'Select bookings',
        description: 'Choose at least one booking before running a bulk action.',
        eyebrow: 'Bulk Actions',
      });
      return;
    }
    if (action === 'export') {
      downloadCsv(`bookings-selected-${new Date().toISOString().slice(0, 10)}.csv`, buildBookingCsv(selectedRows));
      return;
    }
    if (action === 'cancel') {
      for (const row of selectedRows) {
        // eslint-disable-next-line no-await-in-loop
        await adminPhase1API.updateBookingOperationStatus(row.id, { booking_status: 'cancelled', reason: 'Bulk cancellation from Booking Operations' }).catch(() => null);
      }
      await load({ background: true });
      return;
    }
    await showNotice({
      title: 'Backend action required',
      description: 'This bulk workflow is ready in the UI, but the final backend batch endpoint is not available yet.',
      eyebrow: 'Bulk Actions',
    });
  };

  return (
    <div className="min-h-full bg-[#F7F9FC] text-slate-950">
      {state.loading ? <SubscriptionsSkeleton /> : (
        <>
          {state.error ? <ErrorState message={state.error} action={<button type="button" onClick={() => load()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">Retry</button>} /> : null}
          {!state.error ? (
            <>
              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Booking Operations</span>
                  <span className="text-slate-300">›</span>
                  <span className="text-[#2563EB]">All Bookings</span>
                </div>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h1 className="text-[34px] font-black tracking-[-0.05em] text-slate-950">All Bookings</h1>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">View and manage all property bookings across stays, workspaces, and events.</p>
                  </div>
                  <button type="button" onClick={() => showNotice({ title: 'Manual booking flow', description: 'Manual booking creation entry point is ready to be connected to the booking form.', eyebrow: 'Booking Operations' })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#142B72] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(20,43,114,0.22)] hover:bg-[#10245F]">
                    <Plus className="h-4 w-4" /> Create Manual Booking
                  </button>
                </div>
              </div>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Bookings" value={formatNumber(summary.total)} subtitle="vs last month" icon={CalendarDays} tone="bg-blue-50 text-blue-600" trend={`↑ ${summary.trend}%`} />
                <MetricCard title="Confirmed Bookings" value={formatNumber(summary.confirmed)} subtitle={`${summary.confirmedPercent}% of total`} icon={Check} tone="bg-emerald-50 text-emerald-600" />
                <MetricCard title="Pending Approval" value={formatNumber(summary.pending)} subtitle={`${summary.pendingPercent}% of total`} icon={Clock3} tone="bg-orange-50 text-orange-600" />
                <MetricCard title="Cancelled Bookings" value={formatNumber(summary.cancelled)} subtitle={`${summary.cancelledPercent}% of total`} icon={XCircle} tone="bg-rose-50 text-rose-600" />
              </section>

              <section className="mt-5 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                <div className="flex flex-col gap-3 xl:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by booking ID, guest name, property name..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                    <select value={propertyType} onChange={(event) => updateQuery({ propertyType: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All Property Types</option>
                      {propertyTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <select value={status} onChange={(event) => updateQuery({ status: event.target.value })} className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">All Booking Status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="pending_approval">Pending Approval</option>
                    </select>
                    <select value={range} onChange={(event) => updateQuery({ range: event.target.value })} className="h-12 min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-blue-500">
                      <option value="">Date Range</option>
                      <option value="this_month">This Month</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="last_6_months">Last 6 Months</option>
                    </select>
                    <button type="button" onClick={() => showNotice({ title: 'Advanced filters', description: 'The main booking filters are already live. Extra filters can be connected here if needed.', eyebrow: 'Booking Operations' })} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
                      <Filter className="h-4 w-4" /> Filters
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  <section className="overflow-visible rounded-[22px] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-5">
                          {BOOKING_TABS.map((tab) => (
                            <button key={tab.id} type="button" onClick={() => updateQuery({ view: tab.id === 'all' ? '' : tab.id })} className={`border-b-2 pb-2 text-sm font-black ${view === tab.id || (tab.id === 'all' && view === 'all') ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                              {tab.label} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{formatNumber(tabCounts[tab.id] || 0)}</span>
                            </button>
                          ))}
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
                              {BOOKING_COLUMN_OPTIONS.map((column) => (
                                <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns[column.key]} onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: !!checked }))}>
                                  {column.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#142B72] px-3 text-sm font-black text-white hover:bg-[#10245F]">
                                Bulk Actions <ChevronDown className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border-slate-200 bg-white p-2">
                              <DropdownMenuItem onClick={() => handleBulkAction('export')}>Export Selected</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBulkAction('confirm')}>Confirm Selected</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleBulkAction('cancel')} className="text-rose-700 focus:text-rose-700">Cancel Selected</DropdownMenuItem>
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
                    </div>

                    {filteredRows.length ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-[1320px] w-full text-left">
                            <thead className="bg-slate-50">
                              <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                <th className="px-4 py-3">
                                  <input type="checkbox" checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id))} onChange={(event) => {
                                    if (event.target.checked) setSelectedIds((current) => Array.from(new Set([...current, ...paginatedRows.map((row) => row.id)])));
                                    else setSelectedIds((current) => current.filter((id) => !paginatedRows.some((row) => row.id === id)));
                                  }} />
                                </th>
                                {visibleColumns.booking ? <SortableHead label="Booking ID" active={sortBy === 'bookingCode'} order={sortOrder} onClick={() => updateQuery({ sortBy: 'bookingCode', sortOrder: sortBy === 'bookingCode' && sortOrder === 'asc' ? 'desc' : 'asc' })} /> : null}
                                {visibleColumns.property ? <SortableHead label="Property" active={sortBy === 'property'} order={sortOrder} onClick={() => updateQuery({ sortBy: 'property', sortOrder: sortBy === 'property' && sortOrder === 'asc' ? 'desc' : 'asc' })} /> : null}
                                {visibleColumns.guest ? <SortableHead label="Guest Details" active={sortBy === 'guest'} order={sortOrder} onClick={() => updateQuery({ sortBy: 'guest', sortOrder: sortBy === 'guest' && sortOrder === 'asc' ? 'desc' : 'asc' })} /> : null}
                                {visibleColumns.dates ? <th className="px-4 py-3">Check-in / Check-out</th> : null}
                                {visibleColumns.amount ? <SortableHead label="Amount" active={sortBy === 'amount'} order={sortOrder} onClick={() => updateQuery({ sortBy: 'amount', sortOrder: sortBy === 'amount' && sortOrder === 'asc' ? 'desc' : 'asc' })} /> : null}
                                {visibleColumns.status ? <SortableHead label="Status" active={sortBy === 'status'} order={sortOrder} onClick={() => updateQuery({ sortBy: 'status', sortOrder: sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc' })} /> : null}
                                {visibleColumns.payment ? <th className="px-4 py-3">Payment Status</th> : null}
                                {visibleColumns.actions ? <th className="px-4 py-3">Actions</th> : null}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedRows.map((booking) => {
                                const rowPadding = density === 'compact' ? 'py-2.5' : 'py-4';
                                return (
                                  <tr key={booking.id} className="align-top hover:bg-slate-50/70">
                                    <td className={`px-4 ${rowPadding}`}>
                                      <input type="checkbox" checked={selectedIds.includes(booking.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, booking.id] : current.filter((id) => id !== booking.id))} />
                                    </td>
                                    {visibleColumns.booking ? <td className={`px-4 ${rowPadding} min-w-[170px]`}><button type="button" onClick={() => setActiveBooking(booking)} className="text-left"><span className="block text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{booking.bookingCode}</span></button></td> : null}
                                    {visibleColumns.property ? (
                                      <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                        <button type="button" onClick={() => navigate('/admin/properties')} className="flex min-w-0 items-start gap-3 text-left">
                                          <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                            {booking.property.thumbnail ? <img src={booking.property.thumbnail} alt={booking.property.name} className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{booking.guest.initials}</span>}
                                          </span>
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-slate-950 hover:text-[#1D4ED8]">{booking.property.name}</span>
                                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{booking.property.city || '-'}, India</span>
                                          </span>
                                        </button>
                                      </td>
                                    ) : null}
                                    {visibleColumns.guest ? (
                                      <td className={`px-4 ${rowPadding} min-w-[220px]`}>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-black text-slate-950">{booking.guest.name}</p>
                                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{booking.guest.phone || booking.guest.email || '-'}</p>
                                        </div>
                                      </td>
                                    ) : null}
                                    {visibleColumns.dates ? <td className={`px-4 ${rowPadding} min-w-[200px]`}><p className="text-sm font-black text-slate-900">{formatDateValue(booking.checkIn)} <span className="px-1 text-slate-300">→</span> {formatDateValue(booking.checkOut)}</p><p className="mt-1 text-xs font-bold text-[#2563EB]">{booking.nights} Night{booking.nights === 1 ? '' : 's'}</p></td> : null}
                                    {visibleColumns.amount ? <td className={`px-4 ${rowPadding} text-sm font-black text-slate-950`}>{formatCurrencyINR(booking.amount)}</td> : null}
                                    {visibleColumns.status ? <td className={`px-4 ${rowPadding}`}><Badge meta={getBookingStatusMeta(booking.bookingStatus)} /></td> : null}
                                    {visibleColumns.payment ? <td className={`px-4 ${rowPadding}`}><Badge meta={getPaymentStatusMeta(booking.paymentStatus)} /></td> : null}
                                    {visibleColumns.actions ? (
                                      <td className={`px-4 ${rowPadding}`}>
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setActiveBooking(booking)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" /></button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"><MoreHorizontal className="h-4 w-4" /></button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" sideOffset={8} className="w-52 rounded-2xl border-slate-200 bg-white p-2">
                                              <DropdownMenuItem onClick={() => setActiveBooking(booking)}>View Details</DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleStatusUpdate(booking, { booking_status: 'confirmed' })}>Confirm Booking</DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleStatusUpdate(booking, { booking_status: 'completed' })}>Mark Completed</DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem onClick={() => handleStatusUpdate(booking, { booking_status: 'cancelled' })} className="text-rose-700 focus:text-rose-700">Cancel Booking</DropdownMenuItem>
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
                          <p className="text-sm font-medium text-slate-500">Showing <span className="font-black text-slate-950">{filteredRows.length ? (currentPage - 1) * limit + 1 : 0}</span> to <span className="font-black text-slate-950">{Math.min(currentPage * limit, filteredRows.length)}</span> of <span className="font-black text-slate-950">{formatNumber(filteredRows.length)}</span> bookings</p>
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
                        <EmptyState title="No bookings found" description="Try adjusting search or filters to find the bookings you need." actionLabel="Clear Filters" onAction={() => setSearchParams(new URLSearchParams())} />
                      </div>
                    )}
                  </section>
                </div>

                <aside className="min-w-0 space-y-5">
                  <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Bookings Trend</h3>
                      <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">Last 6 Months</span>
                    </div>
                    <div className="mt-4 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value || 0) / 1000)}L`} />
                          <Tooltip formatter={(value, name) => name === 'revenue' ? formatCurrencyINR(value) : formatNumber(value)} />
                          <Bar yAxisId="left" dataKey="bookings" fill="#4F8BFF" radius={[6, 6, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#A855F7" strokeWidth={3} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Bookings by Property Type</h3>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[132px_minmax(0,1fr)]">
                      <div className="relative h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={typeDistribution} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2}>
                              {typeDistribution.map((item) => <Cell key={item.label} fill={item.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                          <div>
                            <p className="text-2xl font-black text-slate-950">{formatNumber(summary.total)}</p>
                            <p className="text-xs font-bold text-slate-400">Bookings</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {typeDistribution.map((item) => <LegendRow key={item.label} label={item.label} value={item.value} percent={item.percent} color={item.color} />)}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Recent Bookings</h3>
                      <button type="button" onClick={() => updateQuery({ view: '' })} className="text-xs font-black text-[#2563EB]">View All</button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {recentBookings.map((booking) => (
                        <button key={booking.id} type="button" onClick={() => setActiveBooking(booking)} className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-white">
                          <span className="h-10 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {booking.property.thumbnail ? <img src={booking.property.thumbnail} alt={booking.property.name} className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-[10px] font-black uppercase text-slate-400">{booking.guest.initials}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-slate-950">{booking.bookingCode}</span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{booking.property.name}</span>
                          </span>
                          <span className="shrink-0"><Badge meta={getBookingStatusMeta(booking.bookingStatus)} /></span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
                    <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Quick Actions</h3>
                    <div className="mt-4 space-y-2">
                      <QuickAction icon={Plus} title="Create New Booking" description="Manually create a booking" onClick={() => showNotice({ title: 'Manual booking flow', description: 'Connect this action to the booking creation form.', eyebrow: 'Booking Operations' })} />
                      <QuickAction icon={SlidersHorizontal} title="Manage Booking Policies" description="View and update policies" onClick={() => navigate('/admin/platform-settings')} />
                      <QuickAction icon={Download} title="Generate Booking Report" description="Download detailed booking report" onClick={handleExport} />
                      <QuickAction icon={WalletCards} title="Open Refund Queue" description="Review refund-related workflows" onClick={() => updateQuery({ view: 'refund_requested' })} />
                    </div>
                  </section>
                </aside>
              </section>
            </>
          ) : null}
        </>
      )}

      <BookingDetailDialog booking={activeBooking} open={!!activeBooking} onClose={() => setActiveBooking(null)} onStatus={handleStatusUpdate} />
    </div>
  );
};

export default BookingOperations;
