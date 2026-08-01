import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, getImageUrl } from '../services/api';
import { NotificationBell } from '../components/NotificationCenter';
import { formatCategoryLabel, formatDisplayLabel, formatPropertyTypeLabel, formatReadableText } from '../lib/displayLabels';
import { 
  Users, Building2, FileCheck, AlertCircle, CheckCircle, 
  XCircle, Download, FileText, BarChart3, LogOut, Eye, ChevronLeft, ChevronRight, Plus,
  Search, ShieldCheck, Clock, TrendingUp, Briefcase, Layers
} from 'lucide-react';

const rmNavigation = [
  { id: 'overview', label: 'Executive Dashboard', group: 'Control', status: 'Live', icon: BarChart3 },
  { id: 'brokers', label: 'Broker Management', group: 'CRM', status: 'Live', icon: Users },
  { id: 'hosts', label: 'Host Management', group: 'CRM', status: 'Next', icon: Briefcase },
  { id: 'properties', label: 'Property Operations', group: 'Operations', status: 'Next', icon: Building2 },
  { id: 'verifications', label: 'Verification Center', group: 'Operations', status: 'Live', icon: FileCheck },
  { id: 'bookings', label: 'Booking Management', group: 'Operations', status: 'Next', icon: FileText },
  { id: 'tasks', label: 'Tasks & Escalations', group: 'Workflow', status: 'Next', icon: Clock },
  { id: 'analytics', label: 'Analytics & Reports', group: 'Insights', status: 'Live', icon: TrendingUp },
  { id: 'audit', label: 'Audit & Activity', group: 'Compliance', status: 'Live', icon: ShieldCheck },
];

const RMModulePlaceholder = ({ title, description, checkpoints }) => (
  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-premium animate-slide-up">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
      <div>
        <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">Phase 15 RM Module</p>
        <h3 className="text-2xl font-bold tracking-tight text-charcoal">{title}</h3>
        <p className="text-sm text-charcoal-muted mt-2 max-w-3xl">{description}</p>
      </div>
      <span className="inline-flex w-fit items-center rounded-full bg-sand-100 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal-muted">
        Planned
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {checkpoints.map((item) => (
        <div key={item} className="rounded-2xl border border-sand-200 bg-stone/40 p-5">
          <CheckCircle className="w-5 h-5 text-sage mb-4" />
          <p className="text-xs font-bold text-charcoal uppercase tracking-widest">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/employee/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const statCards = stats ? [
    { label: 'Total Assigned Brokers', value: stats.brokers?.total || 0, icon: Users, tone: 'terracotta' },
    { label: 'Active Brokers', value: stats.brokers?.active || 0, icon: CheckCircle, tone: 'sage' },
    { label: 'Inactive Brokers', value: stats.brokers?.inactive || 0, icon: AlertCircle, tone: 'red' },
    { label: 'Total Assigned Hosts', value: stats.hosts?.total || 0, icon: Briefcase, tone: 'charcoal' },
    { label: 'Pending Host Verification', value: stats.hosts?.pending_verification || 0, icon: FileCheck, tone: 'terracotta' },
    { label: 'Total Properties', value: stats.properties?.total || 0, icon: Building2, tone: 'charcoal' },
    { label: 'Live Properties', value: stats.properties?.live || 0, icon: CheckCircle, tone: 'sage' },
    { label: 'Pending Property Verification', value: stats.properties?.pending_verification || stats.verifications?.under_review || 0, icon: FileCheck, tone: 'terracotta' },
    { label: 'Rejected Properties', value: stats.properties?.rejected || 0, icon: XCircle, tone: 'red' },
    { label: 'Draft Properties', value: stats.properties?.draft || 0, icon: Layers, tone: 'charcoal' },
    { label: 'Bookings Today', value: stats.bookings?.today || 0, icon: Clock, tone: 'terracotta' },
    { label: 'Bookings This Month', value: stats.bookings?.this_month || 0, icon: FileText, tone: 'charcoal' },
    { label: 'Upcoming Check-ins', value: stats.bookings?.upcoming_checkins || 0, icon: ChevronRight, tone: 'sage' },
    { label: 'Upcoming Check-outs', value: stats.bookings?.upcoming_checkouts || 0, icon: ChevronLeft, tone: 'terracotta' },
    { label: 'Revenue Generated', value: formatMoney(stats.finance?.revenue_generated), icon: TrendingUp, tone: 'sage' },
    { label: 'Broker Commission Generated', value: formatMoney(stats.finance?.broker_commission_generated), icon: BarChart3, tone: 'charcoal' },
    { label: 'Average Occupancy', value: `${stats.performance?.average_occupancy || 0}%`, icon: BarChart3, tone: 'terracotta' },
    { label: 'Average Property Rating', value: stats.performance?.average_property_rating || 0, icon: CheckCircle, tone: 'sage' },
    { label: 'Pending Escalations', value: stats.performance?.pending_escalations || 0, icon: AlertCircle, tone: 'red' },
    { label: 'SLA Breaches', value: stats.performance?.sla_breaches || 0, icon: ShieldCheck, tone: 'red' },
  ] : [];

  const iconToneClass = {
    terracotta: 'text-terracotta bg-terracotta/10',
    sage: 'text-sage-dark bg-sage/10',
    charcoal: 'text-charcoal bg-stone',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="min-h-screen bg-stone flex">
      <aside className="hidden xl:flex w-72 shrink-0 bg-white border-r border-gray-100 min-h-screen sticky top-0 flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <img src="/logo.png" alt="X-Space360 Logo" className="h-10 w-auto object-contain" />
            <span>
              <span className="block text-sm font-black text-charcoal">X-Space360</span>
              <span className="block text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">RM Control</span>
            </span>
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="rounded-2xl bg-stone border border-sand-200 px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-charcoal-muted" />
            <input
              className="w-full bg-transparent outline-none text-sm text-charcoal placeholder:text-charcoal-muted"
              placeholder="Search RM modules"
              aria-label="Search RM modules"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" data-testid="employee-tabs">
          {Object.entries(rmNavigation.reduce((groups, item) => {
            groups[item.group] = [...(groups[item.group] || []), item];
            return groups;
          }, {})).map(([group, items]) => (
            <div key={group} className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-[0.18em]">{group}</p>
              <div className="space-y-1">
                {items.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-gold text-charcoal shadow-sm'
                        : 'text-charcoal hover:bg-stone'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <tab.icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-bold truncate">{tab.label}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${
                      tab.status === 'Live' ? 'bg-sage/10 text-sage-dark' : 'bg-sand-100 text-charcoal-muted'
                    }`}>
                      {tab.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="header-glass px-4 md:px-8 py-4 sticky top-0 z-40" data-testid="employee-header">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.22em] mb-1">X-Space360 Relationship Management</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal truncate" data-testid="dashboard-title">
                RM Operations Control Center
              </h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationBell />
              <button
                onClick={() => setShowProfileModal(true)}
                className="hidden sm:flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-sage text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                  {user?.profile_image ? (
                    <img src={getImageUrl(user.profile_image)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.full_name?.[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-left">
                  <span className="block text-xs font-bold text-charcoal max-w-40 truncate">{user?.full_name || 'RM User'}</span>
                  <span className="block text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">RM Profile</span>
                </span>
              </button>
              <button
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    logout();
                  }, 50);
                }}
                className="w-10 h-10 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                data-testid="logout-btn"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="xl:hidden px-4 md:px-8 pt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 overflow-x-auto no-scrollbar" data-testid="employee-tabs-mobile">
            <div className="flex gap-2 min-w-max">
              {rmNavigation.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id ? 'bg-charcoal text-white' : 'bg-stone text-charcoal'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="w-full px-4 md:px-8 lg:px-10 py-6 md:py-8 mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5 md:p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
              <div>
                <p className="text-[10px] font-bold text-gold uppercase tracking-[0.22em] mb-2">RM Profile</p>
                <h3 className="text-xl md:text-2xl font-bold text-charcoal">{user?.full_name || 'Relationship Manager'}</h3>
                <p className="text-sm text-charcoal-muted mt-2">Assigned operations ownership across brokers, hosts, properties, verifications, bookings and performance.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['RM ID', user?.user_id || 'N/A'],
                  ['Employee Code', user?.employee_code || user?.uid || 'N/A'],
                  ['Branch', user?.branch || 'N/A'],
                  ['Territory', user?.employee_region || user?.city || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-stone/70 border border-sand-200 px-3 py-3 min-w-0">
                    <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                    <p className="text-xs font-bold text-charcoal mt-1 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div data-testid="overview-section">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-charcoal-light">Loading statistics...</p>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4 mb-8" data-testid="stats-grid">
                  {statCards.map((stat, idx) => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 min-h-[116px]" data-testid={`stat-card-${idx}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconToneClass[stat.tone] || iconToneClass.charcoal}`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">RM</span>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-charcoal mt-4 break-words">{stat.value}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1 leading-snug">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
                    <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-3">Broker Health</p>
                    <div className="space-y-3">
                      {[
                        ['Active', stats.brokers?.active || 0],
                        ['Inactive', stats.brokers?.inactive || 0],
                        ['Assigned Hosts', stats.hosts?.total || 0],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-stone/60 px-4 py-3">
                          <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">{label}</span>
                          <span className="text-sm font-bold text-charcoal">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
                    <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-3">Verification Queue</p>
                    <div className="space-y-3">
                      {[
                        ['Host KYC Pending', stats.hosts?.pending_verification || 0],
                        ['Property Pending', stats.properties?.pending_verification || 0],
                        ['RM Reviews', stats.verifications?.pending_review || 0],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-stone/60 px-4 py-3">
                          <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">{label}</span>
                          <span className="text-sm font-bold text-charcoal">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
                    <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-3">Booking Pulse</p>
                    <div className="space-y-3">
                      {[
                        ['Today', stats.bookings?.today || 0],
                        ['This Month', stats.bookings?.this_month || 0],
                        ['Total Tracked', stats.bookings?.total || 0],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-stone/60 px-4 py-3">
                          <span className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">{label}</span>
                          <span className="text-sm font-bold text-charcoal">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pending Reviews Alert */}
                {stats && stats.verifications.pending_review > 0 && (
                  <div className="dashboard-card bg-yellow-50 border-l-4 border-yellow-500 mb-8" data-testid="pending-alert">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-bold text-charcoal">
                          {stats.verifications.pending_review} Verifications Pending Your Review
                        </p>
                        <p className="text-sm text-charcoal-light">Review broker-submitted verification reports</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('verifications')}
                        className="btn-primary ml-auto"
                      >
                        Review Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="dashboard-card" data-testid="quick-actions">
                  <h3 className="text-xl font-bold text-charcoal mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('verifications')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-review"
                    >
                      <FileCheck className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Review Verifications</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('brokers')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-brokers"
                    >
                      <Users className="w-6 h-6 text-sage" />
                      <span className="font-semibold text-charcoal">View Brokers</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-reports"
                    >
                      <FileText className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Generate Reports</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && <VerificationReviewSection />}

        {/* Brokers Tab */}
        {activeTab === 'brokers' && <BrokersSection />}

          {/* Reports Tab */}
          {(activeTab === 'reports' || activeTab === 'analytics') && <ReportsSection />}

          {activeTab === 'hosts' && (
            <RMHostsSection />
          )}

          {activeTab === 'properties' && (
            <RMPropertiesSection />
          )}

          {activeTab === 'bookings' && (
            <RMBookingsSection />
          )}

          {activeTab === 'tasks' && (
            <RMTasksSection />
          )}

          {activeTab === 'audit' && (
            <RMAuditActivitySection />
          )}

        {showProfileModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-elevated border border-gray-100 animate-scale-up">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal">Profile Details</h3>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Your registered account parameters</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="w-8 h-8 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-all"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="flex items-center space-x-4 mb-6 p-4 bg-stone rounded-2xl">
                <div className="w-14 h-14 rounded-xl bg-terracotta text-white flex items-center justify-center text-xl font-bold">
                  {user?.full_name?.[0]}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-charcoal">{user?.full_name}</h4>
                  <span className="inline-block px-2.5 py-0.5 mt-1 bg-charcoal text-white rounded-full text-[9px] font-bold uppercase tracking-widest">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">User ID</span>
                    <span className="text-xs font-mono font-semibold text-charcoal break-all">{user?.user_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">System UID / Code</span>
                    <span className="text-xs font-semibold text-charcoal break-all">{user?.uid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Email Address</span>
                    <span className="text-xs font-semibold text-charcoal break-all">{user?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Phone Number</span>
                    <span className="text-xs font-semibold text-charcoal break-all">{user?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">City</span>
                    <span className="text-xs font-semibold text-charcoal">{user?.city || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">State</span>
                    <span className="text-xs font-semibold text-charcoal">{user?.state || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Franchise</span>
                    <span className="text-xs font-semibold text-charcoal">{user?.franchise || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Branch</span>
                    <span className="text-xs font-semibold text-charcoal">{user?.branch || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Date of Birth</span>
                    <span className="text-xs font-semibold text-charcoal">{user?.birthdate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">KYC Status</span>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-stone text-charcoal">
                      {user?.kyc_status || 'N/A'}
                    </span>
                  </div>
                  {user?.broker_id && (
                    <div className="col-span-2">
                      <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Assigned Broker ID</span>
                      <span className="text-xs font-mono font-semibold text-charcoal break-all">{user?.broker_id}</span>
                    </div>
                  )}
                  {user?.lg_code && (
                    <div>
                      <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Broker LG Code</span>
                      <span className="text-xs font-semibold text-charcoal">{user?.lg_code}</span>
                    </div>
                  )}
                  {user?.rm_id && (
                    <div className="col-span-2">
                      <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Assigned RM ID</span>
                      <span className="text-xs font-mono font-semibold text-charcoal break-all">{user?.rm_id}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="btn-premium px-8 py-3 shadow-premium text-xs uppercase tracking-widest font-bold"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

// Verification Review Section
const VerificationReviewSection = () => {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyVerifications, setHistoryVerifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');
  const [approveError, setApproveError] = useState('');
  const [approving, setApproving] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchPendingVerifications();
    fetchHistoryVerifications();
  }, []);

  const fetchHistoryVerifications = async () => {
    setLoadingHistory(true);
    try {
      const response = await verificationAPI.listReviewHistory();
      setHistoryVerifications(response.data.verifications || []);
    } catch (error) {
      console.error('Error fetching verification history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenDetails = async (verification) => {
    setSelectedVerification(verification);
    try {
      const response = await verificationAPI.getVerificationDetails(verification.verification_id);
      if (response.data) {
        setSelectedVerification(response.data);
      }
    } catch (error) {
      console.error('Error fetching verification details:', error);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const response = await verificationAPI.listPendingReviews();
      setVerifications(response.data.verifications || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification?.verification_id) return;
    setApproving(true);
    setApproveError('');
    try {
      await verificationAPI.rmApprove(selectedVerification.verification_id, approveRemarks.trim());
      setReviewNotice('Verification approved and forwarded to admin for final approval.');
      fetchPendingVerifications();
      fetchHistoryVerifications();
      setShowApproveModal(false);
      setApproveRemarks('');
      setSelectedVerification(null);
    } catch (error) {
      console.error('Error approving verification:', error);
      const msg = error?.response?.data?.detail || 'Failed to approve verification';
      setApproveError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    try {
      await verificationAPI.rmReject(selectedVerification.verification_id, rejectReason);
      alert('Verification rejected. Host will be notified.');
      setShowRejectReasonModal(false);
      setRejectReason('');
      setSelectedVerification(null);
      fetchPendingVerifications();
      fetchHistoryVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      const msg = error?.response?.data?.detail || 'Failed to reject verification';
      alert(msg);
    }
  };

  const handleExportReport = async (verificationId) => {
    try {
      const response = await verificationAPI.exportVerificationReport(verificationId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `verification_report_${verificationId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export verification report');
    }
  };

  return (
    <div data-testid="verifications-section">
      <div className="dashboard-card mb-6">
        <h3 className="text-2xl font-bold text-charcoal mb-2">Pending Verification Reviews</h3>
        <p className="text-charcoal-light">Remote review of broker-submitted verification reports</p>
      </div>

      {reviewNotice && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm font-bold flex items-center justify-between">
          <span>{reviewNotice}</span>
          <button
            type="button"
            onClick={() => setReviewNotice('')}
            className="text-green-700/70 hover:text-green-900 font-bold tracking-tight"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading verifications...</p>
        </div>
      ) : verifications.length > 0 ? (
        <div data-testid="verifications-list">
          <div className="space-y-4">
            {[...verifications]
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((verification) => (
              <div key={verification.verification_id} className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden hover:border-terracotta/40 transition-all" data-testid={`verification-${verification.verification_id}`}>
                <div className="p-5 grid grid-cols-1 xl:grid-cols-[1fr_1.35fr_auto] gap-5 items-start">
                  <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 w-full min-w-0">
                    {verification.property_details && (
                      <img
                        src={getImageUrl(verification.property_details.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={verification.property_details.title}
                        className="w-full sm:w-28 h-36 sm:h-28 rounded-2xl object-cover border border-gray-100 bg-stone"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-2">
                        Pending RM Review
                      </span>
                      <h4 className="font-bold text-charcoal text-lg leading-tight">
                        {verification.property_details?.title || 'Property'}
                      </h4>
                      <p className="text-xs text-charcoal-muted font-mono mt-1">
                        Property ID: {verification.property_id}
                      </p>
                      <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest mt-2">
                        {verification.property_details?.city} | {verification.property_details?.bhk_type}
                      </p>
                      <p className="text-xs text-charcoal-muted mt-2 break-words">
                        Broker: {verification.broker_details?.full_name} ({verification.broker_details?.lg_code})
                      </p>
                      
                      {/* Checklist Summary */}
                      <div className="mt-3 flex flex-wrap gap-2 xl:hidden">
                        {Object.entries(verification.checklist || {}).map(([key, value]) => (
                          <div key={key} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${value ? 'bg-sage/10 border-sage/20 text-sage-dark' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {value ? (
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span>{formatDisplayLabel(key)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Geo-tagged Photos Count */}
                      {verification.geo_tagged_photos && verification.geo_tagged_photos.length > 0 && (
                        <p className="text-xs font-bold text-sage-dark mt-3">
                          📸 {verification.geo_tagged_photos.length} geo-tagged photos
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="hidden xl:block">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(verification.checklist || {}).map(([key, value]) => (
                        <div key={key} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${value ? 'bg-sage/10 border-sage/20 text-sage-dark' : 'bg-red-50 border-red-100 text-red-600'}`}>
                          {value ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="truncate">{formatDisplayLabel(key)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex xl:flex-col items-stretch gap-2 w-full xl:w-36">
                    <button
                      onClick={() => handleOpenDetails(verification)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-charcoal text-white rounded-xl hover:bg-terracotta transition font-bold text-xs uppercase tracking-widest"
                      data-testid={`view-details-${verification.verification_id}`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
          {verifications.length > itemsPerPage && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-charcoal">
                Page {currentPage} of {Math.ceil(verifications.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(verifications.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(verifications.length / itemsPerPage)}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <FileCheck className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No verifications pending review</p>
        </div>
      )}

      {/* Verification History Section */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="dashboard-card mb-6">
          <h3 className="text-2xl font-bold text-charcoal mb-2">Reviewed & Resolved Verifications</h3>
          <p className="text-charcoal-light">History of all verification reports approved or rejected</p>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8">
            <p className="text-charcoal-light">Loading history...</p>
          </div>
        ) : historyVerifications.length > 0 ? (
          <div className="space-y-4" data-testid="verification-history-list">
            {historyVerifications.map((verification) => (
              <div key={verification.verification_id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:border-sand-300 transition" data-testid={`history-${verification.verification_id}`}>
                <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 w-full min-w-0">
                    {verification.property_details && (
                      <img
                        src={getImageUrl(verification.property_details.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={verification.property_details.title}
                        className="w-full sm:w-20 h-28 sm:h-20 rounded-2xl object-cover border border-gray-100 bg-stone"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-charcoal text-base leading-tight">
                          {verification.property_details?.title || 'Property'}
                        </h4>
                        <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${
                          verification.status === 'approved' || verification.rm_approved === true ? 'bg-green-100 text-green-800' :
                          verification.status === 'rejected' || verification.rm_approved === false ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {verification.status}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-muted font-mono mt-1">
                        Property ID: {verification.property_id}
                      </p>
                      <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest mt-1">
                        {verification.property_details?.city || 'No city'} | {formatDisplayLabel(verification.property_details?.bhk_type) || 'No type'}
                      </p>
                      <p className="text-xs text-charcoal-muted mt-2">
                        Broker: {verification.broker_details?.full_name} ({verification.broker_details?.lg_code})
                      </p>
                      
                      {verification.rm_remarks && (
                        <p className="text-xs text-charcoal-muted italic mt-2">
                          RM Remarks: "{verification.rm_remarks}"
                        </p>
                      )}
                      {verification.admin_remarks && (
                        <p className="text-xs text-red-700 italic mt-1 font-semibold">
                          Admin Remarks: "{verification.admin_remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <button
                      onClick={() => handleOpenDetails(verification)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-charcoal text-white rounded-xl hover:bg-terracotta transition font-bold text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => handleExportReport(verification.verification_id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-stone text-charcoal-muted hover:text-charcoal rounded-xl transition font-bold text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-card text-center py-8 bg-stone/50">
            <p className="text-charcoal-light">No verification history found</p>
          </div>
        )}
      </div>

      {/* Verification Details Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-premium animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal">Verification Report</h3>
                <p className="text-charcoal-light">
                  {selectedVerification.property_details?.title} | {selectedVerification.property_details?.city}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportReport(selectedVerification.verification_id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 text-charcoal-light hover:text-terracotta rounded-xl transition font-bold text-xs"
                  title="Export Professional Report"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
                <button 
                  onClick={() => setSelectedVerification(null)}
                  className="p-2 hover:bg-gray-50 rounded-full transition"
                >
                  <XCircle className="w-6 h-6 text-charcoal-muted" />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Property Details</p>
                  <p className="font-mono text-xs font-bold text-charcoal break-all" title={selectedVerification.property_id || ''}>
                    ID: {selectedVerification.property_id || 'N/A'}
                  </p>
                  <p className="font-mono text-[10px] text-charcoal-light mt-1 break-all" title={selectedVerification.owner_id || ''}>
                    Host: {selectedVerification.owner_id || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Assigned Broker</p>
                  <p className="font-bold text-charcoal">{selectedVerification.broker_details?.full_name || 'N/A'}</p>
                  <p className="font-mono text-[10px] text-charcoal-light mt-1 break-all" title={selectedVerification.broker_id || ''}>
                    ID: {selectedVerification.broker_id || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Visit Date</p>
                  <p className="font-bold text-charcoal">
                    {new Date(selectedVerification.completed_at || selectedVerification.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Property Details Info Section */}
              {selectedVerification.property_details && (
                <div className="p-6 bg-stone/50 rounded-2xl border border-gray-100/60 space-y-4">
                  <h4 className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest border-b border-gray-100 pb-2">
                    Property Specifications & Listing Info
                  </h4>
                  
                  {/* Property Images Gallery */}
                  {selectedVerification.property_details.images && selectedVerification.property_details.images.length > 0 && (
                    <div className="w-full">
                      <div className="flex space-x-3 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-sand-300">
                        {selectedVerification.property_details.images.map((img, i) => {
                          const pureUrl = img.split('#')[0];
                          return (
                            <img
                              key={i}
                              src={getImageUrl(pureUrl)}
                              alt={`Property View ${i + 1}`}
                              className="w-48 h-32 object-cover rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-subtle hover:scale-[1.02] transition-all duration-300 cursor-pointer shrink-0"
                              onClick={() => window.open(getImageUrl(pureUrl), '_blank')}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Property Type</p>
                      <p className="font-bold text-charcoal">
                        {formatPropertyTypeLabel(selectedVerification.property_details.property_type) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Category</p>
                      <p className="font-bold text-charcoal">
                        {formatCategoryLabel(selectedVerification.property_details.category) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">BHK / Config</p>
                      <p className="font-bold text-charcoal">
                        {formatDisplayLabel(selectedVerification.property_details.bhk_type) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Area (Sqft)</p>
                      <p className="font-bold text-charcoal">
                        {selectedVerification.property_details.area_sqft ? `${selectedVerification.property_details.area_sqft} sqft` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Price / Pricing Cycle</p>
                      <p className="font-bold text-terracotta">
                        {selectedVerification.property_details.price_per_night !== undefined 
                          ? `₹${selectedVerification.property_details.price_per_night} / ${selectedVerification.property_details.pricing_cycle || 'night'}` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Location Status</p>
                      <p className="font-bold text-charcoal truncate" title={`${selectedVerification.property_details.address}, ${selectedVerification.property_details.city}`}>
                        {selectedVerification.property_details.city || 'N/A'}
                      </p>
                    </div>
                    {selectedVerification.property_details.category === 'event_venue' && (
                      <>
                        <div>
                          <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Veg Plate Price</p>
                          <p className="font-bold text-charcoal">
                            {selectedVerification.property_details.veg_price ? `₹${selectedVerification.property_details.veg_price}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Non-Veg Plate Price</p>
                          <p className="font-bold text-charcoal">
                            {selectedVerification.property_details.non_veg_price ? `₹${selectedVerification.property_details.non_veg_price}` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Max Guest Size</p>
                          <p className="font-bold text-charcoal">
                            {selectedVerification.property_details.guest_size || 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Detailed Description */}
                  {selectedVerification.property_details.description && (
                    <div className="pt-2">
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider mb-1">Description</p>
                      <p className="text-xs text-charcoal-light leading-relaxed">
                        {formatReadableText(selectedVerification.property_details.description)}
                      </p>
                    </div>
                  )}

                  {/* Full Address */}
                  {selectedVerification.property_details.address && (
                    <div className="pt-2">
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider mb-1">Full Address</p>
                      <p className="text-xs text-charcoal-light leading-relaxed">
                        {selectedVerification.property_details.address}, {selectedVerification.property_details.city}, {selectedVerification.property_details.state} - {selectedVerification.property_details.pin_code}
                      </p>
                    </div>
                  )}

                  {/* Amenities */}
                  {selectedVerification.property_details.amenities && selectedVerification.property_details.amenities.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedVerification.property_details.amenities.map((amenity, i) => (
                          <span key={i} className="px-2 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-semibold text-charcoal capitalize">
                            {formatDisplayLabel(amenity)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist */}
              <div>
                <h4 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest mb-4">Verification Checklist Audit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedVerification.checklist || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-subtle transition">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-charcoal">{formatDisplayLabel(key)}</span>
                        {value ? (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-[8px] font-bold tracking-tight uppercase">Broker Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-red-600">
                            <XCircle className="w-3 h-3" />
                            <span className="text-[8px] font-bold tracking-tight uppercase">Broker Failed</span>
                          </div>
                        )}
                      </div>
                      
                      {!selectedVerification.rm_reviewed && selectedVerification.status !== 'approved' && selectedVerification.status !== 'rejected' && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setReviewNotice(`${formatDisplayLabel(key)} marked as approved for this review.`);
                            }}
                            className="flex-1 py-2 bg-green-50 text-green-700 text-[10px] font-bold tracking-tight uppercase tracking-wider rounded-xl hover:bg-green-100 transition flex items-center justify-center space-x-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button 
                            onClick={() => {
                              setRejectReason(`Rejected Point: ${formatDisplayLabel(key).toUpperCase()} - `);
                              setShowRejectReasonModal(true);
                            }}
                            className="flex-1 py-2 bg-red-50 text-red-700 text-[10px] font-bold tracking-tight uppercase tracking-wider rounded-xl hover:bg-red-100 transition flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Broker Remarks */}
              {selectedVerification.broker_remarks && (
                <div className="p-6 bg-terracotta/5 rounded-2xl border border-terracotta/10">
                  <h4 className="text-sm font-bold tracking-tight text-terracotta uppercase tracking-widest mb-2">Broker Remarks</h4>
                  <p className="text-charcoal leading-relaxed italic">"{selectedVerification.broker_remarks}"</p>
                </div>
              )}

              {/* Geo-tagged Photos */}
              {selectedVerification.geo_tagged_photos && selectedVerification.geo_tagged_photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest mb-4">
                    Geo-tagged Evidence ({selectedVerification.geo_tagged_photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedVerification.geo_tagged_photos.map((photo, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => window.open(getImageUrl(photo.photo_url || photo.url), '_blank')}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 cursor-pointer hover:ring-4 hover:ring-terracotta/20 transition"
                      >
                        <img 
                          src={getImageUrl(photo.photo_url || photo.url)} 
                          alt="Evidence" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center p-2 text-center">
                          <p className="text-[8px] text-white font-mono break-all">Lat: {photo.latitude || photo.lat}</p>
                          <p className="text-[8px] text-white font-mono break-all">Lng: {photo.longitude || photo.lng}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Link */}
              {selectedVerification.video_url && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <h4 className="text-sm font-bold tracking-tight text-blue-800 uppercase tracking-widest mb-2">Property Video Tour</h4>
                  <a 
                    href={selectedVerification.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 font-bold hover:underline flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Watch Video Walkthrough</span>
                  </a>
                </div>
              )}
            </div>

             {/* Actions */}
            {!selectedVerification.rm_reviewed && selectedVerification.status !== 'approved' && selectedVerification.status !== 'rejected' && (
              <div className="flex space-x-4 mt-8 pt-8 border-t border-gray-100">
                <button 
                  onClick={() => setShowRejectReasonModal(true)}
                  className="flex-1 py-4 bg-red-50 text-red-600 font-bold tracking-tight uppercase tracking-widest rounded-2xl hover:bg-red-100 transition flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject Report</span>
                </button>
                <button 
                  onClick={() => {
                    setApproveRemarks('');
                    setApproveError('');
                    setShowApproveModal(true);
                  }}
                  className="flex-1 py-4 bg-green-600 text-white font-bold tracking-tight uppercase tracking-widest rounded-2xl hover:bg-green-700 shadow-premium shadow-green-200 transition flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Approve Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Approval Remarks Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-elevated animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-charcoal">Approve Report</h3>
              <p className="text-charcoal-light text-sm mt-1">
                Add optional RM remarks before forwarding this verification to admin.
              </p>
            </div>

            <textarea
              className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-green-500 outline-none transition min-h-[120px] text-charcoal font-medium"
              placeholder="Add remarks, if applicable..."
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
            />

            {approveError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-bold">
                {approveError}
              </div>
            )}

            <div className="flex space-x-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  if (approving) return;
                  setShowApproveModal(false);
                  setApproveRemarks('');
                  setApproveError('');
                }}
                className="flex-1 py-4 font-bold text-charcoal-muted hover:text-charcoal transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 py-4 bg-green-600 text-white font-bold tracking-tight uppercase tracking-widest rounded-2xl hover:bg-green-700 shadow-premium shadow-green-200 transition disabled:opacity-60"
              >
                {approving ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-elevated animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-charcoal">Rejection Reason</h3>
              <p className="text-charcoal-light text-sm mt-1">Please provide a detailed reason for rejecting this verification report.</p>
            </div>
            
            <textarea
              className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-red-500 outline-none transition min-h-[120px] text-charcoal font-medium"
              placeholder="e.g. Geo-tagged photos do not match property location..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            
            <div className="flex space-x-3 mt-8">
              <button 
                onClick={() => {
                  setShowRejectReasonModal(false);
                  setRejectReason('');
                }}
                className="flex-1 py-4 font-bold text-charcoal-muted hover:text-charcoal transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                className="flex-1 py-4 bg-red-600 text-white font-bold tracking-tight uppercase tracking-widest rounded-2xl hover:bg-red-700 shadow-premium shadow-red-200 transition"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Brokers Section
const BrokersSection = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrokerForOwners, setSelectedBrokerForOwners] = useState(null);
  const [brokerOwners, setBrokerOwners] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedBrokerForProperties, setSelectedBrokerForProperties] = useState(null);
  const [brokerProperties, setBrokerProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [brokerPortfolioSummary, setBrokerPortfolioSummary] = useState({});

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'No activity';

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const response = await apiClient.get('/employee/brokers');
      setBrokers(response.data.brokers || []);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowOwners = async (broker) => {
    setSelectedBrokerForOwners(broker);
    setLoadingOwners(true);
    try {
      const response = await apiClient.get(`/employee/brokers/${broker.user_id}/portfolio`);
      setBrokerOwners(response.data.owners || []);
    } catch (error) {
      console.error('Error fetching broker owners:', error);
      setBrokerOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleShowProperties = async (broker) => {
    setSelectedBrokerForProperties(broker);
    setLoadingProperties(true);
    try {
      const response = await apiClient.get(`/employee/brokers/${broker.user_id}/portfolio`);
      setBrokerProperties(response.data.properties || []);
      setBrokerPortfolioSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching broker properties:', error);
      setBrokerProperties([]);
      setBrokerPortfolioSummary({});
    } finally {
      setLoadingProperties(false);
    }
  };

  return (
    <div data-testid="brokers-section">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-6 mb-6">
        <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Broker CRM</p>
        <h3 className="text-2xl font-bold text-charcoal mb-2">Broker Management</h3>
        <p className="text-charcoal-muted text-sm">Monitor assigned brokers with host, property, booking, revenue, commission and escalation performance.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading brokers...</p>
        </div>
      ) : brokers.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5" data-testid="brokers-list">
          {brokers.map((broker) => (
            <div key={broker.user_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300" data-testid={`broker-${broker.user_id}`}>
              <div className="flex items-start space-x-4">
                <img
                  src={getImageUrl(broker.profile_image) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'}
                  alt={broker.full_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-charcoal text-lg truncate">{broker.full_name}</h4>
                      <p className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest mt-1">Broker ID: {broker.user_id}</p>
                      <p className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest">LG Code: {broker.lg_code || 'N/A'}</p>
                      <p className="text-xs text-charcoal-muted mt-1">{broker.phone || 'No mobile'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${broker.is_active === false ? 'bg-red-50 text-red-600' : 'bg-sage/10 text-sage-dark'}`}>
                      {broker.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  
                  {broker.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                      <div 
                        onClick={() => handleShowOwners(broker)}
                        className="text-left p-3 bg-stone rounded-2xl hover:bg-gray-50 hover:shadow-sm cursor-pointer transition-all duration-300 border border-transparent hover:border-terracotta/20"
                        title="Click to view assigned Hosts"
                      >
                        <p className="text-lg font-bold text-terracotta">{broker.stats.hosts || broker.stats.owners}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Hosts</p>
                      </div>
                      <div 
                        onClick={() => handleShowProperties(broker)}
                        className="text-left p-3 bg-stone rounded-2xl hover:bg-gray-50 hover:shadow-sm cursor-pointer transition-all duration-300 border border-transparent hover:border-sage/20"
                        title="Click to view Broker's Property Portfolio"
                      >
                        <p className="text-lg font-bold text-sage">{broker.stats.properties}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Properties</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-lg font-bold text-charcoal">{broker.stats.bookings || 0}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Bookings</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-lg font-bold text-terracotta">{broker.stats.pending_verifications || 0}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Pending</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-sm font-bold text-charcoal break-words">{formatMoney(broker.stats.revenue_generated)}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Revenue</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-sm font-bold text-charcoal break-words">{formatMoney(broker.stats.commission_earned)}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Commission</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-lg font-bold text-red-600">{broker.stats.pending_escalations || 0}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Escalations</p>
                      </div>
                      <div className="text-left p-3 bg-stone rounded-2xl">
                        <p className="text-lg font-bold text-sage">{broker.stats.performance_rating || 0}</p>
                        <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Rating</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">
                      Last Activity: {formatDateTime(broker.stats?.last_activity?.created_at)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleShowProperties(broker)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-terracotta transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Users className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No brokers found</p>
        </div>
      )}

      {/* Assigned Hosts Details Modal */}
      {selectedBrokerForOwners && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-premium animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal">Assigned Hosts</h3>
                <p className="text-charcoal-light text-xs font-bold uppercase tracking-widest mt-1">
                  Portfolio of Broker: {selectedBrokerForOwners.full_name} ({selectedBrokerForOwners.lg_code || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedBrokerForOwners(null);
                  setBrokerOwners([]);
                }}
                className="p-2 hover:bg-gray-50 rounded-full transition"
              >
                <XCircle className="w-6 h-6 text-charcoal-muted" />
              </button>
            </div>

            {loadingOwners ? (
              <div className="text-center py-12">
                <p className="text-charcoal-light font-bold">Fetching host network...</p>
              </div>
            ) : brokerOwners.length > 0 ? (
              <div className="space-y-4">
                {brokerOwners.map((owner) => (
                  <div key={owner.user_id} className="p-6 bg-stone rounded-2xl border border-gray-100 hover:border-terracotta transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <img
                        src={owner.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                        alt={owner.full_name}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-charcoal text-lg truncate">{owner.full_name}</h4>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-tight uppercase tracking-widest ${
                            owner.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                            owner.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            KYC: {owner.kyc_status || 'pending'}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-light font-medium mt-1">{owner.email}</p>
                        <p className="text-xs text-charcoal-light font-medium">{owner.phone}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">City / Location</p>
                            <p className="text-xs font-bold text-charcoal mt-0.5">{owner.city || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Reg. Fee Payment</p>
                            <span className={`inline-block text-[9px] font-bold tracking-tight uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 ${
                              owner.registration_fee_paid ? 'bg-sage/20 text-sage-dark' : 'bg-red-50 text-red-600'
                            }`}>
                              {owner.registration_fee_paid ? 'PAID' : 'UNPAID'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 text-[10px] text-charcoal-muted font-bold">
                          📅 Registered on: {new Date(owner.created_at || owner.timestamp || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone rounded-2xl border-2 border-dashed border-gray-100">
                <Users className="w-12 h-12 text-charcoal-light mx-auto mb-3" />
                <p className="text-charcoal-light font-bold">No Hosts assigned to this broker yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broker's Property Portfolio Modal */}
      {selectedBrokerForProperties && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-premium animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal">Property Portfolio</h3>
                <p className="text-charcoal-light text-xs font-bold uppercase tracking-widest mt-1">
                  Properties of Broker: {selectedBrokerForProperties.full_name} ({selectedBrokerForProperties.lg_code || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedBrokerForProperties(null);
                  setBrokerProperties([]);
                }}
                className="p-2 hover:bg-gray-50 rounded-full transition"
              >
                <XCircle className="w-6 h-6 text-charcoal-muted" />
              </button>
            </div>

            {loadingProperties ? (
              <div className="text-center py-12">
                <p className="text-charcoal-light font-bold">Fetching property portfolio...</p>
              </div>
            ) : brokerProperties.length > 0 ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Hosts', brokerPortfolioSummary.hosts || 0],
                    ['Live Props', brokerPortfolioSummary.live_properties || 0],
                    ['Bookings', brokerPortfolioSummary.bookings || 0],
                    ['Revenue', formatMoney(brokerPortfolioSummary.revenue_generated)],
                    ['Commission', formatMoney(brokerPortfolioSummary.commission_earned)],
                    ['Pending Verify', brokerPortfolioSummary.pending_verifications || 0],
                    ['Escalations', brokerPortfolioSummary.pending_escalations || 0],
                    ['Pending Props', brokerPortfolioSummary.pending_properties || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-stone border border-sand-200 px-3 py-3">
                      <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                      <p className="text-sm font-bold text-charcoal mt-1 break-words">{value}</p>
                    </div>
                  ))}
                </div>
                {brokerProperties.map((property) => (
                  <div key={property.property_id} className="p-6 bg-stone rounded-2xl border border-gray-100 hover:border-sage transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <img
                        src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={property.title}
                        className="w-24 h-24 rounded-2xl object-cover border border-gray-100 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-charcoal text-lg truncate">{property.title}</h4>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-tight uppercase tracking-widest ${
                            property.status === 'live' ? 'bg-green-100 text-green-800' :
                            property.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            property.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Status: {property.status?.replace('_', ' ') || 'pending'}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-light font-medium mt-1">{property.city}, {property.state}</p>
                        <p className="text-xs text-charcoal-muted font-mono mt-1">Property ID: {property.property_id}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">Category</p>
                            <p className="text-xs font-bold text-charcoal mt-0.5">{formatCategoryLabel(property.category) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold tracking-tight text-charcoal-muted uppercase tracking-wider">BHK Type</p>
                            <p className="text-xs font-bold text-charcoal mt-0.5">{formatDisplayLabel(property.bhk_type) || 'N/A'}</p>
                          </div>
                        </div>

                        {property.status === 'rejected' && property.verification_remarks && (
                          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-700">
                            <span className="font-bold">Rejection Reason: </span>
                            {property.verification_remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone rounded-2xl border-2 border-dashed border-gray-100">
                <Building2 className="w-12 h-12 text-charcoal-light mx-auto mb-3" />
                <p className="text-charcoal-light font-bold">No properties assigned to this broker yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RMDetailRow = ({ title, meta }) => (
  <div className="rounded-2xl bg-stone/60 border border-sand-200 px-4 py-3">
    <p className="text-sm font-bold text-charcoal break-words">{title}</p>
    <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1 break-words">{meta}</p>
  </div>
);

const buildRMHostVerificationStages = (host, properties, verifications, payments = []) => {
  const docs = Array.isArray(host.kyc_documents) ? host.kyc_documents : [];
  const hasRejectedDocs = docs.some((doc) => doc.status === 'rejected');
  const hasPendingDocs = docs.some((doc) => !doc.status || doc.status === 'pending');
  const latestVerification = verifications[0] || {};
  const hasProperties = properties.length > 0;
  const hasBrokerSubmitted = latestVerification.status === 'completed' || Boolean(latestVerification.completed_at);
  const rmReviewed = Boolean(latestVerification.rm_reviewed);
  const rmRejected = rmReviewed && latestVerification.rm_approved === false;
  const rmApproved = rmReviewed && latestVerification.rm_approved === true;
  const adminReviewed = Boolean(latestVerification.admin_reviewed);
  const adminRejected = adminReviewed && latestVerification.admin_approved === false;
  const adminApproved = adminReviewed && latestVerification.admin_approved === true;
  const liveCount = properties.filter((property) => property.status === 'live').length;

  const slaText = (dateValue, hours = 48) => {
    if (!dateValue) return 'SLA not started';
    const started = new Date(dateValue);
    if (Number.isNaN(started.getTime())) return 'SLA not available';
    const due = new Date(started.getTime() + hours * 60 * 60 * 1000);
    const diffHours = Math.round((due.getTime() - Date.now()) / (60 * 60 * 1000));
    if (diffHours < 0) return `SLA breached ${Math.abs(diffHours)}h ago`;
    return `SLA remaining ${diffHours}h`;
  };

  return [
    {
      label: 'Host Registration',
      status: host.user_id ? 'completed' : 'pending',
      meta: host.created_at ? `Registered ${new Date(host.created_at).toLocaleDateString('en-IN')}` : 'Profile pending',
    },
    {
      label: 'KYC Uploaded',
      status: hasRejectedDocs ? 're-upload required' : docs.length ? 'completed' : 'pending',
      meta: docs.length ? `${docs.length} documents uploaded` : 'Waiting for KYC documents',
    },
    {
      label: 'Document Verification',
      status: hasRejectedDocs ? 'rejected' : host.kyc_status === 'approved' ? 'completed' : hasPendingDocs ? 'pending' : 'waiting',
      meta: host.kyc_status || 'Not started',
    },
    {
      label: 'Broker Verification',
      status: hasBrokerSubmitted ? 'completed' : hasProperties ? 'pending' : 'waiting',
      meta: latestVerification.property_id ? `Property ${latestVerification.property_id} | ${slaText(latestVerification.created_at, 24)}` : 'No property verification yet',
    },
    {
      label: 'RM Verification',
      status: rmRejected ? 'rejected' : rmApproved ? 'completed' : hasBrokerSubmitted ? 'pending' : 'waiting',
      meta: latestVerification.rm_id || host.rm_id || 'RM not assigned',
    },
    {
      label: 'Finance Approval',
      status: payments.length > 0 ? 'completed' : rmApproved ? 'pending' : 'waiting',
      meta: payments.length ? `${payments.length} payment records` : 'Payment ledger pending',
    },
    {
      label: 'Admin Approval',
      status: adminRejected ? 'rejected' : adminApproved ? 'completed' : rmApproved ? 'pending' : 'waiting',
      meta: latestVerification.admin_id || host.admin_id || 'Admin review pending',
    },
    {
      label: 'Property Live',
      status: liveCount ? 'completed' : adminApproved ? 'pending' : 'waiting',
      meta: liveCount ? `${liveCount} live properties` : 'No live property yet',
    },
  ];
};

const RMVerificationTracker = ({ stages }) => {
  const statusStyles = {
    completed: 'bg-sage/10 text-sage-dark border-sage/20',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    're-upload required': 'bg-red-50 text-red-600 border-red-100',
    waiting: 'bg-stone text-charcoal-muted border-sand-200',
    escalated: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest">Host Verification Tracker</h4>
          <p className="text-xs text-charcoal-muted mt-1">Stage-wise status from host registration to live property readiness.</p>
        </div>
        <FileCheck className="w-5 h-5 text-terracotta" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="rounded-2xl border border-sand-200 bg-stone/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Stage {String(index + 1).padStart(2, '0')}</p>
                <p className="text-sm font-bold text-charcoal mt-1">{stage.label}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${statusStyles[stage.status] || statusStyles.waiting}`}>
                {stage.status}
              </span>
            </div>
            <p className="text-[10px] text-charcoal-muted font-bold uppercase tracking-widest mt-4 break-words">{stage.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RMDocumentReviewPanel = ({ host, docs, formatDate }) => {
  const requiredTypes = [
    ['aadhar', 'Aadhaar'],
    ['pan', 'PAN'],
    ['cancelled_cheque', 'Cancelled Cheque'],
    ['ownership_documents', 'Ownership Documents'],
    ['property_tax', 'Property Tax'],
    ['water_tax', 'Water Tax'],
    ['electricity_bill', 'Electricity Bill'],
    ['society_noc', 'Society NOC'],
    ['gst', 'GST'],
    ['shop_act', 'Shop Act'],
    ['agreement', 'Agreement'],
  ];

  const allDocs = [
    ...docs,
    ...(host.agreement_signature ? [{
      document_type: 'agreement',
      document_url: host.agreement_signature,
      uploaded_at: host.agreement_signed_at,
      uploaded_by: host.full_name,
      status: host.kyc_status === 'approved' ? 'approved' : 'pending',
      version: host.verification_terms_version || 'v1',
    }] : []),
  ];

  const findDoc = (key) => allDocs.find((doc) => {
    const type = String(doc.document_type || doc.type || '').toLowerCase();
    return type === key || type.includes(key.replace('_', ' ')) || type.includes(key);
  });

  const statusClass = (status) => {
    if (status === 'approved' || status === 'verified') return 'bg-sage/10 text-sage-dark border-sage/20';
    if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-100';
    if (status === 'expired') return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest">Document Verification Review</h4>
          <p className="text-xs text-charcoal-muted mt-1">Preview, download and review host document readiness.</p>
        </div>
        <FileText className="w-5 h-5 text-terracotta" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
        {requiredTypes.map(([key, label]) => {
          const doc = findDoc(key);
          const url = doc?.document_url || doc?.url || doc?.file_url;
          const status = doc?.status || (doc ? 'pending' : 'missing');
          const remarks = doc?.remarks || doc?.rejection_reason || doc?.review_remarks || 'No remarks';
          const version = doc?.version || doc?.document_version || 'v1';
          return (
            <div key={key} className="rounded-2xl border border-sand-200 bg-stone/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-charcoal">{label}</p>
                  <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Version: {version}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${statusClass(status)}`}>
                  {status}
                </span>
              </div>
              <div className="space-y-2 text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">
                <p>Uploaded: {formatDate(doc?.uploaded_at)}</p>
                <p>Verified By: {doc?.verified_by || 'Pending RM/Admin review'}</p>
                <p>Expiry: {formatDate(doc?.expiry_date)}</p>
                <p className="normal-case tracking-normal text-xs font-semibold text-charcoal-muted">Remarks: {remarks}</p>
              </div>
              <div className="flex gap-2 mt-4">
                {url ? (
                  <>
                    <a
                      href={getImageUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-charcoal px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-terracotta transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </a>
                    <a
                      href={getImageUrl(url)}
                      download
                      className="inline-flex items-center justify-center rounded-xl bg-stone border border-sand-200 px-3 py-2 text-charcoal hover:border-terracotta transition"
                      title="Download document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <span className="w-full rounded-xl bg-red-50 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-red-600">Missing</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RMHostsSection = () => {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostDetails, setSelectedHostDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employee/hosts');
      setHosts(response.data.hosts || []);
    } catch (error) {
      console.error('Error fetching RM hosts:', error);
      setHosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';

  const openHostDetails = async (host, focus = 'properties') => {
    setSelectedHostDetails({ host, focus, loading: true });
    setDetailsLoading(true);
    try {
      const response = await apiClient.get(`/employee/hosts/${host.user_id}/details`);
      setSelectedHostDetails({ ...response.data, focus });
    } catch (error) {
      console.error('Error fetching RM host details:', error);
      setSelectedHostDetails({ host, focus, error: true });
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div data-testid="rm-hosts-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Host CRM</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Host Management</h3>
          <p className="text-sm text-charcoal-muted mt-2">All hosts under assigned brokers with KYC, property, booking and revenue ownership.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          {[
            ['Hosts', hosts.length],
            ['Live Props', hosts.reduce((sum, host) => sum + Number(host.live_properties || 0), 0)],
            ['Bookings', hosts.reduce((sum, host) => sum + Number(host.total_bookings || 0), 0)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
              <p className="text-xl font-bold text-charcoal">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : hosts.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {hosts.map((host) => (
            <div key={host.user_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300">
              <div className="flex items-start gap-4">
                <img
                  src={getImageUrl(host.profile_image) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                  alt={host.full_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-charcoal truncate">{host.full_name}</h4>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Host ID: {host.user_id}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">Broker: {host.broker_name || 'Not assigned'}</p>
                      <p className="text-xs text-charcoal-muted mt-1">{host.email || 'No email'} | {host.phone || 'No mobile'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${
                      host.kyc_status === 'approved' ? 'bg-sage/10 text-sage-dark' : host.kyc_status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      KYC: {host.kyc_status || 'pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {[
                      ['Total Properties', host.total_properties || 0, 'properties'],
                      ['Live Properties', host.live_properties || 0, 'live_properties'],
                      ['Pending Properties', host.pending_properties || 0, 'pending_properties'],
                      ['Bookings', host.total_bookings || 0, 'bookings'],
                      ['Revenue', formatMoney(host.revenue_generated), 'payments'],
                      ['Broker LG', host.broker_lg_code || 'N/A', 'profile'],
                      ['Verification', host.verification_status || 'pending', 'verifications'],
                      ['City', host.city || 'N/A', 'profile'],
                    ].map(([label, value, focus]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => openHostDetails(host, focus)}
                        className="rounded-2xl bg-stone/60 border border-sand-200 px-3 py-3 text-left hover:border-terracotta hover:bg-terracotta/5 focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition-all min-h-[70px]"
                      >
                        <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest leading-tight">{label}</p>
                        <p className="text-sm font-bold text-charcoal mt-1 break-words">{value}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">Registered: {formatDate(host.created_at || host.timestamp)}</p>
                    <button
                      type="button"
                      onClick={() => openHostDetails(host, 'profile')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-terracotta transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <Briefcase className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">No hosts found under assigned brokers</p>
        </div>
      )}

      {selectedHostDetails && (
        <RMHostDetailsModal
          data={selectedHostDetails}
          loading={detailsLoading}
          formatMoney={formatMoney}
          formatDate={formatDate}
          onClose={() => setSelectedHostDetails(null)}
        />
      )}
    </div>
  );
};

const RMHostDetailsModal = ({ data, loading, formatMoney, formatDate, onClose }) => {
  const [activeView, setActiveView] = useState(data?.focus || 'profile');
  const host = data?.host || data?.owner || {};
  const broker = data?.broker || {};
  const properties = data?.properties || [];
  const bookings = data?.bookings || [];
  const payments = data?.payments || [];
  const verifications = data?.verifications || [];
  const auditEvents = data?.audit_events || [];
  const docs = Array.isArray(host.kyc_documents) ? host.kyc_documents : [];
  const trackerStages = buildRMHostVerificationStages(host, properties, verifications, payments);
  const pendingProperties = properties.filter((property) => ['draft', 'pending', 'pending_verification', 'under_review', 'rejected'].includes(property.status || 'draft'));
  const focusedRows = activeView === 'bookings' ? bookings
    : activeView === 'payments' ? payments
      : activeView === 'verifications' ? verifications
        : activeView === 'audit' ? auditEvents
          : activeView === 'documents' ? docs
            : activeView === 'live_properties' ? properties.filter((property) => property.status === 'live')
              : activeView === 'pending_properties' ? pendingProperties
                : activeView === 'properties' ? properties
                  : [];

  useEffect(() => {
    setActiveView(data?.focus || 'profile');
  }, [data?.focus]);

  const renderRow = (item, index) => {
    if (activeView === 'documents') {
      return <RMDetailRow key={`${item.document_type}-${index}`} title={item.document_type || 'Document'} meta={`${item.status || 'pending'} | uploaded ${formatDate(item.uploaded_at)} | ${item.rejection_reason || 'No remarks'}`} />;
    }
    if (activeView.includes('properties')) {
      return <RMDetailRow key={item.property_id} title={item.title || item.property_id} meta={`${item.city || 'No city'} | ${item.status || 'draft'} | ${formatMoney(item.price_per_night)}`} />;
    }
    if (activeView === 'bookings') {
      return <RMDetailRow key={item.booking_id} title={item.booking_id} meta={`${item.booking_status || 'pending'} | ${item.payment_status || 'pending'} | ${formatMoney(item.total_amount)}`} />;
    }
    if (activeView === 'payments') {
      return <RMDetailRow key={item.transaction_id || item.payment_id || index} title={item.transaction_id || item.payment_id || 'Payment'} meta={`${item.status || item.payment_status || 'pending'} | ${formatMoney(item.amount || item.total_amount)} | ${formatDate(item.created_at)}`} />;
    }
    if (activeView === 'verifications') {
      return <RMDetailRow key={item.verification_id || index} title={item.verification_id || item.property_id || 'Verification'} meta={`${item.status || 'pending'} | RM reviewed: ${item.rm_reviewed ? 'yes' : 'no'} | ${formatDate(item.created_at)}`} />;
    }
    return <RMDetailRow key={item.audit_id || item.created_at || index} title={item.action || 'Activity'} meta={`${item.module || 'host'} | ${formatDate(item.created_at)} | ${item.reason || 'No reason'}`} />;
  };

  return (
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[220] flex items-center justify-center p-4">
      <div className="bg-stone rounded-[2rem] max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-elevated border border-gray-100">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4 z-10">
          <div>
            <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-1">Host Details</p>
            <h3 className="text-2xl font-bold text-charcoal">{host.full_name || 'Host Profile'}</h3>
            <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest mt-1">Host ID: {host.user_id || 'N/A'} | Broker: {broker.full_name || host.broker_name || 'Not assigned'}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-all">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-charcoal-muted uppercase tracking-widest">Loading host details...</div>
        ) : data?.error ? (
          <div className="p-10 text-center text-sm font-bold text-red-600 uppercase tracking-widest">Failed to load host details</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Email', host.email || 'N/A'],
                ['Mobile', host.phone || 'N/A'],
                ['KYC Status', host.kyc_status || 'pending'],
                ['Broker LG Code', broker.lg_code || host.broker_lg_code || host.lg_code || 'N/A'],
                ['Properties', properties.length],
                ['Live Properties', properties.filter((property) => property.status === 'live').length],
                ['Bookings', bookings.length],
                ['Documents', docs.length],
                ['Tracker Stage', `${trackerStages.filter((stage) => stage.status === 'completed').length}/${trackerStages.length}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white border border-gray-100 px-4 py-3">
                  <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-charcoal mt-1 break-words">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ['profile', 'Profile'],
                  ['tracker', 'Tracker'],
                  ['documents', `Documents (${docs.length})`],
                  ['properties', `Properties (${properties.length})`],
                  ['live_properties', `Live (${properties.filter((property) => property.status === 'live').length})`],
                  ['pending_properties', `Pending (${pendingProperties.length})`],
                  ['bookings', `Bookings (${bookings.length})`],
                  ['payments', `Payments (${payments.length})`],
                  ['verifications', `Verification (${verifications.length})`],
                  ['audit', `Audit (${auditEvents.length})`],
                ].map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      activeView === view ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'tracker' ? (
              <RMVerificationTracker stages={trackerStages} />
            ) : activeView === 'documents' ? (
              <RMDocumentReviewPanel host={host} docs={docs} formatDate={formatDate} />
            ) : activeView === 'profile' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RMDetailRow title="Assigned Broker" meta={`${broker.full_name || host.broker_name || 'Not assigned'} | ${broker.lg_code || host.broker_lg_code || 'No LG code'}`} />
                <RMDetailRow title="Location" meta={`${host.city || 'No city'} | ${host.state || 'No state'} | ${host.branch || 'No branch'}`} />
                <RMDetailRow title="Status" meta={`${host.is_active === false ? 'Inactive' : 'Active'} | KYC ${host.kyc_status || 'pending'}`} />
                <RMDetailRow title="Registered" meta={formatDate(host.created_at || host.timestamp)} />
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-5">
                <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest mb-4">{activeView.replace('_', ' ')}</h4>
                {focusedRows.length > 0 ? (
                  <div className="space-y-3">{focusedRows.slice(0, 60).map(renderRow)}</div>
                ) : (
                  <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest py-8 text-center">No records found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RMPropertyTracker = ({ stages = [] }) => {
  const statusStyles = {
    completed: 'bg-sage/10 text-sage-dark border-sage/20',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    waiting: 'bg-stone text-charcoal-muted border-sand-200',
    escalated: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest">Property Verification Tracker</h4>
          <p className="text-xs text-charcoal-muted mt-1">Basic information to live property approval sequence.</p>
        </div>
        <Building2 className="w-5 h-5 text-terracotta" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="rounded-2xl border border-sand-200 bg-stone/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Stage {String(index + 1).padStart(2, '0')}</p>
                <p className="text-sm font-bold text-charcoal mt-1">{stage.label}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${statusStyles[stage.status] || statusStyles.waiting}`}>
                {stage.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RMPropertiesSection = () => {
  const [properties, setProperties] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [statusFilter]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employee/properties', {
        params: statusFilter === 'all' ? {} : { status_filter: statusFilter }
      });
      setProperties(response.data.properties || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching RM properties:', error);
      setProperties([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';

  const openPropertyDetails = async (property) => {
    setSelectedPropertyDetails({ property, loading: true });
    setDetailsLoading(true);
    try {
      const response = await apiClient.get(`/employee/properties/${property.property_id}/details`);
      setSelectedPropertyDetails(response.data);
    } catch (error) {
      console.error('Error fetching RM property details:', error);
      setSelectedPropertyDetails({ property, error: true });
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div data-testid="rm-properties-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Property Operations</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Property Management</h3>
          <p className="text-sm text-charcoal-muted mt-2">RM-scoped property pipeline across assigned brokers and hosts.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full lg:w-auto">
          {[
            ['Total', summary.total || 0],
            ['Live', summary.live || 0],
            ['Pending', summary.pending_verification || 0],
            ['Rejected', summary.rejected || 0],
            ['Draft', summary.draft || 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
              <p className="text-xl font-bold text-charcoal">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['draft', 'Draft'],
            ['pending_verification', 'Pending Verification'],
            ['under_review', 'Under Review'],
            ['live', 'Live'],
            ['rejected', 'Rejected'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                statusFilter === value ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {properties.map((property) => (
            <div key={property.property_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium hover:border-terracotta transition-all duration-300">
              <div className="flex items-start gap-4">
                <img
                  src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                  alt={property.title}
                  className="w-24 h-24 rounded-2xl object-cover border border-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-charcoal truncate">{property.title || property.property_id}</h4>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Property ID: {property.property_id}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">Host: {property.host_summary?.full_name || property.owner_id || 'N/A'}</p>
                      <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">Broker: {property.broker_summary?.full_name || property.broker_id || 'N/A'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${
                      property.status === 'live' ? 'bg-sage/10 text-sage-dark' : property.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {property.status || 'draft'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {[
                      ['Category', formatCategoryLabel(property.category) || 'N/A'],
                      ['Type', formatPropertyTypeLabel(property.property_type) || 'N/A'],
                      ['Stage', property.verification_stage?.current_stage || 'Basic Information'],
                      ['Tracker', `${property.verification_stage?.completed || 0}/${property.verification_stage?.total || 12}`],
                      ['Bookings', property.booking_count || 0],
                      ['Revenue', formatMoney(property.revenue_generated)],
                      ['Rating', property.rating || 0],
                      ['Subscription', property.subscription_status || 'trial'],
                    ].map(([label, value]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => openPropertyDetails(property)}
                        className="rounded-2xl bg-stone/60 border border-sand-200 px-3 py-3 text-left hover:border-terracotta hover:bg-terracotta/5 transition-all min-h-[70px]"
                      >
                        <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest leading-tight">{label}</p>
                        <p className="text-sm font-bold text-charcoal mt-1 break-words">{value}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest">Updated: {formatDate(property.updated_at || property.created_at)}</p>
                    <button
                      type="button"
                      onClick={() => openPropertyDetails(property)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-terracotta transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <Building2 className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">No properties found in this RM scope</p>
        </div>
      )}

      {selectedPropertyDetails && (
        <RMPropertyDetailsModal
          data={selectedPropertyDetails}
          loading={detailsLoading}
          formatMoney={formatMoney}
          formatDate={formatDate}
          onClose={() => setSelectedPropertyDetails(null)}
        />
      )}
    </div>
  );
};

const RMPropertyDetailsModal = ({ data, loading, formatMoney, formatDate, onClose }) => {
  const [activeView, setActiveView] = useState('tracker');
  const property = data?.property || {};
  const host = data?.host || {};
  const broker = data?.broker || {};
  const verifications = data?.verifications || [];
  const bookings = data?.bookings || [];
  const auditLogs = data?.audit_logs || [];
  const tracker = property.verification_stage || {};
  const rows = activeView === 'verifications' ? verifications : activeView === 'bookings' ? bookings : auditLogs;
  const coverImage = getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded';
  const computedRevenue = bookings.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const statusTone = property.status === 'live'
    ? 'bg-sage/10 text-sage-dark border-sage/20'
    : property.status === 'rejected'
      ? 'bg-red-50 text-red-600 border-red-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  const renderRow = (item, index) => {
    if (activeView === 'verifications') {
      return <RMDetailRow key={item.verification_id || index} title={item.verification_id || 'Verification'} meta={`${item.status || 'pending'} | RM reviewed: ${item.rm_reviewed ? 'yes' : 'no'} | ${formatDate(item.updated_at || item.created_at)}`} />;
    }
    if (activeView === 'bookings') {
      return <RMDetailRow key={item.booking_id || index} title={item.booking_id || 'Booking'} meta={`${item.booking_status || 'pending'} | ${item.payment_status || 'pending'} | ${formatMoney(item.total_amount)}`} />;
    }
    return <RMDetailRow key={item.audit_id || index} title={item.action || 'Activity'} meta={`${item.module || 'property'} | ${formatDate(item.created_at)} | ${item.reason || 'No reason'}`} />;
  };

  return (
    <div className="fixed inset-0 bg-charcoal/65 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
      <div className="bg-stone rounded-[1.5rem] max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-elevated border border-white/80">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 md:px-7 py-5 flex items-start justify-between gap-4 z-10">
          <div className="flex items-start gap-4 min-w-0">
            <img
              src={coverImage}
              alt={property.title || 'Property'}
              className="w-16 h-16 rounded-2xl object-cover border border-gray-100 bg-stone flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-terracotta uppercase tracking-[0.24em] mb-1">Property Workspace</p>
              <h3 className="text-xl md:text-2xl font-bold text-charcoal truncate">{property.title || 'Property Profile'}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">
                  {property.property_id || 'No Property ID'}
                </span>
                <span className={`rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${statusTone}`}>
                  {property.status || 'draft'}
                </span>
                <span className="rounded-full bg-sand-100 px-3 py-1 text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">
                  {tracker.current_stage || 'Basic Information'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta hover:bg-red-50 transition-all flex-shrink-0" aria-label="Close property details">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-charcoal-muted uppercase tracking-widest">Loading property details...</div>
        ) : data?.error ? (
          <div className="p-10 text-center text-sm font-bold text-red-600 uppercase tracking-widest">Failed to load property details</div>
        ) : (
          <div className="p-5 md:p-7 space-y-5 overflow-y-auto max-h-[calc(92vh-106px)]">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.5fr] gap-5">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
                <img src={coverImage} alt={property.title || 'Property'} className="h-52 w-full object-cover bg-stone" />
                <div className="p-5">
                  <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">Assigned Host</p>
                  <h4 className="text-lg font-bold text-charcoal mt-1">{host.full_name || property.owner_id || 'N/A'}</h4>
                  <p className="text-xs font-semibold text-charcoal-muted mt-1 break-words">{host.email || 'No email'} | {host.phone || 'No mobile'}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-stone/70 border border-sand-200 px-4 py-3">
                      <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">Broker</p>
                      <p className="text-sm font-bold text-charcoal mt-1 break-words">{broker.full_name || property.broker_id || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-stone/70 border border-sand-200 px-4 py-3">
                      <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">City</p>
                      <p className="text-sm font-bold text-charcoal mt-1 break-words">{property.city || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 content-start">
              {[
                ['Tracker', `${tracker.completed || 0}/${tracker.total || 12}`, 'Current approval progress'],
                ['Category', formatCategoryLabel(property.category) || 'N/A', formatPropertyTypeLabel(property.property_type) || 'No type'],
                ['Bookings', bookings.length, 'Bookings linked to this property'],
                ['Revenue', formatMoney(computedRevenue), 'Collected booking value'],
                ['Price', formatMoney(property.price_per_night), `${property.pricing_cycle || 'day'} pricing`],
                ['Guests', property.max_guests || 0, 'Maximum guest capacity'],
                ['Subscription', property.subscription_status || 'trial', property.subscription_id || 'No subscription id'],
                ['Updated', formatDate(property.updated_at || property.created_at), 'Last activity date'],
              ].map(([label, value, helper]) => (
                <div key={label} className="rounded-2xl bg-white border border-gray-100 px-4 py-4 shadow-sm min-h-[92px]">
                  <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                  <p className="text-base font-bold text-charcoal mt-2 break-words">{value}</p>
                  <p className="text-[10px] font-semibold text-charcoal-muted mt-1 break-words">{helper}</p>
                </div>
              ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[
                  ['tracker', 'Tracker'],
                  ['profile', 'Profile'],
                  ['verifications', `Verifications (${verifications.length})`],
                  ['bookings', `Bookings (${bookings.length})`],
                  ['audit', `Audit (${auditLogs.length})`],
                ].map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      activeView === view ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'tracker' ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[9px] font-bold text-terracotta uppercase tracking-[0.22em]">Approval Sequence</p>
                    <h4 className="text-lg font-bold text-charcoal mt-1">Property Verification Tracker</h4>
                  </div>
                  <span className="rounded-full bg-sage/10 px-4 py-2 text-[10px] font-bold text-sage-dark uppercase tracking-widest">
                    {tracker.completed || 0} of {tracker.total || 12} completed
                  </span>
                </div>
                <RMPropertyTracker stages={tracker.stages || []} />
              </div>
            ) : activeView === 'profile' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RMDetailRow title="Location" meta={`${property.address || 'No address'} | ${property.city || 'No city'} | ${property.state || 'No state'}`} />
                <RMDetailRow title="Pricing" meta={`${formatMoney(property.price_per_night)} | ${property.pricing_cycle || 'day'} | max guests ${property.max_guests || 0}`} />
                <RMDetailRow title="Assignment" meta={`Host ${host.full_name || property.owner_id || 'N/A'} | Broker ${broker.full_name || property.broker_id || 'N/A'} | RM ${property.rm_id || 'N/A'}`} />
                <RMDetailRow title="Subscription" meta={`${property.subscription_status || 'trial'} | ${property.subscription_id || 'No subscription id'}`} />
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-5">
                <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest mb-4">{activeView}</h4>
                {rows.length ? (
                  <div className="space-y-3">{rows.slice(0, 60).map(renderRow)}</div>
                ) : (
                  <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest py-8 text-center">No records found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RMBookingsSection = () => {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, period]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employee/bookings', {
        params: {
          ...(statusFilter === 'all' ? {} : { status_filter: statusFilter }),
          ...(period === 'all' ? {} : { period }),
        }
      });
      setBookings(response.data.bookings || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching RM bookings:', error);
      setBookings([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';

  const openBookingDetails = async (booking) => {
    setSelectedBookingDetails({ booking, loading: true });
    setDetailsLoading(true);
    try {
      const response = await apiClient.get(`/employee/bookings/${booking.booking_id}/details`);
      setSelectedBookingDetails(response.data);
    } catch (error) {
      console.error('Error fetching RM booking details:', error);
      setSelectedBookingDetails({ booking, error: true });
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div data-testid="rm-bookings-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Booking Operations</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Booking Management</h3>
          <p className="text-sm text-charcoal-muted mt-2">Broker-wise, host-wise and property-wise booking tracking with revenue and occupancy context.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full lg:w-auto">
          {[
            ['Total', summary.total || 0],
            ['Confirmed', summary.confirmed || 0],
            ['Upcoming', summary.upcoming || 0],
            ['Cancelled', summary.cancelled || 0],
            ['Revenue', formatMoney(summary.revenue)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
              <p className="text-lg font-bold text-charcoal break-words">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="soft_lock">Soft Lock</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field">
            <option value="all">All Periods</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button type="button" onClick={() => { setStatusFilter('all'); setPeriod('all'); }} className="rounded-xl bg-stone px-5 py-3 text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-sand-100 transition">
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone border-b border-gray-100">
                <tr>
                  {['Booking', 'Property', 'Host', 'Broker', 'Dates', 'Amount', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-5 py-4 text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-stone/40 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-charcoal">{booking.booking_id}</p>
                      <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{booking.payment_status || 'pending'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-charcoal">{booking.property_summary?.title || booking.property_id}</p>
                      <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{booking.property_summary?.city || 'No city'}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-charcoal">{booking.host_summary?.full_name || booking.host_id || 'N/A'}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-charcoal">{booking.broker_summary?.full_name || booking.broker_id || 'N/A'}</p>
                      <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{booking.broker_summary?.lg_code || booking.broker_lg_code || 'No LG'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-charcoal">{formatDate(booking.check_in_date)}</p>
                      <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">to {formatDate(booking.check_out_date)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-terracotta">{formatMoney(booking.total_amount)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal-muted">{booking.booking_status || 'pending'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => openBookingDetails(booking)} className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-terracotta transition">
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <FileText className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">No bookings found in this RM scope</p>
        </div>
      )}

      {selectedBookingDetails && (
        <RMBookingDetailsModal
          data={selectedBookingDetails}
          loading={detailsLoading}
          formatMoney={formatMoney}
          formatDate={formatDate}
          onClose={() => setSelectedBookingDetails(null)}
        />
      )}
    </div>
  );
};

const RMBookingDetailsModal = ({ data, loading, formatMoney, formatDate, onClose }) => {
  const [activeView, setActiveView] = useState('details');
  const booking = data?.booking || {};
  const property = data?.property || {};
  const host = data?.host || {};
  const broker = data?.broker || {};
  const guest = data?.guest || {};
  const commissions = data?.commissions || [];
  const auditLogs = data?.audit_logs || [];
  const timeline = data?.timeline || [];
  const rows = activeView === 'timeline' ? timeline : activeView === 'commissions' ? commissions : auditLogs;

  const renderRow = (item, index) => {
    if (activeView === 'timeline') {
      return <RMDetailRow key={`${item.label}-${index}`} title={item.label} meta={`${item.status || 'pending'} | ${formatDate(item.created_at)}`} />;
    }
    if (activeView === 'commissions') {
      return <RMDetailRow key={item.commission_id || index} title={item.commission_id || 'Commission'} meta={`${item.payment_status || 'pending'} | ${formatMoney(item.commission_amount)} | ${item.broker_id || 'No broker'}`} />;
    }
    return <RMDetailRow key={item.audit_id || index} title={item.action || 'Activity'} meta={`${item.module || 'booking'} | ${formatDate(item.created_at)} | ${item.reason || 'No reason'}`} />;
  };

  return (
    <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[220] flex items-center justify-center p-4">
      <div className="bg-stone rounded-[2rem] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-elevated border border-gray-100">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4 z-10">
          <div>
            <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-1">Booking Details</p>
            <h3 className="text-2xl font-bold text-charcoal">{booking.booking_id || 'Booking'}</h3>
            <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest mt-1">{booking.booking_status || 'pending'} | {booking.payment_status || 'pending'}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-all">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-charcoal-muted uppercase tracking-widest">Loading booking details...</div>
        ) : data?.error ? (
          <div className="p-10 text-center text-sm font-bold text-red-600 uppercase tracking-widest">Failed to load booking details</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Guest', guest.full_name || booking.guest_id || 'N/A'],
                ['Property', property.title || booking.property_id || 'N/A'],
                ['Host', host.full_name || booking.host_id || 'N/A'],
                ['Broker', broker.full_name || booking.broker_id || 'N/A'],
                ['Broker LG Code', broker.lg_code || booking.broker_lg_code || 'N/A'],
                ['RM', booking.rm_id || booking.employee_id || 'Current RM'],
                ['Amount', formatMoney(booking.total_amount)],
                ['Taxes', formatMoney(booking.taxes)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white border border-gray-100 px-4 py-3">
                  <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-charcoal mt-1 break-words">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ['details', 'Details'],
                  ['timeline', `Timeline (${timeline.length})`],
                  ['commissions', `Commission (${commissions.length})`],
                  ['audit', `Audit (${auditLogs.length})`],
                ].map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      activeView === view ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'details' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RMDetailRow title="Booking Dates" meta={`${formatDate(booking.check_in_date)} to ${formatDate(booking.check_out_date)} | ${booking.number_of_guests || 0} guests`} />
                <RMDetailRow title="Payment" meta={`${booking.payment_status || 'pending'} | paid ${formatMoney(booking.paid_amount)} | type ${booking.payment_type || 'full'}`} />
                <RMDetailRow title="Commission" meta={commissions.length ? commissions.map((item) => `${item.broker_id}: ${formatMoney(item.commission_amount)}`).join(' | ') : 'No commission record'} />
                <RMDetailRow title="Property Snapshot" meta={`${property.city || 'No city'} | ${property.status || 'draft'} | ${property.category || 'property'}`} />
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 p-5">
                <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest mb-4">{activeView}</h4>
                {rows.length ? (
                  <div className="space-y-3">{rows.slice(0, 60).map(renderRow)}</div>
                ) : (
                  <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest py-8 text-center">No records found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RMTasksSection = () => {
  const [data, setData] = useState({ tasks: [], escalations: [], notifications: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState('tasks');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employee/tasks');
      setData(response.data || { tasks: [], escalations: [], notifications: [], summary: {} });
    } catch (error) {
      console.error('Error fetching RM tasks:', error);
      setData({ tasks: [], escalations: [], notifications: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';
  const badgeClass = (value) => {
    if (value === 'within_sla') return 'bg-sage/10 text-sage-dark';
    if (value === 'at_risk') return 'bg-amber-100 text-amber-700';
    if (value === 'breached' || value === 'escalated') return 'bg-red-50 text-red-600';
    return 'bg-stone text-charcoal-muted';
  };

  const rows = activeQueue === 'escalations' ? data.escalations || [] : activeQueue === 'notifications' ? data.notifications || [] : data.tasks || [];

  return (
    <div data-testid="rm-tasks-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Workflow Engine</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Tasks, Escalations & Notifications</h3>
          <p className="text-sm text-charcoal-muted mt-2">Operational queue for approvals, broker follow-ups, host documents, SLA breaches and RM alerts.</p>
        </div>
        <button type="button" onClick={fetchTasks} className="rounded-xl bg-charcoal px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-terracotta transition">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {[
          ['Open Tasks', data.summary?.open_tasks || 0],
          ['Critical Tasks', data.summary?.critical_tasks || 0],
          ['Overdue Tasks', data.summary?.overdue_tasks || 0],
          ['SLA Breaches', data.summary?.sla_breaches || 0],
          ['Pending Approvals', data.summary?.pending_approvals || 0],
          ['Escalations', data.summary?.escalations || 0],
          ['Notifications', data.summary?.notifications || 0],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
            <p className="text-xl font-bold text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            ['tasks', `Task Queue (${data.tasks?.length || 0})`],
            ['escalations', `Escalation Watchlist (${data.escalations?.length || 0})`],
            ['notifications', `Notifications (${data.notifications?.length || 0})`],
          ].map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveQueue(view)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeQueue === view ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : rows.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
          <div className="divide-y divide-gray-100">
            {rows.slice(0, 100).map((item, index) => (
              <div key={item.task_id || item.notification_id || index} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-stone/40 transition">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal break-words">{item.title || item.subject || item.type || 'RM Alert'}</p>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1 break-words">
                    {activeQueue === 'notifications'
                      ? `${item.type || 'notification'} | ${item.channel || 'in_app'} | ${item.status || 'pending'}`
                      : `${item.type || 'task'} | ${item.entity_id || item.task_id || 'N/A'} | ${item.due_label || 'SLA'}`
                    }
                  </p>
                  {item.message && <p className="text-xs text-charcoal-muted mt-2">{item.message}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activeQueue !== 'notifications' && (
                    <>
                      <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal-muted">{item.priority || 'normal'}</span>
                      <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${badgeClass(item.sla_status)}`}>{item.sla_status || 'within_sla'}</span>
                      <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal-muted">{item.age_hours || 0}h</span>
                    </>
                  )}
                  <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal-muted">{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <Clock className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">No records found for this queue</p>
        </div>
      )}
    </div>
  );
};

const RMAuditActivitySection = () => {
  const [data, setData] = useState({ audit_logs: [], summary: {}, filters: { available_modules: [] } });
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    fetchAuditActivity();
  }, [moduleFilter]);

  const fetchAuditActivity = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/employee/audit-activity', {
        params: moduleFilter !== 'all' ? { module: moduleFilter } : {}
      });
      setData(response.data || { audit_logs: [], summary: {}, filters: { available_modules: [] } });
    } catch (error) {
      console.error('Error fetching RM audit activity:', error);
      setData({ audit_logs: [], summary: {}, filters: { available_modules: [] } });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not available';
  const statusClass = (value) => value === 'success' || !value ? 'bg-sage/10 text-sage-dark' : 'bg-red-50 text-red-600';

  return (
    <div data-testid="rm-audit-activity-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Compliance Control</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Audit & Activity</h3>
          <p className="text-sm text-charcoal-muted mt-2">RM-scoped activity trail for approvals, verification reviews, host documents, properties, bookings and workflow changes.</p>
        </div>
        <button type="button" onClick={fetchAuditActivity} className="rounded-xl bg-charcoal px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-terracotta transition">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          ['Total Events', data.summary?.total_events || 0],
          ['Approval Events', data.summary?.approval_events || 0],
          ['Failed Events', data.summary?.failed_events || 0],
          ['Modules', data.summary?.modules || 0],
          ['Scoped Records', data.summary?.scoped_records || 0],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
            <p className="text-xl font-bold text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="input-field">
            <option value="all">All Modules</option>
            {(data.filters?.available_modules || []).map((moduleName) => (
              <option key={moduleName} value={moduleName}>{formatReadableText(moduleName)}</option>
            ))}
          </select>
          <button type="button" onClick={() => setModuleFilter('all')} className="rounded-xl bg-stone px-5 py-3 text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-sand-100 transition">
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : data.audit_logs?.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
          <div className="divide-y divide-gray-100">
            {data.audit_logs.slice(0, 200).map((item, index) => (
              <div key={item.audit_id || index} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-stone/40 transition">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal break-words">{formatReadableText(item.action || 'Activity')}</p>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1 break-words">
                    {item.module || 'general'} | {item.record_id || 'No record'} | {item.role || 'employee'}
                  </p>
                  <p className="text-xs text-charcoal-muted mt-2 break-words">
                    Actor {item.user_id || 'system'} | {item.reason || 'No reason captured'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${statusClass(item.status)}`}>{item.status || 'success'}</span>
                  <span className="rounded-full bg-stone px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal-muted">{formatDateTime(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <ShieldCheck className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">No audit activity found in this RM scope</p>
        </div>
      )}
    </div>
  );
};

// Reports Section
const ReportsSection = () => {
  const [reportType, setReportType] = useState('rm_analytics_overview');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState('brokers');

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/employee/reports/${reportType.replace(/_/g, '-')}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const exportPath = reportType === 'rm_analytics_overview'
        ? '/employee/reports/rm-analytics-overview/export-csv'
        : '/employee/reports/properties-not-booked/export-csv';
      const response = await apiClient.get(exportPath, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  return (
    <div data-testid="reports-section" className="animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-2">RM Analytics Command</p>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">RM Analytics & Reports</h3>
          <p className="text-sm text-charcoal-muted mt-2">Broker, host, property, booking, revenue, commission and SLA performance inside your assigned RM scope.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-terracotta transition disabled:opacity-60"
            data-testid="generate-report-btn"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Generate'}</span>
          </button>
          {reportData && reportType !== 'broker_portfolio_summary' && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-stone px-5 py-3 text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-sand-100 transition"
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setReportData(null);
              setActiveTable('brokers');
            }}
            className="input-field"
            data-testid="report-type-select"
          >
            <option value="rm_analytics_overview">RM Analytics Overview</option>
            <option value="properties_not_booked">Properties Not Booked</option>
            <option value="broker_portfolio_summary">Broker Portfolio Summary</option>
          </select>
          <button type="button" onClick={() => { setReportType('rm_analytics_overview'); setReportData(null); setActiveTable('brokers'); }} className="rounded-xl bg-stone px-5 py-3 text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-sand-100 transition">
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 bg-white rounded-3xl animate-pulse" />)}
        </div>
      ) : reportData ? (
          <div className="space-y-6" data-testid="report-data">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-5">
              <div>
                <h4 className="text-sm font-bold text-charcoal uppercase tracking-widest">
                  {reportData.report_type.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <p className="text-xs text-charcoal-muted mt-1">
                  Generated at: {new Date(reportData.generated_at).toLocaleString()}
                </p>
              </div>
            </div>

            {reportType === 'rm_analytics_overview' && reportData.summary && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                  {[
                    ['Brokers', reportData.summary.brokers || 0],
                    ['Hosts', reportData.summary.hosts || 0],
                    ['Live Properties', reportData.summary.live_properties || 0],
                    ['Bookings', reportData.summary.bookings || 0],
                    ['Revenue', `Rs. ${Number(reportData.summary.revenue || 0).toLocaleString('en-IN')}`],
                    ['Commission', `Rs. ${Number(reportData.summary.commission || 0).toLocaleString('en-IN')}`],
                    ['SLA Breaches', reportData.summary.sla_breaches || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                      <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                      <p className="text-lg font-bold text-charcoal break-words">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['brokers', `Broker Performance (${reportData.brokers?.length || 0})`],
                      ['hosts', `Host Performance (${reportData.hosts?.length || 0})`],
                      ['properties', `Property Performance (${reportData.properties?.length || 0})`],
                    ].map(([view, label]) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setActiveTable(view)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                          activeTable === view ? 'bg-charcoal text-white' : 'bg-stone text-charcoal-muted hover:text-charcoal'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-stone border-b border-gray-100">
                        <tr>
                          {(activeTable === 'brokers'
                            ? ['Broker', 'LG Code', 'Hosts', 'Properties', 'Live', 'Bookings', 'Revenue', 'Commission']
                            : activeTable === 'hosts'
                              ? ['Host', 'KYC', 'Properties', 'Live', 'Bookings', 'Revenue']
                              : ['Property', 'City', 'Status', 'Broker', 'Host', 'Bookings', 'Revenue']
                          ).map((heading) => (
                            <th key={heading} className="px-5 py-4 text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(reportData[activeTable] || []).slice(0, 100).map((row, index) => (
                          <tr key={row.broker_id || row.host_id || row.property_id || index} className="hover:bg-stone/40 transition">
                            {activeTable === 'brokers' && (
                              <>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.broker_name}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted">{row.lg_code}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.hosts}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.properties}</td>
                                <td className="px-5 py-4 text-sm font-bold text-sage-dark">{row.live_properties}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.bookings}</td>
                                <td className="px-5 py-4 text-sm font-bold text-terracotta">Rs. {Number(row.revenue || 0).toLocaleString('en-IN')}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">Rs. {Number(row.commission || 0).toLocaleString('en-IN')}</td>
                              </>
                            )}
                            {activeTable === 'hosts' && (
                              <>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.host_name}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted uppercase">{row.kyc_status}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.properties}</td>
                                <td className="px-5 py-4 text-sm font-bold text-sage-dark">{row.live_properties}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.bookings}</td>
                                <td className="px-5 py-4 text-sm font-bold text-terracotta">Rs. {Number(row.revenue || 0).toLocaleString('en-IN')}</td>
                              </>
                            )}
                            {activeTable === 'properties' && (
                              <>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.title}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted">{row.city}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted uppercase">{row.status}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted">{row.broker_id || 'N/A'}</td>
                                <td className="px-5 py-4 text-xs font-bold text-charcoal-muted">{row.host_id || 'N/A'}</td>
                                <td className="px-5 py-4 text-sm font-bold text-charcoal">{row.bookings}</td>
                                <td className="px-5 py-4 text-sm font-bold text-terracotta">Rs. {Number(row.revenue || 0).toLocaleString('en-IN')}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportType === 'properties_not_booked' && reportData.properties && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 space-y-3 max-h-96 overflow-y-auto">
                {reportData.properties.map((property) => (
                  <div key={property.property_id} className="p-4 bg-stone rounded-lg">
                    <h5 className="font-semibold text-charcoal">{property.title}</h5>
                    <p className="text-sm text-charcoal-light">
                      {property.city} | {formatDisplayLabel(property.bhk_type)} | ₹{property.price_per_night}{
                        property.category === 'commercial' || property.category === 'event_venue'
                          ? (property.pricing_cycle === 'hourly' ? '/hr' : property.pricing_cycle === 'weekly' ? '/week' : property.pricing_cycle === 'monthly' ? '/month' : '/day')
                          : '/night'
                      }
                    </p>
                    <p className="text-xs text-charcoal-muted mt-1">
                      Broker: {property.broker_name} ({property.broker_lg_code})
                    </p>
                  </div>
                ))}
              </div>
            )}

            {reportType === 'broker_portfolio_summary' && reportData.brokers && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-premium p-4 space-y-3 max-h-96 overflow-y-auto">
                {reportData.brokers.map((broker, idx) => (
                  <div key={idx} className="p-4 bg-stone rounded-lg grid grid-cols-4 gap-4">
                    <div>
                      <p className="font-semibold text-charcoal">{broker.broker_name}</p>
                      <p className="text-xs text-charcoal-light">{broker.lg_code}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-terracotta">{broker.total_properties}</p>
                      <p className="text-xs text-charcoal-light">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{broker.live_properties}</p>
                      <p className="text-xs text-charcoal-light">Live</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-600">{broker.pending_verification}</p>
                      <p className="text-xs text-charcoal-light">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center py-16">
          <BarChart3 className="w-16 h-16 text-charcoal-muted mx-auto mb-4" />
          <p className="text-charcoal-muted font-bold uppercase tracking-widest text-xs">Generate a report to view RM analytics</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
