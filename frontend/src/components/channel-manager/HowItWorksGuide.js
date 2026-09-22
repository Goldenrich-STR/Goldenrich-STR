import React from 'react';
import { ArrowRight, CalendarDays, Link2, RefreshCw, ShieldCheck } from 'lucide-react';

const steps = [
  ['1', 'Copy the OTA import URL', 'Open the listing calendar settings in Airbnb, Booking.com, MakeMyTrip, Agoda, Vrbo, or another iCal provider and copy its export link.'],
  ['2', 'Connect one property', 'Select the exact X-Space360 property listing, label the integration, paste the OTA link, and choose a sync frequency.'],
  ['3', 'Export X-Space360 availability', 'Copy the generated X-Space360 export link and add it as an imported calendar in the OTA dashboard.'],
  ['4', 'Monitor and sync', 'Imported reservations block this property calendar. Use Sync Now after urgent OTA changes and review failed status messages.'],
];

export default function HowItWorksGuide() {
  return <div className="space-y-5">
    <section className="rounded-md border border-slate-200 bg-white p-5"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700"><RefreshCw size={22} /></div><div><h2 className="text-xl font-black text-slate-950">How 2-way calendar sync works</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Each property is one bookable listing. The OTA feed comes into X-Space360, and the X-Space360 feed goes back to that OTA. No room or unit mapping is required.</p></div></div></section>
    <div className="grid gap-3 lg:grid-cols-4">{steps.map(([number, title, detail], index) => <React.Fragment key={number}><section className="relative rounded-md border border-slate-200 bg-white p-4"><span className="grid h-7 w-7 place-items-center rounded-full bg-blue-700 text-xs font-black text-white">{number}</span><h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></section>{index < steps.length - 1 && <ArrowRight className="hidden self-center text-slate-300 lg:block lg:-mx-5 lg:z-10" size={20} />}</React.Fragment>)}</div>
    <section className="grid gap-0 overflow-hidden rounded-md border border-slate-200 bg-white md:grid-cols-3"><div className="p-5"><Link2 className="text-blue-700" size={22} /><h3 className="mt-3 text-sm font-black">Import link from OTA</h3><p className="mt-1 text-xs leading-5 text-slate-600">Brings OTA reservations into the unified occupancy calendar.</p></div><div className="border-y border-slate-200 p-5 md:border-x md:border-y-0"><CalendarDays className="text-emerald-700" size={22} /><h3 className="mt-3 text-sm font-black">Export link for OTA</h3><p className="mt-1 text-xs leading-5 text-slate-600">Publishes direct bookings and manual blocks back to the OTA.</p></div><div className="p-5"><ShieldCheck className="text-amber-700" size={22} /><h3 className="mt-3 text-sm font-black">Operational rule</h3><p className="mt-1 text-xs leading-5 text-slate-600">Never paste the X-Space360 export URL into its own import field. Connect each OTA feed only once per property.</p></div></section>
  </div>;
}
