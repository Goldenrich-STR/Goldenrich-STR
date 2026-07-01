import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { verificationAPI, subscriptionAPI, uploadAPI, getImageUrl, bookingAPI, cmsAPI, adminAPI } from '../services/api';
import { 
  Users, Building2, Calendar, IndianRupee, CheckCircle, 
  X, XCircle, Clock, TrendingUp, BarChart3, LogOut, Plus, Trash, Zap,
  Edit, Eye as EyeIcon, Shield, ChevronLeft, ChevronRight, Tag,
  Check, ListTodo, Heart, FileText, Sparkles, UploadCloud,
  Mail, EyeOff, Lock, User, MapPin, Eye, Camera, Info, ArrowLeft,
  Search, ChevronDown, ChevronUp
} from 'lucide-react';
import SearchLogsManagement from '../components/admin/SearchLogsManagement';
import AICallsManagement from '../components/admin/AICallsManagement';
import { Phone, Volume2, HelpCircle, Download, UserPlus } from 'lucide-react';
import { formatCategoryLabel, formatPropertyTypeLabel, formatDisplayLabel, formatReadableText } from '../lib/displayLabels';

const PremiumDatePicker = ({ value, onChange, placeholder = 'Select Date', required = false, leftIcon, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0]));
        setCurrentMonth(parseInt(parts[1]) - 1);
      }
    }
  }, [value]);

  const years = [];
  for (let y = 2026; y >= 1940; y--) {
    years.push(y);
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const dayCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push(d);
  }

  const handleDaySelect = (day) => {
    if (!day) return;
    const yyyy = currentYear;
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val;
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const isSelected = (day) => {
    if (!value || !day) return false;
    const parts = value.split('-');
    return (
      parseInt(parts[0]) === currentYear &&
      parseInt(parts[1]) - 1 === currentMonth &&
      parseInt(parts[2]) === day
    );
  };

  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none bg-gray-100/50' : ''}`} ref={containerRef}>
      <div 
        className="w-full border border-gray-200/80 rounded-2xl focus-within:border-terracotta outline-none transition bg-white flex items-center cursor-pointer select-none overflow-hidden"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {leftIcon && (
          <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
            {leftIcon}
          </div>
        )}
        <div className={`flex-1 flex justify-between items-center py-3 pr-4 pl-4`}>
          <span className={value ? "text-charcoal font-semibold text-sm" : "text-gray-300 font-normal text-sm"}>
            {formatDisplay(value) || placeholder}
          </span>
          <Calendar className="w-4 h-4 text-charcoal-muted" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-premium border border-gray-100 p-4 w-72 z-[150] animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-50 rounded-lg transition text-charcoal font-bold tracking-tight text-sm"
            >
              &larr;
            </button>
            <div className="flex space-x-1">
              <select 
                value={currentMonth}
                onChange={e => setCurrentMonth(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold tracking-tight text-charcoal uppercase tracking-wider outline-none cursor-pointer hover:text-terracotta transition"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx} className="text-charcoal bg-white normal-case font-bold">{m}</option>
                ))}
              </select>
              <select 
                value={currentYear}
                onChange={e => setCurrentYear(parseInt(e.target.value))}
                className="bg-transparent text-sm font-bold tracking-tight text-charcoal tracking-wide outline-none cursor-pointer hover:text-terracotta transition"
              >
                {years.map(y => (
                  <option key={y} value={y} className="text-charcoal bg-white font-bold">{y}</option>
                ))}
              </select>
            </div>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-50 rounded-lg transition text-charcoal font-bold tracking-tight text-sm"
            >
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-8" />;
              }
              const active = isSelected(day);
              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => handleDaySelect(day)}
                  className={`h-8 w-8 text-xs font-bold tracking-tight rounded-lg transition-all flex items-center justify-center ${
                    active
                      ? 'bg-terracotta text-white shadow-elevated scale-105'
                      : 'hover:bg-gray-50 text-charcoal'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-4 pt-3 border-t border-sand-100">
            <button 
              type="button"
              onClick={handleClear}
              className="text-[10px] font-bold tracking-tight text-charcoal-muted hover:text-charcoal uppercase tracking-widest transition"
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={handleToday}
              className="text-[10px] font-bold tracking-tight text-terracotta hover:text-terracotta-dark uppercase tracking-widest transition"
            >
              Today
            </button>
          </div>
        </div>
      )}
      
      <input 
        type="text" 
        tabIndex={-1}
        value={value || ''} 
        onChange={() => {}}
        required={required && !disabled} 
        disabled={disabled}
        className="opacity-0 absolute inset-0 pointer-events-none" 
      />
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleFilter, setRoleFilter] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { 
      label: 'Total Users', 
      value: stats.users.total, 
      icon: Users, 
      color: 'terracotta',
      subtext: `${stats.users.hosts} Hosts, ${stats.users.guests} Guests`
    },
    { 
      label: 'Total Properties', 
      value: stats.properties.total, 
      icon: Building2, 
      color: 'sage',
      subtext: `${stats.properties.live} Live`
    },
    { 
      label: 'Total Bookings', 
      value: stats.bookings.total, 
      icon: Calendar, 
      color: 'terracotta',
      subtext: `${stats.bookings.confirmed} Confirmed`
    },
    { 
      label: 'Total Revenue', 
      value: `₹${(stats.revenue.total / 100).toLocaleString('en-IN')}`, 
      icon: IndianRupee, 
      color: 'sage',
      subtext: 'Gross Merchandise Value'
    },
  ] : [];

  return (
    <div className="min-h-screen bg-stone">
      {/* Header */}
      <header className="header-glass px-4 md:px-8 lg:px-12 py-4" data-testid="admin-header">
        <div className="w-full flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-6">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-3 px-3 py-1.5 bg-white border border-gray-100 rounded-full shadow-sm cursor-pointer hover:border-terracotta transition-all"
            >
               <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center text-[10px] font-bold tracking-tight text-white">
                  {user?.full_name?.[0]}
               </div>
               <span className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest">Admin: {user?.full_name?.split(' ')[0]}</span>
            </div>
            <button
              onClick={() => navigate('/admin/account')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-terracotta text-white font-semibold hover:bg-terracotta-dark transition text-sm"
              data-testid="nav-account-btn"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Account</span>
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }}
              className="flex items-center space-x-2 text-terracotta hover:underline"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 lg:px-12 py-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-semibold tracking-tight text-charcoal" data-testid="dashboard-title">
            Dashboard Overview
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 border-b border-stone" data-testid="admin-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'properties', label: 'Properties', icon: Building2 },
            { id: 'cms', label: 'CMS', icon: TrendingUp },
            { id: 'search-logs', label: 'Search Logs', icon: FileText },
            { id: 'ai-calls', label: 'AI Voice Calls', icon: Phone },
            { id: 'support-messages', label: 'Support Messages', icon: Mail },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 font-semibold transition ${
                activeTab === tab.id
                  ? 'text-terracotta border-b-2 border-terracotta'
                  : 'text-charcoal-light hover:text-charcoal'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="stats-grid">
                  {statCards.map((stat, idx) => (
                    <div key={idx} className="dashboard-card" data-testid={`stat-card-${idx}`}>
                      <stat.icon className={`w-8 h-8 text-${stat.color} mb-3`} />
                      <p className="text-3xl font-bold text-charcoal">{stat.value}</p>
                      <p className="text-sm font-semibold text-charcoal-light mt-1">{stat.label}</p>
                      <p className="text-xs text-charcoal-muted mt-2">{stat.subtext}</p>
                    </div>
                  ))}
                </div>                 {/* Pending Verifications Alert */}
                {stats && stats.properties.pending_verification > 0 && (
                  <div className="dashboard-card bg-yellow-50 border-l-4 border-yellow-500 mb-8" data-testid="pending-alert">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="font-bold text-charcoal">
                          {stats.properties.pending_verification} Properties Pending Verification
                        </p>
                        <p className="text-sm text-charcoal-light">Review and approve pending property listings</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('properties')}
                        className="btn-primary ml-auto"
                      >
                        Review Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending Host KYC Alert */}
                {stats && stats.users && stats.users.pending_kyc > 0 && (
                  <div className="dashboard-card bg-amber-50 border-l-4 border-amber-500 mb-8" data-testid="pending-kyc-alert">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="font-bold text-charcoal">
                          {stats.users.pending_kyc} Host Profiles Pending KYC Verification
                        </p>
                        <p className="text-sm text-charcoal-light">Review and verify host identity documents and signed agreements</p>
                      </div>
                      <button
                        onClick={() => {
                          setRoleFilter('host');
                          setActiveTab('users');
                        }}
                        className="btn-primary ml-auto bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
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
                      onClick={() => setActiveTab('users')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-manage-users"
                    >
                      <Users className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Manage Users</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-review-properties"
                    >
                      <Building2 className="w-6 h-6 text-sage" />
                      <span className="font-semibold text-charcoal">Review Properties</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('cms')}
                      className="flex items-center space-x-3 p-4 bg-stone rounded-lg hover:bg-gray-50 transition"
                      data-testid="action-edit-cms"
                    >
                      <TrendingUp className="w-6 h-6 text-terracotta" />
                      <span className="font-semibold text-charcoal">Edit Landing Page</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UserManagement roleFilter={roleFilter} setRoleFilter={setRoleFilter} />
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <PropertyModeration />
        )}

        {/* CMS Tab */}
        {activeTab === 'cms' && (
          <CMSManagement />
        )}

        {/* Search Logs Tab */}
        {activeTab === 'search-logs' && (
          <div data-testid="search-logs-section" className="animate-fade-in">
            <SearchLogsManagement />
          </div>
        )}

        {/* AI Voice Calls Tab */}
        {activeTab === 'ai-calls' && (
          <div data-testid="ai-calls-section" className="animate-fade-in">
            <AICallsManagement />
          </div>
        )}

        {/* Support Messages Tab */}
        {activeTab === 'support-messages' && (
          <SupportMessagesManagement />
        )}
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-elevated border border-gray-100/80 animate-scale-up animate-fade-in">
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
    </div>
  );
};

// Helper to format error details (strings, arrays of validation errors, or objects) into a readable string
const formatError = (error, defaultMsg = 'An error occurred') => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const field = err.loc ? err.loc[err.loc.length - 1] : 'field';
        return `${field}: ${err.msg}`;
      }).join('\n');
    }
    if (typeof detail === 'object') {
      return JSON.stringify(detail);
    }
  }
  return error.message || defaultMsg;
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Support Messages Management Component
const SupportMessagesManagement = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [messageStatus, setMessageStatus] = useState('pending');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await cmsAPI.getContactMessages(params);
      setMessages(res.data.messages || []);
      
      // Auto-select first message if available and none selected
      if (res.data.messages && res.data.messages.length > 0) {
        const firstMsg = res.data.messages[0];
        setSelectedMessage(firstMsg);
        setAdminNotes(firstMsg.admin_notes || '');
        setMessageStatus(firstMsg.status || 'pending');
      } else {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error fetching contact messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || '');
    setMessageStatus(msg.status || 'pending');
  };

  const handleUpdateFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedMessage) return;

    try {
      setUpdating(true);
      await cmsAPI.updateContactMessage(selectedMessage._id, {
        status: messageStatus,
        admin_notes: adminNotes
      });
      alert('Follow-up updated successfully!');
      
      // Refresh messages list and preserve selection
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await cmsAPI.getContactMessages(params);
      const updatedMessages = res.data.messages || [];
      setMessages(updatedMessages);
      
      const updatedSelected = updatedMessages.find(m => m._id === selectedMessage._id);
      if (updatedSelected) {
        setSelectedMessage(updatedSelected);
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert(formatError(error, 'Failed to update follow-up'));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const filteredMessages = messages.filter(msg => {
    const term = searchQuery.toLowerCase();
    return (
      msg.name?.toLowerCase().includes(term) ||
      msg.email?.toLowerCase().includes(term) ||
      msg.phone?.toLowerCase().includes(term) ||
      msg.subject?.toLowerCase().includes(term) ||
      msg.message?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Left Column: Messages List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-sand-200/60 shadow-premium space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-charcoal font-display">Inquiries List</h3>
            <span className="px-2.5 py-1 bg-stone text-charcoal font-bold text-[10px] rounded-full uppercase border border-sand-200">
              {filteredMessages.length} Total
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-sand-200 focus:border-terracotta rounded-xl outline-none text-xs font-semibold"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { label: 'All', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'In Progress', value: 'in-progress' },
              { label: 'Resolved', value: 'resolved' }
            ].map(filter => (
              <button
                key={filter.label}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition ${
                  statusFilter === filter.value
                    ? 'bg-terracotta text-white border-terracotta'
                    : 'bg-white border-sand-200 text-charcoal hover:bg-sand-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Cards Scroll Container */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-charcoal-muted text-xs font-bold bg-white rounded-2xl border border-sand-200/60 p-6 shadow-premium">
              Loading support requests...
            </div>
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map(msg => (
              <div
                key={msg._id}
                onClick={() => handleSelectMessage(msg)}
                className={`p-4 bg-white border rounded-2xl shadow-subtle cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  selectedMessage?._id === msg._id
                    ? 'border-terracotta ring-1 ring-terracotta/20 bg-terracotta/5'
                    : 'border-sand-200/60 hover:border-terracotta/30 hover:bg-stone/50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-charcoal">{msg.name}</h4>
                    <p className="text-[10px] text-charcoal-muted font-semibold mt-0.5">{msg.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full border ${getStatusBadgeClass(msg.status)}`}>
                    {msg.status.replace('-', ' ')}
                  </span>
                </div>
                
                <p className="text-xs font-bold text-charcoal-light line-clamp-1 border-t border-sand-100 pt-2 mt-2">
                  {msg.subject}
                </p>
                <span className="text-[9px] text-charcoal-muted mt-1 block font-medium">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-charcoal-muted text-xs font-semibold bg-white rounded-2xl border border-dashed border-sand-300 p-6">
              No inquiries found matching criteria.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: In-depth Detail Panel & Notes Form */}
      <div className="lg:col-span-2">
        {selectedMessage ? (
          <div className="bg-white rounded-2xl border border-sand-200/60 shadow-premium p-6 space-y-6">
            {/* Header section with status */}
            <div className="flex justify-between items-start border-b border-sand-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-terracotta uppercase tracking-widest block">Inquiry Details</span>
                <h3 className="text-xl font-bold text-charcoal font-display mt-0.5">{selectedMessage.subject}</h3>
                <p className="text-xs text-charcoal-muted mt-1 font-semibold">
                  Submitted on {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${getStatusBadgeClass(selectedMessage.status)}`}>
                {selectedMessage.status.replace('-', ' ')}
              </span>
            </div>

            {/* Guest Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-stone/50 p-4 rounded-xl border border-sand-200/40">
                <span className="text-[9px] text-charcoal-muted uppercase tracking-wider font-bold block mb-1">Guest Name</span>
                <span className="text-xs font-bold text-charcoal flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-terracotta" />
                  <span>{selectedMessage.name}</span>
                </span>
              </div>
              <div className="bg-stone/50 p-4 rounded-xl border border-sand-200/40">
                <span className="text-[9px] text-charcoal-muted uppercase tracking-wider font-bold block mb-1">Email Address</span>
                <a href={`mailto:${selectedMessage.email}`} className="text-xs font-bold text-terracotta hover:underline flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{selectedMessage.email}</span>
                </a>
              </div>
              <div className="bg-stone/50 p-4 rounded-xl border border-sand-200/40">
                <span className="text-[9px] text-charcoal-muted uppercase tracking-wider font-bold block mb-1">Phone Number</span>
                <a href={`tel:${selectedMessage.phone}`} className="text-xs font-bold text-charcoal flex items-center space-x-1.5 hover:text-terracotta transition-colors">
                  <Phone className="w-3.5 h-3.5 text-sage" />
                  <span>{selectedMessage.phone}</span>
                </a>
              </div>
            </div>

            {/* Message Description */}
            <div className="bg-sand-50/40 p-5 rounded-2xl border border-sand-250/30">
              <span className="text-[10px] text-charcoal-muted uppercase tracking-widest font-black block mb-3 border-b border-sand-100 pb-2">Description</span>
              <p className="text-sm font-semibold text-charcoal-light leading-relaxed whitespace-pre-line">
                {selectedMessage.message}
              </p>
            </div>

            {/* Follow-up / Admin Actions Form */}
            <form onSubmit={handleUpdateFollowUp} className="border-t border-sand-100 pt-6 space-y-4">
              <h4 className="text-sm font-black text-charcoal uppercase tracking-wider font-display mb-2">Admin Follow-up Log</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Status</label>
                  <select
                    value={messageStatus}
                    onChange={e => setMessageStatus(e.target.value)}
                    className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-2.5 outline-none transition text-xs font-bold bg-white text-charcoal"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Follow-up Notes / Resolution Log</label>
                <textarea
                  rows={4}
                  placeholder="Record call logs, escalation updates, or resolving comments..."
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="w-full border border-sand-200 focus:border-terracotta rounded-xl px-4 py-3 outline-none transition text-xs font-semibold bg-sand-50/20 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-premium transition active:scale-95 flex items-center justify-center space-x-2"
                >
                  {updating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <span>Save Updates</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-sand-200/60 shadow-premium p-12 text-center text-charcoal-muted text-sm font-semibold">
            Select an inquiry from the list to display details and log follow-ups.
          </div>
        )}
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = ({ roleFilter, setRoleFilter }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [uidSearch, setUidSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'guest',
    city: '',
    state: '',
    franchise: '',
    branch: '',
    birthdate: '',
    uid: '',
    profile_image: '',
    lg_code: '',
    employee_code: ''
  });
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);
  const [allBrokers, setAllBrokers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [rejectDocState, setRejectDocState] = useState(null);
  const fetchUsersRequestRef = useRef(0);

  const fetchBrokersAndEmployees = async () => {
    try {
      const brokerParams = { role: 'broker', limit: 1000 };
      const brokerRes = await apiClient.get('/admin/users', { params: brokerParams });
      setAllBrokers(brokerRes.data.users || []);

      const employeeParams = { role: 'employee', limit: 1000 };
      const employeeRes = await apiClient.get('/admin/users', { params: employeeParams });
      setAllEmployees(employeeRes.data.users || []);
    } catch (error) {
      console.error('Error fetching brokers/employees:', error);
    }
  };

  useEffect(() => {
    fetchBrokersAndEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEditUser = (user) => {
    setEditUser({
      ...user,
      password: '',
      lg_code: user.lg_code || '',
      employee_code: user.employee_code || ''
    });
    setShowEditModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      setNewUser(prev => ({ ...prev, profile_image: res.url }));
      alert('Profile image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      alert(formatError(error, 'Failed to upload image'));
    } finally {
      setUploading(false);
    }
  };

  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      setEditUser(prev => ({ ...prev, profile_image: res.url }));
      alert('Profile image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      alert(formatError(error, 'Failed to upload image'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setUsers([]);
    setTotalUsers(0);
  }, [roleFilter, searchTerm, emailSearch, phoneSearch, uidSearch, locationSearch]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [roleFilter, searchTerm, emailSearch, phoneSearch, uidSearch, locationSearch, currentPage]);

  useEffect(() => {
    const generateUID = () => {
      const { role, lg_code, employee_code } = newUser;
      
      if (role === 'broker' && lg_code && lg_code.trim()) {
        const customUid = lg_code.trim();
        setNewUser(prev => {
          if (prev.uid !== customUid) {
            return { ...prev, uid: customUid };
          }
          return prev;
        });
        return;
      }
      
      if (role === 'employee' && employee_code && employee_code.trim()) {
        const customUid = employee_code.trim();
        setNewUser(prev => {
          if (prev.uid !== customUid) {
            return { ...prev, uid: customUid };
          }
          return prev;
        });
        return;
      }
      
      let rolePrefix = 'GST';
      if (role === 'admin') rolePrefix = 'ADM';
      else if (role === 'host') rolePrefix = 'HST';
      else if (role === 'broker') rolePrefix = 'BRK';
      else if (role === 'employee') rolePrefix = 'EMP';
      
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = String(now.getFullYear());
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      const generated = `${rolePrefix} -${dd}${mm}${yyyy}${hh}${min}`;
      
      setNewUser(prev => {
        if (prev.uid !== generated) {
          return { ...prev, uid: generated };
        }
        return prev;
      });
    };
    
    generateUID();
  }, [newUser.role, newUser.lg_code, newUser.employee_code]);

  const isCodeLocked = 
    (newUser.role === 'broker' && newUser.lg_code && newUser.lg_code.trim()) ||
    (newUser.role === 'employee' && newUser.employee_code && newUser.employee_code.trim());

  const getDisplayUID = (u) => {
    if (!u) return '';
    
    if (u.role === 'broker' && u.lg_code && u.lg_code.trim()) {
      return u.lg_code.trim();
    }
    if (u.role === 'employee' && u.employee_code && u.employee_code.trim()) {
      return u.employee_code.trim();
    }
    
    let rolePrefix = 'GST';
    if (u.role === 'admin') rolePrefix = 'ADM';
    else if (u.role === 'host') rolePrefix = 'HST';
    else if (u.role === 'broker') rolePrefix = 'BRK';
    else if (u.role === 'employee') rolePrefix = 'EMP';
    
    const regDate = u.created_at ? new Date(u.created_at) : new Date();
    const dd = String(regDate.getDate()).padStart(2, '0');
    const mm = String(regDate.getMonth() + 1).padStart(2, '0');
    const yyyy = String(regDate.getFullYear());
    const hh = String(regDate.getHours()).padStart(2, '0');
    const min = String(regDate.getMinutes()).padStart(2, '0');
    
    return `${rolePrefix} -${dd}${mm}${yyyy}${hh}${min}`;
  };

  const fetchUsers = async () => {
    const requestId = fetchUsersRequestRef.current + 1;
    fetchUsersRequestRef.current = requestId;
    setLoading(true);

    try {
      const selectedRole = (roleFilter || '').trim().toLowerCase();
      const params = {
        limit: usersPerPage,
        skip: (currentPage - 1) * usersPerPage,
        role: selectedRole || undefined,
        search: searchTerm || undefined,
        email: emailSearch || undefined,
        phone: phoneSearch || undefined,
        uid: uidSearch || undefined,
        location: locationSearch || undefined
      };
      const response = await apiClient.get('/admin/users', { params });
      if (requestId !== fetchUsersRequestRef.current) return;

      const responseUsers = response.data.users || [];
      const roleSafeUsers = selectedRole
        ? responseUsers.filter(user => String(user.role || '').toLowerCase() === selectedRole)
        : responseUsers;

      setUsers(roleSafeUsers);
      setTotalUsers(selectedRole && roleSafeUsers.length !== responseUsers.length
        ? roleSafeUsers.length
        : response.data.total || 0);
    } catch (error) {
      if (requestId !== fetchUsersRequestRef.current) return;
      console.error('Error fetching users:', error);
    } finally {
      if (requestId === fetchUsersRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/users', newUser);
      setShowAddModal(false);
      setNewUser({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'guest',
        city: '',
        state: '',
        franchise: '',
        branch: '',
        birthdate: '',
        uid: '',
        profile_image: '',
        lg_code: '',
        employee_code: ''
      });
      fetchUsers();
      fetchBrokersAndEmployees();
      alert('User created successfully');
    } catch (error) {
      alert(formatError(error, 'Failed to create user'));
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    
    try {
      const updateData = {
        email: editUser.email,
        phone: editUser.phone,
        full_name: editUser.full_name,
        role: editUser.role,
        city: editUser.city,
        state: editUser.state,
        franchise: editUser.franchise,
        branch: editUser.branch,
        birthdate: editUser.birthdate,
        profile_image: editUser.profile_image,
        lg_code: editUser.lg_code,
        employee_code: editUser.employee_code,
        is_active: editUser.is_active
      };
      
      if (editUser.password && editUser.password.trim()) {
        updateData.password = editUser.password;
      }
      
      await apiClient.patch(`/admin/users/${editUser.user_id}`, updateData);
      setShowEditModal(false);
      setEditUser(null);
      fetchUsers();
      fetchBrokersAndEmployees();
      alert('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(formatError(error, 'Failed to update user'));
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      fetchUsers();
      fetchBrokersAndEmployees();
      alert('User deleted successfully');
    } catch (error) {
      alert(formatError(error, 'Failed to delete user'));
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, null, {
        params: { is_active: !currentStatus }
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleApproveKYC = async (userId) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/kyc`, null, {
        params: { kyc_status: 'approved' }
      });
      alert('KYC Approved successfully!');
      setViewUser(null);
      fetchUsers();
    } catch (error) {
      alert('Failed to approve KYC: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRejectKYC = async (userId) => {
    const reason = prompt('Please enter rejection remarks/reason:');
    if (reason === null) return; // cancelled
    if (!reason.trim()) {
      alert('Remarks are required to reject KYC.');
      return;
    }
    try {
      await apiClient.patch(`/admin/users/${userId}/kyc`, null, {
        params: { kyc_status: 'rejected', remarks: reason }
      });
      alert('KYC Rejected successfully!');
      setViewUser(null);
      fetchUsers();
    } catch (error) {
      alert('Failed to reject KYC: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdateDocumentStatus = async (userId, documentType, status, reason = '') => {
    try {
      const payload = {
        document_type: documentType,
        status: status,
        rejection_reason: reason || null
      };
      const response = await apiClient.patch(`/admin/users/${userId}/kyc/documents`, payload);
      alert(`Document ${status} successfully!`);
      
      setViewUser(prev => {
        if (prev && prev.user_id === userId) {
          return {
            ...prev,
            kyc_documents: response.data.kyc_documents
          };
        }
        return prev;
      });
      
      setUsers(prevUsers => prevUsers.map(u => {
        if (u.user_id === userId) {
          return {
            ...u,
            kyc_documents: response.data.kyc_documents
          };
        }
        return u;
      }));
    } catch (error) {
      alert('Failed to update document status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAssignBroker = async (userId, brokerId) => {
    try {
      await apiClient.patch(`/admin/users/${userId}`, { broker_id: brokerId });
      alert('Broker assigned successfully!');
      const assignedBroker = allBrokers.find(b => b.user_id === brokerId);
      setViewUser(prev => ({
        ...prev,
        broker_id: brokerId,
        lg_code: assignedBroker?.lg_code || prev?.lg_code || ''
      }));
      fetchUsers();
    } catch (error) {
      alert('Failed to assign broker: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAssignRM = async (userId, rmId) => {
    try {
      await apiClient.patch(`/admin/users/${userId}`, { rm_id: rmId });
      alert('RM assigned successfully!');
      const assignedEmployee = allEmployees.find(emp => emp.user_id === rmId);
      setViewUser(prev => ({
        ...prev,
        rm_id: rmId,
        employee_code: assignedEmployee?.employee_code || prev?.employee_code || ''
      }));
      fetchUsers();
    } catch (error) {
      alert('Failed to assign RM: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatUserDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
    }
  };

  const handleExportUsers = async () => {
    try {
      const params = {
        role: roleFilter || undefined,
        search: searchTerm || undefined,
        email: emailSearch || undefined,
        phone: phoneSearch || undefined,
        uid: uidSearch || undefined,
        location: locationSearch || undefined
      };
      const response = await adminAPI.downloadUsersCsv(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Failed to export users list');
    }
  };

  const selectedRole = (roleFilter || '').trim().toLowerCase();
  const displayedUsers = selectedRole
    ? users.filter(user => String(user.role || '').toLowerCase() === selectedRole)
    : users;
  const displayTotalUsers = selectedRole && displayedUsers.length !== users.length
    ? displayedUsers.length
    : totalUsers;

  const getAssignedBroker = (u) => (
    allBrokers.find(b => b.user_id === u?.broker_id)
    || allBrokers.find(b => b.lg_code && u?.lg_code && b.lg_code.toLowerCase() === u.lg_code.toLowerCase())
    || null
  );

  const getAssignedEmployee = (u) => (
    allEmployees.find(emp => emp.user_id === u?.rm_id)
    || allEmployees.find(emp => emp.employee_code && u?.employee_code && emp.employee_code.toLowerCase() === u.employee_code.toLowerCase())
    || null
  );

  const getHostBrokerCode = (u) => u?.lg_code || getAssignedBroker(u)?.lg_code || 'Not assigned';
  const getHostEmployeeCode = (u) => u?.employee_code || getAssignedEmployee(u)?.employee_code || 'Not assigned';

  return (
    <div data-testid="user-management">
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-charcoal">User Management</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportUsers}
              className="px-5 py-2 rounded-2xl border border-gray-200 hover:border-terracotta text-charcoal hover:bg-[#FAF9F6] flex items-center space-x-1.5 transition text-sm font-bold shadow-sm bg-white"
              data-testid="export-users-csv-btn"
            >
              <Download className="w-4 h-4 text-terracotta" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-premium flex items-center space-x-2 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Search & Filter Row */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-subtle mb-6 space-y-4">
        <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Search & Filter Users</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Name or UID Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Name or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF9F6]/50 border border-gray-200/80 rounded-2xl focus:border-terracotta focus:bg-white outline-none text-sm text-charcoal font-semibold placeholder:font-normal transition-all"
            />
          </div>

          {/* Email Search */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Email ID..."
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF9F6]/50 border border-gray-200/80 rounded-2xl focus:border-terracotta focus:bg-white outline-none text-sm text-charcoal font-semibold placeholder:font-normal transition-all"
            />
          </div>

          {/* Phone Search */}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Mobile No..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF9F6]/50 border border-gray-200/80 rounded-2xl focus:border-terracotta focus:bg-white outline-none text-sm text-charcoal font-semibold placeholder:font-normal transition-all"
            />
          </div>

          {/* Location Search */}
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="City or State..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF9F6]/50 border border-gray-200/80 rounded-2xl focus:border-terracotta focus:bg-white outline-none text-sm text-charcoal font-semibold placeholder:font-normal transition-all"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-11 pr-8 py-3 bg-[#FAF9F6]/50 border border-gray-200/80 rounded-2xl focus:border-terracotta focus:bg-white outline-none text-sm text-charcoal font-bold appearance-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="host">Host</option>
              <option value="broker">Broker</option>
              <option value="employee">Employee</option>
              <option value="guest">Guest</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading users...</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="users-list">
          {displayedUsers.map((user) => (
            <div key={user.user_id} className="dashboard-card hover:shadow-subtle transition-all group" data-testid={`user-${user.user_id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {user.profile_image ? (
                      <img
                        src={getImageUrl(user.profile_image)}
                        alt={user.full_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-terracotta/10 border-2 border-gray-100 flex items-center justify-center font-bold tracking-tight text-terracotta text-lg uppercase">
                        {user.full_name ? user.full_name.charAt(0) : '?'}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-charcoal text-lg">{user.full_name}</h4>
                    <p className="text-sm text-charcoal-light">{user.email} | {user.phone}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-terracotta/10 text-terracotta text-[10px] font-bold tracking-tight uppercase tracking-wider rounded">
                        {user.role}
                      </span>
                      {user.role === 'host' && (
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase tracking-wider rounded border ${
                          user.kyc_status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                          user.kyc_status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          user.kyc_status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                          'bg-gray-50 text-charcoal-light border-gray-100'
                        }`}>
                          KYC: {user.kyc_status || 'unverified'}
                        </span>
                      )}
                      <span className="inline-block px-2 py-0.5 bg-charcoal/5 text-charcoal/80 text-[10px] font-mono tracking-wider rounded">
                        UID: {getDisplayUID(user)}
                      </span>
                      {user.city && (
                        <span className="text-xs text-charcoal-muted">in {user.city}</span>
                      )}
                      {user.created_at && (
                        <span className="inline-block px-2 py-0.5 bg-gray-50 text-charcoal-muted text-[10px] font-medium rounded flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-charcoal-muted/70" />
                          Registered: {formatUserDate(user.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewUser(user)}
                    className="p-2 text-charcoal-light hover:text-terracotta transition"
                    title="View Details"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => startEditUser(user)}
                    className="p-2 text-charcoal-light hover:text-terracotta transition"
                    title="Edit User"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                      user.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.user_id)}
                    className="p-2 text-charcoal-light hover:text-red-600 transition"
                    title="Delete Permanently"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Pagination Controls */}
          {displayTotalUsers > usersPerPage && (
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-gray-100 mt-6 flex-wrap gap-4">
              <p className="text-xs text-charcoal-muted">
                Showing <span className="font-bold text-charcoal">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
                <span className="font-bold text-charcoal">
                  {Math.min(currentPage * usersPerPage, displayTotalUsers)}
                </span>{' '}
                of <span className="font-bold text-charcoal">{displayTotalUsers}</span> users
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-gray-100 text-charcoal-light hover:bg-stone transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.ceil(displayTotalUsers / usersPerPage) }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const totalPages = Math.ceil(displayTotalUsers / usersPerPage);
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold tracking-tight transition-colors ${
                          currentPage === pageNum
                            ? 'bg-terracotta text-white font-bold'
                            : 'border border-gray-100 text-charcoal hover:bg-stone'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (
                    pageNum === 2 ||
                    pageNum === totalPages - 1
                  ) {
                    return <span key={pageNum} className="text-charcoal-muted px-1">...</span>;
                  }
                  return null;
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(displayTotalUsers / usersPerPage)))}
                  disabled={currentPage === Math.ceil(displayTotalUsers / usersPerPage)}
                  className="p-2 rounded-xl border border-gray-100 text-charcoal-light hover:bg-stone transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-premium animate-slide-up overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-6 h-6 text-terracotta" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal leading-none mb-1">Create New User</h3>
                  <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mt-0.5">Register professional nodes in the STR network</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center text-terracotta">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              {/* Profile Image Upload Component */}
              <div className="bg-[#FAF9F6] border border-gray-100 rounded-2xl p-5 mb-4">
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-3">Profile Image</label>
                <div className="flex items-center space-x-4">
                  {/* Circular Preview */}
                  <div className="relative flex-shrink-0">
                    {newUser.profile_image ? (
                      <div className="relative group">
                        <img 
                          src={getImageUrl(newUser.profile_image)} 
                          alt="Preview" 
                          className="w-20 h-20 rounded-full object-cover border-4 border-sand-100 shadow-subtle group-hover:opacity-90 transition-opacity"
                        />
                        <button 
                          type="button"
                          onClick={() => setNewUser(prev => ({ ...prev, profile_image: '' }))}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow transition-transform hover:scale-[1.03]"
                          title="Remove Image"
                        >
                          <span className="font-bold text-xs">×</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-stone border-4 border-sand-100 flex items-center justify-center text-charcoal-muted relative">
                        <Camera className="w-8 h-8 text-charcoal-muted/50" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-terracotta flex items-center justify-center text-white border-2 border-white shadow-sm">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Choose File box */}
                  <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-center min-h-[5rem]">
                    <div className="flex items-center space-x-3">
                      <label 
                        htmlFor="add-user-avatar-upload"
                        className="px-4 py-2 border border-gray-200 hover:border-terracotta text-charcoal hover:bg-[#FAF9F6] rounded-2xl font-bold transition text-xs shadow-sm bg-white flex items-center space-x-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-terracotta" />
                        <span>Choose File</span>
                      </label>
                      <input 
                        id="add-user-avatar-upload"
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-charcoal-light truncate max-w-[12rem]">
                        {newUser.profile_image ? "Image uploaded" : (uploading ? "Uploading..." : "No file chosen")}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-charcoal-muted mt-2">Supported formats: PNG, JPG, JPEG, WEBP, GIF (Max 8MB)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Full Name</label>
                <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                  <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <input 
                    required
                    placeholder="Enter full name"
                    className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                    value={newUser.full_name}
                    onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Email Address</label>
                  <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input 
                      type="email" required
                      placeholder="admin@x-space360.in"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Phone Number</label>
                  <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input 
                      required
                      placeholder="+91 Enter phone number"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                      value={newUser.phone}
                      onChange={e => setNewUser({...newUser, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Password</label>
                <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                  <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showAddPassword ? "text" : "password"} required
                    placeholder="••••••••••••"
                    className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm pr-12"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal transition-colors"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Role</label>
                  <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <select 
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-bold bg-transparent w-full text-xs uppercase tracking-wider appearance-none cursor-pointer pr-10"
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="guest">Guest</option>
                      <option value="host">Host</option>
                      <option value="broker">Broker</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-charcoal-muted">
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">City</label>
                  <div className={`relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all ${isCodeLocked ? 'opacity-50 bg-gray-50/50' : ''}`}>
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <input 
                      required={!isCodeLocked}
                      disabled={isCodeLocked}
                      placeholder="e.g. Mumbai"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm disabled:cursor-not-allowed"
                      value={newUser.city}
                      onChange={e => setNewUser({...newUser, city: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={newUser.role === 'admin' ? "col-span-2" : ""}>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">State</label>
                  <div className={`relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all ${isCodeLocked ? 'opacity-50 bg-gray-50/50' : ''}`}>
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input 
                      required={!isCodeLocked}
                      disabled={isCodeLocked}
                      placeholder="e.g. Maharashtra"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm disabled:cursor-not-allowed"
                      value={newUser.state}
                      onChange={e => setNewUser({...newUser, state: e.target.value})}
                    />
                  </div>
                </div>
                {newUser.role !== 'admin' && (
                  <div>
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Birthdate</label>
                    <PremiumDatePicker 
                      value={newUser.birthdate}
                      onChange={dateStr => setNewUser({...newUser, birthdate: dateStr})}
                      required={newUser.role !== 'admin' && !isCodeLocked}
                      disabled={isCodeLocked}
                      leftIcon={<Calendar className="w-5 h-5" />}
                    />
                  </div>
                )}
              </div>

              {(newUser.role === 'broker' || newUser.role === 'employee') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                    <div>
                      <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Franchise</label>
                      <div className={`relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all ${isCodeLocked ? 'opacity-50 bg-gray-50/50' : ''}`}>
                        <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <input 
                          required={!isCodeLocked}
                          disabled={isCodeLocked}
                          placeholder="e.g. Golden"
                          className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm disabled:cursor-not-allowed"
                          value={newUser.franchise}
                          onChange={e => setNewUser({...newUser, franchise: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Branch</label>
                      <div className={`relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all ${isCodeLocked ? 'opacity-50 bg-gray-50/50' : ''}`}>
                        <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <input 
                          required={!isCodeLocked}
                          disabled={isCodeLocked}
                          placeholder="e.g. Bandra"
                          className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm disabled:cursor-not-allowed"
                          value={newUser.branch}
                          onChange={e => setNewUser({...newUser, branch: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4 animate-slide-up">
                    {newUser.role === 'broker' ? (
                      <div>
                        <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Broker Code</label>
                        <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                          <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                            <Shield className="w-5 h-5" />
                          </div>
                          <input 
                            required
                            placeholder="e.g. BRK12345"
                            className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                            value={newUser.lg_code}
                            onChange={e => setNewUser({...newUser, lg_code: e.target.value})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5">Employee Code</label>
                        <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                          <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70 flex-shrink-0">
                            <Shield className="w-5 h-5" />
                          </div>
                          <input 
                            required
                            placeholder="e.g. EMP98765"
                            className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                            value={newUser.employee_code}
                            onChange={e => setNewUser({...newUser, employee_code: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Dynamic UID Preview Box */}
              <div className="bg-green-50/50 border border-green-200/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-full bg-green-100/60 flex items-center justify-center text-green-700 flex-shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold tracking-wider text-green-700/80 uppercase block mb-0.5">System Generated UID</span>
                      <span className="font-mono font-bold text-sm text-green-700 tracking-wider uppercase block">{newUser.uid || 'GENERATING...'}</span>
                    </div>
                  </div>
                  <span className="border border-green-200 bg-green-100/50 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Secure</span>
                </div>
                <div className="flex items-center space-x-1.5 mt-3 px-1">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[10px] font-bold text-green-700/80">This UID is unique and generated securely by the system.</span>
                </div>
              </div>

              <div className="flex items-center pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-6 py-3 border border-gray-200 hover:border-gray-300 text-charcoal hover:bg-[#FAF9F6] rounded-2xl font-bold transition text-sm flex-1 mr-4"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-[#1A1816] hover:bg-[#2E2A26] text-white py-3.5 rounded-2xl font-bold transition flex items-center justify-center space-x-2 text-sm shadow-md"
                >
                  <UserPlus className="w-4 h-4 text-white/90" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone rounded-[2.5rem] max-w-3xl w-full shadow-elevated animate-scale-up max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            
            {/* Header Area */}
            <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-100 flex-shrink-0 bg-white">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal flex items-center">
                  <User className="w-6 h-6 text-terracotta mr-2" />
                  Edit User Details
                </h3>
                <p className="text-xs text-charcoal-muted font-bold uppercase tracking-widest mt-1">Update network user profile parameters</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)} 
                className="w-10 h-10 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-gray-100"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-modal-scrollbar">
                
                {/* Profile Image Section */}
                <div className="flex flex-col space-y-2">
                  <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Profile Image</span>
                  <div className="flex items-center space-x-6 bg-stone/40 p-4 rounded-2xl border border-gray-100 shadow-subtle">
                    {/* Circular Avatar Preview Container */}
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <div className="w-20 h-20 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shadow-subtle group-hover:opacity-90 transition-all">
                        {editUser.profile_image ? (
                          <img 
                            src={getImageUrl(editUser.profile_image)} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-8 h-8 text-terracotta/50" />
                        )}
                      </div>
                      {/* Plus Button */}
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-terracotta border-2 border-white flex items-center justify-center text-white shadow-subtle group-hover:scale-105 transition-transform">
                        <span className="font-bold text-sm leading-none">+</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 flex-1">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                          className="px-4 py-2 border border-terracotta/30 bg-white text-terracotta rounded-xl font-bold text-xs hover:bg-terracotta/5 transition-colors uppercase tracking-wider"
                        >
                          Choose File
                        </button>
                        <span className="text-xs text-charcoal-muted font-medium truncate max-w-[200px]">
                          {editUser.profile_image ? "Image successfully registered" : "No file chosen"}
                        </span>
                        {editUser.profile_image && (
                          <button
                            type="button"
                            onClick={() => setEditUser(prev => ({ ...prev, profile_image: '' }))}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      {uploading ? (
                        <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest animate-pulse">Uploading to node server...</span>
                      ) : (
                        <span className="text-[9px] font-medium text-charcoal-muted">Supported formats: PNG, JPG, JPEG, WEBP, GIF (Max 8MB)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Full Name</label>
                  <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                      <User className="w-5 h-5" />
                    </div>
                    <input 
                      required
                      placeholder="John Doe"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                      value={editUser.full_name || ''}
                      onChange={e => setEditUser({...editUser, full_name: e.target.value})}
                    />
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Email Address</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input 
                        type="email" required
                        placeholder="john@example.com"
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.email || ''}
                        onChange={e => setEditUser({...editUser, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Phone Number</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input 
                        required
                        placeholder="+91..."
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.phone || ''}
                        onChange={e => setEditUser({...editUser, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Password (Leave blank to keep unchanged)</label>
                  <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                    <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm pr-12"
                      value={editUser.password || ''}
                      onChange={e => setEditUser({...editUser, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-charcoal-muted hover:text-charcoal transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Role & City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Role</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <User className="w-5 h-5" />
                      </div>
                      <select 
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-bold bg-transparent w-full text-xs uppercase tracking-wider appearance-none cursor-pointer pr-10"
                        value={editUser.role || 'guest'}
                        onChange={e => setEditUser({...editUser, role: e.target.value})}
                      >
                        <option value="guest">Guest</option>
                        <option value="host">Host</option>
                        <option value="broker">Broker</option>
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="absolute right-4 pointer-events-none text-charcoal-muted">
                        <ChevronRight className="w-4 h-4 transform rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">City</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input 
                        required
                        placeholder="e.g. Mumbai"
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.city || ''}
                        onChange={e => setEditUser({...editUser, city: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* State & Birthdate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">State</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <select 
                        required
                        className="flex-1 px-4 py-3 outline-none text-[#1A1A1A] font-semibold bg-transparent w-full text-sm appearance-none cursor-pointer pr-10"
                        value={editUser.state || ''}
                        onChange={e => setEditUser({...editUser, state: e.target.value})}
                      >
                        <option value="" disabled>Select State</option>
                        {INDIAN_STATES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 pointer-events-none text-charcoal-muted">
                        <ChevronRight className="w-4 h-4 transform rotate-90" />
                      </div>
                    </div>
                  </div>

                  {editUser.role !== 'admin' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Birthdate</label>
                      <PremiumDatePicker 
                        value={editUser.birthdate ? editUser.birthdate.substring(0, 10) : ''}
                        onChange={dateStr => setEditUser({...editUser, birthdate: dateStr})}
                        required={editUser.role !== 'admin'}
                      />
                    </div>
                  )}
                </div>

                {/* Franchise & Branch (Conditional) */}
                {(editUser.role === 'broker' || editUser.role === 'employee') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Franchise</label>
                      <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <input 
                          required
                          placeholder="e.g. Golden"
                          className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                          value={editUser.franchise || ''}
                          onChange={e => setEditUser({...editUser, franchise: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Branch</label>
                      <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                        <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <input 
                          required
                          placeholder="e.g. Bandra"
                          className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                          value={editUser.branch || ''}
                          onChange={e => setEditUser({...editUser, branch: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* LG Code (Conditional) */}
                {editUser.role === 'host' && (
                  <div className="space-y-1 animate-slide-up">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">LG Code (Assigned Broker)</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input 
                        placeholder="e.g. MH01BUM001"
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.lg_code || ''}
                        onChange={e => setEditUser({...editUser, lg_code: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {editUser.role === 'broker' && (
                  <div className="space-y-1 animate-slide-up">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Broker Code</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input 
                        required
                        placeholder="e.g. BRK12345"
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.lg_code || ''}
                        onChange={e => setEditUser({...editUser, lg_code: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {editUser.role === 'employee' && (
                  <div className="space-y-1 animate-slide-up">
                    <label className="text-xs font-bold text-charcoal-muted uppercase tracking-widest block">Employee Code</label>
                    <div className="relative flex items-center border border-gray-200/80 rounded-2xl overflow-hidden focus-within:border-terracotta bg-white focus-within:shadow-subtle transition-all">
                      <div className="flex items-center justify-center w-12 h-12 bg-stone/40 border-r border-gray-100 text-terracotta/70">
                        <Shield className="w-5 h-5" />
                      </div>
                      <input 
                        required
                        placeholder="e.g. EMP98765"
                        className="flex-1 px-4 py-3 outline-none text-charcoal font-semibold placeholder:font-normal placeholder:text-gray-300 bg-transparent w-full text-sm"
                        value={editUser.employee_code || ''}
                        onChange={e => setEditUser({...editUser, employee_code: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {/* Info Banner Note */}
                <div className="bg-terracotta/5 border border-terracotta/10 rounded-2xl p-4 flex items-center space-x-3 text-xs text-terracotta font-semibold">
                  <Info className="w-5 h-5 text-terracotta flex-shrink-0" />
                  <span>Note: Ensure all information is accurate before saving changes.</span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 p-8 border-t border-gray-100/50 bg-stone/30 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold tracking-widest uppercase text-charcoal-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center space-x-2 shadow-subtle"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-white rounded-3xl p-8 w-full shadow-premium animate-slide-up overflow-y-auto max-h-[90vh] ${
            viewUser.role === 'host' ? 'max-w-4xl' : 'max-w-md'
          }`}>
            
            {viewUser.role === 'host' ? (
              // Enhanced Host KYC Review Dashboard
              <div>
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
                  <div className="flex items-center space-x-4">
                    {viewUser.profile_image ? (
                      <img
                        src={getImageUrl(viewUser.profile_image)}
                        alt={viewUser.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-terracotta/10 border-2 border-gray-100 flex items-center justify-center font-bold tracking-tight text-terracotta text-xl uppercase">
                        {viewUser.full_name ? viewUser.full_name.charAt(0) : '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-charcoal">{viewUser.full_name}</h3>
                      <p className="text-xs text-charcoal-muted uppercase tracking-widest font-bold">Host KYC Review Dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {viewUser.kyc_status === 'approved' ? (
                      <span className="px-4 py-2 bg-green-50 text-green-600 rounded-full font-bold tracking-tight text-xs uppercase tracking-widest border border-green-200">Approved</span>
                    ) : viewUser.kyc_status === 'rejected' ? (
                      <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold tracking-tight text-xs uppercase tracking-widest border border-red-200">Rejected</span>
                    ) : viewUser.kyc_status === 'pending' ? (
                      <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-full font-bold tracking-tight text-xs uppercase tracking-widest border border-amber-200 animate-pulse">Pending Review</span>
                    ) : (
                      <span className="px-4 py-2 bg-gray-50 text-charcoal-light rounded-full font-bold tracking-tight text-xs uppercase tracking-widest border border-gray-100">Unverified</span>
                    )}
                    
                    <button
                      onClick={() => setViewUser(null)}
                      className="p-2 hover:bg-gray-50 rounded-full text-charcoal-light hover:text-charcoal transition-colors border border-gray-100 flex items-center justify-center"
                      title="Back to List"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Host Details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest border-b border-sand-100 pb-2">Host Information</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Email</p>
                        <p className="text-sm font-bold text-charcoal break-all">{viewUser.email}</p>
                      </div>
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Phone</p>
                        <p className="text-sm font-bold text-charcoal">{viewUser.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Location</p>
                        <p className="text-sm font-bold text-charcoal">{viewUser.city || 'Not specified'}, {viewUser.state || ''}</p>
                      </div>
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-sm font-bold ${viewUser.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {viewUser.is_active ? 'Active Account' : 'Inactive Account'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Host User ID</p>
                        <p className="text-xs font-mono text-charcoal-light break-all">{getDisplayUID(viewUser)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-stone rounded-2xl">
                          <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Broker Code</p>
                          <p className="text-xs font-mono font-bold text-terracotta break-all">{getHostBrokerCode(viewUser)}</p>
                        </div>
                        <div className="p-4 bg-stone rounded-2xl">
                          <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Employee Code</p>
                          <p className="text-xs font-mono font-bold text-terracotta break-all">{getHostEmployeeCode(viewUser)}</p>
                        </div>
                      </div>
                    </div>

                    {viewUser.role === 'host' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-stone rounded-2xl">
                          <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Assigned Broker</p>
                          <div className="flex flex-col space-y-2 mt-2">
                            <select 
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-bold text-charcoal"
                              value={viewUser.broker_id || getAssignedBroker(viewUser)?.user_id || ''}
                              onChange={(e) => handleAssignBroker(viewUser.user_id, e.target.value)}
                            >
                              <option value="">-- Assign a Broker --</option>
                              {allBrokers.map(b => (
                                <option key={b.user_id} value={b.user_id}>
                                  {b.full_name} ({b.lg_code || b.user_id})
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] font-bold text-terracotta mt-1 tracking-widest uppercase">
                              Broker Code: {getHostBrokerCode(viewUser)}
                            </p>
                            {viewUser.broker_id && (
                              <p className="text-[10px] font-mono font-semibold text-charcoal-light break-all">
                                Broker ID: {viewUser.broker_id}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-4 bg-stone rounded-2xl">
                          <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Assigned Employee</p>
                          <div className="flex flex-col space-y-2 mt-2">
                            <select 
                              className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-bold text-charcoal"
                              value={viewUser.rm_id || getAssignedEmployee(viewUser)?.user_id || ''}
                              onChange={(e) => handleAssignRM(viewUser.user_id, e.target.value)}
                            >
                              <option value="">-- Assign an Employee --</option>
                              {allEmployees.map(emp => (
                                <option key={emp.user_id} value={emp.user_id}>
                                  {emp.full_name} ({emp.employee_code || emp.user_id})
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] font-bold text-terracotta mt-1 tracking-widest uppercase">
                              Employee Code: {getHostEmployeeCode(viewUser)}
                            </p>
                            {viewUser.rm_id && (
                              <p className="text-[10px] font-mono font-semibold text-charcoal-light break-all">
                                Employee ID: {viewUser.rm_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {viewUser.role === 'broker' && (
                      <div className="p-4 bg-stone rounded-2xl">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Assigned RM (Relationship Manager)</p>
                        <div className="flex flex-col space-y-2 mt-2">
                          <select 
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-bold text-charcoal"
                            value={viewUser.rm_id || ''}
                            onChange={(e) => handleAssignRM(viewUser.user_id, e.target.value)}
                          >
                            <option value="">-- Assign an RM --</option>
                            {allEmployees.map(rm => (
                              <option key={rm.user_id} value={rm.user_id}>
                                {rm.full_name} ({rm.user_id})
                              </option>
                            ))}
                          </select>
                          {viewUser.rm_id && (
                            <p className="text-[10px] font-bold text-terracotta mt-1 tracking-widest uppercase">
                              RM ID: {viewUser.rm_id}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {viewUser.kyc_remarks && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
                        <p className="font-bold tracking-tight uppercase tracking-wider text-[10px] mb-1">Rejection Remarks</p>
                        <p>{viewUser.kyc_remarks}</p>
                      </div>
                    )}

                    <div className="p-4 bg-stone rounded-2xl">
                      <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Joined On</p>
                      <p className="text-sm font-bold text-charcoal">
                        {new Date(viewUser.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: KYC Uploads & Agreement */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest border-b border-sand-100 pb-2">Uploaded Verification Documents</h4>
                    
                    {viewUser.kyc_documents && viewUser.kyc_documents.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {viewUser.kyc_documents.map((doc, idx) => (
                          <div key={idx} className="p-4 bg-stone/50 border border-gray-100 rounded-2xl flex flex-col justify-between space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] font-bold tracking-tight text-terracotta uppercase tracking-wider">Document</span>
                                <h5 className="font-bold text-charcoal text-xs mt-0.5 capitalize">{doc.document_type.replace('_', ' ')}</h5>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-tight uppercase tracking-widest ${
                                doc.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-200' :
                                doc.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                                'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                              }`}>
                                {doc.status || 'pending'}
                              </span>
                            </div>
                            
                            {doc.status === 'rejected' && doc.rejection_reason && (
                              <div className="text-[10px] text-red-600 bg-red-50/50 p-2 rounded-xl border border-red-100 leading-normal">
                                <span className="font-bold tracking-tight uppercase tracking-wider text-[8px] block mb-0.5">Reason:</span>
                                {doc.rejection_reason}
                              </div>
                            )}
                            
                            {doc.document_type === 'gst_number' ? (
                              <p className="text-xs font-mono bg-white p-2 rounded-xl border border-gray-100 text-center font-bold text-charcoal">{doc.document_url}</p>
                            ) : (
                              <a
                                href={getImageUrl(doc.document_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2 bg-charcoal hover:bg-terracotta text-white rounded-xl text-[9px] font-bold tracking-tight uppercase tracking-widest text-center transition-colors block"
                              >
                                View File
                              </a>
                            )}

                            {viewUser.kyc_status !== 'approved' && (
                            <div className="flex gap-2 pt-2 border-t border-sand-100">
                              <button
                                type="button"
                                onClick={() => handleUpdateDocumentStatus(viewUser.user_id, doc.document_type, 'approved')}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold tracking-tight uppercase tracking-widest transition-all ${
                                  doc.status === 'approved'
                                    ? 'bg-green-600 text-white cursor-default'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                }`}
                                disabled={doc.status === 'approved'}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectDocState({ userId: viewUser.user_id, documentType: doc.document_type, reason: '' })}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold tracking-tight uppercase tracking-widest transition-all ${
                                  doc.status === 'rejected'
                                    ? 'bg-red-600 text-white cursor-default'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                }`}
                                disabled={doc.status === 'rejected'}
                              >
                                Reject
                              </button>
                            </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-stone rounded-2xl border border-dashed border-gray-200">
                        <p className="text-xs text-charcoal-muted font-bold">No documents submitted yet.</p>
                      </div>
                    )}

                    {viewUser.agreement_signature && (
                      <div className="p-5 bg-stone/50 border border-gray-100 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-bold tracking-tight text-charcoal uppercase tracking-widest border-b border-sand-100 pb-1">GR & Owner Agreement</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Owner Name</span>
                            <span className="font-bold text-charcoal">{viewUser.agreement_owner_name}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-charcoal-muted uppercase block">Signed On</span>
                            <span className="font-bold text-charcoal">
                              {viewUser.agreement_signed_at ? new Date(viewUser.agreement_signed_at).toLocaleDateString('en-IN') : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] mt-2">
                          <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1">Agreement Signature</span>
                          <div className="bg-white border border-gray-100 p-3 rounded-xl flex items-center justify-center h-20 shadow-inner">
                            <img src={getImageUrl(viewUser.agreement_signature)} alt="Drawn Signature" className="max-h-16 object-contain" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KYC Actions Row */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {viewUser.role === 'host' && viewUser.kyc_status !== 'approved' ? (
                    <>
                      <div className="text-xs text-charcoal-muted font-bold">
                        ⚠️ Verify all documents and signature against local guidelines before approval.
                      </div>
                      <div className="flex space-x-3 w-full sm:w-auto">
                        <button
                          onClick={() => handleRejectKYC(viewUser.user_id)}
                          className="flex-1 sm:flex-none px-6 py-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-bold tracking-tight text-xs uppercase tracking-widest transition-colors"
                        >
                          Reject KYC
                        </button>
                        <button
                          onClick={() => handleApproveKYC(viewUser.user_id)}
                          className="flex-1 sm:flex-none px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold tracking-tight text-xs uppercase tracking-widest transition-all shadow-subtle"
                        >
                          Approve KYC & Go Live
                        </button>
                      </div>
                    </>
                  ) : viewUser.role === 'host' ? (
                    <>
                      <div className="text-xs text-green-700 font-bold">
                        KYC is already approved. Review actions are disabled.
                      </div>
                      <button onClick={() => setViewUser(null)} className="w-full sm:w-auto btn-premium py-4 px-8">
                        Close Inspection Details
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setViewUser(null)} className="w-full btn-premium py-4">Close Inspection Details</button>
                  )}
                </div>
              </div>
            ) : (
              // Standard Guest / Broker / Admin Detail View
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setViewUser(null)}
                    className="w-8 h-8 rounded-full text-charcoal-light hover:text-charcoal hover:bg-gray-50 border border-gray-100 flex items-center justify-center transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col items-center mb-6">
                  {viewUser.profile_image ? (
                    <img
                      src={getImageUrl(viewUser.profile_image)}
                      alt={viewUser.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-sand-100 mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-terracotta/10 border-4 border-sand-100 flex items-center justify-center font-bold tracking-tight text-terracotta text-3xl uppercase mb-4">
                      {viewUser.full_name ? viewUser.full_name.charAt(0) : '?'}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal">{viewUser.full_name}</h3>
                  <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-terracotta/10 text-terracotta text-xs font-bold tracking-tight uppercase tracking-widest rounded-full mt-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{viewUser.role} Account</span>
                  </span>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-terracotta" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Email</p>
                        <p className="text-sm font-bold text-charcoal break-all truncate" title={viewUser.email}>{viewUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-terracotta" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Phone</p>
                        <p className="text-sm font-bold text-charcoal truncate">{viewUser.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-terracotta" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Location</p>
                        <p className="text-sm font-bold text-charcoal truncate">{viewUser.city || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                        <span className={`w-3.5 h-3.5 rounded-full ${viewUser.is_active ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Status</p>
                        <p className={`text-sm font-bold ${viewUser.is_active ? 'text-green-600' : 'text-red-600'} truncate`}>
                          {viewUser.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-terracotta" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">User ID</p>
                      <p className="text-sm font-bold text-charcoal truncate">{getDisplayUID(viewUser)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-terracotta" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Joined On</p>
                      <p className="text-sm font-bold text-charcoal truncate">
                        {new Date(viewUser.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {(viewUser.role === 'broker' || viewUser.role === 'employee') && (
                    <>
                      {viewUser.franchise && (
                        <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-terracotta" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Franchise</p>
                            <p className="text-sm font-bold text-charcoal truncate">{viewUser.franchise}</p>
                          </div>
                        </div>
                      )}
                      {viewUser.branch && (
                        <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-terracotta" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Branch</p>
                            <p className="text-sm font-bold text-charcoal truncate">{viewUser.branch}</p>
                          </div>
                        </div>
                      )}
                      {viewUser.role === 'broker' && viewUser.lg_code && (
                        <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-terracotta" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Broker Code</p>
                            <p className="text-sm font-bold text-charcoal truncate">{viewUser.lg_code}</p>
                          </div>
                        </div>
                      )}
                      {viewUser.role === 'employee' && viewUser.employee_code && (
                        <div className="flex items-center space-x-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-terracotta" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-0.5">Employee Code</p>
                            <p className="text-sm font-bold text-charcoal truncate">{viewUser.employee_code}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Administrative Access Notice */}
                <div className="flex items-start space-x-2.5 py-3 px-2 border-t border-gray-100 mt-5">
                  <Shield className="w-4 h-4 text-terracotta/80 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-charcoal-muted font-medium">
                    {viewUser.role === 'admin' && "This account has administrative access to the system."}
                    {viewUser.role === 'broker' && "This account has broker privileges on the platform."}
                    {viewUser.role === 'employee' && "This account has employee/RM permissions on the platform."}
                    {viewUser.role === 'host' && "This account is registered as a host on the platform."}
                    {viewUser.role === 'guest' && "This account has standard guest privileges."}
                  </p>
                </div>
                
                <button
                  onClick={() => setViewUser(null)}
                  className="w-full bg-[#1A1816] hover:bg-[#2E2A26] text-white py-3.5 rounded-2xl font-bold transition flex items-center justify-center space-x-2 text-sm shadow-md mt-6"
                >
                  <XCircle className="w-4.5 h-4.5 text-white/95" />
                  <span>Close Details</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject KYC Document Reason Modal */}
      {rejectDocState && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-premium animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold tracking-tight text-charcoal">Reject Document</h4>
              <button 
                onClick={() => setRejectDocState(null)} 
                className="p-1.5 hover:bg-gray-50 rounded-lg text-charcoal-light hover:text-charcoal transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-charcoal-muted mb-4">
              Please specify a reason for rejecting the <strong className="capitalize">{rejectDocState.documentType.replace('_', ' ')}</strong> document.
            </p>
            
            <textarea
              required
              placeholder="e.g. Document is blurred or expired"
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300 min-h-[80px]"
              value={rejectDocState.reason || ''}
              onChange={e => setRejectDocState({ ...rejectDocState, reason: e.target.value })}
            />
            
            <div className="flex space-x-3 mt-5">
              <button 
                type="button" 
                onClick={() => setRejectDocState(null)} 
                className="flex-1 py-3 font-bold tracking-tight text-[10px] text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  if (!rejectDocState.reason || !rejectDocState.reason.trim()) {
                    alert('Rejection reason is required.');
                    return;
                  }
                  await handleUpdateDocumentStatus(
                    rejectDocState.userId,
                    rejectDocState.documentType,
                    'rejected',
                    rejectDocState.reason
                  );
                  setRejectDocState(null);
                }}
                className="flex-1 btn-premium bg-red-600 hover:bg-red-700 border-red-600 py-3 shadow-elevated text-white font-bold tracking-tight text-[10px] uppercase tracking-widest"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Property Moderation Component
const PropertyModeration = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('awaiting_final_approval');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [activeReviewProperty, setActiveReviewProperty] = useState(null);
  const [adminChecklist, setAdminChecklist] = useState({});
  const [propertyRejectionState, setPropertyRejectionState] = useState(null);

  const CHECKLIST_LABELS = {
    address_matches_gps: "Address Matches GPS Location",
    structural_condition_good: "Structural Condition is Good",
    amenities_verified: "Amenities are Verified",
    compliance_docs_present: "Compliance Documents Present",
    all_rooms_photographed: "All Rooms Photographed",
    entrance_photographed: "Entrance Photographed",
    video_walkthrough_uploaded: "Video Walkthrough Uploaded",
    no_discrepancies: "No Physical Discrepancies"
  };

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1); // Reset page on filter change
    if (statusFilter === 'awaiting_final_approval') {
      fetchAwaitingFinalApproval();
    } else if (statusFilter === 'pending_verification') {
      fetchPendingProperties();
    } else {
      fetchAllProperties();
    }
  }, [statusFilter]);

  const refresh = () => {
    if (statusFilter === 'awaiting_final_approval') fetchAwaitingFinalApproval();
    else if (statusFilter === 'pending_verification') fetchPendingProperties();
    else fetchAllProperties();
  };

  const fetchAwaitingFinalApproval = async () => {
    try {
      const response = await verificationAPI.listAwaitingFinalApproval();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching awaiting-final-approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProperties = async () => {
    try {
      const response = await verificationAPI.listPendingForAdmin();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching pending properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProperties = async () => {
    try {
      const params = statusFilter && statusFilter !== 'all' ? { status_filter: statusFilter } : {};
      const response = await apiClient.get('/admin/properties', { params });
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVerificationDetails = (property) => {
    setActiveReviewProperty(property);
    setAdminChecklist(property.checklist || {
      address_matches_gps: false,
      structural_condition_good: false,
      amenities_verified: false,
      compliance_docs_present: false,
      all_rooms_photographed: false,
      entrance_photographed: false,
      video_walkthrough_uploaded: false,
      no_discrepancies: false
    });
  };

  const handleFinalApprove = async (propertyId) => {
    try {
      await verificationAPI.adminApprove(propertyId, { checklist: adminChecklist });
      alert('Property approved and is now LIVE!');
      refresh();
      setActiveReviewProperty(null);
    } catch (error) {
      console.error('Error approving property:', error);
      const msg = error?.response?.data?.detail || 'Failed to approve property';
      alert(msg);
    }
  };

  const rejectProperty = (propertyId) => {
    setPropertyRejectionState({ propertyId, reason: '' });
  };

  const handleRejectPropertySubmit = async (propertyId, reason) => {
    try {
      await verificationAPI.adminReject(propertyId, reason);
      alert('Property rejected successfully');
      refresh();
      setActiveReviewProperty(null);
    } catch (error) {
      console.error('Error rejecting property:', error);
      const msg = error?.response?.data?.detail || 'Failed to reject property';
      alert(msg);
    }
  };

  const canActOn = (property) => {
    return statusFilter === 'awaiting_final_approval';
  };

  return (
    <div data-testid="property-moderation">
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-charcoal">Property Moderation</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-64"
            data-testid="status-filter"
          >
            <option value="awaiting_final_approval">Awaiting Final Approval (RM-approved)</option>
            <option value="pending_verification">Pending Verification (broker queue)</option>
            <option value="all">All Properties</option>
            <option value="live">Live</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading properties...</p>
        </div>
      ) : properties.length > 0 ? (
        <div data-testid="properties-list">
          <div className="space-y-4">
            {[...properties]
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((property) => (
              <div key={property.property_id} className="bg-white border border-[#F3F4F6] rounded-[24px] p-5 shadow-sm hover:shadow-subtle transition-all mb-4" data-testid={`property-${property.property_id}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-5 flex-1 min-w-0">
                    <img
                      src={property.images?.[0] || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                      alt={property.title}
                      className="w-20 h-20 rounded-[18px] object-cover shadow-sm flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1F2937] text-base leading-snug truncate">{property.title}</h4>
                      <p className="text-[10px] text-[#6B7280] font-mono mt-1 truncate" title={property.property_id}>
                        Property ID: {property.property_id}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-1 font-medium truncate">
                        {property.city} | {formatDisplayLabel(property.bhk_type)} | {formatCategoryLabel(property.category)}
                      </p>
                      <div className="flex items-center mt-2.5">
                        <span className="text-sm font-bold text-terracotta">₹{property.price_per_night}</span>
                        <span className="text-[11px] text-[#6B7280] ml-0.5">/night</span>
                        <span
                          className={`ml-3 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight uppercase tracking-wider ${
                            property.status === 'live' ? 'bg-[#ECFDF5] text-[#10B981]' :
                            property.status === 'under_review' ? 'bg-[#DBEAFE] text-[#2563EB]' :
                            property.status === 'pending_verification' ? 'bg-[#FEF3C7] text-[#D97706]' :
                            property.status === 'rejected' ? 'bg-[#FEE2E2] text-[#EF4444]' :
                            'bg-[#F3F4F6] text-[#4B5563]'
                          }`}
                        >
                          {property.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 flex-wrap justify-start md:justify-end">
                    <button
                      onClick={() => navigate(`/property/${property.property_id}`)}
                      className="flex items-center space-x-1.5 px-4 py-2 border border-[#E5E7EB] text-[#4B5563] bg-white rounded-full font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
                      title="View property"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => navigate(`/host/list-property?edit=${property.property_id}`)}
                      className="flex items-center space-x-1.5 px-4 py-2 border border-[#DBEAFE] text-[#2563EB] bg-[#EFF6FF] rounded-full font-bold text-xs hover:bg-[#DBEAFE]/80 transition-all shadow-sm"
                      title="Edit property"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {canActOn(property) && (
                      <>
                        <button
                          onClick={() => openVerificationDetails(property)}
                          className="flex items-center space-x-1.5 px-4 py-2 border border-[#BBF7D0] text-[#15803D] bg-[#DCFCE7] rounded-full font-bold text-xs hover:bg-[#BBF7D0]/80 transition-all shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verify & Approve</span>
                        </button>
                        <button
                          onClick={() => rejectProperty(property.property_id)}
                          className="flex items-center space-x-1.5 px-4 py-2 border border-[#FEE2E2] text-[#EF4444] bg-[#FEF2F2] rounded-full font-bold text-xs hover:bg-[#FEE2E2]/80 transition-all shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {properties.length > itemsPerPage && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-charcoal">
                Page {currentPage} of {Math.ceil(properties.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(properties.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(properties.length / itemsPerPage)}
                className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Building2 className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No properties in this queue</p>
        </div>
      )}

      {/* Verification Details Modal for Admin Checklist Audit */}
      {activeReviewProperty && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-premium animate-slide-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal">{activeReviewProperty.title}</h3>
                <p className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mt-1">
                  Property Audit & Compliance Verification
                </p>
              </div>
              <button 
                onClick={() => setActiveReviewProperty(null)}
                className="text-charcoal-muted hover:text-charcoal transition-all text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Basic Info & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1.5">Property Details</p>
                <p className="font-mono text-xs font-bold text-charcoal break-all" title={activeReviewProperty.property_id || ''}>
                  Property ID: {activeReviewProperty.property_id || 'N/A'}
                </p>
                <p className="font-mono text-[10px] text-charcoal-light mt-1 break-all" title={activeReviewProperty.owner_id || ''}>
                  Host ID: {activeReviewProperty.owner_id || 'N/A'}
                </p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1.5">Assigned RM Details</p>
                <p className="font-mono text-[10px] font-bold text-charcoal break-all" title={activeReviewProperty.rm_id || ''}>RM ID: {activeReviewProperty.rm_id || 'N/A'}</p>
                <p className="text-xs text-charcoal-light mt-1">RM Remarks: "{activeReviewProperty.rm_remarks || 'No remarks provided'}"</p>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1.5">Field Intelligence (Broker)</p>
                <p className="font-mono text-[10px] font-bold text-charcoal break-all" title={activeReviewProperty.broker_id || ''}>Broker ID: {activeReviewProperty.broker_id || 'N/A'}</p>
                <p className="text-xs text-charcoal-light mt-1">Broker Remarks: "{activeReviewProperty.broker_remarks || 'No remarks provided'}"</p>
              </div>
            </div>

            {/* Property Images Gallery */}
            {activeReviewProperty.images && activeReviewProperty.images.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Property Images</p>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sand-300">
                  {activeReviewProperty.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={getImageUrl(img)} 
                      alt={`Property Image ${idx + 1}`} 
                      className="w-40 h-28 object-cover rounded-xl border border-gray-100 shadow-sm flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Info */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-3">Listing Details</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">Category</span>
                  <span className="font-bold text-charcoal text-xs">{formatCategoryLabel(activeReviewProperty.category) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">BHK Type</span>
                  <span className="font-bold text-charcoal text-xs">{formatDisplayLabel(activeReviewProperty.bhk_type) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">Price per Night</span>
                  <span className="font-bold text-terracotta text-sm">₹{activeReviewProperty.price_per_night || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">Location</span>
                  <span className="font-bold text-charcoal text-xs">{activeReviewProperty.city || 'N/A'}, {activeReviewProperty.state || ''}</span>
                </div>
              </div>

              {activeReviewProperty.address && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">Full Address</span>
                  <span className="text-xs font-semibold text-charcoal-light">{activeReviewProperty.address}</span>
                </div>
              )}

              {activeReviewProperty.description && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-0.5">Description</span>
                  <p className="text-xs text-charcoal-light leading-relaxed whitespace-pre-wrap">{formatReadableText(activeReviewProperty.description)}</p>
                </div>
              )}

              {activeReviewProperty.amenities && activeReviewProperty.amenities.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase block mb-1.5">Amenities</span>
                  <div className="flex flex-wrap gap-1">
                    {activeReviewProperty.amenities.map((amenity, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-gray-50 text-charcoal text-[10px] font-semibold rounded-md border border-gray-100">
                        {formatDisplayLabel(amenity)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evidence Video Link */}
            {activeReviewProperty.video_url && (
              <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Walkthrough Video</p>
                  <span className="text-xs text-charcoal-light font-semibold">RM uploaded evidence walkthrough video</span>
                </div>
                <a 
                  href={activeReviewProperty.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-terracotta/10 text-terracotta rounded-xl text-xs font-bold hover:bg-terracotta/20 transition-all flex items-center space-x-1"
                >
                  <span>🎥 Watch Video</span>
                </a>
              </div>
            )}

            {/* Compliance Checklist Item Review */}
            <div className="mb-6">
              <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-4">Compliance Checklist Audit</h4>
              <div className="space-y-3">
                {Object.keys(CHECKLIST_LABELS).map((key) => {
                  const brokerRMVal = activeReviewProperty.checklist?.[key];
                  const adminVal = adminChecklist[key];
                  return (
                    <div key={key} className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-2xl hover:shadow-sm transition-all animate-fade-in">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-bold text-charcoal">{CHECKLIST_LABELS[key]}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Broker Verdict:</span>
                          <span className={`text-[10px] font-bold tracking-tight uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                            brokerRMVal 
                              ? 'bg-[#ECFDF5] text-[#10B981]' 
                              : 'bg-[#FEF2F2] text-[#EF4444]'
                          }`}>
                            <span>{brokerRMVal ? '✔' : '✘'}</span>
                            <span>{brokerRMVal ? 'Compliant' : 'Deficient'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Admin Verification Switch */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setAdminChecklist({ ...adminChecklist, [key]: true })}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                            adminVal === true
                              ? 'bg-[#10B981] text-white border border-[#10B981] shadow-sm'
                              : 'bg-white text-[#10B981] border border-[#10B981] hover:bg-[#10B981] hover:text-white'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminChecklist({ ...adminChecklist, [key]: false })}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                            adminVal === false
                              ? 'bg-[#EF4444] text-white border border-[#EF4444] shadow-sm'
                              : 'bg-white text-[#EF4444] border border-[#E5E7EB] hover:bg-[#EF4444] hover:text-white'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence Photos */}
            {activeReviewProperty.geo_tagged_photos && activeReviewProperty.geo_tagged_photos.length > 0 && (
              <div className="mb-8">
                <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-4">Geo-Tagged Evidence Photos</h4>
                <div className="grid grid-cols-2 gap-4">
                  {activeReviewProperty.geo_tagged_photos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border border-[#E5E7EB] bg-white p-3 shadow-sm">
                      <img 
                        src={getImageUrl(photo.photo_url)} 
                        alt={photo.description || 'Evidence Photo'} 
                        className="w-full h-36 object-cover rounded-xl"
                      />
                      <div className="mt-3">
                        <p className="text-xs font-bold text-charcoal truncate">{photo.description || 'Verified Site View'}</p>
                        <p className="text-[10px] text-charcoal-muted font-bold mt-1">LAT: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB] mt-6">
              <button 
                type="button" 
                onClick={() => setActiveReviewProperty(null)} 
                className="font-bold text-xs text-charcoal-muted hover:text-charcoal uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <div className="flex items-center space-x-4">
                <button 
                  type="button" 
                  onClick={() => rejectProperty(activeReviewProperty.property_id)} 
                  className="font-bold text-xs text-[#EF4444] hover:text-[#DC2626] uppercase tracking-widest transition-all px-4 py-2 hover:bg-red-50 rounded-lg"
                >
                  Reject Listing
                </button>
                <button 
                  type="button" 
                  onClick={() => handleFinalApprove(activeReviewProperty.property_id)} 
                  className="px-6 py-3.5 bg-[#9A3412] hover:bg-[#7C2D12] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-subtle hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  Approve & Go Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Rejection Reason Modal */}
      {propertyRejectionState && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-premium animate-slide-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h4 className="text-lg font-bold tracking-tight text-charcoal">Reject Property Listing</h4>
              <button 
                onClick={() => setPropertyRejectionState(null)} 
                className="p-1.5 hover:bg-gray-50 rounded-lg text-charcoal-light hover:text-charcoal transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-charcoal-muted mb-4">
              Please specify a reason for rejecting this property listing. This reason will be shared with the broker and Relationship Manager.
            </p>
            
            <textarea
              required
              placeholder="e.g. Incomplete verification documents or incorrect geo-coordinates"
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm focus:border-terracotta outline-none transition font-semibold text-charcoal placeholder:font-normal placeholder:text-sand-300 min-h-[80px]"
              value={propertyRejectionState.reason || ''}
              onChange={e => setPropertyRejectionState({ ...propertyRejectionState, reason: e.target.value })}
            />
            
            <div className="flex space-x-3 mt-5">
              <button 
                type="button" 
                onClick={() => setPropertyRejectionState(null)} 
                className="flex-1 py-3 font-bold tracking-tight text-[10px] text-charcoal-muted uppercase tracking-widest hover:text-charcoal transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  if (!propertyRejectionState.reason || !propertyRejectionState.reason.trim()) {
                    alert('Rejection reason is required.');
                    return;
                  }
                  await handleRejectPropertySubmit(
                    propertyRejectionState.propertyId,
                    propertyRejectionState.reason
                  );
                  setPropertyRejectionState(null);
                }}
                className="flex-1 btn-premium bg-red-600 hover:bg-red-700 border-red-600 py-3 shadow-elevated text-white font-bold tracking-tight text-[10px] uppercase tracking-widest"
              >
                Reject Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Booking Management Component
export const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const response = await bookingAPI.adminGetBookings(params);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'soft_lock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div data-testid="booking-management">
      <div className="dashboard-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-charcoal">Booking Management</h3>
            <p className="text-sm text-charcoal-light mt-1">
              View and manage all short-term rental bookings on the platform
            </p>
          </div>
          <div className="flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-48"
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="soft_lock">Soft Lock</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading bookings...</p>
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6" data-testid="bookings-list">
          {bookings.map((booking) => (
            <div
              key={booking.booking_id}
              className="dashboard-card hover:shadow-subtle transition-all border border-gray-100"
              data-testid={`booking-${booking.booking_id}`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                      Booking ID
                    </span>
                    <span className="font-mono font-bold tracking-tight text-charcoal tracking-wide text-sm">
                      {booking.booking_id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <span className="text-xs text-charcoal-muted">
                    Booked on: {formatDate(booking.created_at)}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-bold tracking-tight uppercase tracking-wider rounded-full border ${getStatusColor(
                      booking.booking_status
                    )}`}
                  >
                    {booking.booking_status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Section 1: Property Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
                    Property Details
                  </h4>
                  {booking.property ? (
                    <div className="flex items-start space-x-3">
                      {booking.property.images?.[0] ? (
                        <img
                          src={getImageUrl(booking.property.images[0])}
                          alt={booking.property.title}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-sage/10 border border-gray-100 flex items-center justify-center text-sage font-bold">
                          STR
                        </div>
                      )}
                      <div>
                        <h5 className="font-bold text-charcoal text-sm leading-snug line-clamp-1">
                          {booking.property.title}
                        </h5>
                        <p className="text-xs text-charcoal-light">
                          {booking.property.city}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-50 text-charcoal-muted text-[9px] font-bold tracking-tight uppercase rounded">
                            {booking.property.bhk_type}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 bg-gray-50 text-charcoal-muted text-[9px] font-bold tracking-tight uppercase rounded">
                            {formatCategoryLabel(booking.property.category)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-charcoal-muted italic">
                      Property details unavailable (ID: {booking.property_id})
                    </p>
                  )}
                </div>

                {/* Section 2: Owner & Guest Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
                      Property Owner (Host)
                    </h4>
                    {booking.host ? (
                      <div>
                        <p className="text-sm font-bold text-charcoal">
                          {booking.host.full_name}
                        </p>
                        <p className="text-xs text-charcoal-light">
                          {booking.host.email}
                        </p>
                        <p className="text-xs text-charcoal-light">
                          {booking.host.phone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal-muted italic">
                        Owner details unavailable (ID: {booking.host_id})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest border-b border-sand-100 pb-1">
                      Guest (Booked By)
                    </h4>
                    {booking.guest ? (
                      <div>
                        <p className="text-sm font-bold text-charcoal">
                          {booking.guest.full_name}
                        </p>
                        <p className="text-xs text-charcoal-light">
                          {booking.guest.email}
                        </p>
                        <p className="text-xs text-charcoal-light">
                          {booking.guest.phone}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal-muted italic">
                        Guest details unavailable (ID: {booking.guest_id})
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex flex-wrap items-center justify-between border-t border-gray-100 mt-4 pt-4 bg-stone/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl gap-4">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                      Duration
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {formatDate(booking.check_in_date)} &mdash; {formatDate(booking.check_out_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                      Guests
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      {booking.number_of_guests} {booking.number_of_guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-2 sm:mt-0 ml-auto md:ml-0">
                  <div className="text-right">
                    <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block">
                      Total Paid
                    </span>
                    <span className="text-lg font-bold tracking-tight text-terracotta">
                      ₹{(booking.total_amount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold tracking-tight uppercase tracking-wider rounded ${getPaymentStatusColor(
                      booking.payment_status
                    )}`}
                  >
                    {booking.payment_status}
                  </span>
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="p-2 text-charcoal-light hover:text-terracotta transition"
                    title="View Full Booking Ledger"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-card text-center py-12">
          <Calendar className="w-16 h-16 text-charcoal-light mx-auto mb-4" />
          <p className="text-charcoal-light">No bookings found in this status</p>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-premium animate-slide-up">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal">Booking Invoice Ledger</h3>
                <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">
                  ID: {selectedBooking.booking_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-charcoal-muted hover:text-charcoal transition-all text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Row */}
              <div className="flex justify-between items-center bg-stone p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">
                    Booking Status
                  </p>
                  <span
                    className={`inline-block px-2.5 py-0.5 text-xs font-bold tracking-tight uppercase tracking-wider rounded-full border mt-1 ${getStatusColor(
                      selectedBooking.booking_status
                    )}`}
                  >
                    {selectedBooking.booking_status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">
                    Payment Status
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-bold tracking-tight uppercase tracking-wider rounded mt-1 ${getPaymentStatusColor(
                      selectedBooking.payment_status
                    )}`}
                  >
                    {selectedBooking.payment_status}
                  </span>
                </div>
              </div>

              {/* Dates & Guest */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">
                    Check-in Date
                  </p>
                  <p className="text-sm font-bold text-charcoal">
                    {formatDate(selectedBooking.check_in_date)}
                  </p>
                </div>
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">
                    Check-out Date
                  </p>
                  <p className="text-sm font-bold text-charcoal">
                    {formatDate(selectedBooking.check_out_date)}
                  </p>
                </div>
              </div>

              {/* Breakdown Ledger */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">
                  Financial Breakdown
                </h4>
                <div className="border border-gray-100 rounded-2xl p-4 space-y-2.5 font-semibold text-sm">
                  <div className="flex justify-between text-charcoal-light">
                    <span>Base Amount</span>
                    <span>
                      ₹{(selectedBooking.base_amount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-charcoal-light">
                    <span>Platform Service Fee</span>
                    <span>
                      ₹{(selectedBooking.service_fee || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-charcoal-light">
                    <span>Taxes & GST (18%)</span>
                    <span>
                      ₹{(selectedBooking.taxes || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {selectedBooking.security_deposit > 0 && (
                    <div className="flex justify-between text-charcoal-light">
                      <span>Security Deposit</span>
                      <span>
                        ₹{(selectedBooking.security_deposit || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold tracking-tight text-charcoal text-base">
                    <span>Total Amount</span>
                    <span className="text-terracotta">
                      ₹{(selectedBooking.total_amount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions details if paid */}
              {(selectedBooking.razorpay_order_id || selectedBooking.razorpay_payment_id) && (
                <div className="p-4 bg-stone rounded-2xl space-y-1">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">
                    Razorpay Gateway Credentials
                  </p>
                  {selectedBooking.razorpay_order_id && (
                    <p className="text-xs text-charcoal-light font-mono">
                      Order ID: {selectedBooking.razorpay_order_id}
                    </p>
                  )}
                  {selectedBooking.razorpay_payment_id && (
                    <p className="text-xs text-charcoal-light font-mono">
                      Payment ID: {selectedBooking.razorpay_payment_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full btn-premium py-4 mt-6"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// CMS Management Component
const CMSManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('hero');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [heroData, setHeroData] = useState({
    sub_tag: '',
    title: '',
    subtitle: '',
    image_url: '',
    slides: [],
    rating: '',
    trusted_text: ''
  });

  const [supportData, setSupportData] = useState({
    title: '',
    subtitle: '',
    search_placeholder: '',
    assist_heading: '',
    cards: [],
    popular_topics: [],
    support_hours: [],
    response_time: '',
    footer_title: '',
    footer_subtitle: '',
    footer_button_text: ''
  });

  const [howItWorksData, setHowItWorksData] = useState({
    steps: []
  });

  const [testimonialsData, setTestimonialsData] = useState({
    items: []
  });

  const [blogData, setBlogData] = useState({
    posts: []
  });

  const [footerData, setFooterData] = useState({
    brand_description: '',
    location: '',
    email: '',
    phone: '',
    guests_title: '',
    guest_link_1_label: '',
    guest_link_1_url: '',
    guest_link_2_label: '',
    faq_title: '',
    faq_items: [],
    footer_sections: [],
    hosts_title: '',
    host_link_1_label: '',
    host_link_1_url: '',
    host_link_2_label: '',
    host_link_2_url: '',
    contact_title: '',
    grievance_title: '',
    grievance_officer: '',
    grievance_email: '',
    grievance_phone: '',
    resolution_text: '',
    privacy_label: '',
    privacy_text: '',
    terms_label: '',
    terms_text: '',
    checkin_label: '',
    checkin_text: ''
  });

  const [offerData, setOfferData] = useState({
    title: '',
    description: '',
    button_text: '',
    image_url: '',
    is_enabled: false
  });

  const fetchCMSContent = async () => {
    try {
      setLoading(true);
      const [res, supportRes] = await Promise.all([
        cmsAPI.getAdminContent('landing'),
        cmsAPI.getAdminContent('support')
      ]);
      const docs = [...(res.data.content || []), ...(supportRes.data.content || [])];
      setContent(docs);

      const heroDoc = docs.find(d => d.section === 'hero');
      if (heroDoc) {
        const hero = heroDoc.content_data || {};
        const savedSlides = Array.isArray(hero.slides)
          ? hero.slides.filter(slide => slide && (typeof slide === 'string' || slide.image_url))
          : [];
        const slides = savedSlides.length
          ? savedSlides.map(slide => typeof slide === 'string' ? { image_url: slide } : slide)
          : hero.image_url
            ? [{ image_url: hero.image_url }]
            : [];
        setHeroData(prev => ({ ...prev, ...hero, slides }));
      }

      const howItWorksDoc = docs.find(d => d.section === 'how_it_works');
      if (howItWorksDoc) setHowItWorksData(howItWorksDoc.content_data);

      const testimonialsDoc = docs.find(d => d.section === 'testimonials');
      if (testimonialsDoc) setTestimonialsData(testimonialsDoc.content_data);

      const blogDoc = docs.find(d => d.section === 'blog');
      if (blogDoc) setBlogData(blogDoc.content_data);

      const footerDoc = docs.find(d => d.section === 'footer');
      if (footerDoc) setFooterData(footerDoc.content_data);

      const offerDoc = docs.find(d => d.section === 'offer');
      if (offerDoc) setOfferData(offerDoc.content_data);

      const supportDoc = docs.find(d => d.section === 'support_content');
      if (supportDoc) setSupportData(supportDoc.content_data);

    } catch (err) {
      console.error('Failed to load CMS content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCMSContent();
  }, []);

  const handleSave = async (section, data) => {
    try {
      setSaving(true);
      const doc = content.find(d => d.section === section);
      if (!doc) {
        alert(`Document for section ${section} not found.`);
        return;
      }
      const contentData = section === 'hero'
        ? {
            ...data,
            image_url: data.slides?.[0]?.image_url || data.image_url || '',
            slides: (data.slides || []).filter(slide => slide?.image_url)
          }
        : data;
      await cmsAPI.updateContent(doc.content_id, { content_data: contentData });
      alert(`${section.replace(/_/g, ' ').toUpperCase()} updated successfully!`);
      fetchCMSContent();
    } catch (err) {
      console.error('Failed to update content:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadImage(file);
      const uploadedUrl = res.url;
      
      if (type === 'hero') {
        setHeroData(prev => ({ ...prev, image_url: uploadedUrl }));
      } else if (type === 'hero_slide' && index !== null) {
        setHeroData(prev => {
          const slides = [...(prev.slides || [])];
          slides[index] = { ...(slides[index] || {}), image_url: uploadedUrl };
          return {
            ...prev,
            slides,
            image_url: index === 0 ? uploadedUrl : prev.image_url
          };
        });
      } else if (type === 'offer') {
        setOfferData(prev => ({ ...prev, image_url: uploadedUrl }));
      } else if (type === 'blog' && index !== null) {
        setBlogData(prev => {
          const updated = [...prev.posts];
          updated[index] = { ...updated[index], image_url: uploadedUrl };
          return { ...prev, posts: updated };
        });
      } else if (type === 'testimonial' && index !== null) {
        setTestimonialsData(prev => {
          const updated = [...prev.items];
          updated[index] = { ...updated[index], avatar_url: uploadedUrl };
          return { ...prev, items: updated };
        });
      }
      alert('Image uploaded successfully.');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image.');
    }
  };

  const addHeroSlide = () => {
    setHeroData(prev => ({
      ...prev,
      slides: [...(prev.slides || []), { image_url: '' }]
    }));
  };

  const removeHeroSlide = (index) => {
    setHeroData(prev => {
      const slides = (prev.slides || []).filter((_, slideIndex) => slideIndex !== index);
      return { ...prev, slides, image_url: slides[0]?.image_url || '' };
    });
  };

  const moveHeroSlide = (index, direction) => {
    setHeroData(prev => {
      const slides = [...(prev.slides || [])];
      const target = index + direction;
      if (target < 0 || target >= slides.length) return prev;
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { ...prev, slides, image_url: slides[0]?.image_url || '' };
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-light">Loading CMS Content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cms-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-charcoal">Landing Page CMS Settings</h3>
          <p className="text-sm text-charcoal-light">Manage Hero section, Blog posts, Guest testimonials, and onboarding steps data.</p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-2.5 p-1.5 bg-gray-50/60 rounded-2xl mb-8 w-fit max-w-full">
        {[
          { id: 'hero', label: 'Hero Details', icon: Sparkles },
          { id: 'how_it_works', label: 'How It Works', icon: ListTodo },
          { id: 'testimonials', label: 'Testimonials', icon: Heart },
          { id: 'blog', label: 'Blog Posts', icon: FileText },
          { id: 'offer', label: 'Promotional Offer', icon: Tag },
          { id: 'support', label: 'Support Page', icon: HelpCircle },
          { id: 'footer', label: 'Footer', icon: Phone }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-terracotta text-white shadow-subtle shadow-terracotta/20 scale-[1.02]'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-sand-200/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-charcoal-muted'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 border border-gray-100/80 shadow-premium transition-all duration-300 hover:shadow-elevated">
        
        {/* HERO TAB */}
        {activeSubTab === 'hero' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold tracking-tight text-charcoal">Hero Section Configuration</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure the main above-the-fold content of your homepage.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Sub Tag</label>
                <input
                  className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                  value={heroData.sub_tag}
                  onChange={e => setHeroData({ ...heroData, sub_tag: e.target.value })}
                  placeholder="e.g. Luxury Rentals India"
                />
              </div>
              <div className="relative group">
                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Rating Display Text</label>
                <input
                  className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                  value={heroData.rating}
                  onChange={e => setHeroData({ ...heroData, rating: e.target.value })}
                  placeholder="e.g. 4.9/5 Rating"
                />
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Heading Title (HTML Supported)</label>
              <input
                className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                value={heroData.title}
                onChange={e => setHeroData({ ...heroData, title: e.target.value })}
                placeholder="e.g. Elevate Your Living"
              />
              <span className="text-[10px] text-charcoal-muted font-bold block mt-1.5 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
                <span>Use <code>&lt;span class="text-terracotta italic font-serif"&gt;Living&lt;/span&gt;</code> for highlighted styled words.</span>
              </span>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Subtitle / Paragraph Description</label>
              <textarea
                rows={3}
                className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm leading-relaxed"
                value={heroData.subtitle}
                onChange={e => setHeroData({ ...heroData, subtitle: e.target.value })}
                placeholder="Describe your platform values and offerings..."
              />
            </div>

            <div className="relative group">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Trusted By Text</label>
              <input
                className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                value={heroData.trusted_text}
                onChange={e => setHeroData({ ...heroData, trusted_text: e.target.value })}
                placeholder="e.g. Trusted by 10,000+ happy families across India"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-charcoal-light uppercase tracking-widest block">Hero Slider Images</label>
                  <p className="text-xs text-charcoal-muted mt-1">The first image loads first. Use the arrows to change slide order.</p>
                </div>
                <button
                  type="button"
                  onClick={addHeroSlide}
                  disabled={(heroData.slides || []).length >= 6}
                  className="btn-premium px-4 py-2.5 flex items-center gap-2 text-xs disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  Add slide
                </button>
              </div>

              <div className="space-y-4">
                {(heroData.slides || []).map((slide, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-4 items-center border border-gray-100 rounded-2xl p-4 bg-stone/20">
                    <div className="aspect-video overflow-hidden rounded-xl bg-gray-100">
                      {slide.image_url ? (
                        <img
                          src={getImageUrl(slide.image_url)}
                          alt={`Hero slide ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-charcoal-muted">No image</div>
                      )}
                    </div>

                    <div className="space-y-3 min-w-0">
                      <div className="text-xs font-bold text-charcoal">Slide {index + 1}{index === 0 ? ' (first)' : ''}</div>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta rounded-xl px-4 py-3 outline-none text-sm bg-white"
                        value={slide.image_url || ''}
                        onChange={e => {
                          const slides = [...(heroData.slides || [])];
                          slides[index] = { ...slide, image_url: e.target.value };
                          setHeroData({ ...heroData, slides, image_url: index === 0 ? e.target.value : heroData.image_url });
                        }}
                        placeholder="Image URL"
                      />
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-terracotta cursor-pointer">
                        <UploadCloud className="w-4 h-4" />
                        Upload image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload(e, 'hero_slide', index)}
                        />
                      </label>
                    </div>

                    <div className="flex lg:flex-col gap-2">
                      <button
                        type="button"
                        title="Move slide up"
                        disabled={index === 0}
                        onClick={() => moveHeroSlide(index, -1)}
                        className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Move slide down"
                        disabled={index === heroData.slides.length - 1}
                        onClick={() => moveHeroSlide(index, 1)}
                        className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Remove slide"
                        onClick={() => removeHeroSlide(index)}
                        className="w-9 h-9 border border-red-100 text-red-500 rounded-lg flex items-center justify-center"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(heroData.slides || []).length === 0 && (
                <button
                  type="button"
                  onClick={addHeroSlide}
                  className="w-full border border-dashed border-terracotta/40 rounded-2xl py-8 text-sm font-semibold text-terracotta"
                >
                  Add your first hero image
                </button>
              )}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('hero', heroData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Hero Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* HOW IT WORKS TAB */}
        {activeSubTab === 'how_it_works' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold tracking-tight text-charcoal">How It Works Steps</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure onboarding steps and bullet points displayed on the landing page.</p>
              </div>
            </div>

            <div className="space-y-6">
              {howItWorksData.steps?.map((step, index) => (
                <div key={step.id} className="p-6 bg-stone/50 rounded-3xl border border-gray-100/80 space-y-5 hover:bg-white hover:shadow-premium transition-all duration-300">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100/60">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-bold tracking-tight">
                        {step.id}
                      </span>
                      <span className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-wider">
                        Step Configuration
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Short Title (Tab)</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={step.shortTitle}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], shortTitle: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Heading Title</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={step.heading}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], heading: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Subtitle</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={step.subtitle}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], subtitle: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Lucide Icon Name</label>
                      <select
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm appearance-none cursor-pointer"
                        value={step.icon_name}
                        onChange={e => {
                          const updated = [...howItWorksData.steps];
                          updated[index] = { ...updated[index], icon_name: e.target.value };
                          setHowItWorksData({ steps: updated });
                        }}
                      >
                        <option value="User">User / Registration</option>
                        <option value="CreditCard">CreditCard / Subscription</option>
                        <option value="Building2">Building2 / Properties</option>
                        <option value="MapPin">MapPin / Coordinates</option>
                        <option value="Sparkles">Sparkles / Payouts</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Step Detailed Paragraph</label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={step.paragraph}
                      onChange={e => {
                        const updated = [...howItWorksData.steps];
                        updated[index] = { ...updated[index], paragraph: e.target.value };
                        setHowItWorksData({ steps: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Bullet Points</label>
                    <div className="space-y-3">
                      {step.bullets?.map((bullet, bIndex) => (
                        <div key={bIndex} className="flex items-center space-x-2.5 group/bullet">
                          <input
                            className="flex-1 border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2 bg-white outline-none transition font-semibold text-charcoal text-xs"
                            value={bullet}
                            onChange={e => {
                              const updatedSteps = [...howItWorksData.steps];
                              const updatedBullets = [...updatedSteps[index].bullets];
                              updatedBullets[bIndex] = e.target.value;
                              updatedSteps[index] = { ...updatedSteps[index], bullets: updatedBullets };
                              setHowItWorksData({ steps: updatedSteps });
                            }}
                          />
                          <button
                            onClick={() => {
                              const updatedSteps = [...howItWorksData.steps];
                              const updatedBullets = updatedSteps[index].bullets.filter((_, bIdx) => bIdx !== bIndex);
                              updatedSteps[index] = { ...updatedSteps[index], bullets: updatedBullets };
                              setHowItWorksData({ steps: updatedSteps });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition duration-300 opacity-80 hover:opacity-100 active:scale-95"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const updatedSteps = [...howItWorksData.steps];
                          const updatedBullets = [...(updatedSteps[index].bullets || []), ''];
                          updatedSteps[index] = { ...updatedSteps[index], bullets: updatedBullets };
                          setHowItWorksData({ steps: updatedSteps });
                        }}
                        className="text-xs font-bold tracking-tight text-emerald-600 uppercase tracking-wider hover:text-emerald-700 hover:underline flex items-center space-x-1.5 py-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('how_it_works', howItWorksData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Steps...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Steps Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TESTIMONIALS TAB */}
        {activeSubTab === 'testimonials' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-sand-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold tracking-tight text-charcoal">Guest Testimonials</h4>
                  <p className="text-xs text-charcoal-muted font-medium">Manage testimonials and reviews from your hosts and guests.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const updatedItems = [
                    ...(testimonialsData.items || []),
                    {
                      id: `t_${Date.now()}`,
                      name: 'New Client',
                      role: 'Guest / Host',
                      rating: 5,
                      comment: 'Premium short-term renting experience.',
                      avatar_url: ''
                    }
                  ];
                  setTestimonialsData({ items: updatedItems });
                }}
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold tracking-tight uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Add Testimonial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {testimonialsData.items?.map((item, index) => (
                <div key={item.id || index} className="p-6 bg-stone/50 rounded-3xl border border-gray-100/80 space-y-5 relative group hover:bg-white hover:shadow-premium transition-all duration-300">
                  <button
                    onClick={() => {
                      const updatedItems = testimonialsData.items.filter((_, idx) => idx !== index);
                      setTestimonialsData({ items: updatedItems });
                    }}
                    className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition duration-300 active:scale-90"
                    title="Delete Testimonial"
                  >
                    <Trash className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Author Name</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={item.name}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setTestimonialsData({ items: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Role / Subtitle</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={item.role}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], role: e.target.value };
                          setTestimonialsData({ items: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Rating Stars (1-5)</label>
                      <select
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm cursor-pointer"
                        value={item.rating}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], rating: Number(e.target.value) };
                          setTestimonialsData({ items: updated });
                        }}
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                        <option value={3}>⭐⭐⭐ (3 Stars)</option>
                        <option value={2}>⭐⭐ (2 Stars)</option>
                        <option value={1}>⭐ (1 Star)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Comment Text</label>
                    <textarea
                      rows={2.5}
                      className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={item.comment}
                      onChange={e => {
                        const updated = [...testimonialsData.items];
                        updated[index] = { ...updated[index], comment: e.target.value };
                        setTestimonialsData({ items: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Avatar Image</label>
                    <div className="flex items-stretch space-x-3">
                      <input
                        className="flex-1 border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={item.avatar_url}
                        onChange={e => {
                          const updated = [...testimonialsData.items];
                          updated[index] = { ...updated[index], avatar_url: e.target.value };
                          setTestimonialsData({ items: updated });
                        }}
                        placeholder="Avatar Image URL"
                      />
                      <label className="btn-premium px-5 flex items-center justify-center space-x-1.5 text-xs font-semibold rounded-2xl cursor-pointer transition duration-300">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload(e, 'testimonial', index)}
                        />
                      </label>
                    </div>
                    {item.avatar_url && (
                      <div className="mt-3.5 flex items-center space-x-3.5 bg-white p-2.5 rounded-2xl border border-gray-100 w-fit shadow-sm">
                        <img src={getImageUrl(item.avatar_url)} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-sand-150 shadow-inner" />
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center space-x-1">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Image Loaded</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('testimonials', testimonialsData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Testimonials...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Testimonials Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* FOOTER TAB */}
        {activeSubTab === 'footer' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold tracking-tight text-charcoal">Footer</h4>
                <p className="text-xs text-charcoal-muted font-medium">Edit public footer brand copy and four configurable sections.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold tracking-tight text-charcoal uppercase tracking-widest block mb-2">Brand Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                  value={footerData.brand_description || ''}
                  onChange={e => setFooterData({ ...footerData, brand_description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, index) => {
                  const sections = footerData.footer_sections || [];
                  const defaultHeadings = ['For Guests', 'For Hosts', 'Contact', 'Grievance & Escalation'];
                  const rawSection = sections[index] || { heading: defaultHeadings[index], items: [] };
                  const isActionSection = index < 2;
                  const isGrievanceSection = index === 3;
                  const section = {
                    ...rawSection,
                    heading: (!rawSection.heading || /^Section\s+\d+$/i.test(rawSection.heading)) ? defaultHeadings[index] : rawSection.heading,
                    items: Array.isArray(rawSection.items) && rawSection.items.length
                      ? rawSection.items
                      : [{ label: rawSection.label || '', action_type: isActionSection ? (rawSection.action_type || 'link') : 'text', link: rawSection.link || '', text: rawSection.text || '' }]
                  };
                  const updateSection = (patch) => {
                    const next = [...sections];
                    next[index] = { ...section, ...patch };
                    setFooterData({ ...footerData, footer_sections: next });
                  };
                  const updateItem = (itemIndex, patch) => {
                    const nextItems = [...section.items];
                    nextItems[itemIndex] = { ...nextItems[itemIndex], ...patch };
                    updateSection({ items: nextItems });
                  };
                  return (
                    <div key={index} className="rounded-3xl border border-gray-100 bg-stone/60 p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest">Section {index + 1}</h5>
                        <button
                          type="button"
                          onClick={() => updateSection({ items: [...section.items, { label: 'New Label', action_type: isActionSection ? 'link' : 'text', link: '', text: '' }] })}
                          className="px-3 py-2 rounded-xl bg-terracotta text-white text-[10px] font-bold tracking-tight uppercase tracking-widest"
                        >
                          Add Label
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Section Heading</label>
                        <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={section.heading || ''} onChange={e => updateSection({ heading: e.target.value })} />
                      </div>
                      <div className="space-y-4">
                        {section.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Label {itemIndex + 1}</span>
                              {section.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => updateSection({ items: section.items.filter((_, i) => i !== itemIndex) })}
                                  className="text-[10px] font-bold tracking-tight text-red-600 uppercase tracking-widest"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Label</label>
                              <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={item.label || ''} onChange={e => updateItem(itemIndex, { label: e.target.value })} />
                            </div>
                            {isActionSection && (
                              <div>
                                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Action Type</label>
                                <select className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={item.action_type || 'link'} onChange={e => updateItem(itemIndex, { action_type: e.target.value })}>
                                  <option value="link">Link Redirect</option>
                                  <option value="text">Text Popup</option>
                                </select>
                              </div>
                            )}
                            {(isActionSection ? item.action_type === 'text' : true) ? (
                              <div>
                                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">{isActionSection ? 'Popup Text' : 'Text'}</label>
                                <textarea rows={4} className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={item.text || ''} onChange={e => updateItem(itemIndex, { text: e.target.value })} />
                              </div>
                            ) : (
                              <div>
                                <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Redirect Link</label>
                                <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={item.link || ''} onChange={e => updateItem(itemIndex, { link: e.target.value })} placeholder="/guest/browse or https://..." />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {isGrievanceSection && (
                        <div>
                          <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Resolution Line</label>
                          <input
                            className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                            value={section.resolution_text || footerData.resolution_text || ''}
                            onChange={e => {
                              updateSection({ resolution_text: e.target.value });
                              setFooterData(prev => ({ ...prev, resolution_text: e.target.value }));
                            }}
                            placeholder="Resolution: 7 working days"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="md:col-span-2 rounded-3xl border border-gray-100 bg-stone/60 p-5 space-y-4">
                <h5 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-widest">Footer Legal Links</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Privacy Label</label>
                    <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.privacy_label || ''} onChange={e => setFooterData({ ...footerData, privacy_label: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Terms Label</label>
                    <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.terms_label || ''} onChange={e => setFooterData({ ...footerData, terms_label: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Check-in Instructions Label</label>
                    <input className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.checkin_label || ''} onChange={e => setFooterData({ ...footerData, checkin_label: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Privacy Policy Text</label>
                    <textarea rows={5} className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.privacy_text || ''} onChange={e => setFooterData({ ...footerData, privacy_text: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Terms & Conditions Text</label>
                    <textarea rows={5} className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.terms_text || ''} onChange={e => setFooterData({ ...footerData, terms_text: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Check-in Instructions Text</label>
                    <textarea rows={5} className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm" value={footerData.checkin_text || ''} onChange={e => setFooterData({ ...footerData, checkin_text: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('footer', footerData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Footer...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Footer Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* BLOG TAB */}
        {activeSubTab === 'blog' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-sand-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold tracking-tight text-charcoal">Journal Blog Posts</h4>
                  <p className="text-xs text-charcoal-muted font-medium">Manage property insights, local guide articles, and platform updates.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const updatedPosts = [
                    ...(blogData.posts || []),
                    {
                      id: `p_${Date.now()}`,
                      title: 'New Insights Article',
                      excerpt: 'Discover short-term rental trends across major metros.',
                      image_url: '',
                      author: 'STR Insights Team',
                      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      read_time: '5 min read'
                    }
                  ];
                  setBlogData({ posts: updatedPosts });
                }}
                className="btn-premium px-5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold tracking-tight uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Add Blog Post</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {blogData.posts?.map((post, index) => (
                <div key={post.id || index} className="p-6 bg-stone/50 rounded-3xl border border-gray-100/80 space-y-5 relative group hover:bg-white hover:shadow-premium transition-all duration-300">
                  <button
                    onClick={() => {
                      const updatedPosts = blogData.posts.filter((_, idx) => idx !== index);
                      setBlogData({ posts: updatedPosts });
                    }}
                    className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition duration-300 active:scale-90"
                    title="Delete Post"
                  >
                    <Trash className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Article Title</label>
                      <input
                        className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={post.title}
                        onChange={e => {
                          const updated = [...blogData.posts];
                          updated[index] = { ...updated[index], title: e.target.value };
                          setBlogData({ posts: updated });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Author</label>
                        <input
                          className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
                          value={post.author}
                          onChange={e => {
                            const updated = [...blogData.posts];
                            updated[index] = { ...updated[index], author: e.target.value };
                            setBlogData({ posts: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Date</label>
                        <input
                          className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
                          value={post.date}
                          onChange={e => {
                            const updated = [...blogData.posts];
                            updated[index] = { ...updated[index], date: e.target.value };
                            setBlogData({ posts: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Read Time</label>
                        <input
                          className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-3 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-xs"
                          value={post.read_time}
                          onChange={e => {
                            const updated = [...blogData.posts];
                            updated[index] = { ...updated[index], read_time: e.target.value };
                            setBlogData({ posts: updated });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Excerpt Summary</label>
                    <textarea
                      rows={2.5}
                      className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-2.5 outline-none transition-all font-semibold text-charcoal bg-white text-sm leading-relaxed"
                      value={post.excerpt}
                      onChange={e => {
                        const updated = [...blogData.posts];
                        updated[index] = { ...updated[index], excerpt: e.target.value };
                        setBlogData({ posts: updated });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Cover Image</label>
                    <div className="flex items-stretch space-x-3">
                      <input
                        className="flex-1 border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4 py-3 outline-none transition-all font-semibold text-charcoal bg-white text-sm"
                        value={post.image_url}
                        onChange={e => {
                          const updated = [...blogData.posts];
                          updated[index] = { ...updated[index], image_url: e.target.value };
                          setBlogData({ posts: updated });
                        }}
                        placeholder="Image URL"
                      />
                      <label className="btn-premium px-5 flex items-center justify-center space-x-1.5 text-xs font-semibold rounded-2xl cursor-pointer transition duration-300">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload(e, 'blog', index)}
                        />
                      </label>
                    </div>
                    {post.image_url && (
                      <div className="mt-4 relative group overflow-hidden rounded-2xl border border-gray-100/80 shadow-subtle aspect-video max-h-40 w-fit">
                        <img src={getImageUrl(post.image_url)} alt="Cover Preview" className="w-64 h-full object-cover group-hover:scale-[1.02] transition-all duration-500" />
                        <div className="absolute top-2 left-2 bg-charcoal/50 backdrop-blur-sm border border-white/10 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider">
                          Cover Preview
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('blog', blogData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Blog Posts...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Blog Posts Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SUPPORT PAGE TAB */}
        {activeSubTab === 'support' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-charcoal">Support Page Configuration</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure contact cards, popular topics, support hours, and banners on the support page.</p>
              </div>
            </div>

            {/* Header Content */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Header Section</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Main Title</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                    value={supportData.title || ''}
                    onChange={e => setSupportData({ ...supportData, title: e.target.value })}
                    placeholder="e.g. How can we help you?"
                  />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Search Placeholder</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                    value={supportData.search_placeholder || ''}
                    onChange={e => setSupportData({ ...supportData, search_placeholder: e.target.value })}
                    placeholder="e.g. Search for help articles..."
                  />
                </div>
              </div>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Subtitle / Description</label>
                <textarea
                  rows={2}
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm leading-relaxed"
                  value={supportData.subtitle || ''}
                  onChange={e => setSupportData({ ...supportData, subtitle: e.target.value })}
                  placeholder="e.g. We're here to help and answer any question you might have."
                />
              </div>
            </div>

            {/* Assistance Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Assistance Section Title</h5>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Section Heading</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                  value={supportData.assist_heading || ''}
                  onChange={e => setSupportData({ ...supportData, assist_heading: e.target.value })}
                  placeholder="e.g. How can we assist you today?"
                />
              </div>
            </div>

            {/* Support Cards (4 cards) */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider font-serif">Support Channels / Cards</h5>
              <div className="space-y-6">
                {(supportData.cards || []).map((card, index) => (
                  <div key={card.id || index} className="p-5 bg-white rounded-2xl border border-sand-200/80 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-sand-100">
                      <span className="text-[10px] font-black text-charcoal uppercase tracking-wider">
                        Channel {index + 1}: {card.id?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Card Title</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.title || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Description</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.description || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Button Text / Value</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.button_text || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], button_text: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Action Value (URL / Link / Phone / Email)</label>
                        <input
                          className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs bg-sand-50/10 focus:bg-white"
                          value={card.action_value || ''}
                          onChange={e => {
                            const updated = [...supportData.cards];
                            updated[index] = { ...updated[index], action_value: e.target.value };
                            setSupportData({ ...supportData, cards: updated });
                          }}
                          placeholder="e.g. support@x-space360.com or +91 98765 43210"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Topics Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Popular Topics</h5>
              <div className="space-y-4">
                {(supportData.popular_topics || []).map((topic, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-sand-200/60 font-semibold">
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Topic {index + 1} Label</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={topic.label || ''}
                        onChange={e => {
                          const updated = [...supportData.popular_topics];
                          updated[index] = { ...updated[index], label: e.target.value };
                          setSupportData({ ...supportData, popular_topics: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Topic {index + 1} Link / Anchor</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={topic.link || ''}
                        onChange={e => {
                          const updated = [...supportData.popular_topics];
                          updated[index] = { ...updated[index], link: e.target.value };
                          setSupportData({ ...supportData, popular_topics: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Hours Section */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider font-semibold">Support Hours & Response Time</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(supportData.support_hours || []).map((hour, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-sand-200/60 space-y-3 font-semibold">
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Days (e.g. Monday - Saturday)</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={hour.days || ''}
                        onChange={e => {
                          const updated = [...supportData.support_hours];
                          updated[index] = { ...updated[index], days: e.target.value };
                          setSupportData({ ...supportData, support_hours: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Hours (e.g. 9:00 AM - 7:00 PM)</label>
                      <input
                        className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                        value={hour.hours || ''}
                        onChange={e => {
                          const updated = [...supportData.support_hours];
                          updated[index] = { ...updated[index], hours: e.target.value };
                          setSupportData({ ...supportData, support_hours: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative group">
                <label className="text-[10px] font-black text-charcoal-light uppercase tracking-widest block mb-2">Response Time Text</label>
                <input
                  className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-white text-sm"
                  value={supportData.response_time || ''}
                  onChange={e => setSupportData({ ...supportData, response_time: e.target.value })}
                  placeholder="e.g. We usually respond within 24 hours."
                />
              </div>
            </div>

            {/* Footer Banner */}
            <div className="bg-sand-50/40 p-6 rounded-3xl border border-sand-200/80 space-y-6">
              <h5 className="text-xs font-black text-terracotta uppercase tracking-wider">Bottom Support Banner</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Title</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_title || ''}
                    onChange={e => setSupportData({ ...supportData, footer_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Subtitle</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_subtitle || ''}
                    onChange={e => setSupportData({ ...supportData, footer_subtitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-charcoal-light uppercase tracking-widest block mb-1.5">Banner Button Text</label>
                  <input
                    className="w-full border border-sand-200 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-xl px-3 py-2 outline-none font-semibold text-charcoal text-xs"
                    value={supportData.footer_button_text || ''}
                    onChange={e => setSupportData({ ...supportData, footer_button_text: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('support_content', supportData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-md shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Support Config...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Support Page Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PROMOTIONAL OFFER TAB */}
        {activeSubTab === 'offer' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-sand-100">
              <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold tracking-tight text-charcoal">Promotional Offer Banner</h4>
                <p className="text-xs text-charcoal-muted font-medium">Configure the pop-up promotional banner shown to unauthenticated guests.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="relative group">
                  <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Offer Title</label>
                  <input
                    className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                    value={offerData.title}
                    onChange={e => setOfferData({ ...offerData, title: e.target.value })}
                    placeholder="e.g. Special Launch Offer! Get 20% Off"
                  />
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Call To Action Button Text</label>
                  <input
                    className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                    value={offerData.button_text}
                    onChange={e => setOfferData({ ...offerData, button_text: e.target.value })}
                    placeholder="e.g. Claim 20% Discount"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-stone/50 rounded-2xl border border-gray-100">
                  <div>
                    <h5 className="text-sm font-bold text-charcoal">Offer Active Status</h5>
                    <p className="text-xs text-charcoal-muted font-medium">Toggle whether guests see this offer banner on landing.</p>
                  </div>
                  <button
                    onClick={() => setOfferData({ ...offerData, is_enabled: !offerData.is_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-350 outline-none ${
                      offerData.is_enabled ? 'bg-terracotta' : 'bg-sand-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-350 ${
                        offerData.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Offer Description / Subtitle</label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3.5 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm leading-relaxed"
                    value={offerData.description}
                    onChange={e => setOfferData({ ...offerData, description: e.target.value })}
                    placeholder="Describe your special discounts, exclusive perks, or member benefits here..."
                  />
                </div>
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-bold tracking-tight text-charcoal-light uppercase tracking-widest block mb-2">Offer Banner Image</label>
              <div className="flex items-stretch space-x-3">
                <div className="relative flex-1">
                  <input
                    className="w-full border border-gray-100 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 rounded-2xl px-4.5 py-3.5 outline-none transition-all duration-300 font-semibold text-charcoal bg-stone/20 focus:bg-white text-sm"
                    value={offerData.image_url}
                    onChange={e => setOfferData({ ...offerData, image_url: e.target.value })}
                    placeholder="Image URL"
                  />
                </div>
                <label className="btn-premium px-6 flex items-center justify-center space-x-2 text-sm font-semibold rounded-2xl cursor-pointer hover:shadow-premium transition-all duration-300">
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Banner</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageUpload(e, 'offer')}
                  />
                </label>
              </div>
              
              {offerData.image_url && (
                <div className="mt-5 relative group overflow-hidden rounded-2xl border border-gray-100/80 shadow-subtle max-h-56 max-w-lg animate-fadeIn">
                  <img src={getImageUrl(offerData.image_url)} alt="Offer Preview" className="w-full object-cover group-hover:scale-[1.02] transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-semibold tracking-wide bg-charcoal/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">Active Offer Banner Preview</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-sand-150">
              <button
                onClick={() => handleSave('offer', offerData)}
                disabled={saving}
                className="w-full sm:w-auto btn-premium px-8 py-3.5 flex items-center justify-center space-x-2.5 shadow-subtle shadow-terracotta/15 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Offer...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Offer Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Subscription Management Component
export const SubscriptionManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    plan_name: '',
    plan_type: '1bhk',
    price_monthly: '',
    price_annual: '',
    platform_fee: '',
    tax_percent: 18,
    description: '',
    validity_days: 30,
    sqft_range: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionAPI.getAdminPlans();
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPlan,
        price_annual: Number(newPlan.price_annual) || 0,
        platform_fee: Number(newPlan.platform_fee) || 0,
        tax_percent: Number(newPlan.tax_percent) || 0,
        sqft_range: newPlan.plan_type === 'commercial' ? newPlan.sqft_range : null
      };
      if (newPlan.plan_id) {
        await subscriptionAPI.updatePlan(newPlan.plan_id, payload);
      } else {
        await subscriptionAPI.createPlan(payload);
      }
      setShowAddModal(false);
      setNewPlan({ plan_name: '', plan_type: '1bhk', price_monthly: '', price_annual: '', platform_fee: '', tax_percent: 18, description: '', validity_days: 30, sqft_range: '' });
      fetchPlans();
    } catch (error) {
      alert('Failed to save plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete/deactivate this plan?')) return;
    try {
      await subscriptionAPI.deletePlan(planId);
      fetchPlans();
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  const handleTogglePlan = async (planId) => {
    try {
      await subscriptionAPI.togglePlanStatus(planId);
      fetchPlans();
    } catch (error) {
      alert('Failed to toggle plan status');
    }
  };

  return (
    <div data-testid="subscription-management">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-charcoal">Subscription Management</h3>
        <button 
          onClick={() => {
            setNewPlan({ plan_name: '', plan_type: '1bhk', price_monthly: '', price_annual: '', platform_fee: '', tax_percent: 18, description: '', validity_days: 30, sqft_range: '' });
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">Loading plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.plan_id} className="dashboard-card relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2 py-1 bg-sage/10 text-sage-dark text-[10px] font-bold tracking-tight uppercase tracking-widest rounded mb-2">
                    {plan.plan_type === 'commercial' && plan.sqft_range ? `commercial (${plan.sqft_range})` : plan.plan_type}
                  </span>
                  <h4 className="text-lg font-bold text-charcoal">{plan.plan_name}</h4>
                  <p className="text-[11px] font-semibold text-charcoal-muted/85 font-mono mt-1 mb-2">ID: {plan.plan_id}</p>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => setViewPlan(plan)}
                    className="p-1 text-charcoal-light hover:text-terracotta"
                    title="View Details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setNewPlan(plan);
                      setShowAddModal(true);
                    }}
                    className="p-1 text-charcoal-light hover:text-terracotta"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.plan_id)}
                    className="p-1 text-charcoal-light hover:text-red-500"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-charcoal-light mb-6 line-clamp-2">{plan.description}</p>
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-charcoal-muted font-bold uppercase">Monthly</span>
                  <span className="text-lg font-bold tracking-tight text-terracotta">₹{(plan.price_monthly || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-charcoal-muted font-bold uppercase">Platform Fee</span>
                  <span className="text-sm font-bold text-charcoal">₹{(plan.platform_fee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-charcoal-muted font-bold uppercase">GST</span>
                  <span className="text-sm font-bold text-charcoal">{plan.tax_percent ?? 18}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-charcoal-muted font-bold uppercase">Validity</span>
                  <span className="text-sm font-bold text-charcoal">{plan.validity_days || 30} Days</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${plan.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                      {plan.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePlan(plan.plan_id)}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition duration-300 ${
                      plan.is_active !== false
                        ? 'bg-red-50 hover:bg-red-100 text-red-600'
                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                    }`}
                  >
                    {plan.is_active !== false ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-premium animate-slide-up">
            <h3 className="text-2xl font-bold tracking-tight text-charcoal mb-6">
              {newPlan.plan_id ? 'Edit Plan' : 'New Subscription Plan'}
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Plan Name</label>
                <input 
                  required
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  value={newPlan.plan_name}
                  onChange={e => setNewPlan({...newPlan, plan_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">BHK Type</label>
                  <select 
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.plan_type}
                    onChange={e => setNewPlan({...newPlan, plan_type: e.target.value})}
                  >
                    <option value="studio">Studio</option>
                    <option value="1bhk">1 BHK</option>
                    <option value="2bhk">2 BHK</option>
                    <option value="3bhk">3 BHK</option>
                    <option value="4bhk">4 BHK+</option>
                    <option value="commercial">Commercial</option>
                    <option value="banquet">Banquet</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Monthly Price</label>
                  <input 
                    type="number" required
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.price_monthly}
                    onChange={e => setNewPlan({...newPlan, price_monthly: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Platform Fee</label>
                  <input
                    type="number" min={0}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.platform_fee ?? ''}
                    onChange={e => setNewPlan({...newPlan, platform_fee: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">GST (%)</label>
                  <input
                    type="number" min={0} step="0.01"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.tax_percent ?? 18}
                    onChange={e => setNewPlan({...newPlan, tax_percent: Number(e.target.value)})}
                  />
                </div>
              </div>
              {newPlan.plan_type === 'commercial' && (
                <div>
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Sq.ft Range</label>
                  <select 
                    required
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    value={newPlan.sqft_range || ''}
                    onChange={e => setNewPlan({...newPlan, sqft_range: e.target.value})}
                  >
                    <option value="">Select Range</option>
                    <option value="small">Small (under 500 sqft)</option>
                    <option value="medium">Medium (500-2000 sqft)</option>
                    <option value="large">Large (2000-5000 sqft)</option>
                    <option value="extra_large">Extra Large (5000+ sqft)</option>
                    <option value="custom">Custom Size</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Validity (Days)</label>
                <input 
                  type="number" required min={1}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  value={newPlan.validity_days || 30}
                  onChange={e => setNewPlan({...newPlan, validity_days: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  required rows={3}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  value={newPlan.description}
                  onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 font-bold text-charcoal-muted">Cancel</button>
                <button type="submit" className="flex-1 btn-premium py-3">
                  {newPlan.plan_id ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewPlan && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-premium animate-slide-up">
            <h3 className="text-2xl font-bold tracking-tight text-charcoal mb-1">{viewPlan.plan_name}</h3>
            <p className="text-xs font-mono text-charcoal-muted mb-4">Subscription ID: {viewPlan.plan_id}</p>
            <span className="inline-block px-3 py-1 bg-sage/10 text-sage-dark text-[10px] font-bold tracking-tight uppercase tracking-widest rounded-full mb-6">
              {viewPlan.plan_type === 'commercial' && viewPlan.sqft_range ? `commercial (${viewPlan.sqft_range})` : viewPlan.plan_type} Configuration
            </span>
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-stone rounded-2xl">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Monthly Cost</p>
                <p className="text-2xl font-bold tracking-tight text-terracotta">₹{(viewPlan.price_monthly || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Platform Fee</p>
                  <p className="text-xl font-bold tracking-tight text-charcoal">₹{(viewPlan.platform_fee || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-stone rounded-2xl">
                  <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">GST</p>
                  <p className="text-xl font-bold tracking-tight text-charcoal">{viewPlan.tax_percent ?? 18}%</p>
                </div>
              </div>
              <div className="p-4 bg-stone rounded-2xl">
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-1">Validity (Days)</p>
                <p className="text-2xl font-bold tracking-tight text-charcoal">{viewPlan.validity_days || 30} Days</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest mb-2">Description</p>
                <p className="text-sm text-charcoal leading-relaxed">{viewPlan.description}</p>
              </div>
            </div>
            <button onClick={() => setViewPlan(null)} className="w-full btn-premium py-4">Close Details</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
