import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, FileText, IndianRupee, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationCenter';

const hostNavigation = [
  { label: 'Dashboard', group: 'Control', path: '/host/dashboard', icon: Building2 },
  { label: 'Calendar', group: 'Operations', path: '/host/calendar', icon: Calendar },
  { label: 'Payouts', group: 'Finance', path: '/host/payouts', icon: IndianRupee },
  { label: 'Bookings', group: 'Reservations', path: '/host/bookings', icon: FileText },
  { label: 'Performance', group: 'Insights', path: '/host/performance', icon: Star },
];

const HostWorkspaceShell = ({
  activePath,
  sidebarTitle = 'Dashboard',
  sidebarDescription,
  heroEyebrow = 'X-Space360 Host Workspace',
  heroTitle,
  heroDescription,
  heroActions = null,
  sidebarSnapshot = [],
  children,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur md:px-8 lg:px-12">
        <div className="flex w-full items-center justify-between gap-3">
          <div
            className="flex cursor-pointer items-center space-x-3"
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <NotificationBell />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-slate-900 text-xs font-black text-white shadow-sm">
              {user?.full_name?.[0]?.toUpperCase() || 'H'}
            </div>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-950"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full px-4 py-8 md:px-8 lg:px-12">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)] xl:sticky xl:top-28">
            <div className="border-b border-slate-200 px-2 pb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Host Panel</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{sidebarTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{sidebarDescription}</p>
            </div>

            <div className="mt-5 space-y-2">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/properties')}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all bg-[#eef5ff] text-[#2f6df6] hover:bg-[#dfeaff] mb-3"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-[#2f6df6]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold leading-5">Admin Properties</span>
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5b7ecb]">
                      Property Operations
                    </span>
                  </span>
                </button>
              )}
              {hostNavigation.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all ${
                    item.path === activePath
                      ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.path === activePath ? 'text-white' : 'text-slate-700'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold leading-5">{item.label}</span>
                    <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] ${item.path === activePath ? 'text-white/65' : 'text-slate-400'}`}>
                      {item.group}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {sidebarSnapshot.length > 0 && (
              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Snapshot</p>
                <div className="mt-4 space-y-3">
                  {sidebarSnapshot.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-bold capitalize text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <main className="min-w-0">
            <section className="mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.04)] md:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{heroEyebrow}</p>
                  <h1 className="text-[32px] font-black tracking-[-0.05em] text-slate-950 md:text-[42px]">{heroTitle}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{heroDescription}</p>
                </div>
                {heroActions ? <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">{heroActions}</div> : null}
              </div>
            </section>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default HostWorkspaceShell;
