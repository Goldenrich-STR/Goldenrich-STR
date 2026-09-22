import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import PropertySelect from './PropertySelect';
import { channelManagerApi } from './channelManagerApi';

const BLOCK_TYPES = ['Held', 'Reserved', 'Maintenance', 'Owner Stay'];
const COLORS = {
  Held: 'bg-amber-100 text-amber-800 border-amber-300',
  Reserved: 'bg-blue-100 text-blue-800 border-blue-300',
  Maintenance: 'bg-red-100 text-red-800 border-red-300',
  'Owner Stay': 'bg-violet-100 text-violet-800 border-violet-300',
  Booking: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  External: 'bg-orange-100 text-orange-800 border-orange-300',
};

const iso = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const monthGrid = (anchor) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const blockLabel = (block) => {
  if (block.source === 'booking') return 'Booking';
  if (block.source === 'external') return 'External';
  return block.block_type || 'Held';
};

export default function CalendarTab({ properties, propertyId, setPropertyId, notify }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [blocks, setBlocks] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [blockType, setBlockType] = useState('Held');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const days = useMemo(() => monthGrid(anchor), [anchor]);

  const load = useCallback(async () => {
    if (!propertyId) return setBlocks([]);
    setBusy(true);
    try {
      setBlocks(await channelManagerApi.blocks(propertyId, iso(days[0]), iso(days[days.length - 1])));
    } catch (error) {
      notify(error?.response?.data?.detail || 'Calendar could not be loaded.', 'error');
    } finally {
      setBusy(false);
    }
  }, [days, notify, propertyId]);

  useEffect(() => { load(); }, [load]);

  const chooseDay = (day) => {
    const value = iso(day);
    if (!start || end) {
      setStart(value);
      setEnd('');
    } else if (value < start) {
      setEnd(start);
      setStart(value);
    } else {
      setEnd(value);
    }
  };

  const createBlock = async () => {
    if (!propertyId || !start) return notify('Select a property and at least one date.', 'error');
    setBusy(true);
    try {
      await channelManagerApi.block(propertyId, {
        start_date: start,
        end_date: end || start,
        reason: reason.trim() || `${blockType} from Channel Manager`,
        block_type: blockType,
      });
      setStart('');
      setEnd('');
      setReason('');
      notify(`${blockType} block created.`, 'success');
      await load();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Date block could not be created.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (block) => {
    if (block.source !== 'manual') return;
    setBusy(true);
    try {
      await channelManagerApi.unblock(block.blocked_date_id);
      notify('Date block removed.', 'success');
      await load();
    } catch (error) {
      notify(error?.response?.data?.detail || 'Date block could not be removed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-lg"><PropertySelect properties={properties} value={propertyId} onChange={setPropertyId} /></div>
          <div className="flex h-10 items-center gap-1">
            <button aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 hover:bg-slate-50" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} type="button"><ChevronLeft size={18} /></button>
            <strong className="min-w-36 text-center text-sm">{anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
            <button aria-label="Next month" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 hover:bg-slate-50" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} type="button"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-bold uppercase text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => <div className="py-2" key={name}>{name}</div>)}
        </div>
        <div className={`grid grid-cols-7 ${busy ? 'opacity-60' : ''}`}>
          {days.map((day) => {
            const value = iso(day);
            const dayBlocks = blocks.filter((block) => value >= block.start_date && value <= block.end_date);
            const selected = start && value >= start && value <= (end || start);
            return (
              <button
                className={`min-h-24 min-w-0 border-b border-r border-slate-100 p-1.5 text-left align-top hover:bg-blue-50 ${day.getMonth() !== anchor.getMonth() ? 'bg-slate-50 text-slate-400' : ''} ${selected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                key={value}
                onClick={() => chooseDay(day)}
                type="button"
              >
                <span className="text-xs font-bold">{day.getDate()}</span>
                <span className="mt-1 block space-y-1">
                  {dayBlocks.slice(0, 2).map((block) => {
                    const label = blockLabel(block);
                    return <span className={`block truncate rounded border px-1 py-0.5 text-[10px] font-bold ${COLORS[label] || COLORS.Held}`} key={block.blocked_date_id}>{label}</span>;
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-base font-black text-slate-950">Block selected dates</h3>
          <p className="mt-1 text-xs text-slate-500">{start ? `${start} to ${end || start}` : 'Select dates on the calendar.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map((type) => <button className={`rounded-md border px-2 py-2 text-xs font-bold ${blockType === type ? COLORS[type] : 'border-slate-200 bg-white text-slate-600'}`} key={type} onClick={() => setBlockType(type)} type="button">{type}</button>)}
          </div>
          <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Reason
            <input className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm normal-case outline-none focus:border-blue-600" onChange={(event) => setReason(event.target.value)} value={reason} />
          </label>
          <button className="mt-4 h-10 w-full rounded-md bg-blue-700 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !start} onClick={createBlock} type="button">Apply block</button>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-black text-slate-950">Current month blocks</h3>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {!blocks.length && <p className="text-xs text-slate-500">No blocked dates.</p>}
            {blocks.map((block) => <div className="flex items-center gap-2 rounded-md border border-slate-200 p-2" key={block.blocked_date_id}><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{blockLabel(block)}</p><p className="text-[11px] text-slate-500">{block.start_date} - {block.end_date}</p></div>{block.source === 'manual' && <button aria-label="Remove block" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => removeBlock(block)} title="Remove block" type="button"><Trash2 size={15} /></button>}</div>)}
          </div>
        </section>
      </aside>
    </div>
  );
}
