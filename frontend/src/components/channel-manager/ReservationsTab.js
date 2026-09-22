import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import PropertySelect from './PropertySelect';
import { channelManagerApi } from './channelManagerApi';

const text = (value, fallback = '-') => value === null || value === undefined || value === '' ? fallback : String(value);
const lower = (value) => text(value, '').toLowerCase();
const paidStates = ['paid', 'partially_paid', 'success', 'captured', 'completed'];
const directSources = ['direct', 'website', 'web', 'mobile', 'x-space360', 'xspace360'];

export default function ReservationsTab({ properties, reservations, reload, propertyId, setPropertyId, notify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState('');
  const propertyMap = useMemo(() => Object.fromEntries(properties.map((property) => [property.id, property])), [properties]);
  const rows = useMemo(() => reservations.filter((booking) => {
    if (propertyId && booking.property_id !== propertyId) return false;
    if (status !== 'all' && lower(booking.booking_status) !== status) return false;
    const haystack = [booking.booking_id, booking.guest_name, booking.guest?.name, booking.guest?.full_name, booking.property?.title, booking.property_id, booking.booking_source, booking.source].join(' ').toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [propertyId, query, reservations, status]);

  const changeStatus = async (booking, nextStatus) => {
    setBusyId(booking.booking_id);
    try {
      await channelManagerApi.updateReservation(booking.booking_id, nextStatus);
      notify(`Reservation ${nextStatus}.`, 'success');
      await reload();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Reservation status could not be updated.', 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,1fr)_180px]">
        <PropertySelect properties={properties} value={propertyId} onChange={setPropertyId} />
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Search Reservations</span><span className="relative block"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-600" onChange={(event) => setQuery(event.target.value)} placeholder="Booking ID or guest" value={query} /></span></label>
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Status</span><select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option><option value="pending">Pending</option><option value="soft_lock">Soft lock</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Reservation</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Stay</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td className="px-4 py-12 text-center text-slate-500" colSpan="7">No reservations match these filters.</td></tr>}
            {rows.map((booking) => {
              const source = booking.booking_source || booking.source || 'Direct';
              const isDirect = directSources.includes(lower(source));
              const canConfirm = !isDirect || paidStates.includes(lower(booking.payment_status));
              const current = lower(booking.booking_status);
              return <tr key={booking.booking_id}><td className="whitespace-nowrap px-4 py-3"><p className="font-bold text-slate-900">{booking.booking_id}</p><p className="text-xs text-slate-500">{booking.guest_name || booking.guest?.name || booking.guest?.full_name || 'Guest'}</p></td><td className="px-4 py-3"><p className="max-w-56 truncate font-semibold">{booking.property?.title || propertyMap[booking.property_id]?.name || booking.property_id}</p></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{text(source)}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs">{text(booking.check_in_date)}<br />{text(booking.check_out_date)}</td><td className="px-4 py-3"><span className="capitalize">{text(booking.payment_status)}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${current === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : current === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{text(booking.booking_status).replace(/_/g, ' ')}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{!['confirmed', 'completed', 'cancelled'].includes(current) && <button aria-label="Confirm reservation" className="grid h-9 w-9 place-items-center rounded-md text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-35" disabled={!canConfirm || busyId === booking.booking_id} onClick={() => changeStatus(booking, 'confirmed')} title={canConfirm ? 'Confirm reservation' : 'Verified payment required for direct booking'} type="button"><CheckCircle2 size={17} /></button>}{current !== 'cancelled' && <button aria-label="Cancel reservation" className="grid h-9 w-9 place-items-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-35" disabled={busyId === booking.booking_id} onClick={() => changeStatus(booking, 'cancelled')} title="Cancel reservation" type="button"><XCircle size={17} /></button>}</div></td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
