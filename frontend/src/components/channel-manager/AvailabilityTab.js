import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarX2 } from 'lucide-react';
import PropertySelect from './PropertySelect';
import { channelManagerApi } from './channelManagerApi';

const iso = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function AvailabilityTab({ properties, propertyId, setPropertyId, notify }) {
  const [blocks, setBlocks] = useState([]);
  const [busy, setBusy] = useState(false);
  const dates = useMemo(() => Array.from({ length: 30 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() + index); return day; }), []);

  const load = useCallback(async () => {
    if (!propertyId) return setBlocks([]);
    setBusy(true);
    try {
      setBlocks(await channelManagerApi.blocks(propertyId, iso(dates[0]), iso(dates[dates.length - 1])));
    } catch (error) {
      notify(error?.response?.data?.detail || 'Availability could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  }, [dates, notify, propertyId]);

  useEffect(() => { load(); }, [load]);
  const isBlocked = (date) => blocks.some((block) => iso(date) >= block.start_date && iso(date) <= block.end_date);
  const unavailable = dates.filter(isBlocked).length;

  return <div className="space-y-5">
    <section className="rounded-md border border-slate-200 bg-white p-4"><div className="max-w-xl"><PropertySelect properties={properties} value={propertyId} onChange={setPropertyId} /></div></section>
    <div className="grid gap-4 sm:grid-cols-2"><section className="flex items-center gap-4 rounded-md border border-emerald-200 bg-white p-5"><CalendarCheck2 className="text-emerald-600" size={28} /><div><p className="text-xs font-bold uppercase text-slate-500">Available next 30 days</p><p className="text-3xl font-black text-slate-950">{30 - unavailable}</p></div></section><section className="flex items-center gap-4 rounded-md border border-red-200 bg-white p-5"><CalendarX2 className="text-red-600" size={28} /><div><p className="text-xs font-bold uppercase text-slate-500">Unavailable next 30 days</p><p className="text-3xl font-black text-slate-950">{unavailable}</p></div></section></div>
    <section className={`rounded-md border border-slate-200 bg-white p-4 ${busy ? 'opacity-60' : ''}`}><h2 className="text-base font-black">30-day availability</h2><div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-15">{dates.map((date) => { const blocked = isBlocked(date); return <div className={`aspect-square min-w-0 rounded-md border p-1 text-center ${blocked ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} key={iso(date)} title={blocked ? 'Unavailable' : 'Available'}><span className="block text-[10px] font-bold uppercase">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span><span className="block text-sm font-black">{date.getDate()}</span></div>; })}</div><div className="mt-4 flex gap-4 text-xs font-semibold text-slate-600"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300" />Available</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-300" />Unavailable</span></div></section>
  </div>;
}
