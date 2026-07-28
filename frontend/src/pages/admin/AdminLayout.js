import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Search, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminNavigation } from './adminNavigation';

const NavItem = ({ item, onNavigate }) => {
  const Icon = item.icon;
  if (item.children) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </div>
        <div className="space-y-1 pl-3">
          {item.children.map((child) => (
            <NavItem key={child.path} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          isActive ? 'bg-terracotta text-charcoal shadow-subtle' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');

  const filteredNavigation = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return adminNavigation;

    return adminNavigation
      .map((item) => {
        const labelMatches = item.label.toLowerCase().includes(query);
        if (!item.children) return labelMatches ? item : null;

        const children = item.children.filter((child) => child.label.toLowerCase().includes(query));
        if (labelMatches) return item;
        return children.length ? { ...item, children } : null;
      })
      .filter(Boolean);
  }, [moduleSearch]);

  const searchInput = (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <Search className="h-4 w-4 text-slate-400" />
      <input
        aria-label="Search admin modules"
        className="h-7 w-full bg-transparent text-sm outline-none ring-0 focus:ring-0"
        onChange={(event) => setModuleSearch(event.target.value)}
        placeholder="Search modules"
        value={moduleSearch}
      />
    </div>
  );

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <img src="/logo.png" alt="X-Space360" className="h-8 w-auto object-contain" />
        <div>
          <p className="text-sm font-black text-slate-950">X-Space360</p>
          <p className="text-[11px] font-semibold text-slate-500">Central Admin</p>
        </div>
      </div>
      <div className="px-3 py-3">
        {searchInput}
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-5">
        {filteredNavigation.map((item) => (
          <NavItem key={item.label} item={item} onNavigate={() => setMobileOpen(false)} />
        ))}
        {!filteredNavigation.length && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
            No modules found.
          </div>
        )}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        href="#admin-main-content"
      >
        Skip to admin content
      </a>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full w-80 max-w-[86vw] bg-white shadow-elevated">
            <button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-[320px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                aria-label="Search admin modules"
                className="h-7 w-full bg-transparent text-sm outline-none ring-0 focus:ring-0"
                onChange={(event) => setModuleSearch(event.target.value)}
                placeholder="Search users, properties, bookings, tickets"
                value={moduleSearch}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Help">
              <HelpCircle className="h-5 w-5" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5" onClick={() => navigate('/admin/account')}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage text-xs font-black text-white">
                {user?.full_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xs font-bold">{user?.full_name || 'Admin'}</span>
                <span className="block text-[10px] font-semibold uppercase text-slate-500">Admin Profile</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
            </button>
            <button
              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6 lg:px-8" id="admin-main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
