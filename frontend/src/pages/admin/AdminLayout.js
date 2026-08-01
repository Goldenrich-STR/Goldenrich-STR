import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight, HelpCircle, LogOut, Mail, Menu, PanelLeftClose, PanelLeftOpen, Phone, Search, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminNavigation } from './adminNavigation';

const NavItem = ({ item, onNavigate, collapsed, openGroups, onToggleGroup }) => {
  const Icon = item.icon;
  if (item.children) {
    const isOpen = !!openGroups[item.label];
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onToggleGroup(item.label)}
          className={`flex w-full items-center rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </>
          )}
        </button>
        {isOpen && !collapsed && (
        <div className="space-y-1 border-l border-slate-200 pl-3 ml-5">
          {item.children.map((child) => (
            <NavItem
              key={child.path}
              item={child}
              onNavigate={onNavigate}
              collapsed={collapsed}
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
            />
          ))}
        </div>
        )}
      </div>
    );
  }
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
          collapsed ? 'justify-center' : 'gap-3'
        } ${
          isActive ? 'bg-terracotta text-charcoal shadow-subtle' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() =>
    adminNavigation.reduce((acc, item) => {
      if (item.children) {
        acc[item.label] = item.children.some((child) => child.path === window.location.pathname);
      }
      return acc;
    }, {})
  );

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

  const visibleOpenGroups = useMemo(() => {
    if (!moduleSearch.trim()) return openGroups;
    return filteredNavigation.reduce((acc, item) => {
      if (item.children) acc[item.label] = true;
      return acc;
    }, { ...openGroups });
  }, [filteredNavigation, moduleSearch, openGroups]);

  useEffect(() => {
    const clearModuleSearch = () => setModuleSearch('');
    window.addEventListener('admin:clear-module-search', clearModuleSearch);
    return () => window.removeEventListener('admin:clear-module-search', clearModuleSearch);
  }, []);

  const toggleGroup = (label) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const searchInput = (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <Search className="h-4 w-4 text-slate-400" />
      <input
        aria-label="Search admin modules"
        autoComplete="off"
        className="h-7 w-full bg-transparent text-sm outline-none ring-0 focus:ring-0"
        name="admin-sidebar-module-search"
        onChange={(event) => setModuleSearch(event.target.value)}
        placeholder="Search modules"
        spellCheck={false}
        type="search"
        value={moduleSearch}
      />
    </div>
  );

  const renderSidebar = (mobile = false) => {
    const effectiveCollapsed = mobile ? false : sidebarCollapsed;

    return (
    <aside className={`flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 ${effectiveCollapsed ? 'w-20' : 'w-72'}`}>
      <div className={`flex h-16 items-center border-b border-slate-200 px-4 ${effectiveCollapsed ? 'justify-center' : 'justify-start'}`}>
        <img src="/logo.png" alt="X-Space360" className="h-9 w-auto object-contain" />
      </div>
      <div className={`${effectiveCollapsed ? 'px-2' : 'px-3'} py-3`}>
        {!effectiveCollapsed && searchInput}
        {!mobile && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 lg:flex"
            aria-label={sidebarCollapsed ? 'Open admin tabs' : 'Close admin tabs'}
            title={sidebarCollapsed ? 'Open tabs' : 'Close tabs'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!sidebarCollapsed && <span>Close Tabs</span>}
          </button>
        )}
      </div>
      <nav className={`flex-1 space-y-2 overflow-y-auto ${effectiveCollapsed ? 'px-2' : 'px-3'} pb-5`}>
        {filteredNavigation.map((item) => (
          <NavItem
            key={item.label}
            item={item}
            onNavigate={() => setMobileOpen(false)}
            collapsed={effectiveCollapsed}
            openGroups={visibleOpenGroups}
            onToggleGroup={toggleGroup}
          />
        ))}
        {!filteredNavigation.length && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
            No modules found.
          </div>
        )}
      </nav>
    </aside>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        href="#admin-main-content"
      >
        Skip to admin content
      </a>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{renderSidebar()}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full w-80 max-w-[86vw] bg-white shadow-elevated">
            <button className="absolute right-3 top-3 rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {renderSidebar(true)}
          </div>
        </div>
      )}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-[320px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                aria-label="Search admin modules"
                autoComplete="off"
                className="h-7 w-full bg-transparent text-sm outline-none ring-0 focus:ring-0"
                name="admin-header-module-search"
                onChange={(event) => setModuleSearch(event.target.value)}
                placeholder="Search users, properties, bookings, tickets"
                spellCheck={false}
                type="search"
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
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50" onClick={() => setProfileOpen(true)}>
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
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-terracotta">Admin Profile</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Profile Information</h2>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close admin profile"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-sage text-2xl font-black text-white">
                  {user?.full_name?.[0]?.toUpperCase() || <User className="h-7 w-7" />}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-black text-slate-950">{user?.full_name || 'Admin'}</h3>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-500">{user?.role || 'admin'} Account</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Active
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <ProfileInfo icon={Mail} label="Email Address" value={user?.email || '-'} />
                <ProfileInfo icon={Phone} label="Mobile Number" value={user?.phone || '-'} />
                <ProfileInfo icon={ShieldCheck} label="Access Role" value={user?.role || 'admin'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileInfo = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p>
    </div>
  </div>
);

export default AdminLayout;
