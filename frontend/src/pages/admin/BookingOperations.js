import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Search, XCircle, Download } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestReason, Pagination } from './shared';

const statusTabs = [
  ['', 'All'],
  ['soft_lock', 'Soft Lock'],
  ['confirmed', 'Confirmed'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['pending', 'Pending'],
];

const BookingOperations = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', bookings: [], metrics: {} });
  const [selected, setSelected] = useState({ loading: false, booking: null, error: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentStatus, search]);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const res = await adminPhase1API.bookingOperations({ status_filter: statusFilter, payment_status: paymentStatus, search });
      setState({ loading: false, error: '', bookings: res.data.data.bookings, metrics: res.data.data.metrics });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load bookings', bookings: [], metrics: {} });
    }
  }, [statusFilter, paymentStatus, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const response = await adminPhase1API.exportAnalytics({ module: 'bookings' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export bookings CSV:', error);
    }
  };

  const openBooking = async (booking) => {
    try {
      setSelected({ loading: true, booking, error: '' });
      const res = await adminPhase1API.bookingOperationDetail(booking.booking_id);
      setSelected({ loading: false, booking: res.data.data.booking, error: '' });
    } catch (error) {
      setSelected({ loading: false, booking, error: error.response?.data?.detail || 'Failed to load booking detail' });
    }
  };

  const updateStatus = async (booking, payload) => {
    const reason = await requestReason({
      title: 'Booking Update Reason',
      description: 'Booking status changes are audited.',
      placeholder: 'Explain why this booking is being updated.',
      minLength: 3,
    });
    if (!reason) return;
    await adminPhase1API.updateBookingOperationStatus(booking.booking_id, { ...payload, reason });
    if (selected.booking?.booking_id === booking.booking_id) {
      const res = await adminPhase1API.bookingOperationDetail(booking.booking_id);
      setSelected({ loading: false, booking: res.data.data.booking, error: '' });
    }
    load();
  };

  return (
    <div>
      <PageHeader
        title="Booking Operations"
        description="Track booking lifecycle, payment status, host/guest/property context, cancellations, refunds and operational risk flags."
        action={
          <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {statusTabs.map(([id, label]) => <button key={label} onClick={() => setStatusFilter(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${statusFilter === id ? 'bg-[#e8f0ff] text-[#2f6df6] shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>{label}</button>)}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search booking, property, host, guest or payment reference" /></div>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Confirmed', state.metrics.confirmed || 0],
                ['Soft Lock', state.metrics.soft_lock || 0],
                ['Pending Payment', state.metrics.pending_payment || 0],
                ['Gross Value', formatMoney(state.metrics.gross_value || 0)],
              ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
            </div>
            <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Booking', 'Property', 'Guest', 'Host', 'Dates', 'Guests', 'Amount', 'Payment', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.bookings.slice((page - 1) * 10, page * 10).map((booking) => <BookingRow key={booking.booking_id} booking={booking} onOpen={openBooking} onStatus={updateStatus} />)}
                  </tbody>
                </table>
                {!state.bookings.length && <p className="p-6 text-sm text-slate-500">No bookings found.</p>}
              </div>
            </Panel>
            <Pagination currentPage={page} totalItems={state.bookings.length} itemsPerPage={10} onPageChange={setPage} />
          </div>
          <BookingDetailPanel selected={selected} onClose={() => setSelected({ loading: false, booking: null, error: '' })} onStatus={updateStatus} />
        </div>
      )}
    </div>
  );
};

const BookingRow = ({ booking, onOpen, onStatus }) => (
  <tr>
    <td className="px-4 py-3"><p className="font-black">{booking.booking_id}</p><p className="text-xs text-slate-500">{String(booking.created_at || '-').slice(0, 10)}</p></td>
    <td className="px-4 py-3"><p className="font-bold">{booking.property?.title || booking.property_id}</p><p className="text-xs text-slate-500">{booking.property?.city || '-'}</p></td>
    <td className="px-4 py-3">{booking.guest?.full_name || booking.guest_id}</td>
    <td className="px-4 py-3">{booking.host?.full_name || booking.host_id}</td>
    <td className="px-4 py-3">{String(booking.check_in_date || '-').slice(0, 10)} to {String(booking.check_out_date || '-').slice(0, 10)}</td>
    <td className="px-4 py-3">{booking.number_of_guests || 0}</td>
    <td className="px-4 py-3">{formatMoney(booking.total_amount || 0)}</td>
    <td className="px-4 py-3"><StatusBadge value={booking.payment_status} /></td>
    <td className="px-4 py-3"><StatusBadge value={booking.booking_status} /></td>
    <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5"><button onClick={() => onOpen(booking)} className="rounded-xl bg-[#2f6df6] px-2.5 py-1.5 text-xs font-bold text-white">Review</button><button onClick={() => onStatus(booking, { booking_status: 'cancelled' })} className="rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Cancel</button></div></td>
  </tr>
);

const BookingDetailPanel = ({ selected, onClose, onStatus }) => {
  if (!selected.booking) return <Panel className="hidden p-5 text-sm text-slate-500 xl:block">Select a booking to review payment, property, host, guest and audit history.</Panel>;
  const booking = selected.booking;
  return (
    <Panel className="p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-[#2f6df6]">Booking Detail</p><h2 className="text-lg font-black">{booking.booking_id}</h2><p className="text-xs text-slate-500">{booking.property?.title || booking.property_id}</p></div>
        <button onClick={onClose} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Close</button>
      </div>
      {selected.loading ? <LoadingState /> : selected.error ? <ErrorState message={selected.error} /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2"><StatusBadge value={booking.booking_status} /><StatusBadge value={booking.payment_status} />{(booking.risk_flags || []).map((flag) => <StatusBadge key={flag} value={flag} />)}</div>
          <InfoGrid rows={[
            ['Guest', booking.guest?.full_name || booking.guest_id],
            ['Host', booking.host?.full_name || booking.host_id],
            ['Broker', booking.broker?.full_name || booking.broker_id || '-'],
            ['Dates', `${String(booking.check_in_date || '-').slice(0, 10)} to ${String(booking.check_out_date || '-').slice(0, 10)}`],
            ['Guests', booking.number_of_guests],
            ['Total', formatMoney(booking.total_amount || 0)],
            ['Paid', formatMoney(booking.paid_amount || 0)],
            ['Payment Ref', booking.razorpay_payment_id || booking.razorpay_order_id || '-'],
          ]} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onStatus(booking, { payment_status: 'refunded' })} className="inline-flex items-center justify-center gap-1 rounded-2xl bg-[#eef5ff] px-3 py-2.5 text-xs font-black text-[#2f6df6]"><CreditCard className="h-4 w-4" /> Mark Refunded</button>
            <button onClick={() => onStatus(booking, { booking_status: 'completed' })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black">Complete</button>
            <button onClick={() => onStatus(booking, { booking_status: 'cancelled' })} className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"><XCircle className="h-4 w-4" /> Cancel</button>
          </div>
          <History title="Transactions" rows={booking.transactions || []} />
          <History title="Audit History" rows={booking.audit_history || []} />
        </div>
      )}
    </Panel>
  );
};

const InfoGrid = ({ rows }) => <div className="grid gap-2 text-xs">{rows.map(([label, value]) => <p key={label} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="font-bold text-slate-500">{label}</span><span className="text-right font-semibold">{value || '-'}</span></p>)}</div>;

const History = ({ title, rows }) => (
  <div className="space-y-2">
    <p className="text-xs font-black uppercase text-slate-500">{title}</p>
    {rows.slice(0, 5).map((item, index) => <p key={item.audit_id || item.transaction_id || index} className="rounded-lg bg-slate-50 p-2 text-xs"><b>{item.action || item.type || item.status || '-'}</b><span className="block text-slate-500">{item.reason || item.amount || item.created_at || '-'}</span></p>)}
    {!rows.length && <p className="text-xs text-slate-500">No records found.</p>}
  </div>
);

export default BookingOperations;
